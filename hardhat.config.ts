import "@nomicfoundation/hardhat-toolbox";

import "@openzeppelin/hardhat-upgrades";

import { HardhatUserConfig } from "hardhat/config";

import "dotenv/config";

import "hardhat-deploy";

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!deployerPrivateKey) {
  throw new Error("Please set DEPLOYER_PRIVATE_KEY in your .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "paris"
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
      314159: 0, // Added explicit chainId mapping
      59141: 0   // Linea chainId
    },
  },
  defaultNetwork: "calibration",
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 0
      },
      chainId: 314159,
    },
    calibration: {
      url: "https://api.calibration.node.glif.io/rpc/v1",
      accounts: [deployerPrivateKey],
      timeout: 180000, // Increased timeout to 3 minutes
      gasPrice: "auto",
      gas: "auto",    // Changed to auto for better estimation
      chainId: 314159,
      allowUnlimitedContractSize: true, // Added for larger contracts
      blockGasLimit: 100000000
    },
    linea: {
      url: "https://rpc.sepolia.linea.build",
      chainId: 59141,
      accounts: [deployerPrivateKey],
      timeout: 120000,
      gasPrice: "auto",
    },
  },
  mocha: {
    timeout: 180000  // Increased test timeout
  },
  etherscan: {
    apiKey: {
      calibration: "unused" // If you're using Filecoin Calibration
    }
  },
  
  upgrades: {
    // Optional: configure upgradeability settings
    admin: {
      // address of the admin account if not using transparent proxy
      adminAddress: undefined
    }
  }
};

export default config;