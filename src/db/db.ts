import Dexie, { type Table } from 'dexie';
import { encryptData, decryptData } from '../services/crypto';

export type VenomClass = 'NEUROTOXIC' | 'HEMOTOXIC' | 'NON-VENOMOUS';
export type SeverityGrade = 0 | 1 | 2 | 3 | 4;

export interface SnakeSpecies {
  taxon_id: number;
  scientific_name: string;
  common_name: string;
  common_name_local: string;
  venom_type: VenomClass;
  /** 34-bit province mask, kept from the original distribution model. */
  province_bitmask: number;
  geo_bbox: {
    latMin: number;
    latMax: number;
    lngMin: number;
    lngMax: number;
  };
  kde_params: {
    bandwidth: number;
    n_observations: number;
    mean_lat: number;
    mean_lng: number;
  };
  clinical_priority: number;
  reference_images: string[];
  /** English traits for the result view. Local names stay in the species page. */
  morphological_traits: string[];
  habitat: string;
  venom_notes: string;
}

export interface IncidentRecord {
  incident_id: string;
  timestamp: number;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  /**
   * Null until the user signs in. DESIGN.md 18 says anonymous assessments
   * produce a result but are not persisted, so the row is written for
   * everyone and simply carries no owner while signed out.
   */
  owner: string | null;
  encrypted_data: string;
  encrypted_photos?: string;
}

export interface IncidentDetails {
  gps_coordinates: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  };
  species_prediction: {
    primary: string;
    risk: VenomClass;
    confidence: number;
    alternatives: Array<{ name: string; confidence: number; risk: VenomClass }>;
  };
  severity_assessment: {
    grade: SeverityGrade;
    grade_history: Array<{ timestamp: number; grade: SeverityGrade }>;
    who_protocol: string[];
  };
  symptoms: {
    bite_location: string;
    pain_scale: number;
    swelling_grade: number;
    local_effects: string[];
    systemic_effects: string[];
    vital_signs: {
      hr: number;
      bp: string;
      spo2: number;
    };
  };
}

export interface DecryptedIncident {
  incident_id: string;
  timestamp: number;
  sync_status: IncidentRecord['sync_status'];
  owner: string | null;
  details: IncidentDetails;
  photos: string[];
}

class SnakeBiteDatabase extends Dexie {
  species!: Table<SnakeSpecies, number>;
  incidents!: Table<IncidentRecord, string>;

  constructor() {
    super('SnakeBiteAIDB');
    this.version(1).stores({
      species: '++taxon_id, venom_type, clinical_priority',
      incidents: 'incident_id, timestamp, sync_status, owner',
    });
  }
}

export const db = new SnakeBiteDatabase();

const INITIAL_SPECIES: SnakeSpecies[] = [
  {
    taxon_id: 0,
    scientific_name: 'Acanthophis laevis',
    common_name: 'Smooth-scaled Death Adder',
    common_name_local: 'Ular Kematian Papua',
    venom_type: 'NEUROTOXIC',
    province_bitmask: 0b1000000000000000000000000000000000,
    geo_bbox: { latMin: -9.0, latMax: -1.0, lngMin: 130.0, lngMax: 141.0 },
    kde_params: { bandwidth: 2.0, n_observations: 350, mean_lat: -4.5, mean_lng: 138.0 },
    clinical_priority: 5,
    reference_images: [
      '/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg',
      '/dataset/Acanthophis_laevis_obs137275705_photo234421463.jpg',
      '/dataset/Acanthophis_laevis_obs19025516_photo29178993.jpg',
    ],
    morphological_traits: [
      'Short, stout body',
      'Wide triangular head distinct from the neck',
      'Thin tail tip used as a lure',
      'Reddish brown with pale crossbands',
    ],
    habitat: 'Lowland forest, savanna and farmland across New Guinea.',
    venom_notes: 'Potent neurotoxic venom. Bites can cause ptosis and respiratory paralysis.',
  },
  {
    taxon_id: 1,
    scientific_name: 'Ahaetulla fasciolata',
    common_name: 'Speckled-headed Vine Snake',
    common_name_local: 'Ular Pucuk Loreng',
    venom_type: 'NON-VENOMOUS',
    province_bitmask: 0b0000000000000000000000000011111111,
    geo_bbox: { latMin: -9.0, latMax: 6.0, lngMin: 95.0, lngMax: 120.0 },
    kde_params: { bandwidth: 2.0, n_observations: 480, mean_lat: -2.5, mean_lng: 110.0 },
    clinical_priority: 1,
    reference_images: [
      '/dataset/Ahaetulla_fasciolata_obs202932892_photo358471931.jpg',
      '/dataset/Ahaetulla_fasciolata_obs310503736_photo560406804.jpg',
    ],
    morphological_traits: [
      'Long, pointed head',
      'Fine pale crossbands along the body',
      'Horizontally elliptical pupils',
    ],
    habitat: 'Shrubland, forest edge and secondary growth across Java and Sumatra.',
    venom_notes: 'Not venomous. Bites are superficial and rarely need more than wound cleaning.',
  },
  {
    taxon_id: 2,
    scientific_name: 'Ahaetulla prasina',
    common_name: 'Oriental Whip Snake',
    common_name_local: 'Ular Pucuk Hijau',
    venom_type: 'NON-VENOMOUS',
    province_bitmask: 0b1111111111111111111111111111111111,
    geo_bbox: { latMin: -11.0, latMax: 6.0, lngMin: 95.0, lngMax: 141.0 },
    kde_params: { bandwidth: 2.0, n_observations: 2400, mean_lat: -2.0, mean_lng: 115.0 },
    clinical_priority: 1,
    reference_images: ['/dataset/Ahaetulla_prasina_0003.jpg'],
    morphological_traits: [
      'Very slender bright green body',
      'Long pointed snout',
      'Horizontally elliptical pupils',
    ],
    habitat: 'Forest, plantation and garden canopy, from Sumatra to New Guinea.',
    venom_notes: 'Not venomous. Reported as mildly irritating to the bite site.',
  },
  {
    taxon_id: 3,
    scientific_name: 'Ahaetulla rufusoculara',
    common_name: 'Red-eyed Whip Snake',
    common_name_local: 'Ular Pucuk Mata Merah',
    venom_type: 'NON-VENOMOUS',
    province_bitmask: 0b0000000000000000000000000000001111,
    geo_bbox: { latMin: -9.0, latMax: 6.0, lngMin: 95.0, lngMax: 116.0 },
    kde_params: { bandwidth: 2.0, n_observations: 150, mean_lat: -6.0, mean_lng: 106.0 },
    clinical_priority: 1,
    reference_images: ['/dataset/Ahaetulla_rufusoculara_obs252803925_photo456126350.jpg'],
    morphological_traits: [
      'Red iris',
      'Elongate slender body',
      'Pale yellow line along the belly',
    ],
    habitat: 'Lowland forest and plantation in Java and southern Sumatra.',
    venom_notes: 'Not venomous. Harmless to humans apart from a minor scratch.',
  },
];

export async function seedSpeciesDatabase() {
  const stored = await db.species.toArray();
  if (stored.length > 0 && stored[0].reference_images[0]?.startsWith('/dataset/')) {
    return;
  }
  if (stored.length > 0) {
    await db.species.clear();
  }
  await db.species.bulkAdd(INITIAL_SPECIES);
}

export async function upsertIncident(
  incidentId: string,
  details: IncidentDetails,
  photos: string[],
  owner: string | null,
): Promise<void> {
  const record: IncidentRecord = {
    incident_id: incidentId,
    timestamp: Date.now(),
    sync_status: 'PENDING',
    owner,
    encrypted_data: await encryptData(JSON.stringify(details)),
    encrypted_photos: await encryptData(JSON.stringify(photos)),
  };
  await db.incidents.put(record);
}

async function decryptRecord(rec: IncidentRecord): Promise<{ details: IncidentDetails; photos: string[] }> {
  const details: IncidentDetails = JSON.parse(await decryptData(rec.encrypted_data));
  const photos: string[] = rec.encrypted_photos
    ? JSON.parse(await decryptData(rec.encrypted_photos))
    : [];
  return { details, photos };
}

export async function getIncidentLog(
  incidentId: string,
): Promise<{ details: IncidentDetails; photos: string[] } | null> {
  const record = await db.incidents.get(incidentId);
  if (!record) return null;
  return decryptRecord(record);
}

export async function getAllDecryptedIncidents(): Promise<DecryptedIncident[]> {
  const records = await db.incidents.toArray();
  const results: DecryptedIncident[] = [];

  for (const rec of records) {
    try {
      const { details, photos } = await decryptRecord(rec);
      results.push({
        incident_id: rec.incident_id,
        timestamp: rec.timestamp,
        sync_status: rec.sync_status,
        owner: rec.owner,
        details,
        photos,
      });
    } catch (err) {
      console.error(`Skipping unreadable incident ${rec.incident_id}:`, err);
    }
  }

  return results.sort((a, b) => b.timestamp - a.timestamp);
}

export async function markAllSynced(): Promise<void> {
  const records = await db.incidents.toArray();
  await db.incidents.bulkPut(
    records.filter((r) => r.sync_status === 'PENDING').map((r) => ({ ...r, sync_status: 'SYNCED' as const })),
  );
}