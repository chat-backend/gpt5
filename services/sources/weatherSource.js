// sources/weatherSource.js (ESM version)
import fetch from "node-fetch";

export async function fetchWeather(query) {
  const apiKey = process.env.OPENWEATHER_KEY;
  if (!apiKey) {
    throw new Error("Thiếu OPENWEATHER_KEY trong biến môi trường");
  }

  // Parse city từ query
  const match = query.match(/(hà nội|hn|đà nẵng|sài gòn|hồ chí minh|hcm|huế|hải phòng|cần thơ|nha trang)/i);
  let city = match ? match[0] : "Da Nang";

  // Chuẩn hóa tên thành phố cho API
  const cityMap = {
    "sài gòn": "Ho Chi Minh",
    "hồ chí minh": "Ho Chi Minh",
    "hcm": "Ho Chi Minh",
    "đà nẵng": "Da Nang",
    "hn": "Ha Noi",
  };
  city = cityMap[city.toLowerCase()] || city;

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    city
  )}&appid=${apiKey}&units=metric&lang=vi`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data.weather || !data.main) {
    throw new Error(data.message || "Weather API trả về dữ liệu không hợp lệ");
  }

  return {
    summary: `Thời tiết tại ${city}: ${data.weather[0].description}, ${data.main.temp}°C (cảm nhận ${data.main.feels_like}°C), độ ẩm ${data.main.humidity}%, gió ${data.wind?.speed || 0} m/s`,
    link: data.id ? `https://openweathermap.org/city/${data.id}` : null,
    details: {
      pressure: data.main.pressure,
      visibility: data.visibility,
      sunrise: data.sys?.sunrise,
      sunset: data.sys?.sunset,
    }
  };
}