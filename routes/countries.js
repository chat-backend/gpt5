// routes/countries.js (ESM version)
import express from "express";
import { getAllCountries, getCountryInfo } from "../services/countryService.js";

const router = express.Router();

/**
 * GET /countries
 * Trả về danh sách tất cả quốc gia (có sẵn summary)
 */
router.get("/", (_req, res) => {
  try {
    const countries = getAllCountries();
    res.json({
      success: true,
      total: countries.length,
      countries
    });
  } catch (err) {
    res.status(500).json({ success: false, error: "Lỗi server khi lấy danh sách quốc gia" });
  }
});

/**
 * GET /countries/:name
 * Trả về thông tin chi tiết của một quốc gia (có sẵn summary)
 */
router.get("/:name", (req, res) => {
  try {
    const country = getCountryInfo(req.params.name);
    if (!country) {
      return res.status(404).json({
        success: false,
        error: `Không tìm thấy quốc gia: ${req.params.name}`
      });
    }
    res.json({ success: true, country });
  } catch (err) {
    res.status(500).json({ success: false, error: "Lỗi server khi lấy thông tin quốc gia" });
  }
});

export default router;