const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const he = require('he');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

async function fetchAndExtractData() {
  try {
    const response = await axios.get('http://kihuseavn.com/tt-4/bao-cao-tai-chinh/', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const names = [];
    $('.list-tin-tuc .tin-tuc').each((index, element) => {
      if (index < 5) {
        const nameRaw = $(element).find('.mo-ta-tin').text().trim();
        const name = he.decode(nameRaw);
        // Ghép date và name để đảm bảo duy nhất
        names.push(`${name}`);
      } else {
        return false;
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.KHS);

    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.KHS);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của Công ty cổ phần Kiên Hùng ::: ${name}`);
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