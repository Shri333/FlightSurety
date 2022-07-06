var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    // await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSurety.setTestingMode(true);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });

  it('until there are at least 4 airlines registered, only existing airlines can register new airlines', async () => {
    await config.flightSuretyApp.registerAirline(accounts[1]);
    await config.flightSuretyData.fund({ value: web3.utils.toWei('10'), from: accounts[1] });

    await config.flightSuretyApp.registerAirline(accounts[2], { from: accounts[1] });
    await config.flightSuretyData.fund({ value: web3.utils.toWei('10'), from: accounts[2] });

    await config.flightSuretyApp.registerAirline(accounts[3], { from: accounts[2] });
    await config.flightSuretyData.fund({ value: web3.utils.toWei('10'), from: accounts[3] });

    await config.flightSuretyApp.registerAirline(accounts[4], { from: accounts[3] });
    assert.isFalse(await config.flightSuretyData.isAirline(accounts[4]));
  });

  it('mp-consensus is required for registering 5th and subsequent flights', async () => {
    // at least 2 unique voters are required because the # of current registered airlines is 4
    // accounts[3] has already cast its vote for accounts[4], so double-voting should not work
    try {
      await config.flightSuretyApp.registerAirline(accounts[4], { from: accounts[3] });
      assert.fail();
    } catch (e) {
      assert.equal(e.reason, 'Airlines cannot double-vote to register an airline');
    }
    assert.isFalse(await config.flightSuretyData.isAirline(accounts[4]));

    await config.flightSuretyApp.registerAirline(accounts[4], { from: accounts[2] });
    assert.isTrue(await config.flightSuretyData.isAirline(accounts[4]));
  });

  it('airline cannot participate in contract until it submits funding of at least 10 ETH', async () => {
    try {
      await config.flightSuretyApp.registerAirline(accounts[5], { from: accounts[4] });
      assert.fail();
    } catch (e) {
      assert.equal(e.reason, 'Airlines must fund at least 10 ETH to participate');
    }

    await config.flightSuretyData.fund({ value: web3.utils.toWei('10'), from: accounts[4] });
    await config.flightSuretyApp.registerAirline(accounts[5], { from: accounts[4] }); // should not throw
  })
});
