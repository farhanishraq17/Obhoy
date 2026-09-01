package contracts

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/model"
)

// Governance caps. These bind rather than describe: a new member class is
// admitted only if admission keeps the Nakamoto Coefficient at 3 or above and
// the Gini at or below 0.20, with no class above 0.30.
//
// Both measure concentration of FORMAL authority, not independence of
// incentives. Classes can be constitutionally separate and still align
// commercially. This is a floor on dispersion, not proof against capture.
const (
	MaxClassWeightBP  = 3000 // 0.30, in basis points
	MinNakamoto       = 3
	MaxGiniBP         = 2000 // 0.20
	SupermajorityBP   = 6667 // two thirds
)

// GovernanceCouncil holds the council's own votes -- charter amendments,
// upgrade approval, member admission and off-boarding.
//
// It does NOT govern Fabric transaction validation. Block validation runs on
// the OutOf(2, ...) endorsement policy and Raft ordering, which no weight table
// alters. Conflating the two is the most common way a consortium design is
// misread, so the two live in different places here as well as in the paper.
type GovernanceCouncil struct {
	contractapi.Contract
}

// Metrics is the measured decentralisation of a weight distribution.
type Metrics struct {
	NakamotoCoefficient int     `json:"nakamotoCoefficient"`
	Gini                float64 `json:"gini"`
	MaxClassWeight      float64 `json:"maxClassWeight"`
	TotalWeight         float64 `json:"totalWeight"`
	ClassCount          int     `json:"classCount"`
}

// ComputeMetrics is a pure function so the tests, the dashboards and the
// admission gate all agree by construction.
//
// Weights arrive in basis points to keep the arithmetic integral: two endorsing
// peers computing a float sum in different orders would produce different write
// sets, and the transaction would fail validation for no good reason.
//
//	Nakamoto Coefficient: the smallest number of classes whose combined weight
//	exceeds one half. With 0.30/0.20/0.20/0.15/0.15 the sorted cumulative runs
//	0.30 -> 0.50 -> 0.70, so two classes cannot reach a majority and three can.
//
//	Gini: G = sum_i sum_j |w_i - w_j| / (2 n^2 wbar), where 0 is perfect
//	equality. The same weights give 1.40/10 = 0.14.
func ComputeMetrics(weightsBP []int64) Metrics {
	n := len(weightsBP)
	if n == 0 {
		return Metrics{}
	}
	sorted := append([]int64(nil), weightsBP...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] > sorted[j] })

	var total int64
	for _, w := range sorted {
		total += w
	}

	nc := 0
	var cum int64
	for _, w := range sorted {
		cum += w
		nc++
		if cum*2 > total {
			break
		}
	}

	var absSum int64
	for _, a := range weightsBP {
		for _, b := range weightsBP {
			d := a - b
			if d < 0 {
				d = -d
			}
			absSum += d
		}
	}
	// G = absSum / (2 * n^2 * mean), and mean = total / n, so the denominator
	// is 2 * n * total. Computed once, in one place, with no partial sums.
	var gini float64
	if total > 0 {
		gini = float64(absSum) / float64(2*int64(n)*total)
	}
	return Metrics{
		NakamotoCoefficient: nc,
		Gini:                math.Round(gini*10000) / 10000,
		MaxClassWeight:      float64(sorted[0]) / 10000,
		TotalWeight:         float64(total) / 10000,
		ClassCount:          n,
	}
}

// weightSpec is the payload of an admission proposal: the complete new weight
// vector, not a delta. Admitting a class changes everyone's share, so a
// proposal that named only the newcomer would be unauditable.
type weightSpec struct {
	Class    string `json:"class"`
	MSP      string `json:"msp"`
	WeightBP int64  `json:"weightBp"`
}

// SeedCouncil installs the founding weight table. It runs once, at network
// bootstrap, and refuses a distribution that would not satisfy the caps it is
// meant to enforce.
func (c *GovernanceCouncil) SeedCouncil(ctx contractapi.TransactionContextInterface, specJSON string) error {
	if _, _, err := requireClass(ctx, model.ClassOversight); err != nil {
		return err
	}
	existing, err := c.ListMembers(ctx)
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return fmt.Errorf("council is already seeded; use a proposal to change membership")
	}
	var specs []weightSpec
	if err := json.Unmarshal([]byte(specJSON), &specs); err != nil {
		return fmt.Errorf("spec must be a JSON array of {class, msp, weightBp}: %w", err)
	}
	if err := validateDistribution(specs); err != nil {
		return err
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	for _, s := range specs {
		m := model.CouncilMember{
			MemberID: s.Class, Class: s.Class, MSP: s.MSP,
			Weight: float64(s.WeightBP) / 10000, State: model.MemberActive, AdmittedTS: now,
		}
		if err := putJSON(ctx, model.ObjMember, []string{s.Class}, m); err != nil {
			return err
		}
	}
	return emit(ctx, "CouncilSeeded", specs)
}

// validateDistribution is the gate. It is deliberately the same code path for
// seeding and for admission, so the founding table cannot be a special case
// that quietly breaks its own rules.
func validateDistribution(specs []weightSpec) error {
	if len(specs) == 0 {
		return fmt.Errorf("a council with no members has no authority to distribute")
	}
	bps := make([]int64, 0, len(specs))
	var total int64
	for _, s := range specs {
		if s.WeightBP <= 0 {
			return fmt.Errorf("class %s has a non-positive weight", s.Class)
		}
		if s.WeightBP > MaxClassWeightBP {
			return fmt.Errorf(
				"class %s would hold %.2f of the vote; the hard cap is %.2f",
				s.Class, float64(s.WeightBP)/10000, float64(MaxClassWeightBP)/10000)
		}
		bps = append(bps, s.WeightBP)
		total += s.WeightBP
	}
	if total != 10000 {
		return fmt.Errorf("weights must sum to 1.0000; this distribution sums to %.4f", float64(total)/10000)
	}
	m := ComputeMetrics(bps)
	if m.NakamotoCoefficient < MinNakamoto {
		return fmt.Errorf(
			"admission would drop the Nakamoto Coefficient to %d; the floor is %d, because at %d two classes could form a majority",
			m.NakamotoCoefficient, MinNakamoto, m.NakamotoCoefficient)
	}
	if int64(math.Round(m.Gini*10000)) > MaxGiniBP {
		return fmt.Errorf(
			"admission would raise the Gini coefficient to %.4f; the ceiling is %.4f",
			m.Gini, float64(MaxGiniBP)/10000)
	}
	return nil
}

// ProposeAdmission puts a complete new weight distribution to the council.
//
// The proposal is refused outright -- before any vote -- if it would breach the
// caps. That is what "the metrics bind rather than describe" means: the council
// cannot vote itself past its own concentration limits.
func (c *GovernanceCouncil) ProposeAdmission(ctx contractapi.TransactionContextInterface, proposalID, description, specJSON string) error {
	msp, _, err := callerMSPWithClass(ctx)
	if err != nil {
		return err
	}
	var specs []weightSpec
	if err := json.Unmarshal([]byte(specJSON), &specs); err != nil {
		return fmt.Errorf("spec must be a JSON array of {class, msp, weightBp}: %w", err)
	}
	if err := validateDistribution(specs); err != nil {
		return fmt.Errorf("proposal refused: %w", err)
	}
	return c.createProposal(ctx, proposalID, "ADMIT", description, specJSON, msp)
}

// Propose raises a non-membership proposal: a charter amendment, an upgrade,
// a suspension, a reinstatement.
func (c *GovernanceCouncil) Propose(ctx contractapi.TransactionContextInterface, proposalID, kind, description, payload string) error {
	msp, _, err := callerMSPWithClass(ctx)
	if err != nil {
		return err
	}
	switch kind {
	case "SUSPEND", "AMEND", "UPGRADE", "REINSTATE":
	default:
		return fmt.Errorf("proposal kind must be SUSPEND, AMEND, UPGRADE or REINSTATE, got %q", kind)
	}
	return c.createProposal(ctx, proposalID, kind, description, payload, msp)
}

func (c *GovernanceCouncil) createProposal(ctx contractapi.TransactionContextInterface, proposalID, kind, description, payload, proposer string) error {
	var existing model.Proposal
	found, err := getJSON(ctx, model.ObjProposal, []string{proposalID}, &existing)
	if err != nil {
		return err
	}
	if found {
		return fmt.Errorf("proposal %s already exists", proposalID)
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	p := model.Proposal{
		ProposalID: proposalID, Kind: kind, Description: description, Payload: payload,
		ProposedBy: proposer, Votes: map[string]float64{},
		Threshold: float64(SupermajorityBP) / 10000, State: model.ProposalOpen, CreatedTS: now,
	}
	if err := putJSON(ctx, model.ObjProposal, []string{proposalID}, p); err != nil {
		return err
	}
	return emit(ctx, "ProposalRaised", p)
}

// Vote casts a class's weighted vote. A two-thirds threshold carries.
//
// One organisation votes once, with its class's weight -- not once per peer and
// not once per member firm, which is how weighted consortium votes are usually
// gamed.
func (c *GovernanceCouncil) Vote(ctx contractapi.TransactionContextInterface, proposalID string) error {
	msp, _, err := callerMSPWithClass(ctx)
	if err != nil {
		return err
	}
	var p model.Proposal
	found, err := getJSON(ctx, model.ObjProposal, []string{proposalID}, &p)
	if err != nil {
		return err
	}
	if !found {
		return notFound("proposal", proposalID)
	}
	if p.State != model.ProposalOpen {
		return fmt.Errorf("proposal %s is %s and is no longer open", proposalID, p.State)
	}
	member, err := c.memberForMSP(ctx, msp)
	if err != nil {
		return err
	}
	if member.State != model.MemberActive {
		return fmt.Errorf("member %s is suspended and may not vote", member.MemberID)
	}
	if _, voted := p.Votes[member.Class]; voted {
		return fmt.Errorf("class %s has already voted on proposal %s", member.Class, proposalID)
	}
	if p.Votes == nil {
		p.Votes = map[string]float64{}
	}
	p.Votes[member.Class] = member.Weight
	p.WeightFor = 0
	for _, w := range p.Votes {
		p.WeightFor += w
	}
	now, err := txTime(ctx)
	if err != nil {
		return err
	}
	if int64(math.Round(p.WeightFor*10000)) >= SupermajorityBP {
		p.State = model.ProposalPassed
		p.DecidedTS = now
		if p.Kind == "ADMIT" {
			if err := c.applyAdmission(ctx, p.Payload, now); err != nil {
				return err
			}
		}
	}
	if err := putJSON(ctx, model.ObjProposal, []string{proposalID}, p); err != nil {
		return err
	}
	return emit(ctx, "ProposalVoted", map[string]interface{}{
		"proposalId": proposalID, "class": member.Class, "weightFor": p.WeightFor, "state": p.State,
	})
}

func (c *GovernanceCouncil) applyAdmission(ctx contractapi.TransactionContextInterface, specJSON string, now int64) error {
	var specs []weightSpec
	if err := json.Unmarshal([]byte(specJSON), &specs); err != nil {
		return err
	}
	// Re-validate at apply time. The distribution was checked when the proposal
	// was raised, but membership may have moved underneath it since.
	if err := validateDistribution(specs); err != nil {
		return fmt.Errorf("admission cannot be applied: %w", err)
	}
	for _, s := range specs {
		var m model.CouncilMember
		found, err := getJSON(ctx, model.ObjMember, []string{s.Class}, &m)
		if err != nil {
			return err
		}
		if !found {
			m = model.CouncilMember{MemberID: s.Class, Class: s.Class, State: model.MemberActive, AdmittedTS: now}
		}
		m.MSP = s.MSP
		m.Weight = float64(s.WeightBP) / 10000
		if err := putJSON(ctx, model.ObjMember, []string{s.Class}, m); err != nil {
			return err
		}
	}
	return nil
}

// SuspendMember off-boards a member. A two-thirds council vote can suspend
// any member; loss of the underlying licence suspends one automatically, as
// does hitting a set threshold of failed attestations. Suspension revokes
// authority without deleting past signatures.
func (c *GovernanceCouncil) SuspendMember(ctx contractapi.TransactionContextInterface, memberClass, proposalID string) error {
	if _, _, err := requireClass(ctx, model.ClassOversight); err != nil {
		return err
	}
	var p model.Proposal
	found, err := getJSON(ctx, model.ObjProposal, []string{proposalID}, &p)
	if err != nil {
		return err
	}
	if !found || p.State != model.ProposalPassed {
		return fmt.Errorf("suspension requires a passed two-thirds proposal; %s has not carried", proposalID)
	}
	var m model.CouncilMember
	found, err = getJSON(ctx, model.ObjMember, []string{memberClass}, &m)
	if err != nil {
		return err
	}
	if !found {
		return notFound("council member", memberClass)
	}
	m.State = model.MemberSuspended
	if err := putJSON(ctx, model.ObjMember, []string{memberClass}, m); err != nil {
		return err
	}
	return emit(ctx, "MemberSuspended", map[string]string{"class": memberClass, "proposalId": proposalID})
}

// --------------------------------------------------------------------- reads

// ListMembers returns the weight table.
func (c *GovernanceCouncil) ListMembers(ctx contractapi.TransactionContextInterface) ([]model.CouncilMember, error) {
	out := []model.CouncilMember{}
	err := listByPartial(ctx, model.ObjMember, []string{}, func(raw []byte) error {
		var m model.CouncilMember
		if err := jsonUnmarshal(raw, &m); err != nil {
			return err
		}
		out = append(out, m)
		return nil
	})
	sort.Slice(out, func(i, j int) bool { return out[i].Weight > out[j].Weight })
	return out, err
}

// GetMetrics recomputes and publishes the concentration measures. They are
// recomputed every period alongside the transparency totals rather than
// asserted once in a charter.
func (c *GovernanceCouncil) GetMetrics(ctx contractapi.TransactionContextInterface) (*Metrics, error) {
	members, err := c.ListMembers(ctx)
	if err != nil {
		return nil, err
	}
	bps := make([]int64, 0, len(members))
	for _, m := range members {
		if m.State != model.MemberActive {
			continue
		}
		bps = append(bps, int64(math.Round(m.Weight*10000)))
	}
	metrics := ComputeMetrics(bps)
	return &metrics, nil
}

// ListProposals returns every proposal and its standing.
func (c *GovernanceCouncil) ListProposals(ctx contractapi.TransactionContextInterface) ([]model.Proposal, error) {
	out := []model.Proposal{}
	err := listByPartial(ctx, model.ObjProposal, []string{}, func(raw []byte) error {
		var p model.Proposal
		if err := jsonUnmarshal(raw, &p); err != nil {
			return err
		}
		out = append(out, p)
		return nil
	})
	return out, err
}

// GetProposal returns one proposal.
func (c *GovernanceCouncil) GetProposal(ctx contractapi.TransactionContextInterface, proposalID string) (*model.Proposal, error) {
	var p model.Proposal
	found, err := getJSON(ctx, model.ObjProposal, []string{proposalID}, &p)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("proposal", proposalID)
	}
	return &p, nil
}

func (c *GovernanceCouncil) memberForMSP(ctx contractapi.TransactionContextInterface, msp string) (*model.CouncilMember, error) {
	members, err := c.ListMembers(ctx)
	if err != nil {
		return nil, err
	}
	for _, m := range members {
		if m.MSP == msp {
			return &m, nil
		}
	}
	return nil, fmt.Errorf("organisation %s holds no council seat", msp)
}
