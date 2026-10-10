import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Discover from '../components/Discover';
import { useAppStore } from '../store/store';

const mockSpecies = [
  {
    slug: 'sp-1',
    scientific_name: 'Acanthophis laevis',
    common_name_en: 'Death Adder',
    common_name_local: 'Ular Kematian',
    venom_type: 'NEUROTOXIC',
    image_path: '/dataset/a.jpg',
    observation_count: 5,
  },
  {
    slug: 'sp-2',
    scientific_name: 'Ahaetulla prasina',
    common_name_en: 'Oriental Whip Snake',
    common_name_local: 'Ular Pucuk Hijau',
    venom_type: 'NON-VENOMOUS',
    image_path: '/dataset/b.jpg',
    observation_count: 3,
  },
];

// Mock the pagination hook so Discover tests are deterministic.
vi.mock('../lib/useNeonSpecies', () => ({
  useNeonSpeciesPage: vi.fn(),
  PAGE_SIZE: 24,
}));

// Mock neon image helpers so the card render path stays offline.
vi.mock('../lib/neon', () => ({
  imageSrc: (p: string) => p,
}));

import { useNeonSpeciesPage } from '../lib/useNeonSpecies';

const mockedHook = useNeonSpeciesPage as unknown as ReturnType<typeof vi.fn>;

function renderDiscover(page = 1, pages = 3) {
  mockedHook.mockReturnValue({
    page,
    pages,
    total: 48,
    items: mockSpecies,
    loading: false,
    error: null,
    loadMore: vi.fn(),
    goToPage: vi.fn(),
    reset: vi.fn(),
  });
  return render(<Discover onOpenSpecies={vi.fn()} />);
}

describe('Discover pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ gps: { lat: -6.2, lng: 106.8, accuracy: 15, timestamp: 1 }, networkStatus: 'online' });
  });

  it('renders numbered page controls with Prev and Next', async () => {
    renderDiscover();
    await waitFor(() => expect(screen.getByRole('button', { name: /previous page/i })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    const current = screen.getByRole('button', { name: /go to page 1/i });
    expect(current).toHaveAttribute('aria-current', 'page');
  });

  it('disables Prev on the first page', () => {
    renderDiscover();
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
  });

  it('disables Next on the last page', () => {
    renderDiscover(3, 3);
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });

  it('shows a total count and no longer shows a Load more button', () => {
    renderDiscover();
    expect(screen.getAllByText(/48 species/).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });
});
