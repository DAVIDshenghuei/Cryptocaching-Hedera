// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import './HederaResponseCodes.sol';

interface IHederaTokenService {
    function transferNFT(
        address token,
        address sender,
        address receiver,
        int64 serialNumber
    ) external returns (int64);
}

contract HederaTokenService {
    address constant precompiled =
        address(0x0000000000000000000000000000000000000167);

    function transferNFT(
        address token,
        address sender,
        address receiver,
        int64 serialNumber
    ) internal returns (int64) {
        return
            IHederaTokenService(precompiled).transferNFT(
                token,
                sender,
                receiver,
                serialNumber
            );
    }
}
