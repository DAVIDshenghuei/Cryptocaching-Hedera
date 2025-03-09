const fs = require("fs");
const solc = require("solc");
const path = require("path");
const {
    ContractCreateFlow,
    ContractExecuteTransaction,
    ContractFunctionParameters,
    ContractId
} = require("@hashgraph/sdk");
const { getClient, defaultGasLimit, contractPath, responseCodesPath, tokenServicePath } = require("../config");

/**
 * Compiles the token transfer contract
 * @returns {Object} The bytecode and ABI of the compiled contract
 */
async function compileContract() {
    console.log("Compiling smart contract...");

    // Read contract files
    const htsCode = fs.readFileSync(path.resolve(__dirname, '..', tokenServicePath), 'utf8');
    const responseCodesCode = fs.readFileSync(path.resolve(__dirname, '..', responseCodesPath), 'utf8');
    const contractCode = fs.readFileSync(path.resolve(__dirname, '..', contractPath), 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'HederaTokenService.sol': { content: htsCode },
            'HederaResponseCodes.sol': { content: responseCodesCode },
            'TokenTransferContract.sol': { content: contractCode }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };

    // Compile contracts
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    // Check for errors
    if (output.errors) {
        output.errors.forEach(error => {
            console.log(error.formattedMessage);
        });

        // Only throw if there are serious errors
        if (output.errors.some(e => e.severity === 'error')) {
            throw new Error("Compilation failed");
        }
    }

    // Extract bytecode and ABI
    const contract = output.contracts['TokenTransferContract.sol']['TokenTransferContract'];
    const bytecode = contract.evm.bytecode.object;
    const abi = contract.abi;

    console.log("Smart contract compiled successfully");
    return { bytecode, abi };
}

/**
 * Deploys the token transfer contract
 * @param {string} bytecode - The contract bytecode
 * @returns {Object} Information about the deployed contract
 */
async function deployContract(bytecode) {
    console.log("Deploying smart contract...");
    const client = getClient();

    // Deploy using ContractCreateFlow
    const contractCreateTx = new ContractCreateFlow()
        .setGas(defaultGasLimit)
        .setBytecode(bytecode);

    const contractCreateResponse = await contractCreateTx.execute(client);
    const contractCreateReceipt = await contractCreateResponse.getReceipt(client);
    const contractId = contractCreateReceipt.contractId;

    console.log(`Contract deployed with ID: ${contractId}`);

    return {
        contractId,
        status: contractCreateReceipt.status.toString()
    };
}

/**
 * Registers a token owner in the contract
 * @param {Object} params - Registration parameters
 * @param {Object} params.contractId - Contract ID
 * @param {string} params.tokenAddress - Token address (solidity format)
 * @param {number} params.serialNumber - Serial number of the NFT
 * @param {Object} params.ownerAccount - Account that owns the token
 * @returns {Object} Transaction result
 */
async function registerTokenOwner({ contractId, tokenAddress, serialNumber, ownerAccount }) {
    const client = getClient();

    console.log(`Registering token owner for ${tokenAddress} #${serialNumber}...`);

    // Make sure contractId is in the right format
    const contractIdObj = typeof contractId === 'string' ?
        ContractId.fromString(contractId) :
        (contractId instanceof ContractId ?
            contractId :
            new ContractId(contractId.shard.low, contractId.realm.low, contractId.num.low));

    try {
        const registerTx = await new ContractExecuteTransaction()
            .setContractId(contractIdObj)
            .setGas(defaultGasLimit)
            .setFunction(
                "registerTokenOwner",
                new ContractFunctionParameters()
                    .addAddress(tokenAddress)
                    .addInt64(serialNumber)
            )
            .freezeWith(client)
            .sign(ownerAccount.key);

        const registerResponse = await registerTx.execute(client);
        const registerReceipt = await registerResponse.getReceipt(client);

        console.log(`Token owner registered successfully: ${registerReceipt.status}`);

        return {
            success: registerReceipt.status.toString() === "SUCCESS",
            status: registerReceipt.status.toString()
        };
    } catch (error) {
        console.error(`Error in registerTokenOwner: ${error.message}`);
        throw error;
    }
}

/**
 * Sets a secret for a token
 * @param {Object} params - Secret parameters
 * @param {Object} params.contractId - Contract ID
 * @param {string} params.tokenAddress - Token address (solidity format)
 * @param {number} params.serialNumber - Serial number of the NFT
 * @param {string} params.secret - Secret to set
 * @param {Object} params.ownerAccount - Account that owns the token
 * @returns {Object} Transaction result
 */
async function setTokenSecret({ contractId, tokenAddress, serialNumber, secret, ownerAccount }) {
    const client = getClient();

    console.log(`Setting secret for token ${tokenAddress} #${serialNumber}...`);

    // Make sure contractId is in the right format
    const contractIdObj = typeof contractId === 'string' ?
        ContractId.fromString(contractId) :
        (contractId instanceof ContractId ?
            contractId :
            new ContractId(contractId.shard.low, contractId.realm.low, contractId.num.low));

    try {
        const setSecretTx = await new ContractExecuteTransaction()
            .setContractId(contractIdObj)
            .setGas(defaultGasLimit)
            .setFunction(
                "setTokenSecret",
                new ContractFunctionParameters()
                    .addAddress(tokenAddress)
                    .addInt64(serialNumber)
                    .addString(secret)
            )
            .freezeWith(client)
            .sign(ownerAccount.key);

        const setSecretResponse = await setSecretTx.execute(client);
        const setSecretReceipt = await setSecretResponse.getReceipt(client);

        console.log(`Secret set successfully: ${setSecretReceipt.status}`);

        return {
            success: setSecretReceipt.status.toString() === "SUCCESS",
            status: setSecretReceipt.status.toString()
        };
    } catch (error) {
        console.error(`Error in setTokenSecret: ${error.message}`);
        throw error;
    }
}

/**
 * Verifies a secret for a token
 * @param {Object} params - Verification parameters
 * @param {Object} params.contractId - Contract ID
 * @param {string} params.tokenAddress - Token address (solidity format)
 * @param {number} params.serialNumber - Serial number of the NFT
 * @param {string} params.secret - Secret to verify
 * @param {Object} params.claimerAccount - Account trying to claim
 * @returns {boolean} Whether the secret is correct
 */
async function verifySecret({ contractId, tokenAddress, serialNumber, secret, claimerAccount }) {
    const client = getClient();

    console.log(`Verifying secret for token ${tokenAddress} #${serialNumber}...`);

    // Make sure contractId is in the right format
    const contractIdObj = typeof contractId === 'string' ?
        ContractId.fromString(contractId) :
        (contractId instanceof ContractId ?
            contractId :
            new ContractId(contractId.shard.low, contractId.realm.low, contractId.num.low));

    try {
        const verifyTx = await new ContractExecuteTransaction()
            .setContractId(contractIdObj)
            .setGas(defaultGasLimit)
            .setFunction(
                "verifySecret",
                new ContractFunctionParameters()
                    .addAddress(tokenAddress)
                    .addInt64(serialNumber)
                    .addString(secret)
            )
            .freezeWith(client)
            .sign(claimerAccount.key);

        const verifyResponse = await verifyTx.execute(client);
        const verifyRecord = await verifyResponse.getRecord(client);
        const isCorrect = verifyRecord.contractFunctionResult.getBool(0);

        console.log(`Secret verification result: ${isCorrect ? "CORRECT" : "INCORRECT"}`);

        return isCorrect;
    } catch (error) {
        console.error(`Error in verifySecret: ${error.message}`);
        throw error;
    }
}

/**
 * Attempts to claim a token by providing a secret
 * @param {Object} params - Claim parameters
 * @param {Object} params.contractId - Contract ID
 * @param {string} params.tokenAddress - Token address (solidity format)
 * @param {number} params.serialNumber - Serial number of the NFT
 * @param {string} params.secret - Secret to claim with
 * @param {Object} params.claimerAccount - Account trying to claim
 * @returns {Object} Result of the claim attempt
 */
async function claimTokenWithSecret({ contractId, tokenAddress, serialNumber, secret, claimerAccount }) {
    const client = getClient();

    console.log(`Attempting to claim token ${tokenAddress} #${serialNumber} with secret...`);

    // Make sure contractId is in the right format
    const contractIdObj = typeof contractId === 'string' ?
        ContractId.fromString(contractId) :
        (contractId instanceof ContractId ?
            contractId :
            new ContractId(contractId.shard.low, contractId.realm.low, contractId.num.low));

    try {
        const claimTx = await new ContractExecuteTransaction()
            .setContractId(contractIdObj)
            .setGas(defaultGasLimit * 4) // Higher gas limit for transfer operation
            .setFunction(
                "claimTokenWithSecret",
                new ContractFunctionParameters()
                    .addAddress(tokenAddress)
                    .addInt64(serialNumber)
                    .addString(secret)
            )
            .freezeWith(client)
            .sign(claimerAccount.key);

        const claimResponse = await claimTx.execute(client);
        const claimRecord = await claimResponse.getRecord(client);
        const success = claimRecord.contractFunctionResult.getBool(0);

        console.log(`Token claim result: ${success ? "SUCCESS" : "FAILED"}`);

        return {
            success,
            transactionId: claimResponse.transactionId.toString()
        };
    } catch (error) {
        console.error(`Error in claimTokenWithSecret: ${error.message}`);
        // Don't throw, return the error info
        return {
            success: false,
            error: error.message
        };
    }
}

module.exports = {
    compileContract,
    deployContract,
    registerTokenOwner,
    setTokenSecret,
    verifySecret,
    claimTokenWithSecret
};