import FlightSuretyData from '../../build/contracts/FlightSuretyData.json'
import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
import DOM from './dom';

export default class Contract {
    constructor(network, callback) {

        let config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.owner = null;
        this.airlines = [];
        this.flights = {};
        this.passenger = null;
        this.initialize(callback);
    }

    initialize(callback) {
        this.web3.eth.getAccounts(async (error, accts) => {
           
            this.owner = accts[0];

            let counter = 0;

            while(this.airlines.length < 4) {
                if (!(await this.flightSuretyData.methods.isAirline(accts[counter]).call())) {
                  await this.flightSuretyApp.methods.registerAirline(accts[counter]).send({ from: accts[0] });
                }
                this.airlines.push(accts[counter]);
                counter++;
            }

            const airlineNames = ['FlyRed', 'FlyBlue', 'FlyGreen', 'FlyYellow'] 
            const airlinesDiv = document.querySelector('#airlines')
            for (let i = 0; i < 4; i++) {
              const airlineDiv = document.createElement('div')
              airlineDiv.innerHTML = `${airlineNames[i]} - ${this.airlines[i]}`
              airlinesDiv.appendChild(airlineDiv)
            }

            this.flights = {
              'Flight 1': ['FlyRed', new Date(2022, 7, 5, 10, 0, 0)],
              'Flight 2': ['FlyBlue', new Date(2022, 7, 5, 11, 0, 0)],
              'Flight 3': ['FlyGreen', new Date(2022, 7, 5, 12, 0, 0)],
              'Flight 4': ['FlyYellow', new Date(2022, 7, 5, 13, 0, 0)],
            }
            const flightsDiv = document.querySelector('#flights')
            for (const flight in this.flights) {
              const [airline, datetime] = this.flights[flight];
              const flightDiv = document.createElement('div')
              flightDiv.innerHTML = `${flight} - ${airline} - ${datetime}`
              flightsDiv.appendChild(flightDiv)
            }

            document.querySelector('#fund').addEventListener('click', async event => {
              const airlineName = document.querySelector('#fund-airline-name').value
              const fundValue = document.querySelector('#fund-value').value
              try {
                const index = airlineNames.indexOf(airlineName)
                const airlineAddress = this.airlines[index] || '0x0000000000000000000000000000000000000000'
                await this.flightSuretyData.methods.fund().send({ value: this.web3.utils.toWei(fundValue), from: airlineAddress })
                alert('Transaction Successful!')
              } catch (err) {
                alert(err.message)
              }
              document.querySelector('#fund-airline-name').value = ''
              document.querySelector('#fund-value').value = ''
            })

            this.passenger = accts[counter];

            document.querySelector('#purchase').addEventListener('click', async event => {
              const flightName = document.querySelector('#insurance-flight-name').value
              const insuranceValue = document.querySelector('#insurance-value').value
              try {
                const airlineName = this.flights[flightName][0]
                const timestamp = Math.floor(this.flights[flightName][1] / 1000)
                const index = airlineNames.indexOf(airlineName)
                const airlineAddress = this.airlines[index] || '0x0000000000000000000000000000000000000000'
                await this.flightSuretyData.methods.buy(airlineAddress, flightName, timestamp).send({
                  value: this.web3.utils.toWei(insuranceValue),
                  from: this.passenger,
                  gas: "200000"
                })
                alert('Transaction Successful!')
              } catch (err) {
                alert(err.message)
              }
              document.querySelector('#insurance-flight-name').value = ''
              document.querySelector('#insurance-value').value = ''
            })

            document.querySelector('#fetch').addEventListener('click', async event => {
              const flightName = document.querySelector('#status-flight-name').value
              try {
                const airlineName = this.flights[flightName][0]
                const timestamp = Math.floor(this.flights[flightName][1] / 1000)
                const index = airlineNames.indexOf(airlineName)
                const airlineAddress = this.airlines[index] || '0x0000000000000000000000000000000000000000'
                await this.flightSuretyApp.methods.fetchFlightStatus(airlineAddress, flightName, timestamp).send({
                  from: this.passenger
                })
                alert('Transaction Successful!')
              } catch (err) {
                alert(err.message)
              }
              document.querySelector('#status-flight-name').value = ''
            })

            callback();
        });
    }

    isOperational(callback) {
       let self = this;
       self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

}
