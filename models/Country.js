// models/Country.js (ESM version)
// Module quản lý dữ liệu quốc gia thuần JS, không dùng MongoDB

// Dữ liệu mẫu (thầy có thể mở rộng thêm)
const countries = [
  {
    code: "VN",
    name: "Việt Nam",
    name_en: "Vietnam",
    name_vi: "Việt Nam",
    official_name: "Cộng hòa Xã hội Chủ nghĩa Việt Nam"
  },
  {
    code: "US",
    name: "Hoa Kỳ",
    name_en: "United States",
    name_vi: "Hoa Kỳ",
    official_name: "Hợp chủng quốc Hoa Kỳ"
  },
  {
    code: "JP",
    name: "Nhật Bản",
    name_en: "Japan",
    name_vi: "Nhật Bản",
    official_name: "Nhật Bản"
  }
];

// --- Các hàm tiện ích CRUD ---
// Lấy tất cả
export function getAllCountries() {
  return countries;
}

// Tìm theo code
export function getCountryByCode(code) {
  return countries.find(c => c.code.toUpperCase() === code.toUpperCase());
}

// Tìm kiếm theo keyword (trong name, name_en, name_vi, official_name)
export function searchCountries(keyword) {
  const regex = new RegExp(keyword, "i");
  return countries.filter(
    c =>
      regex.test(c.name) ||
      regex.test(c.name_en) ||
      regex.test(c.name_vi) ||
      regex.test(c.official_name)
  );
}

// Thêm mới
export function addCountry(data) {
  const exists = getCountryByCode(data.code);
  if (exists) throw new Error("Duplicate value for field: code");
  countries.push(data);
  return data;
}

// Cập nhật
export function updateCountry(code, data) {
  const idx = countries.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return null;
  countries[idx] = { ...countries[idx], ...data };
  return countries[idx];
}

// Xóa
export function deleteCountry(code) {
  const idx = countries.findIndex(c => c.code.toUpperCase() === code.toUpperCase());
  if (idx === -1) return null;
  const deleted = countries.splice(idx, 1);
  return deleted[0];
}