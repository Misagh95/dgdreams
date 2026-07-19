const NIKBASE_ADDR = {
  8453: "0xCB1b3a864D384D5Ad42b6F5b81825AB084444D9c",
  999: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  130: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  4217: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  4663: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  1: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  11155111: "0x68bb9775B11551310D7A37Aae52e6505A0E1e733",
  84532: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  91342: "0xAf1F1Ec78F94bf9B6FACf876C77A51562B7EbaB0",
  4441: "0x68bb9775B11551310D7A37Aae52e6505A0E1e733",
  5042002: "0x68bb9775B11551310D7A37Aae52e6505A0E1e733",
  1913: "0x68bb9775B11551310D7A37Aae52e6505A0E1e733",
};

async function main() {
  const hre = require("hardhat");
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  const net = await ethers.provider.getNetwork();
  const chainId = Number(net.chainId);

  const nikBase = NIKBASE_ADDR[chainId];
  if (!nikBase) { console.error(`No NikBase address for chain ${chainId}`); return; }

  const isMainnet = [8453, 999, 130, 4217, 4663, 1].includes(chainId);
  const overrides = isMainnet ? { gasPrice: 50000000n, gasLimit: 2000000n } : {};

  const NikSoulbound = await ethers.getContractFactory("NikSoulbound");
  const contract = await NikSoulbound.deploy(nikBase, overrides);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`NikSoulbound deployed to: ${address} (${net.name}, chainId: ${chainId})`);
}

main().catch(console.error);
