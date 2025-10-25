// services/knowledge.js (ESM version, full 5 sources)
import fetch from "node-fetch";
import {
  addMessage,
  buildContextForAI,
  autoSummarize,
  getLastAnswer
} from "../services/memory.js";
import { askAIWithRetry } from "./aiWrapper.js";
import { googleSearch } from "./search.js"; // Google Custom Search

/* ----------------------------- Helpers ----------------------------- */
function truncate(str, max = 1200) {
  if (!str) return str;
  return str.length > max ? str.slice(0, max) + "…" : str;
}
function stripHtml(str) {
  return str ? str.replace(/<\/?[^>]+(>|$)/g, "") : str;
}

/* ----------------------------- Wikipedia ----------------------------- */
export async function fetchWikiSummary(query) {
  try {
    const url = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title || query,
      extract: data.extract || null,
      shortDescription: data.description || null,
      url: data.content_urls?.desktop?.page || `https://vi.wikipedia.org/wiki/${encodeURIComponent(query)}`,
      thumbnail: data.thumbnail?.source || null,
      lang: data.lang || "vi"
    };
  } catch (err) {
    console.error("❌ Lỗi fetch Wikipedia:", err.message);
    return null;
  }
}

export async function fetchWikiSearchWithSummaries(query, limit = 5) {
  try {
    const url = `https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const searchResults = data?.query?.search || [];
    return Promise.all(
      searchResults.map(async (item) => {
        const detail = await fetchWikiSummary(item.title);
        return {
          title: item.title,
          snippet: stripHtml(item.snippet || ""),
          url: `https://vi.wikipedia.org/wiki/${encodeURIComponent(item.title)}`,
          extract: detail?.extract || null,
          shortDescription: detail?.shortDescription || null,
          thumbnail: detail?.thumbnail || null,
          lang: detail?.lang || "vi"
        };
      })
    );
  } catch (err) {
    console.error("❌ Lỗi fetchWikiSearchWithSummaries:", err.message);
    return [];
  }
}

/* ----------------------- Buddhism dictionary ----------------------- */
export async function fetchBuddhismDictionary(query) {
  try {
    const dict = {
      "tam bảo": "Tam Bảo là Phật, Pháp, Tăng – ba ngôi báu của Phật giáo.",
      "pháp tạng": "Pháp Tạng có thể chỉ kho tàng giáo pháp, một bộ phái Phật giáo, hoặc Bồ Tát Pháp Tạng trong kinh Vô Lượng Thọ."
    };
    return dict[query.toLowerCase()] || null;
  } catch (err) {
    console.error("❌ Lỗi fetchBuddhismDictionary:", err.message);
    return null;
  }
}

/* ----------------------- General dictionary ----------------------- */
export async function fetchGeneralDictionary(query) {
  try {
    const dict = {
      "ai": "Trí tuệ nhân tạo (Artificial Intelligence) là lĩnh vực nghiên cứu phát triển hệ thống có khả năng học hỏi và suy luận.",
      "internet": "Internet là mạng lưới toàn cầu kết nối hàng tỷ thiết bị, cho phép trao đổi thông tin."
    };
    return dict[query.toLowerCase()] || null;
  } catch (err) {
    console.error("❌ Lỗi fetchGeneralDictionary:", err.message);
    return null;
  }
}

/* --------------------------- Main aggregator --------------------------- */
export async function getKnowledgeAnswer(query, sessionId = "default", intent = "knowledge") {
  addMessage(sessionId, "user", query, { intent });

  // Gọi song song 4 nguồn ngoài
  const [wikiAns, googleResults, buddhismAns, generalAns] = await Promise.all([
    fetchWikiSummary(query),
    googleSearch(query),
    fetchBuddhismDictionary(query),
    fetchGeneralDictionary(query)
  ]);

  // Fallback Wikipedia search
  let wikiSearchList = [];
  let wikiFirst = null;
  if (!wikiAns?.extract) {
    wikiSearchList = await fetchWikiSearchWithSummaries(query, 5);
    wikiFirst = wikiSearchList[0] || null;
  }

  // Build context
const context = await buildContextForAI(sessionId);

if (intent === "expand") {
  const last = getLastAnswer(sessionId);
  if (last) {
    context.push({
      role: "system",
      content: `🔄 Người dùng muốn bạn viết tiếp dựa trên: "${last}"`
    });
  }
} else if (intent === "conclude") {
  const last = getLastAnswer(sessionId);
  if (last) {
    context.push({
      role: "system",
      content: `📝 Người dùng muốn bạn viết đoạn kết luận dựa trên: "${last}"`
    });
  }
}

// System prompt
context.unshift({
  role: "system",
  content: `Bạn là Trợ lý Thông Tuệ. Hãy tổng hợp thông tin từ nhiều nguồn (Wikipedia, Google, Từ điển Phật học, Từ điển tổng hợp...) và nối mạch hội thoại trước đó.
- Nếu người dùng yêu cầu "thêm", "tiếp tục", "mở rộng", hãy viết tiếp phần trước thay vì lặp lại.
- Nếu người dùng yêu cầu "kết luận", hãy viết đoạn kết ngắn gọn, súc tích, tổng hợp ý chính.
- Nếu người dùng yêu cầu "tóm tắt", hãy trả lời ngắn gọn.
Luôn giữ phong cách rõ ràng, mạch lạc, dễ hiểu.`
});

  // Inject nguồn vào context
  const contextSources = [];
  if (wikiAns?.extract) {
    context.push({ role: "system", content: `📖 Wikipedia (${wikiAns.title}): ${truncate(wikiAns.extract)}` });
    contextSources.push("wiki");
  } else if (wikiFirst?.extract) {
    context.push({ role: "system", content: `📖 Wikipedia (${wikiFirst.title}): ${truncate(wikiFirst.extract)}` });
    contextSources.push("wiki-search");
  }
  if (googleResults && googleResults.length > 0) {
    const snippets = googleResults.map(r => r.snippet).filter(Boolean).join(" | ");
    context.push({ role: "system", content: `🔎 Google: ${truncate(snippets)}` });
    contextSources.push("google");
  }
  if (buddhismAns) {
    context.push({ role: "system", content: `🪷 Từ điển Phật học: ${truncate(buddhismAns)}` });
    contextSources.push("buddhism");
  }
  if (generalAns) {
    context.push({ role: "system", content: `📘 Từ điển tổng hợp: ${truncate(generalAns)}` });
    contextSources.push("general");
  }

  context.unshift({
    role: "system",
    content: `
Bạn là Trợ lý Thông Tuệ. Hãy tổng hợp thông tin từ nhiều nguồn (Wikipedia, Google, Từ điển Phật học, Từ điển tổng hợp...)
và nối mạch hội thoại trước đó.
- Nếu người dùng yêu cầu "thêm", "tiếp tục", "mở rộng", hãy viết tiếp phần trước thay vì lặp lại.
- Nếu yêu cầu "tóm tắt", hãy trả lời ngắn gọn.
Luôn giữ phong cách rõ ràng, mạch lạc, dễ hiểu.`
  });

  try {
    const aiAnswer = await askAIWithRetry(sessionId, { message: query, history: context }, 15000, 2);

    // Xác định nguồn dùng cho finalAnswer
    let finalAnswer;
    const aiText = aiAnswer?.trim();
    const hasWikiDirect = !!wikiAns?.extract;
    const hasWikiSearch = !!wikiFirst?.extract;

    const sources = {
      ai: false,
      wiki: !!wikiAns?.extract || !!wikiFirst?.extract,
      google: googleResults && googleResults.length > 0,
      buddhism: !!buddhismAns,
      general: !!generalAns
    };

    let usedSource = null;
    if (aiText) {
      finalAnswer = aiText;
      sources.ai = true;
      usedSource = "ai";
    } else if (hasWikiDirect) {
      finalAnswer = wikiAns.extract;
      usedSource = "wiki";
    } else if (hasWikiSearch) {
      finalAnswer = wikiFirst.extract;
      usedSource = "wiki-search";
    } else if (buddhismAns) {
      finalAnswer = buddhismAns;
      usedSource = "buddhism";
    } else if (generalAns) {
      finalAnswer = generalAns;
      usedSource = "general";
    } else {
      finalAnswer = "Xin lỗi, hiện tại mình chưa có thông tin cho câu hỏi này.";
      usedSource = "system";
    }

    addMessage(sessionId, "assistant", finalAnswer, { intent: "knowledge-answer" });
    await autoSummarize(sessionId);

    const wikiMeta =
      hasWikiDirect
        ? { 
            title: wikiAns.title, 
            url: wikiAns.url, 
            thumbnail: wikiAns.thumbnail, 
            shortDescription: wikiAns.shortDescription, 
            lang: wikiAns.lang 
          }
        : hasWikiSearch
        ? { 
            title: wikiFirst.title, 
            url: wikiFirst.url, 
            thumbnail: wikiFirst.thumbnail, 
            shortDescription: wikiFirst.shortDescription, 
            lang: wikiFirst.lang 
          }
        : null;

    // Chi tiết nguồn để UI hiển thị rõ
    const sourceDetails = {
      usedForAnswer: usedSource,               // nguồn được dùng cho finalAnswer
      contributedToContext: contextSources,    // danh sách nguồn đã inject vào context
      available: Object.keys(sources).filter(k => sources[k]) // nguồn có dữ liệu
    };

    return {
      sessionId,
      answer: finalAnswer,
      sources,           // flags đơn giản: nguồn nào có dữ liệu
      sourceDetails,     // chi tiết rõ ràng cho UI
      wikiMeta,
      wikiSearchList,
      googleResults,     // danh sách kết quả Google
      suggestions: []
    };
  } catch (err) {
    console.error("❌ Lỗi khi gọi AI:", err.message);
    return {
      sessionId,
      answer: "Xin lỗi, hiện tại mình chưa có thông tin cho câu hỏi này.",
      sources: { ai: false, wiki: false, google: false, buddhism: false, general: false },
      sourceDetails: { usedForAnswer: "system", contributedToContext: [], available: [] },
      wikiMeta: null,
      wikiSearchList: [],
      googleResults: [],
      suggestions: []
    };
  }
}