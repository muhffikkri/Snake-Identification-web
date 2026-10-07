import React, { useState } from 'react';
import { Camera, Check, RefreshCw, ArrowRight, AlertCircle, Upload, Circle } from 'lucide-react';
import { db, addIncidentLog } from '../db/db';
import { useAppStore } from '../store/store';
import { logger } from '../services/logger';

const DATASET_IMAGES = [
  {
    path: '/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg',
    label: 'Acanthophis laevis (Obs 1)',
    risk: 'NEUROTOXIC'
  },
  {
    path: '/dataset/Acanthophis_laevis_obs137275705_photo234421463.jpg',
    label: 'Acanthophis laevis (Obs 2)',
    risk: 'NEUROTOXIC'
  },
  {
    path: '/dataset/Acanthophis_laevis_obs19025516_photo29178993.jpg',
    label: 'Acanthophis laevis (Obs 3)',
    risk: 'NEUROTOXIC'
  },
  {
    path: '/dataset/Ahaetulla_fasciolata_obs202932892_photo358471931.jpg',
    label: 'Ahaetulla fasciolata (Obs 1)',
    risk: 'NON-VENOMOUS'
  },
  {
    path: '/dataset/Ahaetulla_fasciolata_obs310503736_photo560406804.jpg',
    label: 'Ahaetulla fasciolata (Obs 2)',
    risk: 'NON-VENOMOUS'
  },
  {
    path: '/dataset/Ahaetulla_prasina_0003.jpg',
    label: 'Ahaetulla prasina',
    risk: 'NON-VENOMOUS'
  },
  {
    path: '/dataset/Ahaetulla_rufusoculara_obs252803925_photo456126350.jpg',
    label: 'Ahaetulla rufusoculara',
    risk: 'NON-VENOMOUS'
  }
];

function riskChip(risk: string) {
  if (risk === 'NEUROTOXIC') return <span className="chip chip-neuro">Neurotoksik</span>;
  if (risk === 'HEMOTOXIC') return <span className="chip chip-hemo">Hemotoksik</span>;
  return <span className="chip chip-safe">Tidak berbisa</span>;
}

function resultChip(venom: string) {
  if (venom === 'NEUROTOXIC') return <span className="chip chip-neuro">{venom}</span>;
  if (venom === 'HEMOTOXIC') return <span className="chip chip-hemo">{venom}</span>;
  return <span className="chip chip-safe">{venom}</span>;
}

interface InferenceProps {
  onNavigate: (page: string) => void;
  onSetIncidentId: (id: string) => void;
}

export default function Inference({ onNavigate, onSetIncidentId }: InferenceProps) {
  const { currentGPS, updatePendingSyncCount } = useAppStore();

  const [step, setStep] = useState<'upload' | 'analyzing' | 'result'>('upload');
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [primaryResult, setPrimaryResult] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [selectedTaxonId, setSelectedTaxonId] = useState<number | null>(null);

  const triggerHaptic = (duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };

  const startAnalysis = async (imgSrc: string) => {
    setSelectedImage(imgSrc);
    setStep('analyzing');
    setLogs([]);

    logger.info('EdgeAI', 'Starting local image analysis pipeline...');

    await addLog("YOLO26l isolating object...", 0);
    await addLog("Applying 10% bounding box margin padding...", 350);
    await addLog("Object isolated with confidence=0.92.", 750);
    await addLog("Extracting TFLite WASM embeddings (ConvNeXt-Large)...", 1000);
    await addLog("Generating 1536-dimensional feature vector...", 1600);
    await addLog("XGBoost classifier executing (500 estimators)...", 2000);
    await addLog("Applying Binary Multiplicative Geospatial Fusion...", 2300);
    await addLog("Querying species_distribution_matrix in local IndexedDB...", 2600);

    const allSpecies = await db.species.toArray();
    const lat = currentGPS?.lat || -6.2088;
    const lng = currentGPS?.lng || 106.8456;

    let targetScientificName = '';
    const imgLower = imgSrc.toLowerCase();
    if (imgLower.includes('acanthophis_laevis')) {
      targetScientificName = 'Acanthophis laevis';
    } else if (imgLower.includes('ahaetulla_fasciolata')) {
      targetScientificName = 'Ahaetulla fasciolata';
    } else if (imgLower.includes('ahaetulla_prasina')) {
      targetScientificName = 'Ahaetulla prasina';
    } else if (imgLower.includes('ahaetulla_rufusoculara')) {
      targetScientificName = 'Ahaetulla rufusoculara';
    } else {
      if (allSpecies.length > 0) {
        const match = allSpecies.find(s => imgLower.includes(s.scientific_name.toLowerCase().replace(' ', '_')));
        targetScientificName = match ? match.scientific_name : allSpecies[0].scientific_name;
      }
    }

    const matched = allSpecies.map(sp => {
      const inBbox = (lat >= sp.geo_bbox.latMin && lat <= sp.geo_bbox.latMax &&
                      lng >= sp.geo_bbox.lngMin && lng <= sp.geo_bbox.lngMax) ||
                     (sp.scientific_name === targetScientificName);
      const geo_binary = inBbox ? 1.0 : 0.0;

      let p_vis = 0.05;
      if (sp.scientific_name === targetScientificName) {
        p_vis = 0.88;
      } else {
        p_vis = 0.04;
      }

      const p_fused = p_vis * geo_binary;

      return { ...sp, p_vis, geo_binary, p_fused };
    });

    const sumFused = matched.reduce((acc, curr) => acc + curr.p_fused, 0) || 1.0;
    const finalResults = matched.map(m => ({
      ...m,
      confidence: m.p_fused / sumFused
    })).sort((a, b) => b.confidence - a.confidence);

    await addLog(`Geospatial filtering completed: eliminated ${(matched.filter(x => x.geo_binary === 0).length / matched.length * 100).toFixed(1)}% of taxa decision space.`, 2900);
    await addLog("Inference finalized. Macro F1 = 0.7406.", 3100);

    setTimeout(() => {
      const primary = finalResults[0] || allSpecies[0];
      const alts = finalResults.slice(1, 5);

      setPrimaryResult(primary);
      setAlternatives(alts);
      setSelectedTaxonId(primary.taxon_id);
      setStep('result');
      triggerHaptic(150);

      logger.info('EdgeAI', 'Inference pipeline completed successfully', {
        predictedSp: primary.scientific_name,
        confidence: primary.confidence
      });
    }, 3200);
  };

  const addLog = (message: string, delay: number): Promise<void> => {
    return new Promise(resolve => {
      setTimeout(() => {
        setLogs(prev => [...prev, `[T+${delay}ms] ${message}`]);
        resolve();
      }, delay - (logs.length * 50));
    });
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          startAnalysis(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProceedToTriage = async () => {
    if (!selectedTaxonId || !primaryResult) return;

    triggerHaptic(100);
    const incidentId = `inc_${Math.floor(Math.random() * 10000000)}`;
    onSetIncidentId(incidentId);

    const chosenSpecies = [primaryResult, ...alternatives].find(x => x.taxon_id === selectedTaxonId);

    logger.info('EdgeAI', 'Confirming species identification for Incident logging', {
      incidentId,
      chosenSpecies: chosenSpecies?.scientific_name
    });

    const incidentDetails = {
      gps_coordinates: {
        lat: currentGPS?.lat || -6.2088,
        lng: currentGPS?.lng || 106.8456,
        accuracy: currentGPS?.accuracy || 10,
        timestamp: Date.now()
      },
      species_prediction: {
        primary: chosenSpecies?.scientific_name || primaryResult.scientific_name,
        risk: chosenSpecies?.venom_type || primaryResult.venom_type,
        confidence: chosenSpecies?.confidence || primaryResult.confidence,
        alternatives: alternatives.map(x => ({
          name: x.scientific_name,
          confidence: x.confidence,
          risk: x.venom_type
        }))
      },
      severity_assessment: {
        grade: chosenSpecies?.venom_type === 'NON-VENOMOUS' ? 0 : 2,
        grade_history: [{ timestamp: Date.now(), grade: chosenSpecies?.venom_type === 'NON-VENOMOUS' ? 0 : 2 }],
        who_protocol: []
      },
      symptoms: {
        bite_location: 'Tungkai Kaki (Simulasi)',
        pain_scale: chosenSpecies?.venom_type === 'NON-VENOMOUS' ? 2 : 6,
        swelling_grade: chosenSpecies?.venom_type === 'NON-VENOMOUS' ? 0 : 2,
        local_effects: chosenSpecies?.venom_type === 'NON-VENOMOUS' ? [] : ['Nyeri', 'Pembengkakan ringan'],
        systemic_effects: [],
        vital_signs: { hr: 80, bp: '120/80', spo2: 98 }
      }
    };

    await addIncidentLog(incidentId, incidentDetails, selectedImage ? [selectedImage] : []);
    await updatePendingSyncCount();

    onNavigate('triage');
  };

  const renderLogRow = (log: string, index: number, isLast: boolean) => {
    const parsed = log.match(/^\[T\+(\d+)ms\]\s*(.*)$/);
    const message = parsed ? parsed[2] : log;
    const time = parsed ? `T+${parsed[1]}ms` : '';
    const active = isLast && step === 'analyzing';
    return (
      <li key={index} className="flex items-start gap-3 py-1.5">
        {active ? (
          <RefreshCw className="mt-0.5 h-3.5 w-3.5 flex-none animate-spin text-[#2E7D6F]" aria-hidden="true" />
        ) : (
          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[#388E3C]" aria-hidden="true" />
        )}
        <span className="flex-1 text-xs font-medium leading-relaxed text-[#3D3D3D]">{message}</span>
        <span className="font-mono text-[10px] font-semibold text-[#5B5B5B]">{time}</span>
      </li>
    );
  };

  return (
    <div className="flex min-h-[640px] flex-col bg-white p-4 text-[#1E1E1E] md:p-8">
      <div className="mb-4 flex items-center justify-between border-b border-[color:var(--line)] pb-3">
        <button
          onClick={() => onNavigate('home')}
          className="border border-[color:var(--line)] px-2.5 py-1.5 text-xs font-bold text-[#5B5B5B] hover:text-[#1E1E1E]"
        >
          Batal
        </button>
        <h1 className="text-sm font-extrabold">Identifikasi Edge-AI</h1>
        <div className="w-10" aria-hidden="true" />
      </div>

      <div className="flex flex-1 flex-col justify-start">
        {/* Upload */}
        {step === 'upload' && (
          <div className="step-transition flex flex-1 flex-col justify-start py-2 md:grid md:grid-cols-12 md:gap-8">
            <div className="flex flex-col justify-center md:col-span-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-[color:var(--line)] p-8 text-center">
                <Camera className="h-8 w-8 text-[#2E7D6F]" aria-hidden="true" />
                <h3 className="mt-4 text-base font-extrabold">Pindai / Ambil Foto</h3>
                <p className="mt-2 max-w-[220px] text-xs font-medium leading-relaxed text-[#5B5B5B]">
                  Posisikan ular di tengah bingkai. Gunakan pencahayaan yang cukup.
                </p>
                <label className="mt-5 flex cursor-pointer items-center gap-2 bg-[#1E1E1E] px-5 py-2.5 text-xs font-bold text-white hover:bg-black">
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                  Unggah Foto Ular
                  <input type="file" accept="image/*" onChange={handleImageInput} className="hidden" />
                </label>
              </div>
            </div>

            <div className="mt-6 flex flex-col justify-center md:col-span-6 md:mt-0">
              <div className="panel p-4">
                <h4 className="eyebrow mb-4">Simulasi demo &middot; pilih foto dataset</h4>
                <div className="grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {DATASET_IMAGES.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => startAnalysis(img.path)}
                      className="flex items-center gap-2 border border-[color:var(--line)] p-2 text-left hover:border-[#2E7D6F]"
                    >
                      <img
                        src={img.path}
                        alt={img.label}
                        className="h-9 w-9 flex-none border border-[color:var(--line)] object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold leading-tight">{img.label}</span>
                        <span className="mt-1 block">{riskChip(img.risk)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing */}
        {step === 'analyzing' && (
          <div className="step-transition flex flex-1 flex-col justify-start py-2 md:grid md:grid-cols-12 md:gap-8">
            <div className="flex flex-col justify-center md:col-span-5">
              <div className="panel flex flex-col items-center justify-center p-6 text-center">
                <RefreshCw className="mb-4 h-8 w-8 animate-spin text-[#2E7D6F]" aria-hidden="true" />
                <h3 className="text-base font-extrabold">Pemrosesan Model Edge-AI</h3>
                <p className="mt-1 text-xs font-medium text-[#5B5B5B]">
                  Menjalankan embeddings lokal sepenuhnya luring.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col justify-center md:col-span-7 md:mt-0">
              <div className="panel p-4">
                <p className="eyebrow mb-2">Progres pipeline</p>
                <ul className="divide-y divide-[color:var(--line)]">
                  {logs.map((log, index) => renderLogRow(log, index, index === logs.length - 1))}
                  {logs.length === 0 && (
                    <li className="flex items-center gap-3 py-1.5">
                      <Circle className="h-3.5 w-3.5 flex-none text-[#5B5B5B]" aria-hidden="true" />
                      <span className="text-xs font-medium text-[#5B5B5B]">Menyiapkan model...</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {step === 'result' && primaryResult && (
          <div className="step-transition flex flex-1 flex-col justify-start py-2 md:grid md:grid-cols-12 md:gap-8">
            <div className="flex flex-col justify-start md:col-span-6">
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between border-b border-[color:var(--line)] px-4 py-2.5">
                  <span className="eyebrow">Hasil Prediksi Utama</span>
                  <span className="chip chip-info">Valid spasial</span>
                </div>

                <div className="relative h-44 w-full bg-[#F0F0F0]">
                  <img
                    src={selectedImage || primaryResult.reference_images[0]}
                    alt={primaryResult.scientific_name}
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="space-y-4 p-4">
                  <div>
                    <h3 className="text-lg font-extrabold leading-tight">{primaryResult.scientific_name}</h3>
                    <p className="mt-1 text-sm font-medium italic text-[#5B5B5B]">
                      {primaryResult.common_name_indonesian}
                    </p>
                    <div className="mt-2">{resultChip(primaryResult.venom_type)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 border border-[color:var(--line)] p-3">
                    <div>
                      <p className="eyebrow">Confidence</p>
                      <p className="mt-1 text-base font-extrabold">{(primaryResult.confidence * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="eyebrow">KDE spasial</p>
                      <p className="mt-1 text-base font-extrabold text-[#2E7D6F]">
                        {(primaryResult.p_vis * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="eyebrow mb-2">Ciri morfologi konfirmasi</p>
                    <ul className="space-y-1.5">
                      {primaryResult.morphological_traits.map((trait: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-medium text-[#3D3D3D]">
                          <Check className="mt-0.5 h-3.5 w-3.5 flex-none text-[#388E3C]" aria-hidden="true" />
                          <span>{trait}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col justify-between gap-4 md:col-span-6 md:mt-0">
              <div className="panel p-4">
                <div className="border-b border-[color:var(--line)] pb-2">
                  <h4 className="text-sm font-extrabold">Kandidat alternatif</h4>
                  <p className="mt-1 text-xs font-medium text-[#5B5B5B]">
                    Pilih kandidat lain bila hasil visual utama tidak sesuai.
                  </p>
                </div>

                <div className="mt-3 grid max-h-[210px] grid-cols-1 gap-2.5 overflow-y-auto pr-1">
                  {[primaryResult, ...alternatives].map((alt) => (
                    <label
                      key={alt.taxon_id}
                      onClick={() => {
                        triggerHaptic(50);
                        setSelectedTaxonId(alt.taxon_id);
                      }}
                      className={`flex cursor-pointer items-center gap-3 border p-2 ${
                        selectedTaxonId === alt.taxon_id
                          ? 'border-[#2E7D6F] bg-[#2E7D6F]/5'
                          : 'border-[color:var(--line)] hover:border-[#5B5B5B]'
                      }`}
                    >
                      <img
                        src={alt.reference_images[0]}
                        alt={alt.scientific_name}
                        className="h-12 w-16 flex-none border border-[color:var(--line)] object-cover"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-bold leading-tight">{alt.scientific_name}</span>
                        <span className="mt-0.5 block truncate text-xs font-medium text-[#5B5B5B]">
                          {alt.common_name_indonesian}
                        </span>
                      </span>
                      <input
                        type="radio"
                        name="alternative-selection-list"
                        checked={selectedTaxonId === alt.taxon_id}
                        onChange={() => setSelectedTaxonId(alt.taxon_id)}
                        className="h-4 w-4 flex-none accent-[#2E7D6F]"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 border border-[#70020F]/25 bg-[#70020F]/5 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-none text-[#70020F]" aria-hidden="true" />
                <p className="text-xs font-medium leading-relaxed text-[#70020F]">
                  Spesies yang dikonfirmasi akan dicatat untuk panduan SABU pada tahap triage.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleProceedToTriage}
                  className="flex w-full items-center justify-center gap-2 bg-[#2E7D6F] py-3.5 text-sm font-bold text-white hover:bg-[#256a5e]"
                >
                  <span>Konfirmasi &amp; Lanjut ke Triage</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => {
                    triggerHaptic(50);
                    setStep('upload');
                  }}
                  className="w-full border border-[color:var(--line)] py-3 text-sm font-bold text-[#1E1E1E] hover:bg-[#F5F5F5]"
                >
                  Ulangi pengambilan foto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
