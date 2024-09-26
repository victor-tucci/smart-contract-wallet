import React, { useState, useEffect } from 'react';
import ContractInfo from './contractDetails';
import { contractDeployTx, getUserOperationByHash } from './transaction';
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
        setErrorMessage(error);
        console.log("Error occurred: ", error);
        setLoading(false);
    };

    const closePopup = () => {
        setErrorMessage('');
        setTxStatus('');
        setTxHash('');
    };

    async function checkIsContract(sender) {
        if (!sender || !web3) return false;
        try {
            const code = await web3.eth.getCode(sender);
            console.log('Code:', code);
            return code !== '0x';
        } catch (error) {
            console.error("Error checking contract:", error);
            return false;
        }
    }

    const deployContract = async () => {
        if (balance < 0.1) {
            handleError("Insufficient funds to deploy contract.");
            return;
        }

        setLoading(true);

        try {
            const { error, message, opHash } = await contractDeployTx(props.address, contractAddress);

            if (error) {
                handleError(message);
                return;
            }

            console.log('getUserOperationByHash function calling ...');
            for (let i = 0; ; i++) {
                const response = await getUserOperationByHash(opHash);
                const result = response.result;
                if (result && result.status) {
                    setTxStatus(result.status);
                    setTxHash(result.transaction);

                    if (['Cancelled', 'Reverted'].includes(result.status)) {
                        handleError(`Transaction is ${result.status}. Try again later.`);
                        return;
                    }

                    if (result.status === 'OnChain') {
                        console.log('Transaction completed successfully.');
                        break;
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        } catch (error) {
            console.error("Error during deployment:", error);
            handleError(error.message);
        }

        // Check if contract has been created
        for (let i = 0; i < 10; i++) {
            const isCon = await checkIsContract(contractAddress);
            if (isCon) {
                setIsContract(true);
                break;
            }
            if(i === 9){
                handleError("Contract has not been created");
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        setLoading(false);
    };

    return (
        <div>
            {!errorMessage ? (
                txStatus ? (
                    <SuccessPopup txStatus={txStatus} txHash={txHash} onClose={closePopup} />
                ) : (
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
                                                {balance < 0.1 && (
                                                    <p style={{ color: "red" }}>
                                                        * Initially fund the wallet and click create contract for the first time
                                                    </p>
                                                )}
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
                )
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
};

const layer2 = {
    marginTop: '20px',
};

export default DeployContract;
