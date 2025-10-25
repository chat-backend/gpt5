// utils/normalizeCity.js (ESM version)

// Hàm bỏ dấu tiếng Việt
export function removeAccents(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

// Danh sách 34 tỉnh/thành sau sáp nhập 2025
export const provincesVN34 = [
  "Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Huế",
  "Quảng Ninh", "Cao Bằng", "Lạng Sơn", "Lai Châu", "Điện Biên", "Sơn La",
  "Hà Giang", "Tuyên Quang", "Yên Bái", "Lào Cai", "Bắc Kạn", "Thái Nguyên",
  "Phú Thọ", "Bắc Giang", "Quảng Bình", "Quảng Trị",
  "Nghệ An - Hà Tĩnh", "Thanh Hóa - Ninh Bình", "Nam Định - Hà Nam",
  "Thái Bình - Hưng Yên", "Bắc Ninh - Hải Dương", "Vĩnh Phúc - Phú Thọ",
  "Quảng Nam - Quảng Ngãi", "Bình Định - Phú Yên", "Khánh Hòa - Ninh Thuận",
  "Bình Thuận - Bà Rịa Vũng Tàu", "Đồng Nai - Bình Dương", "Long An - Tiền Giang"
];

// Bản đồ chuẩn hóa tên thành phố về tỉnh/thành sau sáp nhập
export const CITY_NORMALIZATION_MAP = {
  // 6 thành phố trực thuộc TW
  "ha noi": "Hà Nội",
  "hanoi": "Hà Nội",
  "tp hcm": "Hồ Chí Minh",
  "tphcm": "Hồ Chí Minh",
  "tp ho chi minh": "Hồ Chí Minh",
  "sai gon": "Hồ Chí Minh",
  "ho chi minh": "Hồ Chí Minh",
  "hai phong": "Hải Phòng",
  "da nang": "Đà Nẵng",
  "danang": "Đà Nẵng",
  "can tho": "Cần Thơ",
  "hue": "Huế",
  "thua thien hue": "Huế",

  // 22 tỉnh giữ nguyên
  "quang ninh": "Quảng Ninh",
  "cao bang": "Cao Bằng",
  "lang son": "Lạng Sơn",
  "lai chau": "Lai Châu",
  "dien bien": "Điện Biên",
  "son la": "Sơn La",
  "ha giang": "Hà Giang",
  "tuyen quang": "Tuyên Quang",
  "yen bai": "Yên Bái",
  "lao cai": "Lào Cai",
  "bac kan": "Bắc Kạn",
  "thai nguyen": "Thái Nguyên",
  "phu tho": "Phú Thọ",
  "bac giang": "Bắc Giang",
  "quang binh": "Quảng Bình",
  "quang tri": "Quảng Trị",

  // 12 tỉnh ghép (sáp nhập 2025) + key riêng lẻ
  "nghe an - ha tinh": "Nghệ An - Hà Tĩnh",
  "nghe an": "Nghệ An - Hà Tĩnh",
  "ha tinh": "Nghệ An - Hà Tĩnh",

  "thanh hoa - ninh binh": "Thanh Hóa - Ninh Bình",
  "thanh hoa": "Thanh Hóa - Ninh Bình",
  "ninh binh": "Thanh Hóa - Ninh Bình",

  "nam dinh - ha nam": "Nam Định - Hà Nam",
  "nam dinh": "Nam Định - Hà Nam",
  "ha nam": "Nam Định - Hà Nam",

  "thai binh - hung yen": "Thái Bình - Hưng Yên",
  "thai binh": "Thái Bình - Hưng Yên",
  "hung yen": "Thái Bình - Hưng Yên",

  "bac ninh - hai duong": "Bắc Ninh - Hải Dương",
  "bac ninh": "Bắc Ninh - Hải Dương",
  "hai duong": "Bắc Ninh - Hải Dương",

  "vinh phuc - phu tho": "Vĩnh Phúc - Phú Thọ",
  "vinh phuc": "Vĩnh Phúc - Phú Thọ",
  "phu tho": "Vĩnh Phúc - Phú Thọ",

  "quang nam - quang ngai": "Quảng Nam - Quảng Ngãi",
  "quang nam": "Quảng Nam - Quảng Ngãi",
  "quang ngai": "Quảng Nam - Quảng Ngãi",

  "binh dinh - phu yen": "Bình Định - Phú Yên",
  "binh dinh": "Bình Định - Phú Yên",
  "phu yen": "Bình Định - Phú Yên",

  "khanh hoa - ninh thuan": "Khánh Hòa - Ninh Thuận",
  "khanh hoa": "Khánh Hòa - Ninh Thuận",
  "ninh thuan": "Khánh Hòa - Ninh Thuận",

  "binh thuan - ba ria vung tau": "Bình Thuận - Bà Rịa Vũng Tàu",
  "binh thuan": "Bình Thuận - Bà Rịa Vũng Tàu",
  "ba ria vung tau": "Bình Thuận - Bà Rịa Vũng Tàu",
  "ba ria - vung tau": "Bình Thuận - Bà Rịa Vũng Tàu",

  "dong nai - binh duong": "Đồng Nai - Bình Dương",
  "dong nai": "Đồng Nai - Bình Dương",
  "binh duong": "Đồng Nai - Bình Dương",

  "long an - tien giang": "Long An - Tiền Giang",
  "long an": "Long An - Tiền Giang",
  "tien giang": "Long An - Tiền Giang"
};

/**
 * Chuẩn hóa tên thành phố về dạng tỉnh/thành sau sáp nhập (có dấu đầy đủ)
 */
export function normalizeCity(cityName) {
  if (!cityName) return "Hà Nội"; // fallback mặc định

  // Bỏ dấu + chuẩn hóa về lowercase
  let lower = removeAccents(cityName.trim().toLowerCase());

  // Chuẩn hóa dash, dấu chấm, khoảng trắng
  lower = lower
    .replace(/[–—−]/g, "-")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Nếu có trong map thì trả về value chuẩn
  if (CITY_NORMALIZATION_MAP[lower]) {
    return CITY_NORMALIZATION_MAP[lower];
  }

  // fallback: viết hoa chữ cái đầu cho từng từ (chỉ để hiển thị đẹp)
  return lower
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}