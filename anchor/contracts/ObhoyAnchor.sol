// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title ObhoyAnchor
/// @notice Commits one Merkle root per settlement period to a public chain.
///
/// A consortium can be captured or legally compelled. If the transparency
/// totals live only inside it, it can rewrite them, and the trust proposition
/// collapses. So the permissioned ledger keeps the detail confidential and this
/// contract keeps the summary immutable: confidentiality inside, immutability
/// outside. Neither half works alone.
///
/// What this contract does NOT establish is completeness. Anchoring binds
/// integrity after inclusion: a claim that never reached the Fabric ledger is
/// absent from the tree, and the root commits faithfully to a record missing
/// it. Narrowing that gap is a membership question -- writes come from parties
/// with opposed interests, so omission needs all of them to agree to it -- and
/// no smart contract can help with it.
///
/// There is no token here, fungible or otherwise. Obhoy issues no
/// cryptocurrency and no speculative instrument. All money moves in taka
/// through regulated mobile financial services and banking rails, outside both
/// ledgers. This contract stores 32 bytes per period and nothing else.
contract ObhoyAnchor {
    struct Anchor {
        bytes32 merkleRoot;
        uint64 anchoredAt;
        address anchoredBy;
    }

    /// @dev periodId is a hash of the human-readable period identifier, so the
    ///      contract never has to store or compare strings.
    mapping(bytes32 => Anchor) private _anchors;

    bytes32[] private _periods;

    /// @notice The organisations permitted to anchor. Deliberately a set rather
    ///         than a single owner: the whole design refuses arrangements where
    ///         one party holds the whole record.
    mapping(address => bool) public isAnchorer;

    address public immutable admin;

    event PeriodAnchored(
        bytes32 indexed periodId,
        string periodLabel,
        bytes32 merkleRoot,
        uint64 anchoredAt,
        address indexed anchoredBy
    );
    event AnchorerSet(address indexed account, bool allowed);

    error NotAnchorer(address caller);
    error NotAdmin(address caller);
    error AlreadyAnchored(bytes32 periodId, bytes32 existingRoot);
    error EmptyRoot();
    error UnknownPeriod(bytes32 periodId);

    modifier onlyAnchorer() {
        if (!isAnchorer[msg.sender]) revert NotAnchorer(msg.sender);
        _;
    }

    constructor(address[] memory anchorers) {
        admin = msg.sender;
        isAnchorer[msg.sender] = true;
        emit AnchorerSet(msg.sender, true);
        for (uint256 i = 0; i < anchorers.length; i++) {
            isAnchorer[anchorers[i]] = true;
            emit AnchorerSet(anchorers[i], true);
        }
    }

    function setAnchorer(address account, bool allowed) external {
        if (msg.sender != admin) revert NotAdmin(msg.sender);
        isAnchorer[account] = allowed;
        emit AnchorerSet(account, allowed);
    }

    /// @notice Commit a period's root.
    /// @dev The absence of any update path is the entire point. If a period
    ///      could be re-anchored, an insurer that restated its settlement ratio
    ///      could restate the commitment to match, and a reader would have no
    ///      way to tell. A mistake is corrected by anchoring a NEW period that
    ///      supersedes the old one, in public, where the supersession is itself
    ///      part of the record.
    function anchorPeriod(string calldata periodLabel, bytes32 merkleRoot)
        external
        onlyAnchorer
        returns (bytes32 periodId)
    {
        if (merkleRoot == bytes32(0)) revert EmptyRoot();
        periodId = keccak256(bytes(periodLabel));

        Anchor storage existing = _anchors[periodId];
        if (existing.merkleRoot != bytes32(0)) {
            revert AlreadyAnchored(periodId, existing.merkleRoot);
        }

        _anchors[periodId] = Anchor({
            merkleRoot: merkleRoot,
            anchoredAt: uint64(block.timestamp),
            anchoredBy: msg.sender
        });
        _periods.push(periodId);

        emit PeriodAnchored(periodId, periodLabel, merkleRoot, uint64(block.timestamp), msg.sender);
    }

    function getAnchor(string calldata periodLabel)
        external
        view
        returns (bytes32 merkleRoot, uint64 anchoredAt, address anchoredBy)
    {
        bytes32 periodId = keccak256(bytes(periodLabel));
        Anchor storage a = _anchors[periodId];
        if (a.merkleRoot == bytes32(0)) revert UnknownPeriod(periodId);
        return (a.merkleRoot, a.anchoredAt, a.anchoredBy);
    }

    /// @notice Check a claimed root against what was committed.
    /// @dev This is what a journalist or a prospective policyholder calls. It
    ///      answers one question -- "is the number I am being shown the number
    ///      that was committed at the time?" -- without trusting the consortium,
    ///      the insurer, or the API that served the figure.
    function verifyRoot(string calldata periodLabel, bytes32 claimedRoot) external view returns (bool) {
        return _anchors[keccak256(bytes(periodLabel))].merkleRoot == claimedRoot;
    }

    function periodCount() external view returns (uint256) {
        return _periods.length;
    }

    function periodIdAt(uint256 index) external view returns (bytes32) {
        return _periods[index];
    }
}
