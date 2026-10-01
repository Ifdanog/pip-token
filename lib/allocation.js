const { ethers } = require("ethers");

// Turns the percent-based allocation in token.config.js into exact token
// amounts. Any rounding dust goes to the first bucket so the amounts always
// add up to the total supply.
function buildAllocation(config, addresses) {
  const total = ethers.parseUnits(config.totalSupply, 18);
  const percentSum = config.allocation.reduce((s, a) => s + a.percent, 0);
  if (Math.abs(percentSum - 100) > 1e-9) {
    throw new Error(`Allocation percents add up to ${percentSum}, not 100. Fix token.config.js.`);
  }

  const rows = config.allocation.map((a) => {
    const basisPoints = BigInt(Math.round(a.percent * 100));
    const to = a.to.startsWith("0x") ? a.to : addresses[a.to];
    if (!to || !ethers.isAddress(to)) {
      throw new Error(`No valid address for "${a.label}" (to: "${a.to}").`);
    }
    return { label: a.label, percent: a.percent, to: ethers.getAddress(to), amount: (total * basisPoints) / 10000n };
  });

  const assigned = rows.reduce((s, r) => s + r.amount, 0n);
  rows[0].amount += total - assigned;
  return { total, rows };
}

module.exports = { buildAllocation };
