const { accounts } = require("../config");
const { getTokenBalances, getNftMetadata } = require("../lib/tokenUtils");

/**
 * Get token information for display in a web application
 * @param {Object} params - Query parameters
 * @param {string} params.tokenId - Token ID string
 * @param {string} params.accountId - Optional specific account to query
 * @returns {Object} Token information for display
 */
async function getTokenInfo({ tokenId, accountId = null }) {
    try {
        // Get token balances
        let accountsToQuery = {
            account0: accounts.account0,
            account1: accounts.account1,
            account2: accounts.account2
        };

        // If specific account is requested, only query that one
        if (accountId) {
            if (accountId === accounts.account0.id.toString()) {
                accountsToQuery = { account0: accounts.account0 };
            } else if (accountId === accounts.account1.id.toString()) {
                accountsToQuery = { account1: accounts.account1 };
            } else if (accountId === accounts.account2.id.toString()) {
                accountsToQuery = { account2: accounts.account2 };
            } else {
                throw new Error("Invalid account ID");
            }
        }

        // Get balances for requested accounts
        const balances = await getTokenBalances({
            tokenId,
            accounts: accountsToQuery
        });

        // Find serial numbers owned by each account
        const tokenDetails = {};

        for (const [accountName, balance] of Object.entries(balances)) {
            if (balance > 0) {
                // This account owns at least one token
                const serialNumber = 1; // In a real app, query the serial numbers

                // Get metadata for this NFT
                const metadata = await getNftMetadata({
                    tokenId,
                    serialNumber
                });

                tokenDetails[accountName] = {
                    balance,
                    serialNumber,
                    metadata
                };
            } else {
                tokenDetails[accountName] = {
                    balance: 0,
                    serialNumber: null,
                    metadata: null
                };
            }
        }

        return {
            success: true,
            tokenId: tokenId.toString(),
            accounts: tokenDetails
        };

    } catch (error) {
        console.error("Error getting token info:", error);
        return {
            success: false,
            message: error.message,
            error: error.toString()
        };
    }
}

module.exports = { getTokenInfo };