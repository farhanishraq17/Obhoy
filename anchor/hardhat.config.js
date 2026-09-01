// Two networks, on purpose.
//
//   localhost  a Hardhat node on this machine. Always works, needs no funds,
//              no faucet and no internet. This is the path the demonstration
//              takes, because a demonstration that depends on a testnet faucet
//              having tokens on the day is a demonstration that will fail.
//
//   amoy       Polygon's public testnet. This is the one that produces a
//              clickable block-explorer link, which is worth having and is not
//              worth depending on.
//
// Same contract, same script, chain chosen by flag.

require('@nomicfoundation/hardhat-toolbox');

const AMOY_RPC = process.env.AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology';
const PRIVATE_KEY = process.env.ANCHOR_PRIVATE_KEY || '';

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    hardhat: {},
    localhost: { url: 'http://127.0.0.1:8545' },
    amoy: {
      url: AMOY_RPC,
      chainId: 80002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};
