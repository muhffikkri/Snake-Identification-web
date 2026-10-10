import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import LandingPage from '../components/LandingPage';

describe('Landing navigation', () => {
  it('shows the Demo Dashboard button in place of Sign in / Register', () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage onIdentify={vi.fn()} onTriage={vi.fn()} onGovernment={vi.fn()} />
      </MemoryRouter>,
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeTruthy();
    expect(nav?.textContent).not.toContain('Sign in');
    expect(nav?.textContent).not.toContain('Register');
    expect(nav?.textContent).toContain('Demo Dashboard');
  });

  it('keeps Identify and Triage reachable from the hero', () => {
    render(
      <MemoryRouter>
        <LandingPage onIdentify={vi.fn()} onTriage={vi.fn()} onGovernment={vi.fn()} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('button', { name: /identify a snake/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /start triage assessment/i }).length).toBeGreaterThan(0);
  });
});
