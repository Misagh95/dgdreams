import { ethers } from "hardhat";

async function main() {
  const NikBase = await ethers.getContractFactory("NikBase");
  const contract = await NikBase.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`NikBase v2.0.0 deployed to: ${address}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);
  console.log(`Chain ID: ${(await ethers.provider.getNetwork()).chainId}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
