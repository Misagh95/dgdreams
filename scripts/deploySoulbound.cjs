const NIKBASE_ADDR = {
  8453: "0xbB123f450822A42AeDa8e71aF3534d7dc84627F7",
  999: "0xdbeE9eA39FedD197D224EA7520A20b4434635A6a",
  130: "0xC288b68022e752d97E4395ECbA61C2079CE692Ad",
  4217: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  4663: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  1: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  11155111: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  84532: "0xdbeE9eA39FedD197D224EA7520A20b4434635A6a",
  91342: "0xff3A00Cf7d83723F88097bcc8230ae37B3aDF3ff",
  4441: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  5042002: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
  1913: "0x344Ad6A0D3aEb4bAA8d853C932fBeBeB4e798E3B",
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
