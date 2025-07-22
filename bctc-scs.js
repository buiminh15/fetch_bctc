const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
const https = require('https');
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
const agent = new https.Agent({
  rejectUnauthorized: false
});
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
    const response = await axios.get('https://scsc.vn/vn/info_category.aspx?IDCAT=36', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000,
      httpsAgent: agent
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Lấy tối đa 5 báo cáo mới nhất
    const names = [];
    $('a[href*="info_category_detail"]').each((_, element) => {
      const name = $(element).text().trim();
      // Ghép date và name để tăng tính duy nhất, hoặc custom lại nếu bạn muốn
      names.push(name);
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    console.log('📢 [bctc-hhp.js:47]', names);
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.SCS);
    console.log('📢 [bctc-hhp.js:37]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.SCS);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {

          return sendTelegramNotification(`Báo cáo tài chính của SCS::: ${name}`);
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
console.log('📢 [bctc-hhp.js:56]', 'running');
fetchAndExtractData();