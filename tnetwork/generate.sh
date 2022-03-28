#!/bin/sh
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
#export PATH=$GOPATH/src/github.com/hyperledger/fabric/build/bin:${PWD}/../bin:${PWD}:$PATH
export PATH=/home/bstudent/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=${PWD} # ~/dev/first-project/network configtx.yaml -> configtxgen


# remove previous crypto material and config transactions
if [ ! -d config ]; then
  mkdir config
fi

rm -fr config/*
rm -fr crypto-config/*

# 1. generate crypto material
cryptogen generate --config=./crypto-config.yaml
if [ "$?" -ne 0 ]; then
  echo "Failed to generate crypto material..."
  exit 1
fi

# 2. generate genesis block for orderer
configtxgen -profile ThreeOrgOrdererGenesis -outputBlock ./config/genesis.block
if [ "$?" -ne 0 ]; then
  echo "Failed to generate orderer genesis block..."
  exit 1
fi

# 3. generate channel configuration transaction
configtxgen -profile TwoOrgChannel1 -outputCreateChannelTx ./config/channel1.tx -channelID channel1
if [ "$?" -ne 0 ]; then
  echo "Failed to generate channel configuration transaction..."
  exit 1
fi

configtxgen -profile TwoOrgChannel2 -outputCreateChannelTx ./config/channel2.tx -channelID channel2

# 4. generate anchor peer transaction
configtxgen -profile TwoOrgChannel1 -outputAnchorPeersUpdate ./config/Org1MSPanchors.tx -channelID channel1 -asOrg Org1MSP
if [ "$?" -ne 0 ]; then
  echo "Failed to generate anchor peer update for Org1MSP..."
  exit 1
fi

configtxgen -profile TwoOrgChannel1 -outputAnchorPeersUpdate ./config/Org3MSPanchors.tx -channelID channel1 -asOrg Org3MSP

configtxgen -profile TwoOrgChannel2 -outputAnchorPeersUpdate ./config/Ch2Org2MSPanchors.tx -channelID channel2 -asOrg Org2MSP
configtxgen -profile TwoOrgChannel2 -outputAnchorPeersUpdate ./config/Ch2Org3MSPanchors.tx -channelID channel2 -asOrg Org3MSP
