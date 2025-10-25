// utils/formatWeather.js (ESM version)

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
  if (desc.includes("hot")) return "🔥";
  return "🌤️";
}

export function formatWeatherResponse(weather) {
  if (!weather || weather.error) {
    return "Xin lỗi, chưa có dữ liệu thời tiết.";
  }

  const emoji = getWeatherEmoji(weather.description);
  const feels = weather.feels_like ? ` (cảm nhận ${Math.round(weather.feels_like)}°C)` : "";

  // Địa chỉ hiển thị chi tiết (lọc trùng)
  const location = [...new Set([weather.district, weather.region, weather.city, weather.country].filter(Boolean))].join(", ");

  // Thông tin hiện tại
  const lines = [
    `- 🌡️ Nhiệt độ: ${Math.round(weather.temperature)}°C${feels}`,
    weather.temp_max ? `- 🔼 Cao nhất: ${Math.round(weather.temp_max)}°C` : null,
    weather.temp_min ? `- 🔽 Thấp nhất: ${Math.round(weather.temp_min)}°C` : null,
    `- 🌥️ Trạng thái: ${weather.description}`,
    weather.humidity != null ? `- 💧 Độ ẩm: ${weather.humidity}%` : null,
    weather.wind_speed != null ? `- 🌬️ Gió: ${weather.wind_speed} m/s${weather.wind_deg ? ` (hướng ${weather.wind_deg}°)` : ""}` : null,
    weather.pressure ? `- 🔽 Áp suất: ${weather.pressure} hPa` : null,
    weather.visibility ? `- 👁️‍🗨️ Tầm nhìn: ${(weather.visibility / 1000).toFixed(1)} km` : null,
    weather.uv_index ? `- ☀️ Chỉ số UV: ${weather.uv_index}` : null,
    weather.aqi ? `- 🌫️ AQI: ${weather.aqi} (${weather.aqi_level})` : null
  ].filter(Boolean);

  // Nhận định tổng quan
  let advice = "";
  if (weather.temperature < 20) {
    advice = "🌡️ Thời tiết mát mẻ, thích hợp cho các hoạt động ngoài trời nhẹ nhàng.";
  } else if (weather.temperature < 30) {
    advice = "🌡️ Thời tiết ấm áp, dễ chịu, lý tưởng cho sinh hoạt thường ngày.";
  } else {
    advice = "🌡️ Nhiệt độ cao, oi bức, nên hạn chế hoạt động ngoài trời vào buổi trưa.";
  }

  if (weather.humidity && weather.humidity > 85) advice += "\n💧 Độ ẩm cao, dễ gây oi bức, nhớ uống đủ nước.";
  if (weather.uv_index && weather.uv_index > 7) advice += "\n☀️ Chỉ số UV cao, nên dùng kem chống nắng và hạn chế ra ngoài buổi trưa.";
  if (weather.aqi && weather.aqi > 100) advice += "\n🌫️ Chất lượng không khí kém, nên hạn chế vận động ngoài trời.";
  if (weather.wind_speed && weather.wind_speed > 10) advice += "\n🌪️ Gió mạnh, cần chú ý an toàn khi di chuyển.";
  if (weather.visibility && weather.visibility < 2000) advice += "\n🌫️ Tầm nhìn hạn chế do sương mù, cần thận trọng khi lái xe.";
  if (weather.feels_like && Math.abs(weather.feels_like - weather.temperature) >= 3) advice += "\n⚠️ Nhiệt độ cảm nhận chênh lệch nhiều so với thực tế, cần chú ý khi ra ngoài.";
  if (weather.description.toLowerCase().includes("mưa") || weather.description.toLowerCase().includes("giông")) advice += "\n⛈️ Có khả năng mưa/giông, nên mang theo ô hoặc áo mưa.";
  if (weather.pressure && weather.pressure < 1000) advice += "\n⚠️ Áp suất thấp, có thể báo hiệu thời tiết xấu.";

  // Dự báo 10 ngày tới (nếu có)
  let forecastText = "";
  if (Array.isArray(weather.forecast) && weather.forecast.length > 0) {
    const days = weather.forecast.slice(0, 10);
    forecastText = "\n\n📺 Dự báo 10 ngày tới:\n" +
      days.map(d => {
        const date = new Date(d.date).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
        const em = getWeatherEmoji(d.description);
        return `- ${date}: ${em} ${d.description}, 🌡️ ${Math.round(d.temp_min)}°C - ${Math.round(d.temp_max)}°C`;
      }).join("\n");
  }

  return `${emoji} Dự báo thời tiết tại ${location}:
${lines.join("\n")}
⏱️ Cập nhật lúc: ${new Date(weather.collectedAt).toLocaleString("vi-VN")}

👉 Nhận định:
${advice}${forecastText}`;
}