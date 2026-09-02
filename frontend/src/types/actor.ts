export type UserRole = 
  | 'PUBLIC'
  | 'POLICYHOLDER'
  | 'PROVIDER'
  | 'CLINICAL_VERIFIER'
  | 'FIELD_VERIFIER'
  | 'INSURER'
  | 'REGULATOR';

export interface UserProfile {
  id: string;
  nid: string;
  name: string;
  phone: string;
  mfi: string;
  group: string;
  upazila: string;
  district: string;
  nidCommitment: string;
  holderNumber?: string;
  subjectReference?: string;
  policyId?: string;
  coverageStatus?: string;
}

export type AccreditationStatus = 'ACCREDITED' | 'FLAGGED' | 'SUSPENDED' | 'REVOKED';

export interface ProviderEntity {
  id: string;
  name: string;
  facilityType: 'UPAZILA_HEALTH_COMPLEX' | 'DISTRICT_HOSPITAL' | 'MEDICAL_COLLEGE' | 'DIAGNOSTIC_CENTER';
  upazila: string;
  district: string;
  accreditationStatus: AccreditationStatus;
  totalAttestations: number;
  failedAttestations: number;
  joinedDate: string;
}

export interface InsurerEntity {
  id: string;
  name: string;
  code: string;
  settlementRatio: number;
  denialRatio: number;
  medianSettlementDays: number;
  activePoliciesCount: number;
  totalClaimsPaidBDT: number;
  merkleAnchorVerified: boolean;
}
