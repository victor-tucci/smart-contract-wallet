import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import './App.css';
import { Button } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import DeployContract from './components/deploy';
import SendToken from './components/send';
import EoaWalletDetails from "./components/eoaWallet";
import Web3 from 'web3';
// import dotenv from 'dotenv';

// dotenv.config();

function App() {
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(null);
  const [screen, setScreen] = useState(0);
  const [web3, setWeb3] = useState(null);

  const btnhandler = () => {
    if (window.ethereum) {
      console.log('Network version:', window.ethereum.networkVersion);
      // console.log('print rpc:', process.env.RPC_URL);
      // Initialize Web3
      setWeb3(new Web3(window.ethereum));
      
      window.ethereum
        .request({ method: "eth_requestAccounts" })
        .then((res) => {
          console.log('Response after the account request to Metamask:', res);
          accountChangeHandler(res[0]);
        });
    } else {
      alert("Please install the Metamask extension!");
    }
  };

  const getBalance = async (address) => {
    try {
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      });
      // console.log("Balance is:", balance);
      setBalance(web3.utils.fromWei(balance, "ether"));
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  };

  const accountChangeHandler = (account) => {
    setAddress(account);
    setScreen(1);
  };

  useEffect(() => {
    if (!address || !web3) return;

    const fetchBalance = async () => {
      await getBalance(address);
    };

    fetchBalance(); // Fetch balance immediately when address changes
    const intervalId = setInterval(fetchBalance, 5000); // Set interval for balance updates

    return () => clearInterval(intervalId); // Cleanup interval on component unmount or address change
  }, [address, web3]);


  return (
    <div className='App'>
      <h1>Louice Wallet</h1>
      <Button
        onClick={btnhandler}
        variant="primary"
      >
        {address ? <EoaWalletDetails address={address} Balance={balance} /> : 'Connect Wallet'}
      </Button>
      {screen === 1 && <div>
        <DeployContract address={address} setScreenType={(e) => setScreen(e)} />
      </div>}
      {screen === 2 && <div>
        <SendToken address={address} />
      </div>}
    </div>
  );
}

export default App;
