// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {MarketAPI} from "filecoin-solidity-api/contracts/v0.8/MarketAPI.sol";
import {CommonTypes} from "filecoin-solidity-api/contracts/v0.8/types/CommonTypes.sol";
import {MarketTypes} from "filecoin-solidity-api/contracts/v0.8/types/MarketTypes.sol";
import {AccountTypes} from "filecoin-solidity-api/contracts/v0.8/types/AccountTypes.sol";
import {AccountCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/AccountCbor.sol";
import {MarketCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/MarketCbor.sol";
import {BytesCBOR} from "filecoin-solidity-api/contracts/v0.8/cbor/BytesCbor.sol";
import {BigInts} from "filecoin-solidity-api/contracts/v0.8/utils/BigInts.sol";
import {CBOR} from "solidity-cborutils/contracts/CBOR.sol";
import {Misc} from "filecoin-solidity-api/contracts/v0.8/utils/Misc.sol";
import {FilAddresses} from "filecoin-solidity-api/contracts/v0.8/utils/FilAddresses.sol";
import {DataAttestation, IBridgeContract, StringsEqual} from "../sourceChain/Oracles.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

using CBOR for CBOR.CBORBuffer;

contract DealClientAxl is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using AccountCBOR for *;
    using MarketCBOR for *;

    IAxelarGasService public gasService;
    IAxelarGateway public gateway;
    uint64 public constant AUTHENTICATE_MESSAGE_METHOD_NUM = 2643134072;
    uint64 public constant DATACAP_RECEIVER_HOOK_METHOD_NUM = 3726118371;
    uint64 public constant MARKET_NOTIFY_DEAL_METHOD_NUM = 4186741094;
    address public constant MARKET_ACTOR_ETH_ADDRESS =
        address(0xff00000000000000000000000000000000000005);
    address public constant DATACAP_ACTOR_ETH_ADDRESS =
        address(0xfF00000000000000000000000000000000000007);
    uint256 public constant AXELAR_GAS_FEE = 100000000000000000; // Start with 0.1 FIL

    struct DestinationChain {
        string chainName;
        address destinationAddress;
    }

    struct ChainInfo {
        string chainName;
        address destinationAddress;
    }

    enum Status {
        None,
        DealPublished,
        DealActivated,
        DealTerminated
    }

    mapping(bytes => uint64) public pieceDeals; // commP -> deal ID
    mapping(bytes => Status) public pieceStatus;
    mapping(bytes => uint256) public providerGasFunds; // Funds set aside for calling oracle by provider
    mapping(uint256 => DestinationChain) public chainIdToDestinationChain;
    //mapping(uint256 => ChainInfo) public chainIdToDestinationChain;

     /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _gateway,
        address _gasReceiver
    ) public initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
         
        gateway = IAxelarGateway(_gateway);
        gasService = IAxelarGasService(_gasReceiver);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function setDestinationChains(
        uint[] calldata chainIds,
        string[] calldata destinationChains,
        address[] calldata destinationAddresses
    ) external {
        require(
            chainIds.length == destinationChains.length &&
                destinationChains.length == destinationAddresses.length,
            "Input arrays must have the same length"
        );

        for (uint i = 0; i < chainIds.length; i++) {
            require(
                chainIdToDestinationChain[chainIds[i]].destinationAddress ==
                    address(0),
                "Destination chains already configured for the chainId"
            );
            chainIdToDestinationChain[chainIds[i]] = DestinationChain(
                destinationChains[i],
                destinationAddresses[i]
            );
        }
    }

    function addGasFunds(bytes calldata providerAddrData) external payable {
        providerGasFunds[providerAddrData] += msg.value;
    }

    // dealNotify is the callback from the market actor into the contract at the end
    // of PublishStorageDeals. This message holds the previously approved deal proposal
    // and the associated dealID. The dealID is stored as part of the contract state
    // and the completion of this call marks the success of PublishStorageDeals
    // @params - cbor byte array of MarketDealNotifyParams
    function dealNotify(bytes memory params) internal {
        require(
            msg.sender == MARKET_ACTOR_ETH_ADDRESS,
            "msg.sender needs to be market actor f05"
        );

        MarketTypes.MarketDealNotifyParams memory mdnp = MarketCBOR
            .deserializeMarketDealNotifyParams(params);
        MarketTypes.DealProposal memory proposal = MarketCBOR
            .deserializeDealProposal(mdnp.dealProposal);

        pieceDeals[proposal.piece_cid.data] = mdnp.dealId;
        pieceStatus[proposal.piece_cid.data] = Status.DealPublished;

        int64 duration = CommonTypes.ChainEpoch.unwrap(proposal.end_epoch) -
            CommonTypes.ChainEpoch.unwrap(proposal.start_epoch);
        // Expects deal label to be chainId encoded in bytes
        uint256 chainId = abi.decode(proposal.label.data, (uint256));
        DataAttestation memory attest = DataAttestation(
            proposal.piece_cid.data,
            duration,
            mdnp.dealId,
            uint256(Status.DealPublished)
        );
        bytes memory payload = abi.encode(attest);
        if (chainId == block.chainid) {
            IBridgeContract(
                chainIdToDestinationChain[chainId].destinationAddress
            )._execute(
                    chainIdToDestinationChain[chainId].chainName,
                    addressToHexString(address(this)),
                    payload
                );
        } else {
            // If the chainId is not the current chain, we need to call the gateway
            // to forward the message to the correct chain
            call_axelar(
                payload,
                proposal.provider.data,
                AXELAR_GAS_FEE,
                chainId
            );
        }
    }

    function call_axelar(
        bytes memory payload,
        bytes memory providerAddrData,
        uint256 gasTarget,
        uint256 chainId
    ) internal {
        // Calculate gas funds
        uint256 gasFunds = gasTarget;
        if (providerGasFunds[providerAddrData] >= gasTarget) {
            providerGasFunds[providerAddrData] -= gasTarget;
        } else {
            gasFunds = providerGasFunds[providerAddrData];
            providerGasFunds[providerAddrData] = 0;
        }

        // Get destination chain info
        string memory destinationChain = chainIdToDestinationChain[chainId].chainName;
        string memory destinationAddress = addressToHexString(
            chainIdToDestinationChain[chainId].destinationAddress
        );

        // Pay for gas
        gasService.payNativeGasForContractCall{value: gasFunds}(
            address(this),
            destinationChain,
            destinationAddress,
            payload,
            msg.sender
        );

        // Make the cross-chain call
        gateway.callContract(
            destinationChain,
            destinationAddress,
            payload
        );
    }

    function addressToHexString(address addr) internal pure returns (string memory) {
        bytes memory buffer = new bytes(40);
        for(uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(addr)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            buffer[2*i] = char(hi);
            buffer[2*i+1] = char(lo);
        }
        return string(abi.encodePacked("0x", buffer));
    }

    function char(bytes1 b) internal pure returns (bytes1) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    // Base execute functions from previous implementation
    function execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) external {
        bytes32 payloadHash = keccak256(payload);
        if (!gateway.validateContractCall(commandId, sourceChain, sourceAddress, payloadHash)) {
            revert("Invalid contract call");
        }
        _execute(commandId, sourceChain, sourceAddress, payload);
        //emit Executed(commandId, sourceChain, sourceAddress, payload);
    }


    function _execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload) internal {
            //Do Nothing
    }

    function debug_call(
        bytes calldata commp,
        bytes calldata providerAddrData,
        uint256 gasFunds,
        uint256 chainId
    ) public {
        DataAttestation memory attest = DataAttestation(
            commp,
            0,
            42,
            uint256(Status.DealPublished)
        );
        bytes memory payload = abi.encode(attest);
        if (chainId == block.chainid) {
            IBridgeContract(
                chainIdToDestinationChain[chainId].destinationAddress
            )._execute(
                    chainIdToDestinationChain[chainId].chainName,
                    addressToHexString(address(this)),
                    payload
                );
        } else {
            // If the chainId is not the current chain, we need to call the gateway
            // to forward the message to the correct chain
            call_axelar(payload, providerAddrData, gasFunds, chainId);
        }
    }

    // handle_filecoin_method is the universal entry point for any evm based
    // actor for a call coming from a builtin filecoin actor
    // @method - FRC42 method number for the specific method hook
    // @params - CBOR encoded byte array params
    function handle_filecoin_method(
        uint64 method,
        uint64,
        bytes memory params
    ) public returns (uint32, uint64, bytes memory) {
        bytes memory ret;
        uint64 codec;
        // dispatch methods
        if (method == AUTHENTICATE_MESSAGE_METHOD_NUM) {
            // If we haven't reverted, we should return a CBOR true to indicate that verification passed.
            // Always authenticate message
            CBOR.CBORBuffer memory buf = CBOR.create(1);
            buf.writeBool(true);
            ret = buf.data();
            codec = Misc.CBOR_CODEC;
        } else if (method == MARKET_NOTIFY_DEAL_METHOD_NUM) {
            dealNotify(params);
        } else {
            revert("the filecoin method that was called is not handled");
        }
        return (0, codec, ret);
    }

    /**function addressToHexString(
        address _addr
    ) internal pure returns (string memory) {
        return Strings.toHexString(uint256(uint160(_addr)), 20);
    }*/

}
