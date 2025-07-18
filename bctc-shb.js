const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const he = require('he');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
const axiosRetry = require('axios-retry');

axiosRetry.default(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry nếu là network error, request idempotent, hoặc timeout
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});
async function fetchAndExtractData() {
  try {
    const response = await axios.get('https://www.shb.com.vn/category/nha-dau-tu/bao-cao-tai-chinh/', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const currentYear = new Date().getFullYear();
    const names = [];
    $('.title').each((index, element) => {
      if (index < 5) {
        const nameRaw = $(element).text().trim();
        const name = he.decode(nameRaw);
        if (name.includes(`năm ${currentYear}`)) {
          // Ghép date và name để đảm bảo duy nhất
          names.push(`${name}`);
        }
      } else {
        return false;
      }
    });
    console.log('📢 [bctc-shb.js:36]', names);
    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.SHB);
    console.log('📢 [bctc-khs.js:42]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.SHB);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của Ngân Hàng SHB ::: ${name}`);
        })
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
console.log('📢 [bctc-khs.js:57]', 'running');
fetchAndExtractData();