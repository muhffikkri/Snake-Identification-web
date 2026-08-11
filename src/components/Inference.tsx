import React, { useState, useEffect } from 'react';
import { Camera, Check, RefreshCw, ArrowRight, AlertCircle, Upload } from 'lucide-react';
import { db, addIncidentLog } from '../db/db';
import { useAppStore } from '../store/store';
import { logger } from '../services/logger';

interface InferenceProps {
  onNavigate: (page: string) => void;
  onSetIncidentId: (id: string) => void;
}

export default function Inference({ onNavigate, onSetIncidentId }: InferenceProps) {
  const { currentGPS, updatePendingSyncCount } = useAppStore();

  const [step, setStep] = useState<'upload' | 'analyzing' | 'result'>('upload');
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Results states
  const [primaryResult, setPrimaryResult] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any[]>([]);
  const [selectedTaxonId, setSelectedTaxonId] = useState<number | null>(null);

  // Trigger haptic feedback
  const triggerHaptic = (duration: number) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  };

  // Simulated AI inference process
  const startAnalysis = async (imgSrc: string) => {
    setSelectedImage(imgSrc);
    setStep('analyzing');
    setLogs([]);
    
    logger.info('EdgeAI', 'Starting local image analysis pipeline...');

    // Stage 1: Object detection
    await addLog("YOLO26l isolating object...", 0);
    await addLog("Applying 10% bounding box margin padding...", 350);
    await addLog("Object isolated with confidence=0.92.", 750);

    // Stage 2: Feature extraction
    await addLog("Extracting TFLite WASM embeddings (ConvNeXt-Large)...", 1000);
    await addLog("Generating 1536-dimensional feature vector...", 1600);
    await addLog("XGBoost classifier executing (500 estimators)...", 2000);

    // Stage 3: Geospatial fusion
    await addLog("Applying Binary Multiplicative Geospatial Fusion...", 2300);
    await addLog("Querying species_distribution_matrix in local IndexedDB...", 2600);
    
    // Fetch species and run mock fusion
    const allSpecies = await db.species.toArray();
    const lat = currentGPS?.lat || -6.2088;
    const lng = currentGPS?.lng || 106.8456;
    
    // Simulate eliminating species based on GPS bounding boxes
    const matched = allSpecies.map(sp => {
      const inBbox = lat >= sp.geo_bbox.latMin && lat <= sp.geo_bbox.latMax &&
                     lng >= sp.geo_bbox.lngMin && lng <= sp.geo_bbox.lngMax;
      const geo_binary = inBbox ? 1.0 : 0.0;
      
      let p_vis = 0.05;
      if (sp.scientific_name.includes('sputatrix')) p_vis = 0.70;
      else if (sp.scientific_name.includes('fasciatus')) p_vis = 0.15;
      else if (sp.scientific_name.includes('rhodostoma')) p_vis = 0.08;
      else if (sp.scientific_name.includes('insularis')) p_vis = 0.02;
      else if (sp.scientific_name.includes('pictus')) p_vis = 0.05;

      const p_fused = p_vis * geo_binary;

      return {
        ...sp,
        p_vis,
        geo_binary,
        p_fused
      };
    });

    const sumFused = matched.reduce((acc, curr) => acc + curr.p_fused, 0) || 1.0;
    const finalResults = matched.map(m => ({
      ...m,
      confidence: m.p_fused / sumFused
    })).sort((a, b) => b.confidence - a.confidence);

    await addLog(`Geospatial filtering completed: eliminated ${(matched.filter(x => x.geo_binary === 0).length / matched.length * 100).toFixed(1)}% of taxa decision space.`, 2900);
    await addLog("Inference finalized. Macro F1 = 0.7406.", 3100);

    setTimeout(() => {
      const primary = finalResults[0];
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

  // Handle image capture via mockup input
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

  const handleSimulateDirectSelection = (taxonId: number) => {
    const mockImages: Record<number, string> = {
      0: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=400&q=80',
      1: 'https://images.unsplash.com/photo-1604186838320-c7f822919558?auto=format&fit=crop&w=400&q=80',
      2: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
      3: 'https://images.unsplash.com/photo-1582239454477-8bb0b1c0bfeb?auto=format&fit=crop&w=400&q=80',
      4: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?auto=format&fit=crop&w=400&q=80'
    };
    startAnalysis(mockImages[taxonId]);
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

  return (
    <div className="flex flex-col min-h-[640px] bg-white text-[#1E1E1E] p-4 md:p-8">
      
      {/* Header bar inside */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3 mb-4">
        <button
          onClick={() => onNavigate('home')}
          className="text-xs font-bold text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-2.5 py-1"
        >
          ← Batal
        </button>
        <span className="text-sm font-black uppercase tracking-wider">Identifikasi Edge-AI</span>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 flex flex-col justify-start">
        
        {/* Upload Mode */}
        {step === 'upload' && (
          <div className="md:grid md:grid-cols-12 md:gap-8 flex-1 flex flex-col justify-start py-2 step-transition">
            
            {/* Left Column: Upload box */}
            <div className="md:col-span-6 flex flex-col justify-center">
              <div className="border-2 border-dashed border-gray-300 hover:border-[#2E7D6F] rounded-2xl p-8 bg-gray-50 flex flex-col items-center justify-center text-center space-y-4 transition-colors duration-300">
                <div className="w-16 h-16 rounded-full bg-[#2E7D6F]/10 text-[#2E7D6F] flex items-center justify-center border border-[#2E7D6F]/20">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Pindai / Ambil Foto</h3>
                  <p className="text-[10px] text-gray-500 max-w-[200px] mx-auto leading-normal">
                    Posisikan ular sejajar di tengah bingkai kamera. Gunakan pencahayaan yang cukup.
                  </p>
                </div>

                <label className="cursor-pointer bg-[#1E1E1E] hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-transform active:scale-95 duration-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Unggah Foto Ular</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageInput}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Right Column: Demo simulator */}
            <div className="md:col-span-6 flex flex-col justify-center mt-6 md:mt-0">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">
                  SIMULASI DEMO CEPAT (PILIH ULAR)
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSimulateDirectSelection(0)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-800 text-left flex justify-between items-center transition-colors"
                  >
                    <span>🐍 Cobra Jawa</span>
                    <span className="bg-[#70020F] text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase">V1</span>
                  </button>
                  <button
                    onClick={() => handleSimulateDirectSelection(2)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-800 text-left flex justify-between items-center transition-colors"
                  >
                    <span>🐍 Ular Tanah</span>
                    <span className="bg-[#F57C00] text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase">V2</span>
                  </button>
                  <button
                    onClick={() => handleSimulateDirectSelection(3)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-800 text-left flex justify-between items-center transition-colors"
                  >
                    <span>🐍 Bangkai Ular</span>
                    <span className="bg-[#F57C00] text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase">V3</span>
                  </button>
                  <button
                    onClick={() => handleSimulateDirectSelection(4)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-800 text-left flex justify-between items-center transition-colors"
                  >
                    <span>🐍 Bronzeback</span>
                    <span className="bg-[#388E3C] text-white text-[7px] font-extrabold px-1.5 py-0.5 rounded uppercase">V4</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inference Processing Mode */}
        {step === 'analyzing' && (
          <div className="md:grid md:grid-cols-12 md:gap-8 flex-1 flex flex-col justify-start py-2 step-transition">
            {/* Left Column: Loading status */}
            <div className="md:col-span-5 flex flex-col justify-center">
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                <RefreshCw className="w-10 h-10 text-[#2E7D6F] animate-spin mb-4" />
                <h3 className="text-sm font-extrabold text-gray-900 uppercase tracking-wide">Pemrosesan Model Edge-AI</h3>
                <p className="text-[10px] text-gray-500 mt-1">Mengkompilasi embeddings lokal secara offline...</p>
              </div>
            </div>

            {/* Right Column: Console terminal */}
            <div className="md:col-span-7 flex flex-col justify-center mt-4 md:mt-0">
              <div className="bg-[#1E1E1E] text-[#388E3C] p-4 rounded-xl font-mono text-[9px] space-y-1.5 shadow-inner h-48 overflow-y-auto border border-gray-800 leading-snug">
                {logs.map((log, index) => (
                  <div key={index}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results view Mode */}
        {step === 'result' && primaryResult && (
          <div className="md:grid md:grid-cols-12 md:gap-8 flex-1 flex flex-col justify-start py-2 step-transition">
            
            {/* Left Column: Primary Prediction Result Card */}
            <div className="md:col-span-6 flex flex-col justify-start">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-md">
                <div className="bg-[#1E1E1E] text-white px-3 py-2.5 flex items-center justify-between border-b border-gray-800">
                  <span className="text-[9px] font-black text-[#5A9A8F] uppercase tracking-wider">Hasil Prediksi Utama</span>
                  <span className="text-[9px] bg-[#2E7D6F] px-1.5 py-0.5 rounded font-extrabold text-white uppercase">Valid Spasial</span>
                </div>
                
                <div className="h-44 w-full bg-gray-100 relative">
                  <img
                    src={selectedImage || primaryResult.reference_images[0]}
                    alt={primaryResult.scientific_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <span className={`text-[9px] font-black px-2 py-1 rounded-full text-white shadow-sm border border-white/20 uppercase ${
                      primaryResult.venom_type === 'NEUROTOXIC' ? 'bg-[#70020F]' :
                      primaryResult.venom_type === 'HEMOTOXIC' ? 'bg-[#F57C00]' : 'bg-[#388E3C]'
                    }`}>
                      {primaryResult.venom_type}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                      {primaryResult.scientific_name}
                    </h3>
                    <p className="text-xs text-gray-500 font-bold italic leading-none mt-1">
                      {primaryResult.common_name_indonesian}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-[10px]">
                    <div>
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">Confidence:</span>
                      <p className="text-base font-black text-gray-900">
                        {(primaryResult.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400 font-bold uppercase tracking-wider text-[8px]">KDE Spasial:</span>
                      <p className="text-base font-black text-[#2E7D6F]">
                        {(primaryResult.p_vis * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="text-[8px] text-gray-400 font-black uppercase tracking-wider">Ciri Morfologi Konfirmasi:</span>
                    <div className="grid grid-cols-1 gap-1.5 mt-1.5">
                      {primaryResult.morphological_traits.map((trait: string, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2 text-[10px] text-gray-700 font-semibold">
                          <Check className="w-3.5 h-3.5 text-[#388E3C] flex-shrink-0" />
                          <span>{trait}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Alternatives Recommendations & Actions */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-4 mt-6 md:mt-0">
              
              {/* Alternatives Cards List */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
                <div className="border-b border-gray-200 pb-2">
                  <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-wider">
                    Ular Rekomendasi / Alternatif
                  </h4>
                  <p className="text-[8px] text-gray-500 mt-0.5 font-medium leading-none">
                    Pilih salah satu kartu di bawah jika identifikasi visual utama tidak akurat.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-2.5 max-h-[190px] overflow-y-auto pr-1">
                  {[primaryResult, ...alternatives].map((alt) => (
                    <div
                      key={alt.taxon_id}
                      onClick={() => {
                        triggerHaptic(50);
                        setSelectedTaxonId(alt.taxon_id);
                      }}
                      className={`flex border rounded-lg overflow-hidden cursor-pointer bg-white transition-all ${
                        selectedTaxonId === alt.taxon_id
                          ? 'border-[#2E7D6F] ring-1 ring-[#2E7D6F] border-2 shadow-sm'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-16 h-12 bg-gray-100 flex-shrink-0">
                        <img
                          src={alt.reference_images[0]}
                          alt={alt.scientific_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <div className="p-2 flex-1 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-black text-gray-900 truncate block w-28 leading-tight">
                              {alt.scientific_name}
                            </span>
                            <span className="text-[8px] text-gray-500 truncate block w-28 leading-none mt-0.5">
                              {alt.common_name_indonesian}
                            </span>
                          </div>
                          <input
                            type="radio"
                            name="alternative-selection-list"
                            checked={selectedTaxonId === alt.taxon_id}
                            onChange={() => setSelectedTaxonId(alt.taxon_id)}
                            className="text-[#2E7D6F] focus:ring-[#2E7D6F] h-3.5 w-3.5 mt-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex space-x-2">
                <AlertCircle className="w-4 h-4 text-[#70020F] flex-shrink-0 mt-0.5" />
                <p className="text-[9px] text-[#70020F] leading-normal font-semibold uppercase tracking-wide">
                  <strong>Pemberitahuan Medis:</strong> Spesies yang dikonfirmasi akan dicatat dalam triage untuk panduan SABU.
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={handleProceedToTriage}
                  className="w-full py-3.5 bg-[#2E7D6F] hover:bg-[#5A9A8F] text-white font-extrabold text-xs rounded-xl shadow-md transition-transform active:scale-95 duration-200 flex items-center justify-center space-x-2 uppercase tracking-wider"
                >
                  <span>Konfirmasi & Lanjut ke Triage</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                
                <button
                  onClick={() => {
                    triggerHaptic(50);
                    setStep('upload');
                  }}
                  className="w-full py-2.5 border border-gray-300 text-gray-700 font-bold text-xs bg-white rounded-xl shadow-sm active:scale-95 transition-transform duration-200 uppercase tracking-wider"
                >
                  Ulangi Pengambilan Foto
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
