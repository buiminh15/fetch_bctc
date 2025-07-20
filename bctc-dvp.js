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
    const response = await axios.get('https://dinhvuport.com.vn/vn/quan-he-co-dong/bao-cao-tai-chinh', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const currentYear = new Date().getFullYear().toString();
    const names = [];
    $('.col-ct.col1-tl a').each((_, element) => {

      const nameRaw = $(element).text().trim();
      const name = he.decode(nameRaw);
      const filterCondition = [currentYear, 'báo cáo tài chính'];
      if (filterCondition.every(y => name.toLocaleLowerCase().includes(y))) {
        names.push(`${name}`);
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    console.log('📢 [bctc-hnf.js:48]', names);
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.DVP);
    console.log('📢 [bctc-khs.js:42]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.DVP);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của Công ty cổ phần DVP ::: ${name}`);
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

async function fetchPrice() {
  try {
    const response = await axios.get('https://dinhvuport.com.vn/vn/serviceprice.html', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      },
      timeout: 60000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // const currentYear = new Date().getFullYear().toString();
    const names = [];
    $('.content-tab .content-inner').each((_, el) => {
      // Lấy thẻ <p> đầu tiên bên trong mỗi .content-inner
      const firstP = $(el).find('p').first();
      if (firstP.length) {
        const name = firstP.text().trim();
        names.push(name);
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    console.log('📢 [bctc-hnf.js:48]', names);
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.DVP);
    console.log('📢 [bctc-khs.js:42]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.DVP);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của Công ty cổ phần DVP ::: ${name}`);
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

fetchPrice();