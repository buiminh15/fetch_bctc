const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

console.log('📢 [bctc-cdn.js:7]', 'running');

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
    const response = await axios.get('https://danangport.com/bao-cao-dinh-ky-bat-thuong/', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Lấy tối đa 5 báo cáo mới nhất
    const names = [];
    $('tbody tr').each((index, element) => {
      if (index < 5) {
        const name = $(element).find('td').eq(1).text().trim();
        // Ghép date và name để tăng tính duy nhất, hoặc custom lại nếu bạn muốn
        names.push(`${name}`);
      } else {
        return false; // Break the loop
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.CDN);
    console.log('📢 [bctc-cdn.js:46]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.CDN);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của Cảng Đà Nẵng ::: ${name}`);
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


async function fetchServicePrice() {
  // Website: https://danangport.com/dich-vu-khach-hang/bieu-cuoc-cang-da-nang-va-quyet-dinh-ban-hanh-ve-gia/
  try {
    const response = await axios.get('https://danangport.com/dich-vu-khach-hang/bieu-cuoc-cang-da-nang-va-quyet-dinh-ban-hanh-ve-gia/', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Lấy tối đa 5 báo cáo mới nhất
    const names = [];
    $('tbody tr td:nth-child(2) h4 span').each((_, element) => {
      const name = $(element).text().trim();
      // Ghép date và name để tăng tính duy nhất, hoặc custom lại nếu bạn muốn
      names.push(`${name}`);
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    console.log('📢 [bctc-cdn.js:99]', names);
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.CDN);
    console.log('📢 [bctc-cdn.js:46]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.CDN);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Biểu giá của Cảng Đà Nẵng ::: ${name}`);
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
fetchServicePrice();
fetchAndExtractData();