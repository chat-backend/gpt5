// services/answerService.js (ESM version)

import { classifyIntent } from "./intentService.js";
import { askOpenAIWithHistory, refineAnswer } from "./ai.js";

import { fetchWeather } from "./sources/weatherSource.js";
import { fetchNews } from "./sources/newsSource.js";
import { fetchPhilosophy } from "./sources/philosophySource.js";
import { fetchGeneral } from "./sources/generalSource.js";

export async function answerUserQuestion(message, sessionId = "default") {
  const intent = classifyIntent(message, sessionId);

  let rawData = [];
  let links = [];
  let source = intent;
  let sourcesUsed = [];

  try {
    switch (intent) {
      case "weather": {
        const weatherData = await fetchWeather(message);
        if (weatherData?.summary) rawData.push(weatherData.summary);
        if (weatherData?.link) links.push(weatherData.link);
        source = "weather-api";
        sourcesUsed.push("weather");
        break;
      }
      case "news": {
        const newsData = await fetchNews(message);
        const articles = (newsData.articles || []).slice(0, 5).filter(a => a?.summary);
        rawData.push(...articles.map(a => a.summary));
        links.push(...articles.map(a => a.url));
        source = "news-api";
        sourcesUsed.push("news");
        break;
      }
      case "philosophy": {
        const philoData = await fetchPhilosophy(message);
        if (philoData?.text) rawData.push(philoData.text);
        if (philoData?.link) links.push(philoData.link);
        source = "ai-philosophy";
        sourcesUsed.push("philosophy");
        break;
      }
      default: {
        const generalData = await fetchGeneral(message);
        if (generalData?.text) rawData.push(generalData.text);
        if (generalData?.link) links.push(generalData.link);
        source = "ai-general";
        sourcesUsed.push("general");
      }
    }

    if (rawData.length === 0) {
      rawData.push(`Không có dữ liệu khả dụng từ nguồn. Vui lòng thử lại hoặc đặt câu hỏi khác.`);
    }

    const synthesisPrompt = `
      Hãy đọc các đoạn dữ liệu sau và viết lại thành một câu trả lời duy nhất,
      rõ ràng, dễ hiểu, không liệt kê danh sách, mà tổng hợp thành một thông điệp.
      Nếu là triết lý, hãy diễn giải sâu sắc. Nếu là thông tin, hãy tóm tắt chính xác.
      Viết bằng văn phong tự nhiên, không lặp lại dữ liệu thô, không nhắc lại nguyên văn câu hỏi.
      Dữ liệu:
      ${rawData.join("\n---\n")}
    `;

    const result = await askOpenAIWithHistory(
      [{ role: "user", content: synthesisPrompt }],
      sessionId,
      "",
      intent
    );

    const safeAnswer = refineAnswer(result.answer);

    return {
      success: true,
      intent,
      source,
      sourcesUsed,
      answer: safeAnswer,
      links, // client có thể hiển thị hoặc ẩn
      rawCount: rawData.length,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      intent,
      source,
      sourcesUsed,
      timestamp: new Date().toISOString(),
    };
  }
}