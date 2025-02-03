import { ethers, upgrades } from "hardhat";

async function main() {
   // Ensure the proxy address is defined
   const ProverAxl_PROXY_ADDRESS : any = process.env.PROVER_PROXY_CONTRACT_ADDRESS_DEST_CHAIN;
   
   /*if (!ProverAxl_PROXY_ADDRESS) {
     throw new Error("PROVER_PROXY_CONTRACT_ADDRESS_DEST_CHAIN is not set in .env");
   }*/

   // Get the signer
   const [deployer] = await ethers.getSigners();

   // Get the contract factory
   const ProverAxlUpgrade = await ethers.getContractFactory("DealClientAxl", {
     signer: deployer
   });

   console.log("Upgrading ProverAxl...");
   
   const upgraded = await upgrades.upgradeProxy(
     ProverAxl_PROXY_ADDRESS, 
     ProverAxlUpgrade,
     {
       kind: "uups", // Specify UUPS upgrade type
       timeout: 300000 // Optional: increase timeout if needed
     }
   );

   await upgraded.waitForDeployment();
   console.log("ProverAxl upgraded to address:", await upgraded.getAddress());
}

main().catch((error) => {
   console.error(error);
   process.exitCode = 1;
});