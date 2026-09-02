import { Policy } from '../types/policy';
import { InsurableEvent } from '../types/event';
import { Entitlement } from '../types/entitlement';
import { Settlement } from '../types/settlement';
import { Appeal } from '../types/transparency';
import { PRIMARY_USER } from './users';
import { MOCK_INSURERS } from './insurers';
import { MOCK_PROVIDERS } from './providers';
import { getCurrentAdmissionWindow, formatDateTime } from '../lib/dates';
import { computeEventKey } from '../lib/ids';

export function getInitialSeedState() {
  const currentWindow = getCurrentAdmissionWindow();
  const initialEventKey = computeEventKey(PRIMARY_USER.nidCommitment, currentWindow);

  const initialPolicies: Policy[] = [
    {
      id: 'POL-1001',
      holderId: PRIMARY_USER.id,
      holderName: PRIMARY_USER.name,
      holderNID: PRIMARY_USER.nid,
      insurerId: MOCK_INSURERS[0].id,
      insurerName: MOCK_INSURERS[0].name,
      product: 'Catastrophic Hospitalization Protection',
      benefitCap: 50000,
      scheduleVersion: 'v1.2-2026',
      status: 'ACTIVE',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      premiumBDT: 1200,
      paymentMethod: 'bKash (MFI Group Channel)',
    },
    {
      id: 'POL-1002',
      holderId: PRIMARY_USER.id,
      holderName: PRIMARY_USER.name,
      holderNID: PRIMARY_USER.nid,
      insurerId: MOCK_INSURERS[1].id,
      insurerName: MOCK_INSURERS[1].name,
      product: 'Garment Worker Supplementary Health',
      benefitCap: 30000,
      scheduleVersion: 'v2.0-2026',
      status: 'ACTIVE',
      startDate: '2026-02-01',
      endDate: '2027-01-31',
      premiumBDT: 800,
      paymentMethod: 'MFI Account',
    },
  ];

  const initialEvents: InsurableEvent[] = [];
  const initialEntitlements: Entitlement[] = [];
  const initialSettlements: Settlement[] = [];
  const initialAppeals: Appeal[] = [];

  return {
    policies: initialPolicies,
    events: initialEvents,
    entitlements: initialEntitlements,
    settlements: initialSettlements,
    appeals: initialAppeals,
  };
}
