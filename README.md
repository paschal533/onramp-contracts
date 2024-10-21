# On Ramp Contracts

Empowering developers to build dApps that write data to the filecoin network


## Installation

1. `forge install`
2. set up gvm and use go 1.22.7 `gvm install go1.22.7; gvm use go1.22.7`
3. download calibnet export `aria2c -x5 https://forest-archive.chainsafe.dev/latest/calibnet -o calibnet.car.zst` or `wget https://forest-archive.chainsafe.dev/latest/calibnet -o calibnet.car.zst`
./lotus daemon --remove-existing-chain --halt-after-import --import-snapshot ./calibnet.car.zst && LOTUS_FEVM_ENABLEETHRPC=true LOTUS_EVENTS_ENABLEACTOREVENTSAPI=true ./lotus daemon


4. build onramp: `cd contract-tools/xchain; go build;`
5. download lotus and boost. if this repo is checked out to `~/dev/snissn/onramp-contracts/` then for the environment variables set in the next step check out boost and lotus in the folder `~/dev/filecoin-project/lotus` and `~/dev/filecoin-project/boost` 
6. build lotus for calibnet `cd ~/dev/filecoin-project/lotus; make calibnet`
7. build boost for calibnet `cd ~/dev/filecoin-project/boost; make calibnet`
8. create xchain keys
    a. install geth http://adam.schmideg.net/go-ethereum/install-and-build/Installing-Geth
    b. geth account new --keystore ~/dev/snissn/onramp-contracts/xchain_key.json
    ? /home/mikers/dev/snissn/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--1d0aa8533534a9da983469bae2de09eb86ee65fa

9. set environment variables



export ONRAMP_CODE_PATH=$(pwd)
export LOTUS_EXEC_PATH=$(pwd)/../../filecoin-project/lotus
export BOOST_EXEC_PATH=$(pwd)/../../filecoin-project/boost
export XCHAIN_KEY_PATH=/home/mikers/dev/snissn/onramp-contracts/xchain_key.json/UTC--2024-10-01T21-31-48.090887441Z--1d0aa8533534a9da983469bae2de09eb86ee65fa
export XCHAIN_PASSPHRASE=password
export XCHAIN_ETH_API="http://127.0.0.1:1234/rpc/v1"
export MINER_ADDRESS=t01013


9. install fish
11. run fish shell
12. source fish install script: `cd contract-tools; source deploy-onramp.fish`
13. run deploy script `deploy-onramp`

This should create a config written to ~/.xchain/config.json

## Running xchain

0. set environment variables like above but change

export XCHAIN_ETH_API="ws://127.0.0.1:1234/rpc/v1"
update xhcain config with ws url


modify xchain config to set TargetAggSize to a value larger than the files you are testing with ie 327680 for 10 files x 32k each


set up car utility
```
go install github.com/ipld/go-car/cmd/car@latest
```

set up stream-commp util
```
go install github.com/filecoin-project/go-fil-commp-hashhash/cmd/stream-commp@latest
```

1. build xchain `./contract-tools/xchain$ go build`
2. run xchain server
3. use xchain client to upload data using one of the test token
```
/onramp-contracts/contract-tools$ ./client.bash screenshot.png 0xaEE9C9E8E4b40665338BD8374D8D473Bd014D1A1 1
```




## Shashank notes

https://gist.github.com/lordshashank/fb2fbd53b5520a862bd451e3603b4718

https://github.com/lordshashank/filecoin-deals       
