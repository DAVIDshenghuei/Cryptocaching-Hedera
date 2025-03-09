// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HederaTokenService.sol";
import "./HederaResponseCodes.sol";

contract TokenTransferContract is HederaTokenService {
    address public owner;

    // Storage for token secrets
    mapping(address => mapping(int64 => bytes32)) private tokenSecrets;
    mapping(address => mapping(int64 => address)) private tokenOwners;

    // Events
    event SecretSet(address tokenId, int64 serialNumber);
    event SecretVerified(
        address tokenId,
        int64 serialNumber,
        address claimer,
        bool success
    );
    event TokenClaimed(
        address tokenId,
        int64 serialNumber,
        address from,
        address to
    );
    event ClaimFailed(
        address tokenId,
        int64 serialNumber,
        address claimer,
        int responseCode,
        string reason
    );

    constructor() {
        owner = msg.sender;
    }

    // Register a token owner (should be called after acquiring a token)
    function registerTokenOwner(
        address tokenAddress,
        int64 serialNumber
    ) external {
        tokenOwners[tokenAddress][serialNumber] = msg.sender;
    }

    // Allow token owner to set a secret for their token
    function setTokenSecret(
        address tokenAddress,
        int64 serialNumber,
        string calldata secret
    ) external {
        require(
            tokenOwners[tokenAddress][serialNumber] == msg.sender,
            "Only token owner can set secret"
        );
        bytes32 secretHash = keccak256(abi.encodePacked(secret));
        tokenSecrets[tokenAddress][serialNumber] = secretHash;
        emit SecretSet(tokenAddress, serialNumber);
    }

    // Verify a secret without transfer
    function verifySecret(
        address tokenAddress,
        int64 serialNumber,
        string calldata secret
    ) external returns (bool) {
        bytes32 secretHash = tokenSecrets[tokenAddress][serialNumber];
        require(secretHash != bytes32(0), "No secret set for this token");
        bool isCorrect = keccak256(abi.encodePacked(secret)) == secretHash;
        emit SecretVerified(tokenAddress, serialNumber, msg.sender, isCorrect);
        return isCorrect;
    }

    // Claim token with secret - MODIFIED for better error handling
    function claimTokenWithSecret(
        address tokenAddress,
        int64 serialNumber,
        string calldata secret
    ) external returns (bool) {
        // Check if a secret is set for this token
        bytes32 secretHash = tokenSecrets[tokenAddress][serialNumber];
        if (secretHash == bytes32(0)) {
            emit ClaimFailed(
                tokenAddress,
                serialNumber,
                msg.sender,
                1,
                "No secret set for this token"
            );
            revert("No secret set for this token");
        }

        // Verify the provided secret matches
        bool isCorrect = keccak256(abi.encodePacked(secret)) == secretHash;
        if (!isCorrect) {
            emit ClaimFailed(
                tokenAddress,
                serialNumber,
                msg.sender,
                2,
                "Incorrect secret provided"
            );
            revert("Incorrect secret provided");
        }

        // Get the current token owner
        address currentOwner = tokenOwners[tokenAddress][serialNumber];
        if (currentOwner == address(0)) {
            emit ClaimFailed(
                tokenAddress,
                serialNumber,
                msg.sender,
                3,
                "Token owner not registered"
            );
            revert("Token owner not registered");
        }

        // Attempt to transfer the NFT
        int responseCode = cryptoTransferToken(
            tokenAddress,
            serialNumber,
            currentOwner,
            msg.sender
        );

        // Check if the transfer was successful
        if (responseCode == HederaResponseCodes.SUCCESS) {
            // Update the token owner
            tokenOwners[tokenAddress][serialNumber] = msg.sender;

            // Clear the secret after successful claim
            delete tokenSecrets[tokenAddress][serialNumber];

            emit TokenClaimed(
                tokenAddress,
                serialNumber,
                currentOwner,
                msg.sender
            );
            return true;
        } else {
            emit ClaimFailed(
                tokenAddress,
                serialNumber,
                msg.sender,
                responseCode,
                "Transfer failed"
            );
            revert("Token transfer failed - check allowances");
        }
    }

    // Helper function to handle the transfer with better error checking
    function cryptoTransferToken(
        address tokenAddress,
        int64 serialNumber,
        address from,
        address to
    ) private returns (int) {
        return transferNFT(tokenAddress, from, to, serialNumber);
    }
}
