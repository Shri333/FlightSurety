pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    uint private constant MIN_AIRLINE_COUNT = 4; // min # of airlines in order to use mp-consensus for registering new airlines

    struct Airline {
        bool isRegistered;
        bool canParticipate;
        uint fundingAmount;
        uint consensusCount;
        mapping(address => bool) consensusAirlines; // used to prevent double-voting by the same airline
    }

    mapping(address => Airline) private airlines;
    uint private airlineCount;

    address[] private passengers;
    mapping(address => bool) private isPassenger;
    mapping(address => mapping(bytes32 => uint)) private insurance;
    mapping(address => uint) private balance;

    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        airlines[msg.sender] = Airline(true, true, 0, 0);
        airlineCount = 1;
        passengers = new address[](0);
        isPassenger[msg.sender] = true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the given sender to be a registered airline.
    */
    modifier requireIsRegistered(address sender)
    {
        require(airlines[sender].isRegistered, "You must be a registered airline");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            public 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external
                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address sender,
                                address airlineAddress
                            )
                            external
                            requireIsOperational
                            requireIsRegistered(sender)
                            returns (bool, uint)
    {
        require(airlines[sender].canParticipate, "Airlines must fund at least 10 ETH to participate");
        require(!airlines[airlineAddress].isRegistered, "Airlines cannot register an already registered airline");
        require(msg.sender != airlineAddress, "Airlines cannot register themselves");

        if (airlineCount < MIN_AIRLINE_COUNT) {
            airlines[airlineAddress] = Airline(true, false, 0, 0);
            airlineCount = airlineCount.add(1);
            return (true, 0);
        }

        Airline storage airline = airlines[airlineAddress];
        require(!airline.consensusAirlines[sender], "Airlines cannot double-vote to register an airline");

        airline.consensusAirlines[sender] = true;
        airline.consensusCount = airline.consensusCount.add(1);
        if (airline.consensusCount >= airlineCount.div(2)) {
            airline.isRegistered = true;
            airlineCount = airlineCount.add(1);
            return (true, airline.consensusCount);
        }

        return (false, airline.consensusCount);
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (
                                address airline,
                                string flight,
                                uint timestamp
                            )
                            external
                            payable
                            requireIsOperational
    {
        require(!airlines[msg.sender].isRegistered, "Airlines cannot purchase insurance");
        bytes32 key = getFlightKey(airline, flight, timestamp);
        uint total = insurance[msg.sender][key].add(msg.value);
        require(total <= 1 ether, "You cannot purchase more than 1 ETH of insurance for a flight");

        insurance[msg.sender][key] = insurance[msg.sender][key].add(msg.value);
        if (!isPassenger[msg.sender]) {
            isPassenger[msg.sender] = true;
            passengers.push(msg.sender);
        }
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address airline,
                                    string flight,
                                    uint timestamp
                                )
                                external
                                requireIsOperational
                                requireContractOwner
    {
        bytes32 key = getFlightKey(airline, flight, timestamp);
        for (uint i = 0; i < passengers.length; i++) {
            address passenger = passengers[i];
            if (insurance[passenger][key] > 0) {
                uint credit = insurance[passenger][key];
                insurance[passenger][key] = 0;
                balance[passenger] = balance[passenger].add(credit);
            }
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                            )
                            external
    {
        require(balance[msg.sender] > 0, "You do not have any payouts to claim");
        uint payout = balance[msg.sender];
        balance[msg.sender] = 0;
        msg.sender.transfer(payout);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                            )
                            public
                            payable
                            requireIsRegistered(msg.sender)
    {
        Airline storage airline = airlines[msg.sender];
        airline.fundingAmount = airline.fundingAmount.add(msg.value);
        if (airline.fundingAmount >= 10 ether) {
            airline.canParticipate = true;
        }
    }

    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    function isAirline
                      (
                          address airlineAddress
                      )
                      external
                      view
                      returns (bool)
    {
        return airlines[airlineAddress].isRegistered;
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund();
    }

}
