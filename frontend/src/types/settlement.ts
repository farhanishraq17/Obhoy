export type SettlementStatus = 
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PROCESSING'
  | 'SETTLED'
  | 'RECONCILIATION_REQUIRED';

export type PaymentRail = 'BKASH' | 'NAGAD' | 'ROCKET' | 'MFI_ACCOUNT';

export interface Settlement {
  id: string;
  entitlementId: string;
  amount: number;
  rail: PaymentRail;
  status: SettlementStatus;
  reference?: string;
  recipientMobile?: string;
  requestedAt: string;
  settledAt?: string;
}
