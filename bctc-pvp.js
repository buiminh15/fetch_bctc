const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');

async function fetchAndExtractData() {
  try {
    const response = await axios.get('https://pacificshipping.vn/bao-cao-tai-chinh', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const names = [];

    const currentYear = new Date().getFullYear();

    const lastDiv = $(`#list${currentYear}`);

    // Lấy các thẻ a trong class 'title' của div này
    lastDiv.find('.title a').each((index, el) => {
      if (index < 3) {
        const name = $(el).text().trim();
        names.push(name);
      }
    });

    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }
    // Lọc ra các báo cáo chưa có trong DB
    const newNames = await filterNewNames(names, COMPANIES.PVP);

    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.PVP);

      // Gửi thông báo Telegram cho từng báo cáo mới
      await Promise.all(
        newNames.map(name => {
          return sendTelegramNotification(`Báo cáo tài chính của CÔNG TY CỔ PHẦN VẬN TẢI DẦU KHÍ THÁI BÌNH DƯƠNG
     - PVP ::: ${name}`);
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