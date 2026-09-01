package model

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
)

// ProofStep is one sibling on the path from a leaf to the root.
type ProofStep struct {
	Hash string `json:"hash"`
	Left bool   `json:"left"` // true when the sibling is the left-hand input
}

func hashPair(a, b string) string {
	ab, _ := hex.DecodeString(a)
	bb, _ := hex.DecodeString(b)
	h := sha256.New()
	h.Write(ab)
	h.Write(bb)
	return hex.EncodeToString(h.Sum(nil))
}

// MerkleRoot builds the root over an ordered leaf set. An odd node at any
// level is promoted rather than duplicated, which avoids the duplicate-leaf
// ambiguity that bites naive implementations.
func MerkleRoot(leaves []string) (string, error) {
	if len(leaves) == 0 {
		return "", errors.New("merkle: empty leaf set")
	}
	level := append([]string(nil), leaves...)
	for len(level) > 1 {
		next := make([]string, 0, (len(level)+1)/2)
		for i := 0; i < len(level); i += 2 {
			if i+1 == len(level) {
				next = append(next, level[i]) // promote, do not duplicate
				continue
			}
			next = append(next, hashPair(level[i], level[i+1]))
		}
		level = next
	}
	return level[0], nil
}

// MerkleProof returns the sibling path for one leaf index.
func MerkleProof(leaves []string, index int) ([]ProofStep, error) {
	if index < 0 || index >= len(leaves) {
		return nil, errors.New("merkle: index out of range")
	}
	proof := []ProofStep{}
	level := append([]string(nil), leaves...)
	idx := index
	for len(level) > 1 {
		next := make([]string, 0, (len(level)+1)/2)
		for i := 0; i < len(level); i += 2 {
			if i+1 == len(level) {
				next = append(next, level[i])
				if i == idx {
					idx = len(next) - 1
				}
				continue
			}
			next = append(next, hashPair(level[i], level[i+1]))
			if i == idx {
				proof = append(proof, ProofStep{Hash: level[i+1], Left: false})
				idx = len(next) - 1
			} else if i+1 == idx {
				proof = append(proof, ProofStep{Hash: level[i], Left: true})
				idx = len(next) - 1
			}
		}
		level = next
	}
	return proof, nil
}

// VerifyMerkleProof is what a journalist, regulator or prospective
// policyholder runs against a published figure and an anchored root.
func VerifyMerkleProof(leaf string, proof []ProofStep, root string) bool {
	cur := leaf
	for _, step := range proof {
		if step.Left {
			cur = hashPair(step.Hash, cur)
		} else {
			cur = hashPair(cur, step.Hash)
		}
	}
	return cur == root
}
