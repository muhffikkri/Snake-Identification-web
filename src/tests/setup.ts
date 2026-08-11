import { vi } from 'vitest';
import React from 'react';
import '@testing-library/jest-dom';

// Mock Web Haptic Feedback
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'vibrate', {
    value: vi.fn().mockReturnValue(true),
    writable: true,
  });
}

// Mock Web Audio API
if (typeof window !== 'undefined') {
  class MockAudioContext {
    currentTime = 0;
    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
    }
    createGain() {
      return {
        connect: vi.fn(),
        gain: {
          setValueAtTime: vi.fn(),
        },
      };
    }
    destination = {};
  }

  (window as any).AudioContext = MockAudioContext;
  (window as any).webkitAudioContext = MockAudioContext;

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock react-leaflet to prevent JSDOM Map Container errors
vi.mock('react-leaflet', () => {
  return {
    MapContainer: ({ children, center, zoom }: any) => 
      React.createElement('div', { 'data-testid': 'map-container', 'data-center': JSON.stringify(center), 'data-zoom': zoom }, children),
    TileLayer: ({ url }: any) => 
      React.createElement('div', { 'data-testid': 'tile-layer', 'data-url': url }),
    Polygon: ({ children, positions, pathOptions }: any) => 
      React.createElement('div', { 'data-testid': 'polygon', 'data-positions': JSON.stringify(positions), 'data-options': JSON.stringify(pathOptions) }, children),
    Popup: ({ children }: any) => 
      React.createElement('div', { 'data-testid': 'popup' }, children),
    Marker: ({ children, position }: any) => 
      React.createElement('div', { 'data-testid': 'marker', 'data-position': JSON.stringify(position) }, children),
  };
});

// Mock Leaflet L object
vi.mock('leaflet', () => {
  return {
    default: {
      divIcon: vi.fn().mockReturnValue({}),
    },
  };
});

// Mock Web Crypto API for crypto service in tests to avoid key derivation lag
vi.mock('../services/crypto', () => {
  return {
    encryptData: vi.fn().mockImplementation(async (text: string) => `ENCRYPTED:${text}`),
    decryptData: vi.fn().mockImplementation(async (enc: string) => {
      if (enc.startsWith('ENCRYPTED:')) {
        return enc.substring(10);
      }
      return enc;
    }),
  };
});
