package contracts

import (
	"encoding/json"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/model"
)

// BenefitScheduleContract publishes what each covered category pays, in
// advance and by version.
//
// This is where Failure 3 closes on the amount. If the payout does not depend
// on a document the claimant wrote, inflating that document earns nothing. The
// remaining attack moves to the category code, which the multi-class quorum and
// off-chain outlier detection reduce but do not remove -- the paper does not
// claim otherwise and neither does this contract.
type BenefitScheduleContract struct {
	contractapi.Contract
}

// PublishSchedule appends a new version. Schedules are never edited in place:
// an event stores the hash of the version it opened under, so a schedule
// cannot be rewritten under a claim after the fact.
func (c *BenefitScheduleContract) PublishSchedule(
	ctx contractapi.TransactionContextInterface,
	version int, effectiveFrom int64, entriesJSON string,
) (string, error) {
	if _, _, err := requireClass(ctx, model.ClassInsurer, model.ClassOversight); err != nil {
		return "", err
	}
	if version <= 0 {
		return "", fmt.Errorf("schedule version must be positive")
	}
	var entries map[string]int64
	if err := json.Unmarshal([]byte(entriesJSON), &entries); err != nil {
		return "", fmt.Errorf("entries must be a JSON object of categoryCode -> amount: %w", err)
	}
	if len(entries) == 0 {
		return "", fmt.Errorf("a schedule with no entries pays nothing and cannot be published")
	}
	var existing model.BenefitSchedule
	found, err := getJSON(ctx, model.ObjSchedule, []string{strconv.Itoa(version)}, &existing)
	if err != nil {
		return "", err
	}
	if found {
		return "", fmt.Errorf("schedule version %d is already published and is append-only", version)
	}
	now, err := txTime(ctx)
	if err != nil {
		return "", err
	}
	s := model.BenefitSchedule{
		Version:       version,
		EffectiveFrom: effectiveFrom,
		Entries:       entries,
		Hash:          model.ScheduleHash(version, effectiveFrom, entries),
		PublishedTS:   now,
	}
	if err := putJSON(ctx, model.ObjSchedule, []string{strconv.Itoa(version)}, s); err != nil {
		return "", err
	}
	// Track the newest version so openEvent can stamp events without the
	// caller choosing which schedule to be judged against.
	tip, err := c.CurrentVersion(ctx)
	if err != nil {
		return "", err
	}
	if version > tip {
		if err := putRaw(ctx, model.ObjScheduleTip, []string{"tip"}, strconv.Itoa(version)); err != nil {
			return "", err
		}
	}
	if err := emit(ctx, "SchedulePublished", s); err != nil {
		return "", err
	}
	return s.Hash, nil
}

// CurrentVersion is the newest published schedule version, or 0 if none.
func (c *BenefitScheduleContract) CurrentVersion(ctx contractapi.TransactionContextInterface) (int, error) {
	raw, err := getRaw(ctx, model.ObjScheduleTip, []string{"tip"})
	if err != nil {
		return 0, err
	}
	if raw == "" {
		return 0, nil
	}
	return strconv.Atoi(raw)
}

// GetSchedule returns one published version.
func (c *BenefitScheduleContract) GetSchedule(ctx contractapi.TransactionContextInterface, version int) (*model.BenefitSchedule, error) {
	var s model.BenefitSchedule
	found, err := getJSON(ctx, model.ObjSchedule, []string{strconv.Itoa(version)}, &s)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, notFound("benefit schedule version", strconv.Itoa(version))
	}
	return &s, nil
}

// ListSchedules returns every published version, so a buyer can see how the
// benefit for a category has moved over time.
func (c *BenefitScheduleContract) ListSchedules(ctx contractapi.TransactionContextInterface) ([]model.BenefitSchedule, error) {
	out := []model.BenefitSchedule{}
	err := listByPartial(ctx, model.ObjSchedule, []string{}, func(raw []byte) error {
		var s model.BenefitSchedule
		if err := jsonUnmarshal(raw, &s); err != nil {
			return err
		}
		out = append(out, s)
		return nil
	})
	return out, err
}

// GetBenefit is the defined benefit for a category under a given version. It
// is what settlement pays, and it is not a number the claimant supplied.
func (c *BenefitScheduleContract) GetBenefit(ctx contractapi.TransactionContextInterface, version int, categoryCode string) (int64, error) {
	s, err := c.GetSchedule(ctx, version)
	if err != nil {
		return 0, err
	}
	amount, ok := s.Entries[categoryCode]
	if !ok {
		return 0, fmt.Errorf("category %q is not covered under schedule version %d", categoryCode, version)
	}
	return amount, nil
}
