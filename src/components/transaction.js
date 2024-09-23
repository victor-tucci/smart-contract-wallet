import Web3 from 'web3';
import { ethers } from 'ethers';

import Entrypoint from '../abi/EntryPoint.json';
import Account from '../abi/SimpleAccount.json';
import AccountFactory from '../abi/AccountFactory.json';

import TransactionAbi from '../abi/TransactionAbi.json';

// ABI and Web3 setup for Entrypoint contract
const EntrypointABI = Entrypoint.abi;
const web3 = new Web3(window.ethereum);

const USER_OP_RPC_URL = "http://0.0.0.0:14337/rpc";
const bundlerWeb3 = new Web3(USER_OP_RPC_URL);

const alchomyUSER_OP_RPC_URL = "https://polygon-amoy.g.alchemy.com/v2/9tr2_JlJ_2LHNy8axYuw2osxj2ogJHpj";
const userOpProvider = new ethers.JsonRpcProvider(alchomyUSER_OP_RPC_URL);

const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const FACTORY_ADDRESS = "0x5ed4386F818f34f1f0c5b13C8eD513eDdF407B30";
const salt = 123;

const entryContract = new web3.eth.Contract(EntrypointABI, ENTRYPOINT_ADDRESS);

export async function getAddress(initCode) {
    var sender;
    try {
        await entryContract.methods.getSenderAddress(initCode).call()
    }
    catch (Ex) {
        console.log('ex', Ex);
        sender = "0x" + Ex.data.data.slice(-40);
    }
    return sender;
}

export const estimateUserOperationGas = async (userOp) => {
    console.log('estimateUserOperationGas function calling ...');
    const estimateGas = await bundlerWeb3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "eth_estimateUserOperationGas",
        params: [userOp, ENTRYPOINT_ADDRESS],
        id: new Date().getTime()
    });
    return estimateGas;
};

export const sendUserOperation = async (userOp) => {
    console.log('sendUserOperation function calling ...');
    const opHash = await bundlerWeb3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "eth_sendUserOperation",
        params: [userOp, ENTRYPOINT_ADDRESS],
        id: new Date().getTime()
    });
    return opHash;
};

export const personalSignIn = async (userOpHash, address) => {
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

export const createTx = async (ownerAddress, smartWalletAddress, callData) => {
    try {
        const AccountBytecode = Account.bytecode;

        const encodedArgs = web3.eth.abi.encodeParameters(
            ['address', 'address'],
            [ENTRYPOINT_ADDRESS, ownerAddress]
        );

        const bytecodeWithArgs = AccountBytecode + encodedArgs.slice(2);

        const encodedFunctionCall = web3.eth.abi.encodeFunctionCall(TransactionAbi.deployABI, [bytecodeWithArgs, salt]);

        var initCode = FACTORY_ADDRESS + encodedFunctionCall.slice(2);

        const sender = await getAddress(initCode);
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

        const gasEstimates = await estimateUserOperationGas(userOp);
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

        const OpHash = await sendUserOperation(userOp);
        if (await isApiResponseError(OpHash))
            return { error: true, message:OpHash?.error?.message || "Failed to send user operation."  };

        console.log('userOperation hash', OpHash);

        return { error: false, message: "" };
    } catch (err) {
        console.error("Error in createTx:", err);
        return { error: true, message: err.message || "Transaction failed." };
    }
};

export const contractDeployTx = async (ownerAddress, smartWalletAddress) => {
    const callData = "0x";
    return createTx(ownerAddress, smartWalletAddress, callData);
};

export const contractETHTx = async (ownerAddress, smartWalletAddress, receiverAddress, amount) => {
    const callData = web3.eth.abi.encodeFunctionCall(TransactionAbi.executeABI, [receiverAddress, amount, "0x"]);
    return createTx(ownerAddress, smartWalletAddress, callData);
};

export const contractERC20Tx = async (ownerAddress, smartWalletAddress, contractAddress, receiverAddress, tokenAmount) => {
    const callData = "0x";
    return createTx(ownerAddress, smartWalletAddress, callData);
}