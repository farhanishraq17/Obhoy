// Command chaincode is the Fabric entry point for the Obhoy chaincode.
//
// Eight contracts ship in one package. The split that matters -- events and
// entitlements having different uniqueness rules -- is a split of contracts,
// not of deployments: eight separate lifecycle approvals across seven
// organisations would buy nothing behavioural and cost a week.
package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"

	"github.com/obhoy/obhoycc/contracts"
)

func main() {
	identity := new(contracts.IdentityRegistry)
	identity.Name = "IdentityRegistry"

	policy := new(contracts.PolicyRegistry)
	policy.Name = "PolicyRegistry"

	provider := new(contracts.ProviderRegistry)
	provider.Name = "ProviderRegistry"

	schedule := new(contracts.BenefitScheduleContract)
	schedule.Name = "BenefitSchedule"

	event := new(contracts.EventRegistry)
	event.Name = "EventRegistry"

	settlement := new(contracts.ClaimSettlement)
	settlement.Name = "ClaimSettlement"

	transparency := new(contracts.TransparencyLedger)
	transparency.Name = "TransparencyLedger"

	governance := new(contracts.GovernanceCouncil)
	governance.Name = "GovernanceCouncil"

	cc, err := contractapi.NewChaincode(
		identity, policy, provider, schedule,
		event, settlement, transparency, governance,
	)
	if err != nil {
		log.Panicf("obhoycc: cannot assemble chaincode: %v", err)
	}
	if err := cc.Start(); err != nil {
		log.Panicf("obhoycc: cannot start chaincode: %v", err)
	}
}
