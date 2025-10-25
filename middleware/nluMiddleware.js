// middleware/nluMiddleware.js (ESM version)
import fetch from "node-fetch";
import { classifyQuery } from "../services/classifier.js";
import { logger, SOURCES } from "../utils/logger.js";

function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function callAPI(endpoint) {
  try {
    const resp = await fetch(`http://localhost:3000${endpoint}`);
    if (!resp.ok) {
      logger.error(`[callAPI] Lỗi gọi ${endpoint}: ${resp.status}`, { source: SOURCES.SYSTEM });
      return { success: false, error: `API lỗi ${resp.status}` };
    }
    return await resp.json();
  } catch (err) {
    logger.error(`[callAPI] Exception khi gọi ${endpoint}: ${err.message}`, { source: SOURCES.SYSTEM });
    return { success: false, error: err.message };
  }
}

async function extractCountryNameSmart(text) {
  const data = await callAPI("/countries");
  const countries = data.countries || [];
  const normText = normalize(text);

  for (const c of countries) {
    const allNames = [c.name, c.code, ...(c.aliases || [])];
    for (const n of allNames) {
      if (normText.includes(normalize(n))) {
        logger.info(`[NLU] Nhận diện quốc gia: ${c.name}`, { source: SOURCES.SYSTEM });
        return c.name;
      }
    }
  }
  return null;
}

export async function nluMiddleware(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: "Thiếu message" });
    }

    const text = normalize(message);

    // 1. Phân loại intent tổng quát
    const category = await classifyQuery(message);

    // Định tuyến sớm sang các router chuyên trách
    if (["weather", "news", "search"].includes(category)) {
      logger.info(`[NLU] Định tuyến sớm sang router: ${category}`, { source: SOURCES.SYSTEM });
      return next(); // để router tương ứng xử lý
    }

    // 2. Intent: hỏi tổng số quốc gia
    if (
      text.includes("bao nhieu quoc gia") ||
      text.includes("tong so quoc gia") ||
      text.includes("may nuoc") ||
      text.includes("tong so nuoc")
    ) {
      const data = await callAPI("/countries");
      const examples = (data.countries || []).slice(0, 3).map(c => c.name).join(", ");
      return res.json({
        success: true,
        reply: `🌍 Hiện nay có ${data.total || 0} quốc gia được công nhận trên thế giới.\nVí dụ: ${examples}.\n➡️ Con số này phản ánh sự đa dạng về văn hóa và lịch sử toàn cầu.`
      });
    }

    // 3. Intent: hỏi thông tin một quốc gia cụ thể
    if (text.includes("nuoc") || text.includes("quoc gia")) {
      const countryName = await extractCountryNameSmart(text);
      if (countryName) {
        const data = await callAPI(`/countries/${countryName}`);
        if (data.success) {
          const c = data.country;
          return res.json({
            success: true,
            reply: `${c.flag} ${c.name} nằm ở khu vực ${c.region}.\nThủ đô: ${c.capital}.\nDân số: ${c.population.toLocaleString()} người.\n✨ ${c.summary}`
          });
        } else {
          logger.warn(`[NLU] Không tìm thấy thông tin cho ${countryName}`, { source: SOURCES.SYSTEM });
          return res.json({ success: false, reply: data.error || `Không tìm thấy thông tin cho ${countryName}` });
        }
      }
    }

    // 4. Nếu không nhận diện được → fallback (ví dụ nlpService)
    return next();

  } catch (err) {
    logger.error("NLU error:", { error: err.message, source: SOURCES.SYSTEM });
    return res.status(500).json({ success: false, error: "Lỗi xử lý NLU" });
  }
}