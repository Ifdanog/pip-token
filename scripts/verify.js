// Publishes the source code of the deployed contracts on Snowtrace.
//   npx hardhat run scripts/verify.js --network fuji
const hre = require("hardhat");
const record = require(`../deployments/${hre.network.name}.json`);

async function verify(address, constructorArguments) {
  try {
    await hre.run("verify:verify", { address, constructorArguments });
  } catch (err) {
    if (/already verified/i.test(err.message)) console.log(`${address} is already verified.`);
    else throw err;
  }
}

async function main() {
  if (record.vesting) await verify(record.vesting.address, record.vesting.args);
  await verify(record.token.address, record.token.args);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
