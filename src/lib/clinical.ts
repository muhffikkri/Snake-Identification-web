import type { SeverityGrade, VenomClass } from '../db/db';

export interface VenomProfile {
  label: string;
  tone: 'danger' | 'warning' | 'success';
  description: string;
}

/**
 * DESIGN.md 6 says semantic colour communicates meaning, and 45 says colour is
 * never the only signal. Every tone here ships with an explicit word.
 */
export const VENOM: Record<VenomClass, VenomProfile> = {
  NEUROTOXIC: {
    label: 'Neurotoxic',
    tone: 'danger',
    description: 'Neurotoxic venom. Can progress to ptosis and respiratory paralysis.',
  },
  HEMOTOXIC: {
    label: 'Hemotoxic',
    tone: 'warning',
    description: 'Hemotoxic venom. Expect local tissue damage and bleeding abnormalities.',
  },
  'NON-VENOMOUS': {
    label: 'Non-venomous',
    tone: 'success',
    description: 'No venom. Care is limited to wound cleaning and observation.',
  },
};

export interface SeverityProfile {
  label: string;
  tone: 'success' | 'warning' | 'danger';
  summary: string;
  /** The clinical action this grade demands, stated before anything else. */
  action: string;
}

export const SEVERITY: Record<SeverityGrade, SeverityProfile> = {
  0: {
    label: 'No envenoming',
    tone: 'success',
    summary: 'No systemic or spreading local signs recorded.',
    action: 'Observe for at least 6 to 12 hours. Envenoming can appear late.',
  },
  1: {
    label: 'Mild local',
    tone: 'success',
    summary: 'Local pain or swelling at the bite site only.',
    action: 'Clean the wound, give paracetamol for pain, and re-check the swelling hourly.',
  },
  2: {
    label: 'Moderate local',
    tone: 'warning',
    summary: 'Swelling has spread beyond the bite site.',
    action: 'Refer to the nearest health facility and observe for progression.',
  },
  3: {
    label: 'Severe systemic',
    tone: 'danger',
    summary: 'Systemic signs are present.',
    action: 'Treat as an emergency. Establish IV access and prepare antivenom.',
  },
  4: {
    label: 'Life threatening',
    tone: 'danger',
    summary: 'Respiratory involvement or SpO2 below 90%.',
    action: 'Support breathing and start resuscitation now. Evacuate to intensive care.',
  },
};

/** Applies regardless of grade, so it is always shown. */
export const NEVER_DO = [
  'Never apply a tourniquet. It stops blood flow entirely and drives tissue necrosis.',
  'Never cut, incise, squeeze or suck the wound, and never apply traditional remedies.',
];

export const ALWAYS_DO = [
  'Keep the bitten limb level with the heart and immobilise it with a splint or rigid support.',
  'Wrap the limb with a firm elastic bandage over the whole limb, not just the bite.',
  'Keep the patient still and moving to hospital as soon as possible.',
];

export const NEUROTOXIC_SYMPTOMS = [
  'Drooping eyelid',
  'Difficulty swallowing',
  'Slurred speech',
  'Muscle weakness or paralysis',
  'Difficulty breathing',
];

export const HEMOTOXIC_SYMPTOMS = [
  'Vomiting blood',
  'Bleeding gums',
  'Extensive bruising',
  'Blood in urine',
];

export const LOCAL_SYMPTOMS = [
  'Active bleeding',
  'Skin necrosis or discolouration',
  'Blisters at the bite site',
  'Numbness around the bite',
];

export const SEVERITY_ORDER: SeverityGrade[] = [0, 1, 2, 3, 4];

export function gradeFromSymptoms(input: {
  swellingGrade: number;
  painScale: number;
  localEffects: string[];
  systemicEffects: string[];
  spo2: number;
}): SeverityGrade {
  const neuro = input.systemicEffects.some((s) => NEUROTOXIC_SYMPTOMS.includes(s));
  const hemo = input.systemicEffects.some((s) => HEMOTOXIC_SYMPTOMS.includes(s));
  const severeLocal = input.swellingGrade >= 3 || input.localEffects.includes('Skin necrosis or discolouration');

  if (input.spo2 < 90 || input.systemicEffects.includes('Difficulty breathing')) return 4;
  if (neuro || hemo || input.swellingGrade === 4) return 3;
  if (severeLocal || input.localEffects.includes('Active bleeding')) return 2;
  if (input.painScale > 4 || input.swellingGrade >= 1) return 1;
  return 0;
}

export function recheckInterval(grade: SeverityGrade): number {
  if (grade >= 3) return 15;
  if (grade >= 1) return 30;
  return 60;
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(ts: number): string {
  return dateFormatter.format(ts);
}

export function formatDateTime(ts: number): string {
  return `${dateFormatter.format(ts)}, ${timeFormatter.format(ts)}`;
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}