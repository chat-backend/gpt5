// middlewares/requestLogger.js (ESM version)
import logger from "../logger.js";

export function requestLogger(req, res, next) {
  const start = Date.now();

  const query =
    (typeof req.query.q === "string" && req.query.q) ||
    (typeof req.body?.q === "string" && req.body.q) ||
    (typeof req.body?.query === "string" && req.body.query) ||
    req.originalUrl;

  const sourceMap = {
    "/api/openai": "openai",
    "/api/weather": "weather",
    "/api/google": "google",
    "/api/wikipedia": "wikipedia",
    "/api/openweather": "openweather",
    "/chat": "chat",
    "/countries": "countries",
    "/messages": "messages",
    "/news": "news",
    "/weather": "weather",
    "/search": "search",
    "/ai": "ai",
    "/kb": "knowledgebase",
    "/ask": "ask",
    "/ask-auto": "ask-auto",
  };

  const groupMap = {
    openai: "external",
    google: "external",
    wikipedia: "external",
    openweather: "external",
    weather: "external",
    chat: "internal",
    ask: "internal",
    "ask-auto": "internal",
    countries: "internal",
    messages: "internal",
    news: "internal",
    search: "internal",
    ai: "internal",
    knowledgebase: "internal",
    knowledge: "internal",
    user_query: "internal",
    web: "internal",
    postman: "internal",
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    const ipHeader = req.headers["x-forwarded-for"];
    const ip = Array.isArray(ipHeader)
      ? ipHeader[0]
      : (ipHeader || req.ip || "").split(",")[0].trim();

    let source = res.locals.source || "unknown";
    let group = res.locals.group || "other";

    if (source === "unknown") {
      for (const prefix in sourceMap) {
        if (req.path.startsWith(prefix)) {
          source = sourceMap[prefix];
          break;
        }
      }
    }

    if (source === "unknown" && (req.body?.query || req.body?.q)) {
      source = "user_query";
    }

    if (source === "unknown") {
      const ua = req.headers["user-agent"] || "";
      if (ua.includes("Mozilla")) source = "web";
      else if (ua.includes("Postman")) source = "postman";
    }

    if (!group || group === "other") {
      group = groupMap[source] || "other";
    }

    const logMsg = {
      time: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl,
      query,
      source,
      group,
      status: res.statusCode,
      ip,
      duration: `${duration}ms`,
    };

    if (source === "unknown") {
      logger.warn({
        message: `⚠️ Không xác định được nguồn cho request: ${req.path}`,
        userAgent: req.headers["user-agent"],
        ...logMsg,
      });
    } else {
      logger.info({ message: "📥 Request", ...logMsg });
    }
  });

  next();
}