require('dotenv').config();
const { serve } = require('@hono/node-server');
const { db } = require('./db.js');
const appWorker = require('./app.js');

const port = parseInt(process.env.PORT || '3002', 10);

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbznmzNY0ewVAmsqz5NH-ulHb_YyI9JNmNwwCILOWSDTawDn9tEXSy_l3b3Vw2gHHwIJ-g/exec';

let activeGasUrl = process.env.GAS_WEB_APP_URL || DEFAULT_GAS_URL;

// Satukan environment variables dari .env dengan DB dan binding pendukung
const env = {
  ...process.env,
  DB: db,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@awanpulsa.web.id',
  BACKUP_PASSWORD: process.env.BACKUP_PASSWORD || 'AwanPulsa2026Secure!',
  GAS_WEB_APP_URL: activeGasUrl,
  GAS_SECRET_TOKEN: process.env.GAS_SECRET_TOKEN || 'RahasiaVPNtuban123!',
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || 'sk-b15cc5eb16174519a61761b8a0d9011e',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyA40MjBzjfrz5USxbksV61M-B6aMc3NP_0',
  AI: {
    run: async (model, opts) => {
      console.warn('[AI] Cloudflare Workers AI tidak aktif di VPS. Mengalihkan ke DeepSeek AI.');
      return { response: 'Layanan AI dialihkan ke DeepSeek AI.' };
    }
  },
  BACKUP_BUCKET: null
};

console.log('-------------------------------------------------');
console.log('Memulai Server AwanPulsa...');
console.log('Database terhubung: SQLite (awanpulsa.db)');
console.log('Admin Email:', env.ADMIN_EMAIL);
console.log('GAS Mailer URL:', env.GAS_WEB_APP_URL);
console.log('-------------------------------------------------');

const server = serve({
  fetch: (request) => {
    // Context mock untuk async waitUntil di Node.js
    const ctx = {
      waitUntil: (promise) => {
        Promise.resolve(promise).catch((err) => {
          console.error('[Background Task Error]:', err.message);
        });
      }
    };
    return appWorker.fetch(request, env, ctx);
  },
  port: port
}, (info) => {
  console.log('=================================================');
  console.log(`🚀 AWANPULSA SERVER BERHASIL AKTIF!`);
  console.log(`🌐 Akses Web: http://localhost:${info.port}`);
  console.log(`🕒 Waktu Server: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB`);
  console.log('=================================================');
});

// Scheduler background otomatis untuk auto-backup Telegram & maintenance berkala di VPS
const runScheduledTasks = async () => {
  try {
    const ctx = {
      waitUntil: (promise) => Promise.resolve(promise).catch(err => console.error('[Background Task Error]:', err.message))
    };
    if (typeof appWorker.scheduled === 'function') {
      await appWorker.scheduled({ scheduledTime: Date.now(), cron: '* * * * *' }, env, ctx);
    }
  } catch (err) {
    console.error('[Background Scheduler Error]:', err.message);
  }
};

// Jalankan 10 detik setelah startup, lalu rutin setiap 60 detik
setTimeout(runScheduledTasks, 10000);
const cronInterval = setInterval(runScheduledTasks, 60 * 1000);

// Penanganan graceful shutdown
process.on('SIGINT', () => {
  console.log('\nMenghentikan server AwanPulsa...');
  clearInterval(cronInterval);
  server.close(() => {
    console.log('Server berhasil dinonaktifkan.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nMenerima SIGTERM, menghentikan server...');
  clearInterval(cronInterval);
  server.close(() => {
    process.exit(0);
  });
});
