// assistantCore.js (ESM version)
import { searchWeb } from "./services/webSearch.js";
import { formatSearchResults } from "./utils/formatResults.js";

// =======================
// Helper: chọn emoji theo trạng thái thời tiết
// =======================
function getWeatherEmoji(description = "") {
  const desc = description.toLowerCase();
  if (desc.includes("nắng") || desc.includes("clear")) return "☀️";
  if (desc.includes("mây") || desc.includes("cloud")) return "☁️";
  if (desc.includes("mưa") || desc.includes("rain")) return "🌧️";
  if (desc.includes("giông") || desc.includes("thunder")) return "⛈️";
  if (desc.includes("tuyết") || desc.includes("snow")) return "❄️";
  if (desc.includes("sương") || desc.includes("fog") || desc.includes("mist")) return "🌫️";
  return "🌤️";
}

// =======================
// Module: Philosophy Mode
// =======================
let philosophyMode = false;

export function setPhilosophyMode(state) {
  philosophyMode = state;
}

export function isPhilosophyMode() {
  return philosophyMode;
}

export function autoDetectPhilosophy(question) {
  const keywords = [
    "ý nghĩa", "hạnh phúc", "sự sống", "cái chết",
    "tự do", "tình yêu", "đạo đức", "chân lý", "triết học",
    "cuộc đời", "tồn tại", "niềm tin", "khổ đau"
  ];
  const lowerQ = question.toLowerCase();
  const matched = keywords.some(kw => lowerQ.includes(kw));
  if (matched) setPhilosophyMode(true);
}

export async function philosophyAnswer(question) {
  return `
🌿 Một góc nhìn triết học cho câu hỏi của bạn:

"${question}"

- Từ phương Tây: Aristotle coi hạnh phúc là sống theo đức hạnh.
- Từ phương Đông: Phật giáo xem hạnh phúc đến từ buông bỏ khổ đau.
- Từ khoa học hiện đại: hạnh phúc là trạng thái cân bằng cảm xúc.

👉 Có lẽ, ý nghĩa không nằm ở câu trả lời tuyệt đối, mà ở cách mỗi người tự tìm ra cho mình.
  `;
}

// =======================
// Module: Weather Response
// =======================
export function formatWeatherResponse(weather) {
  if (!weather || weather.error) {
    return "Xin lỗi, chưa có dữ liệu thời tiết.";
  }

  const emoji = getWeatherEmoji(weather.description);
  const feels = weather.feels_like ? ` (cảm nhận ${Math.round(weather.feels_like)}°C)` : "";

  const lines = [
    `- 🌡️ Nhiệt độ: ${Math.round(weather.temperature)}°C${feels}`,
    weather.temp_max ? `- 🔼 Nhiệt độ cao nhất: ${Math.round(weather.temp_max)}°C` : null,
    weather.temp_min ? `- 🔽 Nhiệt độ thấp nhất: ${Math.round(weather.temp_min)}°C` : null,
    `- 🌥️ Trạng thái: ${weather.description}`,
    weather.humidity != null ? `- 💧 Độ ẩm: ${weather.humidity}%` : null,
    weather.wind_speed != null
      ? `- 🌬️ Gió: ${weather.wind_speed} m/s${weather.wind_deg ? ` (hướng ${weather.wind_deg}°)` : ""}`
      : null,
    weather.pressure ? `- 🔽 Áp suất khí quyển: ${weather.pressure} hPa` : null,
    weather.visibility ? `- 👁️‍🗨️ Tầm nhìn xa: ${(weather.visibility / 1000).toFixed(1)} km` : null,
    weather.uv_index ? `- ☀️ Chỉ số UV: ${weather.uv_index}` : null,
    weather.aqi ? `- 🌫️ AQI: ${weather.aqi} (${weather.aqi_level})` : null
  ].filter(Boolean);

  let advice = "";
  if (weather.temperature < 20) {
    advice = "🌡️ Thời tiết mát mẻ, thích hợp cho các hoạt động ngoài trời nhẹ nhàng.";
  } else if (weather.temperature < 30) {
    advice = "🌡️ Thời tiết ấm áp, dễ chịu, lý tưởng cho sinh hoạt thường ngày.";
  } else {
    advice = "🌡️ Nhiệt độ cao, oi bức, nên hạn chế hoạt động ngoài trời vào buổi trưa.";
  }

  if (weather.humidity && weather.humidity > 85) {
    advice += "\n💧 Độ ẩm cao, có thể gây cảm giác oi bức, nhớ uống đủ nước.";
  }
  if (weather.uv_index && weather.uv_index > 7) {
    advice += "\n☀️ Chỉ số UV cao, nên dùng kem chống nắng và hạn chế ra ngoài buổi trưa.";
  }
  if (weather.aqi && weather.aqi > 100) {
    advice += "\n🌫️ Chất lượng không khí kém, nên hạn chế vận động ngoài trời.";
  }
  if (weather.feels_like && Math.abs(weather.feels_like - weather.temperature) >= 3) {
    advice += "\n⚠️ Nhiệt độ cảm nhận chênh lệch nhiều so với thực tế, cần chú ý khi ra ngoài.";
  }
  if (weather.description.toLowerCase().includes("mưa") || weather.description.toLowerCase().includes("giông")) {
    advice += "\n⛈️ Có khả năng mưa/giông, nên mang theo ô hoặc áo mưa.";
  }

  return `${emoji} Dự báo thời tiết tại ${weather.city} (${weather.country}):
${lines.join("\n")}
⏱️ Cập nhật lúc: ${new Date(weather.collectedAt).toLocaleString("vi-VN")}

👉 Nhận định:
${advice}`;
}

// =======================
// Module: Country Info (RestCountries API)
// =======================
export async function getCountryInfo(countryName) {
  try {
    const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fullText=true`);
    if (!res.ok) throw new Error("Không tìm thấy dữ liệu quốc gia");
    const data = await res.json();
    const c = data[0];

    const name = c.translations?.vie?.common || c.name.common;
    const region = c.region;
    const subregion = c.subregion || "";
    const capital = c.capital ? c.capital[0] : "Không rõ";
    const population = c.population ? c.population.toLocaleString("vi-VN") : "Không rõ";
    const languages = c.languages ? Object.values(c.languages).join(", ") : "Không rõ";

    return `🌍 ${name} nằm ở khu vực ${subregion || region}, thuộc châu ${region}.
- 🏛️ Thủ đô: ${capital}
- 👥 Dân số: ${population}
- 🗣️ Ngôn ngữ chính: ${languages}`;
  } catch (err) {
    return `Xin lỗi, chưa lấy được thông tin về quốc gia "${countryName}".`;
  }
}

// =======================
// Module: News (Global Latest)
// =======================
export async function getGlobalNews() {
  try {
    const res = await fetch("https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi");
    if (!res.ok) throw new Error("Không lấy được tin tức");
    const text = await res.text();

    const items = [...text.matchAll(/<title>(.*?)<\/title><link>(.*?)<\/link>/g)]
      .slice(2, 5) // bỏ 2 dòng đầu (tiêu đề feed), lấy 3 tin
      .map(m => `📰 ${m[1]}\n🔗 ${m[2]}`);

    return `🌍 Tin tức toàn cầu mới nhất:\n\n${items.join("\n\n")}`;
  } catch (err) {
    return "Xin lỗi, chưa lấy được tin tức toàn cầu.";
  }
}

// =======================
// Bộ điều phối chính
// =======================
export async function answerUser(question, context = {}) {
  // Kiểm tra auto detect triết học
  autoDetectPhilosophy(question);
  if (isPhilosophyMode()) {
    return await philosophyAnswer(question);
  }

  const q = question.toLowerCase();

  // Intent: Country
  if (q.includes("nước") && q.includes("ở đâu")) {
    const parts = question.split(" ");
    const countryName = parts[1]; // đơn giản: lấy từ sau "nước"
    return await getCountryInfo(countryName);
  }

  // Intent: News
  if (q.includes("tin tức") || q.includes("thời sự") || q.includes("news")) {
    return await getGlobalNews();
  }

  // ✅ Mặc định: mọi câu hỏi khác đều gọi web search
  const results = await searchWeb(question);
  return formatSearchResults(results, question);
}