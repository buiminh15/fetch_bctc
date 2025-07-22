const axios = require('axios');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
console.log('📢 [bctc-geg.js:5]', 'running');

const axiosRetry = require('axios-retry');

axiosRetry.default(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry nếu là network error, request idempotent, hoặc timeout
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});

const url = 'https://api.thepangroup.vn/';
const data = {
  m: "document",
  fn: "list",
  languageCode: "vi-VN",
  zoneId: 84
};

const headers = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.6',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
  'Content-Type': 'application/json;charset=UTF-8',
  'Namespace': 'Web',
  'Origin': 'https://thepangroup.vn',
  'Pragma': 'no-cache',
  'Referer': 'https://thepangroup.vn/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
  'Sec-GPC': '1',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"'
};

async function fetchAndExtractData() {
  try {
    const response = await axios.post(url, data, { headers });

    const currentYear = 2025;
    const zoneId = 86;

    let names = [];
    const res = response.data.data || [];
    // Tìm zoneId đúng
    const zone = res.find(z => z.zoneId === zoneId);
    if (zone && zone.documents) {
      zone.documents.forEach(doc => {
        if (doc.year === currentYear && Array.isArray(doc.documents)) {
          doc.documents.forEach(item => {
            if (item.year === currentYear) {
              names.push(item.name);
            }
          });
        }
      });
    }
    console.log('📢 [bctc-pan.js:70]', names);
    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.PAN);
    console.log('📢 [bctc-geg.js:44]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.PAN);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name =>
          sendTelegramNotification(`Báo cáo tài chính của PAN::: ${name}`)
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