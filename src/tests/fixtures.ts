import type { DecryptedIncident, SnakeSpecies } from '../db/db';

/**
 * Fixtures for the government dashboard tests. They live in their own module so
 * the hoisted vi.mock factory and the test body can share the same objects,
 * which is how the sync-status cases are driven.
 */
export const fixtureIncidents: DecryptedIncident[] = [
  {
    incident_id: 'inc_neuro_1',
    timestamp: 1757200000000,
    sync_status: 'PENDING',
    owner: null,
    details: {
      gps_coordinates: { lat: -6.2088, lng: 106.8456, accuracy: 12, timestamp: 1757200000000 },
      species_prediction: {
        primary: 'Acanthophis laevis',
        risk: 'NEUROTOXIC',
        confidence: 0.87,
        alternatives: [],
      },
      severity_assessment: { grade: 4, grade_history: [], who_protocol: [] },
      symptoms: {
        bite_location: 'Lower leg',
        pain_scale: 9,
        swelling_grade: 3,
        local_effects: [],
        systemic_effects: ['Difficulty breathing'],
        vital_signs: { hr: 110, bp: '140/90', spo2: 86 },
      },
    },
    photos: [],
  },
  {
    incident_id: 'inc_harmless_1',
    timestamp: 1757100000000,
    sync_status: 'SYNCED',
    owner: 'Rina',
    details: {
      gps_coordinates: { lat: -7.2575, lng: 112.7521, accuracy: 20, timestamp: 1757100000000 },
      species_prediction: {
        primary: 'Ahaetulla prasina',
        risk: 'NON-VENOMOUS',
        confidence: 0.91,
        alternatives: [],
      },
      severity_assessment: { grade: 0, grade_history: [], who_protocol: [] },
      symptoms: {
        bite_location: 'Hand',
        pain_scale: 2,
        swelling_grade: 0,
        local_effects: [],
        systemic_effects: [],
        vital_signs: { hr: 72, bp: '120/80', spo2: 99 },
      },
    },
    photos: [],
  },
];

export const fixtureSpecies: SnakeSpecies[] = [
  {
    taxon_id: 0,
    scientific_name: 'Acanthophis laevis',
    common_name: 'Smooth-scaled Death Adder',
    common_name_local: 'Ular Kematian Papua',
    venom_type: 'NEUROTOXIC',
    geo_bbox: { latMin: -9, latMax: -1, lngMin: 130, lngMax: 141 },
    kde_params: { bandwidth: 2, n_observations: 350, mean_lat: -4.5, mean_lng: 138 },
    clinical_priority: 5,
    province_bitmask: 0,
    reference_images: ['/dataset/a.jpg'],
    morphological_traits: ['Short, stout body'],
    habitat: 'Lowland forest',
    venom_notes: 'Neurotoxic.',
  },
  {
    taxon_id: 2,
    scientific_name: 'Ahaetulla prasina',
    common_name: 'Oriental Whip Snake',
    common_name_local: 'Ular Pucuk Hijau',
    venom_type: 'NON-VENOMOUS',
    geo_bbox: { latMin: -11, latMax: 6, lngMin: 95, lngMax: 141 },
    kde_params: { bandwidth: 2, n_observations: 2400, mean_lat: -2, mean_lng: 115 },
    clinical_priority: 1,
    province_bitmask: 0,
    reference_images: ['/dataset/b.jpg'],
    morphological_traits: ['Slender green body'],
    habitat: 'Forest',
    venom_notes: 'Not venomous.',
  },
];