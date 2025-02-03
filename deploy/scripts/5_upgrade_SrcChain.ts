import { ethers, upgrades } from "hardhat";

async function main() {
  const OnRamp_PROXY_ADDRESS : any = process.env.ONRAMP_PROXY_CONTRACT_ADDRESS_SRC_CHAIN;
  const Oracle_PROXY_ADDRESS : any = process.env.ORACLE_PROXY_CONTRACT_ADDRESS_SRC_CHAIN;

  /*if (!OnRamp_PROXY_ADDRESS || !Oracle_PROXY_ADDRESS) {
    throw new Error("Proxy addresses must be defined in environment variables");
  }*/
  
  // Upgrading OnRamp
  const OnRampUpgrade = await ethers.getContractFactory("OnRampContract");
  console.log("Upgrading OnRamp...");
  const OnRampUpgraded = await upgrades.upgradeProxy(
    OnRamp_PROXY_ADDRESS, 
    OnRampUpgrade,
    {
      kind: "uups",
      timeout: 300000
    }
  );

  await OnRampUpgraded.waitForDeployment();
  console.log("Oracle upgraded to address:", await OnRampUpgraded.getAddress());


  // Upgrading Oracle
  const OracleUpgrade = await ethers.getContractFactory("AxelarBridge");
  console.log("Upgrading Oracle...");
  const OracleUpgraded = await upgrades.upgradeProxy(
    Oracle_PROXY_ADDRESS, 
    OracleUpgrade,
    {
      kind: "uups",
      timeout: 300000
    }
  );

  await OracleUpgraded.waitForDeployment();
  console.log("Oracle upgraded to address:", await OracleUpgraded.getAddress()); 
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});