const { accounts } = require("../config");
const { verifySecret } = require("../lib/contractUtils");
const { TransferTransaction } = require("@hashgraph/sdk");
const { getClient } = require("../config");

/**
 * Web-friendly function to claim a token
 * @param {Object} params - Claim parameters
 * @param {string} params.tokenId - Token ID string
 * @param {string} params.tokenAddress - Token address
 * @param {number} params.serialNumber - NFT serial number
 * @param {string} params.contractId - Contract ID
 * @param {string} params.secret - Secret for verification
 * @param {string} params.claimerAccountId - ID of account claiming the token
 * @returns {Object} Result of the claim operation
 */
async function claimToken({ tokenId, tokenAddress, serialNumber, contractId, secret, claimerAccountId }) {
    try {
        // Determine which account is claiming
        let claimerAccount;
        if (claimerAccountId === accounts.account1.id.toString()) {
            claimerAccount = accounts.account1;
        } else if (claimerAccountId === accounts.account2.id.toString()) {
            claimerAccount = accounts.account2;
        } else {
            throw new Error("Invalid claimer account ID");
        }

        // Step 1: Verify the secret
        console.log(`Verifying secret for token ${tokenId} #${serialNumber}`);
        const isCorrect = await verifySecret({
            contractId,
            tokenAddress,
            serialNumber,
            secret,
            claimerAccount
        });

        if (!isCorrect) {
            return {
                success: false,
                message: "Incorrect secret provided"
            };
        }

        // Step 2: Transfer the token
        console.log("Secret verified, transferring token...");
        const client = getClient();
        const transferTx = await new TransferTransaction()
            .addNftTransfer(tokenId, serialNumber, accounts.account0.id, claimerAccount.id)
            .freezeWith(client);

        const signedTx = await transferTx.sign(accounts.account0.key);
        const transferResponse = await signedTx.execute(client);
        const transferReceipt = await transferResponse.getReceipt(client);

        const success = transferReceipt.status.toString() === "SUCCESS";

        return {
            success,
            message: success ? "Token claimed successfully" : "Transfer failed",
            transactionId: transferResponse.transactionId.toString()
        };

    } catch (error) {
        console.error("Error claiming token:", error);
        return {
            success: false,
            message: error.message,
            error: error.toString()
        };
    }
}

module.exports = { claimToken };