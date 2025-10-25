// routes/countriesWeb.js (ESM version)
import express from "express";
import { fetchAllCountries, fetchCountryInfo } from "../services/countryWebService.js";

const router = express.Router();

/**
 * GET /countries-web
 * Lấy danh sách tất cả quốc gia từ web API
 */
router.get("/", async (req, res) => {
  try {
    const countries = await fetchAllCountries();
    res.json({
      success: true,
      total: countries.length,
      countries
    });
  } catch (err) {
    console.error("❌ Lỗi /countries-web:", err.message);
    res.status(500).json({ success: false, error: "Không thể lấy dữ liệu quốc gia từ web" });
  }
});

/**
 * GET /countries-web/:name
 * Lấy thông tin chi tiết một quốc gia theo tên
 */
router.get("/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const country = await fetchCountryInfo(name);
    if (!country || country.error) {
      return res.status(404).json({
        success: false,
        error: country?.error || `Không tìm thấy thông tin cho quốc gia "${name}"`
      });
    }
    res.json({ success: true, country });
  } catch (err) {
    console.error("❌ Lỗi /countries-web/:name:", err.message);
    res.status(500).json({ success: false, error: "Không thể lấy dữ liệu quốc gia từ web" });
  }
});

export default router;