// countryRouter.js (ESM version)
import express from "express";
import {
  getAllCountries,
  getCountryByCode,
  searchCountries,
  addCountry,
  updateCountry,
  deleteCountry
} from "./models/Country.js";

const router = express.Router();

// --- CREATE ---
router.post("/", (req, res) => {
  try {
    const newCountry = addCountry(req.body);
    res.status(201).json({ success: true, message: "✅ Country created", data: newCountry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// --- READ ALL ---
router.get("/", (req, res) => {
  const countries = getAllCountries();
  res.json({ success: true, data: countries });
});

// --- SEARCH ---
router.get("/search/:keyword", (req, res) => {
  const keyword = req.params.keyword || "";
  const results = searchCountries(keyword);
  if (results.length === 0) {
    return res.status(404).json({ success: false, message: "No countries found" });
  }
  res.json({ success: true, data: results });
});

// --- READ ONE ---
router.get("/:code", (req, res) => {
  const country = getCountryByCode(req.params.code);
  if (!country) {
    return res.status(404).json({ success: false, message: "Country not found" });
  }
  res.json({ success: true, data: country });
});

// --- UPDATE (PUT) ---
router.put("/:code", (req, res) => {
  const updated = updateCountry(req.params.code, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Country not found" });
  }
  res.json({ success: true, message: "✅ Country updated", data: updated });
});

// --- PATCH ---
router.patch("/:code", (req, res) => {
  const updated = updateCountry(req.params.code, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: "Country not found" });
  }
  res.json({ success: true, message: "✅ Country patched", data: updated });
});

// --- DELETE ---
router.delete("/:code", (req, res) => {
  const deleted = deleteCountry(req.params.code);
  if (!deleted) {
    return res.status(404).json({ success: false, message: "Country not found" });
  }
  res.json({ success: true, message: "🗑️ Country deleted", data: deleted });
});

export default router;