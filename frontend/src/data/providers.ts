import { ProviderEntity } from '../types/actor';

export const MOCK_PROVIDERS: ProviderEntity[] = [
  {
    id: 'PRV-UPAZILA-101',
    name: 'ABC Upazila Health Complex',
    facilityType: 'UPAZILA_HEALTH_COMPLEX',
    upazila: 'Mirpur',
    district: 'Dhaka',
    accreditationStatus: 'ACCREDITED',
    totalAttestations: 142,
    failedAttestations: 1,
    joinedDate: '2025-01-15',
  },
  {
    id: 'PRV-DISTRICT-202',
    name: 'Dhaka District Medical Center',
    facilityType: 'DISTRICT_HOSPITAL',
    upazila: 'Dhanmondi',
    district: 'Dhaka',
    accreditationStatus: 'ACCREDITED',
    totalAttestations: 380,
    failedAttestations: 2,
    joinedDate: '2024-11-01',
  },
  {
    id: 'PRV-FLAGGED-303',
    name: 'Al-Madina Diagnostic & Clinic',
    facilityType: 'DIAGNOSTIC_CENTER',
    upazila: 'Mirpur',
    district: 'Dhaka',
    accreditationStatus: 'FLAGGED',
    totalAttestations: 45,
    failedAttestations: 12,
    joinedDate: '2025-04-10',
  },
];
