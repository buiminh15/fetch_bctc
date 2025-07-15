const axios = require('axios');

const TELEGRAM_BOT_TOKEN = '8199261797:AAHOiF2mYyTsrRXupEE2vxnS5XnoaQxZ9XY';
const TELEGRAM_CHAT_ID = '5125599803';

async function sendTelegramNotification(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      text: message,
      chat_id: TELEGRAM_CHAT_ID
    });
    console.log('Notification sent to Telegram');
  } catch (error) {
    console.error('Error sending notification to Telegram:', error);
  }
}

module.exports = { sendTelegramNotification };
