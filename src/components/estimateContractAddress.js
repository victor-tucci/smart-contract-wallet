import { ethers } from 'ethers';

import { chainIdandType, chainInfo, ENTRYPOINT_ADDRESS, salt} from './chainInfos';

import AccountFactory from '../abi/AccountFactory.json';
import Account from '../abi/SimpleAccount.json';

import {tokens} from '../token/tokens';

const AccountFactoryABI = AccountFactory.abi;


export async function getEstimateAddress(web3, providerAddress){
    const chainID = await web3.eth.getChainId();
    const hexChainID = '0x' + chainID.toString(16);  // Convert to hex format
    console.log("getEstimateAddress hexChainID ....",hexChainID);
    const contract = new web3.eth.Contract(AccountFactoryABI, chainInfo[chainIdandType[hexChainID]].FACTORY_ADDRESS);

    try {
        const AccountBytecode = Account.bytecode;

        // Encode the constructor arguments
        const encodedArgs = web3.eth.abi.encodeParameters(
            ['address', 'address'],
            [ENTRYPOINT_ADDRESS, providerAddress]
        );

        // Concatenate bytecode with the encoded constructor arguments
        const bytecodeWithArgs = AccountBytecode + encodedArgs.slice(2);

        // Call the estimatedAddress function from AccountFactory contract
        const estimatedAddr = await contract.methods.estimatedAddress(bytecodeWithArgs, salt).call();
        console.log("Estimated contract Address:", estimatedAddr);
        return estimatedAddr;
    } catch (error) {
        console.error("Error calling contract estimatedAddress:", error);
        return null;
    }
}

    // Fetch balance every 5 seconds
export async function fetchBalance(web3, address) {

    if (web3.utils.isAddress(address)) {  // Validate address
        try {
            const balance = await web3.eth.getBalance(address);
            const formattedBalance = web3.utils.fromWei(balance, "ether");
            return formattedBalance;
        } catch (error) {
            console.error("Error fetching contract balance:", error);
        }
    } else {
        console.error("Invalid contract address:", address);
    }
}

export async function fetchContractBalance(web3, address, chain){
    console.log("Fetching contract balance",address, chain);

    const erc20ABI = [
        {
          constant: true,
          inputs: [{ name: '_owner', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ name: 'balance', type: 'uint256' }],
          type: 'function',
        }
    ]
    
    if(chain in tokens){
        const contractAddress = tokens[chain].address;
        if(web3.utils.isAddress(contractAddress)){
            const tokenContract = new web3.eth.Contract(erc20ABI, contractAddress);
            const balance = await tokenContract.methods.balanceOf(address).call();
            const formattedBalance = Number(balance) / 10 ** tokens[chain].decimals;
            return formattedBalance;
        }
    }
}