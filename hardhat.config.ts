import "@nomicfoundation/hardhat-toolbox";

import { HardhatUserConfig } from "hardhat/config";

import "dotenv/config";

import "hardhat-deploy";

const deployerPrivateKey = process.env.DEPLOYER_PRIVATE_KEY;

if (!deployerPrivateKey) {
  throw new Error("Please set DEPLOYER_PRIVATE_KEY in your .env file");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // Use the first account as deployer
    },
  },
  defaultNetwork: "calibration", // Use Hardhat network for tests
  networks: {
    hardhat: {
      mining: {
        auto: true,
        interval: 0
      },
      chainId: 314159, // Default chainId for Hardhat's local network
    },
    calibration: {
      url: "https://api.calibration.node.glif.io/rpc/v1",
      accounts: [deployerPrivateKey],
    },
    linea: {
      url: "https://rpc.sepolia.linea.build",
      chainId: 59141,
      accounts: [deployerPrivateKey],
    },
  },
  mocha: {
    timeout: 100000
  },
};

export default config;