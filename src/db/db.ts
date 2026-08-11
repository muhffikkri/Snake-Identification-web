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
  const needsReSeed = !first || !first.reference_images[0] || !first.reference_images[0].includes('fm=webp');

  if (count > 0 && !needsReSeed) return;

  if (needsReSeed && count > 0) {
    await db.species.clear();
    console.log('Cleared old species database to apply new WebP asset links.');
  }

  const initialSpecies: SnakeSpecies[] = [
    {
      taxon_id: 0,
      scientific_name: 'Naja sputatrix',
      common_name_indonesian: 'Ular Kobra Jawa (Javan Spitting Cobra)',
      venom_type: 'NEUROTOXIC',
      province_bitmask: 0b0000000000000000000000000000001111, // Java provinces
      geo_bbox: { latMin: -9.0, latMax: -5.0, lngMin: 105.0, lngMax: 116.0 },
      kde_params: { bandwidth: 2.0, n_observations: 1540, mean_lat: -7.2, mean_lng: 110.0 },
      clinical_priority: 5,
      reference_images: [
        'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80&fm=webp',
        'https://images.unsplash.com/photo-1531386151447-fd762e7a3ae8?auto=format&fit=crop&w=400&q=80&fm=webp'
      ],
      morphological_traits: ['Tudung leher melebar', 'Warna hitam legam/kecoklatan', 'Menyemburkan bisa']
    },
    {
      taxon_id: 1,
      scientific_name: 'Bungarus fasciatus',
      common_name_indonesian: 'Ular Welang (Banded Krait)',
      venom_type: 'NEUROTOXIC',
      province_bitmask: 0b0000000000000000000000000011111111, // Java + Sumatra
      geo_bbox: { latMin: -9.0, latMax: 6.0, lngMin: 95.0, lngMax: 116.0 },
      kde_params: { bandwidth: 2.0, n_observations: 820, mean_lat: -4.5, mean_lng: 107.5 },
      clinical_priority: 5,
      reference_images: [
        'https://images.unsplash.com/photo-1604186838320-c7f822919558?auto=format&fit=crop&w=400&q=80&fm=webp'
      ],
      morphological_traits: ['Belang hitam-kuning melingkar', 'Penampang tubuh segitiga', 'Ekor tumpul']
    },
    {
      taxon_id: 2,
      scientific_name: 'Calloselasma rhodostoma',
      common_name_indonesian: 'Ular Tanah (Malayan Pit Viper)',
      venom_type: 'HEMOTOXIC',
      province_bitmask: 0b0000000000000000000000000000001111, // Java, Sumatra
      geo_bbox: { latMin: -9.0, latMax: 6.0, lngMin: 95.0, lngMax: 116.0 },
      kde_params: { bandwidth: 2.0, n_observations: 2100, mean_lat: -6.8, mean_lng: 108.0 },
      clinical_priority: 4,
      reference_images: [
        'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80&fm=webp'
      ],
      morphological_traits: ['Tubuh pendek gempal', 'Corak segitiga coklat gelap', 'Moncong meruncing ke atas']
    },
    {
      taxon_id: 3,
      scientific_name: 'Trimeresurus insularis',
      common_name_indonesian: 'Ular Bangkai Laut (White-lipped Island Pit Viper)',
      venom_type: 'HEMOTOXIC',
      province_bitmask: 0b0000000000000000000000000011110000, // Lesser Sunda, East Java
      geo_bbox: { latMin: -11.0, latMax: -7.0, lngMin: 110.0, lngMax: 128.0 },
      kde_params: { bandwidth: 2.0, n_observations: 640, mean_lat: -8.5, mean_lng: 118.0 },
      clinical_priority: 4,
      reference_images: [
        'https://images.unsplash.com/photo-1582239454477-8bb0b1c0bfeb?auto=format&fit=crop&w=400&q=80&fm=webp'
      ],
      morphological_traits: ['Warna hijau terang (ada variasi biru)', 'Kepala berbentuk segitiga', 'Ekor kemerahan']
    },
    {
      taxon_id: 4,
      scientific_name: 'Dendrelaphis pictus',
      common_name_indonesian: 'Ular Tali Picik (Painted Bronzeback)',
      venom_type: 'NON-VENOMOUS',
      province_bitmask: 0b1111111111111111111111111111111111, // All provinces
      geo_bbox: { latMin: -11.0, latMax: 6.0, lngMin: 95.0, lngMax: 141.0 },
      kde_params: { bandwidth: 2.0, n_observations: 4300, mean_lat: -2.0, mean_lng: 115.0 },
      clinical_priority: 1,
      reference_images: [
        'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=400&q=80&fm=webp'
      ],
      morphological_traits: ['Tubuh sangat ramping', 'Garis hitam di sepanjang sisi mata', 'Sisik perunggu metalik']
    }
  ];

  await db.species.bulkAdd(initialSpecies);
  console.log('Seeded species local database matrix with high-quality WebP online assets.');
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

// Retrieve and decrypt a single incident log
export async function getIncidentLog(incidentId: string): Promise<{ details: IncidentDetails; photos: string[] } | null> {
  const record = await db.incidents.get(incidentId);
  if (!record) return null;

  const decryptedDetails = await decryptData(record.encrypted_data);
  const details: IncidentDetails = JSON.parse(decryptedDetails);

  let photos: string[] = [];
  if (record.encrypted_photos) {
    const decryptedPhotos = await decryptData(record.encrypted_photos);
    photos = JSON.parse(decryptedPhotos);
  }

  return { details, photos };
}

// Get all incidents (with decrypted details)
export async function getAllDecryptedIncidents(): Promise<Array<{ incident_id: string; timestamp: number; sync_status: string; details: IncidentDetails; photos: string[] }>> {
  const records = await db.incidents.toArray();
  const results = [];
  
  for (const rec of records) {
    try {
      const decryptedDetails = await decryptData(rec.encrypted_data);
      const details: IncidentDetails = JSON.parse(decryptedDetails);
      
      let photos: string[] = [];
      if (rec.encrypted_photos) {
        const decryptedPhotos = await decryptData(rec.encrypted_photos);
        photos = JSON.parse(decryptedPhotos);
      }
      
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
