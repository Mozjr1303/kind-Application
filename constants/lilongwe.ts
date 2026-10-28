/**
 * Shared Lilongwe Geographic Configuration and Coordinates
 * NOTE: All coordinates below are APPROXIMATE centroids for reference and selection.
 * Please verify or calibrate coordinates as needed.
 */

export interface LilongweArea {
  name: string;
  lat: number;
  lng: number;
  description?: string;
}

export const LILONGWE_CENTER = {
  lat: -13.9626,
  lng: 33.7741,
} as const;

export const LILONGWE_SERVICE_AREA = {
  minLat: -14.10,
  maxLat: -13.85,
  minLng: 33.65,
  maxLng: 33.92,
  maxRadiusKm: 25,
} as const;

/**
 * 27 Well-known Lilongwe areas with approximate coordinates.
 * Marked as approximate for verification.
 */
export const LILONGWE_AREAS: LilongweArea[] = [
  { name: 'City Centre', lat: -13.9535, lng: 33.7885, description: 'Capital Hill / Government & embassies' },
  { name: 'Old Town', lat: -13.9833, lng: 33.7667, description: 'Commercial centre & Lilongwe Town Hall' },
  { name: 'Area 3', lat: -13.9800, lng: 33.7750, description: 'Near Old Town / residential & commercial' },
  { name: 'Area 6', lat: -13.9720, lng: 33.7780, description: 'Central residential' },
  { name: 'Area 9', lat: -13.9650, lng: 33.7820, description: 'Near golf club & State House' },
  { name: 'Area 10', lat: -13.9480, lng: 33.7920, description: 'Low density residential' },
  { name: 'Area 11', lat: -13.9400, lng: 33.7850, description: 'Central residential' },
  { name: 'Area 12', lat: -13.9500, lng: 33.8000, description: 'Residential & diplomatic' },
  { name: 'Area 15', lat: -13.9750, lng: 33.7900, description: 'Low-to-medium density residential' },
  { name: 'Area 18', lat: -13.9350, lng: 33.7800, description: 'A & B residential estates' },
  { name: 'Area 23', lat: -14.0200, lng: 33.7900, description: 'High density residential' },
  { name: 'Area 25', lat: -13.8950, lng: 33.7750, description: 'Sector A-C residential' },
  { name: 'Area 43', lat: -13.9200, lng: 33.8150, description: 'Low density residential / high-end' },
  { name: 'Area 47', lat: -13.9450, lng: 33.7600, description: 'Sector 1-5 residential estates' },
  { name: 'Area 49', lat: -13.9150, lng: 33.7500, description: 'New Gulliver / residential' },
  { name: 'Biwi', lat: -13.9950, lng: 33.7850, description: 'High density commercial & residential' },
  { name: 'Chigwirizano', lat: -14.0300, lng: 33.7200, description: 'Southwest Lilongwe' },
  { name: 'Chilinde', lat: -14.0050, lng: 33.7950, description: 'High density residential' },
  { name: 'Chinsapo', lat: -13.9700, lng: 33.7300, description: 'West Lilongwe' },
  { name: 'Falls Estate (Area 1)', lat: -13.9920, lng: 33.7650, description: 'Near Lilongwe River' },
  { name: 'Kanengo', lat: -13.8750, lng: 33.7900, description: 'Industrial area' },
  { name: 'Kauma', lat: -13.9600, lng: 33.8200, description: 'East of City Centre' },
  { name: 'Kawale', lat: -13.9900, lng: 33.7800, description: 'Central high density' },
  { name: 'Likuni', lat: -14.0250, lng: 33.7150, description: 'West Lilongwe / Hospital area' },
  { name: 'Lumbadzi', lat: -13.8550, lng: 33.7850, description: 'North Lilongwe / Airport corridor' },
  { name: 'Mchesi', lat: -13.9850, lng: 33.7900, description: 'Commercial / artisan markets' },
  { name: 'Mtandire', lat: -13.9400, lng: 33.7550, description: 'Adjacent to Area 47 & 49' },
];

/**
 * Finds the closest predefined Lilongwe area to the given coordinates.
 */
export function findClosestLilongweArea(lat: number, lng: number): LilongweArea {
  let closest = LILONGWE_AREAS[0];
  let minDistance = calculateDistanceKm(lat, lng, closest.lat, closest.lng);
  for (const area of LILONGWE_AREAS) {
    const d = calculateDistanceKm(lat, lng, area.lat, area.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = area;
    }
  }
  return closest;
}

/**
 * Uses OpenStreetMap Nominatim free reverse-geocoding API to get the real-time
 * neighborhood / suburb name in Lilongwe, falling back to the closest known area.
 */
export async function reverseGeocodeLilongwe(lat: number, lng: number): Promise<string> {
  const fallback = findClosestLilongweArea(lat, lng).name;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (!res.ok) return fallback;
    const data = await res.json();
    const addr = data?.address;
    if (addr) {
      const candidate =
        addr.suburb ||
        addr.neighbourhood ||
        addr.quarter ||
        addr.residential ||
        addr.city_district ||
        addr.village;
      if (candidate && typeof candidate === 'string') {
        return candidate;
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Great-circle distance between two points in kilometers (Haversine formula).
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

/**
 * Validates whether a given lat/lng falls inside the Lilongwe service area.
 * Requires:
 * 1. Coordinates within the service area bounding box.
 * 2. Distance within 25 km from Lilongwe Center.
 */
export function isInsideLilongwe(lat: number, lng: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;

  const inBoundingBox =
    lat >= LILONGWE_SERVICE_AREA.minLat &&
    lat <= LILONGWE_SERVICE_AREA.maxLat &&
    lng >= LILONGWE_SERVICE_AREA.minLng &&
    lng <= LILONGWE_SERVICE_AREA.maxLng;

  if (!inBoundingBox) return false;

  const distanceKm = calculateDistanceKm(
    LILONGWE_CENTER.lat,
    LILONGWE_CENTER.lng,
    lat,
    lng
  );
  return distanceKm <= LILONGWE_SERVICE_AREA.maxRadiusKm;
}
