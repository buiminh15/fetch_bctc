const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

const axiosRetry = require('axios-retry');

axiosRetry(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

async function fetchAndExtractData() {
  try {
    const response = await axios.get('https://hhpglobaljsc.com/quan-he-co-dong-2/', {
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
    $('[data-id="8f8e467"] a').each((index, element) => {
      if (index < 3) {
        const name = $(element).text().trim();
        // Ghép date và name để tăng tính duy nhất, hoặc custom lại nếu bạn muốn
        names.push(name);
      } else {
        return false; // Break the loop
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.HHP);
    console.log('📢 [bctc-hhp.js:37]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.HHP);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {

          return sendTelegramNotification(`Báo cáo tài chính của HHP::: ${name}`);
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