const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

async function fetchAndExtractData() {
  try {
    const response = await axios.get('https://sags.vn/announcements.html', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const names = [];

    $('#myPillContent .show.active div').each((index, element) => {
      if (index < 5) {
        const name = $(element).find('a.investor-link').text().trim();
        const date = name.substring(0, 8);
        names.push(`${date}__${name}`);
      } else {
        return false;
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.SGN);

    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.SGN);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          const [date, ...rest] = name.split('__');
          const realName = rest.join('__');
          return sendTelegramNotification(`Báo cáo tài chính của Phục vụ mặt đất Sài Gòn (${date})::: ${realName}`);
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

fetchAndExtractData();