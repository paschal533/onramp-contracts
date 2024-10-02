# On Ramp Contracts

Empowering developers to build dApps that write data to the filecoin network


## Installation

1. `forge install`
2. set up gvm and use go 1.22 `gvm install go1.22; gvm use go1.22`
3. download calibnet export `aria2c -x5 https://forest-archive.chainsafe.dev/latest/calibnet` or `wget https://forest-archive.chainsafe.dev/latest/calibnet`
./lotus daemon --remove-existing-chain --halt-after-import --import-snapshot ./forest_snapshot_calibnet_2024-10-01_height_2016336.forest.car.zst    && LOTUS_FEVM_ENABLEETHRPC=true ./lotus daemon


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


9. install fish
11. run fish shell
12. source fish install script: `cd contract-tools; source deploy-onramp.fish`
13. run deploy script `deploy-onramp`



## Shashank notes

https://gist.github.com/lordshashank/fb2fbd53b5520a862bd451e3603b4718

https://github.com/lordshashank/filecoin-deals       
