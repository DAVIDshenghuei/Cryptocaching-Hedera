const { accounts } = require("../config");
const { createNftToken, mintNft, associateTokenWithAccount, getTokenBalances } = require("../lib/tokenUtils");
const { compileContract, deployContract, registerTokenOwner, setTokenSecret } = require("../lib/contractUtils");

const SECRETS = [
    "SECRET_1",
    "SECRET_2",
    "SECRET_3"
];

/**
 * Sets up the entire demo environment
 * @returns {Object} Setup result with all created resources
 */
async function setupDemo() {
    console.log("=== SETTING UP DEMO ENVIRONMENT ===\n");

    try {
        // Step 1: Create tokens
        console.log("STEP 1: Creating NFT tokens...");
        const tokens = [];
        for (let i = 0; i < SECRETS.length; i++) {
            const token = await createNftToken({
                name: `SecretToken${i + 1}`,
                symbol: `SCRT${i + 1}`,
                treasuryAccount: accounts.account0
            });
            tokens.push(token);
        }

        // Step 2: Mint NFTs
        console.log("\nSTEP 2: Minting NFTs...");
        const nfts = [];
        for (const token of tokens) {
            const nft = await mintNft({
                tokenId: token.id,
                metadata: `SECRET_TOKEN_${token.id}`
            });
            nfts.push(nft);
        }

        // Step 3: Associate tokens with accounts
        console.log("\nSTEP 3: Associating tokens with accounts...");
        for (const token of tokens) {
            await associateTokenWithAccount({ tokenId: token.id, account: accounts.account1 });
            await associateTokenWithAccount({ tokenId: token.id, account: accounts.account2 });
        }

        // Step 4: Check initial balances
        console.log("\nSTEP 4: Checking initial balances...");
        for (const token of tokens) {
            const initialBalances = await getTokenBalances({
                tokenId: token.id,
                accounts: {
                    account0: accounts.account0,
                    account1: accounts.account1,
                    account2: accounts.account2
                }
            });
            console.log(`Initial token balances for ${token.id}:`, initialBalances);
        }

        // Step 5: Compile and deploy contract
        console.log("\nSTEP 5: Compiling and deploying contract...");
        const { bytecode, abi } = await compileContract();
        const contract = await deployContract(bytecode);

        // Step 6: Register token owners and set secrets
        console.log("\nSTEP 6: Registering token owners and setting secrets...");
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            const nft = nfts[i];
            const secret = SECRETS[i];

            await registerTokenOwner({
                contractId: contract.contractId,
                tokenAddress: token.address,
                serialNumber: nft.serialNumber,
                ownerAccount: accounts.account0
            });

            await setTokenSecret({
                contractId: contract.contractId,
                tokenAddress: token.address,
                serialNumber: nft.serialNumber,
                secret,
                ownerAccount: accounts.account0
            });
        }

        console.log("\n=== DEMO SETUP COMPLETE ===");
        console.log("Tokens:", tokens);
        console.log("NFTs:", nfts);
        console.log("Contract ID:", contract.contractId);
        console.log("Secrets:", SECRETS);

        return {
            tokens,
            nfts,
            contract,
            secrets: SECRETS
        };

    } catch (error) {
        console.error("Error setting up demo:", error.message);
        throw error;
    }
}

// If this file is run directly, run the setup
if (require.main === module) {
    setupDemo()
        .then(result => {
            console.log("\nDemo setup successful!");
            // Save setup data to a file for later use
            const fs = require("fs");
            fs.writeFileSync(
                "./demo-config.json",
                JSON.stringify({
                    tokens: result.tokens,
                    nfts: result.nfts,
                    contractId: result.contract.contractId,
                    secrets: result.secrets
                }, null, 2)
            );
            console.log("Demo configuration saved to demo-config.json");
        })
        .catch(error => {
            console.error("Setup failed:", error);
            process.exit(1);
        });
} else {
    module.exports = setupDemo;
}