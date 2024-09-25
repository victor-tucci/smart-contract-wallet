import React, { useState,useEffect } from 'react';
import ContractInfo from './contractDetails';
import { contractDeployTx, getUserOperationByHash} from './transaction';
import Loadingscr from './loading';
import SendToken from './send';
import Web3 from 'web3';

import ErrorPopup from './errorPopUp';
import SuccessPopup from './successPopUp';

const web3 = new Web3(window.ethereum);


function DeployContract(props) {
    const [isContract, setIsContract] = useState(false);
    const [contractInfoFetch, setContractInfoFetch] = useState(false);
    const [balance, setBalance] = useState('');
    const [loading, setLoading] = useState(false);
    const [contractAddress, setContractAddress] = useState("");
    const [errorMessage, setErrorMessage] = useState('');
    const [txStatus, setTxStatus] = useState('');
    const [txHash, setTxHash] = useState('');

    // Debugging function to log error message whenever it changes
    useEffect(() => {
        if (errorMessage) {
            console.log("Error Message Set: ", errorMessage);
        }
    }, [errorMessage]);

    const handleError = (error) => {
        setErrorMessage(error); // Set error message in state
        console.log("Error occurred: ", error); // Log for debugging
        setLoading(false);
    };

    const closePopup = () => {
        setErrorMessage(''); // Clear the error message to close the popup
        setTxStatus(''); // Clear the tx status to close
        setTxHash('') // Clear the tx hash to close
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

        var opHash = "";
        var error = false;
        var message = '';

        try {
            const response = await contractDeployTx(props.address, contractAddress);
            error = response.error;
            message = response.message;
            opHash = response.opHash;
            
            if(error){
                handleError(message);
                return;
            }

        } catch (error) {
            console.error("Error calling the deploy:", error);
            handleError(error.message); // Ensure any error is caught and displayed
        }


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
                        if (result.status === 'Cancelled' || result.status === 'Reverted') {
                            handleError(`Transaction is ${result.status}. Try again later`);
                            return;
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

        await checkContract(contractAddress);

        setLoading(false);
    };

    return (
        <div>
            {!errorMessage ? (
                txStatus ? (
                    <SuccessPopup txStatus={txStatus} txHash={txHash} onClose={closePopup} />
                ) :
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
                                <div style={layer2}>
                                    {isContract ? (
                                        <SendToken address={props.address} contractAddress={contractAddress} />
                                    ) : (
                                        <>
                                            { !(balance > 0.1) && <p style={{color: "red"}}>*Initially fund the wallet and click the create contract for the first time</p>}
                                            <button onClick={deployContract} style={button}>Create Contract</button>
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

const button = {
    backgroundColor: 'green',
    color: 'white',
    borderRadius: '4px',
    padding: '10px 20px',
    width: '20%',
    cursor: 'pointer',

}

const layer2 ={
    marginTop: '20px',
}
export default DeployContract;
