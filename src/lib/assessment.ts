import { upsertIncident, type IncidentDetails, type SnakeSpecies, type VenomClass } from '../db/db';
import { DEFAULT_GPS, type GPSData } from '../store/store';

/**
 * An assessment that exists in the browser but has not been written to the
 * store yet. Used when the user finishes triage and is sent to register.
 */
export interface AssessmentDraft {
  incidentId: string;
  species: SnakeSpecies | null;
  photo: string | null;
  details: IncidentDetails;
}

export interface DraftInput {
  incidentId: string;
  species: SnakeSpecies | null;
  photo: string | null;
  biteLocation: string;
  biteTime: string;
  painScale: number;
  swellingGrade: number;
  localEffects: string[];
  systemicEffects: string[];
  hr: number;
  bp: string;
  spo2: number;
  grade: IncidentDetails['severity_assessment']['grade'];
  whoProtocol: string[];
  gps: GPSData | null;
}

export function buildDraft(input: DraftInput): AssessmentDraft {
  const now = Date.now();
  return {
    incidentId: input.incidentId,
    species: input.species,
    photo: input.photo,
    details: {
      gps_coordinates: {
        lat: input.gps?.lat ?? DEFAULT_GPS.lat,
        lng: input.gps?.lng ?? DEFAULT_GPS.lng,
        accuracy: input.gps?.accuracy ?? DEFAULT_GPS.accuracy,
        timestamp: now,
      },
      species_prediction: {
        primary: input.species?.scientific_name ?? 'Not identified',
        risk: (input.species?.venom_type ?? 'NON-VENOMOUS') as VenomClass,
        confidence: 0,
        alternatives: [],
      },
      severity_assessment: {
        grade: input.grade,
        grade_history: [{ timestamp: now, grade: input.grade }],
        who_protocol: input.whoProtocol,
      },
      symptoms: {
        bite_location: input.biteLocation,
        pain_scale: input.painScale,
        swelling_grade: input.swellingGrade,
        local_effects: input.localEffects,
        systemic_effects: input.systemicEffects,
        vital_signs: { hr: input.hr, bp: input.bp, spo2: input.spo2 },
      },
    },
  };
}

/** Writes the draft to the encrypted store. Owner null keeps it out of user history. */
export async function commitDraft(draft: AssessmentDraft, owner: string | null): Promise<void> {
  await upsertIncident(draft.incidentId, draft.details, draft.photo ? [draft.photo] : [], owner);
}