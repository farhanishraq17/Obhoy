import { InsurableEvent, Attestation } from '../types/event';
import { Entitlement } from '../types/entitlement';

export interface ValidationResult {
  valid: boolean;
  code?: string;
  reason?: string;
}

/**
 * Invariant 1: No two OPEN events can share the same uniqueness key H(NID || window).
 */
export function validateEventUniqueness(
  existingEvents: InsurableEvent[],
  eventKey: string
): ValidationResult {
  const duplicate = existingEvents.find(
    (e) => e.eventKey === eventKey && (e.status === 'OPEN' || e.status === 'CLOSED_ELIGIBLE')
  );

  if (duplicate) {
    return {
      valid: false,
      code: 'ERR_DUPLICATE_OPEN_EVENT',
      reason: `An active insurable event (${duplicate.id}) already exists for this identity commitment and admission window.`,
    };
  }

  return { valid: true };
}

/**
 * Mechanism 2: Multi-Class Attestation Quorum
 * 2-of-3 attestation classes required, at least ONE must be a non-payee (CLINICAL or FIELD).
 */
export function validateQuorum(attestations: Attestation[]): {
  satisfied: boolean;
  validClassesCount: number;
  hasNonPayee: boolean;
  classes: string[];
} {
  const validAttestations = attestations.filter((a) => a.status === 'VALID');
  const uniqueClasses = Array.from(new Set(validAttestations.map((a) => a.actorClass)));

  const hasNonPayee = uniqueClasses.includes('CLINICAL') || uniqueClasses.includes('FIELD');
  const satisfied = uniqueClasses.length >= 2 && hasNonPayee;

  return {
    satisfied,
    validClassesCount: uniqueClasses.length,
    hasNonPayee,
    classes: uniqueClasses,
  };
}

/**
 * Coordination of Benefits bound: Sum of paid entitlements <= assessed loss or policy cap.
 */
export function validateEntitlementCap(
  existingEntitlements: Entitlement[],
  eventId: string,
  newAmount: number,
  benefitCap: number
): ValidationResult {
  const eventEntitlements = existingEntitlements.filter(
    (e) => e.eventId === eventId && (e.status === 'AUTHORIZED' || e.status === 'SETTLED')
  );
  
  const currentTotal = eventEntitlements.reduce((sum, e) => sum + e.amount, 0);

  if (currentTotal + newAmount > benefitCap) {
    return {
      valid: false,
      code: 'ERR_BENEFIT_CAP_EXCEEDED',
      reason: `Total entitlements (${currentTotal + newAmount} BDT) exceed maximum benefit ceiling (${benefitCap} BDT).`,
    };
  }

  return { valid: true };
}
