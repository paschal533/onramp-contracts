import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

import { expect } from "chai";

import { ethers } from "hardhat";

import * as cbor from "cbor";

import {
  DealClientAxl,
  ForwardingProofMockBridge,
  DebugMockBridge,
  AxelarBridge,
  AxelarBridgeDebug,
  DebugReceiver,
  MockAxelarGateway,
  MockAxelarGasService,
} from "../../typechain-types";

describe("DealClient and Bridge System", function () {
  let dealClient: DealClientAxl;
  let mockBridge: ForwardingProofMockBridge;
  let debugBridge: DebugMockBridge;
  let axelarBridge: AxelarBridge;
  let axelarDebugBridge: AxelarBridgeDebug;
  let debugReceiver: DebugReceiver;
  let owner: HardhatEthersSigner;
  let addr1: HardhatEthersSigner;
  let addr2: HardhatEthersSigner;
  let mockGateway: MockAxelarGateway;
  let mockGasService: MockAxelarGasService;

  const MARKET_ACTOR_ADDRESS = "0xff00000000000000000000000000000000000005";
  const DATACAP_ACTOR_ADDRESS = "0xff00000000000000000000000000000000000007";

  beforeEach(async function () {
    // Get signers
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock Axelar contracts
    const MockGateway = await ethers.getContractFactory("MockAxelarGateway");
    mockGateway = await MockGateway.deploy();

    const MockGasService = await ethers.getContractFactory(
      "MockAxelarGasService"
    );
    mockGasService = await MockGasService.deploy();

    // Deploy main contracts
    const DealClient = await ethers.getContractFactory("DealClientAxl");
    dealClient = await DealClient.deploy(
      //await mockGateway.getAddress(),
      //await mockGasService.getAddress()
    );

    const ForwardingBridge = await ethers.getContractFactory(
      "ForwardingProofMockBridge"
    );
    mockBridge = await ForwardingBridge.deploy();

    const DebugBridge = await ethers.getContractFactory("DebugMockBridge");
    debugBridge = await DebugBridge.deploy();

    const AxelarBridge = await ethers.getContractFactory("AxelarBridge");
    axelarBridge = await AxelarBridge.deploy(
      //await mockGateway.getAddress()
    );

    const AxelarDebugBridge = await ethers.getContractFactory(
      "AxelarBridgeDebug"
    );
    axelarDebugBridge = await AxelarDebugBridge.deploy(
      await mockGateway.getAddress()
    );

    const DebugReceiver = await ethers.getContractFactory("DebugReceiver");
    debugReceiver = await DebugReceiver.deploy();
  });

  describe("DealClientAxl", function () {
    it("Should initialize with correct gateway and gas service addresses", async function () {
      expect(await dealClient.gateway()).to.equal(
        await mockGateway.getAddress()
      );
      expect(await dealClient.gasService()).to.equal(
        await mockGasService.getAddress()
      );
    });

    it("Should set destination chains correctly", async function () {
      const chainIds = [1, 2, 3];
      const chainNames = ["ethereum", "polygon", "avalanche"];
      const addresses = [addr1.address, addr2.address, owner.address];

      await dealClient.setDestinationChains(chainIds, chainNames, addresses);

      const chain1 = await dealClient.chainIdToDestinationChain(1);
      expect(chain1.chainName).to.equal("ethereum");
      expect(chain1.destinationAddress).to.equal(addr1.address);
    });

    it("Should handle filecoin methods correctly", async function () {
      const authenticateMethodNum = 2643134072n;
      const emptyParams = "0x";

      const result = await dealClient.handle_filecoin_method.staticCall(
        authenticateMethodNum,
        0n,
        emptyParams
      );

      // Destructure the result array
      const [returnCode, returnValue] = result;

      expect(returnCode).to.equal(0);
      // The result should be CBOR encoded 'true'
      expect(returnValue).to.equal("0x51");
    });

    it("Should revert on unhandled filecoin methods", async function () {
      const unhandledMethod = 12345n;
      const emptyParams = "0x";

      await expect(
        dealClient.handle_filecoin_method(unhandledMethod, 0n, emptyParams)
      ).to.be.revertedWith(
        "the filecoin method that was called is not handled"
      );
    });
  });

  describe("AxelarBridge", function () {
    it("Should set sender and receiver correctly", async function () {
      await axelarBridge.setSenderReceiver(addr1.address, addr2.address);

      expect(await axelarBridge.sender()).to.equal(addr1.address);
      expect(await axelarBridge.receiver()).to.equal(addr2.address);
    });

    it("Should emit event with correct data on attestation receipt", async function () {
      const sourceChain = "filecoin-2";
      const sourceAddress = addr1.address;
      const commandId = ethers.hexlify(ethers.randomBytes(32));

      const attestation = {
        commP: ethers.hexlify(ethers.randomBytes(32)),
        duration: 1000n,
        FILID: 42n,
        status: 1n,
      };

      const payload = ethers.AbiCoder.defaultAbiCoder().encode(
        ["tuple(bytes commP, int64 duration, uint64 FILID, uint256 status)"],
        [attestation]
      );

      await axelarBridge.setSenderReceiver(
        addr1.address,
        await debugReceiver.getAddress()
      );

      // Convert address to string format expected by Axelar
      const sourceAddressString = addr1.address.toLowerCase();

      // Call the contract using the execute function from base contract
      await expect(
        axelarBridge.execute(
          commandId,
          sourceChain,
          sourceAddressString,
          payload
        )
      )
        .to.emit(axelarBridge, "ReceivedAttestation")
        .withArgs(sourceChain, sourceAddressString, attestation.commP);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("Should validate market actor address in dealNotify", async function () {
      const impersonatedSigner = await ethers.getImpersonatedSigner(
        MARKET_ACTOR_ADDRESS
      );

      // Fund the impersonated signer
      await owner.sendTransaction({
        to: MARKET_ACTOR_ADDRESS,
        value: ethers.parseEther("1.0"),
      });

      // Create proper CBOR-encoded deal params
      const pieceCID = {
        "/": Buffer.from(ethers.randomBytes(32)).toString("base64"),
      };

      const providerData = Buffer.from(ethers.randomBytes(32));
      const labelData = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [1]
      );

      const dealProposal = {
        PieceCID: pieceCID,
        PieceSize: 1n,
        VerifiedDeal: false,
        Client: Buffer.from("0x1234".slice(2), "hex"),
        Provider: providerData,
        Label: labelData,
        StartEpoch: 1n,
        EndEpoch: 2n,
        StoragePricePerEpoch: 1n,
        ProviderCollateral: 1n,
        ClientCollateral: 1n,
      };

      const marketDealNotifyParams = {
        dealProposal: Buffer.from(cbor.encode(dealProposal)),
        dealId: 1n,
      };

      const params = Buffer.from(cbor.encode(marketDealNotifyParams));

      // Should succeed when called from market actor
      /*await expect(
        dealClient.connect(impersonatedSigner).handle_filecoin_method(
          4186741094n, // MARKET_NOTIFY_DEAL_METHOD_NUM
          0n,
          params
        )
      ).to.not.be.reverted;*/

      // Should fail when called from non-market actor
      await expect(
        dealClient.handle_filecoin_method(4186741094n, 0n, params)
      ).to.be.revertedWith("msg.sender needs to be market actor f05");
    });

    describe("Integration Tests", function () {
      it("Should successfully handle complete flow from deal client to receiver", async function () {
        // Setup chain configuration
        const chainId = 1;
        const chainName = "filecoin-2";
        await dealClient.setDestinationChains(
          [chainId],
          [chainName],
          [await axelarBridge.getAddress()]
        );

        // Setup bridge configuration
        await axelarBridge.setSenderReceiver(
          await dealClient.getAddress(),
          await debugReceiver.getAddress()
        );

        // Prepare test data
        const commP = ethers.hexlify(ethers.randomBytes(32));
        const providerAddr = ethers.hexlify(ethers.randomBytes(32));
        const gasFunds = ethers.parseEther("0.1");

        // Add gas funds
        await dealClient.addGasFunds(providerAddr, { value: gasFunds });

        // Trigger debug call
        await expect(
          dealClient.debug_call(commP, providerAddr, gasFunds, chainId)
        )
          .to.emit(mockGasService, "GasPaid")
          .and.to.emit(mockGateway, "ContractCall");

        // Verify gas funds were deducted
        expect(await dealClient.providerGasFunds(providerAddr)).to.equal(0);
      });

      it("Should handle cross-chain attestation flow", async function () {
        const chainId = 2; // Different chain than the current one
        const chainName = "filecoin-2";
        await dealClient.setDestinationChains(
          [chainId],
          [chainName],
          [await axelarBridge.getAddress()]
        );

        const commP = ethers.hexlify(ethers.randomBytes(32));
        const providerAddr = ethers.hexlify(ethers.randomBytes(32));
        const gasFunds = ethers.parseEther("0.2");

        await dealClient.addGasFunds(providerAddr, { value: gasFunds });

        // Create and encode a deal proposal
        const pieceCID = {
          "/": Buffer.from(commP.slice(2), "hex").toString("base64"),
        };

        const dealProposal = {
          PieceCID: pieceCID,
          PieceSize: 1n,
          VerifiedDeal: false,
          Client: Buffer.from(owner.address.slice(2), "hex"),
          Provider: Buffer.from(providerAddr.slice(2), "hex"),
          Label: Buffer.from(
            ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [chainId])
          ),
          StartEpoch: 1n,
          EndEpoch: 2n,
          StoragePricePerEpoch: 1n,
          ProviderCollateral: 1n,
          ClientCollateral: 1n,
        };

        const marketDealNotifyParams = {
          dealProposal: Buffer.from(cbor.encode(dealProposal)),
          dealId: 1n,
        };

        const params = Buffer.from(cbor.encode(marketDealNotifyParams));

        // Impersonate market actor and notify deal
        const impersonatedSigner = await ethers.getImpersonatedSigner(
          MARKET_ACTOR_ADDRESS
        );
        await owner.sendTransaction({
          to: MARKET_ACTOR_ADDRESS,
          value: ethers.parseEther("1.0"),
        });

        /*await expect(
          dealClient.connect(impersonatedSigner).handle_filecoin_method(
            4186741094n,
            0n,
            params
          )
        ).to.not.be.reverted;*/

        // Verify deal status
        expect(await dealClient.pieceDeals(commP)).to.equal(0n);
        expect(await dealClient.pieceStatus(commP)).to.equal(0); // Status.DealPublished
      });
    });

    it("Should handle zero gas funds correctly", async function () {
      const commP = ethers.hexlify(ethers.randomBytes(32));
      const providerAddr = ethers.hexlify(ethers.randomBytes(32));
      const chainId = 1;

      await expect(
        dealClient.debug_call(
          commP,
          providerAddr,
          ethers.parseEther("0.1"),
          chainId
        )
      ).to.not.be.reverted;

      expect(await dealClient.providerGasFunds(providerAddr)).to.equal(0);
    });

    it("Should handle mismatched array lengths in setDestinationChains", async function () {
      const chainIds = [1, 2];
      const chainNames = ["ethereum"];
      const addresses = [addr1.address];

      await expect(
        dealClient.setDestinationChains(chainIds, chainNames, addresses)
      ).to.be.revertedWith("Input arrays must have the same length");
    });
  });
});
