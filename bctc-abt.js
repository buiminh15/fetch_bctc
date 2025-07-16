const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
const { wrapper } = require('axios-cookiejar-support');
const tough = require('tough-cookie');

// Tạo một cookie jar (bộ nhớ cookies)
const cookieJar = new tough.CookieJar();
const client = wrapper(axios.create({ jar: cookieJar, withCredentials: true }));

// const archiveFile = 'abt_data.json';

async function fetchAndExtractData() {
  try {
    await cookieJar.setCookie('client_30s=0.5206551040853635', 'https://aquatexbentre.com');
    await cookieJar.setCookie('wssplashchk=90c622ea4816aa2c6677ca55861b0679c1c8773c.1752636859.1', 'https://aquatexbentre.com');
    // Bước 1: Call mồi (nếu cần, ví dụ vào trang chủ để server set cookies)
    await client.get('https://aquatexbentre.com/');

    const response = await client.get('https://aquatexbentre.com/cong/', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'referer': 'https://aquatexbentre.com/',
        // Có thể bổ sung các header khác nếu server kiểm tra kỹ hơn
      }
      // cookieJar sẽ tự động đính kèm cookies đã được cấp phát trước đó
    });

    const html = response.data;
    require('fs').writeFileSync('response.html', response.data, 'utf8');

    const $ = cheerio.load(html);
    const data = [];
    $('.accordion > .accordion-item:first-child .ux-menu-link__link').each((index, element) => {
      if (index < 5) { // Limit to the first 10 elements
        const name = $(element).text().trim();
        data.push(name);
      } else {
        return false; // Break the loop after 10 elements
      }
    });
    const newFinancialReports = await filterNewNames(data, COMPANIES.ABT);
    if (newFinancialReports.length) {
      await insertBCTC(newFinancialReports, COMPANIES.ABT);
      await Promise.all(
        newFinancialReports.map(name =>
          sendTelegramNotification(`Báo cáo tài chính của Xuất nhập khẩu Thủy sản Bến Tre::: ${name}`)
        )
      );
    }
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }
}

// Call the function to fetch and extract data
fetchAndExtractData();