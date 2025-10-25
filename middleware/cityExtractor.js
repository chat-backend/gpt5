// middleware/cityExtractor.js (ESM version)
// Middleware để tự động trích xuất và chuẩn hóa tên thành phố từ câu hỏi tự nhiên

import { normalizeCity } from "../utils/normalizeCity.js";

// Danh sách biến thể tên thành phố và tên chuẩn
const CITY_MAP = {
  "hà nội": "Hà Nội",
  "hanoi": "Hà Nội",
  "hồ chí minh": "Hồ Chí Minh",
  "tp.hcm": "Hồ Chí Minh",
  "sài gòn": "Hồ Chí Minh",
  "sai gon": "Hồ Chí Minh",
  "ho chi minh": "Hồ Chí Minh",
  "đà nẵng": "Đà Nẵng",
  "da nang": "Đà Nẵng",
  "hải phòng": "Hải Phòng",
  "hai phong": "Hải Phòng",
  "cần thơ": "Cần Thơ",
  "can tho": "Cần Thơ",
  "huế": "Huế",
  "thừa thiên huế": "Huế",
  "thua thien hue": "Huế",
  "đà lạt": "Đà Lạt",
  "da lat": "Đà Lạt",
  "nha trang": "Nha Trang",
  "vũng tàu": "Vũng Tàu",
  "vung tau": "Vũng Tàu",
  "quy nhơn": "Quy Nhơn",
  "quy nhon": "Quy Nhơn",
  "phú quốc": "Phú Quốc",
  "phu quoc": "Phú Quốc"
  // 👉 Có thể bổ sung thêm các tỉnh/thành khác nếu cần
};

function cityExtractor(req, res, next) {
  let text = "";

  // Nếu đã có city trong query thì normalize luôn
  if (req.query?.city) {
    req.query.city = normalizeCity(req.query.city);
    return next();
  }

  // Lấy text từ query hoặc body
  if (req.query?.q) {
    text = req.query.q;
  } else if (req.body?.message) {
    text = req.body.message;
  } else if (req.body?.question) {
    text = req.body.question;
  }

  if (text) {
    const lower = text.toLowerCase();
    for (const variant in CITY_MAP) {
      if (lower.includes(variant)) {
        req.query.city = CITY_MAP[variant]; // gắn tên chuẩn
        break;
      }
    }
  }

  next();
}

export default cityExtractor;