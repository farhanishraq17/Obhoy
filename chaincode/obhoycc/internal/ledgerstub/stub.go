// Package ledgerstub is an in-process implementation of the parts of Fabric's
// ChaincodeStubInterface that this chaincode actually uses.
//
// It exists so the contracts can be exercised two ways without being written
// twice. The unit tests run the real contract code against it, and so does the
// local node -- which means the invariant suite and the scenario harness are
// testing the same functions that a Fabric peer will execute, not a
// reimplementation of them in another language.
//
// It is NOT a Fabric substitute. There is no endorsement, no ordering, no
// consensus, no MSP validation and no private-data confidentiality here. The
// endorsement policy is where half of Mechanism 2 lives, and that half exists
// only on a real network.
package ledgerstub

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-protos-go/ledger/queryresult"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const compositeKeyNamespace = "\x00"

// ChaincodeEvent is one event emitted during a transaction.
type ChaincodeEvent struct {
	Name    string `json:"name"`
	Payload string `json:"payload"`
}

// Ledger is the shared world state. It survives across transactions the way a
// real ledger does, and it keeps a per-key history so GetHistoryForKey works.
type Ledger struct {
	mu      sync.RWMutex
	state   map[string][]byte
	private map[string]map[string][]byte
	history map[string][]historyEntry
	blocks  []Block
	txSeq   int64
}

type historyEntry struct {
	txID     string
	ts       int64
	value    []byte
	isDelete bool
}

// Block is a deliberately thin record of a committed transaction, enough for
// the ledger view in the web app to show something true rather than something
// invented.
type Block struct {
	Number    int64            `json:"number"`
	TxID      string           `json:"txId"`
	Timestamp int64            `json:"timestamp"`
	MSP       string           `json:"msp"`
	Function  string           `json:"function"`
	Writes    []string         `json:"writes"`
	Events    []ChaincodeEvent `json:"events"`
	Success   bool             `json:"success"`
	Message   string           `json:"message,omitempty"`
}

// NewLedger returns an empty world state.
func NewLedger() *Ledger {
	return &Ledger{
		state:   map[string][]byte{},
		private: map[string]map[string][]byte{},
		history: map[string][]historyEntry{},
	}
}

// Blocks returns the committed transaction log.
func (l *Ledger) Blocks() []Block {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make([]Block, len(l.blocks))
	copy(out, l.blocks)
	return out
}

// Dump returns the whole world state as key/value strings. The privacy check
// in the harness reads this: if an NID, a name or a free-text diagnosis ever
// appears on-chain, it shows up here.
func (l *Ledger) Dump() map[string]string {
	l.mu.RLock()
	defer l.mu.RUnlock()
	out := make(map[string]string, len(l.state))
	for k, v := range l.state {
		out[printableKey(k)] = string(v)
	}
	return out
}

func printableKey(k string) string {
	return strings.ReplaceAll(k, "\x00", "~")
}

// Stub is one transaction's view of the ledger. Writes are buffered and
// applied on Commit, so a failed transaction leaves no trace -- which is what
// "refused at commit" means in the tests.
type Stub struct {
	shim.ChaincodeStubInterface // unimplemented methods are never called by this chaincode

	ledger    *Ledger
	txID      string
	channelID string
	msp       string
	fn        string
	ts        int64
	transient map[string][]byte

	writes  map[string][]byte
	deletes map[string]bool
	pwrites map[string]map[string][]byte
	events  []ChaincodeEvent
}

// NewStub begins a transaction. The MSP is supplied rather than parsed from an
// X.509 certificate; on a real network Fabric has already validated it before
// chaincode runs.
func (l *Ledger) NewStub(msp, fn string) *Stub {
	l.mu.Lock()
	l.txSeq++
	seq := l.txSeq
	l.mu.Unlock()
	return &Stub{
		ledger:    l,
		txID:      fmt.Sprintf("tx%06d", seq),
		channelID: "obhoy-main",
		msp:       msp,
		fn:        fn,
		ts:        time.Now().Unix(),
		transient: map[string][]byte{},
		writes:    map[string][]byte{},
		deletes:   map[string]bool{},
		pwrites:   map[string]map[string][]byte{},
	}
}

// SetTime pins the transaction timestamp. Scenarios that need a policy to have
// lapsed, or a continuation window to have closed, set it explicitly rather
// than sleeping.
func (s *Stub) SetTime(unix int64) { s.ts = unix }

// SetTransient supplies transient data for a transaction.
func (s *Stub) SetTransient(m map[string][]byte) { s.transient = m }

// MSP reports the submitting organisation.
func (s *Stub) MSP() string { return s.msp }

// Events returns what the transaction emitted.
func (s *Stub) Events() []ChaincodeEvent { return s.events }

// Commit applies the write set and appends a block. A transaction that
// returned an error must be committed with success=false, which records the
// attempt and its refusal without changing state.
func (s *Stub) Commit(success bool, message string) Block {
	s.ledger.mu.Lock()
	defer s.ledger.mu.Unlock()

	writes := []string{}
	if success {
		for k, v := range s.writes {
			s.ledger.state[k] = v
			s.ledger.history[k] = append(s.ledger.history[k], historyEntry{txID: s.txID, ts: s.ts, value: v})
		}
		for k := range s.deletes {
			delete(s.ledger.state, k)
			s.ledger.history[k] = append(s.ledger.history[k], historyEntry{txID: s.txID, ts: s.ts, isDelete: true})
		}
		for coll, kv := range s.pwrites {
			if s.ledger.private[coll] == nil {
				s.ledger.private[coll] = map[string][]byte{}
			}
			for k, v := range kv {
				s.ledger.private[coll][k] = v
			}
		}
		for k := range s.writes {
			writes = append(writes, printableKey(k))
		}
		for k := range s.deletes {
			writes = append(writes, "DEL "+printableKey(k))
		}
		sort.Strings(writes)
	}
	b := Block{
		Number:    int64(len(s.ledger.blocks)),
		TxID:      s.txID,
		Timestamp: s.ts,
		MSP:       s.msp,
		Function:  s.fn,
		Writes:    writes,
		Events:    s.events,
		Success:   success,
		Message:   message,
	}
	s.ledger.blocks = append(s.ledger.blocks, b)
	return b
}

// ------------------------------------------------- ChaincodeStubInterface

func (s *Stub) GetTxID() string     { return s.txID }
func (s *Stub) GetChannelID() string { return s.channelID }

func (s *Stub) GetTxTimestamp() (*timestamppb.Timestamp, error) {
	return timestamppb.New(time.Unix(s.ts, 0)), nil
}

func (s *Stub) GetTransient() (map[string][]byte, error) { return s.transient, nil }

func (s *Stub) GetCreator() ([]byte, error) { return []byte(s.msp), nil }

func (s *Stub) GetState(key string) ([]byte, error) {
	if s.deletes[key] {
		return nil, nil
	}
	if v, ok := s.writes[key]; ok {
		return v, nil
	}
	s.ledger.mu.RLock()
	defer s.ledger.mu.RUnlock()
	v, ok := s.ledger.state[key]
	if !ok {
		return nil, nil
	}
	out := make([]byte, len(v))
	copy(out, v)
	return out, nil
}

func (s *Stub) PutState(key string, value []byte) error {
	if key == "" {
		return fmt.Errorf("cannot write an empty key")
	}
	delete(s.deletes, key)
	cp := make([]byte, len(value))
	copy(cp, value)
	s.writes[key] = cp
	return nil
}

func (s *Stub) DelState(key string) error {
	delete(s.writes, key)
	s.deletes[key] = true
	return nil
}

func (s *Stub) CreateCompositeKey(objectType string, attributes []string) (string, error) {
	ck := compositeKeyNamespace + objectType + string(rune(0))
	for _, a := range attributes {
		ck += a + string(rune(0))
	}
	return ck, nil
}

func (s *Stub) SplitCompositeKey(compositeKey string) (string, []string, error) {
	parts := strings.Split(compositeKey[1:], string(rune(0)))
	if len(parts) == 0 {
		return "", nil, fmt.Errorf("malformed composite key")
	}
	return parts[0], parts[1 : len(parts)-1], nil
}

func (s *Stub) GetStateByPartialCompositeKey(objectType string, keys []string) (shim.StateQueryIteratorInterface, error) {
	prefix, err := s.CreateCompositeKey(objectType, keys)
	if err != nil {
		return nil, err
	}
	// A partial key must not end with the terminator, or it would only match
	// the exact-length key rather than everything beneath it.
	prefix = strings.TrimSuffix(prefix, string(rune(0)))
	if len(keys) == 0 {
		prefix = compositeKeyNamespace + objectType + string(rune(0))
	}

	merged := map[string][]byte{}
	s.ledger.mu.RLock()
	for k, v := range s.ledger.state {
		merged[k] = v
	}
	s.ledger.mu.RUnlock()
	for k, v := range s.writes {
		merged[k] = v
	}
	for k := range s.deletes {
		delete(merged, k)
	}

	keysOut := make([]string, 0, len(merged))
	for k := range merged {
		if strings.HasPrefix(k, prefix) {
			keysOut = append(keysOut, k)
		}
	}
	sort.Strings(keysOut)
	it := &stateIterator{}
	for _, k := range keysOut {
		it.items = append(it.items, &queryresult.KV{Namespace: s.channelID, Key: k, Value: merged[k]})
	}
	return it, nil
}

func (s *Stub) GetHistoryForKey(key string) (shim.HistoryQueryIteratorInterface, error) {
	s.ledger.mu.RLock()
	defer s.ledger.mu.RUnlock()
	it := &historyIterator{}
	for _, h := range s.ledger.history[key] {
		it.items = append(it.items, &queryresult.KeyModification{
			TxId:      h.txID,
			Value:     h.value,
			Timestamp: timestamppb.New(time.Unix(h.ts, 0)),
			IsDelete:  h.isDelete,
		})
	}
	return it, nil
}

func (s *Stub) GetPrivateData(collection, key string) ([]byte, error) {
	if kv, ok := s.pwrites[collection]; ok {
		if v, ok := kv[key]; ok {
			return v, nil
		}
	}
	s.ledger.mu.RLock()
	defer s.ledger.mu.RUnlock()
	if kv, ok := s.ledger.private[collection]; ok {
		return kv[key], nil
	}
	return nil, nil
}

func (s *Stub) PutPrivateData(collection, key string, value []byte) error {
	if s.pwrites[collection] == nil {
		s.pwrites[collection] = map[string][]byte{}
	}
	s.pwrites[collection][key] = value
	return nil
}

func (s *Stub) DelPrivateData(collection, key string) error {
	if s.pwrites[collection] == nil {
		s.pwrites[collection] = map[string][]byte{}
	}
	delete(s.pwrites[collection], key)
	return nil
}

func (s *Stub) SetEvent(name string, payload []byte) error {
	s.events = append(s.events, ChaincodeEvent{Name: name, Payload: string(payload)})
	return nil
}

// ---------------------------------------------------------------- iterators

type stateIterator struct {
	items []*queryresult.KV
	i     int
}

func (it *stateIterator) HasNext() bool { return it.i < len(it.items) }
func (it *stateIterator) Close() error  { return nil }
func (it *stateIterator) Next() (*queryresult.KV, error) {
	if !it.HasNext() {
		return nil, fmt.Errorf("iterator exhausted")
	}
	kv := it.items[it.i]
	it.i++
	return kv, nil
}

type historyIterator struct {
	items []*queryresult.KeyModification
	i     int
}

func (it *historyIterator) HasNext() bool { return it.i < len(it.items) }
func (it *historyIterator) Close() error  { return nil }
func (it *historyIterator) Next() (*queryresult.KeyModification, error) {
	if !it.HasNext() {
		return nil, fmt.Errorf("iterator exhausted")
	}
	km := it.items[it.i]
	it.i++
	return km, nil
}
