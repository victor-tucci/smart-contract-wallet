import React, { useState, useEffect } from 'react';
import Loadingscr from './loading';
import Web3 from 'web3';
import {tokens} from '../token/tokens';
import { contractETHTx, contractERC20Tx, getUserOperationByHash } from './transaction';
import ErrorPopup from './errorPopUp';
import SuccessPopup from './successPopUp';

const web3 = new Web3(window.ethereum);

function SendToken({ address, contractAddress }) {
    const [toAddress, setToAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [chain, setChain] = useState('ethereum');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isValidAddress, setIsValidAddress] = useState(true);
    const [isValidAmount, setIsValidAmount] = useState(true);
    const [txStatus, setTxStatus] = useState('');
    const [txHash, setTxHash] = useState('');

    const handleChange = (e) => {
        setChain(e.target.value);
    };

    // Debugging function to log error message whenever it changes
    useEffect(() => {
        if (errorMessage) {
            console.log('Error Message Set: ', errorMessage);
        }
    }, [errorMessage]);

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
                console.log('eth transaction.........');
                const sendAmount = web3.utils.toWei(amount, 'ether');
                const response = await contractETHTx(address, contractAddress, toAddress, sendAmount);
                error = response.error;
                message = response.message;
                opHash = response.opHash;
            }
            else
            {
                if(chain in tokens){
                    const sendToken = web3.utils.toWei(amount, tokens[chain].decimals);
                    console.log('tokens[chain].address: ',  tokens[chain].address);
                    console.log('toAddress: ', toAddress);
                    console.log('sendToken: ', sendToken);
                    const response = await contractERC20Tx(address, contractAddress, tokens[chain].address, toAddress, sendToken);
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
                const response = await getUserOperationByHash(opHash);
                const result = response.result;
                if (!(result === null) && result.status) {
                    console.log('Transaction status: ', result.status);
                    setTxStatus(result.status);
                    setTxHash(result.transaction);

                    if (['OnChain', 'Cancelled', 'Reverted'].includes(result.status)) {
                        console.log('Transaction completed successfully.');
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
                                    </form>
                                    <select value={chain} onChange={handleChange} style={optionBox}>
                                        <option value="ethereum">ETH (native)</option>
                                        <option value="sarvy">SAR</option>
                                        <option value="shibu">SHIB</option>
                                        <option value="daiCoin">DAI</option>
                                        <option value="tether">USDT</option>
                                    </select>
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

const button = {
    backgroundColor: 'green',
    color: 'white',
    borderRadius: '4px',
    padding: '10px 20px',
    width: '20%',
    cursor: 'pointer',

}

export default SendToken;