import { InsurerEntity } from '../types/actor';

export const MOCK_INSURERS: InsurerEntity[] = [
  {
    id: 'INS-001',
    name: 'Green Delta Insurance PLC',
    code: 'INSURER_A',
    settlementRatio: 0.92,
    denialRatio: 0.08,
    medianSettlementDays: 2.1,
    activePoliciesCount: 14250,
    totalClaimsPaidBDT: 48500000,
    merkleAnchorVerified: true,
  },
  {
    id: 'INS-002',
    name: 'Pragati Insurance Ltd',
    code: 'INSURER_B',
    settlementRatio: 0.78,
    denialRatio: 0.22,
    medianSettlementDays: 4.7,
    activePoliciesCount: 8900,
    totalClaimsPaidBDT: 24100000,
    merkleAnchorVerified: true,
  },
  {
    id: 'INS-003',
    name: 'Sadharan Bima Corporation',
    code: 'SBC_GOVT',
    settlementRatio: 0.85,
    denialRatio: 0.15,
    medianSettlementDays: 3.4,
    activePoliciesCount: 22000,
    totalClaimsPaidBDT: 89000000,
    merkleAnchorVerified: true,
  },
];
