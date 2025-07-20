const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
const he = require('he');
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
    const response = await axios.get('http://dongnai-port.com/Pages/bao-cao-tai-chinh-qua-cac-nam.aspx', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const currentYear = new Date().getFullYear().toString();
    // Lấy tối đa 5 báo cáo mới nhất
    const names = [];
    $('td a').each((_, element) => {
      const nameRaw = $(element).text().trim();
      const name = he.decode(nameRaw);

      const filterCondition = [currentYear, 'báo cáo tài chính'];
      if (filterCondition.every(y => name.trim().toLocaleLowerCase().includes(y))) {
        names.push(`${name}`);
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    console.log('📢 [bctc-mbs.js:50]', names);
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.PDN);
    console.log('📢 [bctc-cdn.js:46]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.PDN);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của PDN ::: ${name}`);
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


async function fetchPrice1() {
  // website: http://dongnai-port.com/Pages/bieu-cuoc-dich-vu-th.aspx?TopicID=1
  try {
    const response = await axios.get('http://dongnai-port.com/Pages/bieu-cuoc-dich-vu-th.aspx?TopicID=1', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const currentYear = new Date().getFullYear().toString();
    // Lấy tối đa 5 báo cáo mới nhất
    const names = [];
    $('i span').each((_, element) => {
      const nameRaw = $(element).text().trim();
      const name = he.decode(nameRaw);

      const filterCondition = [currentYear];
      if (filterCondition.every(y => name.trim().toLocaleLowerCase().includes(y))) {
        names.push(`${name}`);
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    console.log('📢 [bctc-mbs.js:50]', names);
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.PDN);
    console.log('📢 [bctc-cdn.js:46]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.PDN);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Biểu giá Ngành Tổng hợp của PDN ::: ${name}`);
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


async function fetchPrice2() {
  // website: http://dongnai-port.com/Pages/bieu-cuoc-dich-vu-th.aspx?TopicID=1
  try {
    const response = await axios.get('http://dongnai-port.com/pages/bieu-cuoc-dich-vu-container.aspx?TopicID=2', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const currentYear = new Date().getFullYear().toString();
    // Lấy tối đa 5 báo cáo mới nhất
    const names = [];
    $('i span').each((_, element) => {
      const nameRaw = $(element).text().trim();
      const name = he.decode(nameRaw);

      const filterCondition = [currentYear];
      if (filterCondition.every(y => name.trim().toLocaleLowerCase().includes(y))) {
        names.push(`${name}`);
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    console.log('📢 [bctc-mbs.js:50]', names);
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.PDN);
    console.log('📢 [bctc-cdn.js:46]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.PDN);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Biểu giá Ngành Container của PDN ::: ${name}`);
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

fetchPrice1();
fetchPrice2();
fetchAndExtractData();