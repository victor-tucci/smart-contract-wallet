import React, { useState,useEffect } from 'react';
import ContractInfo from './contractDetails';
import Loadingscr from './loading';
import SendToken from './send';
import Web3 from 'web3';
import { ethers } from 'ethers';

import ErrorPopup from './errorPopUp';
import Entrypoint from '../abi/EntryPoint.json';
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
    const [balance, setBalance] = useState('');
    const [loading, setLoading] = useState(false);
    const [contractAddress, setContractAddress] = useState("");
    const [errorMessage, setErrorMessage] = useState('');

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

    // Debugging function to log error message whenever it changes
    useEffect(() => {
        if (errorMessage) {
            console.log("Error Message Set: ", errorMessage);
        }
    }, [errorMessage]);

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
        });
        return estimateGas;
    };

    const sendUserOperation = async (userOp) => {
        const opHash = await bundlerWeb3.currentProvider.sendAsync({
            jsonrpc: "2.0",
            method: "eth_sendUserOperation",
            params: [userOp, ENTRYPOINT_ADDRESS],
            id: new Date().getTime()
        });
        return opHash;
    };

    const handleApiResponse = (response) => {
        if (response.error) {
            setErrorMessage(response.error.message);
            setLoading(false);
        }
    };
    
    const handleError = (error) => {
        setErrorMessage(error); // Set error message in state
        console.log("Error occurred: ", error); // Log for debugging
    };

    const closePopup = () => {
        setErrorMessage(''); // Clear the error message to close the popup
    };

    async function checkContract(sender) {
        if (!sender || !web3) return;

        try {
            const code = await web3.eth.getCode(sender);
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
        console.log('Contract deploy constructing...', balance);

        if (balance < 0.1) {
            console.log('Insufficient funds');
            handleError("Insufficient funds to deploy contract.");
            return;
        }

        setLoading(true);

        try {
            const AccountBytecode = Account.bytecode;

            const encodedArgs = web3.eth.abi.encodeParameters(
                ['address', 'address'],
                [ENTRYPOINT_ADDRESS, props.address]
            );

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
                paymasterAndData: "0x", 
                signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c", 
            };

            const gasEstimates = await estimateUserOperationGas(userOp);
            console.log('eth_estimateUserOperationGas', gasEstimates);
            if(handleApiResponse(gasEstimates))
                return;

            const { preVerificationGas, verificationGasLimit, callGasLimit, maxPriorityFeePerGas } = gasEstimates.result;
            userOp.preVerificationGas = preVerificationGas;
            userOp.verificationGasLimit = verificationGasLimit;
            userOp.callGasLimit = callGasLimit;
            userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

            const { maxFeePerGas } = await userOpProvider.getFeeData();
            userOp.maxFeePerGas = "0x" + maxFeePerGas.toString(16);

            const userOpHash = await entryContract.methods.getUserOpHash(userOp).call();
            console.log({ userOpHash });

            userOp.signature = await window.ethereum.request({
                method: "personal_sign",
                params: [userOpHash, props.address],
            });

            console.log({ userOp });

            const OpHash = await sendUserOperation(userOp);
            if(handleApiResponse(OpHash))
                return;
            console.log('userOperation hash', OpHash);
            console.log('Contract Deployed');

            await checkContract(sender);
        } catch (error) {
            console.error("Error calling the deploy:", error);
            handleError(error.message); // Ensure any error is caught and displayed
        }

        setLoading(false);
    };

    return (
        <div>
            {!errorMessage ? (
                <div>
                    {!loading ? (
                        <div>
                            <h1>Contract Information</h1>
                            <ContractInfo
                                address={props.address}
                                setIsContract={setIsContract}
                                setContractInfoFetch={setContractInfoFetch}
                                setContractAddress={setContractAddress}
                                setBalance={setBalance}
                            />
                            {contractInfoFetch && (
                                <div>
                                    {isContract ? (
                                        <SendToken address={props.address} contractAddress={contractAddress} />
                                    ) : (
                                        <>
                                            <p>*Initially fund the wallet and click the create contract for the first time</p>
                                            <button onClick={deployContract}>Create Contract</button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <Loadingscr />
                    )}
                </div>
            ) : (
                <ErrorPopup errorMessage={errorMessage} onClose={closePopup} />
            )}
        </div>
    );
}

export default DeployContract;
