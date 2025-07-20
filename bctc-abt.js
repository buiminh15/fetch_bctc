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
    const response = await client.get('https://aquatexbentre.com/cong/', {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'referer': 'https://aquatexbentre.com/',

        // Có thể bổ sung các header khác nếu server kiểm tra kỹ hơn
      },
      timeout: 100000
      // cookieJar sẽ tự động đính kèm cookies đã được cấp phát trước đó
    });

    const html = response.data;

    const $ = cheerio.load(html);
    const data = [];
    const currentYear = new Date().getFullYear().toString();
    $('.accordion > .accordion-item:first-child .ux-menu-link__link').each((_, element) => {
      const name = $(element).text().trim();
      const filterCondition = ['báo cáo tài chính', currentYear];
      if (filterCondition.every(c => name.toLocaleLowerCase().includes(c))) {
        data.push(name);
      }
    });
    console.log('📢 [bctc-abt.js:45]', data);
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
    process.exit(1);
  }
}

// Call the function to fetch and extract data
fetchAndExtractData();