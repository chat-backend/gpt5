// services/newsService.js (ESM version)
import axios from "axios";
import Parser from "rss-parser";

const parser = new Parser();

// --- Danh sách nguồn RSS ---
const RSS_SOURCES = {
  vnexpress: { name: "VNExpress", url: "https://vnexpress.net/rss/tin-moi-nhat.rss" },
  dantri: { name: "Dân Trí", url: "https://dantri.com.vn/rss/home.rss" },
  tuoitre: { name: "Tuổi Trẻ", url: "https://tuoitre.vn/rss/tin-moi-nhat.rss" },
  thanhnien: { name: "Thanh Niên", url: "https://thanhnien.vn/rss/home.rss" },
  nld: { name: "Người Lao Động", url: "https://nld.com.vn/rss/home.rss" },
  vov: { name: "VOV", url: "https://vovlive.vn/rss/thoi-su-383.rss" },
  phattuvietnam: { name: "Phật tử Việt Nam", url: "https://www.phattuvietnam.net/feed/" },
  weather: { name: "Weather", url: "https://news.google.com/rss/search?q=th%E1%BB%9Di+ti%E1%BA%BFt+Vi%E1%BB%87t+Nam&hl=vi&gl=VN&ceid=VN:vi" }
};

// --- Bộ từ khóa phân loại ---
const TOPIC_KEYWORDS = {
  politics: ["chính trị", "quốc hội", "bầu cử", "tổng thống", "chính phủ"],
  economy: ["kinh tế", "tài chính", "chứng khoán", "ngân hàng", "lãi suất"],
  business: ["doanh nghiệp", "startup", "thương mại", "đầu tư", "công ty"],
  technology: ["công nghệ", "AI", "trí tuệ nhân tạo", "blockchain", "robot"],
  science: ["khoa học", "nghiên cứu", "vũ trụ", "hóa học", "sinh học"],
  health: ["sức khỏe", "y tế", "bệnh viện", "vaccine", "dịch bệnh"],
  education: ["giáo dục", "học sinh", "sinh viên", "trường học", "thi cử"],
  environment: ["môi trường", "khí hậu", "biến đổi khí hậu", "rừng", "nhiệt độ"],
  weather: ["thời tiết", "dự báo", "mưa", "nắng", "bão"],
  sports: ["thể thao", "bóng đá", "World Cup", "Olympic", "cầu thủ"],
  culture: ["văn hóa", "nghệ thuật", "di sản", "lễ hội", "âm nhạc"],
  religion: ["tôn giáo", "Phật giáo", "Công giáo", "Hồi giáo", "nhà thờ"],
  travel: ["du lịch", "khách sạn", "tour", "điểm đến", "visa"],
  food: ["ẩm thực", "món ăn", "nhà hàng", "ẩm thực đường phố", "đặc sản"],
  fashion: ["thời trang", "thiết kế", "người mẫu", "catwalk", "xu hướng"],
  entertainment: ["giải trí", "phim", "ca sĩ", "diễn viên", "showbiz"],
  music: ["âm nhạc", "album", "ca khúc", "ban nhạc", "concert"],
  movies: ["phim", "điện ảnh", "Hollywood", "Netflix", "trailer"],
  literature: ["văn học", "sách", "tiểu thuyết", "thơ", "tác giả"],
  history: ["lịch sử", "cổ đại", "chiến tranh", "cách mạng", "triều đại"],
  military: ["quân sự", "chiến tranh", "vũ khí", "hải quân", "không quân"],
  crime: ["tội phạm", "án mạng", "cướp", "ma túy", "truy nã"],
  law: ["luật", "tòa án", "hiến pháp", "bản án", "luật sư"],
  human_rights: ["nhân quyền", "tự do", "bình đẳng", "dân chủ"],
  migration: ["di cư", "nhập cư", "xuất khẩu lao động", "người tị nạn"],
  gender: ["giới tính", "bình đẳng giới", "nữ quyền", "LGBT"],
  children: ["trẻ em", "thiếu nhi", "mầm non", "học sinh"],
  elderly: ["người già", "lão hóa", "hưu trí"],
  jobs: ["việc làm", "tuyển dụng", "thất nghiệp", "nghề nghiệp"],
  housing: ["nhà ở", "bất động sản", "chung cư", "đất đai"],
  transport: ["giao thông", "xe buýt", "tàu điện", "máy bay", "ô tô"],
  energy: ["năng lượng", "dầu khí", "điện", "năng lượng tái tạo"],
  agriculture: ["nông nghiệp", "trồng trọt", "chăn nuôi", "nông dân"],
  industry: ["công nghiệp", "sản xuất", "nhà máy", "xuất khẩu"],
  trade: ["thương mại", "xuất khẩu", "nhập khẩu", "FTA"],
  finance: ["tài chính", "ngân hàng", "đầu tư", "chứng khoán"],
  real_estate: ["bất động sản", "nhà đất", "chung cư", "condo"],
  automotive: ["ô tô", "xe máy", "xe điện", "Tesla", "Toyota"],
  aviation: ["hàng không", "máy bay", "phi công", "sân bay"],
  maritime: ["hàng hải", "tàu biển", "cảng", "logistics"],
  space: ["vũ trụ", "NASA", "SpaceX", "hành tinh", "thiên văn"],
  cybersecurity: ["an ninh mạng", "hacker", "virus", "malware"],
  diplomacy: ["ngoại giao", "Liên Hợp Quốc", "hội nghị", "đàm phán"],
  philanthropy: ["từ thiện", "quyên góp", "thiện nguyện"],
  innovation: ["đổi mới", "sáng tạo", "khởi nghiệp"],
  social_media: ["mạng xã hội", "Facebook", "TikTok", "Twitter"],
  gaming: ["trò chơi", "game", "eSports", "PlayStation", "Xbox"],
  lifestyle: ["phong cách sống", "xu hướng", "thói quen"],
  opinion: ["bình luận", "quan điểm", "ý kiến", "phân tích"]
};

// --- Hàm phân loại ---
function classifyArticle(article) {
  const text = (article.title + " " + (article.description || "")).toLowerCase();
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
      return topic;
    }
  }
  return "general";
}

// --- Cache đơn giản ---
const cache = new Map();

// --- Hàm fetch RSS ---
async function fetchRSS(url, sourceName, limit = 50) {
  const key = `${sourceName}:${limit}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const feed = await parser.parseURL(url);
    const data = feed.items.slice(0, limit).map(item => ({
      id: item.link || item.guid || item.title,
      source: sourceName,
      title: item.title,
      url: item.link,
      description: item.contentSnippet || "",
      image: item.enclosure?.url || null,
      author: item.creator || null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date()
    }));
    cache.set(key, data);
    return data;
  } catch (err) {
    console.error(`❌ Lỗi RSS ${sourceName}:`, err.message);
    return [];
  }
}

// --- Hàm fetch Wikipedia ---
async function fetchWikipedia(title = "Việt_Nam") {
  try {
    const apiUrl = `https://vi.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const res = await axios.get(apiUrl);
    const page = res.data;
    return [{
      id: `wikipedia-${title}`,
      source: "Wikipedia",
      title: page.title,
      url: page.content_urls?.desktop?.page || `https://vi.wikipedia.org/wiki/${title}`,
      description: page.extract || "",
      image: page.thumbnail?.source || null,
      author: "Wikipedia",
      publishedAt: new Date()
    }];
  } catch (err) {
    console.error("❌ Lỗi Wikipedia:", err.message);
    return [];
  }
}

// --- Hàm fetch Wikidata ---
async function fetchWikidata(entityId = "Q881") {
  try {
    const apiUrl = `https://www.wikidata.org/wiki/Special:EntityData/${entityId}.json`;
    const res = await axios.get(apiUrl);
    const entity = res.data.entities[entityId];
    return [{
      id: `wikidata-${entityId}`,
      source: "Wikidata",
      title: entity.labels.vi?.value || entity.labels.en?.value || "Wikidata",
      url: `https://www.wikidata.org/wiki/${entityId}`,
      description: entity.descriptions.vi?.value || entity.descriptions.en?.value || "",
      image: null,
      author: "Wikidata",
      publishedAt: new Date()
    }];
  } catch (err) {
    console.error("❌ Lỗi Wikidata:", err.message);
    return [];
  }
}

// --- Hàm gom nguồn chính ---
export async function getNews(query = "", limit = 100, since = null) {
  const results = await Promise.all([
    fetchRSS(RSS_SOURCES.vnexpress.url, RSS_SOURCES.vnexpress.name, limit),
    fetchRSS(RSS_SOURCES.dantri.url, RSS_SOURCES.dantri.name, limit),
    fetchRSS(RSS_SOURCES.tuoitre.url, RSS_SOURCES.tuoitre.name, limit),
    fetchRSS(RSS_SOURCES.thanhnien.url, RSS_SOURCES.thanhnien.name, limit),
    fetchRSS(RSS_SOURCES.nld.url, RSS_SOURCES.nld.name, limit),
    fetchRSS(RSS_SOURCES.vov.url, RSS_SOURCES.vov.name, limit),
    fetchRSS(RSS_SOURCES.phattuvietnam.url, RSS_SOURCES.phattuvietnam.name, limit),
    fetchRSS(RSS_SOURCES.weather.url, RSS_SOURCES.weather.name, limit),
    fetchWikipedia("Việt_Nam"),
    fetchWikidata("Q881")
  ]);

  let articles = results.flat();

  // Lọc trùng
  const seen = new Set();
  articles = articles.filter(a => {
    if (!a.title || !a.url) return false;
    const key = (a.url || a.title).toLowerCase().split(/[?#]/)[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Gán topic cho từng bài
  articles = articles.map(a => ({
    ...a,
    topic: classifyArticle(a)
  }));

  // Lọc theo query
  if (query) {
    const q = query.toLowerCase();
    articles = articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    );
  }

  // Lọc theo thời gian (since)
  if (since) {
    const now = new Date();
    let cutoff;
    if (since.endsWith("h")) {
      const hours = parseInt(since.replace("h", ""), 10);
      cutoff = new Date(now.getTime() - hours * 60 * 60 * 1000);
    } else if (since.endsWith("d")) {
      const days = parseInt(since.replace("d", ""), 10);
      cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }
    if (cutoff) {
      articles = articles.filter(a => a.publishedAt && a.publishedAt >= cutoff);
    }
  }

  // Sắp xếp theo thời gian mới nhất
  articles.sort((a, b) => {
    if (!a.publishedAt) return 1;
    if (!b.publishedAt) return -1;
    return b.publishedAt - a.publishedAt;
  });

  return articles.slice(0, limit);
}

// --- Hàm tiện ích ---
export function getTopics() {
  return Object.keys(TOPIC_KEYWORDS);
}

export async function getNewsByTopic(topic, limit = 50) {
  const all = await getNews("", limit);
  return all.filter(a => a.topic === topic);
}

// --- Export thêm TOPIC_KEYWORDS để router dùng ---
export { TOPIC_KEYWORDS };

