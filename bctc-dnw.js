const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
const fs = require('fs');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');

// Tạo một cookie jar (bộ nhớ cookies)
const cookieJar = new tough.CookieJar();
const client = wrapper(axios.create({ jar: cookieJar, withCredentials: true }));

async function fetchAndExtractData() {
  try {
    await cookieJar.setCookie(
      'wssplashchk=f040ad9c1a7a85e0ee3406e1c373b29e83ed2e1f.1752656105.1',
      'https://dowaco.vn'
    );
    const response = await client.get('https://dowaco.vn/quan-he-co-dong/', {
      headers: {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.7',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        'priority': 'u=0, i',
        'referer': 'https://dowaco.vn/',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Brave";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-user': '?1',
        'sec-gpc': '1',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
      }
      // Không cần truyền cookie trong headers, cookieJar sẽ tự động đính kèm!
    });

    const html = response.data;
    const $ = cheerio.load(html);
    fs.writeFileSync('response.html', response.data, 'utf8');
    const names = [];

    const currentYear = new Date().getFullYear();

    $('#bao-cao-tai-chinh .wpb_wrapper').each((_, wrapper) => {
      // Kiểm tra có nút năm đúng không
      const yearBtn = $(wrapper).find('.btn.btn-default').first();
      const yearText = yearBtn.text().replace(/[^\d]/g, ''); // Lấy số năm
      if (yearText !== currentYear.toString()) return; // Không đúng năm thì bỏ qua

      // Block bài viết thường là sibling sau wrapper này
      let $block = $(wrapper).nextAll('.jeg_postblock_28').first();
      if (!$block.length) $block = $(wrapper).find('.jeg_postblock_28').first(); // fallback nếu là con

      // Tìm các bài viết
      $block.find('.jeg_posts article .jeg_post_title a').each((_, a) => {
        const name = $(a).text().trim();
        names.push(name);
      });
    });

    console.log(names);
    // if (names.length === 0) {
    //   console.log('Không tìm thấy báo cáo tài chính nào.');
    //   return;
    // }

    // // Lọc ra các báo cáo chưa có trong DB
    // const newNames = await filterNewNames(names, COMPANIES.DNW);

    // if (newNames.length) {
    //   await insertBCTC(newNames, COMPANIES.DNW);

    //   // Gửi thông báo Telegram cho từng báo cáo mới
    //   await Promise.all(
    //     newNames.map(name => {
    //       return sendTelegramNotification(`Báo cáo tài chính của DNW::: ${name}`);
    //     })
    //   );
    //   console.log(`Đã thêm ${newNames.length} báo cáo mới và gửi thông báo.`);
    // } else {
    //   console.log('Không có báo cáo mới.');
    // }
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }
}


fetchAndExtractData();
