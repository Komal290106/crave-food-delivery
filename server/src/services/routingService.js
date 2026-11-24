// In-memory cache for road route geometries to avoid repeated calls
const routeCache = new Map();

// Free open-source routing endpoints to try in order of speed
const ROUTING_ENDPOINTS = [
  'https://routing.openstreetmap.de/routed-car/route/v1/driving/',
  'https://router.project-osrm.org/route/v1/driving/'
];

/**
 * Fetch real driving road route between two coordinates using OSRM
 * Uses native Node.js fetch (Node 18+) so zero extra dependencies are needed.
 * @param {[number, number]} startLngLat - [longitude, latitude]
 * @param {[number, number]} endLngLat - [longitude, latitude]
 * @returns {Promise<{
 *   coordinates: Array<[number, number]>, // [[lat, lng], [lat, lng], ...] for Leaflet polyline
 *   distanceMeters: number,
 *   durationSeconds: number,
 *   source: string
 * }>}
 */
async function fetchRoadRoute(startLngLat, endLngLat) {
  if (!startLngLat || !endLngLat || startLngLat.length < 2 || endLngLat.length < 2) {
    return null;
  }

  const [startLng, startLat] = startLngLat;
  const [endLng, endLat] = endLngLat;

  // Cache key rounded to 4 decimals (~11 meters precision)
  const cacheKey = `${Number(startLng).toFixed(4)},${Number(startLat).toFixed(4)}_${Number(endLng).toFixed(4)},${Number(endLat).toFixed(4)}`;

  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey);
  }

  // Try routing endpoints with fallback
  for (const baseUrl of ROUTING_ENDPOINTS) {
    try {
      const url = `${baseUrl}${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'CraveFoodApp/1.0 (Student Project Demo)' }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.code === 'Ok' && data.routes?.length > 0) {
          const primaryRoute = data.routes[0];
          // OSRM returns GeoJSON coordinates as [lng, lat]. Leaflet polyline expects [lat, lng].
          const leafletPoints = primaryRoute.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

          if (leafletPoints.length >= 2) {
            const result = {
              coordinates: leafletPoints,
              distanceMeters: primaryRoute.distance,
              durationSeconds: primaryRoute.duration,
              source: 'OSRM_REAL_ROADS'
            };

            // Keep cache size bounded
            if (routeCache.size > 200) {
              const firstKey = routeCache.keys().next().value;
              routeCache.delete(firstKey);
            }
            routeCache.set(cacheKey, result);

            return result;
          }
        }
      }
    } catch (error) {
      console.warn(`[RoutingService] endpoint ${baseUrl} failed: ${error.message}, trying next...`);
    }
  }

  // Graceful fallback: return simple straight line endpoints only if all endpoints fail
  return {
    coordinates: [
      [startLat, startLng],
      [endLat, endLng]
    ],
    distanceMeters: null,
    durationSeconds: null,
    source: 'FALLBACK_DIRECT'
  };
}

module.exports = {
  fetchRoadRoute
};
