// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Exchange is ERC20 {
    address public cryptoDevTokenAddress;

    constructor(address _cryptoDevTokenAddress)
        ERC20("CryptoDev LP Token", "CDLP")
    {
        require(
            _cryptoDevTokenAddress != address(0),
            "Token address passed is a null address"
        );
        cryptoDevTokenAddress = _cryptoDevTokenAddress;
    }

    /**
     * @dev Returns the amount of 'Crypto Dev Tokens' held by the contract
     */
    function getReserve() public view returns (uint256) {
        return ERC20(cryptoDevTokenAddress).balanceOf(address(this));
    }

    /** @dev Adds liquidity to the exchange */
    function addLiquidity(uint256 _amount) public payable returns (uint256) {
        uint256 liquidity;
        uint256 ethBalance = address(this).balance;
        uint256 cryptoDevTokenReserve = getReserve();
        ERC20 cryptoDevToken = ERC20(cryptoDevTokenAddress);

        /** If the reserve is empty, intake any user supplied value for
        `Ether` and `Crypto Dev` tokens because there is no ratio currently */
        if (cryptoDevTokenReserve == 0) {
            cryptoDevToken.transferFrom(msg.sender, address(this), _amount);
            // ethBalance is the amount of Ether the user has supplied as liquidity for first time so equal to address(this).balance
            // LP token minted to the user is proportional to the amount of Ether supplied as liquidity
            liquidity = ethBalance;
            _mint(msg.sender, liquidity);
        } else {
            /** ethReserve is equal to the ethBalance - the current value of eth deposited by the liquidity provider*/
            uint256 ethReserve = ethBalance - msg.value;
            uint256 cryptoDevTokenAmount = (msg.value * cryptoDevTokenReserve) /
                ethReserve;
            require(
                _amount >= cryptoDevTokenAmount,
                "Amount of tokens is less than the amount of tokens required"
            );
            cryptoDevToken.transferFrom(
                msg.sender,
                address(this),
                cryptoDevTokenAmount
            );
            // Ratio to be maintained
            // (LP tokens to be sent to the user(liquidity)/ totalSupply of LP tokens in contract) = (eth sent by the user)/(eth reserve in the contract)
            liquidity = (totalSupply() * msg.value) / ethReserve;
            _mint(msg.sender, liquidity);
        }
        return liquidity;
    }

    /** @dev Removes liquidity from the exchange */
    function removeLiquidity(uint256 _amount)
        public
        returns (uint256, uint256)
    {
        /**The amount of ether that would be sent back to the user would be based on a ratio.
         * Ratio is Eth sent back to the user/ Current Eth reserve) = (amount of LP tokens that user wants to withdraw)/ Total supply of LP tokens
         * The amount of Crypto Dev tokens that would be sent back to the user would also be based on a ratio
         * Ratio is (Crypto Dev sent back to the user/ Current Crypto Dev token reserve) = (amount of LP tokens that user wants to withdraw)/ Total supply of LP tokens)
         * The amount of LP tokens that user would use to remove liquidity would be burnt
         */
        require(_amount > 0, "_amount must be greater than 0");
        uint256 _totalSupply = totalSupply();
        uint256 ethReserve = address(this).balance;
        uint256 ethAmount = (ethReserve * _amount) / _totalSupply;
        uint256 cryptoDevTokenAmount = (getReserve() * _amount) / _totalSupply;
        _burn(msg.sender, _amount);
        (bool sent, ) = msg.sender.call{value: ethAmount}("");
        require(sent, "Failed to send ether to the user");
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, cryptoDevTokenAmount);
        return (ethAmount, cryptoDevTokenAmount);
    }

    /** @dev Returns the amount Eth/ Crypto Dev tokens that would be returned to the user in the swap */
    function getAmountOfTokens(
        uint256 inputAmount,
        uint256 inputReserve,
        uint256 outputReserve
    ) public pure returns (uint256) {
        require(
            inputReserve > 0 && outputReserve > 0,
            "Reserves must be greater than 0"
        );
        // Fees is 1% of input amount
        uint256 inputAmountWithFee = inputAmount * 99;
        // We need to make sure (x + Δx)*(y - Δy) = (x)*(y)
        // so the final formulae is Δy = (y*Δx)/(x + Δx);
        // Δy in our case is `tokens to be recieved`
        // Δx = ((input amount)*99)/100, x = inputReserve, y = outputReserve
        // So by putting the values in the formulae you can get the numerator and denominator
        uint256 numerator = inputAmountWithFee * outputReserve;
        uint256 denominator = (100 * inputReserve) + inputAmountWithFee;
        return numerator / denominator;
    }

    /** @dev Swaps Ether to CryptoDev Tokens */
    function ethToCryptoDevToken(uint256 _minTokens) public payable {
        uint256 tokenReserve = getReserve();
        uint256 tokensBought = getAmountOfTokens(
            msg.value,
            address(this).balance - msg.value,
            tokenReserve
        );
        require(tokensBought >= _minTokens, "Insufficient output amount");
        ERC20(cryptoDevTokenAddress).transfer(msg.sender, tokensBought);
    }

    /** @dev Swaps CryptoDev Tokens to Ether */
    function cryptoDevTokenToEth(uint256 _tokensSold, uint256 _minEth) public {
        uint256 tokenReserve = getReserve();
        uint256 ethBought = getAmountOfTokens(
            _tokensSold,
            tokenReserve,
            address(this).balance
        );
        require(ethBought >= _minEth, "Insufficient output amount");
        ERC20(cryptoDevTokenAddress).transferFrom(
            msg.sender,
            address(this),
            _tokensSold
        );
        (bool sent, ) = msg.sender.call{value: ethBought}("");
        require(sent, "Failed to send ether to the user");
    }
}
