# FlightSurety

<em>Adapted from https://github.com/udacity/FlightSurety</em>

## Prerequisites

- Node v10.7.0 (`nvm install 10.7.0`)
- Ganache CLI v6.12.2 (`npm install -g ganache-cli`) 

Run `npm install` in the project directory to install project dependencies.

## Running The App

- `ganache-cli -a 50`
- `npx truffle migrate --reset && npm run dapp` (WAIT FOR MIGRATIONS TO APPLY BEFORE MOVING ON TO THE NEXT STEP)
- `npm run server`

Go to `localhost:8000` to view the frontend.

## Tests

Run `npx truffle test` after starting ganache with `ganache-cli -a 50`.
