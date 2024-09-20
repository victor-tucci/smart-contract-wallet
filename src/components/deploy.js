import React, { useState } from 'react'
import ContractInfo from './contractDetails';
import Loadingscr from './loading';
import SendToken from './send';
import Web3 from 'web3';
import { ethers } from 'ethers';

import Entrypoint from '../abi/EntryPoint.json'
import Account from '../abi/SimpleAccount.json';
import AccountFactory from '../abi/AccountFactory.json';

const EntrypointABI = Entrypoint.abi;
const web3 = new Web3(window.ethereum);

const USER_OP_RPC_URL = "http://0.0.0.0:14337/rpc";
const bundlerWeb3 = new Web3(USER_OP_RPC_URL);

const alchomyUSER_OP_RPC_URL = "https://polygon-amoy.g.alchemy.com/v2/9tr2_JlJ_2LHNy8axYuw2osxj2ogJHpj";
const userOpProvider = new ethers.JsonRpcProvider(alchomyUSER_OP_RPC_URL);

const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
const FACTORY_ADDRESS = "0x5ed4386F818f34f1f0c5b13C8eD513eDdF407B30";
const salt = 123;

function DeployContract(props) {

    const [isContract, setIsContract] = useState(false);
    const [contractInfoFetch, setContractInfoFetch] = useState(false);
    const [loading, setLoading] = useState(false);
    const [contractAddress, setContractAddress] = useState("");

    const entryContract = new web3.eth.Contract(EntrypointABI, ENTRYPOINT_ADDRESS);

    const deployFunctionAbi = {
        "inputs": [
            {
                "internalType": "bytes",
                "name": "code",
                "type": "bytes"
            },
            {
                "internalType": "uint256",
                "name": "salt",
                "type": "uint256"
            }
        ],
        "name": "deploy",
        "type": "function"
    }

    async function getAddress(initCode) {
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

    const estimateUserOperationGas = async (userOp) => {

        const estimateGas = await bundlerWeb3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "eth_estimateUserOperationGas",
            params: [userOp, ENTRYPOINT_ADDRESS],
            id: new Date().getTime()
        })
        return estimateGas;
    };

    const sendUserOperation = async (userOp) => {

        const opHash = await bundlerWeb3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "eth_sendUserOperation",
            params: [userOp, ENTRYPOINT_ADDRESS],
            id: new Date().getTime()
        })
        return opHash;
    };

    async function checkContract(sender) {
        if (!sender || !web3) return;
  
        try {
          // Fetch contract bytecode
          const code = await web3.eth.getCode(sender);
  
          // Check if bytecode is not empty
          if (code !== '0x') {
            setIsContract(true);
          } else {
            setIsContract(false);
          }
        } catch (error) {
          console.error("Error checking contract:", error);
        }
    };

    const deployContract = async () => {
        console.log('contract deploy constructing...');
        setLoading(true);

        try {
            const AccountBytecode = Account.bytecode;

            // Encode the constructor arguments
            const encodedArgs = web3.eth.abi.encodeParameters(
                ['address', 'address'],
                [ENTRYPOINT_ADDRESS, props.address]
            );

            // Concatenate bytecode with the encoded constructor arguments
            const bytecodeWithArgs = AccountBytecode + encodedArgs.slice(2);

            const encodedFunctionCall = web3.eth.abi.encodeFunctionCall(deployFunctionAbi, [bytecodeWithArgs, salt]);

            var initCode = FACTORY_ADDRESS + encodedFunctionCall.slice(2);

            const sender = await getAddress(initCode);
            console.log({ sender });

            if (isContract) {
                initCode = "0x";
            }

            const userOp = {
                sender,
                nonce: "0x" + (await entryContract.methods.getNonce(sender, 0).call()).toString(16),
                initCode,
                callData: "0x",
                paymasterAndData: "0x", // we're not using a paymaster, for now
                signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c", // we're not validating a signature, for now
            };
            // console.log({userOp});

            const gasEstimates = await estimateUserOperationGas(userOp);
            console.log('eth_estimateUserOperationGas', gasEstimates);

            const { preVerificationGas, verificationGasLimit, callGasLimit, maxPriorityFeePerGas } = gasEstimates.result;
            userOp.preVerificationGas = preVerificationGas;
            userOp.verificationGasLimit = verificationGasLimit;
            userOp.callGasLimit = callGasLimit;
            // userOp.maxFeePerGas = maxFeePerGas;
            userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

            const { maxFeePerGas } = await userOpProvider.getFeeData();
            userOp.maxFeePerGas = "0x" + maxFeePerGas.toString(16);

            const userOpHash = await entryContract.methods.getUserOpHash(userOp).call();
            console.log({ userOpHash });

            // Sign the userOpHash using personal_sign
            console.log('props.address', props.address);

            // const signature = await web3.eth.personal.sign(userOpHash, props.address);
            userOp.signature = await window.ethereum.request({
                method: "personal_sign",
                params: [userOpHash, props.address],
            });

            console.log({ userOp });

            // Send the signed userOp to the bundler
            console.log('Contract Deploying...');
            const OpHash = await sendUserOperation(userOp);
            console.log('userOperation hash', OpHash);
            console.log('Contract Deployed');

            await checkContract(sender);
        } catch (error) {
            console.error("Error calling the deploy:", error);
        }

        setLoading(false);

    };

    return (
        <div>
            {!loading ?
                <div>
                    <h1>Contract Information</h1>
                    <ContractInfo address={props.address} setIsContract={(e) => setIsContract(e)} setContractInfoFetch={(e) => setContractInfoFetch(e)} setContractAddress={(e)=> setContractAddress(e)} />

                    {contractInfoFetch &&
                        <div>
                            {isContract ? <div>
                                <SendToken address={props.address} contractAddress={contractAddress}/>
                            </div> : <>
                                <p>*initialy fund the wallet and click the create contract for the first time</p>
                                <button onClick={deployContract}>createContract</button>
                            </>
                            }
                        </div>
                    }
                </div> : <>
                    <Loadingscr />
                </>
            }
        </div>
    )
}

export default DeployContract;