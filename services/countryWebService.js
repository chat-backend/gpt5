// services/countryWebService.js (ESM version)
import axios from "axios";

/**
 * Tạo summary tự nhiên cho quốc gia
 */
function createSummary(c) {
  const name = c.name?.common || "Quốc gia không rõ";
  const region = c.region || "không rõ khu vực";
  const continent = c.continents?.[0] || "không rõ châu lục";
  const capital = c.capital?.[0] || "không rõ thủ đô";
  const population = c.population ? c.population.toLocaleString("vi-VN") : "không rõ";
  const languages = c.languages ? Object.values(c.languages) : [];
  const currencyObjs = c.currencies ? Object.values(c.currencies) : [];
  const flag = c.flags?.svg || c.flags?.png || "";

  // Xử lý ngôn ngữ
  const langText =
    languages.length === 0
      ? "Ngôn ngữ chưa rõ"
      : languages.length === 1
      ? `Ngôn ngữ chính là ${languages[0]}`
      : `Các ngôn ngữ phổ biến gồm ${languages.join(", ")}`;

  // Xử lý tiền tệ
  const currencyText =
    currencyObjs.length > 0
      ? currencyObjs
          .map(cur => `${cur.name}${cur.symbol ? ` (${cur.symbol})` : ""}`)
          .join(", ")
      : "chưa rõ";

  return `🇺🇳 ${name} là một quốc gia thuộc khu vực ${region}, nằm ở châu ${continent}.
Thủ đô: ${capital}.
Dân số khoảng ${population} người.
${langText}.
Đơn vị tiền tệ: ${currencyText}.
${flag ? `Quốc kỳ: ${flag}` : ""}`;
}

/**
 * Gọi API REST Countries để lấy danh sách tất cả quốc gia
 * @returns {Promise<Array>} danh sách quốc gia
 */
export async function fetchAllCountries() {
  try {
    const res = await axios.get(
      "https://restcountries.com/v3.1/all?fields=name,cca2,cca3,region,continents,capital,population,area,languages,currencies,flags,translations"
    );

    return res.data.map(c => ({
      name: c.name?.common || "Unknown",
      officialName: c.name?.official || "",
      code: c.cca2 || c.cca3 || "",
      region: c.region || "Unknown",
      continent: c.continents?.[0] || "Unknown",
      capital: c.capital?.[0] || "Unknown",
      population: c.population || 0,
      area: c.area || 0,
      languages: c.languages ? Object.values(c.languages) : [],
      currencies: c.currencies ? Object.values(c.currencies) : [],
      flag: c.flags?.svg || c.flags?.png || "",
      summary: createSummary(c)
    }));
  } catch (err) {
    console.error("❌ Lỗi fetchAllCountries:", err.message);
    return [];
  }
}

/**
 * Gọi API REST Countries để lấy thông tin một quốc gia theo tên
 * @param {string} name - tên quốc gia
 * @returns {Promise<Object>} thông tin quốc gia hoặc error
 */
export async function fetchCountryInfo(name) {
  if (!name) return { success: false, error: "Thiếu tên quốc gia" };
  try {
    const res = await axios.get(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(name)}?fullText=true`
    );
    if (res.data && res.data[0]) {
      const c = res.data[0];
      return {
        success: true,
        name: c.name?.common || "Unknown",
        officialName: c.name?.official || "",
        code: c.cca2 || c.cca3 || "",
        region: c.region || "Unknown",
        continent: c.continents?.[0] || "Unknown",
        capital: c.capital?.[0] || "Unknown",
        population: c.population || 0,
        languages: c.languages ? Object.values(c.languages) : [],
        currencies: c.currencies ? Object.values(c.currencies) : [],
        flag: c.flags?.svg || c.flags?.png || "",
        summary: createSummary(c)
      };
    }
    return { success: false, error: `Không tìm thấy thông tin cho quốc gia "${name}"` };
  } catch (err) {
    console.error("❌ Lỗi fetchCountryInfo:", err.message);
    return { success: false, error: "Không thể lấy dữ liệu quốc gia từ API" };
  }
}