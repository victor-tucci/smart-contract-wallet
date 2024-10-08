
const chains = {
    sepolia:
    {
        blockExplorerUrls: [
            "https://sepolia.etherscan.io/"
        ],
        nativeCurrency: {
            name: "sepolia",
            symbol: "SepoliaETH",
            decimals: 18
        },
        rpcUrls: [
            "https://ethereum-sepolia-rpc.publicnode.com"
        ],
        chainId: "0xaa36a7",
        chainName: "Sepolia test network"
    },
    amoy:
    {
        blockExplorerUrls: [
            "https://amoy.polygonscan.com"
        ],
        nativeCurrency: {
            name: "amoy",
            symbol: "POL",
            decimals: 18
        },
        rpcUrls: [
            "https://rpc-amoy.polygon.technology"
        ],
        chainId: "0x13882",
        chainName: "Polygon Amoy Testnet"
    }
}

async function addWallet(error,chainType) {
    console.log("Error switching:", error);
    if (!(error === null) && (error.code === 4902)) {

        const addResult = await window.ethereum.request({
            "method": "wallet_addEthereumChain",
            "params": [
                chains[chainType]
            ],
        });

        if (!(addResult === null)) {
            alert("Please add the network manually in the Metamask extension!");
        }
    }
}

export async function switchWallet(chainType) {
    console.log("Switching to chain:", chains[chainType].chainId);

    try {
        await window.ethereum.request({
            "method": "wallet_switchEthereumChain",
            "params": [
                {
                    chainId: chains[chainType].chainId
                }
            ],
        });
        
    } catch (error) {
        if (error.code !== 4902){
            console.error("Error switching:", error);
            return [true, error.message];
        }
        if (error.code === 32002){
            console.error("Request Pending For switching:", error);
            return [true,"pending"];
        }
        await addWallet(error,chainType);
    }
    console.log("Wallet switched to chain:", chains[chainType].chainId);
    return [false, "Wallet switched successfully"];
} 