var HDWalletProvider = require("truffle-hdwallet-provider");
var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";

module.exports = {
  networks: {
    // adapted from https://knowledge.udacity.com/questions/38069
    // IMPORTANT: run ganache-cli -a 50 to create enough accounts for airlines, passenger, and oracles
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: '*'
    }
    // hdwallet: {
    //   provider: function() {
    //     return new HDWalletProvider(mnemonic, "http://127.0.0.1:8545/", 0, 50);
    //   },
    //   network_id: "*"
    // }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};
