import { HardhatRuntimeEnvironment } from "hardhat/types";

import { DeployFunction } from "hardhat-deploy/types";

import { ethers, upgrades } from "hardhat";

const deployContractOnFilecoin: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
   try {
     console.log("***** Start Deploying Contracts on Filecoin *****");
     
     // Explicitly get the signer
     const [deployer] = await ethers.getSigners();
     console.log("Deploying with account:", await deployer.getAddress());

     const axelarGatewayAddressFilecoin = "0x999117D44220F33e0441fbAb2A5aDB8FF485c54D";
     const axelarGasReceiverFilecoin = "0xbe406f0189a0b4cf3a05c286473d23791dd44cc6";

     // Use ethers.deployContract instead of getContractFactory().deploy()
     const DealClientAxl = await ethers.getContractFactory("DealClientAxl", deployer);
     
     console.log("Deploying DealClientAxl...");

     // Deploy proxy with more explicit configuration
     const proxy = await upgrades.deployProxy(
       DealClientAxl,
       [axelarGatewayAddressFilecoin, axelarGasReceiverFilecoin],
       {
         initializer: "initialize",
         kind: "uups",
         timeout: 300000, // Increased to 5 minutes
         pollingInterval: 10000,
         useDeployedImplementation: false,
         constructorArgs: [], // Explicitly pass empty constructor args if needed
         unsafeAllow: ['constructor', 'delegatecall'] // Add this if you have complex constructor
       }
     );

     await proxy.waitForDeployment();
     const proxyAddress = await proxy.getAddress();
     console.log("🚀 Proxy deployed to:", proxyAddress);

     // More robust implementation address retrieval
     try {
       const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
       console.log("Implementation address from proxy:", implementationAddress);
     } catch (error) {
       console.error("Error retrieving implementation address:", error);
     }

     return true;
   } catch (error) {
     console.error("Detailed Deployment Error:", error);
     // Log more details about the error
     if (error instanceof Error) {
       console.error("Error Name:", error.name);
       console.error("Error Message:", error.message);
       console.error("Error Stack:", error.stack);
     }
     throw error;
   }
};

deployContractOnFilecoin.id = "deploy_dealclient_axl"; // Added id field
deployContractOnFilecoin.tags = ["Filecoin"];

export default deployContractOnFilecoin;