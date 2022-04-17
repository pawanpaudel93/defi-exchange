import { BigNumber, providers, utils } from "ethers";
import type { NextPage } from "next";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { addLiquidity, calculateCD } from "../utils/addLiquidity";

import {
  getCDTokensBalance,
  getEtherBalance,
  getLPTokensBalance,
  getReserveOfCDTokens,
} from "../utils/getAmounts";

import {
  getTokensAfterRemove,
  removeLiquidity,
} from "../utils/removeLiquidity";

import { swapTokens, getAmountOfTokensReceivedFromSwap } from "../utils/swap";

const Home: NextPage = () => {
  const [loading, setLoading] = useState(false);
  const [liquidityTab, setLiquidityTab] = useState(true);
  const zero = BigNumber.from(0);
  /** Variables to keep track of amount */

  // `reservedCD` keeps track of the Crypto Dev tokens Reserve balance in the Exchange contract
  const [reservedCD, setReservedCD] = useState(zero);
  // Keeps track of the ether balance in the contract
  const [etherBalanceContract, setEtherBalanceContract] = useState(zero);
  // `ethBalance` keeps track of the amount of Eth held by the user's account
  const [ethBalance, setEthBalance] = useState(zero);
  // cdBalance is the amount of `CD` tokens help by the users account
  const [cdBalance, setCDBalance] = useState(zero);
  // lpBalance is the amount of `LP` tokens help by the users account
  const [lpBalance, setLPBalance] = useState(zero);

  /** Variables to keep track of liquidity to be added or removed */
  // addEther is the amount of Ether that the user wants to add to the liquidity
  const [addEther, setAddEther] = useState(zero);
  // addCDTokens keeps track of the amount of CD tokens that the user wants to add to the liquidity
  // in case when there is no initial liquidity and after liquidity gets added it keeps track of the
  // CD tokens that the user can add given a certain amount of ether
  const [addCDTokens, setAddCDTokens] = useState(zero);
  // removeEther is the amount of `Ether` that would be sent back to the user based on a certain number of `LP` tokens
  const [removeEther, setRemoveEther] = useState(zero);
  // removeCD is the amount of `Crypto Dev` tokens that would be sent back to the user base on a certain number of `LP` tokens
  // that he wants to withdraw
  const [removeCD, setRemoveCD] = useState(zero);
  // amount of LP tokens that the user wants to remove from liquidity
  const [removeLPTokens, setRemoveLPTokens] = useState("0");

  /** Variables to keep track of swap functionality */
  // Amount that the user wants to swap
  const [swapAmount, setSwapAmount] = useState("");
  // This keeps track of the number of tokens that the user would recieve after a swap completes
  const [tokenToBeRecievedAfterSwap, setTokenToBeRecievedAfterSwap] =
    useState(zero);
  // Keeps track of whether  `Eth` or `Crypto Dev` token is selected. If `Eth` is selected it means that the user
  // wants to swap some `Eth` for some `Crypto Dev` tokens and vice versa if `Eth` is not selected
  const [ethSelected, setEthSelected] = useState(true);
  /** Wallet connection */
  // Create a reference to the Web3 Modal (used for connecting to Metamask) which persists as long as the page is open
  const web3ModalRef = useRef();
  // walletConnected keep track of whether the user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);

  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    // Since we store `web3Modal` as a reference, we need to access the `current` value to get access to the underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // If user is not connected to the Rinkeby network, let them know and throw an error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change the network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const getAmounts = async () => {
    try {
      const provider = (await getProviderOrSigner(
        false
      )) as providers.Web3Provider;
      const signer = (await getProviderOrSigner(
        true
      )) as providers.JsonRpcSigner;
      const address = await signer.getAddress();
      // get the amount of eth in the user's account
      const ethBalance = await getEtherBalance(provider, address);
      // get the amount of cd tokens in the user's account
      const cdBalance = await getCDTokensBalance(provider, address);
      // get the amount of lp tokens in the user's account
      const lpBalance = await getLPTokensBalance(provider, address);
      // get the amount of cd tokens that are reserved in the exchange contract
      const reservedCD = await getReserveOfCDTokens(provider);
      // get the amount of ether that is reserved in the exchange contract
      const ethBalanceContract = await getEtherBalance(provider, null, true);

      setEthBalance(ethBalance);
      setCDBalance(cdBalance);
      setLPBalance(lpBalance);
      setReservedCD(reservedCD);
      setEtherBalanceContract(ethBalanceContract);
    } catch (error) {
      console.log(error);
    }
  };

  const _swapTokens = async () => {
    try {
      const swapAmountWei = utils.parseEther(swapAmount);
      if (!swapAmountWei.eq(zero)) {
        const signer = (await getProviderOrSigner(
          true
        )) as providers.JsonRpcSigner;
        setLoading(true);
        await swapTokens(
          signer,
          swapAmountWei,
          tokenToBeRecievedAfterSwap,
          ethSelected
        );
        setLoading(false);
        await getAmounts();
        setSwapAmount("");
      }
    } catch (error) {
      console.log(error);
      setLoading(false);
      setSwapAmount("");
    }
  };

  const _getAmountOfTokensReceivedFromSwap = async (swapAmount: string) => {
    try {
      const swapAmountWei = utils.parseEther(swapAmount);
      if (!swapAmountWei.eq(zero)) {
        const provider = (await getProviderOrSigner(
          false
        )) as providers.Web3Provider;
        const ethBalance = await getEtherBalance(provider, null, true);
        const amountOfTokens = await getAmountOfTokensReceivedFromSwap(
          swapAmountWei,
          provider,
          ethSelected,
          ethBalance,
          reservedCD
        );
        setTokenToBeRecievedAfterSwap(amountOfTokens);
      }
    } catch (error) {
      setTokenToBeRecievedAfterSwap(zero);
    }
  };

  const _addLiquidity = async () => {
    try {
      const addEthWei = utils.parseEther(addEther.toString());
      if (!addCDTokens.eq(zero) && !addEthWei.eq(zero)) {
        const signer = (await getProviderOrSigner(
          true
        )) as providers.JsonRpcSigner;
        setLoading(true);
        await addLiquidity(signer, addCDTokens, addEthWei);
        setLoading(false);
        setAddCDTokens(zero);
        await getAmounts();
      }
    } catch (error) {
      setLoading(false);
      setAddCDTokens(zero);
    }
  };

  const _removeLiquidity = async () => {
    try {
      const signer = (await getProviderOrSigner(
        true
      )) as providers.JsonRpcSigner;
      const removeLPTokensWei = utils.parseEther(removeLPTokens);
      setLoading(true);
      await removeLiquidity(signer, removeLPTokensWei);
      setLoading(false);
      await getAmounts();
      setRemoveCD(zero);
      setRemoveEther(zero);
    } catch (error) {
      setLoading(false);
      setRemoveCD(zero);
      setRemoveEther(zero);
    }
  };

  const _getTokensAfterRemove = async (removeLPTokens: string) => {
    try {
      const provider = (await getProviderOrSigner(
        false
      )) as providers.Web3Provider;
      const removeLPTokenWei = utils.parseEther(removeLPTokens);
      const ethBalance = await getEtherBalance(provider, null, true);
      const cryptoDevTokenReserve = await getReserveOfCDTokens(provider);
      const { removeEther, removeCD } = await getTokensAfterRemove(
        provider,
        removeLPTokenWei,
        ethBalance,
        cryptoDevTokenReserve
      );
      setRemoveCD(removeCD);
      setRemoveEther(removeEther);
    } catch (error) {
      console.log(error);
    }
  };

  const connectWallet = async () => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getAmounts();
    }
  }, [walletConnected]);

  const renderButton = () => {
    if (!walletConnected) {
      return (
        <button onClick={connectWallet} className={styles.button}>
          Connect Your Wallet
        </button>
      );
    }
    if (loading) {
      return <button className={styles.button}>Loading...</button>;
    }

    if (liquidityTab) {
      return (
        <div>
          <div className={styles.description}>
            You have:
            <br />
            {utils.formatEther(cdBalance)} Crypto Dev Tokens
            <br />
            {utils.formatEther(ethBalance)} ETH
            <br />
            {utils.formatEther(lpBalance)} Crypto Dev LP Tokens
          </div>
          <div>
            {utils.parseEther(reservedCD.toString()).eq(zero) ? (
              <div>
                <input
                  type="number"
                  placeholder="Amount of Ether"
                  onChange={(e) => {
                    try {
                      setAddEther(BigNumber.from(e.target.value || "0"));
                    } catch (error) {
                      console.log(error);
                    }
                  }}
                />
                <input
                  type="number"
                  placeholder="Amount of CryptoDev tokens"
                  onChange={(e) =>
                    setAddCDTokens(
                      BigNumber.from(utils.parseEther(e.target.value || "0"))
                    )
                  }
                />
                <button onClick={_addLiquidity} className={styles.button}>
                  Add
                </button>
              </div>
            ) : (
              <div>
                <input
                  type="number"
                  placeholder="Amount of Ether"
                  className={styles.input}
                  onChange={async (e) => {
                    try {
                      setAddEther(BigNumber.from(e.target.value || "0"));
                      const addCDTokens = await calculateCD(
                        e.target.value || "0",
                        etherBalanceContract,
                        reservedCD
                      );
                      setAddCDTokens(addCDTokens);
                    } catch (error) {
                      console.log(error);
                    }
                  }}
                />
                <div className={styles.inputDiv}>
                  {`You will need ${utils.formatEther(addCDTokens)} CD Tokens`}
                </div>
                <button className={styles.button} onClick={_addLiquidity}>
                  Add
                </button>
              </div>
            )}
            <div>
              <input
                type="number"
                placeholder="Amount of LP Tokens"
                onChange={async (e) => {
                  setRemoveLPTokens(e.target.value || "0");
                  await _getTokensAfterRemove(e.target.value || "0");
                }}
              />
              <div className={styles.input}>
                {`You will get ${utils.formatEther(
                  removeCD
                )} CD Tokens and ${utils.formatEther(removeEther)} ETH`}
              </div>
              <button className={styles.button} onClick={_removeLiquidity}>
                Remove
              </button>
            </div>
          </div>
        </div>
      );
    } else {
      // Swap tab
      return (
        <div>
          <input
            type="number"
            placeholder="Amount"
            onChange={async (e) => {
              setSwapAmount(e.target.value || "0");
              await _getAmountOfTokensReceivedFromSwap(e.target.value || "0");
            }}
            className={styles.input}
            value={swapAmount}
          />
          <select
            className={styles.select}
            name="dropdown"
            id="dropdown"
            onChange={async (e) => {
              setEthSelected(!ethSelected);
              await _getAmountOfTokensReceivedFromSwap(0);
              setSwapAmount("");
            }}
          >
            <option value="eth">Ethereum</option>
            <option value="cryptoDevToken">Crypto Dev Token</option>
          </select>
          <br />
          <div className={styles.inputDiv}>
            {ethSelected
              ? `You will get ${utils.formatEther(
                tokenToBeRecievedAfterSwap
              )} CD Tokens`
              : `You will get ${utils.formatEther(
                tokenToBeRecievedAfterSwap
              )} ETH`}
          </div>
          <button className={styles.button} onClick={_swapTokens}>
            Swap
          </button>
        </div>
      );
    }
  };
  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs Exchange</h1>
          <div className={styles.description}>
            Swap Ethereum &#60;&#62; Crypto Dev Tokens
          </div>
          <div>
            <button
              className={styles.button}
              onClick={() => setLiquidityTab(true)}
            >
              Liquidity
            </button>
            <button
              className={styles.button}
              onClick={() => setLiquidityTab(false)}
            >
              Swap
            </button>
          </div>
          {renderButton()}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>
      <footer className={styles.footer}>
        Made with &#10084; by{" "}
        <a href="https://github.com/pawanpaudel93" className={styles.link}>
          @pawanpaudel93
        </a>
      </footer>
    </div>
  );
};

export default Home;
