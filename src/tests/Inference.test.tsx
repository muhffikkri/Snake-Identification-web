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
            scientific_name: 'Naja sputatrix',
            common_name_indonesian: 'Ular Kobra Jawa',
            venom_type: 'NEUROTOXIC',
            geo_bbox: { latMin: -9, latMax: -5, lngMin: 105, lngMax: 116 },
            reference_images: ['https://mock-image.com/cobra.jpg'],
            morphological_traits: ['Tudung leher melebar']
          },
          {
            taxon_id: 2,
            scientific_name: 'Calloselasma rhodostoma',
            common_name_indonesian: 'Ular Tanah',
            venom_type: 'HEMOTOXIC',
            geo_bbox: { latMin: -9, latMax: 6, lngMin: 95, lngMax: 116 },
            reference_images: ['https://mock-image.com/viper.jpg'],
            morphological_traits: ['Corak segitiga coklat gelap']
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
    expect(screen.getByText('🐍 Cobra Jawa')).toBeInTheDocument();
    expect(screen.getByText('🐍 Ular Tanah')).toBeInTheDocument();
  });

  it('executes sequential Edge-AI pipeline and displays prediction result cards', async () => {
    render(<Inference onNavigate={mockOnNavigate} onSetIncidentId={mockOnSetIncidentId} />);

    // Click quick demo Cobra Jawa
    const cobraBtn = screen.getByText('🐍 Cobra Jawa');
    fireEvent.click(cobraBtn);

    // Verify loading pipeline logs appear
    expect(screen.getByText('Pemrosesan Model Edge-AI')).toBeInTheDocument();
    
    // Fast-forward all nested async simulated timers synchronously
    await vi.runAllTimersAsync();

    // Verify result screen elements directly (synchronously)
    expect(screen.getByText('Hasil Prediksi Utama')).toBeInTheDocument();
    expect(screen.getAllByText('Naja sputatrix').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NEUROTOXIC').length).toBeGreaterThan(0);
    expect(screen.getByText('Konfirmasi & Lanjut ke Triage')).toBeInTheDocument();
  });
});
