import { TimelineEntry } from './transparency';

export type EventStatus = 
  | 'DRAFT'
  | 'OPEN'
  | 'CLOSED_ELIGIBLE'
  | 'CLOSED_INELIGIBLE'
  | 'EXPIRED';

export type AttesterClass = 'PROVIDER' | 'CLINICAL' | 'FIELD';

export interface Attestation {
  id: string;
  eventId: string;
  actorId: string;
  actorName: string;
  actorClass: AttesterClass;
  timestamp: string;
  status: 'VALID' | 'REJECTED';
  evidenceRef?: string;
}

export interface EventSegment {
  id: string;
  providerId: string;
  facilityName: string;
  admittedAt: string;
  type: 'INITIAL' | 'TRANSFER' | 'READMISSION';
  notes?: string;
}

export interface InsurableEvent {
  id: string;
  eventKey: string;
  holderId: string;
  holderName: string;
  holderNIDCommitment: string;
  admissionWindow: string;
  providerId: string;
  facilityName: string;
  status: EventStatus;
  diagnosisCode: string;
  diagnosisCategory: string;
  segments: EventSegment[];
  attestations: Attestation[];
  timeline: TimelineEntry[];
  createdAt: string;
}
