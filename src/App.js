import logo from './logo.svg';
import './App.css';
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";

import Web3 from 'web3';

import {switchWallet} from './components/switchWallet';
import EoaWalletDetails from './components/eoaWallet';
import ContractPage from './components/contractPage';

import React, { useState, createContext, useEffect} from'react';
export const Web3Context = createContext();

const chainTypeAndID = {
  sepolia: {
    chainId: "0xaa36a7"
  },
  amoy: {
    chainId: "0x13882"
  }
}

const chainIdandType = {
  "0xaa36a7": "sepolia",
  "0x13882": "amoy"
}

function App() {
  const [web3, setWeb3] = useState('');
  const [chainType, setChainType] = useState('amoy');
  const [selectChainType, setSelectChainType] = useState('amoy');
  
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState(0);

  //wallet switch based on the chain type
  const [isWalletConnected, setIsWalletConnected] =useState(false);
  const [connectiondone, setChainConnectionDone] = useState(false);

  const handleChainChange = async (chainId) => {
    const newChainType = chainIdandType[chainId];
    console.log("handleChainChange newChainType", newChainType);

    if(!newChainType){
      alert("chain id Does not support switching to default chain type");

      if(!(chainTypeAndID[chainType].chainId === chainId)){
        //perform switch wallet
        const[error, message] = await switchWallet(chainType);
        if(!error){
          setSelectChainType(chainType);
        }
      }
    }
    else
      setSelectChainType(newChainType);
  };

  useEffect(() =>{

      window.ethereum.on("accountsChanged", (accounts) => {
        accountChangeHandler(accounts[0]);
      });

      window.ethereum.on("chainChanged", (chainId) => {
        handleChainChange(chainId);
      });
      
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => { });
        window.ethereum.removeListener('chainChanged', () => { });
      }
    };
  },[]);

  useEffect(() => {
    if (!address || !web3) return;

    const fetchBalance = async () => {
      await getBalance(address);
    };

    fetchBalance(); // Fetch balance immediately when address changes
    const intervalId = setInterval(fetchBalance, 5000); // Set interval for balance updates

    return () => clearInterval(intervalId); // Cleanup interval on component unmount or address change
  },[address, web3]);

  useEffect(()=>{
    if(isWalletConnected && connectiondone){
      handleButtonClick();
    }

  },[selectChainType, isWalletConnected]);

  const getBalance = async (address) => {
    try {
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });

      setBalance(web3.utils.fromWei(balance, "ether"));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const handleChange = (e) => {
    setSelectChainType(e.target.value);
  };

  const accountChangeHandler = (account) => {
    console.log("Account changed",account);
    setAddress(account);
  };

  const handleButtonClick = async () => {
    console.log("Connecting to wallet...");
    
    // connectiondone = false;
    setChainConnectionDone(false);
    if (window.ethereum) {

      // wallet is already connected
      setIsWalletConnected(true);

      const providerChainId = await window.ethereum.request({ method: "eth_chainId" });
      console.log("selectorChainId,providerChainId", chainTypeAndID[selectChainType].chainId, providerChainId);

      if(!(chainTypeAndID[selectChainType].chainId === providerChainId)){
        //perform switch wallet
        const[error, message] = await switchWallet(selectChainType);
        console.log("wait untill switchWallet done", error, message);
        if(!error){
          setChainType(selectChainType);
        }else{
          setSelectChainType(chainType); // need to set the old chain type
          if(message === "pending"){

          }
        }
      }else{
        setChainType(selectChainType);
      }

      setWeb3(new Web3(window.ethereum));

      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      
      accountChangeHandler(accounts[0]);

    }else {
      alert("Please install the Metamask extension!");
    }

    // connectiondone = true;
    setChainConnectionDone(true);
    console.log("Wallet is connected",connectiondone);
  }

  return (
    <div className='App'>
      <header className="App-header">
        <h1>Louice Wallet</h1>
      </header>

      <div>
        <select value={selectChainType} onChange={handleChange} style={optionBox}>
          <option value="sepolia">Sepolia</option>
          <option value="amoy">Amoy</option>
        </select>

        <Button onClick={handleButtonClick} variant="primary">
          {address ? <EoaWalletDetails address={address} Balance={balance} /> : 'Connect Wallet'}
        </Button>
        <Web3Context.Provider value={web3}>
          {address && <ContractPage address={address} chainType={chainType} />}
        </Web3Context.Provider>
      </div>

    </div>
  );
}

const optionBox = {
  borderColor: 'black',
  marginTop: '10px',
  marginBottom: '10px',
  marginRight: '10px',
  padding: '7px',
  borderRadius: '4px',
  width: '10%',
};

export default App;
