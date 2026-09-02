export type PolicyStatus = 'PENDING' | 'ACTIVE' | 'LAPSED' | 'REVOKED';

export interface Policy {
  id: string;
  holderId: string;
  holderName: string;
  holderNID: string;
  insurerId: string;
  insurerName: string;
  product: string;
  benefitCap: number;
  scheduleVersion: string;
  status: PolicyStatus;
  startDate: string;
  endDate: string;
  premiumBDT: number;
  paymentMethod: string;
}
