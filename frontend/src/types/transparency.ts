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
  denialReason?: string;
  insurerName?: string;
  deadlineDays?: number;
}

export type AuditEventType =
  | 'EVENT_CREATED'
  | 'ATTESTATION_RECORDED'
  | 'QUORUM_REACHED'
  | 'ENTITLEMENT_AUTHORIZED'
  | 'ENTITLEMENT_DENIED'
  | 'SETTLEMENT_CONFIRMED'
  | 'SETTLEMENT_TIMEOUT'
  | 'SETTLEMENT_RECONCILED'
  | 'APPEAL_SUBMITTED'
  | 'APPEAL_RESOLVED'
  | 'PROVIDER_SUSPENDED'
  | 'PROVIDER_REINSTATED'
  | 'SLA_BREACH'
  | 'ANCHOR_PUBLISHED';

export interface AuditRecord {
  id: string;
  type: AuditEventType;
  entityId: string;
  actorRole: UserRole | 'TRIBUNAL' | 'GATEWAY' | 'CONSORTIUM';
  actorName: string;
  timestamp: string;
  description: string;
  previousState?: string;
  newState?: string;
  evidenceHash: string;
  channel: string;
}

