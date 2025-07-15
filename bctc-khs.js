const axios = require('axios');
const cheerio = require('cheerio');
const { writeArchive, readArchive, trimArchive } = require('./readWriteUtils');
const { sendTelegramNotification } = require('./bot');
const he = require('he');

const archiveFile = 'khs_data.json';

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

    const data = [];
    $('.list-tin-tuc .tin-tuc').each((index, element) => {
      if (index < 10) { // Limit to the first 10 elements
        const dateRaw = $(element).find('.thoi-gian-tin').text().trim();
        const nameRaw = $(element).find('.mo-ta-tin').text().trim();
        const name = he.decode(nameRaw); // Nếu muốn decode
        const date = he.decode(dateRaw);
        data.push({
          date: date,
          name: name // hoặc name nếu decode
        });
      } else {
        return false; // Break the loop
      }
    });

    trimArchive(archiveFile);

    const existingData = readArchive(archiveFile);
    // Check if data[0] is already in the file
    const isDuplicate = existingData.some(item => item.date === data[0].date && item.name === data[0].name);

    if (!isDuplicate) {
      existingData.push(data[0]);
      writeArchive(existingData, archiveFile);
      await sendTelegramNotification(`Báo cáo tài chính của Công ty cổ phần Kiên Hùng::: ${data[0].name}`);
    } else {
      console.log('Data already exists:', data[0]);
    }
  } catch (error) {
    console.error('Error fetching HTML:', error);
  }
}

// Call the function to fetch and extract data
fetchAndExtractData();