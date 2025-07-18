const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
const axiosRetry = require('axios-retry');

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });
console.log('📢 [bctc-ast.js:7]', 'running');
async function fetchAndExtractData() {
  try {
    // 1. Lấy trang danh sách báo cáo mới nhất
    const responsePage = await axios.get('https://tasecoairs.vn/bao-cao-tai-chinh.html', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const _$ = cheerio.load(responsePage.data);
    const firstElement = _$('.main_list_news > ul > li:first-child > .panel_img');
    const href = firstElement.attr('href');
    if (!href) {
      console.log('Không tìm thấy link chi tiết báo cáo!');
      return;
    }

    // 2. Lấy trang chi tiết báo cáo
    const response = await axios.get(href, {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }
    });

    const $ = cheerio.load(response.data);
    // 3. Lấy danh sách tất cả các báo cáo tài chính mới nhất (có thể lấy nhiều hơn 1 nếu muốn)
    const names = [];
    $('.table a').each((index, element) => {
      const url = $(element).attr('href');
      if (url) {
        // Lấy tên file báo cáo (tuỳ cấu trúc url thực tế)
        const matches = url.match(/\/files\/(\d{8})/);
        const date = matches ? matches[1] : '';
        const name = url.split('-')[2]; // Có thể điều chỉnh nếu không đúng
        if (name) {
          names.push(`${date}_${name}`); // Ghép để tăng tính duy nhất nếu cần
        }
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    console.log('📢 [bctc-ast.js:54]', names);
    // 4. Lọc ra danh sách báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.AST);
    console.log('📢 [bctc-ast.js:57]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.AST);

      // Gửi Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name =>
          sendTelegramNotification(`Báo cáo tài chính của AST::: ${name}`)
        )
      );
      console.log(`Đã thêm ${newNames.length} báo cáo mới và gửi thông báo.`);
    } else {
      console.log('Không có báo cáo mới.');
    }
  } catch (error) {

    console.error('Error fetching HTML:', error);
    process.exit(1);
  }
}

fetchAndExtractData();