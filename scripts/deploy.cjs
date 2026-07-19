async function main() {
  const hre = require("hardhat");
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);
  const NikBase = await ethers.getContractFactory("NikBase");
  const net = await ethers.provider.getNetwork();
  const isEth = net.chainId === 1n;
  const overrides = isEth ? { gasPrice: 50000000n, gasLimit: 2000000n } : {};
  const contract = await NikBase.deploy(overrides);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`NikBase v2.1.0 deployed to: ${address} (${net.name})`);
}

main().catch(console.error);
