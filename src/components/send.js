import React, { useState, useEffect, useContext } from 'react';

import { Web3Context } from '../App';

import {tokens} from '../token/tokens';
import { contractETHTx, contractERC20Tx, getUserOperationByHash } from './transaction';
import { fetchContractBalance, fetchBalance } from './estimateContractAddress';

import Loadingscr from './loading';
import ErrorPopup from './errorPopUp';
import SuccessPopup from './successPopUp';


function SendToken({ address, contractAddress }) {
    const web3 = useContext(Web3Context);

    const [chainBalance, setChainBalance] = useState(null);

    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [chain, setChain] = useState('ethereum');
    const [feeType, setFeeType] = useState('ethereum');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isValidAddress, setIsValidAddress] = useState(true);
    const [isValidAmount, setIsValidAmount] = useState(true);
    const [txStatus, setTxStatus] = useState('');
    const [txHash, setTxHash] = useState('');

    const handleChange = (e) => {
        setChain(e.target.value);
    };

    const handleFeeChange = (e) => {
        setFeeType(e.target.value);
    };

    // Debugging function to log error message whenever it changes
    useEffect(() => {
        if (errorMessage) {
            console.log('Error Message Set: ', errorMessage);
        }
    }, [errorMessage]);

    // show balance when chain changes
    useEffect(() => {
        const balance = async (contractAddress) => {
            var fetchedBalance = 0;
            if(chain === "ethereum")
                fetchedBalance = await fetchBalance(web3, contractAddress);
            else
                fetchedBalance = await fetchContractBalance(web3, contractAddress, chain);

            setChainBalance(fetchedBalance);
        };

        balance(contractAddress);  // Fetch conBalance immediately on address change

        // Start the interval to fetch conBalance every 5 seconds
        const intervalId = setInterval(() => {
            balance(contractAddress);
        }, 5000);  // Set interval for conBalance updates

        // Cleanup interval on address change or component unmount
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };

    }, [chain]);

    const stopLoading = () => {
        setLoading(false);
        setToAddress('');
        setAmount('');
        setChain('ethereum');
    };
    const handleError = (error) => {
        setErrorMessage(error); // Set error message in state
        console.log('Error occurred: ', error); // Log for debugging
        stopLoading();
    };

    const closePopup = () => {
        setErrorMessage(''); // Clear the error message to close the popup
        setTxStatus(''); // Clear the tx status to close
        setTxHash('') // Clear the tx hash to close
    };

    const sendTx = async () => {
        if (!web3) return;
        setLoading(true);

        // Validate Ethereum address
        if (!web3.utils.isAddress(toAddress)) {
            setIsValidAddress(false);
            setLoading(false);
            return;
        } else {
            setIsValidAddress(true);
        }

        // Validate amount
        if (isNaN(amount) || amount <= 0) {
            setIsValidAmount(false);
            setLoading(false);
            return;
        } else {
            setIsValidAmount(true);
        }

        console.log('Transaction Constructing...');
        
        var opHash = "";
        var error = false;
        var message = '';

        try {
            console.log('selected chain type: ', chain);
            if(chain === 'ethereum') {
                console.log('eth transaction......... fee', feeType);
                const sendAmount = web3.utils.toWei(amount, 'ether');
                const response = await contractETHTx(web3, address, contractAddress, toAddress, sendAmount, feeType);
                error = response.error;
                message = response.message;
                opHash = response.opHash;
            }
            else
            {
                if(chain in tokens){
                    console.log('token transaction......... fee', feeType);
                    const sendToken = web3.utils.toWei(amount, tokens[chain].decimals);
                    console.log('tokens[chain].address: ',  tokens[chain].address);
                    console.log('toAddress: ', toAddress);
                    console.log('sendToken: ', sendToken);
                    const response = await contractERC20Tx(web3, address, contractAddress, tokens[chain].address, toAddress, sendToken, feeType);
                    error = response.error;
                    message = response.message;
                    opHash = response.opHash;
                }
                else{
                    handleError(`Chain ${chain} is not supported.`);
                    stopLoading();
                    return;
                }
            }

            // Check if transaction was successful
            if (error) handleError(message);
        } catch (err) {
            console.error('Error in sendTx:', err);
            handleError(err.message);
        }

        stopLoading();
        
        //add the transaction submitted screen.
        if (!error) {
            console.log('getUserOperationByHash function calling ...');
            for (let i = 0; true; i++) {
                const response = await getUserOperationByHash(web3, opHash);
                const result = response.result;
                if (!(result === null) && result.status) {
                    console.log('Transaction status: ', result.status);
                    setTxStatus(result.status);
                    setTxHash(result.transaction);

                    if (['OnChain', 'Cancelled', 'Reverted'].includes(result.status)) {
                        if (result.status === 'Cancelled' || result.status === 'Reverted') {
                            handleError(`Transaction is ${result.status}. Try again later`);
                        } else {
                            console.log('Transaction completed successfully.');
                        }
                        break;
                    }
                }

                // Wait for a specified delay before retrying
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
    };

    return (
        <div>
            {!errorMessage ? (
                <div>
                    {!loading ? (
                        txStatus ? (
                            <SuccessPopup txStatus={txStatus} txHash={txHash} onClose={closePopup} />
                        ) : (
                            <div>
                                <h2>Send Token/Native Coins...</h2>
                                <div>
                                    <select value={chain} onChange={handleChange} style={optionBox}>
                                        <option value="ethereum">ETH (native)</option>
                                        <option value="sarvy">SAR</option>
                                        <option value="ronin">RON</option>
                                    </select>
                                    <p>balance: {chainBalance}</p>
                                    <form>
                                        <label>
                                            To Address:
                                            <input
                                                type="text"
                                                value={toAddress}
                                                onChange={(e) => setToAddress(e.target.value)}
                                                style={getInputStyle(isValidAddress)}
                                            />
                                            {!isValidAddress && <p style={errorTextStyle}>Invalid Ethereum address.</p>}
                                        </label>
                                        <br />
                                        <label>
                                            Amount:
                                            <input
                                                type="number"
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                style={getInputStyle(isValidAmount)}
                                            />
                                            {!isValidAmount && <p style={errorTextStyle}>Invalid amount.</p>}
                                        </label>
                                        <br />
                                        <label>
                                            Fee:
                                            <select value={feeType} onChange={handleFeeChange} style={feeOptionBox}>
                                            <option value="ethereum">ETH (native)</option>
                                            <option value="sarvy">SAR</option>
                                            <option value="ronin">RON</option>
                                            <option value="daiCoin">(empty)</option>
                                            <option value="tether">(empty)</option>
                                    </select>
                                        </label>
                                    </form>
                                </div>
                                <button onClick={sendTx} style={button}>Send</button>
                            </div>
                        )
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

// Dynamic style function for the input field
const getInputStyle = (isValid) => ({
    borderColor: isValid ? 'black' : 'red', // Red border for invalid input
    outline: isValid ? 'none' : '2px solid red', // Red outline for invalid input
    padding: '8px',
    borderRadius: '4px',
    width: '100%',
});

// Static style for the error message
const errorTextStyle = {
    color: 'red',
    fontSize: '12px',
    marginTop: '4px',
};

const optionBox = {
    borderColor: 'black',
    marginTop: '10px',
    marginBottom: '10px',
    padding: '8px',
    borderRadius: '4px',
    width: '20%',
}

const feeOptionBox = {
    borderColor: 'black',
    marginTop: '10px',
    marginBottom: '10px',
    padding: '8px',
    borderRadius: '4px',
}

const button = {
    backgroundColor: 'green',
    color: 'white',
    borderRadius: '4px',
    padding: '10px 20px',
    width: '20%',
    cursor: 'pointer',

}

export default SendToken;