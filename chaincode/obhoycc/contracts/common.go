// Package contracts holds the eight contracts named in the whitepaper's
// chaincode architecture. They ship as one chaincode package: eight separate
// deployments across seven organisations is a week of lifecycle work for no
// behavioural difference, and the split that matters -- events and
// entitlements having different uniqueness rules -- is a split of contracts,
// not of packages.
package contracts

import (
	"encoding/json"
	"errors"
	"fmt"

	"github.com/hyperledger/fabric-chaincode-go/pkg/cid"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/model"
)

// ---------------------------------------------------------------- identity

// MSPResolver reports the MSP of the submitting client. On a real network this
// is the X.509 identity Fabric already validated. The seam exists so the same
// contract code can run under the in-process ledger used by the tests and the
// local node, where there is no MSP infrastructure to parse.
type MSPResolver func(ctx contractapi.TransactionContextInterface) (string, error)

// ClientResolver reports the enrolment ID of the submitting client.
type ClientResolver func(ctx contractapi.TransactionContextInterface) (string, error)

var (
	ResolveMSP    MSPResolver    = fabricMSP
	ResolveClient ClientResolver = fabricClient
)

func fabricMSP(ctx contractapi.TransactionContextInterface) (string, error) {
	msp, err := cid.GetMSPID(ctx.GetStub())
	if err != nil {
		return "", fmt.Errorf("cannot resolve caller MSP: %w", err)
	}
	return msp, nil
}

func fabricClient(ctx contractapi.TransactionContextInterface) (string, error) {
	id, err := cid.GetID(ctx.GetStub())
	if err != nil {
		return "", fmt.Errorf("cannot resolve caller identity: %w", err)
	}
	return id, nil
}

// mspClass maps an organisation to the stakeholder class it may speak for.
// Access control is role-based and enforced structurally: no class can assert
// a fact outside its real-world role, because the mapping is here and not in
// an application that could be bypassed.
var mspClass = map[string]model.AttesterClass{
	"ProviderMSP":  model.ClassProvider,
	"ClinicalMSP":  model.ClassClinical,
	"FieldMSP":     model.ClassField,
	"InsurerAMSP":  model.ClassInsurer,
	"InsurerBMSP":  model.ClassInsurer,
	"RegulatorMSP": model.ClassOversight,
	"AcademicMSP":  model.ClassOversight,
}

// ClassOf reports which stakeholder class an MSP belongs to.
func ClassOf(msp string) (model.AttesterClass, error) {
	c, ok := mspClass[msp]
	if !ok {
		return "", fmt.Errorf("organisation %q is not a member of this network", msp)
	}
	return c, nil
}

// RegisterMSPClass lets a deployment extend the roster without a code change.
// It is used by the local node and by tests; on a real network the roster is
// fixed at channel configuration time.
func RegisterMSPClass(msp string, class model.AttesterClass) {
	mspClass[msp] = class
}

func callerMSPWithClass(ctx contractapi.TransactionContextInterface) (string, model.AttesterClass, error) {
	msp, err := ResolveMSP(ctx)
	if err != nil {
		return "", "", err
	}
	class, err := ClassOf(msp)
	if err != nil {
		return "", "", err
	}
	return msp, class, nil
}

// requireClass refuses the transaction unless the caller's organisation holds
// one of the listed classes.
func requireClass(ctx contractapi.TransactionContextInterface, allowed ...model.AttesterClass) (string, model.AttesterClass, error) {
	msp, class, err := callerMSPWithClass(ctx)
	if err != nil {
		return "", "", err
	}
	for _, a := range allowed {
		if class == a {
			return msp, class, nil
		}
	}
	return "", "", fmt.Errorf("organisation %s holds class %s and may not call this function", msp, class)
}

// --------------------------------------------------------------- timestamps

// txTime returns the ordering-service timestamp. Chaincode must never read a
// local clock: two endorsing peers would produce different write sets and the
// transaction would fail validation.
func txTime(ctx contractapi.TransactionContextInterface) (int64, error) {
	ts, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return 0, fmt.Errorf("cannot read transaction timestamp: %w", err)
	}
	return ts.AsTime().Unix(), nil
}

// ------------------------------------------------------------- state access

func compositeKey(ctx contractapi.TransactionContextInterface, objectType string, attrs ...string) (string, error) {
	return ctx.GetStub().CreateCompositeKey(objectType, attrs)
}

func getJSON(ctx contractapi.TransactionContextInterface, objectType string, attrs []string, out interface{}) (bool, error) {
	key, err := compositeKey(ctx, objectType, attrs...)
	if err != nil {
		return false, err
	}
	raw, err := ctx.GetStub().GetState(key)
	if err != nil {
		return false, fmt.Errorf("read %s: %w", objectType, err)
	}
	if raw == nil {
		return false, nil
	}
	if err := json.Unmarshal(raw, out); err != nil {
		return false, fmt.Errorf("decode %s: %w", objectType, err)
	}
	return true, nil
}

func putJSON(ctx contractapi.TransactionContextInterface, objectType string, attrs []string, in interface{}) error {
	key, err := compositeKey(ctx, objectType, attrs...)
	if err != nil {
		return err
	}
	raw, err := model.Canonical(in)
	if err != nil {
		return fmt.Errorf("encode %s: %w", objectType, err)
	}
	return ctx.GetStub().PutState(key, raw)
}

func putRaw(ctx contractapi.TransactionContextInterface, objectType string, attrs []string, value string) error {
	key, err := compositeKey(ctx, objectType, attrs...)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(key, []byte(value))
}

func getRaw(ctx contractapi.TransactionContextInterface, objectType string, attrs []string) (string, error) {
	key, err := compositeKey(ctx, objectType, attrs...)
	if err != nil {
		return "", err
	}
	raw, err := ctx.GetStub().GetState(key)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func delKey(ctx contractapi.TransactionContextInterface, objectType string, attrs ...string) error {
	key, err := compositeKey(ctx, objectType, attrs...)
	if err != nil {
		return err
	}
	return ctx.GetStub().DelState(key)
}

// listByPartial walks a composite-key range and hands each value to visit.
// Used instead of rich queries so the network can run on LevelDB.
func listByPartial(ctx contractapi.TransactionContextInterface, objectType string, attrs []string, visit func([]byte) error) error {
	it, err := ctx.GetStub().GetStateByPartialCompositeKey(objectType, attrs)
	if err != nil {
		return fmt.Errorf("range %s: %w", objectType, err)
	}
	defer it.Close()
	for it.HasNext() {
		kv, err := it.Next()
		if err != nil {
			return err
		}
		if err := visit(kv.Value); err != nil {
			return err
		}
	}
	return nil
}

// --------------------------------------------------------------- chain events

func emit(ctx contractapi.TransactionContextInterface, name string, payload interface{}) error {
	raw, err := model.Canonical(payload)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent(name, raw)
}

var errNotFound = errors.New("not found")

func notFound(kind, id string) error {
	return fmt.Errorf("%s %q: %w", kind, id, errNotFound)
}

func jsonUnmarshal(raw []byte, out interface{}) error {
	return json.Unmarshal(raw, out)
}
