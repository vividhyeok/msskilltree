export type DecisionCategory =
  | "activeMagic"
  | "normalPassive"
  | "specialPassive"
  | "growth"
  | "artifact"
  | "synergyArtifact";

export type DecisionReason = {
  label: string;
  detail?: string;
};

export type Decision = {
  id: string;
  ref: string;
  name: string;
  category: DecisionCategory;
  priority: number;
  reasons: DecisionReason[];
  // One-line action shown on the one-click button.
  action: string;
  // Estimated stat impact (additive delta if picked once).
  impact?: { statId: string; nameKo: string; delta: number; unit: string }[];
  disabled?: boolean;
  disabledReason?: string;
};
