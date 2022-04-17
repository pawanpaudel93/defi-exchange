import { Contract, utils, Signer, BigNumber } from "ethers";
import {
  EXCHANGE_CONTRACT_ABI,
  EXCHANGE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";

/**
 * addLiquidity helps add liquidity to the exchange,
 * If the user is adding initial liquidity, user decides the ether and CD tokens he wants to add
 * to the exchange. If we he adding the liquidity after the initial liquidity has already been added
 * then we calculate the crypto dev tokens he can add, given the eth he wants to add by keeping the ratios
 * constant
 */
export const addLiquidity = async (
  signer: Signer,
  addCDAmountWei: BigNumber,
  addEtherAmountWei: BigNumber
) => {
  const tokenContract = new Contract(
    TOKEN_CONTRACT_ADDRESS,
    TOKEN_CONTRACT_ABI,
    signer
  );
  const exchangeContract = new Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    EXCHANGE_CONTRACT_ABI,
    signer
  );
  // Because CD tokens are an ERC20, user would need to give the contract allowance
  // to take the required number CD tokens out of his contract
  const approvalTx = await tokenContract.approve(
    EXCHANGE_CONTRACT_ADDRESS,
    addCDAmountWei.toString()
  );
  await approvalTx.wait();

  const addTx = await exchangeContract.addLiquidity(addCDAmountWei, {
    value: addEtherAmountWei,
  });
  await addTx.wait();
};

/**
 * calculateCD calculates the CD tokens that need to be added to the liquidity
 * given `addEtherAmountWei` amount of ether
 */
export const calculateCD = async (
  addEther = "0",
  etherBalanceContract: BigNumber,
  cdTokenReserve: BigNumber
) => {
  const addEtherAmountWei = utils.parseEther(addEther);
  // The ratio we follow is (Amount of Crypto Dev tokens to be added)/(Crypto Dev tokens balance) = (Ether that would be added)/ (Eth reseve in the contract)
  // So by maths we get (Amount of Crypto Dev tokens to be added) = (Ether that would be added*rypto Dev tokens balance)/ (Eth reseve in the contract)
  const cryptoDevTokenAmount = addEtherAmountWei
    .mul(cdTokenReserve)
    .div(etherBalanceContract);
  return cryptoDevTokenAmount;
};
