import Web3 from 'web3';
import { ethers } from 'ethers';

import { chainIdandType, chainInfo, ENTRYPOINT_ADDRESS, salt} from './chainInfos';

import Entrypoint from '../abi/EntryPoint.json';
import Account from '../abi/SimpleAccount.json';
import AccountFactory from '../abi/AccountFactory.json';

import TransactionAbi from '../abi/TransactionAbi.json';

// ABI and Web3 setup for Entrypoint contract
const EntrypointABI = Entrypoint.abi;
const web3 = new Web3(window.ethereum);

const providerChainId = await window.ethereum.request({ method: "eth_chainId" });

// const USER_OP_RPC_URL = "http://0.0.0.0:14337/rpc";
// const bundlerWeb3 = new Web3(USER_OP_RPC_URL);

// const alchomyUSER_OP_RPC_URL = "https://testnet-rpc.etherspot.io/v1/11155111";
// const userOpProvider = new ethers.JsonRpcProvider(alchomyUSER_OP_RPC_URL);


async function getChain(web3){
    const chainID = await web3.eth.getChainId();  // have to change with metamask provider chain
    const hexChainID = '0x' + chainID.toString(16);  // Convert to hex format

    console.log("providerChainId... ",hexChainID);

    const chainType = chainIdandType[hexChainID];

    const bundlerWeb3 = new Web3(chainInfo[chainType].USER_OP_RPC_URL);
    const userOpProvider = new ethers.JsonRpcProvider(chainInfo[chainType].USER_OP_RPC_URL);
    
    const entryContract = new web3.eth.Contract(EntrypointABI, ENTRYPOINT_ADDRESS);
    const FACTORY_ADDRESS = chainInfo[chainType].FACTORY_ADDRESS;

    return {bundlerWeb3, userOpProvider, FACTORY_ADDRESS, entryContract}

}

async function getAddress(entryContract, initCode) {
    var sender;
    try {
        await entryContract.methods.getSenderAddress(initCode).call()
    }
    catch (Ex) {
        console.log('Exception:', Ex);
    
        if (Ex && Ex.data && Ex.data.originalError && Ex.data.originalError.data) {
            sender = "0x" + Ex.data.originalError.data.slice(-40);
        } else if (Ex && Ex.data && Ex.data.data) {
            sender = "0x" + Ex.data.data.slice(-40);
        } else {
            console.error('Unable to extract sender address from error.');
        }
    }
    
    return sender;
}

const estimateUserOperationGas = async (web3, userOp) => {
    console.log('estimateUserOperationGas function calling ...');

    const {bundlerWeb3} = await getChain(web3);
    const estimateGas = await bundlerWeb3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "eth_estimateUserOperationGas",
        params: [userOp, ENTRYPOINT_ADDRESS],
        id: new Date().getTime()
    });
    return estimateGas;
};

const sendUserOperation = async (web3, userOp) => {
    console.log('sendUserOperation function calling ...');

    const {bundlerWeb3} = await getChain(web3);
    const opHash = await bundlerWeb3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "eth_sendUserOperation",
        params: [userOp, ENTRYPOINT_ADDRESS],
        id: new Date().getTime()
    });
    return opHash;
};

export const getUserOperationByHash = async (web3, opHash, delay = 3000) => {

    const { bundlerWeb3 } = await getChain(web3);
    const response = await bundlerWeb3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "skandha_userOperationStatus",
        params: [opHash],
        id: new Date().getTime()
    });

    return response;
};

const personalSignIn = async (userOpHash, address) => {
    const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [userOpHash, address],
    });
    return signature;
};

export async function checkContract(sender) {
    if (!sender || !web3) return;

    try {
        const code = await web3.eth.getCode(sender);
        if (code !== '0x')
            return true;
    } catch (error) {
        console.error("Error checking contract:", error);
    }
    return false;
};

const isApiResponseError = async (response) => {
    if (!response || typeof response !== 'object') {
        return true; // If response is undefined or not an object, it's an error
    }

    console.log("response :", response)
    if ('error' in response) {
        return true;
    }
    return false;
};

const createTx = async (web3, ownerAddress, smartWalletAddress, callData) => {
    const {userOpProvider, FACTORY_ADDRESS, entryContract} = await getChain(web3);
    try {
        const AccountBytecode = Account.bytecode;

        const encodedArgs = web3.eth.abi.encodeParameters(
            ['address', 'address'],
            [ENTRYPOINT_ADDRESS, ownerAddress]
        );

        const bytecodeWithArgs = AccountBytecode + encodedArgs.slice(2);

        const encodedFunctionCall = web3.eth.abi.encodeFunctionCall(TransactionAbi.deployABI, [bytecodeWithArgs, salt]);

        var initCode = FACTORY_ADDRESS + encodedFunctionCall.slice(2);

        const sender = await getAddress(entryContract, initCode);
        console.log({ sender });

        if (sender.toLowerCase() !== smartWalletAddress.toLowerCase()) {
            return { error: true, message: "Owner address and contract address should be same." };
        }

        if (await checkContract(sender)) {
            initCode = "0x";
        }


        const userOp = {
            sender,
            nonce: "0x" + (await entryContract.methods.getNonce(sender, 0).call()).toString(16),
            initCode,
            callData,
            paymasterAndData: "0x",
            signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c",
        };

        const gasEstimates = await estimateUserOperationGas(web3, userOp);
        if (await isApiResponseError(gasEstimates))
            return { error: true, message: gasEstimates?.error?.message || "Gas estimate failed."};

        console.log("Estimate is success");
        const { preVerificationGas, verificationGasLimit, callGasLimit, maxPriorityFeePerGas } = gasEstimates.result;
        userOp.preVerificationGas = preVerificationGas;
        userOp.verificationGasLimit = verificationGasLimit;
        userOp.callGasLimit = callGasLimit;
        userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

        const { maxFeePerGas } = await userOpProvider.getFeeData();
        userOp.maxFeePerGas = "0x" + maxFeePerGas.toString(16);

        const userOpHash = await entryContract.methods.getUserOpHash(userOp).call();
        console.log({ userOpHash });

        userOp.signature = await personalSignIn(userOpHash, ownerAddress);

        console.log({ userOp });

        const OpHash = await sendUserOperation(web3, userOp);
        if (await isApiResponseError(OpHash))
            return { error: true, message:OpHash?.error?.message || "Failed to send user operation."  };

        console.log('userOperation hash', OpHash);

        return { error: false, message: "", opHash:OpHash.result};
    } catch (err) {
        console.error("Error in createTx:", err);
        return { error: true, message: err.message || "Transaction failed." };
    }
};

export const contractDeployTx = async (web3, ownerAddress, smartWalletAddress) => {
    const callData = "0x";
    return createTx(web3, ownerAddress, smartWalletAddress, callData);
};

export const contractETHTx = async (web3, ownerAddress, smartWalletAddress, receiverAddress, amount) => {
    const callData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.executeABI, [receiverAddress, amount, "0x"]);
    return createTx(web3, ownerAddress, smartWalletAddress, callData);
};

export const contractERC20Tx = async (web3, ownerAddress, smartWalletAddress, contractAddress, receiverAddress, tokenAmount) => {
    const data = await web3.eth.abi.encodeFunctionCall(TransactionAbi.ERC20Transfer, [receiverAddress,tokenAmount]);
    const callData = await web3.eth.abi.encodeFunctionCall(TransactionAbi.executeABI, [contractAddress, 0, data]);
    return createTx(web3, ownerAddress, smartWalletAddress, callData);
}