// routes/weather.js (ESM version)

import dotenv from "dotenv";
dotenv.config();

import fs from "fs/promises";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";

// ================== CHUẨN HÓA INPUT ==================
function removeAccents(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}
function normalizeInput(str) {
  if (!str) return "";
  return removeAccents(str).toLowerCase().trim().replace(/\s+/g, " ");
}

// ================== DANH SÁCH 34 TỈNH/THÀNH ==================
const provincesVN34 = [
  "An Giang","Bắc Ninh","Cà Mau","Cao Bằng","Đắk Lắk","Điện Biên","Đồng Nai","Đồng Tháp",
  "Gia Lai","Hà Tĩnh","Hưng Yên","Khánh Hòa","Lai Châu","Lâm Đồng","Lạng Sơn","Lào Cai",
  "Nghệ An","Ninh Bình","Phú Thọ","Quảng Ngãi","Quảng Ninh","Quảng Trị","Sơn La","Tây Ninh",
  "Thái Nguyên","Thanh Hóa","TP. Cần Thơ","TP. Đà Nẵng","TP. Hà Nội","TP. Hải Phòng",
  "TP. Hồ Chí Minh","TP. Huế","Tuyên Quang","Vĩnh Long"
];

// ================== MAPPING TỈNH -> API CITY ==================
// Một số tỉnh không có dữ liệu trực tiếp, phải dùng thủ phủ
const provinceToApiName = {
  "An Giang": "Long Xuyen",
  "Bắc Ninh": "Bac Ninh",
  "Cà Mau": "Ca Mau",
  "Cao Bằng": "Cao Bang",
  "Đắk Lắk": "Buon Ma Thuot",
  "Điện Biên": "Dien Bien Phu",
  "Đồng Nai": "Bien Hoa",
  "Đồng Tháp": "Cao Lanh",
  "Gia Lai": "Pleiku",
  "Hà Tĩnh": "Ha Tinh",
  "Hưng Yên": "Hung Yen",
  "Khánh Hòa": "Nha Trang",
  "Lai Châu": "Lai Chau",
  "Lâm Đồng": "Da Lat",
  "Lạng Sơn": "Lang Son",
  "Lào Cai": "Lao Cai",
  "Nghệ An": "Vinh",
  "Ninh Bình": "Ninh Binh",
  "Phú Thọ": "Viet Tri",
  "Quảng Ngãi": "Quang Ngai",
  "Quảng Ninh": "Ha Long",
  "Quảng Trị": "Dong Ha",
  "Sơn La": "Son La",
  "Tây Ninh": "Tay Ninh",
  "Thái Nguyên": "Thai Nguyen",
  "Thanh Hóa": "Thanh Hoa",
  "TP. Cần Thơ": "Can Tho",
  "TP. Đà Nẵng": "Da Nang",
  "TP. Hà Nội": "Hanoi",
  "TP. Hải Phòng": "Haiphong",
  "TP. Hồ Chí Minh": "Ho Chi Minh City",
  "TP. Huế": "Hue",
  "Tuyên Quang": "Tuyen Quang",
  "Vĩnh Long": "Vinh Long"
};

// ================== ALIASES ==================
// Các cách gọi khác nhau của cùng một tỉnh/thành
const provinceAliases = {
  "TP. Đà Nẵng": ["da nang", "danang", "tp da nang"],
  "TP. Hà Nội": ["ha noi", "hanoi", "tp ha noi"],
  "TP. Hồ Chí Minh": ["ho chi minh", "hcm", "tp hcm", "sai gon", "saigon"],
  "TP. Hải Phòng": ["hai phong", "haiphong", "tp hai phong"],
  "TP. Cần Thơ": ["can tho", "tp can tho"],
  "TP. Huế": ["hue", "tp hue", "thua thien hue"]
};

// ================== FILE PATH & API KEY ==================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const weatherFilePath = path.join(__dirname, "..", "data", "weather.json");

const API_KEY = process.env.OPENWEATHER_API_KEY;

// ================== FORMATTER ==================
function getWeatherEmoji(description = "") {
  const desc = description.toLowerCase();
  if (desc.includes("nắng") || desc.includes("clear")) return "☀️";
  if (desc.includes("mây rải rác") || desc.includes("scattered")) return "🌥️";
  if (desc.includes("mây") || desc.includes("cloud") || desc.includes("overcast")) return "☁️";
  if (desc.includes("mưa") || desc.includes("rain")) return "🌧️";
  if (desc.includes("giông") || desc.includes("thunder")) return "⛈️";
  if (desc.includes("tuyết") || desc.includes("snow")) return "❄️";
  if (desc.includes("sương") || desc.includes("fog") || desc.includes("mist") || desc.includes("haze")) return "🌫️";
  if (desc.includes("gió mạnh") || desc.includes("storm") || desc.includes("tropical")) return "🌪️";
  return "🌤️";
}
function formatWeatherResponse(weather, locationName) {
  if (!weather) return "⚠️ Không có dữ liệu thời tiết.";
  const emoji = getWeatherEmoji(weather.description || "");
  return `${emoji} Thời tiết tại **${locationName}**: ${weather.description}, `
       + `🌡️ ${Math.round(weather.temperature)}°C (cảm giác ${Math.round(weather.feels_like)}°C), `
       + `💧 ${weather.humidity}%, 🌬️ ${weather.wind_speed} m/s `
       + `(cập nhật lúc ${new Date(weather.collectedAt).toLocaleString("vi-VN")}).`;
}

// ================== FETCH & UPDATE ==================
async function fetchWeather(city) {
  try {
    const apiName = provinceToApiName[city] || city;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(apiName)},VN&appid=${API_KEY}&units=metric&lang=vi`;
    const res = await axios.get(url);
    const d = res.data;
    return {
      temperature: d.main.temp,
      feels_like: d.main.feels_like,
      description: d.weather[0].description,
      humidity: d.main.humidity,
      wind_speed: d.wind.speed,
      collectedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error(`❌ Lỗi lấy thời tiết cho ${city} (${provinceToApiName[city]}):`, err.message);
    return null;
  }
}

export async function updateWeatherVN34() {
  const results = {};
  for (const city of provincesVN34) {
    const data = await fetchWeather(city);
    if (data) {
      results[city] = data;
      console.log(`✅ Đã cập nhật ${city}`);
    }
    await new Promise(r => setTimeout(r, 800)); // tránh spam API
  }
  await fs.mkdir(path.dirname(weatherFilePath), { recursive: true });
  await fs.writeFile(weatherFilePath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`🎉 Đã cập nhật weather.json cho ${Object.keys(results).length}/34 tỉnh/thành`);
}

// ================== EXTRACT CITY ==================
function extractCity(query) {
  const normQ = normalizeInput(query);

  // Check alias trước
  for (const [province, aliases] of Object.entries(provinceAliases)) {
    if (aliases.some(alias => normQ.includes(alias))) {
      return province;
    }
  }

  // Nếu không có alias thì check trực tiếp trong danh sách
  return provincesVN34.find(p => normQ.includes(normalizeInput(p))) || null;
}

// ================== HANDLER ==================
export async function weatherHandler(query) {
  try {
    const content = await fs.readFile(weatherFilePath, "utf8");
    const allData = JSON.parse(content);

    const matchedProvince = extractCity(query);
    if (!matchedProvince) {
      return {
        reply: `❌ Không tìm thấy tỉnh/thành nào trong câu hỏi: "${query}".`,
        source: "weather",
        error: true
      };
    }

    let data = allData[matchedProvince];

    // ✅ Nếu chưa có dữ liệu trong file → fallback gọi API trực tiếp
    if (!data) {
      console.warn(`⚠️ Chưa có dữ liệu cache cho ${matchedProvince}, gọi API trực tiếp...`);
      data = await fetchWeather(matchedProvince);

      if (data) {
        // Lưu bổ sung vào cache để lần sau dùng lại
        allData[matchedProvince] = data;
        await fs.mkdir(path.dirname(weatherFilePath), { recursive: true });
        await fs.writeFile(weatherFilePath, JSON.stringify(allData, null, 2), "utf-8");
      } else {
        return {
          reply: `⚠️ Không lấy được dữ liệu thời tiết cho ${matchedProvince}.`,
          source: "weather",
          error: true
        };
      }
    }

   return {
  message: formatWeatherResponse(data, matchedProvince),
  source: "weather",
  error: false
};
  } catch (err) {
    console.error("❌ Lỗi đọc weather.json:", err.message);

    // ✅ Nếu đọc file lỗi → fallback gọi API trực tiếp
    const matchedProvince = extractCity(query);
    if (matchedProvince) {
      const data = await fetchWeather(matchedProvince);
      if (data) {
        return {
          reply: formatWeatherResponse(data, matchedProvince),
          source: "weather",
          error: false
        };
      }
    }

    return {
      reply: "⚠️ Không thể lấy dữ liệu thời tiết, vui lòng thử lại sau.",
      source: "weather",
      error: true
    };
  }
}

// ================== AUTO UPDATE ==================
async function runUpdate() {
  console.log("🚀 Bắt đầu cập nhật thời tiết 34 tỉnh/thành...");
  await updateWeatherVN34();
  console.log("✅ Hoàn tất cập nhật.");
}

// Cập nhật ngay khi server start
runUpdate();

// Lên lịch cập nhật lại mỗi 30 phút
cron.schedule("*/30 * * * *", async () => {
  console.log("⏰ Cron job kích hoạt: cập nhật thời tiết...");
  await runUpdate();
});