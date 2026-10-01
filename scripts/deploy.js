// Deploys TeamVesting (if the config uses it) and then PipToken.
//   npx hardhat run scripts/deploy.js --network fuji
//   CONFIRM_MAINNET=yes npx hardhat run scripts/deploy.js --network avalanche
const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const config = require("../token.config");
const { buildAllocation } = require("../lib/allocation");

async function main() {
  const { ethers, network } = hre;
  if (network.name === "avalanche" && process.env.CONFIRM_MAINNET !== "yes") {
    throw new Error("Mainnet deploy blocked. Re-run with CONFIRM_MAINNET=yes once you have tested on Fuji.");
  }

  const [deployer] = await ethers.getSigners();
  if (!deployer) throw new Error("No deployer wallet. Set DEPLOYER_PRIVATE_KEY in .env.");
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Network:  ${network.name} (chainId ${network.config.chainId ?? "local"})`);
  console.log(`Deployer: ${deployer.address} (${ethers.formatEther(balance)} AVAX)`);

  const uses = (target) => config.allocation.some((a) => a.to === target);
  const addresses = { deployer: deployer.address };

  if (uses("treasury")) {
    addresses.treasury = process.env.TREASURY_ADDRESS;
    if (!addresses.treasury) throw new Error("Set TREASURY_ADDRESS in .env (ideally a multisig).");
  }

  let vesting;
  if (uses("vesting")) {
    const beneficiary = process.env.TEAM_BENEFICIARY;
    if (!beneficiary) throw new Error("Set TEAM_BENEFICIARY in .env (who receives vested team tokens).");
    const latest = await ethers.provider.getBlock("latest");
    const start = config.vesting.startTimestamp ?? latest.timestamp;
    const vestingArgs = [beneficiary, start, config.vesting.durationSeconds, config.vesting.cliffSeconds];
    vesting = await ethers.deployContract("TeamVesting", vestingArgs);
    await vesting.waitForDeployment();
    addresses.vesting = await vesting.getAddress();
    vesting.args = vestingArgs;
    console.log(`TeamVesting: ${addresses.vesting}`);
  }

  const { total, rows } = buildAllocation(config, addresses);
  console.log(`\n${config.name} (${config.symbol}), total supply ${ethers.formatUnits(total, 18)}`);
  for (const r of rows) console.log(`  ${r.label.padEnd(24)} ${String(r.percent).padStart(5)}%  -> ${r.to}`);

  const tokenArgs = [config.name, config.symbol, rows.map((r) => r.to), rows.map((r) => r.amount)];
  const token = await ethers.deployContract("PipToken", tokenArgs);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log(`\nPipToken: ${tokenAddress}`);

  const record = {
    network: network.name,
    chainId: network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    token: { address: tokenAddress, args: tokenArgs.map((a) => (Array.isArray(a) ? a.map(String) : a)) },
    vesting: vesting ? { address: addresses.vesting, args: vesting.args.map(String) } : null,
  };
  const out = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(record, null, 2));
  console.log(`Saved ${path.relative(process.cwd(), out)}`);
  if (network.name !== "hardhat") {
    console.log(`\nVerify the source on Snowtrace with:\n  npx hardhat run scripts/verify.js --network ${network.name}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
