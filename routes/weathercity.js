// GET /weather/:city
router.get("/:city", async (req, res) => {
  try {
    const rawCity = req.params.city;
    if (!rawCity || rawCity.trim().length < 2) {
      return res.status(400).json({
        success: false,
        source: "weather",
        group: "internal",
        error: "Thiếu hoặc tên thành phố không hợp lệ."
      });
    }

    const city = normalizeCityName(rawCity);
    const start = Date.now();
    const weather = await getWeather(city);
    const duration = Date.now() - start;

    if (!weather) {
      return res.status(500).json({
        success: false,
        source: "weather",
        group: "internal",
        error: `Không lấy được dữ liệu thời tiết cho ${city}`
      });
    }

    console.info(`📡 GET /weather/${city} → OK (${duration}ms)`);

    res.json({
      success: true,
      source: "weather",
      group: "internal",
      city,
      data: weather
    });
  } catch (err) {
    console.error("❌ Lỗi khi xử lý /weather/:city:", err.message);
    res.status(500).json({
      success: false,
      source: "weather",
      group: "internal",
      error: "Lỗi server khi lấy dữ liệu thời tiết"
    });
  }
});