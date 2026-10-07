import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Identify from '../components/Identify';
import { useAppStore } from '../store/store';

vi.mock('../db/db', () => {
  const species = [
    {
      taxon_id: 0,
      scientific_name: 'Acanthophis laevis',
      common_name: 'Smooth-scaled Death Adder',
      common_name_local: 'Ular Kematian Papua',
      venom_type: 'NEUROTOXIC',
      geo_bbox: { latMin: -9, latMax: -1, lngMin: 130, lngMax: 141 },
      kde_params: { bandwidth: 2, n_observations: 350, mean_lat: -4.5, mean_lng: 138 },
      clinical_priority: 5,
      reference_images: ['/dataset/Acanthophis_laevis_obs121339246_photo205315764.jpg'],
      morphological_traits: ['Short, stout body'],
      habitat: 'Lowland forest',
      venom_notes: 'Potent neurotoxic venom.',
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
      reference_images: ['/dataset/Ahaetulla_prasina_0003.jpg'],
      morphological_traits: ['Very slender bright green body'],
      habitat: 'Forest and plantation',
      venom_notes: 'Not venomous.',
    },
  ];
  return { db: { species: { toArray: vi.fn().mockResolvedValue(species) } } };
});

const mockBack = vi.fn();
const mockProceed = vi.fn();
const mockOpenSpecies = vi.fn();

function renderIdentify() {
  return render(
    <Identify onBack={mockBack} onProceed={mockProceed} onOpenSpecies={mockOpenSpecies} />,
  );
}

describe('Identify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ gps: { lat: -6.2088, lng: 106.8456, accuracy: 15, timestamp: 1 } });
  });

  it('states up front that the result is assistive, not a diagnosis', () => {
    renderIdentify();

    expect(
      screen.getByText(/not a diagnosis/i),
    ).toBeInTheDocument();
  });

  it('runs the pipeline and reports a ranked result with a confidence figure', async () => {
    renderIdentify();

    fireEvent.click(screen.getByRole('button', { name: /run a reference image/i }));

    await waitFor(() => expect(screen.getByText('Most likely')).toBeInTheDocument(), { timeout: 4000 });
    expect(screen.getByRole('heading', { name: 'Acanthophis laevis' })).toBeInTheDocument();
    // Confidence is shown as a percentage, not asserted as certainty.
    expect(screen.getByText('87.0%')).toBeInTheDocument();
  });

  it('lists related species and lets the user correct the choice', async () => {
    renderIdentify();

    fireEvent.click(screen.getByRole('button', { name: /run a reference image/i }));

    await waitFor(() => {
      expect(screen.getByText(/related and similar species/i)).toBeInTheDocument();
    }, { timeout: 4000 });

    fireEvent.click(screen.getByRole('radio', { name: /Ahaetulla prasina/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Ahaetulla prasina' })).toBeInTheDocument();
    });
  });

  it('hands the confirmed species and image to triage', async () => {
    renderIdentify();

    fireEvent.click(screen.getByRole('button', { name: /run a reference image/i }));
    await waitFor(() => expect(screen.getByText('Most likely')).toBeInTheDocument(), { timeout: 4000 });

    fireEvent.click(screen.getByRole('button', { name: /confirm and start triage/i }));

    expect(mockProceed).toHaveBeenCalledTimes(1);
    expect(mockProceed.mock.calls[0][0].chosen.scientific_name).toBe('Acanthophis laevis');
  });
});