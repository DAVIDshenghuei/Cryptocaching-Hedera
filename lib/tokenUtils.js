const {
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    TokenMintTransaction,
    TokenAssociateTransaction,
    AccountBalanceQuery,
    NftId,
    TokenNftInfoQuery,
    PrivateKey
} = require("@hashgraph/sdk");
const { getClient } = require("../config");

// Generate supply key for token operations
const supplyKey = PrivateKey.generate();

/**
 * Creates a non-fungible token
 * @param {Object} params - Token creation parameters
 * @param {string} params.name - Token name
 * @param {string} params.symbol - Token symbol
 * @param {Object} params.treasuryAccount - Account that will be treasury
 * @returns {Object} Token information
 */
async function createNftToken({ name, symbol, treasuryAccount }) {
    const client = getClient();

    console.log(`Creating token: ${name} (${symbol})...`);

    const tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.NonFungibleUnique)
        .setDecimals(0)
        .setInitialSupply(0)
        .setTreasuryAccountId(treasuryAccount.id)
        .setSupplyType(TokenSupplyType.Finite)
        .setMaxSupply(100)
        .setSupplyKey(supplyKey)
        .setTokenMemo(`Token created for demo purposes`)
        .freezeWith(client)
        .sign(treasuryAccount.key);

    const tokenCreateSubmit = await tokenCreateTx.execute(client);
    const tokenCreateRx = await tokenCreateSubmit.getReceipt(client);
    const tokenId = tokenCreateRx.tokenId;

    console.log(`Created token with ID: ${tokenId}`);

    return {
        id: tokenId,
        address: tokenId.toSolidityAddress()
    };
}

/**
 * Mints an NFT with metadata
 * @param {Object} params - Minting parameters
 * @param {Object} params.tokenId - Token ID object
 * @param {string} params.metadata - Metadata for the NFT
 * @returns {Object} Minted token information
 */
async function mintNft({ tokenId, metadata }) {
    const client = getClient();

    console.log(`Minting NFT with metadata: ${metadata}...`);

    const mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata([Buffer.from(metadata)])
        .freezeWith(client)
        .sign(supplyKey);

    const mintSubmit = await mintTx.execute(client);
    const mintRx = await mintSubmit.getReceipt(client);
    const serialNumber = mintRx.serials[0];

    console.log(`Minted NFT with serial number: ${serialNumber}`);

    return {
        serialNumber,
        metadata
    };
}

/**
 * Associates a token with an account
 * @param {Object} params - Association parameters
 * @param {Object} params.tokenId - Token ID to associate
 * @param {Object} params.account - Account to associate with
 * @returns {boolean} Success status
 */
async function associateTokenWithAccount({ tokenId, account }) {
    const client = getClient();

    console.log(`Associating token ${tokenId} with account ${account.id}...`);

    const associateTx = await new TokenAssociateTransaction()
        .setAccountId(account.id)
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(account.key);

    const associateSubmit = await associateTx.execute(client);
    await associateSubmit.getReceipt(client);

    console.log(`Token associated successfully with ${account.id}`);

    return true;
}

/**
 * Gets token balances for multiple accounts
 * @param {Object} params - Balance query parameters
 * @param {Object} params.tokenId - Token ID to check
 * @param {Array} params.accounts - Array of account objects
 * @returns {Object} Balance results for each account
 */
async function getTokenBalances({ tokenId, accounts }) {
    const client = getClient();
    const results = {};

    console.log(`Retrieving token balances for ${tokenId}...`);

    for (const [name, account] of Object.entries(accounts)) {
        const balance = await new AccountBalanceQuery()
            .setAccountId(account.id)
            .execute(client);

        const tokenBalance = balance.tokens._map.get(tokenId.toString()) || 0;
        results[name] = tokenBalance;
    }

    return results;
}

/**
 * Gets NFT metadata
 * @param {Object} params - Metadata query parameters
 * @param {Object} params.tokenId - Token ID
 * @param {number} params.serialNumber - Serial number of the NFT
 * @returns {string} Metadata as string
 */
async function getNftMetadata({ tokenId, serialNumber }) {
    const client = getClient();

    const nftId = new NftId(tokenId, serialNumber);
    const nftInfos = await new TokenNftInfoQuery()
        .setNftId(nftId)
        .execute(client);

    if (nftInfos && nftInfos.length > 0) {
        return Buffer.from(nftInfos[0].metadata).toString();
    }

    return null;
}

module.exports = {
    supplyKey,
    createNftToken,
    mintNft,
    associateTokenWithAccount,
    getTokenBalances,
    getNftMetadata
};