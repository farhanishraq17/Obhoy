import { InsurableEvent, Attestation, EventSegment, EventStatus } from '../types/event';
import { Policy } from '../types/policy';
import { Entitlement } from '../types/entitlement';
import { Settlement } from '../types/settlement';
import { Appeal } from '../types/transparency';
import { TimelineEntry } from '../types/transparency';
import { validateEventUniqueness, validateQuorum, validateEntitlementCap } from './validators';
import { generateId, computeEventKey } from '../lib/ids';
import { getCurrentAdmissionWindow, formatDateTime } from '../lib/dates';
import { UserProfile, ProviderEntity, InsurerEntity } from '../types/actor';

export interface TransitionState {
  policies: Policy[];
  events: InsurableEvent[];
  entitlements: Entitlement[];
  settlements: Settlement[];
  appeals: Appeal[];
}

export function openEventTransition(
  state: TransitionState,
  user: UserProfile,
  provider: ProviderEntity,
  diagnosisCode: string = 'ICD-10-K35.8',
  diagnosisCategory: string = 'Acute Appendicitis Hospitalization',
  admissionTimestamp?: string
): { nextState: TransitionState; result: { success: boolean; eventId?: string; message: string; code?: string } } {
  const window = admissionTimestamp
    ? (admissionTimestamp.includes('T') ? admissionTimestamp.split('T')[0] : admissionTimestamp.slice(0, 10))
    : getCurrentAdmissionWindow();
  const eventKey = computeEventKey(user.nidCommitment, window);

  // Validate uniqueness
  const uniquenessCheck = validateEventUniqueness(state.events, eventKey, window, user.nidCommitment);
  if (!uniquenessCheck.valid) {
    return {
      nextState: state,
      result: {
        success: false,
        message: uniquenessCheck.reason || 'Duplicate event detected.',
        code: uniquenessCheck.code,
      },
    };
  }

  const newEventId = generateId('EVT');
  const nowStr = formatDateTime(new Date().toISOString());

  const initialAttestation: Attestation = {
    id: generateId('ATT'),
    eventId: newEventId,
    actorId: provider.id,
    actorName: provider.name,
    actorClass: 'PROVIDER',
    timestamp: nowStr,
    status: 'VALID',
    evidenceRef: 'HMIS-ADM-994821',
  };

  const initialSegment: EventSegment = {
    id: generateId('SEG'),
    providerId: provider.id,
    facilityName: provider.name,
    admittedAt: nowStr,
    type: 'INITIAL',
    notes: 'Admitted via Emergency Ward',
  };

  const timelineEntry: TimelineEntry = {
    id: generateId('TL'),
    timestamp: nowStr,
    title: 'Event Open & Provider Assertion',
    description: `Single-use asset ${newEventId} opened by ${provider.name}. Uniqueness key verified.`,
    actorRole: 'PROVIDER',
    actorName: provider.name,
    status: 'OPEN',
    type: 'INFO',
    hash: eventKey.slice(0, 16),
  };

  const newEvent: InsurableEvent = {
    id: newEventId,
    eventKey,
    holderId: user.id,
    holderName: user.name,
    holderNIDCommitment: user.nidCommitment,
    admissionWindow: window,
    providerId: provider.id,
    facilityName: provider.name,
    status: 'OPEN',
    diagnosisCode,
    diagnosisCategory,
    segments: [initialSegment],
    attestations: [initialAttestation],
    timeline: [timelineEntry],
    createdAt: nowStr,
  };

  return {
    nextState: {
      ...state,
      events: [newEvent, ...state.events],
    },
    result: {
      success: true,
      eventId: newEventId,
      message: `Event ${newEventId} successfully opened on Obhoy protocol registry.`,
    },
  };
}

export function continueEventTransition(
  state: TransitionState,
  eventId: string,
  receivingProvider: ProviderEntity,
  notes: string = 'Inter-facility transfer to higher-tier hospital'
): { nextState: TransitionState; result: { success: boolean; message: string } } {
  const targetEvent = state.events.find((e) => e.id === eventId);
  if (!targetEvent) {
    return { nextState: state, result: { success: false, message: 'Event not found.' } };
  }

  const nowStr = formatDateTime(new Date().toISOString());

  const newSegment: EventSegment = {
    id: generateId('SEG'),
    providerId: receivingProvider.id,
    facilityName: receivingProvider.name,
    admittedAt: nowStr,
    type: 'TRANSFER',
    notes,
  };

  const timelineEntry: TimelineEntry = {
    id: generateId('TL'),
    timestamp: nowStr,
    title: 'Inter-Facility Transfer (continueEvent)',
    description: `Transfer segment added by ${receivingProvider.name}. Preserves single event key without minting duplicate.`,
    actorRole: 'PROVIDER',
    actorName: receivingProvider.name,
    status: targetEvent.status,
    type: 'INFO',
  };

  const updatedEvents = state.events.map((e) => {
    if (e.id === eventId) {
      return {
        ...e,
        segments: [...e.segments, newSegment],
        timeline: [timelineEntry, ...e.timeline],
      };
    }
    return e;
  });

  return {
    nextState: { ...state, events: updatedEvents },
    result: { success: true, message: `Transfer segment attached to ${eventId}.` },
  };
}

export function attestEventTransition(
  state: TransitionState,
  eventId: string,
  actorId: string,
  actorName: string,
  actorClass: 'PROVIDER' | 'CLINICAL' | 'FIELD',
  evidenceRef?: string
): { nextState: TransitionState; result: { success: boolean; quorumSatisfied: boolean; message: string } } {
  const targetEvent = state.events.find((e) => e.id === eventId);
  if (!targetEvent) {
    return {
      nextState: state,
      result: { success: false, quorumSatisfied: false, message: 'Event not found.' },
    };
  }

  const nowStr = formatDateTime(new Date().toISOString());

  const newAttestation: Attestation = {
    id: generateId('ATT'),
    eventId,
    actorId,
    actorName,
    actorClass,
    timestamp: nowStr,
    status: 'VALID',
    evidenceRef: evidenceRef || (actorClass === 'CLINICAL' ? 'HMIS-DIAG-88219' : 'FIELD-VERIF-9912'),
  };

  const updatedAttestations = [...targetEvent.attestations, newAttestation];
  const quorumCheck = validateQuorum(updatedAttestations);

  const newStatus = quorumCheck.satisfied ? 'CLOSED_ELIGIBLE' : 'OPEN';

  const timelineEntry: TimelineEntry = {
    id: generateId('TL'),
    timestamp: nowStr,
    title: `${actorClass} Attestation Submitted`,
    description: `Submitted by ${actorName}. Quorum state: ${quorumCheck.validClassesCount}/3 classes (${quorumCheck.satisfied ? 'SATISFIED' : 'PENDING'}).`,
    actorRole: actorClass === 'CLINICAL' ? 'CLINICAL_VERIFIER' : 'FIELD_VERIFIER',
    actorName,
    status: newStatus,
    type: quorumCheck.satisfied ? 'SUCCESS' : 'INFO',
  };

  let updatedEntitlements = state.entitlements;

  // If quorum satisfied, automatically create entitlement for policyholder's active policy if not exists
  if (quorumCheck.satisfied && targetEvent.status !== 'CLOSED_ELIGIBLE') {
    const existingEntitlement = state.entitlements.find((ent) => ent.eventId === eventId);
    if (!existingEntitlement) {
      const newEntitlement: Entitlement = {
        id: generateId('ENT'),
        eventId,
        policyId: 'POL-1001',
        insurerId: 'INS-001',
        insurerName: 'Green Delta Insurance PLC',
        amount: 50000,
        status: 'OPEN',
      };
      updatedEntitlements = [newEntitlement, ...state.entitlements];
    }
  }

  const updatedEvents = state.events.map((e) => {
    if (e.id === eventId) {
      return {
        ...e,
        status: newStatus as EventStatus,
        attestations: updatedAttestations,
        timeline: [timelineEntry, ...e.timeline],
      };
    }
    return e;
  });

  return {
    nextState: {
      ...state,
      events: updatedEvents,
      entitlements: updatedEntitlements,
    },
    result: {
      success: true,
      quorumSatisfied: quorumCheck.satisfied,
      message: quorumCheck.satisfied
        ? `Quorum satisfied! Event ${eventId} moved to CLOSED_ELIGIBLE.`
        : `Attestation recorded (${quorumCheck.validClassesCount}/3 classes). Quorum pending.`,
    },
  };
}

export function authorizeEntitlementTransition(
  state: TransitionState,
  entitlementId: string,
  approvedAmount?: number
): { nextState: TransitionState; result: { success: boolean; settlementId?: string; message: string } } {
  const targetEnt = state.entitlements.find((e) => e.id === entitlementId);
  if (!targetEnt) {
    return { nextState: state, result: { success: false, message: 'Entitlement not found.' } };
  }

  const amount = approvedAmount || targetEnt.amount;
  const nowStr = formatDateTime(new Date().toISOString());

  const newSettlement: Settlement = {
    id: generateId('SET'),
    entitlementId,
    amount,
    rail: 'BKASH',
    status: 'AUTHORIZED',
    requestedAt: nowStr,
    recipientMobile: '+880 1712-345678',
  };

  const updatedEntitlements = state.entitlements.map((ent) => {
    if (ent.id === entitlementId) {
      return {
        ...ent,
        amount,
        status: 'AUTHORIZED' as const,
        authorizedAt: nowStr,
      };
    }
    return ent;
  });

  // Add timeline entry to parent event
  const updatedEvents = state.events.map((evt) => {
    if (evt.id === targetEnt.eventId) {
      const timelineEntry: TimelineEntry = {
        id: generateId('TL'),
        timestamp: nowStr,
        title: 'Entitlement Authorized by Insurer',
        description: `${targetEnt.insurerName} authorized BDT ${amount.toLocaleString()} for entitlement ${entitlementId}.`,
        actorRole: 'INSURER' as const,
        actorName: targetEnt.insurerName,
        status: 'AUTHORIZED',
        type: 'SUCCESS',
      };
      return {
        ...evt,
        timeline: [timelineEntry, ...evt.timeline],
      };
    }
    return evt;
  });

  return {
    nextState: {
      ...state,
      events: updatedEvents,
      entitlements: updatedEntitlements,
      settlements: [newSettlement, ...state.settlements],
    },
    result: {
      success: true,
      settlementId: newSettlement.id,
      message: `Entitlement ${entitlementId} authorized for BDT ${amount.toLocaleString()}. Settlement created.`,
    },
  };
}

export function processSettlementTransition(
  state: TransitionState,
  settlementId: string,
  simulateTimeout: boolean = false
): { nextState: TransitionState; result: { success: boolean; reference?: string; message: string } } {
  const targetSettlement = state.settlements.find((s) => s.id === settlementId);
  if (!targetSettlement) {
    return { nextState: state, result: { success: false, message: 'Settlement not found.' } };
  }

  const nowStr = formatDateTime(new Date().toISOString());

  if (simulateTimeout) {
    const updatedSettlements = state.settlements.map((s) => {
      if (s.id === settlementId) {
        return {
          ...s,
          status: 'RECONCILIATION_REQUIRED' as const,
        };
      }
      return s;
    });

    return {
      nextState: { ...state, settlements: updatedSettlements },
      result: {
        success: false,
        message: 'MFS Rail Timeout! Settlement marked RECONCILIATION_REQUIRED to prevent duplicate payout.',
      },
    };
  }

  const reference = `BKASH-TXN-${Math.floor(100000 + Math.random() * 900000)}`;

  const updatedSettlements = state.settlements.map((s) => {
    if (s.id === settlementId) {
      return {
        ...s,
        status: 'SETTLED' as const,
        reference,
        settledAt: nowStr,
      };
    }
    return s;
  });

  const updatedEntitlements = state.entitlements.map((e) => {
    if (e.id === targetSettlement.entitlementId) {
      return { ...e, status: 'SETTLED' as const };
    }
    return e;
  });

  const targetEnt = state.entitlements.find((e) => e.id === targetSettlement.entitlementId);

  const updatedEvents = state.events.map((evt) => {
    if (targetEnt && evt.id === targetEnt.eventId) {
      const timelineEntry: TimelineEntry = {
        id: generateId('TL'),
        timestamp: nowStr,
        title: 'Settlement Disbursed via bKash',
        description: `Payment of BDT ${targetSettlement.amount.toLocaleString()} completed. Reference: ${reference}.`,
        actorRole: 'INSURER' as const,
        actorName: 'bKash MFS Gateway',
        status: 'SETTLED',
        type: 'SUCCESS',
        hash: reference,
      };
      return {
        ...evt,
        timeline: [timelineEntry, ...evt.timeline],
      };
    }
    return evt;
  });

  return {
    nextState: {
      ...state,
      events: updatedEvents,
      entitlements: updatedEntitlements,
      settlements: updatedSettlements,
    },
    result: {
      success: true,
      reference,
      message: `Payment of BDT ${targetSettlement.amount.toLocaleString()} successfully disbursed via bKash (${reference}).`,
    },
  };
}
