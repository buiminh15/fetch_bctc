const axios = require('axios');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
console.log('📢 [bctc-ghc.js:5]', 'running');
async function fetchAndExtractData() {
  try {
    const response = await axios.post(
      'https://ghc.vn/api/QuanHeCoDong/LayDanhSachTinAsync',
      // Body POST (dạng object, axios sẽ tự chuyển JSON)
      {
        "DanhMuc": "QHCD_00154",
        "DanhMucCha": "QHCD_00030"
      },
      {
        headers: {
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Content-Type': 'application/json;charset=UTF-8',
          'Origin': 'https://ghc.vn',
          'Pragma': 'no-cache',
          'Referer': 'https://ghc.vn/quan-he-co-dong/qhcd-00005',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
          'Sec-GPC': '1',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
          'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          // Cookie truyền vào header, dạng string
          'Cookie': 'language=vi-vn; BNES_language=KnsJ7JWpVje71xG5RvqdUcsw1hi2BTHzJuwCm3DMvx2kGzPlVKbOW0SfgLca93n3EgKOfvPlWkE='
        }
      }
    );

    // Kiểm tra response, thường sẽ có dạng { data: [...] }
    const items = response.data.Result.Data.Items || [];
    // Bạn cần xem cấu trúc thực tế, có thể là response.data hoặc response.data.data
    // Lấy tên báo cáo (ví dụ: item.TieuDe hoặc item.title tuỳ thuộc vào API)
    // In thử ra 1 item để biết field nào đúng:
    const names = items.map(item => item.TieuDe && item.TieuDe.trim()).filter(Boolean);

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.GHC);

    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.GHC);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name =>
          sendTelegramNotification(`Báo cáo tài chính của GHC::: ${name}`)
        )
      );
      console.log(`Đã thêm ${newNames.length} báo cáo mới và gửi thông báo.`);
    } else {
      console.log('Không có báo cáo mới.');
    }
  } catch (error) {
    console.error('Error fetching API:', error.message);
    process.exit(1);
  }
}

fetchAndExtractData();