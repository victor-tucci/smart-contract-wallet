import React, { useState } from 'react'
import Loadingscr from './loading';

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

function SendToken({ address, contractAddress }) {
    const [toAddress, setToAddress] = useState("");
    const [amount, setAmount] = useState("");
    const [chain, setChain] = useState("ethereum");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const entryContract = new web3.eth.Contract(EntrypointABI, ENTRYPOINT_ADDRESS);

    const executeFunctionAbi = {
        "inputs": [
            {
                "internalType": "address",
                "name": "dest",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "func",
                "type": "bytes"
            }
        ],
        "name": "execute",
        "type": "function"
    }

    const handleChange = (e) => {
        setChain(e.target.value);
    };

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

    const handleApiResponse = (response) => {
        if (response.error) {
            setErrorMessage(response.error.message); // Set the error message
        }
    };

    const closePopup = () => {
        setErrorMessage(''); // Clear the error message to close the popup
    };

    const sendTx = async () => {
        if (!web3) return;
        setLoading(true);

        const sender = contractAddress;
        console.log("Transaction Constructing...");
        console.log('contract address: ', sender, address);

        const initCode = "0x";

        console.log('toAddress: ', toAddress);
        console.log('amount: ', web3.utils.toWei(amount, "ether"));
        const amt = await web3.utils.toWei(amount, "ether");

        const callData = web3.eth.abi.encodeFunctionCall(executeFunctionAbi, [toAddress, amt, "0x"]);

        const userOp = {
            sender,
            nonce: "0x" + (await entryContract.methods.getNonce(sender, 0).call()).toString(16),
            initCode,
            callData,
            paymasterAndData: "0x", // we're not using a paymaster, for now
            signature: "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c", // we're not validating a signature, for now
        };
        console.log({ userOp });

        const gasEstimates = await estimateUserOperationGas(userOp);
        console.log('eth_estimateUserOperationGas', gasEstimates);

        const { preVerificationGas, verificationGasLimit, callGasLimit, maxPriorityFeePerGas } = gasEstimates.result;
        userOp.preVerificationGas = preVerificationGas;
        userOp.verificationGasLimit = "0x20d6";
        // userOp.verificationGasLimit = verificationGasLimit;
        userOp.callGasLimit = callGasLimit;
        userOp.maxPriorityFeePerGas = maxPriorityFeePerGas;

        const { maxFeePerGas } = await userOpProvider.getFeeData();
        userOp.maxFeePerGas = "0x" + maxFeePerGas.toString(16);

        const userOpHash = await entryContract.methods.getUserOpHash(userOp).call();
        console.log({ userOpHash });

        // Sign the userOpHash using personal_sign
        userOp.signature = await window.ethereum.request({
            method: "personal_sign",
            params: [userOpHash, address],
        });

        console.log({ userOp });

        // Send the signed userOp to the bundler
        console.log('Transaction submitting...');
        const OpHash = await sendUserOperation(userOp);
        console.log('userOperation hash', OpHash);
        handleApiResponse(OpHash);
        console.log('Transaction sucessfully sent');

        setLoading(false);
        setToAddress('');
        setAmount('');
    }

    return (
        <div>
            {!errorMessage ?
                <div>
                    {!loading ?
                        <div>
                            <h2>send Token/native Coins...</h2>
                            <div>
                                <form>
                                    <label>To Address:
                                        <input type="text"
                                            value={toAddress}
                                            onChange={(e) => setToAddress(e.target.value)} />
                                    </label>
                                    <br />
                                    <label>Amount:
                                        <input type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)} />
                                    </label>
                                </form>
                            </div>
                            <div>
                                <select value={chain} onChange={handleChange}>
                                    <option value="ethereum">ETH(native)</option>
                                    <option value="sarvy">SAR</option>
                                    <option value="shibu">SHIB</option>
                                    <option value="daiCoin">DAI</option>
                                    <option value="tether">USDT</option>
                                </select>
                            </div>
                            <button onClick={sendTx}>send </button>
                        </div> : <>
                            <Loadingscr />
                        </>
                    }
                </div> : <>
                    <ErrorPopup errorMessage={errorMessage} onClose={closePopup} />
                </>}
        </div>
    )
}

export default SendToken;