import { create } from 'zustand';
import { InsurableEvent } from '../types/event';
import { Policy } from '../types/policy';
import { Entitlement } from '../types/entitlement';
import { Settlement } from '../types/settlement';
import { Appeal, AuditRecord } from '../types/transparency';
import { UserProfile, ProviderEntity } from '../types/actor';
import { MOCK_PROVIDERS } from '../data/providers';
import {
  openEventTransition,
  continueEventTransition,
  attestEventTransition,
  authorizeEntitlementTransition,
  processSettlementTransition,
} from '../simulation/transitions';
import { prepareScenarioState } from '../simulation/scenarioRunner';
import { loadStoredState, saveStoredState } from '../lib/storage';
import { generateId, computeEventKey } from '../lib/ids';
import { formatDateTime, getCurrentAdmissionWindow } from '../lib/dates';
import { ScenarioId } from '../types/simulation';
import { api, FabricMSP } from '../lib/api';

export const INITIAL_AUDIT_LOGS: AuditRecord[] = [
  {
    id: 'AUD-88295',
    type: 'ANCHOR_PUBLISHED',
    entityId: 'ROOT-2026-09-A',
    actorRole: 'CONSORTIUM',
    actorName: 'Consortium Anchor Service',
    timestamp: '2026-09-03 18:21:04',
    description: 'Monthly transparency root anchored to external chain with OpenTimestamps cryptographic attestation.',
    evidenceHash: '0x7a8c91ef230b44199cba7712e091af',
    channel: 'audit-channel',
  },
  {
    id: 'AUD-88294',
    type: 'APPEAL_RESOLVED',
    entityId: 'APL-4992',
    actorRole: 'TRIBUNAL',
    actorName: 'Independent Arbitration Tribunal',
    timestamp: '2026-09-03 18:18:32',
    description: 'Tribunal voted 3-0 to OVERTURN insurer denial for ENT-9592. Entitlement reinstated on ledger.',
    previousState: 'UNDER_REVIEW',
    newState: 'OVERTURNED',
    evidenceHash: '0x91ab73fe8801ce4411993410a82b',
    channel: 'audit-channel',
  },
  {
    id: 'AUD-88293',
    type: 'SLA_BREACH',
    entityId: 'INS-002',
    actorRole: 'CONSORTIUM',
    actorName: 'SLA Supervisory Monitor',
    timestamp: '2026-09-03 18:12:09',
    description: 'Settlement delay exceeded 3-day SLA (observed 5.4 days median for Pragati Insurance).',
    evidenceHash: '0x33b1e90a8844f21098a72bcda5',
    channel: 'audit-channel',
  },
  {
    id: 'AUD-88292',
    type: 'SETTLEMENT_CONFIRMED',
    entityId: 'SET-9410',
    actorRole: 'GATEWAY',
    actorName: 'bKash MFS Disbursement Adapter',
    timestamp: '2026-09-03 17:45:11',
    description: 'Settlement payout BDT 45,000 confirmed to recipient 01711223344. Idempotency key verified.',
    previousState: 'PROCESSING',
    newState: 'SETTLED',
    evidenceHash: '0x8892bcda7710fa99002341bcef',
    channel: 'audit-channel',
  },
  {
    id: 'AUD-88291',
    type: 'QUORUM_REACHED',
    entityId: 'EVT-8187',
    actorRole: 'CONSORTIUM',
    actorName: 'Fabric Consensus Peer',
    timestamp: '2026-09-03 16:30:22',
    description: 'Multi-class attestation quorum satisfied (2-of-3: ProviderMSP + ClinicalMSP). Event transitioned to CLOSED_ELIGIBLE.',
    previousState: 'OPEN',
    newState: 'CLOSED_ELIGIBLE',
    evidenceHash: '0x6d0e01e663cdbe21f8e6af017e',
    channel: 'audit-channel',
  },
  {
    id: 'AUD-88290',
    type: 'EVENT_CREATED',
    entityId: 'EVT-8187',
    actorRole: 'PROVIDER',
    actorName: 'ABC Upazila Health Complex',
    timestamp: '2026-09-03 16:15:00',
    description: 'Insurable admission event asserted under admission window 2026-09-01. Uniqueness check passed.',
    evidenceHash: '0x448a91bc7720e1189acbe012',
    channel: 'audit-channel',
  },
];

interface SimulationState {
  events: InsurableEvent[];
  policies: Policy[];
  entitlements: Entitlement[];
  settlements: Settlement[];
  appeals: Appeal[];
  providers: ProviderEntity[];
  auditLogs: AuditRecord[];
  anchorVerified: boolean;
  backendConnected: boolean;

  // Engine Actions
  syncWithBackend: () => Promise<void>;
  resetSimulation: (scenarioId?: ScenarioId) => void;
  openEvent: (
    user: UserProfile,
    provider: ProviderEntity,
    diagnosisCode?: string,
    category?: string,
    admissionTimestamp?: string
  ) => Promise<{ success: boolean; eventId?: string; message: string; code?: string }>;
  continueEvent: (eventId: string, provider: ProviderEntity, notes?: string) => Promise<{ success: boolean; message: string }>;
  attestEvent: (
    eventId: string,
    actorId: string,
    actorName: string,
    actorClass: 'PROVIDER' | 'CLINICAL' | 'FIELD',
    evidenceRef?: string
  ) => Promise<{ success: boolean; quorumSatisfied: boolean; message: string }>;
  authorizeEntitlement: (entitlementId: string, amount?: number) => Promise<{ success: boolean; settlementId?: string; message: string }>;
  denyEntitlement: (entitlementId: string, reason: string, explanation?: string) => Promise<{ success: boolean; message: string }>;
  processSettlement: (settlementId: string, simulateTimeout?: boolean) => Promise<{ success: boolean; reference?: string; message: string }>;
  reconcileSettlement: (settlementId: string) => Promise<{ success: boolean; reference?: string; message: string }>;
  submitAppeal: (entitlementId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  resolveAppeal: (appealId: string, decision: 'UPHELD' | 'OVERTURNED', reasoning?: string) => Promise<{ success: boolean; message: string }>;
  suspendProvider: (providerId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  reinstateProvider: (providerId: string) => Promise<{ success: boolean; message: string }>;
  verifyAnchor: () => Promise<{ success: boolean; message: string }>;
}

const initialState = loadStoredState(prepareScenarioState('HAPPY_PATH'));

export const useSimulationStore = create<SimulationState>((set, get) => ({
  ...initialState,
  providers: (initialState as any).providers || MOCK_PROVIDERS,
  auditLogs: (initialState as any).auditLogs || INITIAL_AUDIT_LOGS,
  anchorVerified: true,
  backendConnected: false,

  syncWithBackend: async () => {
    try {
      const healthRes = await api.health();
      if (!healthRes.ok) {
        set({ backendConnected: false });
        return;
      }
      set({ backendConnected: true });

      // Fetch live events from chaincode
      const eventsRes = await api.events();
      if (eventsRes.ok && Array.isArray(eventsRes.result)) {
        const liveEvents: InsurableEvent[] = eventsRes.result.map((ev: any) => ({
          id: ev.EventID || ev.id,
          eventKey: ev.EventKey || `EVTKEY-${(ev.EventID || 'EVT').slice(-6)}`,
          holderId: 'USR-RAHIM-1001',
          holderName: 'Rahim Uddin',
          holderNIDCommitment: ev.SubjectCommitment || '6d0e01e663cdbe21f8e6af017ebfd560ed6a4ac7279ff1748aa2af1e8454da4c',
          admissionWindow: ev.AdmissionWindow || new Date().toISOString().slice(0, 10),
          providerId: ev.AsserterID || 'HOSP-01',
          facilityName: ev.AsserterID || 'ABC Upazila Health Complex',
          status: (ev.State === 'CLOSED_ELIGIBLE' ? 'CLOSED_ELIGIBLE' : ev.State === 'EXPIRED' ? 'EXPIRED' : 'OPEN'),
          diagnosisCategory: ev.CategoryCode || 'Acute Appendicitis Hospitalization',
          diagnosisCode: ev.CategoryCode || 'K35.80',
          segments: (ev.Segments || []).map((seg: any) => ({
            id: generateId('SEG'),
            providerId: seg.ProviderID || 'HOSP-01',
            facilityName: seg.ProviderID || 'ABC Upazila Health Complex',
            admittedAt: seg.Timestamp ? new Date(seg.Timestamp * 1000).toISOString() : new Date().toISOString(),
            type: (seg.Kind === 'TRANSFER' ? 'TRANSFER' : 'INITIAL'),
            notes: seg.AttestedBy || 'Segment record',
          })),
          attestations: (ev.Attestations || []).map((att: any) => ({
            id: generateId('ATT'),
            eventId: ev.EventID || ev.id,
            actorId: att.AttesterID || 'CLIN-01',
            actorName: att.AttesterID || 'Attester',
            actorClass: (att.Class === 'FIELD' ? 'FIELD' : att.Class === 'PROVIDER' ? 'PROVIDER' : 'CLINICAL'),
            timestamp: att.Timestamp ? new Date(att.Timestamp * 1000).toISOString() : new Date().toISOString(),
            status: 'VALID',
            evidenceRef: att.SigRef,
          })),
          timeline: [
            {
              id: generateId('TL'),
              title: 'Event Recorded On-Chain',
              description: `Event ${ev.EventID || ev.id} registered on Hyperledger Fabric ledger`,
              timestamp: ev.OpenTS ? new Date(ev.OpenTS * 1000).toISOString() : new Date().toISOString(),
              actorRole: 'PROVIDER',
              actorName: ev.AsserterID || 'ABC Upazila Health Complex',
              type: 'SUCCESS',
            },
          ],
          createdAt: ev.OpenTS ? new Date(ev.OpenTS * 1000).toISOString() : new Date().toISOString(),
        }));

        if (liveEvents.length > 0) {
          set({ events: liveEvents });
        }
      }
    } catch {
      set({ backendConnected: false });
    }
  },

  resetSimulation: (scenarioId = 'HAPPY_PATH') => {
    const newState = prepareScenarioState(scenarioId);
    saveStoredState(newState);
    set(newState);
  },

  openEvent: async (user, provider, diagnosisCode, category, admissionTimestamp) => {
    const currentState = {
      events: get().events,
      policies: get().policies,
      entitlements: get().entitlements,
      settlements: get().settlements,
      appeals: get().appeals,
    };

    const window = admissionTimestamp
      ? (admissionTimestamp.includes('T') ? admissionTimestamp.split('T')[0] : admissionTimestamp.slice(0, 10))
      : getCurrentAdmissionWindow();

    const currentCommitment = user.nidCommitment;
    const computedKey = computeEventKey(currentCommitment, window);

    // 1. Check if an event already exists for this subject with the SAME admission window
    const matchingDuplicate = currentState.events.find(
      (e) => (e.admissionWindow === window || e.eventKey === computedKey) &&
             (e.status === 'OPEN' || e.status === 'CLOSED_ELIGIBLE')
    );

    if (matchingDuplicate) {
      return {
        success: false,
        code: 'ERR_DUPLICATE_OPEN_EVENT',
        message: `Deterministic uniqueness key H(SubjectCommitment || admissionWindow) refused duplicate creation for admission window ${window}.`,
      };
    }

    // 2. Different date: proceed with opening a new event
    try {
      if (get().backendConnected) {
        const providerMspMap: Record<string, string> = {
          'PRV-UPAZILA-101': 'HOSP-UPAZILA-KLG',
          'PRV-DISTRICT-202': 'HOSP-DISTRICT-GZP',
          'PRV-FLAGGED-303': 'HOSP-PRIVATE-SVR',
        };
        const chainProviderId = providerMspMap[provider.id] || 'HOSP-UPAZILA-KLG';

        let chainCategory = 'H-SURG-03';
        if (category?.includes('Appendicitis') || category?.includes('Surgery')) chainCategory = 'H-SURG-03';
        else if (category?.includes('Fracture') || category?.includes('Leg')) chainCategory = 'H-INJ-05';
        else if (category?.includes('Pneumonia') || category?.includes('RESP')) chainCategory = 'H-RESP-02';
        else if (category?.includes('Cardiac') || category?.includes('Heart')) chainCategory = 'H-CARD-01';

        const openRes = await api.openEvent({
          line: 'HEALTH',
          subjectCommitment: currentCommitment,
          admissionWindow: window,
          asserterId: chainProviderId,
          categoryCode: chainCategory,
          assessedLoss: 4500000,
          benefitCapAggregate: 5000000,
        });

        if (openRes.ok && openRes.result?.eventId) {
          const chainEventId = openRes.result.eventId;
          const { nextState, result } = openEventTransition(currentState, user, provider, diagnosisCode, category, admissionTimestamp);
          if (result.success && nextState.events.length > 0) {
            nextState.events[0].id = chainEventId;
            saveStoredState(nextState);
            set(nextState);
          }
          return { success: true, eventId: chainEventId, message: 'Event successfully opened on ledger.' };
        } else if (openRes.error?.includes('already exists in state') || openRes.error?.includes('a consumed key is never re-opened')) {
          return {
            success: false,
            code: 'ERR_DUPLICATE_OPEN_EVENT',
            message: openRes.error,
          };
        }
      }
    } catch {
      // Backend error fallback to local transition
    }

    // Local state transition: Create new event
    const { nextState, result } = openEventTransition(currentState, user, provider, diagnosisCode, category, admissionTimestamp);
    if (result.success) {
      saveStoredState(nextState);
      set(nextState);
    }
    return result;
  },

  continueEvent: async (eventId, provider, notes) => {
    try {
      await api.continueEvent({
        EventID: eventId,
        ProviderID: provider.id,
        Kind: 'TRANSFER',
        AttestedBy: provider.name,
      });
    } catch {
      // ignore network errors for local state
    }

    const currentState = {
      events: get().events,
      policies: get().policies,
      entitlements: get().entitlements,
      settlements: get().settlements,
      appeals: get().appeals,
    };

    const { nextState, result } = continueEventTransition(currentState, eventId, provider, notes);
    if (result.success) {
      saveStoredState(nextState);
      set(nextState);
    }
    return result;
  },

  attestEvent: async (eventId, actorId, actorName, actorClass, evidenceRef) => {
    try {
      const msp: FabricMSP = actorClass === 'CLINICAL' ? 'ClinicalMSP' : actorClass === 'FIELD' ? 'FieldMSP' : 'ProviderMSP';
      await api.attestEvent({
        EventID: eventId,
        AttesterID: actorId,
        SigRef: evidenceRef || `SIG-${actorId}-${Date.now().toString().slice(-4)}`,
      }, msp);
    } catch {
      // fallback
    }

    const currentState = {
      events: get().events,
      policies: get().policies,
      entitlements: get().entitlements,
      settlements: get().settlements,
      appeals: get().appeals,
    };

    const { nextState, result } = attestEventTransition(currentState, eventId, actorId, actorName, actorClass, evidenceRef);
    saveStoredState(nextState);
    set(nextState);
    return result;
  },

  authorizeEntitlement: async (entitlementId, amount) => {
    try {
      await api.adjudicate(entitlementId, 'InsurerAMSP');
    } catch {
      // fallback
    }

    const currentState = {
      events: get().events,
      policies: get().policies,
      entitlements: get().entitlements,
      settlements: get().settlements,
      appeals: get().appeals,
    };

    const { nextState, result } = authorizeEntitlementTransition(currentState, entitlementId, amount);
    if (result.success) {
      saveStoredState(nextState);
      set(nextState);
    }
    return result;
  },

  processSettlement: async (settlementId, simulateTimeout = false) => {
    const currentState = {
      events: get().events,
      policies: get().policies,
      entitlements: get().entitlements,
      settlements: get().settlements,
      appeals: get().appeals,
    };

    const stm = currentState.settlements.find((s) => s.id === settlementId);

    // Step 1: Call off-chain MFS Adapter (:7562)
    try {
      if (stm && !simulateTimeout) {
        const mfsRes = await api.offchain.disburse({
          requestId: `REQ-${stm.id}`,
          payload: {
            msisdn: '01700000000',
            amount: (stm.amount || 50000) * 100, // paisa
            entitlementId: stm.entitlementId,
          },
        });

        if (mfsRes.ok && mfsRes.receipt?.receiptId) {
          // Step 2: Settle on blockchain with the payload-bound receiptId
          await api.authoriseSettlement(stm.entitlementId, mfsRes.receipt.receiptId, 'InsurerAMSP');
        }
      }
    } catch {
      // fallback to local transition
    }

    const { nextState, result } = processSettlementTransition(currentState, settlementId, simulateTimeout);
    saveStoredState(nextState);
    set(nextState);
    return result;
  },

  submitAppeal: async (entitlementId, reason) => {
    try {
      await api.appeal(entitlementId);
    } catch {
      // fallback
    }

    const ent = get().entitlements.find((e) => e.id === entitlementId);
    if (!ent) return { success: false, message: 'Entitlement not found' };

    const nowStr = formatDateTime(new Date().toISOString());
    const newAppeal: Appeal = {
      id: generateId('APL'),
      entitlementId,
      eventId: ent.eventId,
      holderId: 'USR-RAHIM-1001',
      holderName: 'Rahim Uddin',
      status: 'SUBMITTED',
      reason,
      panel: ['Academic Auditor (DU)', 'Consumer Rights Assoc', 'IDRA Representative'],
      submittedAt: nowStr,
    };

    const updatedEntitlements = get().entitlements.map((e) => {
      if (e.id === entitlementId) {
        return { ...e, status: 'APPEALED' as const, appealId: newAppeal.id };
      }
      return e;
    });

    const nextState = {
      ...get(),
      entitlements: updatedEntitlements,
      appeals: [newAppeal, ...get().appeals],
    };

    saveStoredState(nextState);
    set(nextState);
    return { success: true, message: `Appeal ${newAppeal.id} submitted for independent arbitration.` };
  },

  resolveAppeal: async (appealId, decision, reasoning) => {
    const appeal = get().appeals.find((a) => a.id === appealId);
    if (!appeal) return { success: false, message: 'Appeal not found' };

    try {
      await api.panelDecision(appeal.entitlementId, decision === 'UPHELD', `Arbitrated decision: ${decision}`);
    } catch {
      // fallback
    }

    const nowStr = formatDateTime(new Date().toISOString());
    const newStatus = decision === 'OVERTURNED' ? 'OVERTURNED' : 'UPHELD';

    const updatedAppeals = get().appeals.map((a) => {
      if (a.id === appealId) {
        return {
          ...a,
          status: newStatus as any,
          decision: decision === 'OVERTURNED' ? 'Overturned in favor of policyholder. Entitlement re-instated.' : 'Upheld insurer denial.',
          resolvedAt: nowStr,
        };
      }
      return a;
    });

    let updatedEntitlements = get().entitlements;
    if (decision === 'OVERTURNED') {
      updatedEntitlements = get().entitlements.map((e) => {
        if (e.id === appeal.entitlementId) {
          return { ...e, status: 'OPEN' as const };
        }
        return e;
      });
    }

    const auditEntry: AuditRecord = {
      id: generateId('AUD'),
      type: 'APPEAL_RESOLVED',
      entityId: appealId,
      actorRole: 'TRIBUNAL',
      actorName: 'Independent Arbitration Tribunal',
      timestamp: nowStr,
      description: `Tribunal decided ${decision} for ${appeal.entitlementId}. ${reasoning || ''}`,
      previousState: appeal.status,
      newState: newStatus,
      evidenceHash: `0x${Date.now().toString(16)}abcdef`,
      channel: 'audit-channel',
    };

    const nextState = {
      ...get(),
      appeals: updatedAppeals,
      entitlements: updatedEntitlements,
      auditLogs: [auditEntry, ...get().auditLogs],
    };

    saveStoredState(nextState);
    set(nextState);
    return { success: true, message: `Appeal ${appealId} resolved: ${decision}.` };
  },

  denyEntitlement: async (entitlementId, reason, explanation) => {
    const ent = get().entitlements.find((e) => e.id === entitlementId);
    if (!ent) return { success: false, message: 'Entitlement not found.' };

    const nowStr = formatDateTime(new Date().toISOString());
    const updatedEntitlements = get().entitlements.map((e) => {
      if (e.id === entitlementId) {
        return {
          ...e,
          status: 'DENIED' as const,
          denialReason: reason,
          decisionDate: nowStr,
        };
      }
      return e;
    });

    const auditEntry: AuditRecord = {
      id: generateId('AUD'),
      type: 'ENTITLEMENT_DENIED',
      entityId: entitlementId,
      actorRole: 'INSURER',
      actorName: ent.insurerName || 'Insurer',
      timestamp: nowStr,
      description: `Entitlement denied: ${reason}. Explanation: ${explanation || 'None provided'}.`,
      previousState: ent.status,
      newState: 'DENIED',
      evidenceHash: `0xdenial${Date.now().toString(16)}`,
      channel: 'audit-channel',
    };

    const nextState = {
      ...get(),
      entitlements: updatedEntitlements,
      auditLogs: [auditEntry, ...get().auditLogs],
    };

    saveStoredState(nextState);
    set(nextState);
    return { success: true, message: `Entitlement ${entitlementId} marked DENIED.` };
  },

  reconcileSettlement: async (settlementId) => {
    const stm = get().settlements.find((s) => s.id === settlementId);
    if (!stm) return { success: false, message: 'Settlement not found.' };

    const nowStr = formatDateTime(new Date().toISOString());
    const txnRef = `TXN-BKX-${Math.floor(100000 + Math.random() * 900000)}`;

    const updatedSettlements = get().settlements.map((s) => {
      if (s.id === settlementId) {
        return {
          ...s,
          status: 'SETTLED' as const,
          reference: txnRef,
          settledAt: nowStr,
        };
      }
      return s;
    });

    const updatedEntitlements = get().entitlements.map((e) => {
      if (e.id === stm.entitlementId) {
        return { ...e, status: 'SETTLED' as const };
      }
      return e;
    });

    const auditEntry: AuditRecord = {
      id: generateId('AUD'),
      type: 'SETTLEMENT_RECONCILED',
      entityId: settlementId,
      actorRole: 'GATEWAY',
      actorName: 'bKash MFS Gateway Reconciler',
      timestamp: nowStr,
      description: `Settlement reconciled against MFS log. Payment confirmed with Ref ${txnRef}. No duplicate disbursement.`,
      previousState: stm.status,
      newState: 'SETTLED',
      evidenceHash: `0xrecon${Date.now().toString(16)}`,
      channel: 'audit-channel',
    };

    const nextState = {
      ...get(),
      settlements: updatedSettlements,
      entitlements: updatedEntitlements,
      auditLogs: [auditEntry, ...get().auditLogs],
    };

    saveStoredState(nextState);
    set(nextState);
    return { success: true, reference: txnRef, message: 'Settlement reconciled and confirmed on-chain ✓' };
  },

  suspendProvider: async (providerId, reason) => {
    const prov = get().providers.find((p) => p.id === providerId);
    if (!prov) return { success: false, message: 'Provider not found.' };

    const nowStr = formatDateTime(new Date().toISOString());
    const updatedProviders = get().providers.map((p) => {
      if (p.id === providerId) {
        return { ...p, accreditationStatus: 'SUSPENDED' as const };
      }
      return p;
    });

    const auditEntry: AuditRecord = {
      id: generateId('AUD'),
      type: 'PROVIDER_SUSPENDED',
      entityId: providerId,
      actorRole: 'REGULATOR',
      actorName: 'IDRA Supervisory Authority',
      timestamp: nowStr,
      description: `Accreditation suspended for ${prov.name}. Reason: ${reason}. Historical signatures preserved.`,
      previousState: prov.accreditationStatus,
      newState: 'SUSPENDED',
      evidenceHash: `0xsuspend${Date.now().toString(16)}`,
      channel: 'audit-channel',
    };

    const nextState = {
      ...get(),
      providers: updatedProviders,
      auditLogs: [auditEntry, ...get().auditLogs],
    };

    saveStoredState(nextState);
    set(nextState);
    return { success: true, message: `Provider ${prov.name} suspended. New endorsements blocked.` };
  },

  reinstateProvider: async (providerId) => {
    const prov = get().providers.find((p) => p.id === providerId);
    if (!prov) return { success: false, message: 'Provider not found.' };

    const nowStr = formatDateTime(new Date().toISOString());
    const updatedProviders = get().providers.map((p) => {
      if (p.id === providerId) {
        return { ...p, accreditationStatus: 'ACCREDITED' as const };
      }
      return p;
    });

    const auditEntry: AuditRecord = {
      id: generateId('AUD'),
      type: 'PROVIDER_REINSTATED',
      entityId: providerId,
      actorRole: 'REGULATOR',
      actorName: 'IDRA Supervisory Authority',
      timestamp: nowStr,
      description: `Accreditation reinstated for ${prov.name}. Endorsement privileges restored.`,
      previousState: prov.accreditationStatus,
      newState: 'ACCREDITED',
      evidenceHash: `0xreinstate${Date.now().toString(16)}`,
      channel: 'audit-channel',
    };

    const nextState = {
      ...get(),
      providers: updatedProviders,
      auditLogs: [auditEntry, ...get().auditLogs],
    };

    saveStoredState(nextState);
    set(nextState);
    return { success: true, message: `Provider ${prov.name} reinstated successfully.` };
  },

  verifyAnchor: async () => {
    const nowStr = formatDateTime(new Date().toISOString());
    const auditEntry: AuditRecord = {
      id: generateId('AUD'),
      type: 'ANCHOR_PUBLISHED',
      entityId: 'ROOT-2026-09-PUBLIC',
      actorRole: 'CONSORTIUM',
      actorName: 'IDRA External Anchor Verifier',
      timestamp: nowStr,
      description: 'Audit channel Merkle root (0x7a8c91ef230b44199cba7712e091af) matched against external Polygon proof.',
      evidenceHash: '0x7a8c91ef230b44199cba7712e091af',
      channel: 'audit-channel',
    };

    const nextState = {
      ...get(),
      anchorVerified: true,
      auditLogs: [auditEntry, ...get().auditLogs],
    };

    saveStoredState(nextState);
    set(nextState);
    return { success: true, message: 'Consortium Merkle root verified against external anchor proof ✓' };
  },
}));
