import { Contract, providers, BigNumber, Signer } from "ethers";
import { EXCHANGE_CONTRACT_ABI, EXCHANGE_CONTRACT_ADDRESS } from "../constants";

/**
 * removeLiquidity: Removes the `removeLPTokensWei` amount of LP tokens from
 * liquidity and also the calculated amount of `ether` and `CD` tokens
 */
export const removeLiquidity = async (
  signer: Signer,
  removeLPTokensWei: BigNumber
): Promise<void> => {
  const exchangeContract = new Contract(
    EXCHANGE_CONTRACT_ADDRESS,
    EXCHANGE_CONTRACT_ABI,
    signer
  );
  const tx = await exchangeContract.removeLiquidity(removeLPTokensWei);
  await tx.wait();
};

/**
 * getTokensAfterRemove: Calculates the amount of `Ether` and `CD` tokens
 * that would be returned back to user after he removes `removeLPTokenWei` amount
 * of LP tokens from the contract
 */
export const getTokensAfterRemove = async (
  provider: providers.Provider,
  removeLPTokenWei: BigNumber,
  ethBalance: BigNumber,
  cryptoDevTokenReserve: BigNumber
): Promise<{ removeEther: BigNumber; removeCD: BigNumber }> => {
  try {
    const exchangeContract = new Contract(
      EXCHANGE_CONTRACT_ADDRESS,
      EXCHANGE_CONTRACT_ABI,
      provider
    );
    const totalSupply = await exchangeContract.totalSupply();
    const removeEther = ethBalance.mul(removeLPTokenWei).div(totalSupply);
    const removeCD = cryptoDevTokenReserve
      .mul(removeLPTokenWei)
      .div(totalSupply);
    return {
      removeEther,
      removeCD,
    };
  } catch (err) {
    console.log(err);
    return {
      removeEther: BigNumber.from(0),
      removeCD: BigNumber.from(0),
    };
  }
};
