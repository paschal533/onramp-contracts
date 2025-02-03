import { HardhatRuntimeEnvironment } from "hardhat/types";

import { DeployFunction } from "hardhat-deploy/types";

import { ethers, upgrades } from "hardhat";

const deployContractsOnSrcChain: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  try {
    console.log("***** Start Deploying Contracts on Source Chain *****");

    // Explicitly get the signer
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", await deployer.getAddress());

    const axelarGatewayAddressLinea = "0xe432150cce91c13a887f7D836923d5597adD8E31";

    // Deploy OnRamp
    const OnRamp = await ethers.getContractFactory("OnRampContract", deployer);
    console.log("Deploying OnRamp...");

    const onRampProxy = await upgrades.deployProxy(
      OnRamp,
      [],
      {
        initializer: "initialize",
        kind: "uups",
        timeout: 300000,
        pollingInterval: 10000,
        useDeployedImplementation: false,
        constructorArgs: [],
        unsafeAllow: ['constructor', 'delegatecall']
      }
    );

    await onRampProxy.waitForDeployment();
    const onRampProxyAddress = await onRampProxy.getAddress();
    console.log("🚀 OnRamp Proxy deployed to:", onRampProxyAddress);

    // Retrieve OnRamp implementation address
    try {
      const onRampImplementationAddress = await upgrades.erc1967.getImplementationAddress(onRampProxyAddress);
      console.log("OnRamp Implementation address from proxy:", onRampImplementationAddress);
    } catch (error) {
      console.error("Error retrieving OnRamp implementation address:", error);
    }

    // Deploy Oracle
    const Oracle = await ethers.getContractFactory("AxelarBridge", deployer);
    console.log("Deploying Oracle...");

    const oracleProxy = await upgrades.deployProxy(
      Oracle,
      [axelarGatewayAddressLinea],
      {
        initializer: "initialize",
        kind: "uups",
        timeout: 300000,
        pollingInterval: 10000,
        useDeployedImplementation: false,
        constructorArgs: [],
        unsafeAllow: ['constructor', 'delegatecall']
      }
    );

    await oracleProxy.waitForDeployment();
    const oracleProxyAddress = await oracleProxy.getAddress();
    console.log("🚀 Oracle Proxy deployed to:", oracleProxyAddress);

    // Retrieve Oracle implementation address
    try {
      const oracleImplementationAddress = await upgrades.erc1967.getImplementationAddress(oracleProxyAddress);
      console.log("Oracle Implementation address from proxy:", oracleImplementationAddress);
    } catch (error) {
      console.error("Error retrieving Oracle implementation address:", error);
    }

    return true;
  } catch (error) {
    console.error("Detailed Deployment Error:", error);
    
    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    }
    
    throw error;
  }
};

deployContractsOnSrcChain.id = "deploy_source_chain_contracts";
deployContractsOnSrcChain.tags = ["SourceChain"];

export default deployContractsOnSrcChain;