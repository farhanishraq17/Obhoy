export type ScenarioId = 
  | 'HAPPY_PATH'
  | 'DUPLICATE_EVENT'
  | 'DUAL_COVERAGE'
  | 'HOSPITAL_TRANSFER'
  | 'INSUFFICIENT_QUORUM'
  | 'DENIAL_AND_APPEAL'
  | 'PAYMENT_RECONCILIATION';

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  subtitle: string;
  description: string;
  steps: {
    stepIndex: number;
    title: string;
    description: string;
    roleView: string;
    targetRoute: string;
    actionPrompt?: string;
  }[];
}

export interface SimulationLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  actor: string;
}
