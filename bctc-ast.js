const axios = require('axios');
const cheerio = require('cheerio');
const { writeArchive, readArchive, trimArchive } = require('./readWriteUtils');
const { sendTelegramNotification } = require('./bot');

const archiveFile = 'ast_data.json';

async function fetchAndExtractData() {
  try {
    const responsePage = await axios.get('https://tasecoairs.vn/bao-cao-tai-chinh.html', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }
    });

    const htmlPage = responsePage.data;
    const _$ = cheerio.load(htmlPage);

    const element = _$('.main_list_news > ul > li:first-child > .panel_img');
    const href = element.attr('href');

    const response = await axios.get(href, {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const data = [];

    $('.table a').each((index, element) => {
      const url = $(element).attr('href');
      if (url) {
        // Tách phần file name từ url
        const matches = url.match(/\/files\/(\d{8})/);
        const date = matches ? matches[1] : '';
        data.push({
          date: date,
          name: url.split('-')[2]
        });
      }
    });

    trimArchive(archiveFile);

    const existingData = readArchive(archiveFile);
    // Check if data[0] is already in the file
    const isDuplicate = existingData.some(item => item.date === data[0].date && item.name === data[0].name);

    if (!isDuplicate) {
      existingData.push(data[0]);
      writeArchive(existingData, archiveFile);
      console.log('New data added:', data[0]);
      await sendTelegramNotification(`Báo cáo tài chính của AST::: ${data[0].name}`);
    } else {
      console.log('Data already exists:', data[0]);
    }
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }
}

// Call the function to fetch and extract data
fetchAndExtractData();