package contracts

import (
	"encoding/json"
	"fmt"
	"sort"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/model"
)

// TransparencyLedger publishes what an insurer would otherwise be trusted to
// self-report: written premium, claims received, settled and denied with
// reasons, mean settlement time and reserve position, per pool per period.
//
// This is the mechanism that attacks the fourth failure directly. A buyer can
// check an insurer's behaviour before buying and a regulator can check it
// continuously, because the totals are derived from ledger state rather than
// declared, and because the period, once closed, is anchored outside the
// consortium's control.
type TransparencyLedger struct {
	contractapi.Contract
}

// OpenPeriod starts a reporting period for a pool. Accruals land on whichever
// period is current for that pool, so the totals cannot be reassigned later.
func (c *TransparencyLedger) OpenPeriod(ctx contractapi.TransactionContextInterface, periodID, poolID string) error {
	if _, _, err := requireClass(ctx, model.ClassOversight, model.ClassInsurer); err != nil {
		return err
	}
	var existing model.Period
	found, err := getJSON(ctx, model.ObjPeriod, []string{periodID}, &existing)
	if err != nil {
		return err
	}
	if found {
		return fmt.Errorf("period %s already exists", periodID)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	p := model.Period{
		PeriodID: periodID, PoolID: poolID, OpenedTS: now,
		DenialReasons: map[string]int64{},
	}
	if err := putJSON(ctx, model.ObjPeriod, []string{periodID}, p); err != nil {
		return err
	}
	if err := putRaw(ctx, model.ObjPeriodCurrent, []string{poolID}, periodID); err != nil {
		return err
	}
	return emit(ctx, "PeriodOpened", p)
}

func (c *TransparencyLedger) currentPeriod(ctx contractapi.TransactionContextInterface, poolID string) (*model.Period, error) {
	periodID, err := getRaw(ctx, model.ObjPeriodCurrent, []string{poolID})
	if err != nil {
		return nil, err
	}
	if periodID == "" {
		return nil, nil // no open period: accrual is silently skipped, not an error
	}
	var p model.Period
	found, err := getJSON(ctx, model.ObjPeriod, []string{periodID}, &p)
	if err != nil || !found {
		return nil, err
	}
	if p.Closed {
		return nil, nil
	}
	return &p, nil
}

func (c *TransparencyLedger) save(ctx contractapi.TransactionContextInterface, p *model.Period) error {
	return putJSON(ctx, model.ObjPeriod, []string{p.PeriodID}, p)
}

// accrueReceived, accrueSettled and accrueDenied are called from
// ClaimSettlement, not by clients. The totals are a by-product of the claim
// path rather than a report somebody remembers to file, which is the whole
// difference between this and self-declaration.
func (c *TransparencyLedger) accrueReceived(ctx contractapi.TransactionContextInterface, poolID string) error {
	p, err := c.currentPeriod(ctx, poolID)
	if err != nil || p == nil {
		return err
	}
	p.ClaimsReceived++
	return c.save(ctx, p)
}

func (c *TransparencyLedger) accrueSettled(ctx contractapi.TransactionContextInterface, poolID string, amount, openTS, settledTS int64) error {
	p, err := c.currentPeriod(ctx, poolID)
	if err != nil || p == nil {
		return err
	}
	p.ClaimsSettled++
	p.AmountSettled += amount
	if settledTS > openTS {
		p.TotalSettlementSecs += settledTS - openTS
	}
	if p.ClaimsSettled > 0 {
		p.MeanSettlementSeconds = p.TotalSettlementSecs / p.ClaimsSettled
	}
	return c.save(ctx, p)
}

func (c *TransparencyLedger) accrueDenied(ctx contractapi.TransactionContextInterface, poolID, denialCode string) error {
	p, err := c.currentPeriod(ctx, poolID)
	if err != nil || p == nil {
		return err
	}
	p.ClaimsDenied++
	if p.DenialReasons == nil {
		p.DenialReasons = map[string]int64{}
	}
	p.DenialReasons[denialCode]++
	return c.save(ctx, p)
}

// RecordPremium and SetReserve are the two figures that cannot be derived from
// the claim path. They are declared by the insurer -- and, unlike today, they
// are declared into an append-only record that is anchored publicly, so a
// restatement is visible as a restatement.
func (c *TransparencyLedger) RecordPremium(ctx contractapi.TransactionContextInterface, poolID string, amount int64) error {
	if _, _, err := requireClass(ctx, model.ClassInsurer); err != nil {
		return err
	}
	p, err := c.currentPeriod(ctx, poolID)
	if err != nil {
		return err
	}
	if p == nil {
		return fmt.Errorf("no open period for pool %s", poolID)
	}
	p.WrittenPremium += amount
	return c.save(ctx, p)
}

// SetReserve records the reserve position for the pool.
func (c *TransparencyLedger) SetReserve(ctx contractapi.TransactionContextInterface, poolID string, amount int64) error {
	if _, _, err := requireClass(ctx, model.ClassInsurer); err != nil {
		return err
	}
	p, err := c.currentPeriod(ctx, poolID)
	if err != nil {
		return err
	}
	if p == nil {
		return fmt.Errorf("no open period for pool %s", poolID)
	}
	p.ReservePosition = amount
	return c.save(ctx, p)
}

// periodLeaves builds the leaf set in a fixed order. Order is part of the
// commitment: a verifier reconstructing the tree from the published figures
// must arrive at the same root, so the ordering may never depend on map
// iteration.
func periodLeaves(p *model.Period, m *Metrics) []string {
	leaves := []string{
		model.PeriodLeaf("writtenPremium", p.WrittenPremium),
		model.PeriodLeaf("claimsReceived", p.ClaimsReceived),
		model.PeriodLeaf("claimsSettled", p.ClaimsSettled),
		model.PeriodLeaf("claimsDenied", p.ClaimsDenied),
		model.PeriodLeaf("amountSettled", p.AmountSettled),
		model.PeriodLeaf("meanSettlementSeconds", p.MeanSettlementSeconds),
		model.PeriodLeaf("reservePosition", p.ReservePosition),
		model.PeriodLeaf("nakamotoCoefficient", int64(m.NakamotoCoefficient)),
		model.PeriodLeaf("giniBp", int64(m.Gini*10000+0.5)),
	}
	codes := make([]string, 0, len(p.DenialReasons))
	for code := range p.DenialReasons {
		codes = append(codes, code)
	}
	sort.Strings(codes)
	for _, code := range codes {
		leaves = append(leaves, model.PeriodLeaf("denial:"+code, p.DenialReasons[code]))
	}
	return leaves
}

// ClosePeriod freezes the totals and commits to them with a Merkle root.
//
// The governance metrics are recomputed and folded into the same tree, because
// both bind: a period's published claims ratio and the concentration of the
// authority that produced it are committed to together or not at all.
func (c *TransparencyLedger) ClosePeriod(ctx contractapi.TransactionContextInterface, periodID string) (string, error) {
	if _, _, err := requireClass(ctx, model.ClassOversight, model.ClassInsurer); err != nil {
		return "", err
	}
	p, err := c.GetPeriod(ctx, periodID)
	if err != nil {
		return "", err
	}
	if p.Closed {
		return "", fmt.Errorf("period %s is already closed; totals are not restated in place", periodID)
	}
	gc := &GovernanceCouncil{}
	metrics, err := gc.GetMetrics(ctx)
	if err != nil {
		return "", err
	}
	now, err := txTime(ctx)
	if err != nil {
		return "", err
	}
	p.NakamotoCoefficient = metrics.NakamotoCoefficient
	p.Gini = metrics.Gini
	p.Leaves = periodLeaves(p, metrics)
	root, err := model.MerkleRoot(p.Leaves)
	if err != nil {
		return "", err
	}
	p.MerkleRoot = root
	p.Closed = true
	p.ClosedTS = now
	if err := c.save(ctx, p); err != nil {
		return "", err
	}
	if err := emit(ctx, "PeriodClosed", map[string]interface{}{
		"periodId": periodID, "poolId": p.PoolID, "merkleRoot": root, "leafCount": len(p.Leaves),
	}); err != nil {
		return "", err
	}
	return root, nil
}

// RecordAnchor writes back the public-chain transaction that committed this
// period's root.
//
// Anchoring binds integrity after inclusion, not completeness. A claim that
// never reached the ledger is absent from the tree, and the root commits
// faithfully to a record missing it. What it does prevent is the one thing an
// insurer can otherwise always do: quietly restate a period that has already
// been published.
func (c *TransparencyLedger) RecordAnchor(ctx contractapi.TransactionContextInterface, periodID, chain, txHash string, blockNumber int64) error {
	if _, _, err := requireClass(ctx, model.ClassOversight, model.ClassInsurer); err != nil {
		return err
	}
	p, err := c.GetPeriod(ctx, periodID)
	if err != nil {
		return err
	}
	if !p.Closed {
		return fmt.Errorf("period %s is still open; there is nothing settled to anchor", periodID)
	}
	if p.Anchor != nil {
		return fmt.Errorf("period %s is already anchored at %s/%s", periodID, p.Anchor.Chain, p.Anchor.TxHash)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	p.Anchor = &model.Anchor{
		Chain: chain, TxHash: txHash, BlockNumber: blockNumber, AnchoredTS: now, Root: p.MerkleRoot,
	}
	if err := c.save(ctx, p); err != nil {
		return err
	}
	return emit(ctx, "PeriodAnchored", p.Anchor)
}

// --------------------------------------------------------------------- reads

// GetPeriod returns one period's totals.
func (c *TransparencyLedger) GetPeriod(ctx contractapi.TransactionContextInterface, periodID string) (*model.Period, error) {
	var p model.Period
	found, err := getJSON(ctx, model.ObjPeriod, []string{periodID}, &p)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("period", periodID)
	}
	return &p, nil
}

// ListPeriods returns every period. This is the public explorer's data source
// and it needs no credential.
func (c *TransparencyLedger) ListPeriods(ctx contractapi.TransactionContextInterface) ([]model.Period, error) {
	out := []model.Period{}
	err := listByPartial(ctx, model.ObjPeriod, []string{}, func(raw []byte) error {
		var p model.Period
		if err := jsonUnmarshal(raw, &p); err != nil {
			return err
		}
		out = append(out, p)
		return nil
	})
	sort.Slice(out, func(i, j int) bool { return out[i].PeriodID < out[j].PeriodID })
	return out, err
}

// LeafProof is what a member of the public gets to check one published figure.
type LeafProof struct {
	Name  string            `json:"name"`
	Value int64             `json:"value"`
	Leaf  string            `json:"leaf"`
	Index int               `json:"index"`
	Proof []model.ProofStep `json:"proof"`
	Root  string            `json:"root"`
}

// GetLeafProof returns the inclusion proof for one published figure, so a
// journalist or prospective policyholder can check a claims-paid ratio against
// what was committed at the time -- without trusting this API, the consortium,
// or the insurer.
func (c *TransparencyLedger) GetLeafProof(ctx contractapi.TransactionContextInterface, periodID, name string, value int64) (*LeafProof, error) {
	p, err := c.GetPeriod(ctx, periodID)
	if err != nil {
		return nil, err
	}
	if !p.Closed {
		return nil, fmt.Errorf("period %s is not closed and has no committed root", periodID)
	}
	leaf := model.PeriodLeaf(name, value)
	index := -1
	for i, l := range p.Leaves {
		if l == leaf {
			index = i
			break
		}
	}
	if index < 0 {
		return nil, fmt.Errorf("no leaf for %s=%d in period %s; the published figure does not match the commitment", name, value, periodID)
	}
	proof, err := model.MerkleProof(p.Leaves, index)
	if err != nil {
		return nil, err
	}
	return &LeafProof{Name: name, Value: value, Leaf: leaf, Index: index, Proof: proof, Root: p.MerkleRoot}, nil
}

// VerifyLeaf checks a proof against a period's committed root. It is on-chain
// so the verification itself is not something the operator can quietly change.
func (c *TransparencyLedger) VerifyLeaf(ctx contractapi.TransactionContextInterface, periodID, leaf, proofJSON string) (bool, error) {
	p, err := c.GetPeriod(ctx, periodID)
	if err != nil {
		return false, err
	}
	var steps []model.ProofStep
	if err := json.Unmarshal([]byte(proofJSON), &steps); err != nil {
		return false, fmt.Errorf("proof must be a JSON array of {hash, left}: %w", err)
	}
	return model.VerifyMerkleProof(leaf, steps, p.MerkleRoot), nil
}
