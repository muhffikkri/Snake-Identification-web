import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../components/Home';

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
          }
        ]),
        count: vi.fn().mockResolvedValue(1),
        toCollection: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue({ reference_images: ['http://mock.com'] })
        }),
        clear: vi.fn().mockResolvedValue(true),
        bulkAdd: vi.fn().mockResolvedValue(true)
      },
      incidents: {
        count: vi.fn().mockResolvedValue(0),
        add: vi.fn().mockResolvedValue(true)
      }
    },
    addIncidentLog: vi.fn().mockResolvedValue(true),
    getIncidentLog: vi.fn().mockResolvedValue(null),
    getAllDecryptedIncidents: vi.fn().mockResolvedValue([])
  };
});

describe('Home Component', () => {
  const mockOnNavigate = vi.fn();
  const mockOnSetIncidentId = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders application brand, stay calm messaging, and panic button', async () => {
    render(<Home onNavigate={mockOnNavigate} onSetIncidentId={mockOnSetIncidentId} />);

    expect(screen.getByText(/SnakeBite/i)).toBeInTheDocument();
    expect(screen.getByText(/STAY CALM/i)).toBeInTheDocument();
    expect(screen.getByText(/PANIC/i)).toBeInTheDocument();
    expect(screen.getByText(/I AM BITTEN/i)).toBeInTheDocument();
  });

  it('triggers emergency procedure when panic button is clicked', async () => {
    render(<Home onNavigate={mockOnNavigate} onSetIncidentId={mockOnSetIncidentId} />);

    const panicBtn = screen.getByRole('button', { name: /Tombol Darurat/i });
    fireEvent.click(panicBtn);

    // Wait for the async emergency handler to save to db and navigate
    await waitFor(() => {
      expect(mockOnSetIncidentId).toHaveBeenCalled();
      expect(mockOnNavigate).toHaveBeenCalledWith('triage');
    });
  });

  it('renders local snake species cards list', async () => {
    render(<Home onNavigate={mockOnNavigate} onSetIncidentId={mockOnSetIncidentId} />);

    await waitFor(() => {
      expect(screen.getByText('Naja sputatrix')).toBeInTheDocument();
      expect(screen.getByText('Ular Kobra Jawa')).toBeInTheDocument();
    });
  });
});
