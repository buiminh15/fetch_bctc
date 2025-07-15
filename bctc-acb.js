const axios = require('axios');
const { writeArchive, readArchive, trimArchive } = require('./readWriteUtils');
const { sendTelegramNotification } = require('./bot');

const archiveFile = 'acb_data.json';

const YEAR_ID = 1541; // ID danh mục cho năm, cần cập nhật nếu thay đổi
const PAGES = [3, 2, 1]; // Các trang cần kiểm tra, theo thứ tự ưu tiên

async function fetchAndExtractData() {
  try {
    let dataFound = false;

    // 1. Lặp qua các trang theo thứ tự ưu tiên đã định nghĩa
    for (const page of PAGES) {
      console.log(`Đang kiểm tra dữ liệu trên trang ${page}...`);

      // 2. Gọi API với page động
      const response = await axios.get(`https://acb.com.vn/api/front/v1/posts?search[categories.category_id:in]=${YEAR_ID}&search[is_active:in]=1&page=${page}&limit=5`, {
        headers: {
          'accept': 'application/json',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        }
      });

      // Lưu ý: Giả sử dữ liệu trả về nằm trong response.data.data.data
      // Bạn cần kiểm tra cấu trúc API thực tế để chắc chắn đường dẫn này đúng
      const posts = response?.data?.data;
      // 3. Nếu trang hiện tại có dữ liệu (posts là mảng và có phần tử)
      if (posts && posts.length > 0) {
        console.log(`Tìm thấy ${posts.length} mục trên trang ${page}. Bắt đầu xử lý...`);
        dataFound = true;

        const existingData = readArchive(archiveFile);
        // Tạo một Set chứa các ID đã có để kiểm tra trùng lặp hiệu quả
        const existingIds = new Set(existingData.map(item => item.id));

        let newItemsCount = 0;

        // 4. Xử lý từng mục dữ liệu lấy được từ API
        // Lặp ngược để đảm bảo các mục cũ hơn được thêm vào trước nếu có nhiều mục mới
        for (let i = posts.length - 1; i >= 0; i--) {
          const post = posts[i];

          // Lưu ý: Giả sử mỗi 'post' có 'id' và 'title'
          // Bạn cần điều chỉnh cho phù hợp với dữ liệu API thực tế
          const newItem = {
            id: post.id,
            name: post.title,
            date: post.created_at // Ví dụ: lấy thêm ngày đăng
          };

          // Kiểm tra xem mục này đã tồn tại chưa
          if (!existingIds.has(newItem.id)) {
            existingData.push(newItem); // Thêm mục mới vào mảng
            newItemsCount++;
            console.log('Dữ liệu mới cần thêm:', newItem.name);
            // Gửi thông báo cho từng mục mới
            await sendTelegramNotification(`Báo cáo mới từ ACB: ${newItem.name}`);
          }
        }

        if (newItemsCount > 0) {
          console.log(`Tổng cộng có ${newItemsCount} mục mới. Đang lưu vào file...`);
          // Ghi lại toàn bộ dữ liệu đã cập nhật vào file
          writeArchive(existingData, archiveFile);
          // Cắt bớt file sau khi đã ghi để duy trì kích thước
          trimArchive(archiveFile, 50, 40); // Ví dụ: giữ lại 40 mục mới nhất nếu vượt 50
        } else {
          console.log('Không có mục nào mới trên trang này so với dữ liệu đã lưu.');
        }

        // 5. Đã tìm thấy và xử lý dữ liệu, thoát khỏi vòng lặp
        break;
      } else {
        // Nếu không có dữ liệu, thông báo và vòng lặp sẽ tự động chuyển sang trang tiếp theo
        console.log(`Trang ${page} không có dữ liệu.`);
      }
    }

    if (!dataFound) {
      console.log('Không tìm thấy dữ liệu trên bất kỳ trang nào.');
    }

  } catch (error) {
    if (error.response) {
      console.error('Lỗi từ API:', error.response.status, error.response.data);
    } else {
      console.error('Lỗi khi fetch dữ liệu:', error.message);
    }
  }
}

// Call the function to fetch and extract data
fetchAndExtractData();