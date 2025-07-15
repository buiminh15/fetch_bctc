const axios = require('axios');
const cheerio = require('cheerio');
const { writeArchive, readArchive, trimArchive } = require('./readWriteUtils');
const { sendTelegramNotification } = require('./bot');

const archiveFile = 'abt_data.json';

async function fetchAndExtractData() {
  try {
    const response = await axios.get('https://aquatexbentre.com/cong/', {
      headers: {
        'accept': 'text/html',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    const data = [];

    $('.accordion > .accordion-item:first-child .ux-menu-link__link').each((index, element) => {
      if (index < 5) { // Limit to the first 10 elements
        const name = $(element).text().trim();

        // Lấy 8 ký tự đầu tiên làm date
        const date = name.substring(0, 10).replaceAll('/', '')
          ;

        data.push({ date, name });
      } else {
        return false; // Break the loop after 10 elements
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
      await sendTelegramNotification(`Báo cáo tài chính của Xuất nhập khẩu Thủy sản Bến Tre::: ${data[0].name}`);
    } else {
      console.log('Data already exists:', data[0]);
    }
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }
}

// Call the function to fetch and extract data
fetchAndExtractData();