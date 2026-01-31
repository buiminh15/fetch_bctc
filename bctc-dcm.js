const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

console.log('📢 [bctc-dcm.js:7]', 'running');

const axiosRetry = require('axios-retry');
const https = require('https');
const agent = new https.Agent({
  rejectUnauthorized: false
});

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
    const response = await axios.get('https://www.pvcfc.com.vn/bao-cao-tai-chinh', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000,
      httpsAgent: agent
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const names = [];

    $('.title.font-bold.transition-all.duration-300').each((_, el) => {
      const name = $(el).text().trim();
      names.push(name);
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.DCM);
    console.log('📢 [bctc-dcm.js:34]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.DCM);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của DCM::: ${name}`);
        })
      );
      console.log(`Đã thêm ${newNames.length} báo cáo mới và gửi thông báo.`);
    } else {
      console.log('Không có báo cáo mới.');
    }
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }
}

async function fetchAndExtractPublicInfo() {
  try {
    const response = await axios.get('https://www.pvcfc.com.vn/CBTT-khac-nam-2026', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000,
      httpsAgent: agent  // ← Add this line to bypass SSL verification
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const names = [];

    $('.title.font-bold.transition-all.duration-300').each((_, el) => {
      const name = $(el).text().trim();
      names.push(name);
    });
    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.DCM);
    console.log('📢 [bctc-dcm.js:88]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.DCM);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Công bố thông tin của DCM::: ${name}`);
        })
      );
      console.log(`Đã thêm ${newNames.length} báo cáo mới và gửi thông báo.`);
    } else {
      console.log('Không có báo cáo mới.');
    }
  } catch (error) {
    console.error('Error fetching HTML:', error);
    // Optionally remove process.exit(1) if you don't want to crash the script on error
  }
}

fetchAndExtractData();
fetchAndExtractPublicInfo();