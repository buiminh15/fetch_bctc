const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
const he = require('he');

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
    const response = await axios.get('https://viconship.com/vi/co-dong', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });
    const html = response.data;
    const $ = cheerio.load(html);
    const names = [];
    const currentYear = new Date().getFullYear();
    $('.title_doc b').each((index, element) => {
      const nameRaw = $(element).text().trim();
      const name = he.decode(nameRaw);

      if (name.includes(currentYear)) {
        names.push(`${name}`);
      }
    });
    console.log('📢 [bctc-sgc.js:37]', names);
    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.VSC);
    console.log('📢 [bctc-sgc.js:46]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.VSC);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của VSC :::  ${name}`);
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
console.log('📢 [bctc-sgn.js:58]', 'running');
fetchAndExtractData();