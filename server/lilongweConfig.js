/**
 * Server-side Lilongwe Geographic Configuration and Helpers (CommonJS)
 */

const LILONGWE_CENTER = {
  lat: -13.9626,
  lng: 33.7741
};

const LILONGWE_SERVICE_AREA = {
  minLat: -14.10,
  maxLat: -13.85,
  minLng: 33.65,
  maxLng: 33.92,
  maxRadiusKm: 25
};

const LILONGWE_AREAS = [
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
  { name: 'Mtandire', lat: -13.9400, lng: 33.7550, description: 'Adjacent to Area 47 & 49' }
];

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

function isInsideLilongwe(lat, lng) {
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

module.exports = {
  LILONGWE_CENTER,
  LILONGWE_SERVICE_AREA,
  LILONGWE_AREAS,
  calculateDistanceKm,
  isInsideLilongwe
};
