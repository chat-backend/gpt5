// services/answerFormatter.js (ESM version, minimal & clean)

// Hàm tạo tag nguồn chuẩn
function formatSourceTag(source = "AI") {
  return `🌐 (nguồn: ${source})`;
}

// Hàm xoá các dòng nguồn cũ (nếu có)
function stripExistingSources(text = "") {
  return text
    .split("\n")
    .filter(line =>
      !/^\s*(🌐\s*\(nguồn:.*\)|Nguồn\s*:\s*.*|source\s*:\s*.*)$/i.test(line.trim())
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Hàm xoá các intro lỗi kỹ thuật
function stripErrorIntros(text = "") {
  return text
    .replace(/^Có vẻ như (có|đang có) (một )?(sự cố|lỗi).*?\.\s*/gi, "")
    .replace(/^Xin lỗi.*?\.\s*/gi, "")
    .trim();
}

// Hàm fallback mặc định
function getFallbackMessage() {
  return "Xin lỗi, hiện tại tôi chưa có thông tin cho câu hỏi này.";
}

// Hàm format câu trả lời cuối cùng
export function formatAnswer(intent, rawAnswer, source = "AI") {
  let body = "";

  if (typeof rawAnswer === "string") {
    body = rawAnswer.trim();
  } else if (rawAnswer) {
    body = String(rawAnswer).trim();
  }

  if (!body) {
    return `${getFallbackMessage()}\n\n${formatSourceTag(source)}`;
  }

  // Xử lý nội dung
  body = stripExistingSources(body);
  body = stripErrorIntros(body);

  // Trả về body + nguồn
  return `${body}\n\n${formatSourceTag(source)}`;
}