import { expect } from "chai";
import { ethers, deployments } from "hardhat";
import { Exchange } from "../../typechain";

describe("Exchange", function () {
  let exchangeContract: Exchange;

  beforeEach(async () => {
    await deployments.fixture(["all"]);
    exchangeContract = await ethers.getContract("Exchange");
  });

  it("Should deploy exchange contract", async () => {
    expect(exchangeContract.address).to.not.be.undefined;
  });
});
