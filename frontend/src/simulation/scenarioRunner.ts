import { TransitionState } from './transitions';
import { getInitialSeedState } from '../data/seedData';
import { PRIMARY_USER } from '../data/users';
import { MOCK_PROVIDERS } from '../data/providers';
import { MOCK_INSURERS } from '../data/insurers';
import { generateId, computeEventKey, computeNIDCommitment } from '../lib/ids';
import { getCurrentAdmissionWindow, formatDateTime } from '../lib/dates';
import { ScenarioId } from '../types/simulation';
import { InsurableEvent } from '../types/event';
import { Entitlement } from '../types/entitlement';

export function prepareScenarioState(scenarioId: ScenarioId): TransitionState {
  const base = getInitialSeedState();
  const nowStr = formatDateTime(new Date().toISOString());
  const currentWindow = getCurrentAdmissionWindow();
  const eventKey = computeEventKey(PRIMARY_USER.nidCommitment, currentWindow);

  switch (scenarioId) {
    case 'DUPLICATE_EVENT': {
      // Create an existing open event EVT-1001
      const existingEvent: InsurableEvent = {
        id: 'EVT-1001',
        eventKey,
        holderId: PRIMARY_USER.id,
        holderName: PRIMARY_USER.name,
        holderNIDCommitment: PRIMARY_USER.nidCommitment,
        admissionWindow: currentWindow,
        providerId: MOCK_PROVIDERS[0].id,
        facilityName: MOCK_PROVIDERS[0].name,
        status: 'OPEN',
        diagnosisCode: 'ICD-10-K35.8',
        diagnosisCategory: 'Acute Appendicitis Hospitalization',
        segments: [
          {
            id: 'SEG-1001',
            providerId: MOCK_PROVIDERS[0].id,
            facilityName: MOCK_PROVIDERS[0].name,
            admittedAt: nowStr,
            type: 'INITIAL',
          },
        ],
        attestations: [
          {
            id: 'ATT-1001',
            eventId: 'EVT-1001',
            actorId: MOCK_PROVIDERS[0].id,
            actorName: MOCK_PROVIDERS[0].name,
            actorClass: 'PROVIDER',
            timestamp: nowStr,
            status: 'VALID',
          },
        ],
        timeline: [
          {
            id: 'TL-1001',
            timestamp: nowStr,
            title: 'Initial Assertion',
            description: `Event EVT-1001 opened by ${MOCK_PROVIDERS[0].name}`,
            actorRole: 'PROVIDER',
            actorName: MOCK_PROVIDERS[0].name,
            type: 'INFO',
          },
        ],
        createdAt: nowStr,
      };

      return {
        ...base,
        events: [existingEvent],
      };
    }

    case 'DUAL_COVERAGE': {
      const dualEvent: InsurableEvent = {
        id: 'EVT-1001',
        eventKey,
        holderId: PRIMARY_USER.id,
        holderName: PRIMARY_USER.name,
        holderNIDCommitment: PRIMARY_USER.nidCommitment,
        admissionWindow: currentWindow,
        providerId: MOCK_PROVIDERS[0].id,
        facilityName: MOCK_PROVIDERS[0].name,
        status: 'CLOSED_ELIGIBLE',
        diagnosisCode: 'ICD-10-S82.1',
        diagnosisCategory: 'Fracture of Lower Leg Surgery',
        segments: [
          {
            id: 'SEG-1001',
            providerId: MOCK_PROVIDERS[0].id,
            facilityName: MOCK_PROVIDERS[0].name,
            admittedAt: nowStr,
            type: 'INITIAL',
          },
        ],
        attestations: [
          {
            id: 'ATT-1',
            eventId: 'EVT-1001',
            actorId: MOCK_PROVIDERS[0].id,
            actorName: MOCK_PROVIDERS[0].name,
            actorClass: 'PROVIDER',
            timestamp: nowStr,
            status: 'VALID',
          },
          {
            id: 'ATT-2',
            eventId: 'EVT-1001',
            actorId: 'CLINICAL-01',
            actorName: 'Dr. Shahriar Rahman',
            actorClass: 'CLINICAL',
            timestamp: nowStr,
            status: 'VALID',
          },
        ],
        timeline: [
          {
            id: 'TL-1',
            timestamp: nowStr,
            title: '2-of-3 Quorum Satisfied',
            description: 'Event marked CLOSED_ELIGIBLE for multi-insurer entitlement claims.',
            actorRole: 'CLINICAL_VERIFIER',
            actorName: 'Dr. Shahriar Rahman',
            type: 'SUCCESS',
          },
        ],
        createdAt: nowStr,
      };

      const entitlement1: Entitlement = {
        id: 'ENT-POL-1001',
        eventId: 'EVT-1001',
        policyId: 'POL-1001',
        insurerId: MOCK_INSURERS[0].id,
        insurerName: MOCK_INSURERS[0].name,
        amount: 30000,
        status: 'SETTLED',
        authorizedAt: nowStr,
      };

      const entitlement2: Entitlement = {
        id: 'ENT-POL-1002',
        eventId: 'EVT-1001',
        policyId: 'POL-1002',
        insurerId: MOCK_INSURERS[1].id,
        insurerName: MOCK_INSURERS[1].name,
        amount: 20000,
        status: 'OPEN',
      };

      return {
        ...base,
        events: [dualEvent],
        entitlements: [entitlement1, entitlement2],
      };
    }

    case 'INSUFFICIENT_QUORUM': {
      const openEvent: InsurableEvent = {
        id: 'EVT-1001',
        eventKey,
        holderId: PRIMARY_USER.id,
        holderName: PRIMARY_USER.name,
        holderNIDCommitment: PRIMARY_USER.nidCommitment,
        admissionWindow: currentWindow,
        providerId: MOCK_PROVIDERS[0].id,
        facilityName: MOCK_PROVIDERS[0].name,
        status: 'OPEN',
        diagnosisCode: 'ICD-10-J18.9',
        diagnosisCategory: 'Severe Pneumonia Admission',
        segments: [
          {
            id: 'SEG-1',
            providerId: MOCK_PROVIDERS[0].id,
            facilityName: MOCK_PROVIDERS[0].name,
            admittedAt: nowStr,
            type: 'INITIAL',
          },
        ],
        attestations: [
          {
            id: 'ATT-1',
            eventId: 'EVT-1001',
            actorId: MOCK_PROVIDERS[0].id,
            actorName: MOCK_PROVIDERS[0].name,
            actorClass: 'PROVIDER',
            timestamp: nowStr,
            status: 'VALID',
          },
        ],
        timeline: [
          {
            id: 'TL-1',
            timestamp: nowStr,
            title: 'Provider Attestation Recorded (1/3 Quorum)',
            description: 'Awaiting independent non-payee class attestation before eligibility.',
            actorRole: 'PROVIDER',
            actorName: MOCK_PROVIDERS[0].name,
            type: 'WARNING',
          },
        ],
        createdAt: nowStr,
      };

      return {
        ...base,
        events: [openEvent],
      };
    }

    case 'DENIAL_AND_APPEAL': {
      const deniedEvent: InsurableEvent = {
        id: 'EVT-1001',
        eventKey,
        holderId: PRIMARY_USER.id,
        holderName: PRIMARY_USER.name,
        holderNIDCommitment: PRIMARY_USER.nidCommitment,
        admissionWindow: currentWindow,
        providerId: MOCK_PROVIDERS[0].id,
        facilityName: MOCK_PROVIDERS[0].name,
        status: 'CLOSED_ELIGIBLE',
        diagnosisCode: 'ICD-10-K35.8',
        diagnosisCategory: 'Acute Appendicitis Hospitalization',
        segments: [
          {
            id: 'SEG-1',
            providerId: MOCK_PROVIDERS[0].id,
            facilityName: MOCK_PROVIDERS[0].name,
            admittedAt: nowStr,
            type: 'INITIAL',
          },
        ],
        attestations: [
          {
            id: 'ATT-1',
            eventId: 'EVT-1001',
            actorId: MOCK_PROVIDERS[0].id,
            actorName: MOCK_PROVIDERS[0].name,
            actorClass: 'PROVIDER',
            timestamp: nowStr,
            status: 'VALID',
          },
          {
            id: 'ATT-2',
            eventId: 'EVT-1001',
            actorId: 'CLINICAL-01',
            actorName: 'Dr. Shahriar Rahman',
            actorClass: 'CLINICAL',
            timestamp: nowStr,
            status: 'VALID',
          },
        ],
        timeline: [
          {
            id: 'TL-1',
            timestamp: nowStr,
            title: 'Entitlement Denied by Insurer',
            description: 'Denied under Code ERR_EXCLUSION_PERIOD.',
            actorRole: 'INSURER',
            actorName: MOCK_INSURERS[0].name,
            type: 'ALERT',
          },
        ],
        createdAt: nowStr,
      };

      const deniedEntitlement: Entitlement = {
        id: 'ENT-1001',
        eventId: 'EVT-1001',
        policyId: 'POL-1001',
        insurerId: MOCK_INSURERS[0].id,
        insurerName: MOCK_INSURERS[0].name,
        amount: 50000,
        status: 'DENIED',
        denialReason: 'ERR_EXCLUSION_PERIOD: Claimed within 30-day pre-existing waiting period.',
      };

      return {
        ...base,
        events: [deniedEvent],
        entitlements: [deniedEntitlement],
      };
    }

    default:
      return base;
  }
}

