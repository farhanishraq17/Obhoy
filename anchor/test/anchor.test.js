// Tests for the anchoring contract.
//
// The property under test is the one that is easy to lose: a period, once
// anchored, cannot be re-anchored. If it could, an insurer that restated its
// settlement ratio could restate the commitment to match, and a reader would
// have no way to tell the difference.

const { expect } = require('chai');
const hre = require('hardhat');

describe('ObhoyAnchor', () => {
  let anchor, admin, regulator, academic, stranger;

  beforeEach(async () => {
    [admin, regulator, academic, stranger] = await hre.ethers.getSigners();
    const factory = await hre.ethers.getContractFactory('ObhoyAnchor');
    anchor = await factory.deploy([regulator.address, academic.address]);
    await anchor.waitForDeployment();
  });

  const root = (n) => '0x' + String(n).padStart(64, '0');

  it('anchors a period and reports it back', async () => {
    await anchor.connect(regulator).anchorPeriod('2026Q1-POOL-A', root(1));
    const [merkleRoot, at, by] = await anchor.getAnchor('2026Q1-POOL-A');
    expect(merkleRoot).to.equal(root(1));
    expect(by).to.equal(regulator.address);
    expect(at).to.be.greaterThan(0n);
    expect(await anchor.periodCount()).to.equal(1n);
  });

  it('refuses to re-anchor a period', async () => {
    await anchor.connect(regulator).anchorPeriod('2026Q1-POOL-A', root(1));
    await expect(
      anchor.connect(regulator).anchorPeriod('2026Q1-POOL-A', root(2)),
    ).to.be.revertedWithCustomError(anchor, 'AlreadyAnchored');
  });

  it('refuses an empty root', async () => {
    await expect(
      anchor.connect(regulator).anchorPeriod('2026Q1-POOL-A', root(0)),
    ).to.be.revertedWithCustomError(anchor, 'EmptyRoot');
  });

  it('refuses a caller who is not an anchorer', async () => {
    await expect(
      anchor.connect(stranger).anchorPeriod('2026Q1-POOL-A', root(1)),
    ).to.be.revertedWithCustomError(anchor, 'NotAnchorer');
  });

  it('spreads the permission across more than one party', async () => {
    // Neither of these is the deployer. Anchoring does not depend on any single
    // organisation continuing to cooperate.
    await anchor.connect(regulator).anchorPeriod('2026Q1-POOL-A', root(1));
    await anchor.connect(academic).anchorPeriod('2026Q1-POOL-B', root(2));
    expect(await anchor.periodCount()).to.equal(2n);
  });

  it('verifies a claimed figure and rejects a restated one', async () => {
    await anchor.connect(regulator).anchorPeriod('2026Q1-POOL-A', root(7));
    expect(await anchor.verifyRoot('2026Q1-POOL-A', root(7))).to.equal(true);
    // The tamper case: a restated period no longer matches what was committed.
    expect(await anchor.verifyRoot('2026Q1-POOL-A', root(8))).to.equal(false);
  });

  it('only the admin changes the anchorer set', async () => {
    await expect(
      anchor.connect(stranger).setAnchorer(stranger.address, true),
    ).to.be.revertedWithCustomError(anchor, 'NotAdmin');
    await anchor.connect(admin).setAnchorer(stranger.address, true);
    expect(await anchor.isAnchorer(stranger.address)).to.equal(true);
  });
});
