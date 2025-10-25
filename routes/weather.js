// routes/weather.js (ESM version)
import express from "express";
import { extractMessage, handleUserQuestion } from "../services/chatService.js";
import cityExtractor from "../middleware/cityExtractor.js";
import { normalizeCity } from "../utils/normalizeCity.js";
import { formatWeatherResponse } from "../utils/formatWeather.js";
import validateCity from "../middleware/validateCity.js";

const router = express.Router();

// GET /weather?city=Hanoi hoặc hỏi tự nhiên (nếu có cityExtractor)
router.get("/", cityExtractor, validateCity, async (req, res) => {
  try {
    const rawCity = req.query.city;

    if (!rawCity || rawCity.trim().length < 2) {
      return res.status(400).json({
        success: false,
        source: "weather",
        group: "internal",
        error: "Thiếu hoặc tên thành phố không hợp lệ. Vui lòng nhập ?city=..."
      });
    }

    const city = normalizeCity(rawCity);

    const start = Date.now();
    const weather = await getWeather(city);
    const duration = Date.now() - start;

    res.locals.source = "weather";
    res.locals.group = "internal";

    if (!weather) {
      console.warn(`⚠️ Không có dữ liệu thời tiết cho ${city}`);
      return res.status(500).json({
        success: false,
        source: "weather",
        group: "internal",
        error: `Không lấy được dữ liệu thời tiết cho ${city}`
      });
    }

    console.info(`📡 GET /weather?city=${city} → OK (${duration}ms)`);

    res.json({
      success: true,
      source: "weather",
      group: "internal",
      city,
      data: weather,
      message: formatWeatherResponse(weather) // bản tin chuyên nghiệp
    });
  } catch (err) {
    console.error("❌ Lỗi khi xử lý /weather:", err.code, err.response?.status, err.message);

    res.locals.source = "weather";
    res.locals.group = "internal";

    res.status(500).json({
      success: false,
      source: "weather",
      group: "internal",
      error: "Lỗi server khi lấy dữ liệu thời tiết"
    });
  }
});

export default router;