search.test.js
import { globalSearchHandler } from "../routes/search.js";
import axios from "axios";

// ✅ Mock axios
jest.mock("axios");

describe("globalSearchHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("trả về kết quả ưu tiên có chứa từ khóa 'hiện tại'", async () => {
    // Mock dữ liệu web
    const webMock = {
      data: {
        items: [
          {
            title: "Wikipedia - Tổng thống Mỹ",
            link: "https://vi.wikipedia.org/wiki/Tổng_thống_Hoa_Kỳ",
            snippet: "Donald Trump là Tổng thống Mỹ hiện tại (đương nhiệm)."
          }
        ]
      }
    };

    // Mock dữ liệu news
    const newsMock = {
      data: {
        items: [
          {
            title: "BBC News",
            link: "https://bbc.com/trump",
            snippet: "Donald Trump tuyên thệ nhậm chức Tổng thống thứ 47."
          }
        ]
      }
    };

    axios.get
      .mockResolvedValueOnce(webMock)  // lần gọi đầu tiên: web
      .mockResolvedValueOnce(newsMock); // lần gọi thứ hai: news

    const result = await globalSearchHandler("tổng thống mỹ hiện tại");

    expect(result.error).toBeNull();
    expect(result.total).toBeGreaterThan(0);
    expect(result.message).toMatch(/Donald Trump/);
    expect(result.message).toMatch(/hiện tại|đương nhiệm/);
  });

  it("fallback về kết quả đầu tiên nếu không có snippet phù hợp", async () => {
    const webMock = {
      data: {
        items: [
          {
            title: "Trang blog",
            link: "https://example.com",
            snippet: "Một bài viết không liên quan"
          }
        ]
      }
    };

    const newsMock = { data: { items: [] } };

    axios.get
      .mockResolvedValueOnce(webMock)
      .mockResolvedValueOnce(newsMock);

    const result = await globalSearchHandler("truy vấn không rõ");

    expect(result.error).toBeNull();
    expect(result.message).toContain("Một bài viết không liên quan");
  });

  it("xử lý lỗi khi axios ném exception", async () => {
    axios.get.mockRejectedValue(new Error("Network error"));

    const result = await globalSearchHandler("tổng bí thư việt nam");

    expect(result.error).toBe("Network error");
    expect(result.message).toMatch(/Lỗi khi tìm kiếm/);
  });
});



