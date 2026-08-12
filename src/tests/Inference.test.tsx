import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Inference from '../components/Inference';

// Mock DB module
vi.mock('../db/db', () => {
  return {
    db: {
      species: {
        toArray: vi.fn().mockResolvedValue([
          {
            taxon_id: 0,
            scientific_name: 'Acanthophis laevis',
            common_name_indonesian: 'Ular Kematian Papua',
            venom_type: 'NEUROTOXIC',
            geo_bbox: { latMin: -9, latMax: -1, lngMin: 130, lngMax: 141 },
            reference_images: ['/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg'],
            morphological_traits: ['Tubuh pendek gempal']
          },
          {
            taxon_id: 2,
            scientific_name: 'Ahaetulla prasina',
            common_name_indonesian: 'Ular Pucuk Hijau',
            venom_type: 'NON-VENOMOUS',
            geo_bbox: { latMin: -11, latMax: 6, lngMin: 95, lngMax: 141 },
            reference_images: ['/dataset/Ahaetulla_prasina_0003.jpg'],
            morphological_traits: ['Tubuh hijau sangat ramping']
          }
        ])
      },
      incidents: {
        add: vi.fn().mockResolvedValue(true)
      }
    },
    addIncidentLog: vi.fn().mockResolvedValue(true),
    getIncidentLog: vi.fn().mockResolvedValue(null)
  };
});

describe('Inference Component', () => {
  const mockOnNavigate = vi.fn();
  const mockOnSetIncidentId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders camera trigger and simulator selection buttons', () => {
    render(<Inference onNavigate={mockOnNavigate} onSetIncidentId={mockOnSetIncidentId} />);

    expect(screen.getByText('Pindai / Ambil Foto')).toBeInTheDocument();
    expect(screen.getByText('Acanthophis laevis (Obs 1)')).toBeInTheDocument();
    expect(screen.getByText('Ahaetulla prasina')).toBeInTheDocument();
  });

  it('executes sequential Edge-AI pipeline and displays prediction result cards', async () => {
    render(<Inference onNavigate={mockOnNavigate} onSetIncidentId={mockOnSetIncidentId} />);

    // Click quick demo Acanthophis laevis
    const cobraBtn = screen.getByText('Acanthophis laevis (Obs 1)');
    fireEvent.click(cobraBtn);

    // Verify loading pipeline logs appear
    expect(screen.getByText('Pemrosesan Model Edge-AI')).toBeInTheDocument();
    
    // Fast-forward all nested async simulated timers synchronously
    await vi.runAllTimersAsync();

    // Verify result screen elements directly (synchronously)
    expect(screen.getByText('Hasil Prediksi Utama')).toBeInTheDocument();
    expect(screen.getAllByText('Acanthophis laevis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NEUROTOXIC').length).toBeGreaterThan(0);
    expect(screen.getByText('Konfirmasi & Lanjut ke Triage')).toBeInTheDocument();
  });
});
