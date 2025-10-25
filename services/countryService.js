// services/countryService.js (ESM version)

// Dữ liệu mẫu: có thể mở rộng thêm nhiều nước
const COUNTRIES = [
  { 
    name: "Vietnam", 
    code: "VN", 
    region: "Southeast Asia", 
    continent: "Asia", 
    capital: "Hà Nội",
    population: 98000000,
    languages: ["Vietnamese"],
    currency: "VND",
    aliases: ["viet nam", "việt nam"]
  },
  { 
    name: "Cuba", 
    code: "CU", 
    region: "Caribbean", 
    continent: "North America", 
    capital: "Havana",
    population: 11300000,
    languages: ["Spanish"],
    currency: "CUP",
    aliases: []
  },
  { 
    name: "United States", 
    code: "US", 
    region: "North America", 
    continent: "North America", 
    capital: "Washington, D.C.",
    population: 331000000,
    languages: ["English"],
    currency: "USD",
    aliases: ["usa", "america", "us"]
  },
  { 
    name: "France", 
    code: "FR", 
    region: "Western Europe", 
    continent: "Europe", 
    capital: "Paris",
    population: 67000000,
    languages: ["French"],
    currency: "EUR",
    aliases: ["français", "pháp"]
  },
  { 
    name: "Brazil", 
    code: "BR", 
    region: "South America", 
    continent: "South America", 
    capital: "Brasília",
    population: 213000000,
    languages: ["Portuguese"],
    currency: "BRL",
    aliases: ["brasil"]
  },
  { 
    name: "Egypt", 
    code: "EG", 
    region: "North Africa", 
    continent: "Africa", 
    capital: "Cairo",
    population: 104000000,
    languages: ["Arabic"],
    currency: "EGP",
    aliases: ["ai cập", "misr"]
  },
  { 
    name: "Australia", 
    code: "AU", 
    region: "Oceania", 
    continent: "Oceania", 
    capital: "Canberra",
    population: 26000000,
    languages: ["English"],
    currency: "AUD",
    aliases: ["úc"]
  }
];

/**
 * Chuẩn hóa tên để tìm kiếm
 */
function normalizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD") // bỏ dấu tiếng Việt
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Hàm tạo summary tự nhiên cho chat bot
 */
function createSummary(country) {
  return `${country.name} nằm ở ${country.region}, thuộc châu ${country.continent}. 
Thủ đô là ${country.capital}, dân số khoảng ${country.population.toLocaleString()} người. 
Ngôn ngữ chính: ${country.languages?.join(", ") || "không rõ"}, đơn vị tiền tệ: ${country.currency}.`;
}

/**
 * Lấy danh sách tất cả quốc gia
 */
export function getAllCountries() {
  // Trả về kèm summary để API dùng luôn
  return COUNTRIES.map(c => ({
    ...c,
    summary: createSummary(c)
  }));
}

/**
 * Tìm thông tin một quốc gia theo tên hoặc code (không phân biệt hoa thường, có hỗ trợ alias)
 */
export function getCountryInfo(name) {
  if (!name) return null;
  const lower = normalizeName(name);

  const country = COUNTRIES.find(c => {
    const normalizedName = normalizeName(c.name);
    const normalizedCode = c.code.toLowerCase();
    const normalizedAliases = c.aliases.map(a => normalizeName(a));

    return (
      normalizedName === lower ||
      normalizedCode === lower ||
      normalizedAliases.includes(lower)
    );
  });

  return country ? { ...country, summary: createSummary(country) } : null;
}