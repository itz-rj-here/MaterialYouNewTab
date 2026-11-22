import { Router } from "express";

const router = Router();

// In-memory cache with 10-minute TTL to reduce upstream latency
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCached(key, data) {
  // Limit cache size to 100 items
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

/**
 * Weather Proxy & Fallback Provider
 * GET /api/weather?loc=London or ?lat=51.5&lon=-0.12&apiKey=...
 */
router.get("/weather", async (req, res, next) => {
  try {
    const { loc, lat, lon } = req.query;
    const clientKey = req.query.apiKey;
    const apiKey = clientKey || process.env.WEATHER_API_KEY;

    const cacheKey = `weather:${loc || ""}:${lat || ""}:${lon || ""}:${apiKey ? "key" : "free"}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ success: true, data: cached, cached: true });
    }

    // 1. If an API key is available (WeatherAPI), proxy to WeatherAPI
    if (apiKey) {
      const queryParam = loc ? encodeURIComponent(String(loc).slice(0, 50)) : `${lat},${lon}`;
      const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${queryParam}&days=1&aqi=no&alerts=no`;

      const response = await fetch(url, { headers: { "User-Agent": "MaterialYouNewTab/3.3" } });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: {
            code: "WEATHER_API_ERROR",
            message: errorData.error?.message || "Failed to fetch weather from provider."
          }
        });
      }

      const data = await response.json();
      setCached(cacheKey, data);
      return res.json({ success: true, data });
    }

    // 2. If no API key, use free Open-Meteo API
    let latitude = Number(lat);
    let longitude = Number(lon);

    // If only city/location text provided, geocode via Open-Meteo geocoding API
    if ((isNaN(latitude) || isNaN(longitude)) && loc) {
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(String(loc).slice(0, 50))}&count=1&language=en&format=json`;
      const geoRes = await fetch(geoUrl);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.results && geoData.results.length > 0) {
          latitude = geoData.results[0].latitude;
          longitude = geoData.results[0].longitude;
        }
      }
    }

    // Default coordinates (London) if none resolved
    if (isNaN(latitude) || isNaN(longitude)) {
      latitude = 51.5074;
      longitude = -0.1278;
    }

    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const omRes = await fetch(openMeteoUrl);
    if (!omRes.ok) {
      return res.status(502).json({
        success: false,
        error: { code: "UPSTREAM_ERROR", message: "Open-Meteo weather service unavailable." }
      });
    }

    const omData = await omRes.json();
    
    // Normalize into a clean, friendly format
    const normalized = {
      location: {
        name: loc || "Current Location",
        lat: latitude,
        lon: longitude
      },
      current: {
        temp_c: Math.round(omData.current?.temperature_2m ?? 20),
        temp_f: Math.round(((omData.current?.temperature_2m ?? 20) * 9) / 5 + 32),
        humidity: omData.current?.relative_humidity_2m ?? 50,
        feelslike_c: Math.round(omData.current?.apparent_temperature ?? 20),
        feelslike_f: Math.round(((omData.current?.apparent_temperature ?? 20) * 9) / 5 + 32),
        is_day: omData.current?.is_day ?? 1,
        condition: {
          text: mapWmoCodeToText(omData.current?.weather_code),
          code: omData.current?.weather_code ?? 0
        }
      },
      forecast: {
        forecastday: [
          {
            day: {
              maxtemp_c: Math.round(omData.daily?.temperature_2m_max?.[0] ?? 22),
              mintemp_c: Math.round(omData.daily?.temperature_2m_min?.[0] ?? 15),
              maxtemp_f: Math.round(((omData.daily?.temperature_2m_max?.[0] ?? 22) * 9) / 5 + 32),
              mintemp_f: Math.round(((omData.daily?.temperature_2m_min?.[0] ?? 15) * 9) / 5 + 32)
            }
          }
        ]
      }
    };

    setCached(cacheKey, normalized);
    res.json({ success: true, data: normalized });
  } catch (error) {
    next(error);
  }
});

/**
 * Map WMO weather codes to readable text
 */
function mapWmoCodeToText(code) {
  if (code === 0) return "Sunny";
  if (code === 1 || code === 2) return "Partly Cloudy";
  if (code === 3) return "Overcast";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain Showers";
  if ([85, 86].includes(code)) return "Snow Showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Clear";
}

export default router;
