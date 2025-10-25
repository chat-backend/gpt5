// services/weatherService.js (ESM version)
import axios from "axios";
import { normalizeCity, removeAccents } from "../utils/normalizeCity.js";
import { cityAliasMap } from "../utils/cityAliasMap.js";

const weatherCacheByCity = {};

export async function getWeatherByCity(cityName, countryCode = "VN") {
  if (!cityName) throw new Error("Thiếu tên thành phố");

  const normalized = normalizeCity(cityName);
  const queryName = removeAccents(normalized).toLowerCase();

  // fallback alias: nếu không có trong map thì bỏ dấu normalized
  const alias = cityAliasMap[queryName] || removeAccents(normalized);
  const cacheKey = `${alias},${countryCode}`;

  // Kiểm tra cache
  const cached = weatherCacheByCity[cacheKey];
  if (cached && Date.now() - new Date(cached.collectedAt).getTime() < 5 * 60 * 1000) {
    return cached;
  }

  try {
    // Gọi API chính
    const res = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: {
        q: `${alias},${countryCode}`,
        appid: process.env.OPENWEATHER_API_KEY,
        units: "metric",
        lang: "vi"
      }
    });

   return saveToCache(cacheKey, res.data);
} catch (err) {
  console.warn(`⚠️ Không tìm thấy ${alias}, thử fallback geocoding...`);
   
    // Fallback: dùng Geocoding API
    try {
      const geo = await axios.get("https://api.openweathermap.org/geo/1.0/direct", {
        params: { q: `${alias},${countryCode}`, limit: 1, appid: process.env.OPENWEATHER_API_KEY }
      });
      if (geo.data && geo.data.length > 0) {
        const { lat, lon, name } = geo.data[0];
        const res2 = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
          params: { lat, lon, appid: process.env.OPENWEATHER_API_KEY, units: "metric", lang: "vi" }
        });
        return saveToCache(cacheKey, res2.data, name);
      }
    } catch (geoErr) {
      console.error("❌ Fallback geocoding thất bại:", geoErr.message);
    }

    return { city: normalized, error: "Không lấy được dữ liệu thời tiết" };
  }
}

function saveToCache(cacheKey, data, overrideName) {
  const result = {
    city: overrideName || data.name,
    country: data.sys?.country,
    temperature: Math.round(data.main?.temp),
    feels_like: Math.round(data.main?.feels_like),
    description: data.weather?.[0]?.description,
    humidity: data.main?.humidity,
    wind_speed: data.wind?.speed,
    collectedAt: new Date().toISOString()
  };
  weatherCacheByCity[cacheKey] = result;
  return result;
}