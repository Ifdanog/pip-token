const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const config = require("../token.config");
const { buildAllocation } = require("../lib/allocation");

describe("PipToken", function () {
  async function deployFixture() {
    const [deployer, treasury, team, alice, bob] = await ethers.getSigners();
    const start = await time.latest();
    const vesting = await ethers.deployContract("TeamVesting", [
      team.address, start, config.vesting.durationSeconds, config.vesting.cliffSeconds,
    ]);
    const { total, rows } = buildAllocation(config, {
      deployer: deployer.address, treasury: treasury.address, vesting: await vesting.getAddress(),
    });
    const token = await ethers.deployContract("PipToken", [
      config.name, config.symbol, rows.map((r) => r.to), rows.map((r) => r.amount),
    ]);
    return { token, vesting, total, rows, start, deployer, treasury, team, alice, bob };
  }

  describe("deployment", function () {
    it("sets name, symbol and 18 decimals", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal(config.name);
      expect(await token.symbol()).to.equal(config.symbol);
      expect(await token.decimals()).to.equal(18);
    });

    it("mints exactly the configured total supply", async function () {
      const { token, total } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(total);
      expect(total).to.equal(ethers.parseUnits(config.totalSupply, 18));
    });

    it("gives each address its allocation", async function () {
      const { token, rows } = await loadFixture(deployFixture);
      const expected = {};
      for (const r of rows) expected[r.to] = (expected[r.to] ?? 0n) + r.amount;
      for (const [addr, amount] of Object.entries(expected)) {
        expect(await token.balanceOf(addr)).to.equal(amount);
      }
    });

    it("rejects bad constructor input", async function () {
      const [a] = await ethers.getSigners();
      const F = await ethers.getContractFactory("PipToken");
      await expect(F.deploy("X", "X", [a.address], [])).to.be.revertedWithCustomError(F, "LengthMismatch");
      await expect(F.deploy("X", "X", [], [])).to.be.revertedWithCustomError(F, "NoRecipients");
      await expect(F.deploy("X", "X", [a.address], [0])).to.be.revertedWithCustomError(F, "ZeroAmount");
      await expect(F.deploy("X", "X", [ethers.ZeroAddress], [1])).to.be.revertedWithCustomError(F, "ERC20InvalidReceiver");
    });
  });

  describe("no admin powers", function () {
    it("has no owner, mint, pause or blacklist functions", async function () {
      const { token } = await loadFixture(deployFixture);
      for (const fn of ["owner", "mint", "pause", "unpause", "blacklist", "setFee", "transferOwnership"]) {
        expect(token.interface.getFunction(fn), fn).to.equal(null);
      }
    });
  });

  describe("transfers and burns", function () {
    it("transfers without fees", async function () {
      const { token, deployer, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1234.5", 18);
      await expect(token.transfer(alice.address, amount)).to.changeTokenBalances(token, [deployer, alice], [-amount, amount]);
    });

    it("lets holders burn their own tokens, reducing supply", async function () {
      const { token, total } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 18);
      await token.burn(amount);
      expect(await token.totalSupply()).to.equal(total - amount);
    });

    it("does not let anyone burn someone else's tokens without approval", async function () {
      const { token, deployer, alice } = await loadFixture(deployFixture);
      await expect(token.connect(alice).burnFrom(deployer.address, 1n)).to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance");
    });

    it("supports gasless approvals with permit (EIP-2612)", async function () {
      const { token, deployer, alice } = await loadFixture(deployFixture);
      const value = ethers.parseUnits("50", 18);
      const deadline = (await time.latest()) + 3600;
      const { chainId } = await ethers.provider.getNetwork();
      const sig = ethers.Signature.from(await deployer.signTypedData(
        { name: config.name, version: "1", chainId, verifyingContract: await token.getAddress() },
        { Permit: [
          { name: "owner", type: "address" }, { name: "spender", type: "address" },
          { name: "value", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" },
        ] },
        { owner: deployer.address, spender: alice.address, value, nonce: 0, deadline },
      ));
      await token.connect(alice).permit(deployer.address, alice.address, value, deadline, sig.v, sig.r, sig.s);
      expect(await token.allowance(deployer.address, alice.address)).to.equal(value);
    });
  });

  describe("team vesting", function () {
    it("releases nothing before the cliff", async function () {
      const { token, vesting, start } = await loadFixture(deployFixture);
      await time.increaseTo(start + config.vesting.cliffSeconds - 60);
      expect(await vesting["releasable(address)"](await token.getAddress())).to.equal(0);
    });

    it("unlocks linearly after the cliff and fully at the end", async function () {
      const { token, vesting, start, team, rows } = await loadFixture(deployFixture);
      const teamAmount = rows.find((r) => r.to === vesting.target).amount;
      const tokenAddr = await token.getAddress();

      await time.increaseTo(start + config.vesting.durationSeconds / 2);
      const half = await vesting["releasable(address)"](tokenAddr);
      expect(half).to.be.closeTo(teamAmount / 2n, teamAmount / 1000n);

      await time.increaseTo(start + config.vesting.durationSeconds);
      await vesting["release(address)"](tokenAddr);
      expect(await token.balanceOf(team.address)).to.equal(teamAmount);
    });
  });
});
