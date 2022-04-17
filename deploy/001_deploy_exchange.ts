import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS } from "../constants";

const deployExchange: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
) {
  const { deployments, getNamedAccounts, network } = hre;

  const { deploy, log } = deployments;

  const { deployer } = await getNamedAccounts();

  const exchange = await deploy("Exchange", {
    from: deployer,
    args: [CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS],
    log: true,
    waitConfirmations: network.name === "hardhat" ? 0 : 6,
  });

  log(exchange.address);
};
export default deployExchange;
deployExchange.tags = ["all", "Exchange"];
