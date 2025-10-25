// services/update.js (ESM version)
import { fetchWeather } from "./weatherService.js"; // giả sử có hàm gọi API
import fs from "fs";

export async function updateWeather(city = "Hanoi", country = "VN") {
  try {
    const data = await fetchWeather(city, country);
    fs.writeFileSync(`./data/weather_${city}.json`, JSON.stringify(data, null, 2));
    console.log(`✅ Weather updated: ${city} (${country})`);
    return data;
  } catch (err) {
    console.error(`❌ Weather update failed for ${city}:`, err.message);
    throw err;
  }
}

// --- Bản mở rộng: nhiều thành phố ---
export async function updateWeatherMulti(cities = []) {
  console.log("🔄 [AutoUpdate] Weather multi-city...");
  const results = [];

  for (const { city, country } of cities) {
    try {
      const data = await updateWeather(city, country);
      results.push({ city, country, success: true, data });
    } catch (err) {
      results.push({ city, country, success: false, error: err.message });
    }
  }

  return results;
}