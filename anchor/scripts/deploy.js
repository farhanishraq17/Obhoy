// Deploy ObhoyAnchor.
//
//   npx hardhat run scripts/deploy.js --network localhost
//
// The anchorer set is deliberately more than one address. The regulator and the
// academic auditor both hold the permission, so anchoring does not depend on
// any single party continuing to cooperate -- which is the same reason the
// ordering service is spread across institutional classes.

const hre = require('hardhat');

async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  // On a local chain there are plenty of accounts; on a testnet there is one,
  // and the extra anchorers are added later with setAnchorer.
  const extra = signers.slice(1, 3).map((s) => s.address);

  console.log(`\nDeploying ObhoyAnchor to ${hre.network.name}`);
  console.log(`  deployer  ${deployer.address}`);
  if (extra.length) console.log(`  anchorers ${extra.join(', ')}`);

  const factory = await hre.ethers.getContractFactory('ObhoyAnchor');
  const anchor = await factory.deploy(extra);
  await anchor.waitForDeployment();
  const address = await anchor.getAddress();

  console.log(`\n  ObhoyAnchor deployed at ${address}`);
  if (hre.network.name === 'amoy') {
    console.log(`  explorer https://amoy.polygonscan.com/address/${address}`);
  }
  console.log(`\n  export OBHOY_ANCHOR_ADDRESS=${address}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
