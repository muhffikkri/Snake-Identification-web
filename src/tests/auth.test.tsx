import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AuthPage from '../components/auth/AuthPage';
import LandingPage from '../components/LandingPage';
import { useAppStore } from '../store/store';
import { commitDraft } from '../lib/assessment';

vi.mock('../lib/assessment', async () => {
  const actual = await vi.importActual<typeof import('../lib/assessment')>('../lib/assessment');
  return { ...actual, commitDraft: vi.fn().mockResolvedValue(undefined) };
});

function LocationProbe({ onChange }: { onChange: (path: string) => void }) {
  onChange(useLocation().pathname);
  return null;
}

function renderAuth(mode: 'login' | 'register', start = '/login') {
  let current = '';
  const result = render(
    <MemoryRouter initialEntries={[start]}>
      <LocationProbe onChange={(p) => (current = p)} />
      <AuthPage mode={mode} />
    </MemoryRouter>,
  );
  return { path: () => current, ...result };
}

const DRAFT = {
  incidentId: 'inc_draft_1',
  species: null,
  photo: null,
  details: {
    gps_coordinates: { lat: -6.2, lng: 106.8, accuracy: 10, timestamp: 1 },
    species_prediction: { primary: 'Not identified', risk: 'NON-VENOMOUS' as const, confidence: 0, alternatives: [] },
    severity_assessment: { grade: 0 as const, grade_history: [], who_protocol: [] },
    symptoms: {
      bite_location: 'Lower leg',
      pain_scale: 1,
      swelling_grade: 0,
      local_effects: [],
      systemic_effects: [],
      vital_signs: { hr: 80, bp: '120/80', spo2: 98 },
    },
  },
};

describe('AuthPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({ account: null, pendingAssessment: null });
  });

  it('never blocks the assessment behind an account', () => {
    renderAuth('register');
    expect(screen.getByRole('link', { name: /run the assessment without saving/i })).toBeInTheDocument();
  });

  it('rejects a name that is too short instead of failing silently', () => {
    renderAuth('register');
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'a' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/at least two characters/i);
    expect(useAppStore.getState().account).toBeNull();
  });

  it('signs a general user in and lands on activity', async () => {
    const { path } = renderAuth('login');
    fireEvent.change(screen.getByLabelText(/account name/i), { target: { value: 'Rina' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(path()).toBe('/activity'));
    expect(useAppStore.getState().account).toEqual({ name: 'Rina', role: 'USER' });
  });

  it('offers a government account as a secondary control', () => {
    renderAuth('register');
    const agency = screen.getByRole('button', { name: /register as a government account/i });
    expect(agency.className).toContain('btn-tertiary');
  });

  it('lands a government account on the surveillance view', async () => {
    const { path } = renderAuth('login');
    fireEvent.click(screen.getByRole('button', { name: /sign in as a government account/i }));

    await waitFor(() => expect(path()).toBe('/government'));
    expect(useAppStore.getState().account?.role).toBe('GOVERNMENT');
  });

  it('shows a held assessment and saves it on registration', async () => {
    useAppStore.setState({ pendingAssessment: DRAFT });
    renderAuth('register', '/register');

    expect(screen.getByText(/assessment held/i)).toBeInTheDocument();
    expect(screen.getByText(/inc_draft_1/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: 'Rina' } });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(commitDraft).toHaveBeenCalledWith(DRAFT, 'Rina'));
    // The draft is cleared only after the write resolves.
    await waitFor(() => expect(useAppStore.getState().pendingAssessment).toBeNull());
    expect(useAppStore.getState().account).toEqual({ name: 'Rina', role: 'USER' });
  });

  it('lets the user abandon a held assessment and return to it', async () => {
    useAppStore.setState({ pendingAssessment: DRAFT });
    const { path } = renderAuth('register', '/register');

    fireEvent.click(screen.getByRole('button', { name: /go back to the assessment instead/i }));

    await waitFor(() => expect(path()).toBe('/triage'));
    expect(useAppStore.getState().pendingAssessment).toBeNull();
  });

  it('drops a held assessment when a government account is chosen instead', async () => {
    useAppStore.setState({ pendingAssessment: DRAFT });
    const { path } = renderAuth('register', '/register');

    fireEvent.click(screen.getByRole('button', { name: /register as a government account/i }));

    await waitFor(() => expect(path()).toBe('/government'));
    expect(useAppStore.getState().pendingAssessment).toBeNull();
    expect(commitDraft).not.toHaveBeenCalled();
  });
});

describe('Landing navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('offers sign in and register instead of a triage button in the navigation', () => {
    const nav = render(
      <MemoryRouter>
        <LandingPage onIdentify={vi.fn()} onTriage={vi.fn()} onSignIn={vi.fn()} onRegister={vi.fn()} />
      </MemoryRouter>,
    ).container.querySelector('nav');

    expect(nav).toBeTruthy();
    expect(nav?.textContent).toContain('Sign in');
    expect(nav?.textContent).toContain('Register');
    // The navigation no longer offers triage, and no longer carries an account
    // or menu control.
    expect(nav?.textContent).not.toMatch(/start triage/i);
    expect(nav?.querySelector('[aria-label*="navigation menu" i]')).toBeNull();
    expect(nav?.textContent).not.toMatch(/account/i);
  });

  it('keeps triage reachable from the hero', () => {
    render(
      <MemoryRouter>
        <LandingPage onIdentify={vi.fn()} onTriage={vi.fn()} onSignIn={vi.fn()} onRegister={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('button', { name: /start triage assessment/i }).length).toBeGreaterThan(0);
  });

  it('wires the navigation buttons to the account routes', () => {
    const onSignIn = vi.fn();
    const onRegister = vi.fn();
    render(
      <MemoryRouter>
        <LandingPage onIdentify={vi.fn()} onTriage={vi.fn()} onSignIn={onSignIn} onRegister={onRegister} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getAllByRole('button', { name: /^sign in$/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /^register$/i })[0]);
    expect(onSignIn).toHaveBeenCalled();
    expect(onRegister).toHaveBeenCalled();
  });
});