import React, { useEffect, useState } from 'react';
import { Card } from "react-bootstrap";
import Web3 from 'web3';
import AccountFactory from '../abi/AccountFactory.json';
import Account from '../abi/SimpleAccount.json';

const AccountFactoryABI = AccountFactory.abi;
const web3 = new Web3(window.ethereum);

function ContractInfo(props) {
    const [address, setAddress] = useState("");  // Initialize as an empty string
    const [balance, setBalance] = useState(null);

    const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
    const FACTORY_ADDRESS = "0x5ed4386F818f34f1f0c5b13C8eD513eDdF407B30";
    const salt = 123;

    const contract = new web3.eth.Contract(AccountFactoryABI, FACTORY_ADDRESS);

    async function checkContract(estimateAddress) {
        if (!estimateAddress || !web3) return;
  
        try {
          // Fetch contract bytecode
          const code = await web3.eth.getCode(estimateAddress);
        //   console.log('Code:', code);
  
          // Check if bytecode is not empty
          if (code !== '0x') {
            props.setIsContract(true);
          } else {
            props.setIsContract(false);
          }

          props.setContractInfoFetch(true);
        } catch (error) {
          console.error("Error checking contract:", error);
        }
      };

    // Call the function to get the estimated address
    async function getEstimatedAddress() {
        try {
            const AccountBytecode = Account.bytecode;
            // console.log("AccountBytecode:", AccountBytecode);

            // Encode the constructor arguments
            const encodedArgs = web3.eth.abi.encodeParameters(
                ['address', 'address'],
                [ENTRYPOINT_ADDRESS, props.address]
            );

            // Concatenate bytecode with the encoded constructor arguments
            const bytecodeWithArgs = AccountBytecode + encodedArgs.slice(2);

            // Call the estimatedAddress function from AccountFactory contract
            const estimatedAddr = await contract.methods.estimatedAddress(bytecodeWithArgs, salt).call();
            console.log("Estimated Address:", estimatedAddr);
            setAddress(estimatedAddr);
            props.setContractAddress(estimatedAddr);
            checkContract(estimatedAddr);
        } catch (error) {
            console.error("Error calling estimatedAddress:", error);
        }
    }

    // Fetch contract details and address on mount
    useEffect(() => {
        getEstimatedAddress();
    }, [props.address]);  // Re-run when props.address changes

    // Fetch balance every 5 seconds
    async function fetchBalance() {
        if (web3.utils.isAddress(address)) {  // Validate address
            try {
                const balance = await web3.eth.getBalance(address);
                const formattedBalance = web3.utils.fromWei(balance, "ether");
                // console.log("Balance is:", formattedBalance);
                setBalance(formattedBalance);
                props.setBalance(formattedBalance);  // Update balance in props for parent component
            } catch (error) {
                console.error("Error fetching balance:", error);
            }
        } else {
            console.error("Invalid address:", address);
        }
    }

    // Fetch balance when the address is updated
    useEffect(() => {
        if (!address) return;

        // Start the interval to fetch balance every 5 seconds
        fetchBalance();  // Fetch balance immediately on address change
        const intervalId = setInterval(() => {
            fetchBalance()
        }, 5000);  // Set interval for balance updates

        // Cleanup interval on address change or component unmount
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };

    }, [address]);

    return (
        <div>
            <Card className="text-center">
                <Card.Header>
                    <strong>Contract Address: </strong>
                    {address || "Fetching..."}
                </Card.Header>
                <Card.Body>
                    <Card.Text>
                        <strong>Balance: </strong>
                        {balance !== null ? balance : "Fetching..."}
                    </Card.Text>
                </Card.Body>
            </Card>
        </div>
    );
}

export default ContractInfo;
