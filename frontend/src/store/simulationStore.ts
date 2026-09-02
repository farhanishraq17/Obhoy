import { create } from 'zustand';
import { InsurableEvent } from '../types/event';
import { Policy } from '../types/policy';
import { Entitlement } from '../types/entitlement';
import { Settlement } from '../types/settlement';
import { Appeal } from '../types/transparency';
import { UserProfile, ProviderEntity } from '../types/actor';
import {
  openEventTransition,
  continueEventTransition,
  attestEventTransition,
  authorizeEntitlementTransition,
  processSettlementTransition,
} from '../simulation/transitions';
import { prepareScenarioState } from '../simulation/scenarioRunner';
import { loadStoredState, saveStoredState } from '../lib/storage';
import { generateId } from '../lib/ids';
import { formatDateTime } from '../lib/dates';
import { ScenarioId } from '../types/simulation';
import { api, FabricMSP } from '../lib/api';

interface SimulationState {
  events: InsurableEvent[];
  policies: Policy[];
  entitlements: Entitlement[];
  settlements: Settlement[];
  appeals: Appeal[];
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
  processSettlement: (settlementId: string, simulateTimeout?: boolean) => Promise<{ success: boolean; reference?: string; message: string }>;
  submitAppeal: (entitlementId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  resolveAppeal: (appealId: string, decision: 'UPHELD' | 'OVERTURNED') => Promise<{ success: boolean; message: string }>;
}

const initialState = loadStoredState(prepareScenarioState('HAPPY_PATH'));

export const useSimulationStore = create<SimulationState>((set, get) => ({
  ...initialState,
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

    // 1. First attempt to call the real backend / commitment service
    try {
      let commitment = user.nidCommitment;
      if (user.nid) {
        // Call off-chain commitment service (:7560)
        const commitRes = await api.offchain.commit(user.nid, 'event');
        if (commitRes.ok && commitRes.commitment) {
          commitment = commitRes.commitment;
        }
      }

      const admissionWindow = admissionTimestamp
        ? new Date(admissionTimestamp).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);

      const openRes = await api.openEvent({
        line: 'HEALTH',
        subjectCommitment: commitment,
        admissionWindow,
        asserterId: provider.id,
        categoryCode: category || diagnosisCode || 'CAT-SURGERY-MAJOR',
        assessedLoss: 5000000,
        benefitCapAggregate: 5000000,
      });

      if (!openRes.ok) {
        // Backend refused (e.g. duplicate event invariant!)
        return {
          success: false,
          code: 'DUPLICATE_EVENT_COMMITTED',
          message: openRes.error || 'Event creation refused by blockchain invariant (open event already exists).',
        };
      }

      const chainEventId = openRes.result?.eventId || generateId('EVT');

      // Create local state transition with the confirmed chain event ID
      const { nextState, result } = openEventTransition(currentState, user, provider, diagnosisCode, category, admissionTimestamp);
      if (result.success && nextState.events.length > 0) {
        nextState.events[0].id = chainEventId;
        saveStoredState(nextState);
        set(nextState);
      }
      return { success: true, eventId: chainEventId, message: 'Event successfully opened on ledger.' };
    } catch (err: any) {
      // Fallback to local simulation if node is not running
      const { nextState, result } = openEventTransition(currentState, user, provider, diagnosisCode, category, admissionTimestamp);
      if (result.success) {
        saveStoredState(nextState);
        set(nextState);
      }
      return result;
    }
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

  resolveAppeal: async (appealId, decision) => {
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

    const nextState = {
      ...get(),
      appeals: updatedAppeals,
      entitlements: updatedEntitlements,
    };

    saveStoredState(nextState);
    set(nextState);
    return { success: true, message: `Appeal ${appealId} resolved: ${decision}.` };
  },
}));
