// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MultiBondPlatform {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    enum Status { Active, Redeemed, Defaulted }

    struct Bond {
        string name;
        uint256 faceValue;
        uint256 couponRateBps;
        uint256 maturity;
        uint256 couponInterval;
        uint256 gracePeriod;

        uint256 totalSupply;
        uint256 escrowBalance;
        uint256 lastCouponTime;
        uint256 trustScore;

        Status status;

        address issuer;

        mapping(address => uint256) balanceOf;
        mapping(address => bool) kyc;
        address[] holders;
        mapping(address => bool) isHolder;
    }

    uint256 public bondCounter;
    mapping(uint256 => Bond) public bonds;

    // ───────────────────────────────
    // CREATE BOND
    // ───────────────────────────────

    function createBond(
        string memory _name,
        uint256 _faceValue,
        uint256 _couponRateBps,
        uint256 _maturity,
        uint256 _couponInterval,
        uint256 _gracePeriod
    ) external {

        uint256 bondId = bondCounter++;

        Bond storage b = bonds[bondId];

        b.name = _name;
        b.faceValue = _faceValue;
        b.couponRateBps = _couponRateBps;
        b.maturity = _maturity;
        b.couponInterval = _couponInterval;
        b.gracePeriod = _gracePeriod;

        b.issuer = msg.sender;
        b.status = Status.Active;
        b.lastCouponTime = block.timestamp;
        b.trustScore = 500;
    }

    // ───────────────────────────────
    // KYC
    // ───────────────────────────────

    function approveKYC(uint256 bondId, address user) external {
        require(msg.sender == admin);
        bonds[bondId].kyc[user] = true;
    }

    // ───────────────────────────────
    // ISSUE BONDS
    // ───────────────────────────────

    function issue(uint256 bondId, address investor, uint256 amount) external {
        Bond storage b = bonds[bondId];

        require(msg.sender == b.issuer);
        require(b.kyc[investor]);
        require(b.status == Status.Active);

        b.balanceOf[investor] += amount;
        b.totalSupply += amount;

        if (!b.isHolder[investor]) {
            b.isHolder[investor] = true;
            b.holders.push(investor);
        }
    }

    // ───────────────────────────────
    // ESCROW
    // ───────────────────────────────

    function deposit(uint256 bondId) external payable {
        Bond storage b = bonds[bondId];
        require(msg.sender == b.issuer);

        b.escrowBalance += msg.value;
    }

    // ───────────────────────────────
    // COUPON PAYMENT
    // ───────────────────────────────

    function payCoupon(uint256 bondId) external {
        Bond storage b = bonds[bondId];

        require(msg.sender == b.issuer);
        require(b.status == Status.Active);

        uint256 totalCoupon =
            (b.totalSupply * b.faceValue * b.couponRateBps) / 10000;

        require(b.escrowBalance >= totalCoupon);

        b.escrowBalance -= totalCoupon;

        for (uint256 i = 0; i < b.holders.length; i++) {
            address investor = b.holders[i];
            uint256 share =
                (b.balanceOf[investor] * totalCoupon) / b.totalSupply;

            if (share > 0) {
                payable(investor).transfer(share);
            }
        }

        b.lastCouponTime = block.timestamp;
    }

    // ───────────────────────────────
    // REDEEM
    // ───────────────────────────────

    function redeem(uint256 bondId) external {
        Bond storage b = bonds[bondId];

        require(block.timestamp >= b.maturity);
        require(b.status == Status.Active);

        uint256 tokens = b.balanceOf[msg.sender];
        require(tokens > 0);

        uint256 payout = tokens * b.faceValue;
        require(b.escrowBalance >= payout);

        b.balanceOf[msg.sender] = 0;
        b.totalSupply -= tokens;
        b.escrowBalance -= payout;

        payable(msg.sender).transfer(payout);

        if (b.totalSupply == 0) {
            b.status = Status.Redeemed;
        }
    }
}