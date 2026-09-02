export interface InstitutionalVerifier {
  verifierNumber: string;
  name: string;
  role: 'CLINICAL_VERIFIER' | 'FIELD_VERIFIER';
  organization: string;
  title: string;
  station: string;
  licenseRef: string;
}

export const INSTITUTIONAL_VERIFIERS: InstitutionalVerifier[] = [
  {
    verifierNumber: 'VRF-CLIN-01',
    name: 'Dr. Anisur Rahman, MBBS, FCPS',
    role: 'CLINICAL_VERIFIER',
    organization: 'Directorate General of Health Services (DGHS)',
    title: 'Senior Clinical Adjudicator',
    station: 'National Health Data Center, Dhaka',
    licenseRef: 'BMDC-REG-44821',
  },
  {
    verifierNumber: 'VRF-FIELD-01',
    name: 'Salma Khatun',
    role: 'FIELD_VERIFIER',
    organization: 'BRAC Microfinance Health Protection Cell',
    title: 'Senior Field Coordinator & Bedside Verifier',
    station: 'Dhaka Division Rural Cluster',
    licenseRef: 'MRA-AGENT-99214',
  },
];
