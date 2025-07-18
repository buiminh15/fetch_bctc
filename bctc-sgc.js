const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

const axiosRetry = require('axios-retry');

axiosRetry.default(axios, { retries: 3, retryDelay: axiosRetry.exponentialDelay });

async function fetchAndExtractData() {
  try {
    const response = await axios.get('https://sagiang.com.vn/thong-tin-co-dong', {
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

    $('.item-post').each(function () {
      // Lấy thuộc tính datetime
      const timeTag = $(this).find('time');
      const datetime = timeTag.attr('datetime'); // VD: '2025-03-25'
      // Hoặc lấy text đầy đủ (bao gồm icon): timeTag.text()
      // Lấy năm từ thuộc tính datetime
      if (datetime && datetime.startsWith(currentYear)) {
        // Lấy <a> đầu tiên trong .item-post
        const aTag = $(this).find('a').first();
        names.push(aTag.text().trim());
      }
    });
    console.log('📢 [bctc-sgc.js:37]', names);
    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.SGC);
    console.log('📢 [bctc-sgc.js:46]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.SGC);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của Sa Giang SGC :::  ${name}`);
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