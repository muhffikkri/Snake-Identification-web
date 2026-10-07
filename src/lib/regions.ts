export interface Region {
  id: string;
  name: string;
  /** Schematic outline in [lat, lng] pairs. Not a survey boundary. */
  outline: [number, number][];
  center: [number, number];
}

/**
 * The seven geographic groupings of Indonesia, used for the location-based
 * discovery list and for the regional breakdown on the government map.
 *
 * The outlines are schematic. They trace the shape of each island group so the
 * choropleth has geometry to fill; they are not administrative boundaries and
 * must not be read as one. Real province polygons need a GeoJSON source that is
 * not in this repository.
 */
export const REGIONS: Region[] = [
  {
    id: 'sumatra',
    name: 'Sumatera',
    center: [0.5, 100.5],
    outline: [
      [5.5, 95.3],
      [4.5, 98.0],
      [1.5, 99.0],
      [-1.0, 101.5],
      [-3.0, 102.5],
      [-5.5, 105.0],
      [-5.8, 104.2],
      [-4.0, 102.0],
      [-1.5, 100.0],
      [1.0, 97.5],
      [4.0, 96.0],
    ],
  },
  {
    id: 'java',
    name: 'Jawa',
    center: [-7.3, 110.4],
    outline: [
      [-6.0, 106.0],
      [-6.2, 108.0],
      [-6.8, 111.0],
      [-6.9, 114.0],
      [-7.5, 114.5],
      [-8.5, 114.3],
      [-8.0, 110.0],
      [-7.5, 107.0],
      [-6.5, 105.5],
    ],
  },
  {
    id: 'kalimantan',
    name: 'Kalimantan',
    center: [-0.5, 114.0],
    outline: [
      [2.0, 109.0],
      [4.0, 111.0],
      [4.2, 114.0],
      [4.0, 117.8],
      [2.0, 117.9],
      [-1.0, 117.0],
      [-3.5, 116.5],
      [-4.0, 114.5],
      [-3.0, 111.5],
      [-1.5, 109.5],
    ],
  },
  {
    id: 'sulawesi',
    name: 'Sulawesi',
    center: [-2.0, 121.5],
    outline: [
      [1.5, 120.0],
      [1.8, 125.0],
      [1.0, 125.0],
      [0.5, 122.0],
      [-1.0, 121.5],
      [-0.8, 123.5],
      [-3.0, 124.0],
      [-5.5, 122.5],
      [-5.0, 119.5],
      [-2.5, 119.0],
      [-1.5, 120.0],
    ],
  },
  {
    id: 'nusantara',
    name: 'Bali & Nusa Tenggara',
    center: [-8.9, 120.0],
    outline: [
      [-8.3, 115.0],
      [-8.3, 116.5],
      [-8.5, 119.0],
      [-8.5, 121.0],
      [-8.3, 124.0],
      [-8.5, 125.0],
      [-10.2, 124.0],
      [-9.8, 120.0],
      [-8.9, 116.0],
      [-8.8, 115.0],
    ],
  },
  {
    id: 'maluku',
    name: 'Maluku',
    center: [-2.5, 129.0],
    outline: [
      [-1.0, 127.0],
      [-0.5, 129.0],
      [-1.5, 130.5],
      [-3.8, 131.0],
      [-4.0, 129.0],
      [-3.0, 127.0],
    ],
  },
  {
    id: 'papua',
    name: 'Papua',
    center: [-4.5, 137.0],
    outline: [
      [-1.5, 131.0],
      [-0.8, 134.0],
      [-2.5, 137.0],
      [-2.6, 141.0],
      [-9.0, 141.0],
      [-8.0, 138.0],
      [-5.0, 136.0],
      [-4.0, 134.0],
    ],
  },
];

/** Ray casting, so a coordinate resolves to the region polygon containing it. */
function contains(region: Region, lat: number, lng: number): boolean {
  let inside = false;
  const pts = region.outline;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [latI, lngI] = pts[i];
    const [latJ, lngJ] = pts[j];
    const straddles = latI > lat !== latJ > lat;
    if (straddles && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI) {
      inside = !inside;
    }
  }
  return inside;
}

export function regionAt(lat: number, lng: number): Region | null {
  return REGIONS.find((r) => contains(r, lat, lng)) ?? null;
}

/**
 * Falls back to the nearest region by centre so a coordinate with no satellite
 * fix still lands somewhere useful rather than on an empty list.
 */
export function nearestRegion(lat: number, lng: number): Region {
  let best = REGIONS[0];
  let bestDistance = Infinity;
  for (const region of REGIONS) {
    const dLat = region.center[0] - lat;
    const dLng = region.center[1] - lng;
    const distance = dLat * dLat + dLng * dLng;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = region;
    }
  }
  return best;
}