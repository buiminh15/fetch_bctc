const axios = require('axios');
const cheerio = require('cheerio');
const { sendTelegramNotification } = require('./bot');
const { COMPANIES } = require('./constants/companies');
const { insertBCTC, filterNewNames } = require('./bctc');
const axiosRetry = require('axios-retry');
const he = require('he');

axiosRetry.default(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Retry nếu là network error, request idempotent, hoặc timeout
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});
console.log('📢 [bctc-bsr.js:7]', 'running');
async function fetchAndExtractDataFromAPI() {
  try {
    const url = 'https://ezsearch.fpts.com.vn/Services/EzData/ProcessLoadRuntime.aspx?s=266&cGroup=News&cPath=Services/EzData/CompanyNews&newscat=1';

    // Nếu cần gửi cookie, thêm header 'Cookie'
    const headers = {
      'Accept': '*/*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      'Referer': 'https://ezsearch.fpts.com.vn/Services/EzData/default2.aspx?s=266'
    };

    const data = 'ProcessLoadRuntime.aspx?s=266&cGroup=News&cPath=Services/EzData/CompanyNews&newscat=1';

    const response = await axios.post(url, data, { headers, timeout: 60000 });

    // API trả về dạng JSON (hoặc có thể là XML, tuỳ API)
    // Nếu là JSON:
    const html = response.data;
    const $ = cheerio.load(html);

    const names = [];

    const currentYear = new Date().getFullYear().toString();
    $('div[style*="border-bottom"]').each((_, div) => {
      const title = $(div).find('a.NewsManagement_Title span.text').text().trim();
      // Lọc theo tiêu đề có chứa "Báo cáo tài chính" và năm hiện tại
      if (
        title.toLowerCase().includes('báo cáo tài chính') &&
        title.includes(currentYear)
      ) {
        names.push(he.decode(title));
      }
    });


    console.log('📢 [bctc-mbb.js:57]', names);
    if (names.length === 0) {
      console.log('Không tìm thấy báo cáo tài chính nào.');
      return;
    }

    // Phần xử lý tiếp theo giữ nguyên như code cũ:
    const newNames = await filterNewNames(names, COMPANIES.ANV);
    console.log('📢 [bctc-mbb.js:65]', newNames);
    if (newNames.length) {
      await insertBCTC(newNames, COMPANIES.ANV);
      await Promise.all(
        newNames.map(name => sendTelegramNotification(`Báo cáo tài chính của ANV::: ${name}`))
      );
      console.log(`Đã thêm ${newNames.length} báo cáo mới và gửi thông báo.`);
    } else {
      console.log('Không có báo cáo mới.');
    }
  } catch (error) {
    console.error('Error fetching API:', error);
    process.exit(1);
  }
}

fetchAndExtractDataFromAPI();