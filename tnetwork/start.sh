#!/bin/bash
#
# Copyright IBM Corp All Rights Reserved
#
# SPDX-License-Identifier: Apache-2.0
#
# Exit on first error, print all commands.
set -ev

# don't rewrite paths for Windows Git Bash users
export MSYS_NO_PATHCONV=1

# generate.sh 가 수행된 다음
export CA1_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/org1.ict.com/ca && ls *_sk)
export CA2_PRIVATE_KEY=$(cd crypto-config/peerOrganizations/org2.ict.com/ca && ls *_sk)

function checkPrereqs() {
    # check config dir
    if [ ! -d "./crypto-config" ]; then
        echo "crypto-config dir missing"
        exit 1
    fi
    # check crypto-config dir
     if [ ! -d "./config" ]; then
        echo "config dir missing"
        exit 1
    fi
}

checkPrereqs

docker-compose -f docker-compose.yml down

docker-compose -f docker-compose.yml up -d orderer.ict.com ca.ict.com ca.org2.ict.com peer0.org1.ict.com peer0.org2.ict.com peer0.org3.ict.com cli 
docker ps -a

# wait for Hyperledger Fabric to start
# incase of errors when running later commands, issue export FABRIC_START_TIMEOUT=<larger number>
export FABRIC_START_TIMEOUT=10
#echo ${FABRIC_START_TIMEOUT}
sleep ${FABRIC_START_TIMEOUT}

# Create the channel
docker exec -e "CORE_PEER_ADDRESS=peer0.org3.ict.com:7051 " -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.ict.com/users/Admin@org3.ict.com/msp" cli peer channel create -o orderer.ict.com:7050 -c channel1 -f /etc/hyperledger/configtx/channel1.tx
sleep 3 

docker exec -e "CORE_PEER_ADDRESS=peer0.org3.ict.com:7051 " -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/org3.ict.com/users/Admin@org3.ict.com/msp" cli peer channel create -o orderer.ict.com:7050 -c channel2 -f /etc/hyperledger/configtx/channel2.tx
sleep 3 

docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.ict.com/msp" peer0.org1.ict.com peer channel join -b /etc/hyperledger/configtx/channel1.block
sleep 3 

docker exec -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org3.ict.com/msp" peer0.org3.ict.com peer channel join -b /etc/hyperledger/configtx/channel1.block
sleep 3 

docker exec -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org2.ict.com/msp" peer0.org2.ict.com peer channel join -b /etc/hyperledger/configtx/channel2.block
sleep 3 

docker exec -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org3.ict.com/msp" peer0.org3.ict.com peer channel join -b /etc/hyperledger/configtx/channel2.block
sleep 3 


# docker exec -e "CORE_PEER_LOCALMSPID=Org1MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org1.ict.com/msp" peer0.org1.ict.com peer channel update -f /etc/hyperledger/configtx/Org1MSPanchors.tx -c mychannel -o orderer.ict.com:7050
# sleep 3 

# docker exec -e "CORE_PEER_LOCALMSPID=Org2MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org2.ict.com/msp" peer0.org2.ict.com peer channel update -f /etc/hyperledger/configtx/Org2MSPanchors.tx -c mychannel -o orderer.ict.com:7050
# sleep 3 

# docker exec -e "CORE_PEER_LOCALMSPID=Org3MSP" -e "CORE_PEER_MSPCONFIGPATH=/etc/hyperledger/msp/users/Admin@org3.ict.com/msp" peer0.org3.ict.com peer channel update -f /etc/hyperledger/configtx/Org3MSPanchors.tx -c mychannel -o orderer.ict.com:7050
# sleep 3 
