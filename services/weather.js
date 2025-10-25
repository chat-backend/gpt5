// services/weather.js (ESM version)
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeCity, removeAccents } from "../utils/normalizeCity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

/**
 * Lấy dữ liệu thời tiết theo tên thành phố
 * @param {string} city - Tên thành phố (ví dụ: "Hanoi")
 * @param {string} countryCode - Mã quốc gia (ví dụ: "VN")
 * @returns {Promise<object|null>} - Dữ liệu thời tiết hoặc null nếu lỗi
 */
export async function getWeather(city = "Hanoi", countryCode = "VN") {
  if (!OPENWEATHER_API_KEY) {
    console.error("❌ Chưa cấu hình OPENWEATHER_API_KEY trong .env");
    return null;
  }

  if (!city || city.trim().length < 2) {
    console.error("❌ Thiếu hoặc tên thành phố không hợp lệ");
    return null;
  }

  // Chuẩn hóa tên thành phố
  const normalizedCity = normalizeCity(city);
  const queryCity = removeAccents(normalizedCity); // dùng tên không dấu để gọi API

  try {
    const response = await axios.get("https://api.openweathermap.org/data/2.5/weather", {
      params: {
        q: `${queryCity},${countryCode}`,
        appid: OPENWEATHER_API_KEY,
        units: "metric", // nhiệt độ °C
        lang: "vi"       // trả về tiếng Việt
      },
      timeout: 10000
    });

    const data = response.data;

    const result = {
      success: true,
      source: "openweather",
      group: "external",
      city: data.name,
      country: data.sys?.country || null,
      temperature: data.main?.temp ?? null,
      feels_like: data.main?.feels_like ?? null,
      description: data.weather?.[0]?.description || "Không rõ",
      humidity: data.main?.humidity ?? null,
      wind_speed: data.wind?.speed ?? null,
      collectedAt: new Date().toISOString()
    };

    // Ghi ra file JSON để đồng bộ với autoUpdate
    try {
      const filePath = path.join(__dirname, "weather.json");
      await fs.writeFile(filePath, JSON.stringify(result, null, 2), "utf8");
      console.log(`✅ Đã cập nhật weather.json (${result.city})`);
    } catch (fileErr) {
      console.error("⚠️ Lỗi khi ghi weather.json:", fileErr.message);
    }

    return result;
  } catch (err) {
    console.error(
      "❌ Lỗi khi gọi OpenWeather:",
      err.code,
      err.response?.status,
      err.response?.data || err.message
    );
    return null;
  }
}