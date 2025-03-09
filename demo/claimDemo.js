const fs = require("fs");
const { accounts } = require("../config");
const { getTokenBalances } = require("../lib/tokenUtils");
const { verifySecret } = require("../lib/contractUtils");
const {
    TransferTransaction,
    ContractId,
    TokenId
} = require("@hashgraph/sdk");
const { getClient } = require("../config");

/**
 * Runs the claim demonstration
 * @param {Object} config - Configuration for the demo
 * @param {boolean} useCorrectSecret - Whether to use the correct secret
 * @param {Object} claimerAccount - Account that will attempt to claim
 * @returns {Object} Result of the claim operation
 */
async function runClaimDemo(config, useCorrectSecret = true, claimerAccount = accounts.account1) {
    console.log("\n=== RUNNING TOKEN CLAIM DEMO ===");
    console.log(`Claimer: ${claimerAccount.id}`);
    console.log(`Using ${useCorrectSecret ? "CORRECT" : "INCORRECT"} secret`);

    // Load configuration
    if (!config) {
        try {
            config = JSON.parse(fs.readFileSync("./demo-config.json"));
        } catch (error) {
            console.error("Could not load demo configuration. Run setupDemo.js first.");
            throw new Error("Missing demo configuration");
        }
    }

    // Debug the configuration
    console.log("\nDebug: Configuration loaded");
    console.log("Debug: Contract ID:", config.contractId);
    console.log("Debug: Number of tokens:", config.tokens.length);

    // Print the first token to see its structure
    console.log("Debug: First token structure:", JSON.stringify(config.tokens[0], null, 2));

    const tokens = config.tokens;
    const nfts = config.nfts;
    const contractId = config.contractId;
    const secrets = config.secrets;

    for (let i = 0; i < tokens.length; i++) {
        // Create TokenId directly if possible, or try to convert from string
        let tokenId;
        try {
            // If the token.id is already an object with shard, realm, num properties
            if (typeof tokens[i].id === 'object' && tokens[i].id !== null) {
                const tokenObj = tokens[i].id;
                tokenId = new TokenId(
                    tokenObj.shard.low,
                    tokenObj.realm.low,
                    tokenObj.num.low
                );
            } else {
                // If it's a string
                tokenId = TokenId.fromString(tokens[i].id);
            }
        } catch (error) {
            console.error(`Error creating TokenId: ${error.message}`);
            console.error(`Token value was: ${JSON.stringify(tokens[i].id)}`);
            throw error;
        }

        const tokenAddress = tokens[i].address;

        // Handle serial number properly
        let serialNumber;
        try {
            if (typeof nfts[i].serialNumber === 'object' && nfts[i].serialNumber !== null) {
                serialNumber = nfts[i].serialNumber.low || 1;
            } else {
                serialNumber = parseInt(nfts[i].serialNumber) || 1;
            }
        } catch (error) {
            console.error(`Error parsing serial number: ${error.message}`);
            serialNumber = 1; // Default to 1 if parsing fails
        }

        const correctSecret = secrets[i];

        // Debug token info
        console.log(`\nDebug: Processing token ${i + 1}`);
        console.log(`Debug: Token ID: ${tokenId.toString()}`);
        console.log(`Debug: Token Address: ${tokenAddress}`);
        console.log(`Debug: Serial Number: ${serialNumber}`);

        // Use correct or incorrect secret based on parameter
        const secretToUse = useCorrectSecret ? correctSecret : "WRONG_SECRET";

        try {
            // Step 1: Check initial balances
            console.log(`\nSTEP 1: Checking initial token balances for token ${tokenId.toString()}...`);
            const initialBalances = await getTokenBalances({
                tokenId,
                accounts: {
                    account0: accounts.account0,
                    [claimerAccount === accounts.account1 ? "account1" : "account2"]: claimerAccount
                }
            });
            console.log("Initial balances:", initialBalances);

            // Step 2: Verify the secret
            console.log("\nSTEP 2: Verifying secret with contract...");
            const isCorrect = await verifySecret({
                contractId,
                tokenAddress,
                serialNumber,
                secret: secretToUse,
                claimerAccount
            });

            // Step 3: Attempt to claim the token
            let claimResult;
            if (isCorrect) {
                console.log("\nSTEP 3: Secret is correct! Proceeding with token transfer...");

                // For this demo, we'll use the simpler direct approach
                const client = getClient();
                const transferTx = await new TransferTransaction()
                    .addNftTransfer(tokenId, serialNumber, accounts.account0.id, claimerAccount.id)
                    .freezeWith(client);

                const signedTx = await transferTx.sign(accounts.account0.key);
                const transferResponse = await signedTx.execute(client);
                const transferReceipt = await transferResponse.getReceipt(client);

                claimResult = {
                    success: transferReceipt.status.toString() === "SUCCESS",
                    status: transferReceipt.status.toString()
                };

                console.log(`Transfer status: ${claimResult.status}`);
            } else {
                console.log("\nSTEP 3: Secret is incorrect! Token transfer denied.");
                claimResult = { success: false, status: "INCORRECT_SECRET" };
            }

            // Step 4: Check final balances
            console.log("\nSTEP 4: Checking final token balances...");
            const finalBalances = await getTokenBalances({
                tokenId,
                accounts: {
                    account0: accounts.account0,
                    [claimerAccount === accounts.account1 ? "account1" : "account2"]: claimerAccount
                }
            });
            console.log("Final balances:", finalBalances);

            console.log("\n=== TOKEN CLAIM DEMO COMPLETE ===");
            console.log(`Result: ${claimResult.success ? "SUCCESS" : "FAILED"}`);

            return {
                initialBalances,
                finalBalances,
                secretVerified: isCorrect,
                claimResult
            };

        } catch (error) {
            console.error("Error in claim demo:", error.message);
            console.error("Debug: Full error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// If this file is run directly, run the claim demo
if (require.main === module) {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const useCorrectSecret = args.indexOf("--incorrect") === -1;
    const useAccount2 = args.indexOf("--account2") !== -1;

    runClaimDemo(
        null,
        useCorrectSecret,
        useAccount2 ? accounts.account2 : accounts.account1
    )
        .then(() => console.log("Demo completed"))
        .catch(error => {
            console.error("Demo failed:", error);
            process.exit(1);
        });
} else {
    module.exports = runClaimDemo;
}