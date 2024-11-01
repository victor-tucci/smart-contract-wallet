import React, { useEffect, useState, useContext } from 'react';
import { Card } from "react-bootstrap";

import { Web3Context } from '../App';

import { getEstimateAddress, fetchBalance } from './estimateContractAddress';
import { contractDeployTx, getUserOperationByHash, checkContract } from './transaction';
import Loadingscr from './loading';
import SendToken from './send';
import ErrorPopup from './errorPopUp';
import SuccessPopup from './successPopUp';

import AccountFactory from '../abi/AccountFactory.json';
import Account from '../abi/SimpleAccount.json';


function ContractPage(props) {
    const web3 = useContext(Web3Context);

    const [conAddress, setConAddress] = useState('');  // Initialize as an empty string
    const [conBalance, setConBalance] = useState(null);
    const [isContract, setIsContract] = useState(false);
    const [contractInfoFetch, setContractInfoFetch] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [txStatus, setTxStatus] = useState('');
    const [txHash, setTxHash] = useState('');

    const [feeType, setFeeType] = useState('ethereum');

    const handleFeeChange = (e) => {
        console.log('Deploy screen feeType:',e.target.value);
        setFeeType(e.target.value);
    };

    useEffect(() => {
        console.log('estimate contract address are fetching...', props.address, props.chainType);
        const getContractAddress = async () => {
            const estimateAddress = await getEstimateAddress(web3, props.address);
            setConAddress(estimateAddress);
        };

        getContractAddress();
    }, [props.address, props.chainType]);  // Re-run when props.address props.chainType changes


    useEffect(() => {
        if (!conAddress) {
            setConBalance(null);
            setContractInfoFetch(false);
            setIsContract(false);
            return;
        }

        checkIsContract(conAddress); // check the contract is deployed or not

        const contractBalance = async (conAddress) => {
            const fetchedBalance = await fetchBalance(web3, conAddress);
            setConBalance(fetchedBalance);
        };

        contractBalance(conAddress);  // Fetch conBalance immediately on address change

        // Start the interval to fetch conBalance every 5 seconds
        const intervalId = setInterval(() => {
            contractBalance(conAddress);
        }, 5000);  // Set interval for conBalance updates

        // Cleanup interval on address change or component unmount
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };


    }, [conAddress]);  // Re-run when conAddress changes

    async function checkIsContract(conAddress) {
        console.log('Check isContract....', conAddress);

        try {
            // Fetch contract bytecode
            const code = await web3.eth.getCode(conAddress);

            // Check if bytecode is not empty
            if (code !== '0x')
                setIsContract(true);
            else
                setIsContract(false);

            setContractInfoFetch(true);
        } catch (error) {
            console.error("Error checking contract:", error);
        }

    };

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

    const deployContract = async () => {
        if (conBalance < 0.1) {
            handleError("Insufficient funds to deploy contract.");
            return;
        }

        setLoading(true);

        try {
            const { error, message, opHash } = await contractDeployTx(web3, props.address, conAddress,feeType);

            if (error) {
                handleError(message);
                return;
            }

            console.log('getUserOperationByHash function calling ...');
            for (let i = 0; ; i++) {
                const response = await getUserOperationByHash(web3, opHash);
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
            const isCon = await checkContract(conAddress);
            if (isCon) {
                setIsContract(true);
                break;
            }
            if (i === 9) {
                handleError("Contract has not been created");
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        setLoading(false);
    };

    return (
        <div>
            <Card className="contract-info">
                <h2 style={walletTitle}>Smart Wallet</h2>
                <Card.Header>
                    <strong>Contract Address: </strong>
                    {conAddress || "Fetching..."}
                </Card.Header>
                <Card.Body>
                    <Card.Text>
                        <strong>Balance: </strong>
                        {conBalance !== null ? conBalance : "Fetching..."}
                    </Card.Text>
                </Card.Body>
            </Card>
    
            {contractInfoFetch && (
                <div style={layer2}>
                    {isContract ? (
                        <SendToken address={props.address} contractAddress={conAddress} />
                    ) : (
                        <div>
                            {!errorMessage ? (
                                txStatus ? (
                                    <SuccessPopup txStatus={txStatus} txHash={txHash} onClose={closePopup} />
                                ) : (
                                    <div>
                                        {!loading ? (
                                            <div>
                                                {conBalance < 0.1 && (
                                                    <p style={{ color: "red" }}>
                                                        * Initially fund the wallet and click create contract for the first time
                                                    </p>
                                                )}
                                                {/* <label>
                                                    Deploy Fee: 
                                                    <select value={feeType} onChange={handleFeeChange} style={feeOptionBox}>
                                                    <option value="ethereum">ETH (native)</option>
                                                    <option value="sarvy">SAR</option>
                                                    <option value="ronin">RON</option>
                                                    <option value="daiCoin">(empty)</option>
                                                    <option value="tether">(empty)</option>
                                                    </select>
                                                </label>
                                                <br/> */}
                                                <button onClick={deployContract} style={button}>Create Contract</button>
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
                    )}
                </div>
            )}
        </div>
    );
    
}

const walletTitle = {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px'
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

const feeOptionBox = {
    borderColor: 'black',
    marginTop: '10px',
    marginBottom: '10px',
    padding: '4px',
    borderRadius: '4px',
}

export default ContractPage;