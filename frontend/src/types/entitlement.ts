export type EntitlementStatus = 'OPEN' | 'AUTHORIZED' | 'SETTLED' | 'DENIED' | 'APPEALED';

export interface Entitlement {
  id: string;
  eventId: string;
  policyId: string;
  insurerId: string;
  insurerName: string;
  amount: number;
  status: EntitlementStatus;
  denialReason?: string;
  authorizedAt?: string;
  decisionDate?: string;
  appealId?: string;
}
