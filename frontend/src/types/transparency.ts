import { UserRole } from './actor';

export interface TimelineEntry {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  actorRole: UserRole;
  actorName: string;
  status?: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  hash?: string;
}

export interface TransparencyRecord {
  id: string;
  period: string;
  insurerId: string;
  insurerName: string;
  totalClaimsReceived: number;
  totalClaimsSettled: number;
  totalClaimsDenied: number;
  totalPayoutBDT: number;
  medianSettlementDays: number;
  merkleRoot: string;
  blockHeight: number;
  publicChainTxHash: string;
  verifiedAt: string;
}

export type AppealStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'UPHELD' | 'OVERTURNED';

export interface Appeal {
  id: string;
  entitlementId: string;
  eventId: string;
  holderId: string;
  holderName: string;
  status: AppealStatus;
  reason: string;
  panel: string[];
  decision?: string;
  submittedAt: string;
  resolvedAt?: string;
}
