import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../components/Home';
import { useAppStore } from '../store/store';

// vi.mock is hoisted, so the fixture has to live inside the factory.
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
  ];
  return {
    db: {
      species: {
        toArray: vi.fn().mockResolvedValue(species),
        count: vi.fn().mockResolvedValue(species.length),
      },
      incidents: {
        where: vi.fn().mockReturnValue({
          equals: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([]),
          }),
        }),
      },
    },
    getIncidentLog: vi.fn().mockResolvedValue(null),
    upsertIncident: vi.fn().mockResolvedValue(undefined),
  };
});

const mockNavigate = vi.fn();

function renderHome() {
  return render(<Home onNavigate={mockNavigate} />);
}

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ gps: { lat: -6.2088, lng: 106.8456, accuracy: 15, timestamp: 1 } });
  });

  it('leads with the triage action before identification', async () => {
    renderHome();

    const triage = screen.getByRole('button', { name: /start triage assessment/i });
    const identify = screen.getByRole('button', { name: /identify a snake/i });

    // DESIGN.md 17/39: triage is the action that must be easiest to reach.
    expect(triage).toBeInTheDocument();
    expect(triage.compareDocumentPosition(identify) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('navigates to triage without requiring an account', () => {
    useAppStore.setState({ account: null });
    renderHome();

    screen.getByRole('button', { name: /start triage assessment/i }).click();

    expect(mockNavigate).toHaveBeenCalledWith('triage');
  });

  it('routes to identification from the identify action', () => {
    renderHome();

    screen.getByRole('button', { name: /identify a snake/i }).click();

    expect(mockNavigate).toHaveBeenCalledWith('identify');
  });

  it('names species recorded for the detected region', async () => {
    // Central Java is inside the Java region polygon.
    useAppStore.setState({ gps: { lat: -7.2575, lng: 112.7521, accuracy: 10, timestamp: 1 } });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText(/Recorded in Jawa/i)).toBeInTheDocument();
    });
  });

  it('explains an empty regional result instead of showing a blank card', async () => {
    useAppStore.setState({ gps: { lat: -3.5, lng: 128.5, accuracy: 10, timestamp: 1 } });
    renderHome();

    await waitFor(() => {
      expect(screen.getByText(/Recorded in Maluku/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/No species in the reference set match this region/i)).toBeInTheDocument();
  });
});