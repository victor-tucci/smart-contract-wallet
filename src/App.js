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
  // const [chainId, setChainId] = useState('');

  async function switchWallet(error) {
    console.log("Error switching to Amoy Testnet:", error);
    if (!(error === null) && (error.code === 4902)) {

      const addResult = await window.ethereum.request({
        "method": "wallet_addEthereumChain",
        "params": [
          {
            blockExplorerUrls: [
              "https://amoy.polygonscan.com"
            ],
            nativeCurrency: {
              name: "Amoy",
              symbol: "POL",
              decimals: 18
            },
            rpcUrls: [
              "https://rpc-amoy.polygon.technology"
            ],
            chainId: "0x13882",
            chainName: "Polygon Amoy Testnet"
          }
        ],
      });

      if (!(addResult === null)) {
        alert("Please add the network manually in the Metamask extension!");
      }
    }
  }

  const btnhandler = async () => {
    if (window.ethereum) {
     
      //check the chain id
      const chainId = await window.ethereum.request({
        "method": "eth_chainId",
        "params": [],
       });

      console.log("chain id =",chainId);
      if(!(chainId === 0x13882)){
        console.log("Chain id not supported, switching to amoy Testnet.");
        
        try {
          await window.ethereum.request({
            "method": "wallet_switchEthereumChain",
            "params": [
              {
                chainId: "0x13882"
              }
            ],
          });
        } catch (error) {
          await switchWallet(error);
        }
      }

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

  // Event listener for account and chain changes
  useEffect(() => {
    if (window.ethereum) {
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            window.location.reload();
        });

        // Listen for chain changes
        window.ethereum.on('chainChanged', (chainId) => {
            // Optional: Reload the page when the chain changes
            window.location.reload();
        });
    }

    // Clean up event listeners when the component unmounts
    return () => {
        if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', () => {});
            window.ethereum.removeListener('chainChanged', () => {});
        }
    };
  }, []);

// Render the app based on the screen state
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
    </div>
  );
}

export default App;
