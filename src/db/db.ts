import Dexie, { type Table } from 'dexie';
import { encryptData, decryptData } from '../services/crypto';

// Species definition interface
export interface SnakeSpecies {
  taxon_id: number;
  scientific_name: string;
  common_name_indonesian: string;
  venom_type: 'NEUROTOXIC' | 'HEMOTOXIC' | 'NON-VENOMOUS';
  province_bitmask: number; // 34-bit mask for provinces
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
  clinical_priority: number; // 1-5
  reference_images: string[];
  morphological_traits: string[]; // for the validation flow
}

// Incident log interface (encrypted at-rest structure)
export interface IncidentRecord {
  incident_id: string; // UUID v4
  timestamp: number;
  sync_status: 'PENDING' | 'SYNCED' | 'FAILED';
  
  // Encrypted text containing the details (patient info, symptoms, GPS, top predictions)
  encrypted_data: string; 
  
  // Encrypted base64 wound photos (so we don't store them plaintext)
  encrypted_photos?: string; 
}

// Unencrypted structured model returned after decrypting IncidentRecord
export interface IncidentDetails {
  gps_coordinates: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
  };
  species_prediction: {
    primary: string;
    risk: 'NEUROTOXIC' | 'HEMOTOXIC' | 'NON-VENOMOUS';
    confidence: number;
    alternatives: Array<{ name: string; confidence: number; risk: string }>;
  };
  severity_assessment: {
    grade: number; // 0-4
    grade_history: Array<{ timestamp: number; grade: number }>;
    who_protocol: string[];
  };
  symptoms: {
    bite_location: string;
    pain_scale: number; // VAS 1-10
    swelling_grade: number; // 0-4
    local_effects: string[];
    systemic_effects: string[];
    vital_signs: {
      hr: number;
      bp: string;
      spo2: number;
    };
  };
}

class SnakeBiteDatabase extends Dexie {
  species!: Table<SnakeSpecies, number>;
  incidents!: Table<IncidentRecord, string>;

  constructor() {
    super('SnakeBiteAIDB');
    this.version(1).stores({
      species: '++taxon_id, venom_type, clinical_priority',
      incidents: 'incident_id, timestamp, sync_status'
    });
  }
}

export const db = new SnakeBiteDatabase();

// Seed species matrix data (Representative 179 species dataset)
export async function seedSpeciesDatabase() {
  const count = await db.species.count();
  const first = count > 0 ? await db.species.toCollection().first() : null;
  const needsReSeed = !first || !first.reference_images[0] || !first.reference_images[0].includes('/dataset/');

  if (count > 0 && !needsReSeed) return;

  if (needsReSeed && count > 0) {
    await db.species.clear();
    console.log('Cleared old species database to apply new local dataset asset links.');
  }

  const initialSpecies: SnakeSpecies[] = [
    {
      taxon_id: 0,
      scientific_name: 'Acanthophis laevis',
      common_name_indonesian: 'Ular Kematian Papua (Smooth-scaled Death Adder)',
      venom_type: 'NEUROTOXIC',
      province_bitmask: 0b1000000000000000000000000000000000,
      geo_bbox: { latMin: -9.0, latMax: -1.0, lngMin: 130.0, lngMax: 141.0 },
      kde_params: { bandwidth: 2.0, n_observations: 350, mean_lat: -4.5, mean_lng: 138.0 },
      clinical_priority: 5,
      reference_images: [
        '/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg',
        '/dataset/Acanthophis_laevis_obs137275705_photo234421463.jpg',
        '/dataset/Acanthophis_laevis_obs19025516_photo29178993.jpg'
      ],
      morphological_traits: ['Tubuh pendek gempal', 'Kepala segitiga lebar', 'Ekor cacing tipis pemancing mangsa', 'Warna coklat kemerahan bergaris pita']
    },
    {
      taxon_id: 1,
      scientific_name: 'Ahaetulla fasciolata',
      common_name_indonesian: 'Ular Pucuk Loreng (Speckled-headed Vine Snake)',
      venom_type: 'NON-VENOMOUS',
      province_bitmask: 0b0000000000000000000000000011111111,
      geo_bbox: { latMin: -9.0, latMax: 6.0, lngMin: 95.0, lngMax: 120.0 },
      kde_params: { bandwidth: 2.0, n_observations: 480, mean_lat: -2.5, mean_lng: 110.0 },
      clinical_priority: 1,
      reference_images: [
        '/dataset/Ahaetulla_fasciolata_obs202932892_photo358471931.jpg',
        '/dataset/Ahaetulla_fasciolata_obs310503736_photo560406804.jpg'
      ],
      morphological_traits: ['Kepala berbentuk lonjong meruncing', 'Corak loreng melintang halus', 'Mata horizontal celah']
    },
    {
      taxon_id: 2,
      scientific_name: 'Ahaetulla prasina',
      common_name_indonesian: 'Ular Pucuk Hijau (Oriental Whip Snake)',
      venom_type: 'NON-VENOMOUS',
      province_bitmask: 0b1111111111111111111111111111111111,
      geo_bbox: { latMin: -11.0, latMax: 6.0, lngMin: 95.0, lngMax: 141.0 },
      kde_params: { bandwidth: 2.0, n_observations: 2400, mean_lat: -2.0, mean_lng: 115.0 },
      clinical_priority: 1,
      reference_images: [
        '/dataset/Ahaetulla_prasina_0003.jpg'
      ],
      morphological_traits: ['Tubuh hijau sangat ramping', 'Moncong runcing panjang', 'Mata horizontal celah']
    },
    {
      taxon_id: 3,
      scientific_name: 'Ahaetulla rufusoculara',
      common_name_indonesian: 'Ular Pucuk Mata Merah (Red-eyed Whip Snake)',
      venom_type: 'NON-VENOMOUS',
      province_bitmask: 0b0000000000000000000000000000001111,
      geo_bbox: { latMin: -9.0, latMax: 6.0, lngMin: 95.0, lngMax: 116.0 },
      kde_params: { bandwidth: 2.0, n_observations: 150, mean_lat: -6.0, mean_lng: 106.0 },
      clinical_priority: 1,
      reference_images: [
        '/dataset/Ahaetulla_rufusoculara_obs252803925_photo456126350.jpg'
      ],
      morphological_traits: ['Mata berwarna kemerahan', 'Tubuh ramping memanjang', 'Garis putih kekuningan di bagian perut']
    }
  ];

  await db.species.bulkAdd(initialSpecies);
  console.log('Seeded species local database matrix with local dataset assets.');
}

// Insert incident log, encrypting the details
export async function addIncidentLog(
  incidentId: string,
  details: IncidentDetails,
  photos: string[]
): Promise<void> {
  const jsonDetails = JSON.stringify(details);
  const jsonPhotos = JSON.stringify(photos);

  const encryptedDetails = await encryptData(jsonDetails);
  const encryptedPhotos = await encryptData(jsonPhotos);

  const record: IncidentRecord = {
    incident_id: incidentId,
    timestamp: Date.now(),
    sync_status: 'PENDING',
    encrypted_data: encryptedDetails,
    encrypted_photos: encryptedPhotos
  };

  await db.incidents.add(record);
}

async function decryptRecord(rec: IncidentRecord): Promise<{ details: IncidentDetails; photos: string[] }> {
  const details: IncidentDetails = JSON.parse(await decryptData(rec.encrypted_data));
  let photos: string[] = [];
  if (rec.encrypted_photos) {
    photos = JSON.parse(await decryptData(rec.encrypted_photos));
  }
  return { details, photos };
}

// Retrieve and decrypt a single incident log
export async function getIncidentLog(incidentId: string): Promise<{ details: IncidentDetails; photos: string[] } | null> {
  const record = await db.incidents.get(incidentId);
  if (!record) return null;
  return decryptRecord(record);
}

// Get all incidents (with decrypted details)
export async function getAllDecryptedIncidents(): Promise<Array<{ incident_id: string; timestamp: number; sync_status: string; details: IncidentDetails; photos: string[] }>> {
  const records = await db.incidents.toArray();
  const results = [];
  
  for (const rec of records) {
    try {
      const { details, photos } = await decryptRecord(rec);
      results.push({
        incident_id: rec.incident_id,
        timestamp: rec.timestamp,
        sync_status: rec.sync_status,
        details,
        photos
      });
    } catch (e) {
      console.error(`Failed to decrypt record ${rec.incident_id}:`, e);
    }
  }

  return results;
}
