import { TransparencyRecord } from '../types/transparency';

export const MOCK_TRANSPARENCY_RECORDS: TransparencyRecord[] = [
  {
    id: 'TRP-2026-Q1',
    period: '2026 Q1',
    insurerId: 'INS-001',
    insurerName: 'Green Delta Insurance PLC',
    totalClaimsReceived: 420,
    totalClaimsSettled: 386,
    totalClaimsDenied: 34,
    totalPayoutBDT: 19300000,
    medianSettlementDays: 2.1,
    merkleRoot: '0x8f2a9b1c7e4d3a0e91f82c4b',
    blockHeight: 148290,
    publicChainTxHash: '0x3a4b91c8e7f2d019ab4c82e71049f872b1928374a',
    verifiedAt: '2026-03-31T23:59:59Z',
  },
  {
    id: 'TRP-2025-Q4',
    period: '2025 Q4',
    insurerId: 'INS-001',
    insurerName: 'Green Delta Insurance PLC',
    totalClaimsReceived: 380,
    totalClaimsSettled: 349,
    totalClaimsDenied: 31,
    totalPayoutBDT: 17450000,
    medianSettlementDays: 2.3,
    merkleRoot: '0x1c4e9a7b2d5f8a0e34f91b7c',
    blockHeight: 135100,
    publicChainTxHash: '0x9b1c8e7f2d019ab4c82e71049f872b1928374a3a4',
    verifiedAt: '2025-12-31T23:59:59Z',
  },
];
