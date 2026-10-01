// Edit this file before deploying. Everything about the token lives here.
const MONTH = 30 * 24 * 60 * 60;

module.exports = {
  name: "Pip Token",
  symbol: "PIP",
  totalSupply: "1000000000", // whole tokens; 18 decimals are added automatically

  // Share of total supply, in percent. Must add up to 100.
  // `to` is one of:
  //   "deployer"  - the wallet that runs the deploy (use this for the DEX liquidity you add yourself)
  //   "treasury"  - TREASURY_ADDRESS from .env (use a multisig, e.g. Safe on Avalanche)
  //   "vesting"   - the TeamVesting contract deployed by the script
  //   "0x..."     - any other address
  allocation: [
    { label: "Liquidity pool", percent: 40, to: "deployer" },
    { label: "Community & rewards", percent: 25, to: "treasury" },
    { label: "Ecosystem & tools", percent: 15, to: "treasury" },
    { label: "Team", percent: 12, to: "vesting" },
    { label: "Marketing & listings", percent: 8, to: "treasury" },
  ],

  // Team vesting: nothing before the cliff, then linear until the end.
  // Matches the website: 12-month cliff, then 24 months linear (36 months total).
  vesting: {
    cliffSeconds: 12 * MONTH,
    durationSeconds: 36 * MONTH,
    // Start time; null means "when the deploy runs".
    startTimestamp: null,
  },
};
