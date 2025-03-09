require("dotenv").config();
const { Client, AccountId, PrivateKey } = require("@hashgraph/sdk");

// Client configuration
const getClient = () => {
    const operatorId = AccountId.fromString(process.env.OPERATOR_ACCOUNT_ID);
    const operatorKey = PrivateKey.fromStringECDSA(process.env.OPERATOR_ACCOUNT_PRIVATE_KEY);
    return Client.forTestnet().setOperator(operatorId, operatorKey);
};

// Account configuration
const accounts = {
    operator: {
        id: AccountId.fromString(process.env.OPERATOR_ACCOUNT_ID),
        key: PrivateKey.fromStringECDSA(process.env.OPERATOR_ACCOUNT_PRIVATE_KEY)
    },
    account0: {
        id: AccountId.fromString(process.env.ACCOUNT_0_ID),
        key: PrivateKey.fromStringECDSA(process.env.ACCOUNT_0_PRIVATE_KEY)
    },
    account1: {
        id: AccountId.fromString(process.env.ACCOUNT_1_ID),
        key: PrivateKey.fromStringECDSA(process.env.ACCOUNT_1_PRIVATE_KEY)
    },
    account2: {
        id: AccountId.fromString(process.env.ACCOUNT_2_ID),
        key: PrivateKey.fromStringECDSA(process.env.ACCOUNT_2_PRIVATE_KEY)
    }
};

module.exports = {
    getClient,
    accounts,
    defaultGasLimit: 200000,
    contractPath: './contracts/TokenTransferContract.sol',
    responseCodesPath: './contracts/HederaResponseCodes.sol',
    tokenServicePath: './contracts/HederaTokenService.sol'
};