// newsTopics.js
const NEWS_TOPICS = [
 // Nhóm Chính trị & Xã hội
  { query: "chính trị", label: "Chính trị", keywords: ["quốc hội", "chính phủ", "bầu cử", "đảng"] },
  { query: "ngoại giao", label: "Ngoại giao", keywords: ["quan hệ quốc tế", "hợp tác", "đàm phán"] },
  { query: "nhân quyền", label: "Nhân quyền", keywords: ["tự do", "bình đẳng", "dân chủ"] },
  { query: "luật pháp", label: "Luật pháp", keywords: ["tòa án", "pháp luật", "kiện tụng"] },
  { query: "an ninh", label: "An ninh", keywords: ["tội phạm", "cảnh sát", "khủng bố"] },
  { query: "quân sự", label: "Quân sự", keywords: ["quốc phòng", "vũ khí", "chiến tranh"] },
  { query: "xã hội", label: "Xã hội", keywords: ["cộng đồng", "dân số", "di cư"] },
  { query: "tôn giáo", label: "Tôn giáo", keywords: ["giáo hội", "linh mục", "nhà thờ"] },
  { query: "phật giáo", label: "Phật giáo", keywords: ["chùa", "thiền", "tăng ni"] },
  { query: "tình yêu", label: "Tình yêu & Gia đình", keywords: ["hẹn hò", "kết hôn", "ly hôn"] },

  // Nhóm Kinh tế & Tài chính
  { query: "kinh tế", label: "Kinh tế", keywords: ["doanh nghiệp", "thị trường", "kinh doanh"] },
  { query: "tài chính", label: "Tài chính", keywords: ["ngân sách", "đầu tư", "quỹ"] },
  { query: "ngân hàng", label: "Ngân hàng", keywords: ["tín dụng", "lãi suất"] },
  { query: "chứng khoán", label: "Chứng khoán", keywords: ["cổ phiếu", "thị trường chứng khoán"] },
  { query: "thương mại", label: "Thương mại", keywords: ["xuất nhập khẩu", "mậu dịch"] },
  { query: "bất động sản", label: "Bất động sản", keywords: ["nhà đất", "chung cư", "căn hộ"] },
  { query: "khởi nghiệp", label: "Khởi nghiệp", keywords: ["startup", "doanh nhân trẻ"] },
  { query: "năng lượng", label: "Năng lượng", keywords: ["điện", "tái tạo", "mặt trời", "gió"] },
  { query: "dầu khí", label: "Dầu khí", keywords: ["xăng dầu", "petrol", "gas"] },
  { query: "kinh tế số", label: "Kinh tế số", keywords: ["thương mại điện tử", "fintech", "ví điện tử"] },

  // Nhóm Khoa học & Công nghệ
  { query: "công nghệ", label: "Công nghệ", keywords: ["ai", "trí tuệ nhân tạo", "an ninh mạng"] },
  { query: "trí tuệ nhân tạo", label: "Trí tuệ nhân tạo", keywords: ["machine learning", "deep learning"] },
  { query: "blockchain", label: "Blockchain", keywords: ["crypto", "bitcoin", "ethereum"] },
  { query: "khoa học", label: "Khoa học", keywords: ["nghiên cứu", "phát minh", "thí nghiệm"] },
  { query: "vũ trụ", label: "Vũ trụ", keywords: ["nasa", "thiên văn", "hành tinh", "vệ tinh"] },
  { query: "công nghệ sinh học", label: "Công nghệ sinh học", keywords: ["gmo", "gen", "protein"] },
  { query: "công nghệ tài chính", label: "Công nghệ tài chính", keywords: ["fintech", "blockchain tài chính"] },
  { query: "internet vạn vật", label: "Internet vạn vật", keywords: ["iot", "thiết bị thông minh"] },
  { query: "thực tế ảo", label: "Thực tế ảo", keywords: ["vr", "ar", "metaverse"] },
  { query: "an ninh mạng", label: "An ninh mạng", keywords: ["hack", "malware", "bảo mật"] },

  // Nhóm Tự nhiên & Môi trường
  { query: "môi trường", label: "Môi trường", keywords: ["ô nhiễm", "bảo tồn"] },
  { query: "khí hậu", label: "Khí hậu", keywords: ["biến đổi khí hậu", "nhiệt độ"] },
  { query: "thiên tai", label: "Thiên tai", keywords: ["động đất", "bão lũ", "sạt lở"] },
  { query: "đại dương", label: "Đại dương", keywords: ["biển", "san hô", "hải dương học"] },
  { query: "nông nghiệp", label: "Nông nghiệp", keywords: ["trồng trọt", "chăn nuôi"] },
  { query: "biến đổi khí hậu", label: "Biến đổi khí hậu", keywords: ["global warming", "carbon", "khí thải"] },
  { query: "năng lượng tái tạo", label: "Năng lượng tái tạo", keywords: ["gió", "mặt trời", "thủy điện"] },
  { query: "năng lượng hạt nhân", label: "Năng lượng hạt nhân", keywords: ["nuclear", "uranium", "lò phản ứng"] },
  { query: "tài nguyên thiên nhiên", label: "Tài nguyên thiên nhiên", keywords: ["rừng", "nước", "khoáng sản"] },
  { query: "bảo tồn thiên nhiên", label: "Bảo tồn thiên nhiên", keywords: ["vườn quốc gia", "khu bảo tồn"] },

  // Nhóm Văn hóa, Nghệ thuật & Giải trí
  { query: "văn hóa", label: "Văn hóa", keywords: ["lễ hội", "truyền thống", "di sản"] },
  { query: "giáo dục", label: "Giáo dục", keywords: ["học sinh", "sinh viên", "trường học"] },
  { query: "lịch sử", label: "Lịch sử", keywords: ["cổ đại", "trung đại", "cách mạng"] },
  { query: "nghệ thuật", label: "Nghệ thuật", keywords: ["hội họa", "triển lãm", "điêu khắc"] },
  { query: "văn học", label: "Văn học", keywords: ["tiểu thuyết", "thơ ca", "tác giả"] },
  { query: "âm nhạc", label: "Âm nhạc", keywords: ["ca sĩ", "album", "ban nhạc", "bài hát"] },
  { query: "phim ảnh", label: "Phim ảnh", keywords: ["điện ảnh", "truyền hình", "bom tấn"] },
  { query: "thời trang", label: "Thời trang", keywords: ["catwalk", "người mẫu"] },
  { query: "trò chơi điện tử", label: "Trò chơi điện tử", keywords: ["game", "console", "pc game"] },
  { query: "văn hóa đại chúng", label: "Văn hóa đại chúng", keywords: ["pop culture", "idol", "fan"] },
];

export default NEWS_TOPICS;