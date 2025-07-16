const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

async function fetchAndExtractData() {
  try {
    const response = await axios.get('https://danangport.com/bao-cao-dinh-ky-bat-thuong/', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Lấy tối đa 5 báo cáo mới nhất
    const names = [];
    $('tbody tr').each((index, element) => {
      if (index < 5) {
        const date = $(element).find('td').eq(0).text().trim();
        const name = $(element).find('td').eq(1).text().trim();
        // Ghép date và name để tăng tính duy nhất, hoặc custom lại nếu bạn muốn
        names.push(`${date}__${name}`);
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

    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.CDN);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          // Tách lại date và name để hiển thị đẹp
          const [date, ...rest] = name.split('__');
          const realName = rest.join('__');
          return sendTelegramNotification(`Báo cáo tài chính của Cảng Đà Nẵng (${date})::: ${realName}`);
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