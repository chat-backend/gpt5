// middleware/validateCity.js (ESM version)
import { removeAccents } from "../utils/normalizeCity.js";

// Danh sách 34 tỉnh/thành VN sau sáp nhập 2025 (không dấu, viết thường)
const provinces34 = [
  "ha noi", "ho chi minh", "da nang", "hai phong", "can tho", "hue",
  "quang ninh", "cao bang", "lang son", "lai chau", "dien bien", "son la",
  "ha giang", "tuyen quang", "yen bai", "lao cai", "bac kan", "thai nguyen",
  "phu tho", "bac giang", "quang binh", "quang tri",
  "nghe an - ha tinh", "thanh hoa - ninh binh", "nam dinh - ha nam",
  "thai binh - hung yen", "bac ninh - hai duong", "vinh phuc - phu tho",
  "quang nam - quang ngai", "binh dinh - phu yen", "khanh hoa - ninh thuan",
  "binh thuan - ba ria vung tau", "dong nai - binh duong", "long an - tien giang"
];

export default function validateCity(req, res, next) {
  const rawCity = req.query.city || req.city;
  if (!rawCity) {
    return res.status(400).json({
      success: false,
      source: "weather",
      group: "internal",
      error: "Thiếu tên tỉnh/thành để tra cứu thời tiết."
    });
  }

  // Chuẩn hóa: bỏ dấu, lowercase, thay gạch ngang/chấm thành khoảng trắng
  let normalized = removeAccents(rawCity.trim().toLowerCase());
  normalized = normalized.replace(/[–—−]/g, "-").replace(/\s+/g, " ").trim();

  // Kiểm tra có trong danh sách 34 tỉnh/thành
  if (!provinces34.includes(normalized)) {
    return res.status(400).json({
      success: false,
      source: "weather",
      group: "internal",
      error: `Địa danh "${rawCity}" không nằm trong danh sách 34 tỉnh/thành Việt Nam (sau sáp nhập 2025).`
    });
  }

  // Hợp lệ → cho đi tiếp
  next();
}