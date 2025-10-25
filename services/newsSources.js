// services/newsSources.js (ESM version)
import Parser from "rss-parser";
const parser = new Parser();

// Chuẩn hóa dữ liệu từ RSS
function normalizeItem(source, item) {
  const publishedRaw = item.isoDate || item.pubDate || null;
  return {
    source,
    title: (item.title || "").trim(),
    url: (item.link || "").trim(),
    description: (item.contentSnippet || item.content || "").trim(),
    publishedAt: publishedRaw ? new Date(publishedRaw).getTime() : Date.now(),
    guid: item.guid || item.id || item.link || ""
  };
}

// Tạo hàm fetch động cho RSS
function createRSSFetcher(sourceName, url) {
  return async function () {
    try {
      const feed = await parser.parseURL(url);
      return feed.items.map(item => normalizeItem(sourceName, item));
    } catch (err) {
      console.error(`❌ Lỗi fetch ${sourceName}:`, err.message);
      return [];
    }
  };
}

// Hàm fetch Wikipedia động (nguồn chính)
export async function fetchWikipedia(title = "Trang_Chủ") {
  try {
    const url = `https://vi.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(title)}&format=json&exintro=1)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    return [{
      source: "Wikipedia",
      title: data.title || "Wikipedia",
      url: data.content_urls?.desktop?.page || url,
      description: (data.extract || "").trim(),
      publishedAt: Date.now(),
      guid: data.pageid?.toString() || url
    }];
  } catch (err) {
    console.error("❌ Lỗi fetch Wikipedia:", err.message);
    return [];
  }
}

// --- Các nguồn RSS báo chí Việt Nam ---
export const fetchVNExpress = createRSSFetcher("VNExpress", "https://vnexpress.net/rss/tin-moi-nhat.rss");
export const fetchDanTri = createRSSFetcher("DanTri", "https://dantri.com.vn/rss/home.rss");
export const fetchTuoiTre = createRSSFetcher("TuoiTre", "https://tuoitre.vn/rss/tin-moi-nhat.rss");
export const fetchThanhNien = createRSSFetcher("ThanhNien", "https://thanhnien.vn/rss/home.rss");
export const fetchNguoiLaoDong = createRSSFetcher("NguoiLaoDong", "https://nld.com.vn/rss/home.rss");
export const fetchVOV = createRSSFetcher("VOV", "https://vovlive.vn/rss/thoi-su-383.rss");
export const fetchPhatTuVN = createRSSFetcher("PhatTuVN", "https://www.phattuvietnam.net/feed/");
export const fetchGoogleNews = createRSSFetcher("GoogleNews", "https://news.google.com/rss?hl=vi&gl=VN&ceid=VN:vi");

// Nguồn thời tiết ổn định (Google News, đã encodeURI)
export const fetchWeather = createRSSFetcher(
  "Weather",
  "https://news.google.com/rss/search?q=th%E1%BB%9Di+ti%E1%BA%BFt+Vi%E1%BB%87t+Nam&hl=vi&gl=VN&ceid=VN:vi"
);

// Placeholder cho Google Custom Search
export async function fetchGoogleCustomSearch() {
  return [];
}

// --- Nguồn quốc tế & chuyên ngành ---
export const fetchBBC = createRSSFetcher("BBC", "http://feeds.bbci.co.uk/news/rss.xml");
export const fetchCNN = createRSSFetcher("CNN", "http://rss.cnn.com/rss/edition.rss");
export const fetchGuardian = createRSSFetcher("TheGuardian", "https://www.theguardian.com/world/rss");
export const fetchAlJazeera = createRSSFetcher("AlJazeera", "https://www.aljazeera.com/xml/rss/all.xml");

// Các nguồn ổn định thay thế
export const fetchAPNews = createRSSFetcher("APNews", "https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en");
export const fetchBloomberg = createRSSFetcher("Bloomberg", "https://feeds.a.dj.com/rss/RSSWorldNews.xml");
export const fetchScienceMag = createRSSFetcher("ScienceMag", "https://www.newscientist.com/feed/home");
export const fetchLancet = createRSSFetcher("TheLancet", "https://www.thelancet.com/rssfeed/lancet_current.xml");
export const fetchWHO = createRSSFetcher("WHO", "https://www.who.int/rss-feeds/news-english.xml");
export const fetchSmithsonian = createRSSFetcher("Smithsonian", "https://www.smithsonianmag.com/rss/latest_articles/");
export const fetchNYTimes = createRSSFetcher("NYTimes", "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml");

// Các nguồn chuyên ngành khác
export const fetchCoinDesk = createRSSFetcher("CoinDesk", "https://www.coindesk.com/arc/outboundfeeds/rss/");
export const fetchNASA = createRSSFetcher("NASA", "https://www.nasa.gov/rss/dyn/breaking_news.rss");
export const fetchTechCrunch = createRSSFetcher("TechCrunch", "http://feeds.feedburner.com/TechCrunch/");
export const fetchWired = createRSSFetcher("Wired", "https://www.wired.com/feed/rss");
export const fetchBillboard = createRSSFetcher("Billboard", "https://www.billboard.com/feed/");
export const fetchVariety = createRSSFetcher("Variety", "https://variety.com/feed/");
export const fetchESPN = createRSSFetcher("ESPN", "https://www.espn.com/espn/rss/news");

// 📈 Chứng khoán
export const fetchVietnamBizStock = createRSSFetcher(
  "VietnamBiz-ChungKhoan",
  "https://vietnambiz.vn/chung-khoan.rss"
);

// 🤖 Trí tuệ nhân tạo (AI)
export const fetchVentureBeatAI = createRSSFetcher(
  "VentureBeat-AI",
  "https://venturebeat.com/category/ai/feed/"
);

export const fetchMITTechAI = createRSSFetcher(
  "MITTechReview-AI",
  "https://www.technologyreview.com/feed/"
);

export const fetchSyncedAI = createRSSFetcher(
  "SyncedAI",
  "https://syncedreview.com/feed/"
);

// 🌾 Nông nghiệp
export const fetchVNExpressBiz = createRSSFetcher(
  "VNExpress-KinhDoanh",
  "https://vnexpress.net/rss/kinh-doanh.rss"
);

// 🎓 Giáo dục
export const fetchTuoiTreEdu = createRSSFetcher(
  "TuoiTre-GiaoDuc",
  "https://tuoitre.vn/rss/giao-duc.rss"
);

export const fetchThanhNienEdu = createRSSFetcher(
  "ThanhNien-GiaoDuc",
  "https://thanhnien.vn/rss/giao-duc.rss"
);

// --- Mảng tổng hợp các nguồn tin tức ---
export const NEWS_SOURCES = [
  // VN
  { name: "VNExpress", fetch: fetchVNExpress },
  { name: "DanTri", fetch: fetchDanTri },
  { name: "TuoiTre", fetch: fetchTuoiTre },
  { name: "ThanhNien", fetch: fetchThanhNien },
  { name: "NguoiLaoDong", fetch: fetchNguoiLaoDong },
  { name: "Weather", fetch: fetchWeather },
  { name: "VOV", fetch: fetchVOV },
  { name: "PhatTuVN", fetch: fetchPhatTuVN },

  // Tổng hợp
  { name: "GoogleNews", fetch: fetchGoogleNews },
  { name: "GoogleCustomSearch", fetch: fetchGoogleCustomSearch },
  { name: "Wikipedia", fetch: fetchWikipedia },

  // Quốc tế
  { name: "BBC", fetch: fetchBBC },
  { name: "CNN", fetch: fetchCNN },
  { name: "APNews", fetch: fetchAPNews },
  { name: "NYTimes", fetch: fetchNYTimes },
  { name: "TheGuardian", fetch: fetchGuardian },
  { name: "AlJazeera", fetch: fetchAlJazeera },

  // Chuyên ngành
  { name: "Bloomberg", fetch: fetchBloomberg },
  { name: "CoinDesk", fetch: fetchCoinDesk },
  { name: "TheLancet", fetch: fetchLancet },
  { name: "NASA", fetch: fetchNASA },
  { name: "WHO", fetch: fetchWHO },
  { name: "ScienceMag", fetch: fetchScienceMag },
  { name: "Smithsonian", fetch: fetchSmithsonian },
  { name: "TechCrunch", fetch: fetchTechCrunch },
  { name: "Wired", fetch: fetchWired },
  { name: "Billboard", fetch: fetchBillboard },
  { name: "Variety", fetch: fetchVariety },
  { name: "ESPN", fetch: fetchESPN },

    // Chứng khoán
{ name: "VietnamBiz-ChungKhoan", fetch: fetchVietnamBizStock },

// AI
{ name: "MITTechReview-AI", fetch: fetchMITTechAI },
{ name: "VentureBeat-AI", fetch: fetchVentureBeatAI },
{ name: "SyncedAI", fetch: fetchSyncedAI },

// Nông nghiệp
{ name: "VNExpress-KinhDoanh", fetch: fetchVNExpressBiz },

// Giáo dục
{ name: "TuoiTre-GiaoDuc", fetch: fetchTuoiTreEdu },
{ name: "ThanhNien-GiaoDuc", fetch: fetchThanhNienEdu },
];
