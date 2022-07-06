import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const accounts = [];

const oracles = {}
async function registerOracle(account) {
  await flightSuretyApp.methods.registerOracle().send({
    from: account, 
    value: web3.utils.toWei('1'),
    gas: '6721975'
  })
  oracles[account] = await flightSuretyApp.methods.getMyIndexes().call({
    from: account
  })
}

const statusCodes = []
for (let i = 0; i < 60; i++) {
  statusCodes.push(10 * Math.floor(i / 10))
}

web3.eth.getAccounts().then(accounts => {
  const promises = []
  for (let i = 20; i < 40; i++) {
    promises.push(registerOracle(accounts[i]))
  }
  Promise.all(promises).then(() => {
    flightSuretyApp.events.OracleRequest({
        fromBlock: 0
      }, function (error, event) {
        if (error) console.log(error)
        console.log(event)
        console.log()
        const { index, airline, flight, timestamp } = event.returnValues
        for (const oracle in oracles) {
          const indices = oracles[oracle];
          if (indices.includes(index)) {
            const statusCode = statusCodes[Math.floor(Math.random() * 60)]
            flightSuretyApp.methods.submitOracleResponse(
              index, airline, flight, timestamp, statusCode,
            ).send({ from: oracle })
          }
        }
    });
  })
})

flightSuretyApp.events.OracleReport({
  fromBlock: 0
}, function (error, event) {
  console.log('OracleReport')
  console.log(event.returnValues)
  console.log()
})

flightSuretyApp.events.FlightStatusInfo({
  fromBlock: 0
}, function (error, event) {
  console.log('FlightStatusInfo')
  console.log(event.returnValues)
  console.log()
})

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


