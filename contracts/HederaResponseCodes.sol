// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library HederaResponseCodes {
    int internal constant SUCCESS = 0;
    int internal constant INVALID_TOKEN_ID = 150;
    int internal constant ACCOUNT_FROZEN_FOR_TOKEN = 170;
    int internal constant TOKENS_PER_ACCOUNT_LIMIT_EXCEEDED = 172;
    int internal constant TRANSFER_FAILED = 163;
}
