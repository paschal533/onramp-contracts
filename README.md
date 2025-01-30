<h1 align="center">
  Onramp Contracts
</h1>

 A cross-chain data bridge solution that enables developers to store data from any blockchain onto the Filecoin network.

## 📚 Table of Contents
- [Overview](#overview)
  - [What is a Cross-Chain Data Bridge?](#what-is-a-cross-chain-data-bridge)
  - [What are Onramp Contracts?](#what-are-onramp-contracts)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation Steps](#installation-steps)
- [Contract Deployment](#contract-deployment)
- [Setting up xChain Client](#setting-up-xchain-client)
- [Usage](#usage)
- [Additional Resources](#additional-resources)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

### What is a Cross-Chain Data Bridge?
A cross-chain data bridge allows applications on one blockchain (source chain) to interact with and store data on another blockchain (destination chain). In the context of Onramp Contracts, this means enabling any blockchain to leverage Filecoin's decentralized storage capabilities.

### What are Onramp Contracts?
Onramp Contracts is a framework that enables developers to build decentralized applications (dApps) that can write data from different blockchains to the Filecoin network. It consists of:
- Smart contracts deployed on both source and destination chains
- A cross-chain messaging system powered by Axelar
- Client tools for managing data uploads and deal-making

## Architecture

The system works through three main components:
1. **Source Chain Contracts**: Handle data submission and cross-chain message initiation
   - OnRampContract: Manages data submissions and payment
   - AxelarBridge: Handles cross-chain communication
2. **Destination Chain Contract (Filecoin)**:
   - DealClientAxl: Processes storage deals and manages data verification
3. **xChain Client**: Coordinates the data transfer and deal-making process

Overall, contracts should be deployed on the source chain and Filecoin are listed as below.
- Source Chain
    - OnRampContract from `Onramp.sol`
    - AxelarBridge from `Oracle.sol`
- Filecoin
    - DealClientAxl from `Prover-Axelar.sol`

## Getting Started

### Prerequisites
- Node.js and npm installed
- Go 1.22.7 or later
- Geth
- Access to test tokens for your chosen source chain
- Test FIL for Filecoin Calibration network

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/FIL-Builders/onramp-contracts.git
cd onramp-contracts
npm install --force
```

2. Set up environment:
Re-name `.env.example` to `.env` and add the private key of the deployer wallet.
```bash
cp .env.example .env
```
Add your deployer wallet's private key to `.env`

3. Make sure the chain configs are correct in `hardhat.config.ts`. If the your desired chain config is missing, you will need to add it in the `hardhat.config.ts`.

### Contract Deployment

1. Compile smart contracts:
```bash
npx hardhat compile
```

2. Deploy to Filecoin Calibration network:
```bash
npx hardhat deploy --tags Filecoin --network calibration
```

3. Deploy to your source chain (example using Linea):
```bash
npx hardhat deploy --tags SourceChain --network linea
```

4. Configure `.env` with deployed contract addresses:
```
DEPLOYER_PRIVATE_KEY=
PROVER_CONTRACT_ADDRESS_DEST_CHAIN=
ONRAMP_CONTRACT_ADDRESS_SRC_CHAIN=
ORACLE_CONTRACT_ADDRESS_SRC_CHAIN=
```

5. Configure cross-chain communication:
```bash
# Configure Filecoin side
npx hardhat run scripts/3_config_Filecoin.ts --network calibration

# Configure source chain side
npx hardhat run scripts/4_config_Srcchain.ts --network linea
```

### Setting up xChain Client
1. Install Forge dependencies:
```bash
forge install
```

2. Set up Go environment:
```bash
gvm install go1.22.7
gvm use go1.22.7
```

3. Build xChain client:
```bash
cd contract-tools/xchain
go build
```

4. Create xChain keys using Geth:
```bash
geth account new --keystore ~/path/to/project/xchain_key.json
```

5. Configure environment variables:
```bash
export ONRAMP_CODE_PATH=$(pwd)
export LOTUS_EXEC_PATH=$(pwd)/../../filecoin-project/lotus
export BOOST_EXEC_PATH=$(pwd)/../../filecoin-project/boost
export XCHAIN_KEY_PATH=/path/to/your/key.json
export XCHAIN_PASSPHRASE=your_passphrase
export XCHAIN_ETH_API="ws://127.0.0.1:1234/rpc/v1"
export MINER_ADDRESS=t01013
```

This should create a config written to ~/.xchain/config.json

### Running xchain

set environment variables like above but change
```
export XCHAIN_ETH_API="ws://127.0.0.1:1234/rpc/v1"
update xhcain config with ws url
```

modify xchain config to set TargetAggSize to a value larger than the files you are testing with ie 327680 for 10 files x 32k each

6. Install required utilities:
```bash
go install github.com/ipld/go-car/cmd/car@latest
go install github.com/filecoin-project/go-fil-commp-hashhash/cmd/stream-commp@latest
```

## Usage

1. build the xChain server and run the server:
```bash
./contract-tools/xchain$ go build

xchain server
```

2. Upload data using the client tool:
```bash
./contract-tools/client.bash <file> <token_address> <token_id>
```

## Additional Resources

- [Demo Application Repository](https://github.com/FIL-Builders/onrampDemo)
- [xChain Client Documentation](https://docs.xchainjs.org/xchain-client/)

## Project Structure

```
 
OnRamp-Contracts/
├── contract-tools
|   │── xchain
|   │── client.bash
|   │── deploy-onramp.fish
|   │── easy-host.bash
|   │── rand-files.bash
├── contracts
|   │── destChain
|   │── sorceChain
|   │── testHelperContracts
|   │── Cid.sol
|   │── Const.sol
|   │── Token.sol
│── deploy
│── lib
│── test
│── .env.example
│── README.md
│── package.json
└── ...
├── LICENSE
├── package.json
├── README.md
└── ...
```


## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## Shashank notes

https://gist.github.com/lordshashank/fb2fbd53b5520a862bd451e3603b4718

https://github.com/lordshashank/filecoin-deals 