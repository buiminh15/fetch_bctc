const axios = require('axios');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

const YEAR_ID = 1541; // ID danh mục cho năm, cần cập nhật nếu thay đổi
const PAGES = [3, 2, 1]; // Các trang cần kiểm tra, theo thứ tự ưu tiên

async function fetchAndExtractData() {
  try {
    let allNames = [];

    // Lặp qua các trang ưu tiên để gom tất cả tên báo cáo mới nhất
    for (const page of PAGES) {
      console.log(`Đang kiểm tra dữ liệu trên trang ${page}...`);
      const response = await axios.get(
        `https://acb.com.vn/api/front/v1/posts?search[categories.category_id:in]=${YEAR_ID}&search[is_active:in]=1&page=${page}&limit=5`,
        {
          headers: {
            'accept': 'application/json',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          }
        }
      );

      const posts = response?.data?.data;
      if (!Array.isArray(posts) || posts.length === 0) {
        console.log(`Trang ${page} không có dữ liệu.`);
        continue;
      }

      // Gom tất cả tên báo cáo (có thể là title hoặc trường phù hợp)
      allNames.push(...posts.map(post => post.title));
    }

    // Lọc tên báo cáo chưa có trong DB
    const newNames = await filterNewNames(allNames, COMPANIES.ACB);

    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.ACB);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name =>
          sendTelegramNotification(`Báo cáo mới từ ACB: ${name}`)
        )
      );
      console.log(`Đã thêm ${newNames.length} báo cáo mới và gửi thông báo.`);
    } else {
      console.log('Không có báo cáo mới trên các trang kiểm tra.');
    }
  } catch (error) {
    if (error.response) {
      console.error('Lỗi từ API:', error.response.status, error.response.data);
    } else {
      console.error('Lỗi khi fetch dữ liệu:', error.message);
    }
  }
}

fetchAndExtractData();