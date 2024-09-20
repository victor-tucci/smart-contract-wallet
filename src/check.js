import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import './App.css';
import { Button, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import DeployContract from './components/deploy'
import SendToken from './components/send'
import EoaWalletDetails from "./components/eoaWallet";

function App() {
  // usetstate for storing and retrieving wallet details
  const [address, setAddress] = useState("");
  const [Balance, setBalance] = useState(null);
  const [screen, setScreen] = useState(0);

  // Button handler button for handling a
  // request event for metamask
  const btnhandler = () => {
    // Asking if metamask is already present or not
    if (window.ethereum) {
      console.log('network version:', window.ethereum.networkVersion)

      // res[0] for fetching a first wallet
      window.ethereum
        .request({ method: "eth_requestAccounts" })
        .then((res) => {
          console.log('Response after the account request to metamask:', res);
          accountChangeHandler(res[0])
        }
        );
    } else {
      alert("install metamask extension!!");
    }
  };

  // getbalance function for getting a balance in
  // a right format with help of ethers
  const getbalance = (address) => {
    // Requesting balance method
    window.ethereum
      .request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })
      .then((balance) => {
        // Setting balance
        // console.log("Balance is:", balance);
        setBalance(ethers.utils.formatEther(balance));
      });
  };

  // Function for getting handling all events
  const accountChangeHandler = (account) => {
    // Setting an address data
    setAddress(account);
    setScreen(1);
  };

  useEffect(() => {
    if (!address) return;

    // Fetching a balance
    getbalance(address);
    const intervalId = setInterval(() => {
      getbalance(address);
    }, 5000);

    return () => {
      if (intervalId)  // Clearing interval on component unmount
        clearInterval();
    };
  }, [address]);

  return (
    <div className='App'>
      <h1 >Louice wallet</h1>
      <Button
        onClick={btnhandler}
        variant="primary"
      >
        {address ? <EoaWalletDetails address={address} Balance={Balance} /> : 'Connect Wallet'}
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
