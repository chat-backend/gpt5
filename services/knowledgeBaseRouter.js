// services/knowledgeBaseRouter.js (ESM version)
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();

// --- Đường dẫn file KB ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KB_FILE = path.join(__dirname, "knowledgeBase.json");

// --- Utils ---
function removeDiacritics(str = "") {
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

function normalize(text = "") {
  return removeDiacritics(String(text).toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function generateAliases(role = "", country = "") {
  const aliases = [];
  const roleLower = String(role).toLowerCase();
  const countryLower = String(country).toLowerCase();

  aliases.push(`${roleLower} ${countryLower}`);
  aliases.push(`${roleLower} nuoc ${countryLower}`);
  aliases.push(`${roleLower} cua ${countryLower}`);
  aliases.push(`${roleLower} ${country}`);
  aliases.push(`${role} of ${country}`);
  aliases.push(`${role} ${country.toUpperCase()}`);

  const shortMap = {
    "việt nam": ["vn", "vietnam", "viet nam"],
    "mỹ": ["us", "usa", "hoa kỳ", "hoa ky", "my"],
    "hoa kỳ": ["us", "usa", "mỹ", "my", "hoa ky"],
    "pháp": ["fr", "france"],
    "trung quốc": ["cn", "china", "trung hoa"],
    "anh": ["uk", "united kingdom", "great britain", "britain"]
  };

  if (shortMap[countryLower]) {
    for (const alt of shortMap[countryLower]) {
      const altNorm = normalize(alt);
      aliases.push(`${roleLower} ${alt}`);
      aliases.push(`${roleLower} nuoc ${alt}`);
      aliases.push(`${roleLower} cua ${alt}`);
      aliases.push(`${roleLower} ${altNorm}`);
      aliases.push(`${roleLower} nuoc ${altNorm}`);
      aliases.push(`${roleLower} cua ${altNorm}`);
    }
  }

  const aliasesNoDiacritics = aliases.map(a => normalize(a));
  return Array.from(new Set([...aliases, ...aliasesNoDiacritics].map(a => a.trim())));
}

function matchAlias(question = "", aliases = []) {
  const qNorm = normalize(question);
  return aliases.some(alias => qNorm.includes(normalize(alias)));
}

// --- Load & Save KB ---
function loadKnowledgeBase() {
  try {
    if (fs.existsSync(KB_FILE)) {
      const raw = fs.readFileSync(KB_FILE, "utf8");
      const parsed = JSON.parse(raw || "{}");
      for (const [country, roles] of Object.entries(parsed)) {
        for (const [role, data] of Object.entries(roles)) {
          if (!Array.isArray(data.aliases) || data.aliases.length === 0) {
            data.aliases = generateAliases(role, country);
          }
        }
      }
      return parsed && typeof parsed === "object" ? parsed : {};
    }
  } catch (err) {
    console.error("⚠️ Lỗi đọc/parse KB:", err.message, err.stack);
  }
  return {};
}

function saveKnowledgeBase(data) {
  try {
    fs.writeFileSync(KB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("⚠️ Lỗi ghi KB:", err.message, err.stack);
  }
}

let leaders = loadKnowledgeBase();

// --- Middleware Knowledge Base ---
export async function knowledgeBaseMiddleware(req, res, next) {
  try {
    const q =
      req.body.q ||
      req.body.message ||
      req.query.q ||
      req.query.message ||
      "";
    if (!q) return next();

    for (const [country, roles] of Object.entries(leaders)) {
      for (const [role, data] of Object.entries(roles)) {
        const aliases = Array.isArray(data.aliases) ? data.aliases : [];
        if (aliases.length && matchAlias(q, aliases)) {
          const info = data.current || null;
          if (!info) {
            return res.json({
              source: "knowledge-base",
              answer: `Chưa có dữ liệu ${role} của ${country}.`,
              data: null
            });
          }
          let answer = `${role} của ${country} hiện tại là ${info.name}`;
          if (info.term) answer += `, giữ chức từ ${info.term}`;
          if (info.party) answer += `, thuộc đảng ${info.party}.`;
          return res.json({
            source: "knowledge-base",
            answer,
            data: { current: data.current, previous: data.previous || [] }
          });
        }
      }
    }
    return next();
  } catch (err) {
    console.error("❌ Lỗi KB middleware:", err.message, err.stack);
    return next();
  }
}

// --- API Routes ---
// Lấy toàn bộ leaders
router.get("/leaders", (_req, res) => res.json({ data: leaders }));

// Lấy leader theo country/role
router.get("/leader", (req, res) => {
  const { country, role, leaderName } = req.query;
  if (!country || !role)
    return res.status(400).json({ error: "Thiếu country hoặc role" });

  const cNorm = normalize(country);
  const rNorm = normalize(role);

  const countryData = Object.entries(leaders).find(
    ([c]) => normalize(c) === cNorm
  );
  if (!countryData) return res.status(404).json({ error: "Không tìm thấy country" });

  const [countryName, roles] = countryData;
  const roleDataEntry = Object.entries(roles).find(
    ([r]) => normalize(r) === rNorm
  );
  if (!roleDataEntry) return res.status(404).json({ error: "Không tìm thấy role" });

  const [roleName, roleData] = roleDataEntry;
  const prevList = Array.isArray(roleData.previous) ? roleData.previous : [];

  if (!leaderName) return res.json({ data: { ...roleData, previous: prevList } });

  const targetName = normalize(leaderName);
  if (roleData.current && normalize(roleData.current.name) === targetName) {
    return res.json({ data: roleData.current });
  }
  const found = prevList.find(l => normalize(l.name) === targetName);
  if (found) return res.json({ data: found });

  return res.status(404).json({ error: "Không tìm thấy lãnh đạo" });
});

// Search leader theo tên
router.get("/search-leader", (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: "Thiếu name" });

  const target = normalize(name);
  const results = [];

  for (const [country, roles] of Object.entries(leaders)) {
    for (const [role, data] of Object.entries(roles)) {
      const prevList = Array.isArray(data.previous) ? data.previous : [];
      if (data.current && normalize(data.current.name).includes(target)) {
        results.push({ country, role, position: "current", info: data.current });
      }
      for (const l of prevList) {
        if (normalize(l.name).includes(target)) {
          results.push({ country, role, position: "previous", info: l });
        }
      }
    }
  }

  if (results.length === 0) return res.status(404).json({ error: "Không tìm thấy" });
  res.json({ results });
});

// Suggest leader theo query
router.get("/suggest-leader", (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Thiếu query" });

  const qNorm = normalize(query);
  const suggestions = new Set();

  for (const roles of Object.values(leaders)) {
    for (const data of Object.values(roles)) {
      const prevList = Array.isArray(data.previous) ? data.previous : [];
      if (data.current && normalize(data.current.name).includes(qNorm))
        suggestions.add(data.current.name);
      for (const l of prevList) {
        if (normalize(l.name).includes(qNorm)) suggestions.add(l.name);
      }
    }
  }

  if (suggestions.size === 0) return res.status(404).json({ error: "Không có gợi ý" });
  res.json({ suggestions: Array.from(suggestions) });
});

// --- Update leader (POST) ---
router.post("/update-leader", (req, res) => {
  const { country, role, leader, isCurrent, overwrite } = req.body;
  if (!country || !role || !leader) {
    return res.status(400).json({ error: "Thiếu tham số" });
  }

  const safeLeader = {
    name: leader.name || "",
    term: leader.term || "",
    party: leader.party || "",
    sourceType: leader.sourceType || (overwrite ? "news" : "knowledge"),
    updatedAt: new Date().toISOString()
  };
  if (!safeLeader.name) {
    return res.status(400).json({ error: "Thiếu tên lãnh đạo (leader.name)" });
  }

  const cKey = normalize(country);
  const rKey = normalize(role);

  if (!leaders[cKey]) leaders[cKey] = {};
  if (!leaders[cKey][rKey]) {
    leaders[cKey][rKey] = {
      current: null,
      previous: [],
      aliases: generateAliases(role, country)
    };
  }

  const roleData = leaders[cKey][rKey];
  roleData.previous = Array.isArray(roleData.previous) ? roleData.previous : [];

  if (isCurrent) {
    if (overwrite && roleData.current) {
      roleData.previous.unshift(roleData.current);
    }
    roleData.current = safeLeader;
  } else {
    roleData.previous.unshift(safeLeader);
  }

  saveKnowledgeBase(leaders);
  res.json({ message: "Cập nhật thành công", data: roleData });
});

// --- Edit leader (PUT) ---
router.put("/edit-leader", (req, res) => {
  const { country, role, leader } = req.body;
  if (!country || !role || !leader || !leader.name) {
    return res.status(400).json({ error: "Thiếu tham số" });
  }

  const cKey = normalize(country);
  const rKey = normalize(role);

  if (!leaders[cKey] || !leaders[cKey][rKey]) {
    return res.status(404).json({ error: "Không tìm thấy dữ liệu" });
  }

  leaders[cKey][rKey].current = {
    ...leaders[cKey][rKey].current,
    ...leader,
    updatedAt: new Date().toISOString()
  };

  saveKnowledgeBase(leaders);
  res.json({ message: "Sửa thành công", data: leaders[cKey][rKey].current });
});

// --- Patch leader (PATCH) ---
router.patch("/patch-leader", (req, res) => {
  const { country, role, updates } = req.body;
  if (!country || !role || !updates) {
    return res.status(400).json({ error: "Thiếu tham số" });
  }

  const cKey = normalize(country);
  const rKey = normalize(role);

  if (!leaders[cKey] || !leaders[cKey][rKey]) {
    return res.status(404).json({ error: "Không tìm thấy dữ liệu" });
  }

  leaders[cKey][rKey].current = {
    ...leaders[cKey][rKey].current,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveKnowledgeBase(leaders);
  res.json({ message: "Cập nhật thành công", data: leaders[cKey][rKey].current });
});

// --- Delete leader (DELETE) ---
router.delete("/delete-leader", (req, res) => {
  const { country, role } = req.body;
  if (!country || !role) {
    return res.status(400).json({ error: "Thiếu tham số" });
  }

  const cKey = normalize(country);
  const rKey = normalize(role);

  if (!leaders[cKey] || !leaders[cKey][rKey]) {
    return res.status(404).json({ error: "Không tìm thấy dữ liệu" });
  }

  delete leaders[cKey][rKey];
  if (Object.keys(leaders[cKey]).length === 0) {
    delete leaders[cKey];
  }

  saveKnowledgeBase(leaders);
  res.json({ message: "Xóa thành công" });
});

// --- Rebuild aliases (POST) ---
router.post("/rebuild-aliases", (_req, res) => {
  try {
    for (const [country, roles] of Object.entries(leaders)) {
      for (const [role, data] of Object.entries(roles)) {
        data.aliases = generateAliases(role, country);
      }
    }
    saveKnowledgeBase(leaders);
    res.json({ message: "Đã rebuild aliases thành công" });
  } catch (err) {
    console.error("❌ Lỗi rebuild aliases:", err.message, err.stack);
    res.status(500).json({ error: "Lỗi rebuild aliases" });
  }
});

// --- Export router và middleware ---
export const knowledgeBaseRouter = router;