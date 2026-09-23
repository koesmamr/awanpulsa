var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker.js
var __defProp2 = Object.defineProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __defProp22 = Object.defineProperty;
var __name22 = /* @__PURE__ */ __name2((target, value) => __defProp22(target, "name", { value, configurable: true }), "__name");
var __defProp222 = Object.defineProperty;
var __name222 = /* @__PURE__ */ __name22((target, value) => __defProp222(target, "name", { value, configurable: true }), "__name");
const { handleTokoGorontaloRoutes, renderPPOBContent, renderTokoGorontaloAdminModal, syncMissingPPOBInbox } = require('./services/tokogorontalo_routes.js');
var cachedAppSettings = null;
var cachedAppSettingsTime = 0;
var CACHE_TTL = 3e5;
function checkIsSuperAdmin(userOrEmail, env) {
  if (!userOrEmail) return false;
  if (typeof userOrEmail === "object") {
    if (userOrEmail.is_admin === 2 || userOrEmail.is_admin === "2") {
      return true;
    }
  }
  const email = (typeof userOrEmail === "string" ? userOrEmail : (userOrEmail.email || "")).toLowerCase().trim();
  const configuredAdmin = ((env && env.ADMIN_EMAIL) || (typeof process !== "undefined" && process.env && process.env.ADMIN_EMAIL) || "syamsul18782@gmail.com").toLowerCase().trim();
  if (email === configuredAdmin || email === "syamsul18782@gmail.com") return true;
  try {
    const rawDb = (env && env.DB && env.DB.rawDb) || (require('./db.js').rawDb);
    if (rawDb && email) {
      const row = rawDb.prepare('SELECT is_admin FROM users WHERE LOWER(email) = ?').get(email);
      if (row && (row.is_admin === 2 || row.is_admin === '2')) return true;
    }
  } catch (e) {}
  return false;
}

function checkIsAdmin(userOrEmail, env) {
  if (!userOrEmail) return false;
  if (checkIsSuperAdmin(userOrEmail, env)) return true;
  if (typeof userOrEmail === "object") {
    if (userOrEmail.is_admin === 1 || userOrEmail.is_admin === "1" || userOrEmail.is_admin === 2 || userOrEmail.is_admin === "2" || userOrEmail.is_admin === true) {
      return true;
    }
  }
  const email = (typeof userOrEmail === "string" ? userOrEmail : (userOrEmail.email || "")).toLowerCase().trim();
  try {
    const rawDb = (env && env.DB && env.DB.rawDb) || (require('./db.js').rawDb);
    if (rawDb && email) {
      const row = rawDb.prepare('SELECT is_admin FROM users WHERE LOWER(email) = ?').get(email);
      if (row && (row.is_admin === 1 || row.is_admin === '1' || row.is_admin === 2 || row.is_admin === '2' || row.is_admin === true)) return true;
    }
  } catch (e) {}
  return false;
}

const isSuperAdmin = checkIsSuperAdmin;
const isAdmin = checkIsAdmin;
async function getAppSettings(env) {
  const now = Date.now();
  if (cachedAppSettings && now - cachedAppSettingsTime < CACHE_TTL) {
    return cachedAppSettings;
  }
  const defaultSettings = {
    price_per_day: 233,
    kmsp_markup: 3e3,
    telegram_bot_token: (env && env.TELEGRAM_BOT_TOKEN) || "",
    telegram_channel_id: (env && env.TELEGRAM_CHANNEL_ID) || "",
    telegram_admin_id: (env && env.TELEGRAM_ADMIN_ID) || "",
    telegram_group_thread_id: (env && env.TELEGRAM_GROUP_THREAD_ID) || "",
    auto_backup_frequency: 24,
    maintenance_mode: false,
    ai_chat_active: true,
    ai_provider: "deepseek",
    ai_hourly_limit: 10,
    payment_tripay: false,
    payment_violet: false,
    payment_qris_manual: true,
    payment_manual: true,
    payment_shopeepay: false,
    payment_gopay: false,
    manual_bsi_rek: "7293609009",
    manual_bsi_name: "sutroni soga",
    manual_dana_rek: "08979527685",
    manual_dana_name: "sutroni soga",
    manual_shopee_rek: "08979527685",
    manual_shopee_name: "hasnasyukur",
    autogopay_api_key: (env && env.AUTOGOPAY_API_KEY) || "agp_1bae647d0c0c25307757c1a60afa7b06256c90dbefb4650f3f7e43a03d5c2a7d",
    shopeepay_qris_static: (env && env.SHOPEEPAY_QRIS_STATIC) || "00020101021126610016ID.CO.SHOPEE.WWW01189360091800205167330208205167330303UMI51440014ID.CO.QRIS.WWW0215ID10221779795590303UMI5204539953033605802ID5912konter pulsa6009GORONTALO61059612162070703A016304C60C",
    gopay_qris_static: (env && env.GOPAY_QRIS_STATIC) || "00020101021126610014COM.GO-JEK.WWW01189360091432182828890210G2182828890303UMI51440014ID.CO.QRIS.WWW0215ID10265930588070303UMI5204481453033605802ID5922konter pulsa, SIPATANA6009GORONTALO61059612162140703A0111036216304E906",
    cendrawasih_api_key: (env && env.CENDRAWASIH_API_KEY) || "CEN-8B894F33-5EB9-44F3-B986-56D919742B71",
    servers: [{ id: "srv1", name: "Server SG Premium 1", host: "http://103.x.x.x", key: "API_KEY_ANDA_DISINI" }]
  };
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'app'").first("value");
    if (row) {
      const parsed = JSON.parse(row);
      cachedAppSettings = Object.assign({}, defaultSettings, parsed);
      for (const k of Object.keys(defaultSettings)) {
        if (cachedAppSettings[k] === undefined || cachedAppSettings[k] === null) {
          cachedAppSettings[k] = defaultSettings[k];
        }
      }
      if (!cachedAppSettings.ai_provider || cachedAppSettings.ai_provider === "cloudflare") {
        cachedAppSettings.ai_provider = "deepseek";
      }
      if (cachedAppSettings.ai_chat_active === undefined) {
        cachedAppSettings.ai_chat_active = true;
      }
      if (!cachedAppSettings.ai_hourly_limit) {
        cachedAppSettings.ai_hourly_limit = 10;
      }
      if (cachedAppSettings.payment_qris_manual === undefined) {
        cachedAppSettings.payment_qris_manual = true;
      }
      if (cachedAppSettings.payment_manual === undefined) {
        cachedAppSettings.payment_manual = true;
      }
      if (!cachedAppSettings.manual_bsi_rek) cachedAppSettings.manual_bsi_rek = "7293609009";
      if (!cachedAppSettings.manual_bsi_name) cachedAppSettings.manual_bsi_name = "sutroni soga";
      if (!cachedAppSettings.manual_dana_rek) cachedAppSettings.manual_dana_rek = "08979527685";
      if (!cachedAppSettings.manual_dana_name) cachedAppSettings.manual_dana_name = "sutroni soga";
      if (!cachedAppSettings.manual_shopee_rek) cachedAppSettings.manual_shopee_rek = "08979527685";
      if (!cachedAppSettings.manual_shopee_name) cachedAppSettings.manual_shopee_name = "hasnasyukur";
      // AwanPulsa saat ini belum memiliki QRIS, gunakan transfer manual
      cachedAppSettings.payment_shopeepay = false;
      cachedAppSettings.payment_gopay = false;
      cachedAppSettings.payment_tripay = false;
      cachedAppSettings.payment_violet = false;
      cachedAppSettingsTime = now;
      return cachedAppSettings;
    }
  } catch (e) {
    console.error("Failed to fetch settings from DB:", e);
  }
  if (cachedAppSettings) return cachedAppSettings;
  return defaultSettings;
}
__name(getAppSettings, "getAppSettings");
__name2(getAppSettings, "getAppSettings");
__name22(getAppSettings, "getAppSettings");
__name222(getAppSettings, "getAppSettings");
function setCachedAppSettings(settings) {
  cachedAppSettings = settings;
  cachedAppSettingsTime = Date.now();
}
__name(setCachedAppSettings, "setCachedAppSettings");
__name2(setCachedAppSettings, "setCachedAppSettings");
__name22(setCachedAppSettings, "setCachedAppSettings");
__name222(setCachedAppSettings, "setCachedAppSettings");
function getWIBTime() {
  return (/* @__PURE__ */ new Date()).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }) + " WIB";
}
__name(getWIBTime, "getWIBTime");
__name2(getWIBTime, "getWIBTime");
__name22(getWIBTime, "getWIBTime");
__name222(getWIBTime, "getWIBTime");
function getWIBDateOnly() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = formatter.formatToParts(/* @__PURE__ */ new Date());
  const d = parts.find((p) => p.type === "day").value;
  const m = parts.find((p) => p.type === "month").value;
  const y = parts.find((p) => p.type === "year").value;
  return `${d}/${m}/${y}`;
}
__name(getWIBDateOnly, "getWIBDateOnly");
__name2(getWIBDateOnly, "getWIBDateOnly");
__name22(getWIBDateOnly, "getWIBDateOnly");
__name222(getWIBDateOnly, "getWIBDateOnly");
function parseWIBDateString(wibStr) {
  if (!wibStr) return 0;
  let cleanStr = String(wibStr).replace(" WIB", "").trim().replace(/\./g, ":").replace(/-/g, "/");
  const match = cleanStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (match) {
    return Date.UTC(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]), parseInt(match[4]) - 7, parseInt(match[5]), parseInt(match[6]));
  }
  const fallback = Date.parse(wibStr);
  if (!isNaN(fallback)) return fallback;
  return 0;
}
__name(parseWIBDateString, "parseWIBDateString");
__name2(parseWIBDateString, "parseWIBDateString");
__name22(parseWIBDateString, "parseWIBDateString");
__name222(parseWIBDateString, "parseWIBDateString");
function escapeHTML(str) {
  if (!str) return "";
  return str.replace(/[&<>'"]/g, (tag) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[tag]);
}
__name(escapeHTML, "escapeHTML");
__name2(escapeHTML, "escapeHTML");
__name22(escapeHTML, "escapeHTML");
__name222(escapeHTML, "escapeHTML");
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
__name2(jsonResponse, "jsonResponse");
__name22(jsonResponse, "jsonResponse");
__name222(jsonResponse, "jsonResponse");
async function sendTelegramLog(statusHeader, bodyMsg, appSettings) {
  if (!appSettings) return;
  const botToken = String(appSettings.telegram_bot_token || '').trim();
  const rawChatId = String(appSettings.telegram_channel_id || '').trim();
  if (!botToken || !rawChatId) return;

  // Normalisasi Chat ID jika user menginput format ID supergroup tanpa awalan -100
  // Contoh: "-5011866503" atau "5011866503" pada supergroup/channel bot API membutuhkan "-1005011866503"
  const candidateIds = [rawChatId];
  if (/^-\d{9,12}$/.test(rawChatId) && !rawChatId.startsWith('-100')) {
    candidateIds.push('-100' + rawChatId.substring(1));
  } else if (/^\d{9,12}$/.test(rawChatId)) {
    candidateIds.push('-100' + rawChatId);
  }

  const cleanHeader = String(statusHeader || '').trim();
  const headerPrefix = cleanHeader.startsWith('#awanpulsa') ? '' : '#awanpulsa\n';
  const finalMessage = `${headerPrefix}<b>${cleanHeader}</b>\n\n${bodyMsg}\n\n🕒 ${getWIBTime()}`;

  for (const targetChatId of candidateIds) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: targetChatId, text: finalMessage, parse_mode: "HTML" })
      });
      const data = await res.json();
      if (data && data.ok) {
        return; // Berhasil terkirim!
      } else {
        console.warn(`[Telegram Log Notice] Pengiriman ke chat_id "${targetChatId}" gagal:`, data ? data.description : 'Unknown error');
      }
    } catch (e) {
      console.error("[Telegram Log Error]:", e.message);
    }
  }
}
__name(sendTelegramLog, "sendTelegramLog");
__name2(sendTelegramLog, "sendTelegramLog");
__name22(sendTelegramLog, "sendTelegramLog");
__name222(sendTelegramLog, "sendTelegramLog");
async function generateTriPaySignature(privateKey, merchantCode, merchantRef, amount) {
  const data = merchantCode + merchantRef + amount;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(privateKey.trim());
  const msgData = encoder.encode(data);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, msgData);
  return Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(generateTriPaySignature, "generateTriPaySignature");
__name2(generateTriPaySignature, "generateTriPaySignature");
__name22(generateTriPaySignature, "generateTriPaySignature");
__name222(generateTriPaySignature, "generateTriPaySignature");
async function verifyWebhookSignature(privateKey, rawBody, incomingSignature) {
  if (!privateKey || privateKey.trim() === "") return false;
  if (!incomingSignature) return false;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(privateKey.trim());
  const msgData = encoder.encode(rawBody);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, msgData);
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return incomingSignature === expectedSignature;
}
__name(verifyWebhookSignature, "verifyWebhookSignature");
__name2(verifyWebhookSignature, "verifyWebhookSignature");
__name22(verifyWebhookSignature, "verifyWebhookSignature");
__name222(verifyWebhookSignature, "verifyWebhookSignature");
function buildEmailTemplate(title, bodyContent) {
  const logoUrl = (typeof env !== "undefined" && env && env.DOMAIN_NAME) ? ("https://" + env.DOMAIN_NAME + "/logo.png") : "https://awanpulsa.web.id/logo.png";
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
            .wrapper { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
            .header { background-color: #1e3a8a; padding: 25px 35px; text-align: left; display: flex; align-items: center; }
            .header img { width: 48px; height: 48px; border-radius: 50%; vertical-align: middle; border: 2px solid rgba(255,255,255,0.3); background-color: #ffffff; object-fit: contain; }
            .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; display: inline-block; vertical-align: middle; letter-spacing: -0.5px; line-height: 1.2; }
            .content { padding: 40px; color: #374151; line-height: 1.6; font-size: 15px; }
            .content h2 { color: #111827; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 20px; border-bottom: 2px solid #f3f4f6; padding-bottom: 10px; }
            .content p { margin-bottom: 16px; }
            .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px; margin-top: 10px; margin-bottom: 10px; text-align: center; }
            .config-box { background-color: #111827; color: #10b981; padding: 20px; border-radius: 8px; font-family: 'Courier New', Courier, monospace; font-size: 13px; overflow-x: auto; white-space: pre-wrap; margin-top: 20px; margin-bottom: 20px; border: 1px solid #374151; }
            .footer { background-color: #f9fafb; padding: 25px 40px; text-align: center; color: #6b7280; font-size: 13px; border-top: 1px solid #e5e7eb; }
            .footer p { margin: 5px 0; }
            .info-table { border-collapse: collapse; margin: 20px 0; width: 100%; }
            .info-table td { padding: 10px; border-bottom: 1px solid #f3f4f6; }
            .info-table td:first-child { font-weight: 600; color: #4b5563; width: 40%; }
            .info-table td:last-child { color: #111827; font-weight: 500; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="header">
                <img src="${logoUrl}" alt="Logo AwanPulsa">
                <div style="display:inline-block;vertical-align:middle;margin-left:14px;">
                    <h1 style="margin:0;font-size:22px;color:#ffffff;line-height:1.2;font-weight:800;">AwanPulsa</h1>
                    <span style="font-size:11px;color:#fcd34d;font-weight:700;letter-spacing:1px;text-transform:uppercase;display:block;">✦ Awan Jaya Celluler ✦</span>
                </div>
            </div>
            <div class="content">
                <h2>${title}</h2>
                ${bodyContent}
            </div>
            <div class="footer">
                <p>Hak Cipta &copy; ${(/* @__PURE__ */ new Date()).getFullYear()} AwanPulsa. Hak cipta dilindungi undang-undang.</p>
                <p>Email ini dikirimkan otomatis oleh sistem kami. Mohon tidak membalas ke alamat email ini.</p>
            </div>
        </div>
    </body>
    </html>
    `;
}
__name(buildEmailTemplate, "buildEmailTemplate");
__name2(buildEmailTemplate, "buildEmailTemplate");
__name22(buildEmailTemplate, "buildEmailTemplate");
__name222(buildEmailTemplate, "buildEmailTemplate");
async function sendEmailViaGAS(toEmail, subject, htmlMessage, env) {
  const OLD_GAS_URL = "https://script.google.com/macros/s/AKfycbzl9mTViChz10-fRndGyH_LO3sA6Y3-s8_IDKySQnaEtUEbPxyempIu_8LuVrB_yJ3R/exec";
  const NEW_GAS_URL = "https://script.google.com/macros/s/AKfycbznmzNY0ewVAmsqz5NH-ulHb_YyI9JNmNwwCILOWSDTawDn9tEXSy_l3b3Vw2gHHwIJ-g/exec";

  let webAppUrl = (env && env.GAS_WEB_APP_URL) || (typeof process !== "undefined" && process.env && process.env.GAS_WEB_APP_URL) || NEW_GAS_URL;
  if (webAppUrl === OLD_GAS_URL) {
    webAppUrl = NEW_GAS_URL;
  }
  const secretToken = (env && env.GAS_SECRET_TOKEN) || (typeof process !== "undefined" && process.env && process.env.GAS_SECRET_TOKEN) || "RahasiaVPNtuban123!";
  if (!webAppUrl || !secretToken) return;
  try {
    const res = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret_token: secretToken,
        to: toEmail,
        subject,
        htmlMessage
      })
    });
    console.log(`[Email via GAS] Ke: ${toEmail} | Status: ${res.status} | Endpoint: ${webAppUrl.substring(0, 45)}...`);
  } catch (e) {
    console.error("Gagal mengirim email GAS:", e);
  }
}
__name(sendEmailViaGAS, "sendEmailViaGAS");
__name2(sendEmailViaGAS, "sendEmailViaGAS");
__name22(sendEmailViaGAS, "sendEmailViaGAS");
__name222(sendEmailViaGAS, "sendEmailViaGAS");
async function catatMutasi(env, email, type, amount, description) {
  const now = getWIBTime();
  try {
    const user = await env.DB.prepare("SELECT balance FROM users WHERE email = ?").bind(email).first();
    const currentBalance = user ? user.balance : 0;
    await env.DB.prepare("INSERT INTO transactions (email, type, amount, description, balance, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(email, type, amount, description, currentBalance, now).run();
  } catch (e) {
    console.error("Gagal mencatat mutasi:", e);
  }
}
__name(catatMutasi, "catatMutasi");
__name2(catatMutasi, "catatMutasi");
__name22(catatMutasi, "catatMutasi");
__name222(catatMutasi, "catatMutasi");
async function generateBackupData(env) {
  const { results: users } = await env.DB.prepare("SELECT * FROM users").all();
  const { results: vpns } = await env.DB.prepare("SELECT * FROM vpns").all();
  const { results: inbox } = await env.DB.prepare("SELECT * FROM inbox").all();
  const { results: invoices } = await env.DB.prepare("SELECT * FROM invoices").all();
  const { results: settings } = await env.DB.prepare("SELECT * FROM settings").all();
  const { results: transactions } = await env.DB.prepare("SELECT * FROM transactions").all();
  const { results: tickets } = await env.DB.prepare("SELECT * FROM tickets").all();
  const { results: ticketReplies } = await env.DB.prepare("SELECT * FROM ticket_replies").all();
  const { results: aiUsage } = await env.DB.prepare("SELECT * FROM ai_usage").all();
  let licenses = [];
  try {
    const { results } = await env.DB.prepare("SELECT * FROM licenses").all();
    licenses = results;
  } catch (e) {
  }
  let ppobTransactions = [];
  try {
    const { results } = await env.DB.prepare("SELECT * FROM ppob_transactions").all();
    ppobTransactions = results || [];
  } catch (e) {
  }
  let ppobProducts = [];
  try {
    const { results } = await env.DB.prepare("SELECT * FROM ppob_products").all();
    ppobProducts = results || [];
  } catch (e) {
  }
  let userContacts = [];
  try {
    const { results } = await env.DB.prepare("SELECT * FROM user_contacts").all();
    userContacts = results || [];
  } catch (e) {
  }
  return {
    users,
    vpns,
    inbox,
    invoices,
    settings,
    licenses,
    transactions,
    tickets,
    ticket_replies: ticketReplies,
    ai_usage: aiUsage,
    ppob_transactions: ppobTransactions,
    ppob_products: ppobProducts,
    user_contacts: userContacts
  };
}
__name(generateBackupData, "generateBackupData");
__name2(generateBackupData, "generateBackupData");
__name22(generateBackupData, "generateBackupData");
__name222(generateBackupData, "generateBackupData");
async function saveBackupToR2(env, backupJsonObj, wibTime) {
  if (!env.BACKUP_BUCKET) {
    console.warn("R2 BACKUP_BUCKET binding tidak dikonfigurasi.");
    return false;
  }
  try {
    const cleanTime = wibTime.replace(/[\s:]/g, "_").replace(/[\/\s:,]/g, "_");
    const fileName = `Backup_AwanPulsa_${cleanTime}.json`;
    const backupString = JSON.stringify(backupJsonObj, null, 2);
    await env.BACKUP_BUCKET.put(fileName, backupString, {
      httpMetadata: { contentType: "application/json" }
    });
    console.log(`Backup berhasil diunggah ke R2: ${fileName}`);
    const listResult = await env.BACKUP_BUCKET.list();
    if (listResult && listResult.objects) {
      const sortedObjects = listResult.objects.sort((a, b) => new Date(a.uploaded) - new Date(b.uploaded));
      if (sortedObjects.length > 10) {
        const toDelete = sortedObjects.slice(0, sortedObjects.length - 10);
        for (const obj of toDelete) {
          await env.BACKUP_BUCKET.delete(obj.key);
          console.log(`Menghapus backup lama di R2: ${obj.key}`);
        }
      }
    }
    return true;
  } catch (e) {
    console.error("Gagal menyimpan backup ke R2:", e);
    return false;
  }
}
__name(saveBackupToR2, "saveBackupToR2");
__name2(saveBackupToR2, "saveBackupToR2");
__name22(saveBackupToR2, "saveBackupToR2");
__name222(saveBackupToR2, "saveBackupToR2");
var KMSP = {
  async _request(subdomain, params) {
    const url = new URL(`https://${subdomain}.kmsp-store.com/v1`);
    Object.keys(params).forEach((key) => {
      if (params[key] !== void 0 && params[key] !== null && params[key] !== "") {
        url.searchParams.append(key, params[key]);
      }
    });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35e3);
    try {
      const req = await fetch(url.toString(), {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      clearTimeout(timeoutId);
      const text = await req.text();
      let res;
      try {
        res = JSON.parse(text);
      } catch (err) {
        return { success: false, message: "Respon KMSP bukan JSON (Kemungkinan Server KMSP Error/Maintenace): " + text.substring(0, 80), raw: text };
      }
      if (res.status === true || res.statusCode === 200) {
        return { success: res.status, data: res.data, message: res.message, raw: res };
      } else {
        return { success: false, message: res.message || "Gagal memproses ke server pusat KMSP", raw: res };
      }
    } catch (e) {
      clearTimeout(timeoutId);
      return { success: false, message: e.name === "AbortError" ? "Koneksi ke KMSP Timeout (>30s)" : e.message };
    }
  },
  async getPackageList(apiKey) {
    return this._request("golang-openapi-packagelist-xltembakservice", { api_key: apiKey });
  },
  async beliPaketNoOtp(apiKey, packageCode, phone, paymentMethod, priceOrFee) {
    return this._request("golang-openapi-packagepurchase-xltembakservice", { api_key: apiKey, package_code: packageCode, phone, payment_method: paymentMethod, price_or_fee: priceOrFee });
  },
  async beliPaketOtp(apiKey, packageCode, phone, accessToken, paymentMethod, ewalletNumber, priceOrFee) {
    return this._request("golang-openapi-packagepurchase-xltembakservice", { api_key: apiKey, package_code: packageCode, phone, access_token: accessToken, payment_method: paymentMethod, ewallet_number: ewalletNumber, price_or_fee: priceOrFee });
  },
  async requestOtp(apiKey, phone) {
    return this._request("golang-openapi-reqotp-xltembakservice", { api_key: apiKey, phone, method: "OTP" });
  },
  async loginOtp(apiKey, phone, authId, otp) {
    return this._request("golang-openapi-login-xltembakservice", { api_key: apiKey, phone, method: "OTP", auth_id: authId, otp });
  },
  async getAccessTokenList(apiKey, msisdn = "") {
    return this._request("golang-openapi-accesstokenlist-xltembakservice", { api_key: apiKey, msisdn });
  },
  async extendSession(apiKey, phone, authIdToken) {
    return this._request("golang-openapi-login-xltembakservice", { api_key: apiKey, phone, method: "LOGIN_BY_ACCESS_TOKEN", auth_id: authIdToken });
  },
  async cekPulsaMasaAktif(apiKey, accessToken) {
    return this._request("golang-openapi-subscriberinfo-xltembakservice", { api_key: apiKey, access_token: accessToken });
  },
  async cekPaketAktif(apiKey, accessToken) {
    return this._request("golang-openapi-quotadetails-xltembakservice", { api_key: apiKey, access_token: accessToken });
  },
  async cekLokasi(apiKey, accessToken) {
    return this._request("golang-openapi-subscriberlocation-xltembakservice", { api_key: apiKey, access_token: accessToken });
  }
};
async function handleKMSPRoutes(url, request, env, currentUser, appSettings, sendTelegramLog2) {
  const getWIBTime2 = /* @__PURE__ */ __name222(() => (/* @__PURE__ */ new Date()).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " WIB", "getWIBTime");
  const kmspMarkup = appSettings && appSettings.kmsp_markup !== void 0 ? parseInt(appSettings.kmsp_markup) : 3e3;
  if (url.pathname === "/api/kmsp/services" && request.method === "GET") {
    if (!currentUser) return new Response("Unauthorized", { status: 401 });
    if (!env.KMSP_API_KEY) return new Response(JSON.stringify({ success: false, message: "Admin belum menyetel API KEY KMSP!" }), { status: 500 });
    const servicesRes = await KMSP.getPackageList(env.KMSP_API_KEY);
    let visibilityMap = {};
    try {
      const visStr = await env.DB.prepare("SELECT value FROM settings WHERE key = 'pkg_visibility'").first("value");
      if (visStr) visibilityMap = JSON.parse(visStr);
    } catch (e) {
    }
    if (servicesRes.success && Array.isArray(servicesRes.data)) {
      servicesRes.data = servicesRes.data.filter((pkg) => visibilityMap[pkg.package_code] !== false).map((pkg) => {
        if (pkg.available_payment_methods) {
          pkg.available_payment_methods = pkg.available_payment_methods.filter(
            (m) => !["QRIS", "OVO", "SHOPEEPAY"].includes(m.payment_method.toUpperCase())
          );
        }
        return {
          ...pkg,
          id: pkg.package_code,
          name: pkg.package_name,
          price: (Number(pkg.package_harga_int) || 0) + kmspMarkup
        };
      });
    }
    return new Response(JSON.stringify(servicesRes), { headers: { "Content-Type": "application/json" } });
  }
  if (url.pathname === "/api/xl/smart-verify" && request.method === "POST") {
    if (!currentUser) return new Response("Unauthorized", { status: 401 });
    try {
      const { phone } = await request.json();
      const tokenListRes = await KMSP.getAccessTokenList(env.KMSP_API_KEY, phone);
      if (tokenListRes.success && tokenListRes.data && tokenListRes.data.length > 0) {
        const activeTokenObj = tokenListRes.data.find((t) => String(t.msisdn).includes(phone) || String(phone).includes(String(t.msisdn)));
        if (activeTokenObj) {
          const authIdToken = `${activeTokenObj.session_id}:${activeTokenObj.token}`;
          const extendRes = await KMSP.extendSession(env.KMSP_API_KEY, phone, authIdToken);
          if (extendRes.success && extendRes.data && extendRes.data.access_token) {
            return new Response(JSON.stringify({ success: true, needs_otp: false, access_token: extendRes.data.access_token }), { headers: { "Content-Type": "application/json" } });
          }
        }
      }
      const otpRes = await KMSP.requestOtp(env.KMSP_API_KEY, phone);
      return new Response(JSON.stringify({ success: otpRes.success, needs_otp: true, auth_id: otpRes.data?.auth_id, message: otpRes.message }), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
    }
  }
  if (url.pathname === "/api/xl/login-otp" && request.method === "POST") {
    if (!currentUser) return new Response("Unauthorized", { status: 401 });
    try {
      const { phone, authId, otp } = await request.json();
      const result = await KMSP.loginOtp(env.KMSP_API_KEY, phone, authId, otp);
      return new Response(JSON.stringify(result), { headers: { "Content-Type": "application/json" } });
    } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
    }
  }
  if (url.pathname === "/api/xl/check-balance" && request.method === "POST") {
    if (!currentUser) return new Response("Unauthorized", { status: 401 });
    try {
      const { accessToken } = await request.json();
      const [infoResult, quotaResult, locationResult] = await Promise.all([
        KMSP.cekPulsaMasaAktif(env.KMSP_API_KEY, accessToken),
        KMSP.cekPaketAktif(env.KMSP_API_KEY, accessToken),
        KMSP.cekLokasi(env.KMSP_API_KEY, accessToken)
      ]);
      if (infoResult.success) {
        return new Response(JSON.stringify({
          success: true,
          info: infoResult.data,
          quota: quotaResult.success ? quotaResult.data : [],
          location: locationResult.success ? locationResult.data : null
        }), { headers: { "Content-Type": "application/json" } });
      } else {
        return new Response(JSON.stringify(infoResult), { headers: { "Content-Type": "application/json" } });
      }
    } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
    }
  }
  if (url.pathname === "/api/buy-xl" && request.method === "POST") {
    if (!currentUser) return new Response("Unauthorized", { status: 401 });
    try {
      const { phone, serviceId, accessToken, paymentMethod = "BALANCE" } = await request.json();
      const forbiddenMethods = ["QRIS", "OVO", "SHOPEEPAY"];
      if (forbiddenMethods.includes(paymentMethod.toUpperCase())) {
        throw new Error("Metode pembayaran ini tidak didukung.");
      }
      const servicesRes = await KMSP.getPackageList(env.KMSP_API_KEY);
      if (!servicesRes.success) throw new Error("Gagal verifikasi produk.");
      const targetService = servicesRes.data.find((s) => String(s.package_code) === String(serviceId));
      if (!targetService) throw new Error("Paket tidak ditemukan.");
      const pkgName = targetService.package_name;
      const isEwalletPkg = pkgName.includes("[Method E-Wallet]");
      const isPulsaPkg = pkgName.includes("[Method Pulsa]");
      if (isEwalletPkg && !["DANA", "GOPAY"].includes(paymentMethod.toUpperCase())) {
        throw new Error("Paket [Method E-Wallet] hanya bisa dibayar via DANA atau GOPAY untuk saat ini.");
      }
      const modalPrice = Number(targetService.package_harga_int) || 0;
      let deductionAmount;
      if (isPulsaPkg) {
        deductionAmount = kmspMarkup;
      } else if (paymentMethod === "BALANCE") {
        deductionAmount = modalPrice + kmspMarkup;
      } else {
        deductionAmount = kmspMarkup;
      }
      const deductBalance = await env.DB.prepare("UPDATE users SET balance = balance - ? WHERE email = ? AND balance >= ?").bind(deductionAmount, currentUser.email, deductionAmount).run();
      if (deductBalance.meta.changes === 0) {
        return new Response(JSON.stringify({ success: false, message: `Saldo Web tidak cukup. Butuh Rp ${deductionAmount.toLocaleString("id-ID")} untuk transaksi ini.` }), { status: 400 });
      }
      let descMutasi = isPulsaPkg ? `Biaya Admin Paket XL ${phone} (${pkgName})` : `Pembelian Paket XL ${phone} (${pkgName})`;
      await catatMutasi(env, currentUser.email, "OUT", deductionAmount, descMutasi);
      let orderResult;
      try {
        if (targetService.no_need_login === true) {
          orderResult = await KMSP.beliPaketNoOtp(env.KMSP_API_KEY, serviceId, phone, paymentMethod, modalPrice);
        } else {
          orderResult = await KMSP.beliPaketOtp(env.KMSP_API_KEY, serviceId, phone, accessToken, paymentMethod, "", modalPrice);
        }
      } catch (apiErr) {
        await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(deductionAmount, currentUser.email).run();
        await catatMutasi(env, currentUser.email, "IN", deductionAmount, `Refund Gagal XL ${phone} (${pkgName})`);
        return new Response(JSON.stringify({ success: false, message: `Gagal memproses ke server KMSP (Exception): ${apiErr.message}` }), { status: 500 });
      }
      if (orderResult.success) {
        const now = getWIBTime2();
        const refKMSP = orderResult.data?.trx_id || orderResult.data?.sn || "PROSES";
        let payButtonHtml = "";
        let statusHeader = "[SUKSES] Pembelian Paket XL";
        let detailTagihan = `Harga: Rp ${(modalPrice + kmspMarkup).toLocaleString("id-ID")}`;
        if (isPulsaPkg) {
          detailTagihan = `Biaya Admin: Rp ${kmspMarkup.toLocaleString("id-ID")} (Sudah Dipotong)<br>Pembayaran Paket: <b>Otomatis Potong Pulsa XL Langsung</b>`;
        } else if (paymentMethod !== "BALANCE" && orderResult.data?.deeplink_data?.deeplink_url) {
          const payUrl = orderResult.data.deeplink_data.deeplink_url;
          statusHeader = `[PENDING] Bayar XL via ${paymentMethod}`;
          detailTagihan = `Biaya Admin: Rp ${kmspMarkup.toLocaleString("id-ID")} (Sudah Dipotong)<br>Sisa Bayar Modal: <b>Rp ${modalPrice.toLocaleString("id-ID")}</b>`;
          payButtonHtml = `
                        <br><br>
                        <div style="text-align: center;">
                            <a href="${payUrl}" target="_blank" style="display: inline-block; background-color: #22c55e; color: #ffffff; padding: 12px 24px; border-radius: 12px; text-decoration: none; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border: 1px solid #16a34a;">
                                \u{1F4F1} LANJUTKAN PEMBAYARAN ${paymentMethod.toUpperCase()}
                            </a>
                        </div>
                        <p style="font-size: 10px; color: #6b7280; text-align: center; margin-top: 8px;">*Link ini tetap aktif jika Anda ingin membayar nanti.</p>
                    `;
        }
        const bodyMsg = `
                    Pesanan paket data XL Anda untuk nomor <b>${phone}</b> berhasil dikirim.<br><br>
                    <b>Paket:</b> ${pkgName}<br>
                    ${detailTagihan}<br>
                    Ref: ${refKMSP}
                    ${payButtonHtml}
                `;
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(currentUser.email, statusHeader, bodyMsg, now).run();
        await env.DB.prepare("UPDATE users SET phone = ? WHERE email = ? AND (phone IS NULL OR phone = '' OR phone != ?)").bind(phone, currentUser.email, phone).run();
        if (sendTelegramLog2) {
          const tgLogBody = `User: ${currentUser.email}
Nomor XL: ${phone}
Paket: ${pkgName}
Metode: ${paymentMethod}

Ref/SN: ${refKMSP}`;
          await sendTelegramLog2(`\u{1F6D2} ${statusHeader}`, tgLogBody, appSettings);
        }
        return new Response(JSON.stringify({
          success: true,
          is_pending_payment: paymentMethod !== "BALANCE",
          payment_data: orderResult.data,
          deducted_amount: deductionAmount
        }), { headers: { "Content-Type": "application/json" } });
      } else {
        await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(deductionAmount, currentUser.email).run();
        await catatMutasi(env, currentUser.email, "IN", deductionAmount, `Refund Gagal XL ${phone} (${pkgName})`);
        return new Response(JSON.stringify({ success: false, message: `Ditolak Server: ${orderResult.message}` }), { status: 400 });
      }
    } catch (e) {
      return new Response(JSON.stringify({ success: false, message: e.message }), { status: 500 });
    }
  }
  return null;
}
__name(handleKMSPRoutes, "handleKMSPRoutes");
__name2(handleKMSPRoutes, "handleKMSPRoutes");
__name22(handleKMSPRoutes, "handleKMSPRoutes");
__name222(handleKMSPRoutes, "handleKMSPRoutes");
async function renderAdminDashboard(env, currentUser, appSettings) {
  const isCurrentSuperAdmin = isSuperAdmin(currentUser, env);
  const kmspMarkup = appSettings.kmsp_markup !== void 0 ? appSettings.kmsp_markup : 3e3;
  const backupFreq = appSettings.auto_backup_frequency !== void 0 ? parseInt(appSettings.auto_backup_frequency) : 24;
  const licPrice = appSettings.script_price_per_day || 500;
  const isQrisManualOn = appSettings.payment_qris_manual !== false;
  const isShopeePayOn = appSettings.payment_shopeepay === true;
  const isGoPayOn = appSettings.payment_gopay === true;
  return `
    <style>
        /* Fix SweetAlert2 Select Options visibility in Light Theme */
        .swal2-select {
            background-color: #ffffff !important;
            color: #0f172a !important;
            border: 1px solid #cbd5e1 !important;
        }
        .swal2-select option {
            background-color: #ffffff !important;
            color: #0f172a !important;
        }

        /* Scoped overrides to optimize space, paddings, and borders across the Admin panel */
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        
        #adminPanelContainer, .fixed.inset-0 {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            color: #0f172a;
        }

        /* Ambient Light Background Accents */
        #adminPanelContainer {
            position: relative;
        }
        #adminPanelContainer::before {
            content: '';
            position: absolute;
            top: 0;
            left: 5%;
            width: 450px;
            height: 450px;
            background: radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%);
            filter: blur(80px);
            z-index: 0;
            pointer-events: none;
        }
        #adminPanelContainer::after {
            content: '';
            position: absolute;
            bottom: 10%;
            right: 5%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(2, 132, 199, 0.05) 0%, transparent 70%);
            filter: blur(90px);
            z-index: 0;
            pointer-events: none;
        }
        
        /* 1. Thinner & Clean Light Border Styles */
        #adminPanelContainer .border, 
        #adminPanelContainer .border-gray-700, 
        #adminPanelContainer .border-gray-800, 
        #adminPanelContainer .border-slate-700, 
        #adminPanelContainer .border-slate-800,
        .fixed.inset-0 .border,
        .fixed.inset-0 .border-gray-700,
        .fixed.inset-0 .border-gray-800,
        .fixed.inset-0 .border-slate-700,
        .fixed.inset-0 .border-slate-800 {
            border-color: #e2e8f0 !important;
            border-width: 1px !important;
        }
        
        /* Card Surface & Hover Effects */
        #adminPanelContainer .bg-gray-800 {
            background: #ffffff !important;
            border: 1px solid #e2e8f0 !important;
            color: #0f172a !important;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
            box-shadow: 0 4px 15px -3px rgba(0, 0, 0, 0.05), 0 2px 6px -2px rgba(0, 0, 0, 0.03) !important;
        }
        #adminPanelContainer .bg-gray-800:hover {
            transform: translateY(-2px);
            border-color: #38bdf8 !important;
            box-shadow: 0 12px 25px -5px rgba(14, 165, 233, 0.12), 0 4px 10px -2px rgba(0, 0, 0, 0.04) !important;
            background: #ffffff !important;
        }

        /* Modal Light Styling */
        .fixed.inset-0 .bg-gray-900,
        .fixed.inset-0 .bg-gray-950 {
            background: #ffffff !important;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15) !important;
            border: 1px solid #e2e8f0 !important;
            color: #0f172a !important;
        }
        
        #adminPanelContainer h1, #adminPanelContainer h2, #adminPanelContainer h3, #adminPanelContainer h4,
        .fixed.inset-0 h1, .fixed.inset-0 h2, .fixed.inset-0 h3, .fixed.inset-0 h4,
        #adminPanelContainer .text-white, .fixed.inset-0 .text-white {
            color: #0f172a !important;
        }
        #adminPanelContainer .text-gray-400, #adminPanelContainer .text-gray-500,
        .fixed.inset-0 .text-gray-400, .fixed.inset-0 .text-gray-500 {
            color: #475569 !important;
        }
        #adminPanelContainer .text-gray-300, .fixed.inset-0 .text-gray-300 {
            color: #334155 !important;
        }
        
        /* Modal Accents */
        #globalTransactionsModal > div { border: 1px solid rgba(249, 115, 22, 0.4) !important; }
        #mutasiUserModal > div { border: 1px solid rgba(34, 197, 94, 0.4) !important; }
        #ticketListModal > div, #chatTicketModal > div, #ticketManagerModal > div { border: 1px solid rgba(20, 184, 166, 0.4) !important; }
        
        /* 2. Premium Table Cell Paddings & Font Sizes */
        #adminPanelContainer table th, 
        #adminPanelContainer table td,
        .fixed.inset-0 table th,
        .fixed.inset-0 table td {
            padding: 12px 16px !important;
            font-size: 13.5px !important;
        }
        
        /* Table headers styling */
        #adminPanelContainer table th,
        .fixed.inset-0 table th {
            font-size: 11.5px !important;
            font-weight: 700 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
            color: #334155 !important;
            background-color: #f1f5f9 !important;
            border-bottom: 1px solid #e2e8f0 !important;
        }
        
        /* Specific metadata and smaller text sizing in tables */
        #adminPanelContainer table td.text-xs,
        .fixed.inset-0 table td.text-xs,
        #adminPanelContainer table td .text-xs,
        .fixed.inset-0 table td .text-xs {
            font-size: 12px !important;
        }
        
        #adminPanelContainer table td,
        .fixed.inset-0 table td {
            color: #1e293b !important;
            border-bottom: 1px solid #f1f5f9 !important;
        }

        #adminPanelContainer table tbody tr,
        .fixed.inset-0 table tbody tr {
            transition: background-color 0.2s ease !important;
        }
        #adminPanelContainer table tbody tr:hover,
        .fixed.inset-0 table tbody tr:hover {
            background-color: #f8fafc !important;
        }
        
        /* Email/Description table wraps */
        #adminPanelContainer td.whitespace-normal,
        .fixed.inset-0 td.whitespace-normal {
            font-size: 13px !important;
            line-height: 1.4 !important;
        }
        
        /* Buttons inside table cells */
        #adminPanelContainer table td button,
        .fixed.inset-0 table td button {
            font-size: 11px !important;
            padding: 6px 10px !important;
            border-radius: 6px !important;
        }
        
        /* 3. Modern, Crisp Typography for Code/Pre output log */
        pre, code {
            font-size: 12px !important;
            line-height: 1.5 !important;
            letter-spacing: -0.01em !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
            font-feature-settings: "tnum" 1 !important;
        }
        
        /* 4. Elegant Card and Modal Spacing */
        #adminPanelContainer .p-6, 
        #adminPanelContainer .p-8,
        .fixed.inset-0 .p-6,
        .fixed.inset-0 .p-8 {
            padding: 1.25rem !important;
        }
        @media (min-width: 768px) {
            #adminPanelContainer .p-6, 
            #adminPanelContainer .p-8,
            .fixed.inset-0 .p-6,
            .fixed.inset-0 .p-8 {
                padding: 1.75rem !important;
            }
        }
        
        #adminPanelContainer .p-5,
        .fixed.inset-0 .p-5 {
            padding: 1rem !important;
        }
        
        #adminPanelContainer .mb-6, 
        #adminPanelContainer .mb-8,
        .fixed.inset-0 .mb-6,
        .fixed.inset-0 .mb-8 {
            margin-bottom: 1.25rem !important;
        }
        
        #adminPanelContainer .rounded-3xl,
        .fixed.inset-0 .rounded-3xl {
            border-radius: 20px !important;
        }
        #adminPanelContainer .rounded-2xl,
        .fixed.inset-0 .rounded-2xl {
            border-radius: 14px !important;
        }
        
        #adminPanelContainer .gap-6,
        .fixed.inset-0 .gap-6 {
            gap: 1.25rem !important;
        }
        #adminPanelContainer .gap-4,
        .fixed.inset-0 .gap-4 {
            gap: 1rem !important;
        }
        
        /* 5. Clean minimalist scrollbars */
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px !important;
            height: 6px !important;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9 !important;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1 !important;
            border-radius: 3px !important;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8 !important;
        }
        
        /* 6. Form Fields Premium Styling & Focus Rings */
        #adminPanelContainer select, 
        #adminPanelContainer input[type="text"], 
        #adminPanelContainer input[type="number"], 
        #adminPanelContainer textarea,
        .fixed.inset-0 select, 
        .fixed.inset-0 input[type="text"], 
        .fixed.inset-0 input[type="number"], 
        .fixed.inset-0 textarea {
            padding: 10px 14px !important;
            font-size: 13.5px !important;
            border-radius: 8px !important;
            border: 1px solid #cbd5e1 !important;
            background-color: #ffffff !important;
            color: #0f172a !important;
            transition: all 0.2s ease !important;
        }
        #adminPanelContainer select:focus, 
        #adminPanelContainer input[type="text"]:focus, 
        #adminPanelContainer input[type="number"]:focus, 
        #adminPanelContainer textarea:focus,
        .fixed.inset-0 select:focus, 
        .fixed.inset-0 input[type="text"]:focus, 
        .fixed.inset-0 input[type="number"]:focus, 
        .fixed.inset-0 textarea:focus {
            border-color: #0284c7 !important;
            box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15) !important;
            outline: none !important;
        }
    </style>
    <div id="adminPanelContainer" class="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <h1 class="text-3xl font-black text-slate-900 mb-8 tracking-tight">Panel Kontrol Admin</h1>
        
        <!-- Status Banner Mode Maintenance -->
        ${appSettings.maintenance_mode ? `
        <div class="mb-8 p-5 md:p-6 rounded-3xl bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 border-2 border-rose-300 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex items-start md:items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30">
                    <svg class="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <span class="bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">RESTRICTED ACCESS</span>
                        <h3 class="text-slate-900 font-extrabold text-lg">Mode Maintenance SEDANG AKTIF</h3>
                    </div>
                    <p class="text-slate-600 text-xs md:text-sm leading-relaxed">Website saat ini ditutup untuk pengunjung umum & pengguna biasa. HANYA Administrator yang dapat login dan mengelola sistem.</p>
                </div>
            </div>
            <button onclick="toggleMaintenanceQuick()" class="bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black py-3 px-6 rounded-xl text-sm transition shadow-lg flex items-center gap-2 shrink-0 cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"></path></svg>
                Matikan Maintenance Mode
            </button>
        </div>
        ` : `
        <div class="mb-8 p-5 md:p-6 rounded-3xl bg-emerald-50 border border-emerald-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="flex items-start md:items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-600/30">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <div>
                    <div class="flex items-center gap-2 mb-1 flex-wrap">
                        <span class="bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-sm">LIVE / NORMAL</span>
                        <h3 class="text-slate-900 font-extrabold text-lg">Website Beroperasi Normal (Publik)</h3>
                    </div>
                    <p class="text-slate-600 text-xs md:text-sm leading-relaxed">Website dapat diakses secara publik dan seluruh pengguna dapat melakukan login, transaksi QRIS, serta order VPN secara normal.</p>
                </div>
            </div>
            <button onclick="toggleMaintenanceQuick()" class="bg-white hover:bg-slate-100 active:scale-95 text-slate-800 border-2 border-slate-300 font-black py-3 px-6 rounded-xl text-sm transition shadow-sm flex items-center gap-2 shrink-0 cursor-pointer">
                <span class="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
                Aktifkan Maintenance Mode
            </button>
        </div>
        `}
        
        <!-- Action Control Bar -->
        <div class="flex flex-wrap gap-4 mb-8 border-b border-slate-200 pb-8">
            <button onclick="toggleMaintenanceQuick()" class="${appSettings.maintenance_mode ? 'bg-rose-600 hover:bg-rose-500 ring-4 ring-rose-200' : 'bg-slate-800 hover:bg-slate-700'} text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                Maintenance: ${appSettings.maintenance_mode ? '🔴 AKTIF (ON)' : '🟢 NONAKTIF (OFF)'}
            </button>
            <button onclick="openSettingsModal()" class="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                Konfigurasi Sistem
            </button>
            <button onclick="openBroadcastModal()" class="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path></svg>
                Broadcast
            </button>
<button onclick="openTokoGorontaloModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center gap-3 cursor-pointer">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                Toko Gorontalo (PPOB)
            </button>
<button onclick="openTicketManagerModal()" class="bg-teal-600 hover:bg-teal-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center gap-3 relative">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                Manajemen Tiket
                <span id="ticketBadge" class="absolute -top-2 -right-2 bg-sky-500 text-white text-xs px-2 py-0.5 rounded-full hidden animate-pulse">0</span>
            </button>
            <button onclick="openGlobalTransactionsModal()" class="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                Global Transaksi
            </button>
            <button onclick="openStatsDashboardModal()" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                Dashboard Statistik
            </button>
        </div>

<!-- Manajemen Pengguna (Dengan Pagination) -->
        <div class="bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl mt-10 overflow-hidden">
            <button onclick="toggleSection('sectionUser', 'iconUser')" class="w-full flex justify-between items-center p-6 md:p-8 bg-gray-800 hover:bg-gray-700 transition">
                <h2 class="text-base font-bold text-white" id="userTotalHeader">\u{1F465} Manajemen Pengguna (Menghitung...)</h2>
                <svg id="iconUser" class="w-6 h-6 text-gray-400 transform transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            <div id="sectionUser" class="hidden p-6 md:p-8 pt-0">
                <div class="flex flex-col md:flex-row justify-end items-start md:items-center mb-6 mt-4 gap-4">
                    <input type="text" id="searchUser" placeholder="Cari email atau nama..." class="bg-gray-900 border border-gray-600 rounded-xl p-3 text-white w-full md:w-72 focus:ring-2 focus:ring-sky-500 outline-none" onkeyup="filterUsers()">
                </div>
                <div class="overflow-x-auto rounded-xl border border-gray-700">
                    <table class="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                        <thead class="bg-gray-900 text-gray-400 border-b border-gray-700">
                            <tr>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs">Email</th>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs">Nama</th>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs">Saldo</th>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs">Status</th>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="userTableBody" class="divide-y divide-gray-800">
                            <tr><td colspan="5" class="p-8 text-center text-cyan-400 animate-pulse">Memuat data pengguna...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                    <span id="userPageInfo" class="text-sm text-gray-400 font-mono">Halaman 1 dari 1</span>
                    <div class="flex gap-2">
                        <button onclick="changeUserPage(-1)" id="btnPrevUser" class="bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-xl transition shadow disabled:opacity-50 disabled:cursor-not-allowed">Sebelumnya</button>
                        <button onclick="changeUserPage(1)" id="btnNextUser" class="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2 rounded-xl transition shadow disabled:opacity-50 disabled:cursor-not-allowed">Selanjutnya</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Backup & Restore Database Section -->
        <div class="bg-white rounded-3xl border border-slate-200 shadow-sm mt-10 mb-8 overflow-hidden">
            <button onclick="toggleSection('sectionBackup', 'iconBackup')" class="w-full flex justify-between items-center p-6 md:p-8 bg-slate-50 hover:bg-slate-100/80 transition text-left cursor-pointer border-b border-slate-100">
                <div class="flex items-center gap-3.5">
                    <div class="w-10 h-10 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/20 font-bold text-lg">
                        \u{1F4BE}
                    </div>
                    <div>
                        <h2 class="text-base md:text-lg font-extrabold text-slate-900 tracking-tight">Pusat Backup & Auto-Backup Database</h2>
                        <p class="text-xs text-slate-500 font-normal mt-0.5">Cadangkan database, atur jadwal otomatis ke Telegram, atau pulihkan data sistem.</p>
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${backupFreq > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                        <span class="w-2 h-2 rounded-full ${backupFreq > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}"></span>
                        Auto-Backup: ${backupFreq > 0 ? (backupFreq === 1 ? '24x Sehari (Tiap 1 Jam)' : (backupFreq === 2 ? '12x Sehari (Tiap 2 Jam)' : (backupFreq === 4 ? '6x Sehari (Tiap 4 Jam)' : (backupFreq === 6 ? '4x Sehari (Tiap 6 Jam)' : (backupFreq === 12 ? '2x Sehari (Tiap 12 Jam)' : '1x Sehari (Tiap 24 Jam)'))))) : 'Nonaktif'}
                    </span>
                    <svg id="iconBackup" class="w-6 h-6 text-slate-400 transform transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </button>

            <div id="sectionBackup" class="hidden p-6 md:p-8 space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <!-- KARTU 1: Backup Manual -->
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition shadow-sm">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-lg">\u{1F4E4}</span>
                                <h3 class="font-extrabold text-slate-900 text-sm md:text-base">Ekspor Data (Manual)</h3>
                            </div>
                            <p class="text-xs text-slate-600 leading-relaxed mb-4">
                                Unduh seluruh data SQLite ke file JSON, atau kirim langsung laporan rekap dan backup ke Telegram sekarang.
                            </p>
                        </div>
                        <div class="space-y-2.5 mt-auto">
                            <button onclick="downloadBackup()" class="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                                <svg class="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                Download Backup.json
                            </button>
                            <button onclick="backupToTelegram()" id="btnBackupTg" class="w-full bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 cursor-pointer">
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                                Backup Sekarang ke Telegram
                            </button>
                        </div>
                    </div>

                    <!-- KARTU 2: Auto-Backup Terjadwal ke Telegram -->
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition shadow-sm">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-2">
                                    <span class="text-lg">\u23F0</span>
                                    <h3 class="font-extrabold text-slate-900 text-sm md:text-base">Auto-Backup Telegram</h3>
                                </div>
                                <span id="autoBackupBadge" class="text-[10px] font-extrabold px-2 py-0.5 rounded-full ${backupFreq > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}">
                                    ${backupFreq > 0 ? 'AKTIF' : 'OFF'}
                                </span>
                            </div>
                            <p class="text-xs text-slate-600 leading-relaxed mb-3">
                                File database dan rekap saldo akan otomatis dikirim ke Telegram sesuai frekuensi yang Anda tentukan:
                            </p>
                            <div class="space-y-2.5">
                                <div>
                                    <label class="block text-[11px] font-bold text-slate-700 mb-1">Frekuensi Pengiriman:</label>
                                    <select id="autoBackupFrequencySelect" class="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 font-bold focus:border-sky-500 focus:outline-none">
                                        <option value="1" ${backupFreq === 1 ? 'selected' : ''}>\u26A1 24 kali sehari (Setiap 1 Jam)</option>
                                        <option value="2" ${backupFreq === 2 ? 'selected' : ''}>\u{1F504} 12 kali sehari (Setiap 2 Jam)</option>
                                        <option value="4" ${backupFreq === 4 ? 'selected' : ''}>\u{1F504} 6 kali sehari (Setiap 4 Jam)</option>
                                        <option value="6" ${backupFreq === 6 ? 'selected' : ''}>\u{1F504} 4 kali sehari (Setiap 6 Jam)</option>
                                        <option value="12" ${backupFreq === 12 ? 'selected' : ''}>\u{1F504} 2 kali sehari (Setiap 12 Jam)</option>
                                        <option value="24" ${backupFreq === 24 ? 'selected' : ''}>\u{1F4C5} 1 kali sehari (Setiap 24 Jam)</option>
                                        <option value="0" ${backupFreq === 0 ? 'selected' : ''}>\u274C Nonaktif (Hanya Manual)</option>
                                    </select>
                                </div>
                                <div class="p-2.5 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1">
                                    <div class="flex justify-between">
                                        <span>Status Bot:</span>
                                        <b class="text-slate-800 font-mono">${appSettings.telegram_bot_token ? 'Tersedia \u2705' : 'Belum Diisi \u274C'}</b>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>Target ID:</span>
                                        <b class="text-slate-800 font-mono truncate max-w-[130px]">${appSettings.telegram_channel_id || '-'}</b>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="mt-4">
                            <button onclick="saveAutoBackupSchedule()" id="btnSaveAutoBackup" class="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                                Simpan Jadwal Auto-Backup
                            </button>
                        </div>
                    </div>

                    <!-- KARTU 3: Impor / Restore Data -->
                    <div class="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between hover:border-slate-300 transition shadow-sm">
                        <div>
                            <div class="flex items-center gap-2 mb-2">
                                <span class="text-lg">📥</span>
                                <h3 class="font-extrabold text-slate-900 text-sm md:text-base">Impor Data (Restore)</h3>
                            </div>
                            <p class="text-xs text-slate-600 leading-relaxed mb-2.5">
                                Kembalikan seluruh isi database dari file cadangan JSON yang pernah diunduh.
                            </p>
                            <div class="p-2.5 bg-amber-50 border border-amber-200 rounded-xl mb-3 text-[11px] text-amber-800 leading-relaxed">
                                ⚠️ <b>PERINGATAN:</b> Data saat ini akan ditimpa dengan data dari file backup.
                            </div>
                        </div>
                        ${isCurrentSuperAdmin ? `
                        <div class="space-y-2.5 mt-auto">
                            <input type="file" id="restoreFile" accept=".json" class="block w-full text-xs text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300 transition cursor-pointer bg-white rounded-xl p-1.5 border border-slate-300">
                            <button onclick="restoreBackup()" id="btnRestore" class="w-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-bold py-2.5 px-3 rounded-xl transition text-xs shadow-md shadow-rose-600/20 cursor-pointer">
                                Pulihkan Database
                            </button>
                        </div>` : `
                        <div class="p-3.5 bg-slate-100 border border-slate-200 rounded-xl text-center flex flex-col items-center gap-1.5 mt-auto">
                            <span class="text-base">🔒</span>
                            <span class="font-bold text-slate-700 text-xs">Khusus Super Admin</span>
                            <span class="text-[11px] text-slate-500 leading-tight">Fitur Restore Database hanya dapat diakses oleh Pemilik / Super Admin untuk mencegah penghapusan data tanpa izin.</span>
                        </div>`}
                    </div>

                </div>

                <!-- Footer Informasi Status Database -->
                <div class="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
                    <div class="flex items-center gap-2">
                        <span>\u2139\uFE0F <b>Status Database:</b> Seluruh tabel & kolom SQLite otomatis diverifikasi via <code class="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">schema.sql</code> setiap server restart. Inisialisasi manual umumnya tidak diperlukan lagi.</span>
                    </div>
                    <button onclick="initDatabaseSchema()" id="btnInitDb" class="text-slate-600 hover:text-sky-600 font-bold underline transition text-xs cursor-pointer shrink-0">
                        Cek & Sinkron Skema Manual
                    </button>
                </div>
            </div>
        </div>

    <!-- Modal Dashboard Statistik -->
    <div id="statsDashboardModal" class="fixed inset-0 bg-black/80 hidden z-[100] flex items-center justify-center p-3 md:p-4 backdrop-blur-sm" onclick="if(event.target === this) closeStatsDashboardModal()">
        <div class="bg-gray-900 p-4 md:p-6 rounded-[2rem] w-full max-w-6xl max-h-[96vh] flex flex-col border border-indigo-500/30 shadow-2xl shadow-indigo-950/20">
            <div class="flex justify-between items-center mb-3 border-b border-gray-800 pb-2.5">
                <div class="flex items-center gap-2">
                    <span class="text-indigo-400 text-lg">\u{1F4CA}</span>
                    <h3 class="text-lg md:text-xl font-black text-white tracking-tight">Dashboard & Statistik Penjualan</h3>
                </div>
                <div class="flex items-center gap-3">
                    <select id="statsMonthFilter" onchange="loadStatsDashboard(this.value)" class="bg-gray-950 border border-gray-850 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500 font-bold">
                        <!-- Akan diisi otomatis via JS -->
                    </select>
                    <button onclick="closeStatsDashboardModal()" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
                </div>
            </div>

            <div class="overflow-y-auto custom-scrollbar flex-grow pr-2.5 space-y-6">
                <!-- Grid Metrik Utama -->
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2">
                    <!-- Card 1: Total Users -->
                    <div class="bg-gray-950 p-4 rounded-2xl border border-gray-850 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Pengguna</span>
                        <div class="mt-2 flex items-baseline gap-1">
                            <span id="statTotalUsers" class="text-xl md:text-2xl font-black text-white font-mono">-</span>
                            <span class="text-[10px] text-gray-400">User</span>
                        </div>
                    </div>
                    <!-- Card 2: Liabilitas Saldo -->
                    <div class="bg-gray-950 p-4 rounded-2xl border border-gray-850 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Liabilitas Saldo</span>
                        <div class="mt-2 flex items-baseline gap-1">
                            <span id="statTotalBalance" class="text-lg md:text-xl font-black text-green-400 font-mono">-</span>
                        </div>
                    </div>
                    <!-- Card 3: Topup Otomatis -->
                    <div class="bg-gray-950 p-4 rounded-2xl border border-gray-850 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider" id="labelTripayIncome">Top-up QRIS Otomatis (Bulan Ini)</span>
                        <div class="mt-2 flex items-baseline gap-1">
                            <span id="statTripayIncome" class="text-lg md:text-xl font-black text-indigo-400 font-mono">-</span>
                        </div>
                    </div>
                    <!-- Card 3b: Topup Otomatis (GoPay) -->
                    <div class="bg-gray-950 p-4 rounded-2xl border border-gray-850 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider" id="labelVioletIncome">Top-up GoPay (Bulan Ini)</span>
                        <div class="mt-2 flex items-baseline gap-1">
                            <span id="statVioletIncome" class="text-lg md:text-xl font-black text-indigo-400 font-mono">-</span>
                        </div>
                    </div>
                    <!-- Card 4: Topup Manual (Admin) -->
                    <div class="bg-gray-950 p-4 rounded-2xl border border-gray-850 flex flex-col justify-between hover:border-indigo-500/20 transition-all duration-300">
                        <span class="text-[10px] font-bold text-gray-500 uppercase tracking-wider" id="labelManualIncome">Top-up Manual (Bulan Ini)</span>
                        <div class="mt-2 flex items-baseline gap-1">
                            <span id="statManualIncome" class="text-lg md:text-xl font-black text-indigo-400 font-mono">-</span>
                        </div>
                    </div>
<!-- Card 8: Estimasi Profit Bersih -->
                    <div class="bg-gray-950 p-4 rounded-2xl border border-indigo-500/30 flex flex-col justify-between bg-indigo-950/10 hover:border-indigo-500/50 transition-all duration-300">
                        <span class="text-[10px] font-bold text-indigo-400 uppercase tracking-wider" id="labelNetProfit">Estimasi Net Profit (Bulan Ini)</span>
                        <div class="mt-2 flex items-baseline gap-1">
                            <span id="statNetProfit" class="text-lg md:text-xl font-black text-green-400 font-mono">-</span>
                        </div>
                    </div>
                </div>

                <!-- Grafik Batang/Garis Transaksi Harian -->
                <div class="bg-gray-950 p-4 rounded-[1.5rem] border border-gray-850">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Tren Transaksi Harian
                    </h4>
                    <div class="w-full relative h-48 md:h-64">
                        <canvas id="statsDailyChart"></canvas>
                    </div>
                </div>

</div>
        </div>
    </div>

    <!-- Modal Konfigurasi -->
    <div id="settingsModal" class="fixed inset-0 bg-black/80 hidden z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onclick="if(event.target === this) closeSettingsModal()">
        <div class="bg-gray-900 p-6 md:p-8 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-sky-600/30 shadow-2xl">
            <div class="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h3 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">\u2699\uFE0F Konfigurasi Sistem</h3>
                <button onclick="closeSettingsModal()" class="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <div class="overflow-y-auto custom-scrollbar pr-3 flex-grow">
                <form id="settingsForm" class="space-y-5">
                    
                    <div class="bg-gray-950 p-4 rounded-xl border border-gray-800 mb-4">
                        <h4 class="text-sm font-bold text-white mb-3">Metode Top Up Saldo & Fitur</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Transfer Manual (BSI, Shopee, DANA)</label>
                                <select id="setQrisManualActive" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none font-bold">
                                    <option value="true" ${isQrisManualOn ? "selected" : ""}>🟢 ON - Aktif (Transfer Manual)</option>
                                    <option value="false" ${!isQrisManualOn ? "selected" : ""}>🔴 OFF - Mati</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">QRIS Otomatis (ShopeePay)</label>
                                <select id="setShopeePayActive" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none font-bold">
                                    <option value="false" ${!isShopeePayOn ? "selected" : ""}>🔴 OFF - Mati</option>
                                    <option value="true" ${isShopeePayOn ? "selected" : ""}>🟢 ON - Aktif</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">GoPay (AutoGoPay)</label>
                                <select id="setGoPayActive" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none font-bold">
                                    <option value="false" ${!isGoPayOn ? "selected" : ""}>🔴 OFF - Mati</option>
                                    <option value="true" ${isGoPayOn ? "selected" : ""}>🟢 ON - Aktif</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Asisten AI Chat</label>
                                <select id="setAiActive" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none font-bold">
                                    <option value="true" ${appSettings.ai_chat_active !== false ? "selected" : ""}>🟢 ON - Aktif</option>
                                    <option value="false" ${appSettings.ai_chat_active === false ? "selected" : ""}>🔴 OFF - Mati</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Provider AI</label>
                                <select id="setAiProvider" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none font-bold">
                                    <option value="deepseek" ${appSettings.ai_provider === "deepseek" || !appSettings.ai_provider || appSettings.ai_provider === "cloudflare" ? "selected" : ""}>🐳 DeepSeek AI (Rekomendasi - Cepat &amp; Pintar)</option>
                                    <option value="gemini" ${appSettings.ai_provider === "gemini" ? "selected" : ""}>♊ Google Gemini Flash</option>
                                    <option value="cloudflare" ${appSettings.ai_provider === "cloudflare" ? "selected" : ""}>☁️ Cloudflare (Llama-3)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Batas Chat per Jam (Hemat Token)</label>
                                <input type="number" id="setAiHourlyLimit" value="${appSettings.ai_hourly_limit || 10}" min="1" max="100" class="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none font-bold" placeholder="10">
                            </div>
                        </div>

                        <!-- Pengaturan Akun Transfer Manual AwanPulsa -->
                        <div class="mt-4 pt-4 border-t border-gray-800 space-y-3">
                            <h5 class="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                <span>💳</span> Nomor Rekening &amp; E-Wallet Transfer Manual
                            </h5>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-900/60 p-3.5 rounded-xl border border-gray-800">
                                <div>
                                    <label class="block text-[11px] font-bold text-gray-400 mb-1">🏦 No. Rekening Bank BSI</label>
                                    <input type="text" id="setBsiRek" value="${appSettings.manual_bsi_rek || '7293609009'}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-gray-400 mb-1">Atas Nama BSI</label>
                                    <input type="text" id="setBsiName" value="${appSettings.manual_bsi_name || 'sutroni soga'}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-gray-400 mb-1">📱 Nomor DANA</label>
                                    <input type="text" id="setDanaRek" value="${appSettings.manual_dana_rek || '08979527685'}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-gray-400 mb-1">Atas Nama DANA</label>
                                    <input type="text" id="setDanaName" value="${appSettings.manual_dana_name || 'sutroni soga'}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-gray-400 mb-1">🛍️ Nomor Shopee / ShopeePay</label>
                                    <input type="text" id="setShopeeRek" value="${appSettings.manual_shopee_rek || '08979527685'}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-[11px] font-bold text-gray-400 mb-1">Atas Nama Shopee</label>
                                    <input type="text" id="setShopeeName" value="${appSettings.manual_shopee_name || 'hasnasyukur'}" class="w-full bg-gray-950 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-medium focus:ring-2 focus:ring-sky-500 outline-none">
                                </div>
                            </div>
                        </div>

                        <div class="mt-3 pt-3 border-t border-gray-800 space-y-3">
                            <div>
                                <label class="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">AutoGoPay API Key (Opsional / Override)</label>
                                <input type="text" id="setAgpApiKey" value="${appSettings.autogopay_api_key || ""}" placeholder="agp_1bae647d0c0c25307757c1a60afa7b06..." class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none">
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">ShopeePay QRIS Static</label>
                                    <input type="text" id="setShopeeQrisStatic" value="${appSettings.shopeepay_qris_static || ""}" placeholder="00020101021126610016ID.CO.SHOPEE..." class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">GoPay QRIS Static</label>
                                    <input type="text" id="setGopayQrisStatic" value="${appSettings.gopay_qris_static || ""}" placeholder="00020101021126610014COM.GO-JEK..." class="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 outline-none">
                                </div>
                            </div>
                        </div>
                    </div>

                    
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Telegram Bot Token</label>
                            <input type="text" id="setTgToken" value="${appSettings.telegram_bot_token || ""}" placeholder="123456:ABC-DEF..." class="w-full bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Telegram Channel ID</label>
                            <input type="text" id="setTgChatId" value="${appSettings.telegram_channel_id || ""}" placeholder="@srpcomlogcf" class="w-full bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="col-span-2 md:col-span-1">
                            <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Frekuensi Auto Backup (Jam)</label>
                            <select id="setBackupFreq" class="w-full bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-white text-sm focus:ring-2 focus:ring-green-500 outline-none font-bold">
                                <option value="1" ${backupFreq === 1 ? "selected" : ""}>\u26A1 24 kali sehari (Tiap 1 Jam)</option>
                                <option value="2" ${backupFreq === 2 ? "selected" : ""}>\u{1F504} 12 kali sehari (Tiap 2 Jam)</option>
                                <option value="4" ${backupFreq === 4 ? "selected" : ""}>\u{1F504} 6 kali sehari (Tiap 4 Jam)</option>
                                <option value="6" ${backupFreq === 6 ? "selected" : ""}>\u{1F504} 4 kali sehari (Tiap 6 Jam)</option>
                                <option value="12" ${backupFreq === 12 ? "selected" : ""}>\u{1F504} 2 kali sehari (Tiap 12 Jam)</option>
                                <option value="24" ${backupFreq === 24 ? "selected" : ""}>\u{1F4C5} 1 kali sehari (Tiap 24 Jam - Standar)</option>
                                <option value="0" ${backupFreq === 0 ? "selected" : ""}>\u274C Nonaktif (Hanya Manual)</option>
                            </select>
                        </div>
                        <div class="col-span-2 md:col-span-1">
                            <label class="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Mode Maintenance</label>
                            <select id="setMaintenance" class="w-full bg-gray-950 border border-gray-700 rounded-xl p-3.5 text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none font-bold">
                                <option value="false" ${!appSettings.maintenance_mode ? "selected" : ""}>\u{1F7E2} OFF - Normal</option>
                                <option value="true" ${appSettings.maintenance_mode ? "selected" : ""}>\u{1F534} ON - Maintenance</option>
                            </select>
                        </div>
                    </div>
${isCurrentSuperAdmin ? `
<button type="submit" id="btnSaveSettings" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 rounded-xl shadow-lg transition text-lg mt-4 cursor-pointer">Simpan Konfigurasi</button>
` : `
<div class="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-amber-300 text-xs font-bold flex items-center justify-center gap-2">
    <svg class="w-5 h-5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
    <span>Mode Baca (Read-Only): Hanya <b>Super Admin</b> yang memiliki hak akses untuk mengubah konfigurasi sistem &amp; API Key.</span>
</div>
`}
                </form>
            </div>
        </div>
    </div>


    <!-- Modal Broadcast -->
    <div id="broadcastModal" class="fixed inset-0 bg-black/80 hidden z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onclick="if(event.target === this) closeBroadcastModal()">
        <div class="bg-gray-900 p-6 md:p-8 rounded-3xl w-full max-w-2xl border border-gray-700 shadow-2xl">
            <div class="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h3 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">\u{1F4E2} Kirim Pesan Inbox</h3>
                <button onclick="closeBroadcastModal()" class="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <form id="adminForm" class="space-y-5">
                <div>
                    <label class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">Target Penerima</label>
                    <select id="targetType" class="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-yellow-500 outline-none" onchange="document.getElementById('emailInputContainer').classList.toggle('hidden', this.value==='all')">
                        <option value="all">Kirim Broadcast (Semua User)</option>
                        <option value="specific">Kirim Spesifik (1 User)</option>
                    </select>
                </div>
                <div id="emailInputContainer" class="hidden">
                    <input type="email" id="targetEmail" placeholder="Alamat Email Tujuan" class="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-yellow-500 outline-none">
                </div>
                <div>
                    <label class="block text-sm font-bold text-gray-400 mb-2 uppercase tracking-wide">Judul & Isi Pesan</label>
                    <input type="text" id="msgTitle" required placeholder="Judul Pesan" class="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-white mb-4 focus:ring-2 focus:ring-yellow-500 outline-none">
                    <textarea id="msgBody" required rows="5" placeholder="Ketik isi pesan di sini (Bisa format HTML)..." class="w-full bg-gray-950 border border-gray-700 rounded-xl p-4 text-white custom-scrollbar focus:ring-2 focus:ring-yellow-500 outline-none"></textarea>
                </div>
                <button type="submit" id="btnSendMsg" class="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl shadow-lg transition text-lg mt-4">Kirim Pesan Sekarang</button>
            </form>
        </div>
    </div>

    <!-- Modal List Tiket Bantuan -->
    <div id="ticketManagerModal" class="fixed inset-0 bg-black/80 hidden z-[100] flex items-center justify-center p-3 md:p-4 backdrop-blur-sm" onclick="if(event.target === this) closeTicketManagerModal()">
        <div class="bg-gray-900 p-4 md:p-5 rounded-2xl w-full max-w-6xl max-h-[95vh] flex flex-col border border-teal-500/30 shadow-2xl">
            <div class="flex justify-between items-center mb-3.5 border-b border-gray-800 pb-2.5">
                <h3 class="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">\u{1F3AB} Manajemen Tiket Bantuan</h3>
                <button onclick="closeTicketManagerModal()" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div class="flex flex-col md:flex-row gap-3 mb-3">
               <select id="filterTicketStatus" class="bg-gray-950 border border-gray-700 rounded-lg p-2 text-white focus:ring-2 focus:ring-teal-500 outline-none font-bold text-xs" onchange="loadAdminTickets()">
                   <option value="ALL">Semua Status Tiket</option>
                   <option value="OPEN">\u{1F534} OPEN (Butuh Balasan)</option>
                   <option value="PENDING">\u{1F7E1} PENDING (Menunggu User)</option>
                   <option value="CLOSED">\u26AB CLOSED (Selesai)</option>
               </select>
               <input type="text" id="searchTicketAdmin" placeholder="Cari ID tiket atau email..." class="bg-gray-950 border border-gray-700 rounded-lg p-2 text-white flex-grow focus:ring-2 focus:ring-teal-500 outline-none font-mono text-xs" onkeyup="debounceLoadAdminTickets()">
            </div>
            <div class="overflow-y-auto custom-scrollbar pr-3 flex-grow border border-gray-800 rounded-xl bg-gray-950">
                <table class="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                    <thead class="bg-gray-900 text-gray-400 border-b border-gray-800 sticky top-0 z-10">
                        <tr>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">ID Tiket</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Email User</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Kategori & Judul</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs text-center">Status</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody id="ticketManagerBody" class="divide-y divide-gray-800">
                        <tr><td colspan="5" class="p-8 text-center text-gray-500">Memuat data tiket...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <!-- Pagination Bar for Admin Tickets -->
            <div class="mt-4 p-4 bg-gray-950 border border-gray-800 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                <button id="btnPrevAdminTicket" onclick="loadAdminTickets(currentAdminTicketPage - 1)" class="bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Sebelum
                </button>
                <span id="adminTicketPageInfo" class="text-xs text-gray-400 font-medium">Halaman 1 dari 1</span>
                <button id="btnNextAdminTicket" onclick="loadAdminTickets(currentAdminTicketPage + 1)" class="bg-gray-800 hover:bg-gray-750 border border-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                    Berikut <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
    </div>

    <!-- Modal View Chat Tiket -->
    <div id="ticketViewModal" class="fixed inset-0 bg-black/90 hidden z-[110] flex items-center justify-center p-4 backdrop-blur-md" onclick="if(event.target === this) closeTicketViewModal()">
        <div class="bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[95vh] flex flex-col border border-gray-700 shadow-2xl">
            <div class="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-950 rounded-t-3xl">
                <div>
                    <h3 class="text-xl font-bold text-white flex items-center gap-2" id="ticketViewTitle">#TCK-XXXXX</h3>
                    <p class="text-xs text-gray-400 mt-1" id="ticketViewSubtitle">Kategori - Email User</p>
                </div>
                <div class="flex items-center gap-3">
                    <span id="ticketViewStatus" class="px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider">STATUS</span>
                    <button onclick="closeTicketViewModal()" class="text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-xl transition">&times;</button>
                </div>
            </div>
            
            <div id="ticketChatContainer" class="flex-grow p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-[#0b1120] bg-opacity-50">
                <!-- Chat bubbles rendered here -->
            </div>
            
            <div class="p-4 border-t border-gray-800 bg-gray-950 rounded-b-3xl">
                <div id="ticketReplyArea" class="flex gap-3">
                    <input type="hidden" id="replyTicketId" value="">
                    <textarea id="replyTicketMessage" rows="2" placeholder="Ketik balasan Anda di sini..." class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-teal-500 outline-none custom-scrollbar text-sm resize-none"></textarea>
                    <div class="flex flex-col gap-2 shrink-0">
                        <button onclick="sendTicketReplyAdmin()" id="btnSendReply" class="bg-teal-600 hover:bg-teal-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow flex-grow">Kirim Balasan</button>
                        <button onclick="closeTicketAdmin()" id="btnCloseTicketAdmin" class="bg-gray-700 hover:bg-sky-600 text-gray-300 hover:text-white text-xs font-bold px-5 py-2 rounded-xl transition border border-gray-600 hover:border-sky-500">Tutup Tiket</button>
                    </div>
                </div>
                <div id="ticketClosedArea" class="hidden text-center p-3">
                    <p class="text-sm text-gray-500 font-bold">\u{1F512} Tiket ini telah ditutup dan tidak dapat dibalas kembali.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Modal Inbox User -->
    <div id="inboxModal" class="fixed inset-0 bg-black/80 hidden z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onclick="if(event.target === this) closeInboxModal()">
        <div class="bg-gray-900 p-6 md:p-8 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col border border-gray-700 shadow-2xl">
            <div class="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
                <h3 class="text-2xl font-bold text-white tracking-tight" id="inboxModalTitle">Inbox User</h3>
                <button onclick="closeInboxModal()" class="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
            </div>
            <div id="inboxModalContent" class="overflow-y-auto space-y-4 custom-scrollbar pr-3 flex-grow">
                <p class="text-gray-500 text-center py-10 font-medium">Memuat pesan...</p>
            </div>
        </div>
    </div>

    <!-- Modal Riwayat Mutasi User -->
    <div id="mutasiUserModal" class="fixed inset-0 bg-black/80 hidden z-[110] flex items-center justify-center p-3 md:p-4 backdrop-blur-sm" onclick="if(event.target === this) closeUserMutasiModal()">
        <div class="bg-gray-900 p-4 md:p-5 rounded-2xl w-full max-w-5xl max-h-[95vh] flex flex-col border border-green-500/30 shadow-2xl">
            <div class="flex justify-between items-center mb-3 border-b border-gray-800 pb-2">
                <h3 class="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2" id="mutasiUserModalTitle">\u{1F4B3} Histori Saldo: </h3>
                <button onclick="closeUserMutasiModal()" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div class="overflow-y-auto custom-scrollbar flex-grow border border-gray-800 rounded-xl bg-gray-950">
                <table class="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                    <thead class="bg-gray-900 text-gray-400 border-b border-gray-800 sticky top-0 z-10">
                        <tr>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Tanggal</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Deskripsi</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs text-right">Nominal</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs text-right">Sisa Saldo</th>
                        </tr>
                    </thead>
                    <tbody id="mutasiUserTableBody" class="divide-y divide-gray-800">
                        <tr><td colspan="4" class="p-8 text-center text-gray-500">Memuat data...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Modal Riwayat Transaksi Global -->
    <div id="globalTransactionsModal" class="fixed inset-0 bg-black/80 hidden z-[100] flex items-center justify-center p-3 md:p-4 backdrop-blur-sm" onclick="if(event.target === this) closeGlobalTransactionsModal()">
        <div class="bg-gray-900 p-4 md:p-5 rounded-2xl w-full max-w-7xl max-h-[96vh] flex flex-col border border-orange-500/30 shadow-2xl shadow-orange-950/20">
            <div class="flex justify-between items-center mb-3 border-b border-gray-800 pb-2">
                <h3 class="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <svg class="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                    Riwayat Transaksi Global
                </h3>
                <button onclick="closeGlobalTransactionsModal()" class="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <div class="flex flex-col md:flex-row gap-3 mb-3">
               <input type="text" id="searchGlobalTransactions" placeholder="Cari email atau deskripsi..." class="bg-gray-950 border border-gray-700 rounded-lg p-2 text-white flex-grow focus:ring-2 focus:ring-orange-500 outline-none font-mono text-xs" onkeyup="filterGlobalTransactions()">
            </div>
            <div class="overflow-y-auto custom-scrollbar flex-grow border border-gray-800 rounded-xl bg-gray-950">
                <table class="w-full text-left text-sm text-gray-300 whitespace-nowrap">
                    <thead class="bg-gray-900 text-gray-400 border-b border-gray-800 sticky top-0 z-10">
                        <tr>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Tanggal</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Email User</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Deskripsi</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs text-right">Nominal</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs text-right">Sisa Saldo</th>
                        </tr>
                    </thead>
                    <tbody id="globalTransactionsTableBody" class="divide-y divide-gray-800">
                        <tr><td colspan="5" class="p-8 text-center text-gray-500">Memuat data transaksi...</td></tr>
                    </tbody>
                </table>
            </div>
            <div class="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
                <span id="globalTransactionsPageInfo" class="text-sm text-gray-400 font-mono">Halaman 1 dari 1</span>
                <div class="flex gap-2">
                    <button onclick="changeGlobalTransactionsPage(-1)" id="btnPrevGlobalTransactions" class="bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-xl transition shadow disabled:opacity-50 disabled:cursor-not-allowed">Sebelumnya</button>
                    <button onclick="changeGlobalTransactionsPage(1)" id="btnNextGlobalTransactions" class="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition shadow disabled:opacity-50 disabled:cursor-not-allowed">Selanjutnya</button>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Serialisasi Server Aktif untuk Global Search
        const leActiveServers = ${JSON.stringify(appSettings.servers || [])};

        // Util Escape Client Side
        function escapeHtmlClient(str) {
            if (!str) return '';
            return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
        }

        // Kontrol Cepat Mode Maintenance
        async function toggleMaintenanceQuick() {
            const isCurrentlyOn = ${appSettings.maintenance_mode === true};
            const confirmTitle = isCurrentlyOn ? 'Matikan Mode Maintenance?' : 'Aktifkan Mode Maintenance?';
            const confirmText = isCurrentlyOn 
                ? 'Website akan kembali dibuka untuk publik. Semua pengguna biasa dan pengunjung dapat mengakses serta login ke website secara normal.' 
                : 'Website akan terkunci dan menampilkan halaman pemeliharaan (Maintenance). Pengguna biasa TIDAK BISA login. HANYA Administrator yang dapat mengakses website.';
            
            const result = await swalDark.fire({
                title: confirmTitle,
                text: confirmText,
                icon: isCurrentlyOn ? 'question' : 'warning',
                showCancelButton: true,
                confirmButtonColor: isCurrentlyOn ? '#10b981' : '#e11d48',
                cancelButtonColor: '#64748b',
                confirmButtonText: isCurrentlyOn ? 'Ya, Buka Akses Publik' : 'Ya, Aktifkan Maintenance',
                cancelButtonText: 'Batal'
            });

            if (result.isConfirmed) {
                swalDark.fire({
                    title: 'Memproses...',
                    text: 'Sedang memperbarui status pemeliharaan sistem...',
                    allowOutsideClick: false,
                    didOpen: () => { swalDark.showLoading(); }
                });

                try {
                    const res = await fetch('/api/admin/toggle-maintenance', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    if (data.success) {
                        await swalDark.fire({
                            title: 'Berhasil!',
                            text: data.maintenance_mode 
                                ? 'Mode Maintenance berhasil DIAKTIFKAN. Website kini dalam status pemeliharaan.' 
                                : 'Mode Maintenance berhasil DIMATIKAN. Website kembali beroperasi normal untuk publik.',
                            icon: 'success',
                            confirmButtonColor: '#0284c7'
                        });
                        window.location.reload();
                    } else {
                        swalDark.fire('Gagal', data.message || 'Gagal mengubah status maintenance.', 'error');
                    }
                } catch (e) {
                    swalDark.fire('Error', 'Terjadi kesalahan komunikasi dengan server.', 'error');
                }
            }
        }

        // Kontrol Modal & Hash Navigation
        function updateAdminUrlHash(newHash) {
            try {
                if (newHash) {
                    if (window.location.hash !== newHash) history.replaceState(null, '', newHash);
                } else {
                    if (window.location.hash) history.replaceState(null, '', window.location.pathname + (window.location.search || ''));
                }
            } catch(e) {}
        }

        function openSettingsModal() { 
            document.getElementById('settingsModal').classList.remove('hidden'); 
            updateAdminUrlHash('#settings');
        }
        function closeSettingsModal() { 
            document.getElementById('settingsModal').classList.add('hidden'); 
            if (window.location.hash === '#settings') updateAdminUrlHash('');
        }
        function openBroadcastModal() { 
            document.getElementById('broadcastModal').classList.remove('hidden'); 
            updateAdminUrlHash('#broadcast');
        }
        function closeBroadcastModal() { 
            document.getElementById('broadcastModal').classList.add('hidden'); 
            if (window.location.hash === '#broadcast') updateAdminUrlHash('');
        }
        function closeInboxModal() { document.getElementById('inboxModal').classList.add('hidden'); }
        function closeUserMutasiModal() { document.getElementById('mutasiUserModal').classList.add('hidden'); }
        function openGlobalTransactionsModal() { 
            document.getElementById('globalTransactionsModal').classList.remove('hidden'); 
            updateAdminUrlHash('#transactions');
            loadGlobalTransactions(1); 
        }
        function closeGlobalTransactionsModal() { 
            document.getElementById('globalTransactionsModal').classList.add('hidden'); 
            if (window.location.hash === '#transactions') updateAdminUrlHash('');
        }

        // --- DASHBOARD STATISTIK ---
        let statsChartInstance = null;

        function loadChartJsLibrary(callback) {
            if (typeof Chart !== 'undefined') {
                callback();
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
            script.onload = callback;
            document.head.appendChild(script);
        }

        window.openStatsDashboardModal = function() {
            document.getElementById('statsDashboardModal').classList.remove('hidden');
            updateAdminUrlHash('#stats');
            populateStatsMonthFilter();
            document.getElementById('statsMonthFilter').value = 'today';
            loadChartJsLibrary(() => {
                loadStatsDashboard('today');
            });
        }

        window.closeStatsDashboardModal = function() {
            document.getElementById('statsDashboardModal').classList.add('hidden');
            if (window.location.hash === '#stats') updateAdminUrlHash('');
        }

        function populateStatsMonthFilter() {
            const select = document.getElementById('statsMonthFilter');
            if (select.children.length > 0) return; // Sudah terpopulasi
            
            const months = [
                "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
                "Juli", "Agustus", "September", "Oktober", "November", "Desember"
            ];
            
            const today = new Date();
            let html = '<option value="today" selected>Hari Ini</option>' +
                       '<option value="this_week">Minggu Ini</option>' +
                       '<option value="this_month">Bulan Ini</option>';
            for (let i = 0; i < 12; i++) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthVal = String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
                const label = months[d.getMonth()] + ' ' + d.getFullYear();
                html += '<option value="' + monthVal + '">' + label + '</option>';
            }
            select.innerHTML = html;
        }

        window.loadStatsDashboard = async function(monthYear) {
            const loaderIds = ['statTotalUsers', 'statTotalBalance', 'statTripayIncome', 'statVioletIncome', 'statManualIncome', 'statNetProfit'];
            loaderIds.forEach(id => { const el = document.getElementById(id); if (el) el.innerText = '...'; });

            const filterSelect = document.getElementById('statsMonthFilter');
            const selectedLabel = filterSelect.options[filterSelect.selectedIndex]?.text || 'Hari Ini';

            document.getElementById('labelTripayIncome').innerText = 'Top-up QRIS Otomatis (' + selectedLabel + ')';
            document.getElementById('labelVioletIncome').innerText = 'Top-up GoPay (' + selectedLabel + ')';
            document.getElementById('labelManualIncome').innerText = 'Top-up Manual (' + selectedLabel + ')';
            document.getElementById('labelNetProfit').innerText = 'Estimasi Net Profit (' + selectedLabel + ')';

            try {
                const res = await fetch('/api/admin/dashboard-stats', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ month_year: monthYear })
                });
                const response = await res.json();
                if (!response.success) {
                    throw new Error(response.message || 'Gagal memuat statistik.');
                }

                const stats = response.data;

                document.getElementById('statTotalUsers').innerText = stats.total_users.toLocaleString('id-ID');
                document.getElementById('statTotalBalance').innerText = 'Rp ' + stats.total_balance.toLocaleString('id-ID');
                document.getElementById('statTripayIncome').innerText = 'Rp ' + stats.tripay_income.toLocaleString('id-ID');
                document.getElementById('statVioletIncome').innerText = 'Rp ' + stats.violet_income.toLocaleString('id-ID');
                document.getElementById('statManualIncome').innerText = 'Rp ' + stats.manual_income.toLocaleString('id-ID');
                document.getElementById('statNetProfit').innerText = 'Rp ' + stats.net_profit.toLocaleString('id-ID');

                renderStatsDailyChart(stats.daily_chart);

            } catch (e) {
                console.error("Dashboard Stats Error:", e);
                loaderIds.forEach(id => { const el = document.getElementById(id); if (el) el.innerText = 'Error'; });
                
            }
        }

        function renderStatsDailyChart(chartData) {
            const ctx = document.getElementById('statsDailyChart').getContext('2d');
            
            if (statsChartInstance) {
                statsChartInstance.destroy();
            }

            statsChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.labels,
                    datasets: [
                        {
                            label: 'Top Up',
                            data: chartData.topup,
                            borderColor: '#818cf8',
                            backgroundColor: 'rgba(129, 140, 248, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2,
                            pointBackgroundColor: '#818cf8',
                            pointRadius: 3
                        },
                        {
                            label: 'Belanja Saldo',
                            data: chartData.spending,
                            borderColor: '#f87171',
                            backgroundColor: 'rgba(248, 113, 113, 0.05)',
                            fill: true,
                            tension: 0.3,
                            borderWidth: 2,
                            pointBackgroundColor: '#f87171',
                            pointRadius: 3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#9ca3af',
                                font: { family: 'Plus Jakarta Sans', size: 10, weight: 'bold' }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += 'Rp ' + context.parsed.y.toLocaleString('id-ID');
                                    }
                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: '#6b7280', font: { size: 9, family: 'Plus Jakarta Sans' } }
                        },
                        y: {
                            grid: { color: 'rgba(255,255,255,0.03)' },
                            ticks: { 
                                color: '#6b7280', 
                                font: { size: 9, family: 'Plus Jakarta Sans' },
                                callback: function(value) {
                                    return 'Rp ' + (value >= 1000 ? (value/1000) + 'k' : value);
                                }
                            }
                        }
                    }
                }
            });
        }
        function openTicketManagerModal() { 
            document.getElementById('ticketManagerModal').classList.remove('hidden'); 
            updateAdminUrlHash('#tickets');
            loadAdminTickets(); 
        }
        function closeTicketManagerModal() { 
            document.getElementById('ticketManagerModal').classList.add('hidden'); 
            if (window.location.hash === '#tickets') updateAdminUrlHash('');
        }
        function closeTicketViewModal() { document.getElementById('ticketViewModal').classList.add('hidden'); loadAdminTickets(); }

        // Fungsi Toggle untuk Accordion Section
        function toggleSection(sectionId, iconId) {
            const sec = document.getElementById(sectionId);
            const icon = document.getElementById(iconId);
            if (sec.classList.contains('hidden')) {
                sec.classList.remove('hidden');
                icon.classList.add('rotate-180');
                if (sectionId === 'sectionUser') updateAdminUrlHash('#users');
            } else {
                sec.classList.add('hidden');
                icon.classList.remove('rotate-180');
                if (sectionId === 'sectionUser' && window.location.hash === '#users') updateAdminUrlHash('');
            }
        }

        // ==========================================
        // FITUR GLOBAL TRANSAKSI (MUTASI GLOBAL)
        // ==========================================
        let currentGlobalTrxPage = 1;
        const globalTrxPerPage = 50;
        let searchGlobalTrxTimeout;

        async function loadGlobalTransactions(page = 1) {
            currentGlobalTrxPage = page;
            const searchKeyword = document.getElementById('searchGlobalTransactions').value.trim();
            const tbody = document.getElementById('globalTransactionsTableBody');
            const pageInfo = document.getElementById('globalTransactionsPageInfo');
            const btnPrev = document.getElementById('btnPrevGlobalTransactions');
            const btnNext = document.getElementById('btnNextGlobalTransactions');

            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-orange-400 animate-pulse">Memuat riwayat transaksi global...</td></tr>';
            
            try {
                const res = await fetch('/api/admin/global-transactions', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page, limit: globalTrxPerPage, search: searchKeyword })
                });
                const data = await res.json();

                if (data.success) {
                    if (data.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">Tidak ada riwayat transaksi ditemukan.</td></tr>';
                    } else {
                        tbody.innerHTML = data.data.map(trx => {
                            const isMasuk = trx.type === 'IN';
                            const nominalClass = isMasuk ? 'text-green-400' : 'text-cyan-400';
                            const sign = isMasuk ? '+' : '-';
                            
                            let sisaSaldoText = '-';
                            if (trx.balance !== undefined && trx.balance !== null) {
                                sisaSaldoText = 'Rp ' + trx.balance.toLocaleString('id-ID');
                            }
                            
                            const dateParts = trx.created_at ? trx.created_at.split(', ') : ['', ''];
                            const dateHtml = dateParts[1] ? \`\${dateParts[0]}<br>\${dateParts[1]}\` : (trx.created_at || '-');
                            
                            return \`
                            <tr class="hover:bg-gray-800/50 transition border-b border-gray-800 last:border-0">
                                <td class="p-4 font-mono text-xs text-gray-500">\${dateHtml}</td>
                                <td class="p-4 font-mono text-xs text-cyan-400">\${escapeHtmlClient(trx.email)}</td>
                                <td class="p-4 text-white font-medium max-w-xs truncate whitespace-normal leading-snug text-[11px]" style="font-family: 'Arial Narrow', Arial, sans-serif;">\${escapeHtmlClient(trx.description)}</td>
                                <td class="p-4 font-mono font-bold text-right \${nominalClass}">\${sign} Rp \${trx.amount.toLocaleString('id-ID')}</td>
                                <td class="p-4 font-mono font-bold text-right text-gray-300">\${sisaSaldoText}</td>
                            </tr>\`;
                        }).join('');
                    }

                    pageInfo.innerText = \`Halaman \${data.page} dari \${data.totalPages || 1}\`;
                    btnPrev.disabled = data.page <= 1;
                    btnNext.disabled = data.page >= data.totalPages;
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-sky-400">Gagal mengambil data.</td></tr>';
                }
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-sky-400">Koneksi Error.</td></tr>';
            }
        }

        function changeGlobalTransactionsPage(direction) {
            loadGlobalTransactions(currentGlobalTrxPage + direction);
        }

        function filterGlobalTransactions() {
            clearTimeout(searchGlobalTrxTimeout);
            searchGlobalTrxTimeout = setTimeout(() => {
                loadGlobalTransactions(1);
            }, 500);
        }

        // ===============================================
        let currentAdminTicketPage = 1;
        const adminTicketsPerPage = 15;
        let searchAdminTicketTimeout;

        function debounceLoadAdminTickets() {
            clearTimeout(searchAdminTicketTimeout);
            searchAdminTicketTimeout = setTimeout(() => { loadAdminTickets(1); }, 500);
        }

        async function loadAdminTickets(page = 1) {
            currentAdminTicketPage = page;
            const tbody = document.getElementById('ticketManagerBody');
            const statusFilter = document.getElementById('filterTicketStatus').value;
            const searchKeyword = document.getElementById('searchTicketAdmin').value.trim();
            const pageInfo = document.getElementById('adminTicketPageInfo');
            const btnPrev = document.getElementById('btnPrevAdminTicket');
            const btnNext = document.getElementById('btnNextAdminTicket');
            
            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-teal-400 animate-pulse">Mengambil data tiket...</td></tr>';
            
            try {
                const res = await fetch('/api/admin/tickets', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: statusFilter, search: searchKeyword, page, limit: adminTicketsPerPage })
                });
                const data = await res.json();

                if (data.success) {
                    if (data.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">Tidak ada tiket ditemukan.</td></tr>';
                    } else {
                        tbody.innerHTML = data.data.map(t => {
                            let statusBadge = '';
                            if (t.status === 'OPEN') statusBadge = '<span class="bg-sky-500/20 text-cyan-400 border border-sky-500/30 text-[10px] px-2.5 py-1 rounded uppercase font-bold">OPEN</span>';
                            else if (t.status === 'PENDING') statusBadge = '<span class="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-[10px] px-2.5 py-1 rounded uppercase font-bold">PENDING</span>';
                            else statusBadge = '<span class="bg-gray-500/20 text-gray-400 border border-gray-500/30 text-[10px] px-2.5 py-1 rounded uppercase font-bold">CLOSED</span>';

                            return \`
                            <tr class="hover:bg-gray-800/50 transition">
                                <td class="p-4 font-mono text-xs text-cyan-400">\${t.id}</td>
                                <td class="p-4 text-sm text-gray-300">\${t.email}</td>
                                <td class="p-4">
                                    <span class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">\${t.category}</span>
                                    <span class="text-sm font-medium text-white max-w-[200px] truncate block">\${escapeHtmlClient(t.subject)}</span>
                                </td>
                                <td class="p-4 text-center">\${statusBadge}</td>
                                <td class="p-4 text-center">
                                    <button onclick="viewAdminTicket('\${t.id}')" class="bg-teal-600 hover:bg-teal-500 text-white text-[11px] px-3 py-1.5 rounded-lg uppercase font-bold transition shadow">Lihat / Balas</button>
                                </td>
                            </tr>
                            \`;
                        }).join('');
                    }

                    pageInfo.innerText = "Halaman " + data.page + " dari " + (data.totalPages || 1) + " (Total " + data.total + ")";
                    btnPrev.disabled = data.page <= 1;
                    btnNext.disabled = data.page >= data.totalPages;

                    // Update Badge globally
                    const badge = document.getElementById('ticketBadge');
                    if (data.openCount > 0) {
                        badge.innerText = data.openCount;
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                } else {
                    tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-sky-400">Gagal memuat data tiket.</td></tr>';
                }
            } catch(e) {
                tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-sky-400">Koneksi Error.</td></tr>';
            }
        }

        function changeAdminTicketPage(direction) {
            loadAdminTickets(currentAdminTicketPage + direction);
        }

        async function viewAdminTicket(id) {
            document.getElementById('ticketViewModal').classList.remove('hidden');
            const chatContainer = document.getElementById('ticketChatContainer');
            chatContainer.innerHTML = '<p class="text-center text-teal-400 mt-10 animate-pulse">Memuat ruang percakapan...</p>';
            
            document.getElementById('replyTicketId').value = id;
            document.getElementById('replyTicketMessage').value = '';

            try {
                const res = await fetch('/api/admin/ticket/view', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketId: id })
                });
                const data = await res.json();

                if (data.success) {
                    const t = data.ticket;
                    document.getElementById('ticketViewTitle').innerText = t.id;
                    document.getElementById('ticketViewSubtitle').innerText = t.category + ' | ' + t.email;
                    
                    const statusEl = document.getElementById('ticketViewStatus');
                    if (t.status === 'OPEN') { statusEl.className = 'px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider bg-sky-500/20 text-cyan-400 border border-sky-500/30'; statusEl.innerText = 'OPEN'; }
                    else if (t.status === 'PENDING') { statusEl.className = 'px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'; statusEl.innerText = 'PENDING'; }
                    else { statusEl.className = 'px-3 py-1 text-xs font-bold rounded-lg uppercase tracking-wider bg-gray-500/20 text-gray-400 border border-gray-500/30'; statusEl.innerText = 'CLOSED'; }

                    if (t.status === 'CLOSED') {
                        document.getElementById('ticketReplyArea').classList.add('hidden');
                        document.getElementById('ticketClosedArea').classList.remove('hidden');
                    } else {
                        document.getElementById('ticketReplyArea').classList.remove('hidden');
                        document.getElementById('ticketClosedArea').classList.add('hidden');
                    }

                    if (data.replies.length === 0) {
                        chatContainer.innerHTML = '<p class="text-center text-gray-500 mt-10">Belum ada percakapan.</p>';
                    } else {
                        chatContainer.innerHTML = data.replies.map(r => {
                            const isUser = r.sender_type === 'user';
                            const bubbleClass = isUser 
                                ? 'bg-gray-800 text-gray-200 rounded-r-2xl rounded-tl-2xl mr-auto border border-gray-700' 
                                : 'bg-teal-600 text-white rounded-l-2xl rounded-tr-2xl ml-auto shadow-md';
                            
                            const senderLabel = isUser ? '<span class="text-[10px] font-bold text-gray-400 mb-1 block uppercase">Klien (User)</span>' : '<span class="text-[10px] font-bold text-teal-200 mb-1 block text-right uppercase">Anda (Admin)</span>';

                            return '<div class="max-w-[85%] md:max-w-[75%] ' + (isUser ? 'mr-auto' : 'ml-auto') + '">' + senderLabel + '<div class="px-4 py-2.5 text-sm whitespace-pre-wrap break-words leading-normal ' + bubbleClass + '">' + escapeHtmlClient(r.message) + '</div><span class="text-[10px] text-gray-500 block mt-1 ' + (isUser ? 'text-left' : 'text-right font-mono') + '">' + r.created_at + '</span></div>';
                        }).join('');
                        
                        setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 100);
                    }
                } else {
                    chatContainer.innerHTML = '<p class="text-center text-sky-400 mt-10">Gagal memuat detail tiket.</p>';
                }
            } catch(e) {
                chatContainer.innerHTML = '<p class="text-center text-sky-400 mt-10">Koneksi Error.</p>';
            }
        }

        async function sendTicketReplyAdmin() {
            const ticketId = document.getElementById('replyTicketId').value;
            const message = document.getElementById('replyTicketMessage').value.trim();
            if (!message) return;

            const btn = document.getElementById('btnSendReply');
            btn.disabled = true; btn.innerText = 'Mengirim...';

            try {
                const res = await fetch('/api/admin/ticket/reply', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketId, message })
                });
                const data = await res.json();
                if (data.success) {
                    viewAdminTicket(ticketId); // Reload chat
                } else {
                    swalDark.fire('Gagal', data.message || 'Gagal mengirim balasan.', 'error');
                }
            } catch (e) {
                swalDark.fire('Error', 'Kesalahan koneksi.', 'error');
            }
            btn.disabled = false; btn.innerText = 'Kirim Balasan';
        }

        async function closeTicketAdmin() {
            const ticketId = document.getElementById('replyTicketId').value;
            const conf = await swalDark.fire({ title: 'Tutup Tiket?', text: 'Tiket akan ditandai Selesai dan tidak bisa dibalas lagi.', icon: 'warning', showCancelButton: true });
            if (!conf.isConfirmed) return;

            const btn = document.getElementById('btnCloseTicketAdmin');
            btn.disabled = true;

            try {
                const res = await fetch('/api/admin/ticket/action', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticketId, action: 'CLOSE' })
                });
                if ((await res.json()).success) {
                    viewAdminTicket(ticketId);
                }
            } catch(e) { swalDark.fire('Error', 'Gagal menutup tiket', 'error'); }
            btn.disabled = false;
        }


        // ==========================================
        // FITUR PAGINATION MANAJEMEN PENGGUNA
        // ==========================================
        let currentUserPage = 1;
        const usersPerPage = 50;
        let searchUserTimeout;

        async function loadUsers(page = 1) {
            currentUserPage = page;
            const searchKeyword = document.getElementById('searchUser').value.trim();
            const tbody = document.getElementById('userTableBody');
            const pageInfo = document.getElementById('userPageInfo');
            const btnPrev = document.getElementById('btnPrevUser');
            const btnNext = document.getElementById('btnNextUser');
            const headerTotal = document.getElementById('userTotalHeader');

            tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-cyan-400 animate-pulse">Memuat data pengguna...</td></tr>';
            
            try {
                const res = await fetch('/api/admin/users-list', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ page, limit: usersPerPage, search: searchKeyword })
                });
                const data = await res.json();

                if (data.success) {
                    headerTotal.innerText = \`\u{1F465} Manajemen Pengguna (\${data.total} User)\`;
                    if (data.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-500">Tidak ada pengguna ditemukan.</td></tr>';
                    } else {
                        tbody.innerHTML = data.data.map(u => {
                            const ownerEmail = '${((env && env.ADMIN_EMAIL) || "syamsul18782@gmail.com").toLowerCase().trim()}';
                            const isOwner = u.email.toLowerCase() === 'syamsul18782@gmail.com' || u.email.toLowerCase() === ownerEmail;
                            const isUserSuperAdmin = isOwner || u.is_admin === 2;
                            const isUserAdmin = !isUserSuperAdmin && (u.is_admin === 1);
                            
                            const roleBadge = isUserSuperAdmin 
                                ? '<span class="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-md uppercase font-black tracking-wider">Super Admin</span>'
                                : (isUserAdmin 
                                    ? '<span class="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">Admin</span>' 
                                    : '<span class="bg-gray-800 text-gray-400 border border-gray-700 text-[10px] px-2 py-0.5 rounded-md uppercase font-bold tracking-wider">User</span>');
                            
                            const statusBadge = u.is_blocked === 1 
                                ? '<span class="bg-sky-500/20 text-cyan-400 border border-sky-500/30 text-[10px] px-2.5 py-0.5 rounded-md uppercase font-bold tracking-wider">Banned</span>' 
                                : '<span class="bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] px-2.5 py-0.5 rounded-md uppercase font-bold tracking-wider">Aktif</span>';

                            let adminToggleBtn = '';
                            if (${isCurrentSuperAdmin}) {
                                if (!isOwner) {
                                    adminToggleBtn = \`<button onclick="manageUserRole('\${u.email}', \${u.is_admin || 0})" class="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow flex items-center gap-1" title="Ubah role pengguna">\u{1F6E1}\uFE0F Kelola Role</button>\`;
                                }
                            }

                            return \`
                            <tr class="border-b border-gray-700/50 hover:bg-gray-800/50 transition user-row">
                                <td class="p-4 font-mono text-xs text-gray-400">\${u.email}</td>
                                <td class="p-4 font-medium text-white">\${escapeHtmlClient(u.name)}</td>
                                <td class="p-4 text-green-400 font-mono font-bold cursor-pointer hover:underline hover:text-green-300 transition-colors" onclick="viewUserMutasi('\${u.email}')" title="Klik untuk lihat 10 riwayat mutasi terakhir">Rp \${u.balance.toLocaleString('id-ID')}</td>
                                <td class="p-4">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                        \${statusBadge}
                                        \${roleBadge}
                                    </div>
                                </td>
                                <td class="p-4 flex gap-2 flex-wrap items-center">
                                    <button onclick="actionUser('\${u.email}', 'add_balance')" class="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow">\xB1 Saldo</button>
                                    \${!isOwner ? \`<button onclick="actionUser('\${u.email}', 'toggle_block')" class="bg-\${u.is_blocked === 1 ? 'green' : 'red'}-600 hover:bg-\${u.is_blocked === 1 ? 'green' : 'red'}-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow">\${u.is_blocked === 1 ? 'Unblock' : 'Block'}</button>\` : ''}
                                    <button onclick="viewInbox('\${u.email}')" class="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition border border-gray-600 shadow">Inbox</button>
                                    \${adminToggleBtn}
                                </td>
                            </tr>
                            \`;
                        }).join('');
                    }

                    pageInfo.innerText = \`Halaman \${data.page} dari \${data.totalPages || 1}\`;
                    btnPrev.disabled = data.page <= 1;
                    btnNext.disabled = data.page >= data.totalPages;
                } else {
                    tbody.innerHTML = \`<tr><td colspan="5" class="p-8 text-center text-sky-400">Gagal mengambil data.</td></tr>\`;
                }
            } catch (e) {
                tbody.innerHTML = \`<tr><td colspan="5" class="p-8 text-center text-sky-400">Koneksi Error.</td></tr>\`;
            }
        }

        function changeUserPage(direction) {
            loadUsers(currentUserPage + direction);
        }

        function filterUsers() {
            clearTimeout(searchUserTimeout);
            searchUserTimeout = setTimeout(() => {
                loadUsers(1);
            }, 500); // 500ms debounce menghindari spam fetch API ke database
        }

        // Panggil fungsi awal memuat tabel
        loadUsers(1);


        // Fitur Settings
        document.getElementById('settingsForm').addEventListener('submit', async(e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSaveSettings');
            btn.disabled = true; btn.innerText = 'Menyimpan...';
            try {
                const payload = {
                    payment_tripay: false,
                    payment_violet: false,
                    payment_qris_manual: document.getElementById('setQrisManualActive').value === 'true',
                    payment_manual: document.getElementById('setQrisManualActive').value === 'true',
                    payment_shopeepay: document.getElementById('setShopeePayActive') ? document.getElementById('setShopeePayActive').value === 'true' : false,
                    payment_gopay: document.getElementById('setGoPayActive') ? document.getElementById('setGoPayActive').value === 'true' : false,
                    manual_bsi_rek: document.getElementById('setBsiRek') ? document.getElementById('setBsiRek').value.trim() : '7293609009',
                    manual_bsi_name: document.getElementById('setBsiName') ? document.getElementById('setBsiName').value.trim() : 'sutroni soga',
                    manual_dana_rek: document.getElementById('setDanaRek') ? document.getElementById('setDanaRek').value.trim() : '08979527685',
                    manual_dana_name: document.getElementById('setDanaName') ? document.getElementById('setDanaName').value.trim() : 'sutroni soga',
                    manual_shopee_rek: document.getElementById('setShopeeRek') ? document.getElementById('setShopeeRek').value.trim() : '08979527685',
                    manual_shopee_name: document.getElementById('setShopeeName') ? document.getElementById('setShopeeName').value.trim() : 'hasnasyukur',
                    autogopay_api_key: document.getElementById('setAgpApiKey') ? document.getElementById('setAgpApiKey').value.trim() : '',
                    shopeepay_qris_static: document.getElementById('setShopeeQrisStatic') ? document.getElementById('setShopeeQrisStatic').value.trim() : '',
                    gopay_qris_static: document.getElementById('setGopayQrisStatic') ? document.getElementById('setGopayQrisStatic').value.trim() : '',
                    ai_chat_active: document.getElementById('setAiActive').value === 'true',
                    ai_provider: document.getElementById('setAiProvider').value,
                    ai_hourly_limit: document.getElementById('setAiHourlyLimit') ? (parseInt(document.getElementById('setAiHourlyLimit').value) || 10) : 10,
                    telegram_bot_token: document.getElementById('setTgToken').value,
                    telegram_channel_id: document.getElementById('setTgChatId').value,
                    auto_backup_frequency: parseInt(document.getElementById('setBackupFreq').value),
                    maintenance_mode: document.getElementById('setMaintenance').value === 'true'
                };

                const res = await fetch('/api/admin/settings', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload) });
                if((await res.json()).success) {
                    await swalDark.fire('Berhasil', 'Konfigurasi Sistem diupdate!', 'success');
                    window.location.reload();
                }
            } catch(e) { swalDark.fire('Error', 'Terjadi kesalahan saat menyimpan konfigurasi!', 'error'); }
            btn.disabled = false; btn.innerText = 'Simpan Konfigurasi';
        });

        // Fitur Broadcast Inbox
        document.getElementById('adminForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btnSendMsg');
            btn.innerText = 'Mengirim...'; btn.disabled = true;
            try {
                const payload = { targetType: document.getElementById('targetType').value, targetEmail: document.getElementById('targetEmail').value, title: document.getElementById('msgTitle').value, message: document.getElementById('msgBody').value };
                const res = await fetch('/api/admin/send-message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if((await res.json()).success) { 
                    swalDark.fire('Sukses', 'Pesan masuk ke inbox user dan Channel Telegram!', 'success'); 
                    document.getElementById('adminForm').reset();
                    closeBroadcastModal();
                }
            } catch(err) { swalDark.fire('Error', 'Kesalahan sistem', 'error'); }
            btn.innerText = 'Kirim Pesan Sekarang'; btn.disabled = false;
        });

        function escapeHtmlClient(str) {
            return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        async function actionUser(email, action, targetValue = null) {
            let value = 0;
            let keterangan = '';
            if (action === 'add_balance') {
                const { value: formValues } = await swalDark.fire({
                    title: 'Update Saldo',
                    html: '<div class="text-left space-y-4 mt-2">' +
                          '<div><label class="block text-xs font-bold text-gray-400 mb-1 uppercase">Nominal (Gunakan minus untuk kurangi)</label>' +
                          '<input id="swal-input1" type="number" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-sky-500 outline-none font-mono" placeholder="0"></div>' +
                          '<div><label class="block text-xs font-bold text-gray-400 mb-1 uppercase">Keterangan (Opsional)</label>' +
                          '<input id="swal-input2" type="text" class="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-sky-500 outline-none text-sm" placeholder="Contoh: Bonus event, koreksi mutasi..."></div>' +
                          '</div>',
                    focusConfirm: false,
                    showCancelButton: true,
                    preConfirm: () => {
                        return {
                            nominal: document.getElementById('swal-input1').value,
                            ket: document.getElementById('swal-input2').value
                        }
                    }
                });
                if (!formValues) return;
                value = parseInt(formValues.nominal);
                keterangan = formValues.ket ? formValues.ket.trim() : '';
                
                if (isNaN(value) || value === 0) return swalDark.fire('Error', 'Nominal tidak valid!', 'error');
            } else if (action === 'toggle_block') {
                const conf = await swalDark.fire({ title: 'Konfirmasi', text: 'Ubah status blokir untuk ' + email + '?', icon: 'warning', showCancelButton: true });
                if (!conf.isConfirmed) return;
            } else if (action === 'toggle_admin') {
                let roleLabel = 'Pengguna Biasa';
                if (targetValue === 2) roleLabel = 'Super Admin (Akses Penuh)';
                else if (targetValue === 1) roleLabel = 'Admin Biasa';

                const conf = await swalDark.fire({
                    title: 'Ubah Role Pengguna?',
                    html: '<p class="text-sm text-slate-300 leading-relaxed">Pengguna <b>' + escapeHtmlClient(email) + '</b> akan diubah rolenya menjadi:<br><b class="text-purple-400 text-base font-bold uppercase tracking-wider block mt-1">' + roleLabel + '</b><br>Lanjutkan perubahan hak akses ini?</p>',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: targetValue > 0 ? '#7c3aed' : '#d97706',
                    confirmButtonText: 'Ya, Terapkan Role',
                    cancelButtonText: 'Batal'
                });
                if (!conf.isConfirmed) return;
                value = targetValue;
            }
            try {
                const res = await fetch('/api/admin/user-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, action, value, keterangan }) });
                const data = await res.json();
                if (data.success) {
                    await swalDark.fire('Berhasil', 'Aksi pada pengguna sukses dilakukan.', 'success');
                    loadUsers(currentUserPage);
                } else {
                    swalDark.fire('Gagal', data.message || 'Gagal memproses aksi.', 'error');
                }
            } catch(e) { swalDark.fire('Error', 'Sistem error', 'error'); }
        }

        async function manageUserRole(email, currentRole) {
            const current = parseInt(currentRole) || 0;
            const { value: selectedRole } = await swalDark.fire({
                title: 'Kelola Hak Akses / Role',
                html: '<div class="text-left text-sm space-y-3 pt-2 text-slate-300">' +
                      '<p class="text-xs text-slate-400">Pilih tingkatan hak akses untuk pengguna:<br><b class="text-white text-sm break-all font-mono">' + escapeHtmlClient(email) + '</b></p>' +
                      '<label class="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:border-amber-500/50 bg-gray-800/80 cursor-pointer transition">' +
                      '<input type="radio" name="role_choice" value="2" ' + (current === 2 ? 'checked' : '') + ' class="mt-1 text-amber-500 focus:ring-amber-500">' +
                      '<div><div class="font-bold text-amber-400 flex items-center gap-1.5">👑 Super Admin</div><div class="text-xs text-slate-400 mt-0.5">Wewenang penuh: restore database, ubah konfigurasi sistem / API Key, dan kelola role akun lain.</div></div>' +
                      '</label>' +
                      '<label class="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:border-purple-500/50 bg-gray-800/80 cursor-pointer transition">' +
                      '<input type="radio" name="role_choice" value="1" ' + (current === 1 ? 'checked' : '') + ' class="mt-1 text-purple-500 focus:ring-purple-500">' +
                      '<div><div class="font-bold text-purple-400 flex items-center gap-1.5">🛡️ Admin Biasa</div><div class="text-xs text-slate-400 mt-0.5">Kelola pesanan, katalog PPOB Toko Gorontalo & markup, tambah/kurang saldo, dan tiket. Tidak bisa restore atau ubah role.</div></div>' +
                      '</label>' +
                      '<label class="flex items-start gap-3 p-3 rounded-xl border border-slate-700 hover:border-gray-500/50 bg-gray-800/80 cursor-pointer transition">' +
                      '<input type="radio" name="role_choice" value="0" ' + (current === 0 ? 'checked' : '') + ' class="mt-1 text-slate-400">' +
                      '<div><div class="font-bold text-slate-200 flex items-center gap-1.5">👤 Pengguna Biasa</div><div class="text-xs text-slate-400 mt-0.5">Hanya bisa bertransaksi sebagai pelanggan biasa tanpa akses ke Panel Admin.</div></div>' +
                      '</label>' +
                      '</div>',
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonColor: '#7c3aed',
                confirmButtonText: 'Simpan Role',
                cancelButtonText: 'Batal',
                preConfirm: () => {
                    const checked = document.querySelector('input[name="role_choice"]:checked');
                    if (!checked) {
                        Swal.showValidationMessage('Silakan pilih salah satu role');
                        return false;
                    }
                    return parseInt(checked.value);
                }
            });

            if (selectedRole !== undefined && selectedRole !== null) {
                if (selectedRole === current) {
                    swalDark.fire('Info', 'Role yang dipilih sama dengan role saat ini.', 'info');
                    return;
                }
                actionUser(email, 'toggle_admin', selectedRole);
            }
        }

        async function viewInbox(email) {
            document.getElementById('inboxModal').classList.remove('hidden');
            document.getElementById('inboxModalTitle').innerText = 'Inbox: ' + email;
            document.getElementById('inboxModalContent').innerHTML = '<p class="text-gray-500 text-center py-10 font-medium">Memuat pesan...</p>';
            try {
                const res = await fetch('/api/admin/user-inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
                const data = await res.json();
                if (data.success) {
                    if (data.inbox.length === 0) {
                        document.getElementById('inboxModalContent').innerHTML = '<p class="text-gray-500 text-center py-10 font-medium">Inbox kosong.</p>';
                    } else {
                        document.getElementById('inboxModalContent').innerHTML = data.inbox.map(msg => \`
                            <div class="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                                <div class="flex justify-between items-start mb-3 border-b border-gray-700 pb-3">
                                    <h4 class="text-cyan-400 font-bold text-base">\${msg.title}</h4>
                                    <span class="text-xs font-mono text-gray-500 bg-gray-900 px-2 py-1 rounded">\${msg.date}</span>
                                </div>
                                <div class="text-gray-300 text-sm leading-relaxed">\${msg.message}</div>
                            </div>
                        \`).join('');
                    }
                }
            } catch(e) { document.getElementById('inboxModalContent').innerHTML = '<p class="text-cyan-400 text-center py-10">Gagal memuat inbox.</p>'; }
        }

        async function viewUserMutasi(email) {
            document.getElementById('mutasiUserModal').classList.remove('hidden');
            document.getElementById('mutasiUserModalTitle').innerText = '\u{1F4B3} Histori Saldo: ' + email;
            const tbody = document.getElementById('mutasiUserTableBody');
            tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-green-400 animate-pulse">Memuat riwayat transaksi...</td></tr>';
            
            try {
                const res = await fetch('/api/admin/user-transactions', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ email }) 
                });
                const data = await res.json();
                
                if (data.success) {
                    if (data.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-gray-500">Belum ada riwayat transaksi.</td></tr>';
                    } else {
                        tbody.innerHTML = data.data.map(trx => {
                            const isMasuk = trx.type === 'IN';
                            const nominalClass = isMasuk ? 'text-green-400' : 'text-cyan-400';
                            const sign = isMasuk ? '+' : '-';
                            
                            let sisaSaldoText = '-';
                            if (trx.balance !== undefined && trx.balance !== null) {
                                sisaSaldoText = 'Rp ' + trx.balance.toLocaleString('id-ID');
                            }
                            
                            const dateParts = trx.created_at ? trx.created_at.split(', ') : ['', ''];
                            const dateHtml = dateParts[1] ? \`\${dateParts[0]}<br>\${dateParts[1]}\` : (trx.created_at || '-');
                            
                            return \`
                            <tr class="hover:bg-gray-800/50 transition border-b border-gray-800 last:border-0">
                                <td class="p-4 font-mono text-xs text-gray-500">\${dateHtml}</td>
                                <td class="p-4 text-white font-medium max-w-xs truncate whitespace-normal leading-snug text-[11px]" style="font-family: 'Arial Narrow', Arial, sans-serif;">\${escapeHtmlClient(trx.description)}</td>
                                <td class="p-4 font-mono font-bold text-right \${nominalClass}">\${sign} Rp \${trx.amount.toLocaleString('id-ID')}</td>
                                <td class="p-4 font-mono font-bold text-right text-gray-300">\${sisaSaldoText}</td>
                            </tr>\`;
                        }).join('');
                    }
                } else {
                    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-sky-400">Gagal memuat histori.</td></tr>';
                }
            } catch (e) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-sky-400">Error koneksi internet.</td></tr>';
            }
        }

        // Backup & Restore
        function downloadBackup() { window.location.href = '/api/admin/backup'; }
        
        async function backupToTelegram() {
            const btn = document.getElementById('btnBackupTg');
            btn.innerText = 'Mengirim...'; btn.disabled = true;
            try {
                const res = await fetch('/api/admin/backup-telegram', { method: 'POST' });
                const data = await res.json();
                if(data.success) {
                    swalDark.fire('Berhasil', 'Backup dan laporan statistik sukses dikirim ke Telegram!', 'success');
                } else {
                    swalDark.fire('Gagal', data.message || 'Gagal mengirim backup.', 'error');
                }
            } catch(e) {
                swalDark.fire('Error', 'Kesalahan koneksi internet.', 'error');
            }
            btn.innerHTML = \`<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> Backup Sekarang ke Telegram\`;
            btn.disabled = false;
        }

        async function saveAutoBackupSchedule() {
            const selectEl = document.getElementById('autoBackupFrequencySelect');
            if (!selectEl) return;
            const freq = parseInt(selectEl.value);
            const btn = document.getElementById('btnSaveAutoBackup');
            const originalText = btn.innerHTML;
            btn.innerText = 'Menyimpan...'; btn.disabled = true;

            try {
                const res = await fetch('/api/admin/backup-config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ frequency: freq })
                });
                const data = await res.json();
                if (data.success) {
                    const badge = document.getElementById('autoBackupBadge');
                    if (badge) {
                        badge.innerText = freq > 0 ? 'AKTIF' : 'OFF';
                        badge.className = freq > 0 ? 'text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800' : 'text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700';
                    }
                    const setFreqEl = document.getElementById('setBackupFreq');
                    if (setFreqEl) setFreqEl.value = String(freq);
                    await swalDark.fire('Tersimpan!', data.message || 'Jadwal auto-backup berhasil disimpan!', 'success');
                } else {
                    await swalDark.fire('Gagal', data.message || 'Gagal menyimpan jadwal auto-backup.', 'error');
                }
            } catch (e) {
                await swalDark.fire('Error', 'Terjadi kesalahan koneksi internet.', 'error');
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        }

        async function initDatabaseSchema() {
            const conf = await swalDark.fire({
                title: "Cek & Sinkron Skema Database?",
                text: "Sistem akan memverifikasi seluruh tabel SQLite dan memastikan kompatibilitas kolom. Lanjutkan?",
                icon: "question",
                showCancelButton: true,
                confirmButtonColor: "#0284c7",
                cancelButtonColor: "#ef4444",
                confirmButtonText: "Ya, Sinkronkan!",
                cancelButtonText: "Batal"
            });
            if (!conf.isConfirmed) return;

            const btn = document.getElementById("btnInitDb");
            const originalText = btn.innerHTML;
            btn.innerText = "Memproses..."; btn.disabled = true;

            try {
                const res = await fetch("/api/admin/db-init", { method: "POST" });
                const data = await res.json();
                if (data.success) {
                    await swalDark.fire("Berhasil", data.message || "Skema database berhasil diverifikasi!", "success");
                } else {
                    await swalDark.fire("Gagal", data.message || "Gagal inisialisasi database.", "error");
                }
            } catch (e) {
                await swalDark.fire("Error", "Terjadi kesalahan koneksi internet.", "error");
            }
            btn.innerHTML = originalText;
            btn.disabled = false;
        }

        async function restoreBackup() {
            const fileInput = document.getElementById('restoreFile');
            if (fileInput.files.length === 0) return swalDark.fire('Perhatian', 'Silakan pilih file Backup JSON.', 'warning');
            
            const conf = await swalDark.fire({ title: 'BAHAYA!', text: 'Mengembalikan database akan MENGHAPUS SELURUH DATA yang ada saat ini. Anda yakin 100%?', icon: 'error', showCancelButton: true });
            if (!conf.isConfirmed) return;

            const btn = document.getElementById('btnRestore');
            btn.innerText = 'Proses...'; btn.disabled = true;
            try {
                const fileReader = new FileReader();
                fileReader.onload = async function(e) {
                    try {
                        const jsonData = JSON.parse(e.target.result);
                        const res = await fetch('/api/admin/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jsonData) });
                        if ((await res.json()).success) { await swalDark.fire('Berhasil', 'Database berhasil di-restore!', 'success'); window.location.reload(); }
                    } catch (err) { swalDark.fire('Error', 'File JSON tidak valid.', 'error'); }
                    btn.innerText = 'Upload'; btn.disabled = false;
                };
                fileReader.readAsText(fileInput.files[0]);
            } catch (e) { swalDark.fire('Error', 'Gagal membaca file.', 'error'); btn.innerText = 'Upload'; btn.disabled = false; }
        }

        // --- HASH ROUTER UNTUK REFRESH / F5 ADMIN DASHBOARD ---
        function checkAdminHashRouter() {
            const hash = (window.location.hash || '').toLowerCase();
            const params = new URLSearchParams(window.location.search);
            const tab = (params.get('tab') || '').toLowerCase();

            if (hash === '#tokogorontalo' || hash === '#ppob' || tab === 'tokogorontalo' || tab === 'ppob') {
                if (typeof openTokoGorontaloModal === 'function') openTokoGorontaloModal();
            } else if (hash === '#settings' || tab === 'settings') {
                openSettingsModal();
            } else if (hash === '#broadcast' || tab === 'broadcast') {
                openBroadcastModal();
            } else if (hash === '#tickets' || tab === 'tickets') {
                openTicketManagerModal();
            } else if (hash === '#transactions' || tab === 'transactions') {
                openGlobalTransactionsModal();
            } else if (hash === '#stats' || tab === 'stats') {
                openStatsDashboardModal();
            } else if (hash === '#users' || tab === 'users') {
                const sec = document.getElementById('sectionUser');
                const icon = document.getElementById('iconUser');
                if (sec && sec.classList.contains('hidden')) {
                    sec.classList.remove('hidden');
                    if (icon) icon.classList.add('rotate-180');
                    if (typeof loadUsers === 'function') loadUsers();
                }
            }
        }

        window.addEventListener('DOMContentLoaded', checkAdminHashRouter);
        window.addEventListener('hashchange', checkAdminHashRouter);

        // Global ESC key listener to close any active admin modal
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modalList = [
                    { id: 'tokoGorontaloModal', close: () => typeof closeTokoGorontaloModal === 'function' && closeTokoGorontaloModal() },
                    { id: 'settingsModal', close: closeSettingsModal },
                    { id: 'broadcastModal', close: closeBroadcastModal },
                    { id: 'ticketManagerModal', close: closeTicketManagerModal },
                    { id: 'ticketViewModal', close: closeTicketViewModal },
                    { id: 'globalTransactionsModal', close: closeGlobalTransactionsModal },
                    { id: 'statsDashboardModal', close: closeStatsDashboardModal },
                    { id: 'inboxModal', close: closeInboxModal },
                    { id: 'mutasiUserModal', close: closeUserMutasiModal }
                ];
                for (const m of modalList) {
                    const el = document.getElementById(m.id);
                    if (el && !el.classList.contains('hidden')) {
                        m.close();
                        break;
                    }
                }
            }
        });
    <\/script>
    ${renderTokoGorontaloAdminModal()}
    `;
}
__name(renderAdminDashboard, "renderAdminDashboard");
__name2(renderAdminDashboard, "renderAdminDashboard");
__name22(renderAdminDashboard, "renderAdminDashboard");
__name222(renderAdminDashboard, "renderAdminDashboard");
async function handleAdminRoutes(url, request, env, currentUser, appSettings, sendTelegramLog2) {
  if (!url.pathname.startsWith("/api/admin/")) {
    return null;
  }
  if (!currentUser || !isAdmin(currentUser, env)) {
    return jsonResponse({ success: false, message: "Unauthorized" }, 401);
  }
  const now = getWIBTime();
  if (url.pathname === "/api/admin/dashboard-stats" && request.method === "POST") {
    try {
      const { month_year } = await request.json();
      const tzDate = new Date((/* @__PURE__ */ new Date()).toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const formatDate = /* @__PURE__ */ __name222((date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }, "formatDate");
      const todayStr = formatDate(tzDate);
      let sqlCondTrx = "";
      let sqlCondVpn = "";
      let sqlCondTrxParams = [];
      let sqlCondVpnParams = [];
      if (month_year === "today") {
        sqlCondTrx = "substr(created_at, 7, 4) || '-' || substr(created_at, 4, 2) || '-' || substr(created_at, 1, 2) = ?";
        sqlCondVpn = "substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2) = ?";
        sqlCondTrxParams.push(todayStr);
        sqlCondVpnParams.push(todayStr);
      } else if (month_year === "this_week") {
        const dayOfWeek = tzDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(tzDate);
        monday.setDate(tzDate.getDate() + diffToMonday);
        const mondayStr = formatDate(monday);
        sqlCondTrx = "substr(created_at, 7, 4) || '-' || substr(created_at, 4, 2) || '-' || substr(created_at, 1, 2) BETWEEN ? AND ?";
        sqlCondVpn = "substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2) BETWEEN ? AND ?";
        sqlCondTrxParams.push(mondayStr, todayStr);
        sqlCondVpnParams.push(mondayStr, todayStr);
      } else {
        let targetMonthYear = month_year;
        if (month_year === "this_month") {
          targetMonthYear = `${String(tzDate.getMonth() + 1).padStart(2, "0")}/${tzDate.getFullYear()}`;
        }
        sqlCondTrx = "substr(created_at, 4, 7) = ?";
        sqlCondVpn = "substr(date, 4, 7) = ?";
        sqlCondTrxParams.push(targetMonthYear);
        sqlCondVpnParams.push(targetMonthYear);
      }
      const userStats = await env.DB.prepare("SELECT COUNT(*) as total_users, SUM(balance) as total_balance FROM users").first();
      const totalUsers = userStats ? userStats.total_users : 0;
      const totalBalance = userStats ? userStats.total_balance || 0 : 0;
      const tripayIncomeRow = await env.DB.prepare(
        `SELECT SUM(amount) as total FROM transactions WHERE type = 'IN' AND (description LIKE 'Top Up Saldo via ShopeePay%' OR description LIKE 'Top Up Saldo via TriPay%') AND ${sqlCondTrx}`
      ).bind(...sqlCondTrxParams).first();
      const tripayIncome = tripayIncomeRow ? tripayIncomeRow.total || 0 : 0;
      const violetIncomeRow = await env.DB.prepare(
        `SELECT SUM(amount) as total FROM transactions WHERE type = 'IN' AND (description LIKE 'Top Up Saldo via GoPay%' OR description LIKE 'Top Up Saldo via Violet%') AND ${sqlCondTrx}`
      ).bind(...sqlCondTrxParams).first();
      const violetIncome = violetIncomeRow ? violetIncomeRow.total || 0 : 0;
      const manualIncomeRow = await env.DB.prepare(
        `SELECT SUM(amount) as total FROM transactions WHERE type = 'IN' AND description = 'Penambahan Saldo oleh Admin' AND ${sqlCondTrx}`
      ).bind(...sqlCondTrxParams).first();
      const manualIncome = manualIncomeRow ? manualIncomeRow.total || 0 : 0;
      const vpnCreatedRow = await env.DB.prepare(
        `SELECT COUNT(*) as total FROM vpns WHERE ${sqlCondVpn}`
      ).bind(...sqlCondVpnParams).first();
      const vpnCreated = vpnCreatedRow ? vpnCreatedRow.total || 0 : 0;
      const vpnRenewedRow = await env.DB.prepare(
        `SELECT COUNT(*) as total FROM transactions WHERE type = 'OUT' AND description LIKE 'Perpanjang VPN%' AND ${sqlCondTrx}`
      ).bind(...sqlCondTrxParams).first();
      const vpnRenewed = vpnRenewedRow ? vpnRenewedRow.total || 0 : 0;
      const xlTrxRow = await env.DB.prepare(
        `SELECT COUNT(*) as total FROM transactions WHERE type = 'OUT' AND (description LIKE 'Pembelian Paket XL%' OR description LIKE 'Biaya Admin Paket XL%') AND ${sqlCondTrx}`
      ).bind(...sqlCondTrxParams).first();
      const xlTransactions = xlTrxRow ? xlTrxRow.total || 0 : 0;
      const licenseIncomeRow = await env.DB.prepare(
        `SELECT SUM(amount) as total FROM transactions WHERE type = 'OUT' AND (description LIKE 'Beli Lisensi%' OR description LIKE 'Perpanjang Lisensi%') AND ${sqlCondTrx}`
      ).bind(...sqlCondTrxParams).first();
      const licenseIncome = licenseIncomeRow ? licenseIncomeRow.total || 0 : 0;
      const vpnRevenueRow = await env.DB.prepare(
        `SELECT SUM(amount) as total FROM transactions WHERE type = 'OUT' AND (description LIKE 'Pembuatan VPN Baru%' OR description LIKE 'Perpanjang VPN%') AND ${sqlCondTrx}`
      ).bind(...sqlCondTrxParams).first();
      const vpnRevenue = vpnRevenueRow ? vpnRevenueRow.total || 0 : 0;
      const kmspMarkup = appSettings && appSettings.kmsp_markup !== void 0 ? parseInt(appSettings.kmsp_markup) : 3e3;
      const xlProfit = xlTransactions * kmspMarkup;
      const netProfit = vpnRevenue + xlProfit + licenseIncome;
      const createdPerServer = await env.DB.prepare(
        `SELECT server, COUNT(*) as count FROM vpns WHERE ${sqlCondVpn} GROUP BY server`
      ).bind(...sqlCondVpnParams).all();
      const renewedPerServer = await env.DB.prepare(`
                SELECT v.server, COUNT(*) as count 
                FROM transactions t
                JOIN vpns v ON t.description LIKE 'Perpanjang VPN (' || v.username || ')%'
                WHERE t.type = 'OUT' AND t.description LIKE 'Perpanjang VPN%' AND ${sqlCondTrx}
                GROUP BY v.server
            `).bind(...sqlCondTrxParams).all();
      const serversMap = {};
      const configuredServers = appSettings.servers || [];
      configuredServers.forEach((srv) => {
        serversMap[srv.name] = { name: srv.name, created: 0, renewed: 0 };
      });
      if (createdPerServer.results) {
        createdPerServer.results.forEach((row) => {
          if (!serversMap[row.server]) {
            serversMap[row.server] = { name: row.server, created: 0, renewed: 0 };
          }
          serversMap[row.server].created = row.count;
        });
      }
      if (renewedPerServer.results) {
        renewedPerServer.results.forEach((row) => {
          if (!serversMap[row.server]) {
            serversMap[row.server] = { name: row.server, created: 0, renewed: 0 };
          }
          serversMap[row.server].renewed = row.count;
        });
      }
      const serversList = Object.values(serversMap);
      const xlPopularRes = await env.DB.prepare(`
                SELECT description, COUNT(*) as count, SUM(amount) as revenue 
                FROM transactions 
                WHERE type = 'OUT' AND (description LIKE 'Pembelian Paket XL%' OR description LIKE 'Biaya Admin Paket XL%') AND ${sqlCondTrx}
                GROUP BY description
                ORDER BY count DESC
                LIMIT 15
            `).bind(...sqlCondTrxParams).all();
      const xlPopular = (xlPopularRes.results || []).map((row) => {
        let packageName = row.description;
        const match = row.description.match(/Paket XL \(([^)]+)\)/);
        if (match) {
          packageName = match[1];
        }
        return {
          package_name: packageName,
          count: row.count,
          revenue: row.revenue
        };
      });
      let labels = [];
      let topupData = [];
      let spendingData = [];
      if (month_year === "today") {
        labels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00");
        topupData = Array(24).fill(0);
        spendingData = Array(24).fill(0);
        const allTrx = await env.DB.prepare(
          `SELECT type, amount, created_at FROM transactions WHERE ${sqlCondTrx}`
        ).bind(...sqlCondTrxParams).all();
        if (allTrx.results) {
          allTrx.results.forEach((trx) => {
            const match = trx.created_at.match(/, (\d{2}):/);
            if (match) {
              const hour = parseInt(match[1], 10);
              if (hour >= 0 && hour <= 23) {
                if (trx.type === "IN") {
                  topupData[hour] += trx.amount;
                } else if (trx.type === "OUT") {
                  spendingData[hour] += trx.amount;
                }
              }
            }
          });
        }
      } else if (month_year === "this_week") {
        const daysName = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
        const dayOfWeek = tzDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(tzDate);
        monday.setDate(tzDate.getDate() + diffToMonday);
        topupData = Array(7).fill(0);
        spendingData = Array(7).fill(0);
        const datesOfWeek = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(monday);
          d.setDate(monday.getDate() + i);
          const dayStr = String(d.getDate()).padStart(2, "0");
          const monthStr = String(d.getMonth() + 1).padStart(2, "0");
          const formattedDate = `${dayStr}/${monthStr}`;
          datesOfWeek.push(formattedDate);
          labels.push(`${daysName[i]} (${formattedDate})`);
        }
        const allTrx = await env.DB.prepare(
          `SELECT type, amount, created_at FROM transactions WHERE ${sqlCondTrx}`
        ).bind(...sqlCondTrxParams).all();
        if (allTrx.results) {
          allTrx.results.forEach((trx) => {
            const ddMm = trx.created_at.substring(0, 5);
            const idx = datesOfWeek.indexOf(ddMm);
            if (idx !== -1) {
              if (trx.type === "IN") {
                topupData[idx] += trx.amount;
              } else if (trx.type === "OUT") {
                spendingData[idx] += trx.amount;
              }
            }
          });
        }
      } else {
        let targetMonthYear = month_year;
        if (month_year === "this_month") {
          targetMonthYear = `${String(tzDate.getMonth() + 1).padStart(2, "0")}/${tzDate.getFullYear()}`;
        }
        const [targetMonth, targetYear] = targetMonthYear.split("/");
        const daysInMonth = new Date(parseInt(targetYear), parseInt(targetMonth), 0).getDate();
        labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
        topupData = Array(daysInMonth).fill(0);
        spendingData = Array(daysInMonth).fill(0);
        const allTrx = await env.DB.prepare(
          `SELECT type, amount, created_at FROM transactions WHERE ${sqlCondTrx}`
        ).bind(...sqlCondTrxParams).all();
        if (allTrx.results) {
          allTrx.results.forEach((trx) => {
            const datePart = trx.created_at.split(",")[0];
            const day = parseInt(datePart.split("/")[0], 10);
            if (day >= 1 && day <= daysInMonth) {
              if (trx.type === "IN") {
                topupData[day - 1] += trx.amount;
              } else if (trx.type === "OUT") {
                spendingData[day - 1] += trx.amount;
              }
            }
          });
        }
      }
      return jsonResponse({
        success: true,
        data: {
          total_users: totalUsers,
          total_balance: totalBalance,
          tripay_income: tripayIncome,
          violet_income: violetIncome,
          manual_income: manualIncome,
          vpn_created: vpnCreated,
          vpn_renewed: vpnRenewed,
          xl_transactions: xlTransactions,
          license_income: licenseIncome,
          net_profit: netProfit,
          servers: serversList,
          xl_popular: xlPopular,
          daily_chart: {
            labels,
            topup: topupData,
            spending: spendingData
          }
        }
      });
    } catch (e) {
      return jsonResponse({ success: false, message: "Gagal mengambil statistik: " + e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/db-init" && request.method === "POST") {
    try {
      await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, 
                    email TEXT, 
                    type TEXT, 
                    amount INTEGER, 
                    description TEXT, 
                    balance INTEGER DEFAULT 0,
                    created_at TEXT
                )
            `).run();
      try {
        await env.DB.prepare("ALTER TABLE transactions ADD COLUMN balance INTEGER DEFAULT 0").run();
      } catch (e) {
      }
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ai_usage (email TEXT PRIMARY KEY, count INTEGER, slot TEXT)`).run();
      try {
        await env.DB.prepare("ALTER TABLE users ADD COLUMN picture TEXT").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0").run();
      } catch (e) {
      }
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS tickets (id TEXT PRIMARY KEY, email TEXT, subject TEXT, category TEXT, status TEXT, created_at TEXT, updated_at TEXT)`).run();
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ticket_replies (id INTEGER PRIMARY KEY AUTOINCREMENT, ticket_id TEXT, sender_type TEXT, message TEXT, created_at TEXT)`).run();
      return jsonResponse({ success: true, message: "Inisialisasi dan migrasi database D1 berhasil dilakukan!" });
    } catch (e) {
      return jsonResponse({ success: false, message: "Gagal inisialisasi database: " + e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/tickets" && request.method === "POST") {
    try {
      const { status, search, page = 1, limit = 15 } = await request.json();
      const offset = (page - 1) * limit;
      let query = "SELECT * FROM tickets WHERE 1=1";
      let countQuery = "SELECT COUNT(*) as total FROM tickets WHERE 1=1";
      let params = [];
      if (status && status !== "ALL") {
        query += " AND status = ?";
        countQuery += " AND status = ?";
        params.push(status);
      }
      if (search) {
        query += " AND (id LIKE ? OR email LIKE ?)";
        countQuery += " AND (id LIKE ? OR email LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
      }
      const totalRow = await env.DB.prepare(countQuery).bind(...params).first();
      const total = totalRow ? totalRow.total : 0;
      const totalPages = Math.ceil(total / limit) || 1;
      query += " ORDER BY updated_at DESC LIMIT ? OFFSET ?";
      const { results } = await env.DB.prepare(query).bind(...params, limit, offset).all();
      const openCountRow = await env.DB.prepare("SELECT COUNT(*) as count FROM tickets WHERE status = 'OPEN'").first();
      const openCount = openCountRow ? openCountRow.count : 0;
      return jsonResponse({
        success: true,
        data: results || [],
        page,
        totalPages,
        total,
        openCount
      });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/ticket/view" && request.method === "POST") {
    try {
      const { ticketId } = await request.json();
      const ticket = await env.DB.prepare("SELECT * FROM tickets WHERE id = ?").bind(ticketId).first();
      if (!ticket) throw new Error("Tiket tidak ditemukan.");
      const { results: replies } = await env.DB.prepare("SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY id ASC").bind(ticketId).all();
      return jsonResponse({ success: true, ticket, replies: replies || [] });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/ticket/reply" && request.method === "POST") {
    try {
      const { ticketId, message } = await request.json();
      const ticket = await env.DB.prepare("SELECT email FROM tickets WHERE id = ?").bind(ticketId).first();
      if (!ticket) throw new Error("Tiket tidak ditemukan.");
      await env.DB.prepare("INSERT INTO ticket_replies (ticket_id, sender_type, message, created_at) VALUES (?, 'admin', ?, ?)").bind(ticketId, message, now).run();
      await env.DB.prepare("UPDATE tickets SET status = 'PENDING', updated_at = ? WHERE id = ?").bind(now, ticketId).run();
      const subject = `Balasan Tiket Bantuan: ${ticketId}`;
      const emailHtml = `<p>Halo,</p><p>Admin telah memberikan balasan untuk tiket bantuan Anda (<b>${ticketId}</b>).</p>
                               <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0; color: #374151;">
                                   ${escapeHTML(message).replace(/\\n/g, "<br>")}
                               </div>
                               <p>Silakan login ke AwanPulsa dan buka menu <b>Pusat Bantuan (Tiket)</b> untuk melanjutkan percakapan.</p>`;
      sendEmailViaGAS(ticket.email, subject, buildEmailTemplate("Tiket Anda Dibalas", emailHtml), env).catch(() => {
      });
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/ticket/action" && request.method === "POST") {
    try {
      const { ticketId, action } = await request.json();
      if (action === "CLOSE") {
        await env.DB.prepare("UPDATE tickets SET status = 'CLOSED', updated_at = ? WHERE id = ?").bind(now, ticketId).run();
      }
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/kmsp-packages" && request.method === "GET") {
    try {
      if (!env.KMSP_API_KEY) throw new Error("API KEY KMSP belum disetel!");
      const servicesRes = await KMSP.getPackageList(env.KMSP_API_KEY);
      let visibilityMap = {};
      try {
        const visStr = await env.DB.prepare("SELECT value FROM settings WHERE key = 'pkg_visibility'").first("value");
        if (visStr) visibilityMap = JSON.parse(visStr);
      } catch (e) {
      }
      if (servicesRes.success && Array.isArray(servicesRes.data)) {
        const data = servicesRes.data.map((pkg) => ({
          id: pkg.package_code,
          name: pkg.package_name,
          price: Number(pkg.package_harga_int) || 0,
          visible: visibilityMap[pkg.package_code] !== false
          // Secara Default True/Melek
        }));
        return jsonResponse({ success: true, data });
      }
      return jsonResponse(servicesRes);
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/toggle-pkg" && request.method === "POST") {
    try {
      const { pkgId, visible } = await request.json();
      let visibilityMap = {};
      try {
        const existing = await env.DB.prepare("SELECT value FROM settings WHERE key = 'pkg_visibility'").first("value");
        if (existing) visibilityMap = JSON.parse(existing);
      } catch (e) {
      }
      visibilityMap[pkgId] = visible;
      const checkExist = await env.DB.prepare("SELECT key FROM settings WHERE key = 'pkg_visibility'").first();
      if (checkExist) {
        await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'pkg_visibility'").bind(JSON.stringify(visibilityMap)).run();
      } else {
        await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('pkg_visibility', ?)").bind(JSON.stringify(visibilityMap)).run();
      }
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/save-pkg-desc" && request.method === "POST") {
    try {
      const { pkgId, description } = await request.json();
      const existing = await env.DB.prepare("SELECT value FROM settings WHERE key = 'pkg_desc'").first();
      let descMap = {};
      if (existing && existing.value) {
        try {
          descMap = JSON.parse(existing.value);
        } catch (e) {
        }
      }
      descMap[pkgId] = description;
      const checkExist = await env.DB.prepare("SELECT key FROM settings WHERE key = 'pkg_desc'").first();
      if (checkExist) {
        await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'pkg_desc'").bind(JSON.stringify(descMap)).run();
      } else {
        await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('pkg_desc', ?)").bind(JSON.stringify(descMap)).run();
      }
      if (sendTelegramLog2) {
        await sendTelegramLog2(`\u{1F4DD} ADMIN EDIT DESKRIPSI PAKET`, `Admin telah memperbarui penjelasan untuk paket KMSP (ID: ${pkgId}).`, appSettings);
      }
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/users-list" && request.method === "POST") {
    try {
      const { page = 1, limit = 50, search = "" } = await request.json();
      try {
        await env.DB.prepare("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0").run();
      } catch (e) {}
      const superAdminEmail = ((env && env.ADMIN_EMAIL) || "syamsul18782@gmail.com").toLowerCase().trim();
      await env.DB.prepare("UPDATE users SET is_admin = 2 WHERE LOWER(email) = ? OR LOWER(email) = 'syamsul18782@gmail.com'").bind(superAdminEmail).run().catch(() => {});
      const offset = (page - 1) * limit;
      let query = "SELECT * FROM users";
      let countQuery = "SELECT COUNT(*) as total FROM users";
      let bindParams = [];
      if (search) {
        query += " WHERE email LIKE ? OR name LIKE ?";
        countQuery += " WHERE email LIKE ? OR name LIKE ?";
        bindParams = [`%${search}%`, `%${search}%`];
      }
      query += " ORDER BY rowid DESC LIMIT ? OFFSET ?";
      const { results: users } = await env.DB.prepare(query).bind(...bindParams, limit, offset).all();
      const totalRes = await env.DB.prepare(countQuery).bind(...bindParams).first();
      const total = totalRes ? totalRes.total : 0;
      return jsonResponse({ success: true, data: users || [], total, page, totalPages: Math.ceil(total / limit) });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/user-transactions" && request.method === "POST") {
    try {
      const { email } = await request.json();
      const { results } = await env.DB.prepare("SELECT * FROM transactions WHERE email = ? ORDER BY id DESC LIMIT 10").bind(email).all();
      return jsonResponse({ success: true, data: results || [] });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/global-transactions" && request.method === "POST") {
    try {
      const { page = 1, limit = 50, search = "" } = await request.json();
      const offset = (page - 1) * limit;
      let query = "SELECT * FROM transactions WHERE amount > 0";
      let countQuery = "SELECT COUNT(*) as total FROM transactions WHERE amount > 0";
      let bindParams = [];
      if (search) {
        query += " AND (email LIKE ? OR description LIKE ?)";
        countQuery += " AND (email LIKE ? OR description LIKE ?)";
        bindParams.push(`%${search}%`, `%${search}%`);
      }
      query += " ORDER BY id DESC LIMIT ? OFFSET ?";
      const { results: transactions } = await env.DB.prepare(query).bind(...bindParams, limit, offset).all();
      const totalRes = await env.DB.prepare(countQuery).bind(...bindParams).first();
      const total = totalRes ? totalRes.total : 0;
      return jsonResponse({
        success: true,
        data: transactions || [],
        total,
        page,
        totalPages: Math.ceil(total / limit)
      });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/user-action" && request.method === "POST") {
    try {
      const { email, action, value, keterangan } = await request.json();
      if (action === "add_balance") {
        await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(value, email).run();
        const mutasiType = value > 0 ? "IN" : "OUT";
        let mutasiDesc = value > 0 ? "Penambahan Saldo oleh Admin" : "Pengurangan Saldo oleh Admin";
        if (keterangan) mutasiDesc += ` (${keterangan})`;
        await catatMutasi(env, email, mutasiType, Math.abs(value), mutasiDesc);
        const isAddition = value > 0;
        if (isAddition) {
          try {
            const pendingInv = await env.DB.prepare("SELECT * FROM invoices WHERE email = ? AND status = 'UNPAID' ORDER BY id DESC LIMIT 1").bind(email).first();
            if (pendingInv) {
              await env.DB.prepare("UPDATE invoices SET status = 'PAID' WHERE id = ?").bind(pendingInv.id).run();
              await env.DB.prepare("DELETE FROM inbox WHERE email = ? AND (title LIKE '%[PENDING]%' OR title LIKE '%PENDING%') AND message LIKE ?").bind(email, "%" + pendingInv.ref + "%").run().catch(() => {});
            }
          } catch(e) {}
        }
        const absValue = Math.abs(value).toLocaleString("id-ID");
        const actionText = isAddition ? "Penambahan" : "Pengurangan";
        const actionVerb = isAddition ? "ditambahkan" : "dikurangi";
        const colorClass = isAddition ? "text-green-400" : "text-cyan-400";
        const userTitle = `[SALDO] ${actionText} Saldo`;
        const userMsg = `Saldo Anda telah ${actionVerb} sebesar <b class="${colorClass}">Rp ${absValue}</b> oleh sistem Admin.${keterangan ? "<br><br>Keterangan: <i>" + escapeHTML(keterangan) + "</i>" : ""}`;
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(email, userTitle, userMsg, now).run();
        const adminTitle = `[ADMIN SALDO] ${actionText} untuk ${email}`;
        const adminMsg = `Anda berhasil melakukan ${actionText.toLowerCase()} saldo sebesar <b class="${colorClass}">Rp ${absValue}</b> pada akun pengguna <b>${email}</b>.${keterangan ? "<br><br>Keterangan: <i>" + escapeHTML(keterangan) + "</i>" : ""}`;
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(currentUser.email, adminTitle, adminMsg, now).run();
        if (sendTelegramLog2) {
          await sendTelegramLog2(`\u{1F4B3} ADMIN UPDATE SALDO`, `Admin melakukan ${actionText.toLowerCase()} saldo.
Email Target: ${email}
Nominal: Rp ${absValue.toLocaleString("id-ID")}${keterangan ? "\nKeterangan: " + keterangan : ""}`, appSettings);
        }
      } else if (action === "toggle_block") {
        const superAdminEmail = ((env && env.ADMIN_EMAIL) || "syamsul18782@gmail.com").toLowerCase().trim();
        if (email.toLowerCase().trim() === superAdminEmail || email.toLowerCase().trim() === "syamsul18782@gmail.com") {
          return jsonResponse({ success: false, message: "Akun Pemilik Utama (Super Admin) tidak dapat diblokir!" }, 400);
        }
        const user = await env.DB.prepare("SELECT is_blocked FROM users WHERE email = ?").bind(email).first();
        if (user) await env.DB.prepare("UPDATE users SET is_blocked = ? WHERE email = ?").bind(user.is_blocked === 1 ? 0 : 1, email).run();
        if (sendTelegramLog2) {
          await sendTelegramLog2(`\u{1F6E1}\uFE0F ADMIN UBAH STATUS BLOKIR`, `Status blokir diubah untuk akun:
Email: ${email}
Status: ${user.is_blocked === 1 ? "Aktif Kembali" : "Diblokir"}`, appSettings);
        }
      } else if (action === "toggle_admin") {
        if (!isSuperAdmin(currentUser, env)) {
          return jsonResponse({ success: false, message: "Akses ditolak: Hanya Super Admin (Pemilik) yang dapat mengubah role pengguna." }, 403);
        }
        const superAdminEmail = ((env && env.ADMIN_EMAIL) || "syamsul18782@gmail.com").toLowerCase().trim();
        if (email.toLowerCase().trim() === superAdminEmail || email.toLowerCase().trim() === "syamsul18782@gmail.com") {
          return jsonResponse({ success: false, message: "Hak akses Pemilik Utama (Super Admin) tidak dapat diubah!" }, 400);
        }
        const targetUser = await env.DB.prepare("SELECT email, name, is_admin FROM users WHERE email = ?").bind(email).first();
        if (!targetUser) {
          return jsonResponse({ success: false, message: "Pengguna tidak ditemukan." }, 404);
        }
        let newAdminStatus = 0;
        const targetVal = parseInt(value);
        if (!isNaN(targetVal) && [0, 1, 2].includes(targetVal)) {
          newAdminStatus = targetVal;
        } else {
          newAdminStatus = targetUser.is_admin >= 1 ? 0 : 1;
        }
        await env.DB.prepare("UPDATE users SET is_admin = ? WHERE email = ?").bind(newAdminStatus, email).run();
        
        let roleName = "Pengguna Biasa";
        let notifTitle = "ℹ️ Status Akun Diperbarui";
        let notifMsg = `Halo ${targetUser.name || email}! Akun Anda kini berstatus sebagai <b>Pengguna Biasa</b>.`;
        if (newAdminStatus === 2) {
          roleName = "SUPER ADMINISTRATOR (AKSES PENUH)";
          notifTitle = "👑 Hak Akses Super Administrator Diaktifkan";
          notifMsg = `Halo ${targetUser.name || email}! Akun Anda telah diangkat menjadi <b>Super Administrator</b> dengan hak akses penuh. Menu: <a href="/admin" class="text-amber-400 font-bold underline">Panel Kontrol Admin</a>.`;
        } else if (newAdminStatus === 1) {
          roleName = "ADMINISTRATOR BIASA";
          notifTitle = "🛡️ Hak Akses Administrator Diaktifkan";
          notifMsg = `Halo ${targetUser.name || email}! Akun Anda telah diangkat menjadi <b>Administrator</b> oleh Super Admin. Anda kini dapat mengakses menu <a href="/admin" class="text-purple-400 font-bold underline">Panel Kontrol Admin</a> untuk kelola pesanan, katalog PPOB, tiket, dan saldo.`;
        }
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(email, notifTitle, notifMsg, now).run();

        if (sendTelegramLog2) {
          await sendTelegramLog2(`🛡️ SUPER ADMIN UBAH ROLE PENGGUNA`, `Perubahan hak akses akun:
Admin Pelaksana: ${currentUser.email}
User Target: ${email}
Role Baru: ${roleName}`, appSettings);
        }
      }
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/toggle-maintenance" && request.method === "POST") {
    if (!isSuperAdmin(currentUser, env)) {
      return jsonResponse({ success: false, message: "Akses ditolak: Hanya Super Admin yang diizinkan mengubah Mode Pemeliharaan." }, 403);
    }
    try {
      const current = await getAppSettings(env);
      const newStatus = !current.maintenance_mode;
      const updatedSettings = Object.assign({}, current, { maintenance_mode: newStatus });
      const settingStr = JSON.stringify(updatedSettings);
      const existing = await env.DB.prepare("SELECT key FROM settings WHERE key = 'app'").first();
      if (existing) await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'app'").bind(settingStr).run();
      else await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('app', ?)").bind(settingStr).run();
      setCachedAppSettings(updatedSettings);
      if (sendTelegramLog2) {
        await sendTelegramLog2(`\u2699\uFE0F ADMIN MODE MAINTENANCE DIUBAH`, `Status: ${newStatus ? "\u{1F534} AKTIF (ON) - Akses Terkunci Khusus Admin" : "\u{1F7E2} NONAKTIF (OFF) - Normal Publik"}
Diubah oleh: ${currentUser ? currentUser.email : "Super Admin"}
Waktu: ${getWIBTime()}`, updatedSettings);
      }
      return jsonResponse({ success: true, maintenance_mode: newStatus });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/settings" && request.method === "POST") {
    if (!isSuperAdmin(currentUser, env)) {
      return jsonResponse({ success: false, message: "Akses ditolak: Hanya Super Admin yang diizinkan mengubah konfigurasi sistem & API Key." }, 403);
    }
    try {
      const { payment_tripay, payment_violet, payment_qris_manual, payment_manual, payment_shopeepay, payment_gopay, manual_bsi_rek, manual_bsi_name, manual_dana_rek, manual_dana_name, manual_shopee_rek, manual_shopee_name, autogopay_api_key, shopeepay_qris_static, gopay_qris_static, ai_chat_active, ai_provider, ai_hourly_limit, price_per_day, script_price_per_day, kmsp_markup, telegram_bot_token, telegram_channel_id, auto_backup_frequency, maintenance_mode, servers } = await request.json();
      const settingStr = JSON.stringify({ payment_tripay, payment_violet, payment_qris_manual, payment_manual: payment_manual !== undefined ? payment_manual : payment_qris_manual, payment_shopeepay, payment_gopay, manual_bsi_rek: manual_bsi_rek || '7293609009', manual_bsi_name: manual_bsi_name || 'sutroni soga', manual_dana_rek: manual_dana_rek || '08979527685', manual_dana_name: manual_dana_name || 'sutroni soga', manual_shopee_rek: manual_shopee_rek || '08979527685', manual_shopee_name: manual_shopee_name || 'hasnasyukur', autogopay_api_key, shopeepay_qris_static, gopay_qris_static, ai_chat_active, ai_provider, ai_hourly_limit: parseInt(ai_hourly_limit) || 10, price_per_day, script_price_per_day, kmsp_markup, telegram_bot_token, telegram_channel_id, auto_backup_frequency, maintenance_mode, servers });
      const existing = await env.DB.prepare("SELECT key FROM settings WHERE key = 'app'").first();
      if (existing) await env.DB.prepare("UPDATE settings SET value = ? WHERE key = 'app'").bind(settingStr).run();
      else await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('app', ?)").bind(settingStr).run();
      if (auto_backup_frequency !== undefined) {
        await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_backup_frequency', ?)").bind(String(auto_backup_frequency)).run();
      }
      setCachedAppSettings(JSON.parse(settingStr));
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/send-message" && request.method === "POST") {
    try {
      const { targetType, targetEmail, title, message } = await request.json();
      if (targetType === "all") {
        const { results: users } = await env.DB.prepare("SELECT email FROM users").all();
        for (const u of users) await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(u.email, title, message, now).run();
      } else {
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(targetEmail, title, message, now).run();
      }
      if (sendTelegramLog2) {
        await sendTelegramLog2(`\u{1F4E2} ADMIN BROADCAST PESAN`, `Target: ${targetType === "all" ? "Semua User" : targetEmail}
Judul: ${title}

Pesan:
${message}`, appSettings);
      }
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/user-inbox" && request.method === "POST") {
    try {
      const { email } = await request.json();
      const { results: inbox } = await env.DB.prepare("SELECT * FROM inbox WHERE email = ? ORDER BY id DESC").bind(email).all();
      return jsonResponse({ success: true, inbox: inbox || [] });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/vpn-search" && request.method === "POST") {
    try {
      const { keyword } = await request.json();
      const { results } = await env.DB.prepare("SELECT * FROM vpns WHERE username LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 50").bind(`%${keyword}%`, `%${keyword}%`).all();
      return jsonResponse({ success: true, data: results || [] });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/global-change-uuid" && request.method === "POST") {
    try {
      const { serverId, oldUuid, newUuid } = await request.json();
      const targetServer = appSettings.servers.find((s) => s.id === serverId);
      if (!targetServer) throw new Error("Server konfigurasi VPS tidak ditemukan.");
      const endpoint = `/srpcom/change-uuid`;
      const fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": targetServer.key },
        body: JSON.stringify({ uuidold: oldUuid, uuidnew: newUuid })
      };
      const vpsReq = await fetch(targetServer.host + endpoint, fetchOptions);
      if (!vpsReq.ok) throw new Error(`Server VPS menolak request dengan HTTP Status: ${vpsReq.status}`);
      const vpsRes = await vpsReq.json();
      const resultText = vpsRes.detail?.stdout || vpsRes.stdout || "Aksi berhasil (VPS tidak merespons output text)";
      if (sendTelegramLog2) {
        await sendTelegramLog2(`\u{1F511} ADMIN GLOBAL GANTI UUID`, `Admin mengeksekusi fitur Global Ganti UUID.
Server: ${targetServer.name}
UUID Lama: ${oldUuid}
UUID Baru: ${newUuid}

Respons VPS:
${resultText}`, appSettings);
      }
      return jsonResponse({ success: true, resultText });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/global-delete-vpn" && request.method === "POST") {
    try {
      const { serverId, username } = await request.json();
      if (!username) throw new Error("Username tidak boleh kosong.");
      const targetServer = appSettings.servers.find((s) => s.id === serverId);
      if (!targetServer) throw new Error("Server konfigurasi VPS tidak ditemukan.");
      const dbRes = await env.DB.prepare("DELETE FROM vpns WHERE username = ? AND server = ?").bind(username, targetServer.name).run();
      const dbMsg = dbRes.meta.changes > 0 ? `Dihapus dari Database Lokal (${dbRes.meta.changes} record).` : "Tidak ditemukan di Database Lokal.";
      const endpoints = [
        "/srpcom/del-ssh",
        "/srpcom/del-vmessws",
        "/srpcom/del-vlessws",
        "/srpcom/del-trojanws",
        "/srpcom/del-l2tp"
      ];
      let vpsResults = [];
      const fetchPromises = endpoints.map((ep) => {
        return fetch(targetServer.host + ep, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "x-api-key": targetServer.key },
          body: JSON.stringify({ user: username })
        }).then(async (res) => {
          const data = await res.json();
          return `[${ep}] ${data.detail?.stdout || data.stdout || "Success"}`;
        }).catch((err) => `[${ep}] Error/No Response`);
      });
      const settledResults = await Promise.allSettled(fetchPromises);
      settledResults.forEach((res) => {
        if (res.status === "fulfilled") vpsResults.push(res.value);
        else vpsResults.push(res.reason);
      });
      const resultText = `Status Database Lokal:
${dbMsg}

Respon Eksekusi Server VPS:
` + vpsResults.join("\n");
      if (sendTelegramLog2) {
        await sendTelegramLog2(`\u{1F5D1}\uFE0F ADMIN GLOBAL DELETE VPN`, `Admin mengeksekusi fitur Global Delete VPN.
Server: ${targetServer.name}
Username Target: ${username}

Log Eksekusi:
${resultText}`, appSettings);
      }
      return jsonResponse({ success: true, resultText });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/ping-server" && request.method === "POST") {
    try {
      const { serverId } = await request.json();
      if (!serverId) throw new Error("Parameter serverId tidak lengkap.");
      const targetServer = appSettings.servers.find((s) => String(s.id) === String(serverId));
      if (!targetServer) throw new Error("Server tidak ditemukan di konfigurasi.");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4e3);
      try {
        const response = await fetch(targetServer.host + "/srpcom/cek-xray", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": targetServer.key
          },
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (response.ok) {
          return jsonResponse({ success: true, status: "ONLINE" });
        } else {
          return jsonResponse({ success: true, status: "OFFLINE", message: `HTTP status: ${response.status}` });
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        let errMsg = fetchError.message || "Error";
        if (fetchError.name === "AbortError") {
          errMsg = "Timeout (4s)";
        }
        return jsonResponse({ success: true, status: "OFFLINE", message: errMsg });
      }
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/monitor-server" && request.method === "POST") {
    try {
      const { serverId, protocol } = await request.json();
      if (!serverId || !protocol) throw new Error("Parameter tidak lengkap.");
      const targetServer = appSettings.servers.find((s) => s.id === serverId);
      if (!targetServer) throw new Error("Server konfigurasi VPS tidak ditemukan.");
      let endpoint = "";
      if (protocol === "ssh") {
        endpoint = "/srpcom/cek-ssh";
      } else if (protocol === "xray") {
        endpoint = "/srpcom/cek-xray";
      } else {
        throw new Error("Protokol tidak didukung untuk monitoring.");
      }
      const fetchOptions = {
        method: "GET",
        headers: { "Content-Type": "application/json", "x-api-key": targetServer.key }
      };
      const vpsReq = await fetch(targetServer.host + endpoint, fetchOptions);
      if (!vpsReq.ok) throw new Error(`Server VPS menolak request dengan HTTP Status: ${vpsReq.status}`);
      const vpsRes = await vpsReq.json();
      let resultText = vpsRes.detail?.stdout || vpsRes.stdout || "Aksi berhasil (VPS tidak merespons output text)";
      resultText = resultText.replace(/\x1B\[[0-9;]*[mK]/g, "");
      return jsonResponse({ success: true, resultText });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/live-explorer/list" && request.method === "POST") {
    try {
      const { serverId, protocol } = await request.json();
      const targetServer = appSettings.servers.find((s) => s.id === serverId);
      if (!targetServer) throw new Error("Server tidak ditemukan di konfigurasi.");
      const endpoint = `/srpcom/list-accounts/${protocol}`;
      const fetchOptions = {
        method: "GET",
        headers: { "Content-Type": "application/json", "x-api-key": targetServer.key }
      };
      const vpsReq = await fetch(targetServer.host + endpoint, fetchOptions);
      if (!vpsReq.ok) throw new Error(`VPS menolak request dengan HTTP Status: ${vpsReq.status}`);
      const vpsRes = await vpsReq.json();
      let resultText = vpsRes.detail?.stdout || vpsRes.stdout || "Berhasil memuat namun tidak ada data yang diterima dari VPS.";
      resultText = resultText.replace(/\x1B\[[0-9;]*[mK]/g, "");
      return jsonResponse({ success: true, resultText });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/live-explorer/detail" && request.method === "POST") {
    try {
      const { serverId, protocol, username } = await request.json();
      const targetServer = appSettings.servers.find((s) => s.id === serverId);
      if (!targetServer) throw new Error("Server tidak ditemukan di konfigurasi.");
      let apiEndpoint = "";
      if (protocol === "ssh") apiEndpoint = "/srpcom/detail-ssh";
      else if (protocol === "l2tp") apiEndpoint = "/srpcom/detail-l2tp";
      else if (["vmess", "vless", "trojan"].includes(protocol)) apiEndpoint = `/srpcom/detail-${protocol}ws`;
      else throw new Error("Protokol tidak dikenali oleh sistem.");
      const fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": targetServer.key },
        body: JSON.stringify({ user: username })
      };
      const vpsReq = await fetch(targetServer.host + apiEndpoint, fetchOptions);
      if (!vpsReq.ok) throw new Error(`VPS menolak request dengan HTTP Status: ${vpsReq.status}`);
      const vpsRes = await vpsReq.json();
      let resultText = vpsRes.detail?.stdout || vpsRes.stdout || "Detail tidak ditemukan pada VPS (Atau username salah).";
      resultText = resultText.replace(/\x1B\[[0-9;]*[mK]/g, "");
      return jsonResponse({ success: true, resultText });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/live-explorer/delete" && request.method === "POST") {
    try {
      const { serverId, protocol, username } = await request.json();
      if (!username) throw new Error("Username tidak boleh kosong.");
      const targetServer = appSettings.servers.find((s) => s.id === serverId);
      if (!targetServer) throw new Error("Server tidak ditemukan di konfigurasi.");
      const dbRes = await env.DB.prepare("DELETE FROM vpns WHERE username = ? AND server = ?").bind(username, targetServer.name).run();
      const dbMsg = dbRes.meta.changes > 0 ? `Dihapus dari Database Lokal (${dbRes.meta.changes} record).` : "Tidak ditemukan di Database Lokal.";
      let apiEndpoint = "";
      if (protocol === "ssh") apiEndpoint = "/srpcom/del-ssh";
      else if (protocol === "l2tp") apiEndpoint = "/srpcom/del-l2tp";
      else if (["vmess", "vless", "trojan"].includes(protocol)) apiEndpoint = `/srpcom/del-${protocol}ws`;
      else throw new Error("Protokol tidak dikenali oleh sistem.");
      const fetchOptions = {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "x-api-key": targetServer.key },
        body: JSON.stringify({ user: username })
      };
      const vpsReq = await fetch(targetServer.host + apiEndpoint, fetchOptions);
      if (!vpsReq.ok) throw new Error(`VPS menolak request dengan HTTP Status: ${vpsReq.status}`);
      const vpsRes = await vpsReq.json();
      let resultText = vpsRes.detail?.stdout || vpsRes.stdout || "Hapus live berhasil (VPS tidak merespons output text)";
      resultText = resultText.replace(/\x1B\[[0-9;]*[mK]/g, "");
      const finalLog = `Status Database Lokal: ${dbMsg}

Respon VPS:
${resultText}`;
      if (sendTelegramLog2) {
        await sendTelegramLog2(`\u{1F5D1}\uFE0F ADMIN LIVE DELETE ACCOUNT`, `Admin menghapus akun dari explorer secara live.
Server: ${targetServer.name}
Protocol: ${protocol.toUpperCase()}
Username: ${username}

Log:
${finalLog}`, appSettings);
      }
      return jsonResponse({ success: true, resultText: finalLog });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/live-explorer/renew" && request.method === "POST") {
    try {
      const { serverId, protocol, username, duration } = await request.json();
      if (!username) throw new Error("Username tidak boleh kosong.");
      if (!duration || isNaN(parseInt(duration))) throw new Error("Durasi perpanjangan tidak valid.");
      const targetServer = appSettings.servers.find((s) => s.id === serverId);
      if (!targetServer) throw new Error("Server tidak ditemukan di konfigurasi.");
      const vpnRecord = await env.DB.prepare("SELECT * FROM vpns WHERE username = ? AND server = ?").bind(username, targetServer.name).first();
      let dbMsg = "Tidak ditemukan di Database Lokal (Akun Gaib).";
      if (vpnRecord) {
        await env.DB.prepare("UPDATE vpns SET exp = exp || ? WHERE id = ?").bind(` (+${duration} Hari)`, vpnRecord.id).run();
        const userTitle = `[RENEW] Perpanjangan Berhasil!`;
        const userMsg = `Masa aktif akun VPN <b>${username}</b> Anda telah berhasil diperpanjang oleh Admin sebanyak <b>${duration} Hari</b>.`;
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(vpnRecord.email, userTitle, userMsg, now).run();
        dbMsg = `Diperpanjang di Database Lokal & Inbox terkirim ke ${vpnRecord.email}.`;
      }
      let apiEndpoint = "";
      if (protocol === "ssh") apiEndpoint = "/srpcom/renew-ssh";
      else if (protocol === "l2tp") apiEndpoint = "/srpcom/renew-l2tp";
      else if (["vmess", "vless", "trojan"].includes(protocol)) apiEndpoint = `/srpcom/renew-${protocol}ws`;
      else throw new Error("Protokol tidak dikenali oleh sistem.");
      const fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": targetServer.key },
        body: JSON.stringify({ user: username, exp: String(duration) })
      };
      const vpsReq = await fetch(targetServer.host + apiEndpoint, fetchOptions);
      if (!vpsReq.ok) throw new Error(`VPS menolak request dengan HTTP Status: ${vpsReq.status}`);
      const vpsRes = await vpsReq.json();
      let resultText = vpsRes.detail?.stdout || vpsRes.stdout || "Perpanjang live berhasil (VPS tidak merespons output text)";
      resultText = resultText.replace(/\x1B\[[0-9;]*[mK]/g, "");
      const finalLog = `Status Database Lokal: ${dbMsg}

Respon VPS:
${resultText}`;
      if (sendTelegramLog2) {
        await sendTelegramLog2(`\u{1F504} ADMIN LIVE RENEW ACCOUNT`, `Admin memperpanjang akun dari explorer secara live.
Server: ${targetServer.name}
Protocol: ${protocol.toUpperCase()}
Username: ${username}
Ditambah: ${duration} Hari

Log:
${finalLog}`, appSettings);
      }
      return jsonResponse({ success: true, resultText: finalLog });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/live-explorer/link-user" && request.method === "POST") {
    try {
      const { serverId, protocol, username, email } = await request.json();
      if (!username) throw new Error("Username VPN tidak boleh kosong.");
      if (!email) throw new Error("Email user website tidak boleh kosong.");
      const targetServer = appSettings.servers.find((s) => s.id === serverId);
      if (!targetServer) throw new Error("Server tidak ditemukan di konfigurasi.");
      const targetUser = await env.DB.prepare("SELECT email, name FROM users WHERE email = ?").bind(email).first();
      if (!targetUser) {
        return jsonResponse({ success: false, message: `Email "${email}" tidak terdaftar sebagai pengguna website.` }, 400);
      }
      let apiEndpoint = "";
      if (protocol === "ssh") apiEndpoint = "/srpcom/detail-ssh";
      else if (protocol === "l2tp") apiEndpoint = "/srpcom/detail-l2tp";
      else if (["vmess", "vless", "trojan"].includes(protocol)) apiEndpoint = `/srpcom/detail-${protocol}ws`;
      else throw new Error("Protokol tidak dikenali oleh sistem.");
      const fetchOptions = {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": targetServer.key },
        body: JSON.stringify({ user: username })
      };
      const vpsReq = await fetch(targetServer.host + apiEndpoint, fetchOptions);
      let rawResponseText = "";
      let remainingDaysStr = "30 Hari";
      if (vpsReq.ok) {
        const vpsRes = await vpsReq.json();
        rawResponseText = vpsRes.detail?.stdout || vpsRes.stdout || "";
        rawResponseText = rawResponseText.replace(/\x1B\[[0-9;]*[mK]/g, "");
        const expiryMatch = rawResponseText.match(/(?:Expired|Expired On|Kedaluwarsa|Masa Aktif)\s*:\s*([^\n\r]+)/i);
        if (expiryMatch) {
          remainingDaysStr = expiryMatch[1].trim();
        } else {
          const daysMatch = rawResponseText.match(/(\d+)\s*(?:Hari|Days)/i);
          if (daysMatch) {
            remainingDaysStr = daysMatch[0].trim();
          }
        }
      }
      const now2 = getWIBTime();
      const existingVpn = await env.DB.prepare("SELECT id FROM vpns WHERE username = ? AND server = ?").bind(username, targetServer.name).first();
      if (existingVpn) {
        await env.DB.prepare("UPDATE vpns SET email = ?, protocol = ?, date = ?, exp = ? WHERE id = ?").bind(email, protocol.toUpperCase(), now2, remainingDaysStr, existingVpn.id).run();
      } else {
        await env.DB.prepare("INSERT INTO vpns (email, server, protocol, username, date, exp) VALUES (?, ?, ?, ?, ?, ?)").bind(email, targetServer.name, protocol.toUpperCase(), username, now2, remainingDaysStr).run();
      }
      const titleInbox = `Akun VPN/SSH Dihubungkan ke Akun Anda`;
      const bodyMsg = `Admin telah menghubungkan akun berikut ke akun website Anda:<br>
                            - <b>Username:</b> ${username}<br>
                            - <b>Server:</b> ${targetServer.name}<br>
                            - <b>Protokol:</b> ${protocol.toUpperCase()}<br>
                            - <b>Masa Aktif:</b> ${remainingDaysStr}<br><br>
                            Anda dapat melakukan perpanjangan masa aktif akun ini secara mandiri melalui menu Dashboard.`;
      await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(email, titleInbox, bodyMsg, now2).run();
      if (sendTelegramLog2) {
        await sendTelegramLog2(`\u{1F464} ADMIN LINK ACCOUNT TO USER`, `Admin menghubungkan akun VPN/SSH ke user website.
Server: ${targetServer.name}
Protocol: ${protocol.toUpperCase()}
Username: ${username}
Email User: ${email}

Masa Aktif: ${remainingDaysStr}`, appSettings);
      }
      return jsonResponse({ success: true, message: `Akun "${username}" berhasil dihubungkan ke email "${email}"!` });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/vpn-action" && request.method === "POST") {
    try {
      const { vpnId, action, extraData } = await request.json();
      const vpnRecord = await env.DB.prepare("SELECT * FROM vpns WHERE id = ?").bind(vpnId).first();
      if (!vpnRecord) throw new Error("VPN tidak ditemukan di database.");
      const targetServer = appSettings.servers.find((s) => s.name === vpnRecord.server);
      if (!targetServer) throw new Error("Konfigurasi server VPS tidak ditemukan.");
      const protocol = vpnRecord.protocol.toLowerCase();
      let endpoint = "";
      let fetchMethod = "POST";
      let includeBody = true;
      if (action === "delete") {
        fetchMethod = "DELETE";
        if (protocol.includes("trojan")) endpoint = "/srpcom/del-trojanws";
        else if (protocol.includes("vmess")) endpoint = "/srpcom/del-vmessws";
        else if (protocol.includes("vless")) endpoint = "/srpcom/del-vlessws";
        else if (protocol.includes("ssh") || protocol.includes("ovpn")) endpoint = "/srpcom/del-ssh";
        else if (protocol.includes("l2tp")) endpoint = "/srpcom/del-l2tp";
      } else if (action === "renew") {
        fetchMethod = "POST";
        if (protocol.includes("trojan")) endpoint = "/srpcom/renew-trojanws";
        else if (protocol.includes("vmess")) endpoint = "/srpcom/renew-vmessws";
        else if (protocol.includes("vless")) endpoint = "/srpcom/renew-vlessws";
        else if (protocol.includes("ssh") || protocol.includes("ovpn")) endpoint = "/srpcom/renew-ssh";
        else if (protocol.includes("l2tp")) endpoint = "/srpcom/renew-l2tp";
        else throw new Error("Protokol ini tidak mendukung fitur Perpanjang.");
      } else if (action === "change_uuid") {
        fetchMethod = "POST";
        const isXray = protocol.includes("trojan") || protocol.includes("vmess") || protocol.includes("vless");
        if (isXray) endpoint = `/srpcom/change-uuid`;
        else throw new Error("Fitur Ganti UUID dari API ini khusus untuk jenis VPN XRAY (Trojan/Vmess/Vless) saja.");
      } else if (action === "detail") {
        fetchMethod = "GET";
        includeBody = false;
        if (protocol.includes("trojan")) endpoint = "/srpcom/detail-trojanws";
        else if (protocol.includes("vmess")) endpoint = "/srpcom/detail-vmessws";
        else if (protocol.includes("vless")) endpoint = "/srpcom/detail-vlessws";
        else throw new Error("Protokol ini tidak mendukung fitur Cek Detail.");
      } else if (action === "lock" || action === "unlock") {
        fetchMethod = "GET";
        includeBody = false;
        const isXray = protocol.includes("trojan") || protocol.includes("vmess") || protocol.includes("vless");
        if (isXray) endpoint = `/srpcom/${action}-xray`;
        else if (protocol.includes("ssh") || protocol.includes("ovpn")) endpoint = `/srpcom/${action}-ssh`;
        else throw new Error("Protokol ini tidak mendukung fitur Lock/Unlock.");
      }
      if (!endpoint) throw new Error("Aksi atau protokol tidak dikenali.");
      let finalUrl = targetServer.host + endpoint;
      if (!includeBody) finalUrl += `?user=${encodeURIComponent(vpnRecord.username)}`;
      let resultText = "";
      try {
        const fetchOptions = {
          method: fetchMethod,
          headers: { "Content-Type": "application/json", "x-api-key": targetServer.key }
        };
        if (includeBody) {
          let payload = { user: vpnRecord.username };
          if (action === "renew" && extraData) payload.exp = String(extraData);
          if (action === "change_uuid" && extraData && extraData !== "random") payload.uuid = extraData;
          fetchOptions.body = JSON.stringify(payload);
        }
        const vpsReq = await fetch(finalUrl, fetchOptions);
        if (!vpsReq.ok) throw new Error(`Server VPS menolak request dengan HTTP Status: ${vpsReq.status}`);
        const vpsRes = await vpsReq.json();
        resultText = vpsRes.detail?.stdout || vpsRes.stdout || "Aksi berhasil (VPS tidak merespons output text)";
      } catch (apiError) {
        if (action === "detail") {
          const inboxRecord = await env.DB.prepare("SELECT message FROM inbox WHERE email = ? AND message LIKE ? ORDER BY id DESC LIMIT 1").bind(vpnRecord.email, `%${vpnRecord.username}%`).first();
          if (inboxRecord) {
            let cleanConfigText = inboxRecord.message.replace(/\x1B\[[0-9;]*[mK]/g, "").replace(/<\/?[^>]+(>|$)/g, "");
            const matches = [...inboxRecord.message.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)];
            let extracted = matches.length > 0 ? matches[matches.length - 1][1] : cleanConfigText.trim();
            resultText = `=================================
INFORMASI ${vpnRecord.protocol.toUpperCase()}
=================================

Username : ${vpnRecord.username}
Server   : ${vpnRecord.server}
Expired  : ${vpnRecord.exp}

*Catatan: API Cek Detail VPS tidak sinkron dengan Cloudflare. Data ditarik dari Riwayat Database.*

${extracted}`;
          } else {
            throw new Error(`Gagal ke API VPS (${apiError.message}) dan Riwayat config tidak ditemukan di Database.`);
          }
        } else {
          throw apiError;
        }
      }
      if (action === "delete") {
        await env.DB.prepare("DELETE FROM vpns WHERE id = ?").bind(vpnId).run();
        if (sendTelegramLog2) await sendTelegramLog2(`\u{1F5D1}\uFE0F ADMIN HAPUS VPN`, `Admin menghapus akun VPN secara permanen.
ID VPN: ${vpnId}
Username: ${vpnRecord.username}
Email Pemilik: ${vpnRecord.email}`, appSettings);
      } else if (action === "renew") {
        await env.DB.prepare("UPDATE vpns SET exp = exp || ? WHERE id = ?").bind(` (+${extraData} Hari)`, vpnId).run();
        const userTitle = `[RENEW] Perpanjangan Berhasil!`;
        const userMsg = `Masa aktif akun VPN <b>${vpnRecord.username}</b> Anda telah berhasil diperpanjang oleh Admin sebanyak <b>${extraData} Hari</b>.`;
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(vpnRecord.email, userTitle, userMsg, now).run();
        const adminTitle = `[ADMIN RENEW] Perpanjangan ${vpnRecord.username}`;
        const adminMsg = `Anda berhasil memperpanjang akun VPN <b>${vpnRecord.username}</b> milik user <b>${vpnRecord.email}</b> sebanyak <b>${extraData} Hari</b>.`;
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(currentUser.email, adminTitle, adminMsg, now).run();
        if (sendTelegramLog2) await sendTelegramLog2(`\u{1F504} ADMIN RENEW VPN`, `Admin memperpanjang akun VPN.
Username: ${vpnRecord.username}
Email Pemilik: ${vpnRecord.email}
Ditambah: ${extraData} Hari`, appSettings);
      } else if (action === "change_uuid") {
        const uuidInfo = extraData && extraData !== "random" ? `menjadi <b>${extraData}</b>` : `dengan UUID acak baru`;
        const userTitle = `[UPDATE] Konfigurasi UUID VPN Diganti`;
        const userMsg = `UUID untuk akun VPN <b>${vpnRecord.username}</b> Anda telah diperbarui ${uuidInfo} oleh sistem.\\n\\nBerikut adalah detail konfigurasi terbaru Anda:<br><br><div class="bg-gray-950 p-4 rounded-lg overflow-x-auto custom-scrollbar border border-gray-800"><pre class="text-green-400 font-mono text-[11px] leading-relaxed select-all whitespace-pre-wrap">${resultText}</pre></div>`;
        await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(vpnRecord.email, userTitle, userMsg, now).run();
        if (sendTelegramLog2) await sendTelegramLog2(`\u{1F511} ADMIN GANTI UUID VPN`, `Admin mengganti UUID akun VPN.
Username: ${vpnRecord.username}
Email Pemilik: ${vpnRecord.email}`, appSettings);
      }
      return jsonResponse({ success: true, resultText });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/backup" && request.method === "GET") {
    try {
      const backupData = await generateBackupData(env);
      return new Response(JSON.stringify(backupData, null, 2), {
        headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="backup.json"' }
      });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/backup-config" && request.method === "GET") {
    try {
      const appSettings = await getAppSettings(env);
      const lastBackupKey = "last_backup_timestamp";
      let lastBackupTime = 0;
      try {
        const row = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(lastBackupKey).first();
        if (row && row.value) lastBackupTime = parseInt(row.value);
      } catch (e) {}
      let lastBackupDate = "-";
      if (lastBackupTime > 0) {
        lastBackupDate = new Date(lastBackupTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + " WIB";
      }
      return jsonResponse({
        success: true,
        frequency: appSettings.auto_backup_frequency !== undefined ? parseInt(appSettings.auto_backup_frequency) : 24,
        lastBackupTime,
        lastBackupDate,
        telegramBotConfigured: Boolean(appSettings.telegram_bot_token && appSettings.telegram_channel_id)
      });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/backup-config" && request.method === "POST") {
    try {
      const body = await request.json();
      const frequency = parseInt(body.frequency);
      if (isNaN(frequency) || frequency < 0) {
        return jsonResponse({ success: false, message: "Nilai frekuensi tidak valid" }, 400);
      }
      const appSettings = await getAppSettings(env);
      appSettings.auto_backup_frequency = frequency;
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('app', ?)").bind(JSON.stringify(appSettings)).run();
      await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('auto_backup_frequency', ?)").bind(String(frequency)).run();
      cachedAppSettings = null;
      const timesPerDay = frequency > 0 ? (24 / frequency) : 0;
      const desc = frequency === 1 ? "Tiap 1 Jam (24x sehari)" : `Tiap ${frequency} Jam (${timesPerDay}x sehari)`;
      return jsonResponse({
        success: true,
        message: frequency > 0 ? `Jadwal auto-backup berhasil diatur ke ${desc}!` : "Auto-backup berhasil dinonaktifkan."
      });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/backup-telegram" && request.method === "POST") {
    try {
      const botToken = appSettings.telegram_bot_token;
      const chatId = appSettings.telegram_channel_id;
      if (!botToken || !chatId) {
        return jsonResponse({ success: false, message: "Bot Token atau Chat ID Telegram belum dikonfigurasi!" }, 400);
      }
      const backupObj = await generateBackupData(env);
      const { users, inbox, invoices, settings, ppob_transactions } = backupObj;
      const dateMatch = now.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const todayStr = dateMatch ? dateMatch[0] : "";
      const monthStr = dateMatch ? `${dateMatch[2]}/${dateMatch[3]}` : "";
      const isoToday = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : "";
      const isoMonth = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}` : "";

      const totalUsers = users.length;
      const totalSaldo = users.reduce((sum, u) => sum + (u.balance || 0), 0);
      const paidInvoices = (invoices || []).filter((i) => i.status === "PAID");
      const ppobTx = ppob_transactions || [];
      const xlPurchases = (inbox || []).filter((i) => i.title && i.title.includes("[SUKSES] Pembelian Paket XL"));
      const totalTransactions = paidInvoices.length + ppobTx.length + xlPurchases.length;

      const topupMonthList = paidInvoices.filter((i) => i.date && (i.date.includes(monthStr) || i.date.includes(isoMonth)));
      const topupThisMonth = topupMonthList.reduce((sum, i) => sum + (i.amount || 0), 0);
      const ppobThisMonth = ppobTx.filter((p) => p.created_at && (p.created_at.includes(monthStr) || p.created_at.includes(isoMonth))).length +
                            xlPurchases.filter((i) => i.date && (i.date.includes(monthStr) || i.date.includes(isoMonth))).length;

      const topupTodayList = paidInvoices.filter((i) => i.date && (i.date.includes(todayStr) || i.date.includes(isoToday)));
      const topupToday = topupTodayList.reduce((sum, i) => sum + (i.amount || 0), 0);
      const ppobToday = ppobTx.filter((p) => p.created_at && (p.created_at.includes(todayStr) || p.created_at.includes(isoToday))).length +
                        xlPurchases.filter((i) => i.date && (i.date.includes(todayStr) || i.date.includes(isoToday))).length;

      const captionHtml = `#awanpulsa
<b>\u{1F4CA} Statistik AwanPulsa</b>

Pengguna: ${totalUsers}
Transaksi: ${totalTransactions}
Saldo: Rp ${totalSaldo.toLocaleString("id-ID")}

<b>Bulan ini:</b>
Top Up: Rp ${topupThisMonth.toLocaleString("id-ID")}
Transaksi PPOB & Pulsa: ${ppobThisMonth} transaksi

<b>Hari ini:</b>
Top Up: Rp ${topupToday.toLocaleString("id-ID")}
Transaksi PPOB & Pulsa: ${ppobToday} transaksi

#awanpulsabackup`;
      const backupData = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([backupData], { type: "application/json" });
      await saveBackupToR2(env, backupObj, now);
      const cleanNow = now.replace(/[\/\s:,]/g, "_");
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("caption", captionHtml);
      formData.append("parse_mode", "HTML");
      formData.append("document", blob, `Backup_AwanPulsa_${cleanNow}.json`);
      const tgReq = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: "POST",
        body: formData
      });
      const tgRes = await tgReq.json();
      if (!tgRes.ok) {
        return jsonResponse({ success: false, message: tgRes.description || "Gagal mengirim ke Telegram" }, 500);
      }
      let rekapText = `Rekap saldo pengguna
Total : Rp.${totalSaldo.toLocaleString("id-ID")}

`;
      rekapText += "NO | Akun                          | Saldo      |\n";
      users.forEach((u, i) => {
        const no = String(i + 1).padEnd(2, " ");
        const email = u.email.padEnd(29, " ");
        const balance = (u.balance || 0).toLocaleString("id-ID").padEnd(10, " ");
        rekapText += `${no} | ${email} | ${balance} |
`;
      });
      const timeMatch = now.match(/(\d{2})[:\.](\d{2})/);
      const fileNameTime = dateMatch && timeMatch ? `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}_${timeMatch[1]}${timeMatch[2]} WIB` : "now";
      const rekapBlob = new Blob([rekapText], { type: "text/plain" });
      const rekapFormData = new FormData();
      rekapFormData.append("chat_id", chatId);
      rekapFormData.append("document", rekapBlob, `rekap saldo user ${fileNameTime}.txt`);
      await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
        method: "POST",
        body: rekapFormData
      });
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  if (url.pathname === "/api/admin/restore" && request.method === "POST") {
    if (!isSuperAdmin(currentUser, env)) {
      return jsonResponse({ success: false, message: "Akses ditolak: Hanya Super Admin (Pemilik) yang dapat melakukan Restore Database." }, 403);
    }
    try {
      const data = await request.json();
      if (!data.users || !data.vpns || !data.inbox || !data.invoices || !data.settings) throw new Error("Format backup tidak valid.");
      await env.DB.batch([
        env.DB.prepare("DELETE FROM users"),
        env.DB.prepare("DELETE FROM vpns"),
        env.DB.prepare("DELETE FROM inbox"),
        env.DB.prepare("DELETE FROM invoices"),
        env.DB.prepare("DELETE FROM settings")
      ]);
      try {
        await env.DB.prepare("DELETE FROM licenses").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("DELETE FROM transactions").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("DELETE FROM tickets").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("DELETE FROM ticket_replies").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("DELETE FROM ai_usage").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("DELETE FROM ppob_transactions").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("DELETE FROM ppob_products").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("DELETE FROM user_contacts").run();
      } catch (e) {
      }
      const stmts = [];
      for (const u of data.users) stmts.push(env.DB.prepare("INSERT INTO users (email, name, phone, balance, is_blocked) VALUES (?, ?, ?, ?, ?)").bind(u.email, u.name, u.phone, u.balance, u.is_blocked || 0));
      for (const v of data.vpns) stmts.push(env.DB.prepare("INSERT INTO vpns (id, email, server, protocol, username, date, exp) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(v.id, v.email, v.server, v.protocol, v.username, v.date, v.exp));
      for (const i of data.inbox) stmts.push(env.DB.prepare("INSERT INTO inbox (id, email, title, message, date, read) VALUES (?, ?, ?, ?, ?, ?)").bind(i.id, i.email, i.title, i.message, i.date, i.read));
      for (const inv of data.invoices) stmts.push(env.DB.prepare("INSERT INTO invoices (id, ref, email, amount, status, date) VALUES (?, ?, ?, ?, ?, ?)").bind(inv.id, inv.ref, inv.email, inv.amount, inv.status, inv.date));
      for (const s of data.settings) stmts.push(env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").bind(s.key, s.value));
      for (const l of data.licenses || []) {
        stmts.push(env.DB.prepare("INSERT INTO licenses (id, email, vps_name, ip_address, expires_at, created_at, subdomain, cf_record_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(l.id, l.email, l.vps_name, l.ip_address, l.expires_at, l.created_at, l.subdomain || null, l.cf_record_id || null));
      }
      for (const t of data.transactions || []) {
        stmts.push(env.DB.prepare("INSERT INTO transactions (id, email, type, amount, description, balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(t.id, t.email, t.type, t.amount, t.description, t.balance, t.created_at));
      }
      for (const tk of data.tickets || []) {
        stmts.push(env.DB.prepare("INSERT INTO tickets (id, email, subject, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(tk.id, tk.email, tk.subject, tk.category, tk.status, tk.created_at, tk.updated_at));
      }
      for (const tr of data.ticket_replies || []) {
        stmts.push(env.DB.prepare("INSERT INTO ticket_replies (id, ticket_id, sender_type, message, created_at) VALUES (?, ?, ?, ?, ?)").bind(tr.id, tr.ticket_id, tr.sender_type, tr.message, tr.created_at));
      }
      for (const au of data.ai_usage || []) {
        stmts.push(env.DB.prepare("INSERT INTO ai_usage (email, count, slot) VALUES (?, ?, ?)").bind(au.email, au.count, au.slot));
      }
      for (const pt of data.ppob_transactions || []) {
        stmts.push(env.DB.prepare("INSERT INTO ppob_transactions (reqid, email, product_code, product_name, customer_no, cost_price, selling_price, status, sn, info, detail, raw_response, is_refunded, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          pt.reqid, pt.email, pt.product_code, pt.product_name, pt.customer_no, pt.cost_price, pt.selling_price, pt.status, pt.sn || '', pt.info || '', pt.detail || '', pt.raw_response || '', pt.is_refunded || 0, pt.created_at, pt.updated_at
        ));
      }
      for (const pp of data.ppob_products || []) {
        stmts.push(env.DB.prepare("INSERT INTO ppob_products (provider_id, provider_name, product_code, product_name, description, product_type, category, brand, cost_price, markup_type, markup_value, selling_price, is_active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(
          pp.provider_id, pp.provider_name, pp.product_code, pp.product_name, pp.description, pp.product_type, pp.category, pp.brand, pp.cost_price, pp.markup_type || 'fixed', pp.markup_value !== void 0 && pp.markup_value !== null ? pp.markup_value : 750, pp.selling_price, pp.is_active !== void 0 && pp.is_active !== null ? pp.is_active : 1, pp.updated_at
        ));
      }
      for (const uc of data.user_contacts || []) {
        stmts.push(env.DB.prepare("INSERT INTO user_contacts (email, label, customer_no, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(
          uc.email, uc.label, uc.customer_no, uc.category || 'all', uc.created_at, uc.updated_at
        ));
      }
      const BATCH_SIZE = 90;
      for (let i = 0; i < stmts.length; i += BATCH_SIZE) await env.DB.batch(stmts.slice(i, i + BATCH_SIZE));
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  return null;
}
__name(handleAdminRoutes, "handleAdminRoutes");
__name2(handleAdminRoutes, "handleAdminRoutes");
__name22(handleAdminRoutes, "handleAdminRoutes");
__name222(handleAdminRoutes, "handleAdminRoutes");
function renderMutasiPage(currentUser) {
  return `
    <div class="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
        <h1 class="text-3xl font-black text-slate-900 mb-2 tracking-tight">Riwayat Mutasi Saldo</h1>
        <p class="text-slate-600 text-sm mb-8">Pantau arus kas masuk dan keluar dari dompet Anda.</p>
        
        <div class="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
            <div class="overflow-x-auto custom-scrollbar">
                <table class="w-full text-left text-sm text-slate-700 whitespace-nowrap">
                    <thead class="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <tr>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Tanggal</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs">Deskripsi Transaksi</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs text-right">Nominal</th>
                            <th class="p-4 font-bold uppercase tracking-wider text-xs text-right">Sisa Saldo</th>
                        </tr>
                    </thead>
                    <tbody id="mutasiTableBody" class="divide-y divide-slate-100 text-slate-800">
                        <tr><td colspan="4" class="p-8 text-center text-sky-600 animate-pulse">Memuat data transaksi...</td></tr>
                    </tbody>
                </table>
            </div>
            <!-- Pagination Controls -->
            <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                <button id="prevBtn" onclick="changePage(currentPage - 1)" class="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Sebelum
                </button>
                <span id="pageIndicator" class="text-xs text-slate-600 font-medium">Halaman 1 dari 1</span>
                <button id="nextBtn" onclick="changePage(currentPage + 1)" class="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs">
                    Berikut <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </div>
    </div>

    <script>
        let currentPage = 1;
        let totalPages = 1;

        async function loadMutasi(page = 1) {
            currentPage = page;
            const tbody = document.getElementById('mutasiTableBody');
            const pageIndicator = document.getElementById('pageIndicator');
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            try {
                const res = await fetch('/api/transactions?page=' + page + '&limit=10');
                const data = await res.json();
                
                if (data.success) {
                    if (data.data.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500">Belum ada riwayat transaksi.</td></tr>';
                        pageIndicator.innerText = 'Halaman 1 dari 1';
                        prevBtn.disabled = true;
                        nextBtn.disabled = true;
                    } else {
                        tbody.innerHTML = data.data.map(trx => {
                            const isMasuk = trx.type === 'IN';
                            const nominalClass = isMasuk ? 'text-emerald-600' : 'text-sky-600';
                            const sign = isMasuk ? '+' : '-';
                            
                            let sisaSaldoText = '-';
                            if (trx.balance !== undefined && trx.balance !== null) {
                                sisaSaldoText = 'Rp ' + trx.balance.toLocaleString('id-ID');
                            }
                            
                            const dateParts = trx.created_at ? trx.created_at.split(', ') : ['', ''];
                            const dateHtml = dateParts[1] ? \`\${dateParts[0]}<br>\${dateParts[1]}\` : (trx.created_at || '-');
                            
                            return \`
                            <tr class="hover:bg-slate-50/80 transition">
                                <td class="p-4 font-mono text-xs text-slate-500">\${dateHtml}</td>
                                <td class="p-4 text-slate-900 font-medium leading-snug text-[12px]">\${escapeHtmlClient(trx.description)}</td>
                                <td class="p-4 font-mono font-bold text-right \${nominalClass}">\${sign} Rp \${trx.amount.toLocaleString('id-ID')}</td>
                                <td class="p-4 font-mono font-bold text-right text-slate-700">\${sisaSaldoText}</td>
                            </tr>\`;
                        }).join('');
                        
                        const pg = data.pagination;
                        totalPages = pg.totalPages;
                        pageIndicator.innerText = 'Halaman ' + pg.page + ' dari ' + pg.totalPages + ' (Total ' + pg.total + ' Transaksi)';
                        prevBtn.disabled = pg.page <= 1;
                        nextBtn.disabled = pg.page >= pg.totalPages;
                    }
                } else {
                    tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-rose-600">Gagal mengambil data.</td></tr>';
                }
            } catch(e) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-rose-600">Kesalahan koneksi internet.</td></tr>';
            }
        }

        document.addEventListener('DOMContentLoaded', () => loadMutasi(1));
        function changePage(page) {
            if (page >= 1 && page <= totalPages) loadMutasi(page);
        }
    <\/script>
    `;
}
__name(renderMutasiPage, "renderMutasiPage");
__name2(renderMutasiPage, "renderMutasiPage");
__name22(renderMutasiPage, "renderMutasiPage");
__name222(renderMutasiPage, "renderMutasiPage");
async function handleMutasiAPI(request, env, currentUser) {
  if (!currentUser) {
    return jsonResponse({ success: false, message: "Unauthorized" }, 401);
  }
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const totalRow = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM transactions WHERE email = ?"
    ).bind(currentUser.email).first();
    const total = totalRow ? totalRow.count : 0;
    const totalPages = Math.ceil(total / limit) || 1;
    const { results } = await env.DB.prepare(
      "SELECT * FROM transactions WHERE email = ? ORDER BY id DESC LIMIT ? OFFSET ?"
    ).bind(currentUser.email, limit, offset).all();
    return jsonResponse({
      success: true,
      data: results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (e) {
    return jsonResponse({ success: false, message: e.message }, 500);
  }
}
__name(handleMutasiAPI, "handleMutasiAPI");
__name2(handleMutasiAPI, "handleMutasiAPI");
__name22(handleMutasiAPI, "handleMutasiAPI");
__name222(handleMutasiAPI, "handleMutasiAPI");
async function handleAIRoutes(url, request, env, currentUser, ctx) {
  if (url.pathname === "/api/ai/chat" && request.method === "POST") {
    if (!currentUser) return jsonResponse({ success: false, message: "Silakan login terlebih dahulu untuk chat dengan AI." }, 401);
    try {
      const { message, history: rawHistory = [] } = await request.json();
      const history = [];
      if (Array.isArray(rawHistory)) {
        for (const h of rawHistory) {
          if (h && typeof h === "object" && typeof h.content === "string") {
            if (h.role === "user" || h.role === "assistant") {
              history.push({ role: h.role, content: h.content });
            }
          }
        }
      }
      const email = currentUser.email;
      const isAdmin = checkIsAdmin(currentUser, env);
      const userName = currentUser.name ? currentUser.name.split(" ")[0] : "Sobat";
      let appSettings = await getAppSettings(env);
      const currentPrice = appSettings.price_per_day || 233;
      const p10 = currentPrice * 10;
      const p20 = currentPrice * 20;
      const p30 = currentPrice * 30;
      const p60 = currentPrice * 60;
      const p90 = currentPrice * 90;
      if (appSettings.ai_chat_active === false && !isAdmin) {
        return jsonResponse({ success: false, message: "Ngapunten, fitur Asisten AI saweg dipateni (dimatikan) dening Admin." }, 403);
      }
      const serverListStr = (appSettings.servers || []).map((s, index) => `${index + 1}. ID: ${s.id} | Nama: ${s.name}`).join("\n");
      let dynamicSystemPrompt = `
Kamu adalah "Asisten Digital AwanPulsa", seorang pemuda ramah asal Jawa yang asik, cerdas, solutif, dan sopan, serta memiliki nilai-nilai Islami.

KEPRIBADIAN & BAHASA:
- Gunakan Bahasa Indonesia yang santai, bersahabat, dan sopan sebagai bahasa utama.
- Unsur etnis Jawa (seperti kata: nggih, monggo, pripun, matur nuwun) hanya digunakan sesekali saja agar terasa akrab dan hangat.
- Selalu gunakan salam "Assalamu'alaikum" jika disapa pertama kali.
- Panggil user langsung dengan namanya "${userName}" tanpa embel-embel Mas/Mbak/Kak.

INFORMASI USER SAAT INI:
- Nama Pengguna: ${userName}
- Email: ${email}
- Saldo Akun: Rp ${(currentUser.balance || 0).toLocaleString("id-ID")}

LAYANAN UTAMA AWANPULSA:
AwanPulsa adalah platform penyedia produk digital Pulsa, Kuota Data, dan PPOB termurah, tercepat, dan otomatis 24 Jam nonstop.
Produk yang tersedia meliputi:
1. Pulsa Reguler All Operator (Telkomsel, By.U, Indosat Ooredoo, XL Axiata, Axis, Tri, Smartfren).
2. Paket Data & Kuota Internet (Harian, Mingguan, Bulanan, Unlimited, Extra Kuota).
3. Token Listrik PLN Prabayar & Pembayaran Tagihan Listrik Pascabayar.
4. Top Up Saldo E-Wallet: DANA, GoPay, OVO, ShopeePay, LinkAja, Maxim Driver/Customer, dll.
5. Voucher Game: Mobile Legends, Free Fire, PUBG Mobile, Genshin Impact, dll.
6. Tagihan PPOB Lainnya: BPJS Kesehatan, PDAM Air, Telkom Indihome, Multifinance.

FITUR UNGGULAN APLIKASI:
- Beli Pulsa & PPOB (/pulsa-ppob): Cukup masukkan nomor tujuan atau ID Pelanggan, pilih produk, dan klik Beli. Saldo akun akan terpotong otomatis dan produk langsung diproses server dalam hitungan detik.
- Pengiriman Token PLN Otomatis ke Kotak Masuk (Inbox): Pembeli token PLN tidak perlu menunggu lama di layar loading, kode token 20 digit otomatis masuk ke menu Kotak Masuk (/inbox) begitu diterbitkan server.
- Auto-Save Buku Telepon: Nomor HP atau ID PLN baru yang diinput pembeli otomatis tersimpan ke buku kontak lokal, pembeli tidak perlu mengetik ulang di masa mendatang.
- Top Up Saldo Transfer Manual: Melalui menu Top Up menggunakan Transfer Manual ke rekening/nomor resmi AwanPulsa:
  • Bank BSI: 7293609009 (a.n sutroni soga)
  • DANA: 08979527685 (a.n sutroni soga)
  • Shopee / ShopeePay: 08979527685 (a.n hasnasyukur)
  Setelah melakukan transfer, pembeli wajib mengirim bukti transfer via WhatsApp ke CS (08979527685) agar saldo ditambahkan oleh Admin secara manual.

PANDUAN & ATURAN JAWABAN:
- Jika user bertanya saldo: sebutkan Saldo Saat Ini secara jelas (Rp ${(currentUser.balance || 0).toLocaleString("id-ID")}).
- Jika user bertanya cara beli produk: jelaskan langkah mudahnya dan arahkan ke menu "Pulsa & PPOB" (/pulsa-ppob).
- Jika user bertanya cara isi saldo: jelaskan bahwa AwanPulsa melayani Top Up via Transfer Manual ke Bank BSI (7293609009 a.n sutroni soga), DANA (08979527685 a.n sutroni soga), atau Shopee/ShopeePay (08979527685 a.n hasnasyukur). Informasikan untuk mengirimkan bukti transfer ke WhatsApp CS 08979527685 agar saldo ditambahkan Admin secara manual.
- Berikan link rute hanya jika ditanyakan secara spesifik:
  - Pulsa & PPOB: /pulsa-ppob
  - Riwayat Saldo & Mutasi: /mutasi
  - Kotak Masuk: /inbox
  - CS WhatsApp: 08979527685 (https://wa.me/628979527685)
  - CS Telegram: @pejuanggto (https://t.me/pejuanggto)
  - Lokasi Fisik Gerai Toko: Awan Jaya Celluler (https://maps.app.goo.gl/YvAs1xFY35gEohKc7?g_st=atm)

ATURAN KEAMANAN:
- Dilarang membocorkan API Key, Secret Token, atau skema Database internal.
- Dilarang menampilkan kode teknis [ACTION_...] kepada user di layar chat.
- Hanya Admin yang memiliki wewenang mengubah saldo secara manual.
`;
      const currentHour = (/* @__PURE__ */ new Date()).getHours();
      const todayDate = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const slotKey = `${todayDate}-${currentHour}`;
      let usage = await env.DB.prepare("SELECT count, slot FROM ai_usage WHERE email = ?").bind(email).first();
      if (!usage) {
        await env.DB.prepare("INSERT INTO ai_usage (email, count, slot) VALUES (?, 1, ?)").bind(email, slotKey).run();
      } else {
        if (usage.slot !== slotKey) {
          await env.DB.prepare("UPDATE ai_usage SET count = 1, slot = ? WHERE email = ?").bind(slotKey, email).run();
        } else {
          const hourlyLimit = parseInt(appSettings.ai_hourly_limit) || 10;
          if (usage.count >= hourlyLimit && !isAdmin) {
            return jsonResponse({ success: false, message: `Waduh, batas chat AI kamu sudah mencapai batas maksimal (${hourlyLimit}x per jam). Coba lagi jam depan ya!` }, 429);
          }
          await env.DB.prepare("UPDATE ai_usage SET count = count + 1 WHERE email = ?").bind(email).run();
        }
      }
      if (isAdmin) {
        dynamicSystemPrompt += `


===================================
\u{1F6A8} MODE ADMIN SANGAT KETAT \u{1F6A8}
Lawan bicaramu adalah ADMIN. JANGAN PERNAH MENGARANG CERITA ATAU MEMBUAT ROLEPLAY!
Jika Admin meminta tindakan sistem (seperti tambah saldo, kurangi saldo, dll), KAMU WAJIB HANYA MEMBALAS DENGAN KODE SIKU SAJA! TIDAK BOLEH ADA TEKS LAIN!

CONTOH YANG BENAR:
Admin: "tambah saldo budi@gmail.com 20000"
Balasanmu: [ACTION_ADD_BALANCE:budi@gmail.com:20000]

CONTOH YANG SALAH (DILARANG KERAS):
Admin: "tambah saldo budi@gmail.com 20000"
Balasanmu: "Sistem telah menambah saldo..." ATAU "[ADMIN RESPONSE]..."

DAFTAR KODE (PILIH SALAH SATU DAN KETIK TANPA BASA-BASI):
- Tambah Saldo: [ACTION_ADD_BALANCE:email:nominal]
- Kurangi Saldo: [ACTION_DEDUCT_BALANCE:email:nominal]
- Cek Statistik: [DB_STATS]
- Cek User: [DB_USER:email]
- VPN Terbaru: [DB_RECENT_VPN]
- Cari VPN: [DB_SEARCH_VPN:kata_kunci]
- Detail VPN: [DB_DETAIL_VPN:username]
- Backup: [DB_BACKUP_TELEGRAM]
- Mutasi Global: [DB_RECENT_TRANSACTIONS]
- Mutasi User: [DB_USER_TRANSACTIONS:email]
===================================`;
      }
      // Pangkas ke 6 riwayat terakhir untuk menghemat token input hingga 70%
      let messages = [{ role: "system", content: dynamicSystemPrompt }, ...history.slice(-6), { role: "user", content: message }];
      let finalReply = `Mohon maaf ${userName}, server AI saya sedang sedikit sibuk. Bisa dicoba lagi sebentar lagi?`;
      let maxLoops = 2;
      for (let i = 0; i < maxLoops; i++) {
        let reply = "";
        let aiProvider = appSettings.ai_provider || "deepseek";
        if (aiProvider === "deepseek") {
          const deepseekKey = env.DEEPSEEK_API_KEY || (typeof process !== "undefined" && process.env && process.env.DEEPSEEK_API_KEY) || "";
          try {
            const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${deepseekKey}`
              },
              body: JSON.stringify({
                model: "deepseek-chat",
                messages,
                max_tokens: 380,
                temperature: 0.5
              })
            });
            if (dsRes.ok) {
              const dsData = await dsRes.json();
              const choiceMsg = dsData.choices?.[0]?.message;
              reply = (choiceMsg?.content || choiceMsg?.reasoning_content || "").trim();
            } else {
              console.warn(`DeepSeek API returned error ${dsRes.status}, falling back to Gemini`);
            }
          } catch (dsErr) {
            console.error("DeepSeek call failed, falling back to Gemini:", dsErr);
          }
        }
        if (!reply && (aiProvider === "gemini" || aiProvider === "deepseek")) {
          try {
            const geminiApiKey = env.GEMINI_API_KEY || "AIzaSyA40MjBzjfrz5USxbksV61M-B6aMc3NP_0";
            const geminiContents = [];
            let systemInstructionText = "";
            for (const msg of messages) {
              if (msg.role === "system") {
                systemInstructionText = msg.content;
              } else {
                const geminiRole = msg.role === "assistant" ? "model" : "user";
                geminiContents.push({
                  role: geminiRole,
                  parts: [{ text: msg.content }]
                });
              }
            }
            const geminiRequestBody = {
              contents: geminiContents,
              generationConfig: {
                maxOutputTokens: 380,
                temperature: 0.5
              }
            };
            if (systemInstructionText) {
              geminiRequestBody.systemInstruction = {
                parts: [{ text: systemInstructionText }]
              };
            }
            const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${geminiApiKey}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify(geminiRequestBody)
            });
            if (geminiRes.ok) {
              const geminiData = await geminiRes.json();
              reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
            }
          } catch (geminiErr) {
            console.error("Gemini fallback error:", geminiErr);
          }
        }
        if (!reply && env.AI) {
          try {
            const aiResponse = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", { messages, max_tokens: 380, temperature: 0.4 });
            reply = aiResponse.response || aiResponse.choices?.[0]?.message?.content || "";
          } catch (cfErr) {
            console.error("Cloudflare AI error:", cfErr);
          }
        }
        if (!reply) break;
        reply = reply.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        let buyVpnMatch = reply.match(/ACTION_BUY_VPN\s*:\s*([^:]+)\s*:\s*([^:]+)\s*:\s*([^:\]\n]+)(?:\s*:\s*([^\]\n]*))?/i);
        let renewVpnMatch = reply.match(/ACTION_RENEW_VPN\s*:\s*([^:\s\]]+)\s*:\s*([^\]\n]+)/i);
        let statsMatch = isAdmin ? reply.match(/DB_STATS/i) : null;
        let userMatch = isAdmin ? reply.match(/DB_USER\s*:\s*([^\]\n\s]+)/i) : null;
        let ppobRecentMatch = isAdmin ? reply.match(/DB_PPOB_RECENT/i) : null;
        let ppobCheckMatch = isAdmin ? reply.match(/DB_CHECK_PPOB\s*:\s*([^\]\n\s]+)/i) : null;
        let recentVpnMatch = isAdmin ? reply.match(/DB_RECENT_VPN/i) : null;
        let searchVpnMatch = isAdmin ? reply.match(/DB_SEARCH_VPN\s*:\s*([^\]\n]+)/i) : null;
        let detailVpnMatch = isAdmin ? reply.match(/DB_DETAIL_VPN\s*:\s*([^\]\n\s]+)/i) : null;
        let backupMatch = isAdmin ? reply.match(/DB_BACKUP_TELEGRAM/i) : null;
        let recentTrxMatch = isAdmin ? reply.match(/DB_RECENT_TRANSACTIONS/i) : null;
        let userTrxMatch = isAdmin ? reply.match(/DB_USER_TRANSACTIONS\s*:\s*([^\]\n\s]+)/i) : null;
        let addBalanceMatch = isAdmin ? reply.match(/ACTION_ADD_BALANCE\s*:\s*([^:\s\]]+)\s*:\s*([^\]\n]+)/i) : null;
        let deductBalanceMatch = isAdmin ? reply.match(/ACTION_DEDUCT_BALANCE\s*:\s*([^:\s\]]+)\s*:\s*([^\]\n]+)/i) : null;
        if (buyVpnMatch || renewVpnMatch || statsMatch || userMatch || ppobRecentMatch || ppobCheckMatch || recentVpnMatch || searchVpnMatch || detailVpnMatch || backupMatch || recentTrxMatch || userTrxMatch || addBalanceMatch || deductBalanceMatch) {
          let dbResult = "";
          let priceToRefund = 0;
          let refundProtocol = "";
          try {
            if (addBalanceMatch || deductBalanceMatch) {
              let activeMatch = addBalanceMatch ? addBalanceMatch : deductBalanceMatch;
              let targetEmail = activeMatch[1].trim().toLowerCase();
              let amountStr = activeMatch[2].trim().replace(/[^0-9]/g, "");
              let parsedAmount = parseInt(amountStr);
              if (isNaN(parsedAmount) || parsedAmount === 0) {
                dbResult = `TINDAKAN (GAGAL): Nominal tidak valid (harus angka). Nominal terbaca: ${amountStr}`;
              } else {
                let amount = addBalanceMatch ? Math.abs(parsedAmount) : -Math.abs(parsedAmount);
                let u = await env.DB.prepare("SELECT email, balance FROM users WHERE LOWER(email) = ?").bind(targetEmail).first();
                if (!u) {
                  dbResult = `TINDAKAN (GAGAL): User dengan email '${targetEmail}' tidak ditemukan.`;
                } else {
                  let actualEmail = u.email;
                  await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(amount, actualEmail).run();
                  let newU = await env.DB.prepare("SELECT balance FROM users WHERE email = ?").bind(actualEmail).first();
                  let newBalance = newU ? newU.balance : 0;
                  const now = getWIBTime();
                  const mutasiType = amount > 0 ? "IN" : "OUT";
                  const mutasiDesc = amount > 0 ? "Penambahan Saldo oleh Admin (via AI)" : "Pengurangan Saldo oleh Admin (via AI)";
                  await env.DB.prepare("INSERT INTO transactions (email, type, amount, description, balance, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(actualEmail, mutasiType, Math.abs(amount), mutasiDesc, newBalance, now).run();
                  const isAddition = amount > 0;
                  const absValue = Math.abs(amount).toLocaleString("id-ID");
                  const actionText = isAddition ? "Penambahan" : "Pengurangan";
                  const actionVerb = isAddition ? "ditambahkan" : "dikurangi";
                  const colorClass = isAddition ? "text-green-400" : "text-cyan-400";
                  const userTitle = `[SALDO] ${actionText} Saldo`;
                  const userMsg = `Saldo Anda telah ${actionVerb} sebesar <b class="${colorClass}">Rp ${absValue}</b> oleh sistem Admin.`;
                  await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(actualEmail, userTitle, userMsg, now).run();
                  dbResult = `TINDAKAN (BERHASIL): Saldo akun ${actualEmail} berhasil ${actionVerb} sebesar Rp ${absValue}. Sisa saldo saat ini menjadi: Rp ${newBalance.toLocaleString("id-ID")}. Info mutasi dan inbox berhasil dikirim ke user.`;
                }
              }
            } else if (statsMatch) {
              const totalUsers = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first("c");
              const totalSaldoRow = await env.DB.prepare("SELECT SUM(balance) as s FROM users").first();
              const totalSaldo = totalSaldoRow ? totalSaldoRow.s : 0;
              let totalTransactions = 0;
              try {
                const totalInvoices = await env.DB.prepare("SELECT COUNT(*) as c FROM invoices WHERE status = 'PAID'").first("c");
                const totalPpob = await env.DB.prepare("SELECT COUNT(*) as c FROM ppob_transactions").first("c");
                totalTransactions = (totalInvoices || 0) + (totalPpob || 0);
              } catch (e) {}
              dbResult = `DATA DB (BERHASIL): Total Pengguna = ${totalUsers}, Total Seluruh Saldo Semua User = Rp ${totalSaldo.toLocaleString("id-ID")}, Total Transaksi = ${totalTransactions}`;
            } else if (userMatch) {
              let targetEmail = userMatch[1].trim().toLowerCase();
              let u = await env.DB.prepare("SELECT name, phone, balance, is_blocked FROM users WHERE LOWER(email) = ?").bind(targetEmail).first();
              if (u) {
                dbResult = `DATA DB (BERHASIL): Email = ${targetEmail}, Nama = ${u.name}, No HP = ${u.phone}, Saldo = Rp ${u.balance.toLocaleString("id-ID")}, Status = ${u.is_blocked ? "DIBLOKIR/BANNED" : "AKTIF"}`;
              } else {
                dbResult = `DATA DB (GAGAL): User dengan email ${targetEmail} TIDAK DITEMUKAN di database.`;
              }
            } else if (ppobRecentMatch) {
              const { results } = await env.DB.prepare("SELECT reqid, email, product_name, customer_no, selling_price, status, sn, created_at FROM ppob_transactions ORDER BY id DESC LIMIT 5").all();
              if (results && results.length > 0) {
                let ppobList = results.map((p, idx) => `${idx + 1}. [${p.status.toUpperCase()}] ReqID: ${p.reqid} | User: ${p.email} | Produk: ${p.product_name || '-'} | No: ${p.customer_no} | Harga: Rp${(p.selling_price || 0).toLocaleString("id-ID")} | SN: ${p.sn || '-'} | Waktu: ${p.created_at}`).join("\n");
                dbResult = `DATA DB (BERHASIL): 5 Transaksi PPOB / Pulsa Terbaru:\n${ppobList}`;
              } else {
                dbResult = `DATA DB (BERHASIL): Belum ada riwayat transaksi PPOB di database.`;
              }
            } else if (ppobCheckMatch) {
              let q = ppobCheckMatch[1].trim();
              const { results } = await env.DB.prepare("SELECT reqid, email, product_name, customer_no, selling_price, status, sn, info, created_at FROM ppob_transactions WHERE reqid LIKE ? OR customer_no LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 5").bind(`%${q}%`, `%${q}%`, `%${q}%`).all();
              if (results && results.length > 0) {
                let ppobList = results.map((p, idx) => `${idx + 1}. [${p.status.toUpperCase()}] ReqID: ${p.reqid} | User: ${p.email} | Produk: ${p.product_name || '-'} | No: ${p.customer_no} | Harga: Rp${(p.selling_price || 0).toLocaleString("id-ID")} | SN: ${p.sn || '-'} | Info: ${p.info || '-'} | Waktu: ${p.created_at}`).join("\n");
                dbResult = `DATA DB (BERHASIL): Ditemukan ${results.length} transaksi PPOB untuk pencarian '${q}':\n${ppobList}`;
              } else {
                dbResult = `DATA DB (BERHASIL): Tidak ditemukan transaksi PPOB dengan kata kunci / No / ReqID '${q}'.`;
              }
            } else if (recentVpnMatch) {
              const { results } = await env.DB.prepare("SELECT email, username, protocol, server, exp, date FROM vpns ORDER BY id DESC LIMIT 5").all();
              if (results && results.length > 0) {
                let vpnList = results.map((v, i2) => `${i2 + 1}. Email: ${v.email}, UserVPN: ${v.username}, Protokol: ${v.protocol}, Server: ${v.server}, Tanggal: ${v.date}`).join("\n");
                dbResult = `DATA DB (BERHASIL): 5 Akun VPN Terbaru dibuat:
${vpnList}`;
              } else {
                dbResult = `DATA DB (BERHASIL): Belum ada akun VPN yang dibuat di database.`;
              }
            } else if (searchVpnMatch) {
              let keyword = searchVpnMatch[1].trim();
              const { results } = await env.DB.prepare("SELECT email, username, protocol, server, exp, date FROM vpns WHERE username LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 10").bind(`%${keyword}%`, `%${keyword}%`).all();
              if (results && results.length > 0) {
                let vpnList = results.map((v, i2) => `${i2 + 1}. Email: ${v.email}, UserVPN: ${v.username}, Protokol: ${v.protocol}, Server: ${v.server}, Exp: ${v.exp}, Tanggal: ${v.date}`).join("\n");
                dbResult = `DATA DB (BERHASIL): Ditemukan ${results.length} akun VPN dengan kata kunci '${keyword}':
${vpnList}`;
              } else {
                dbResult = `DATA DB (BERHASIL): Tidak ada akun VPN yang mengandung kata '${keyword}'.`;
              }
            } else if (detailVpnMatch) {
              let targetUser = detailVpnMatch[1].trim();
              let vpn = await env.DB.prepare("SELECT * FROM vpns WHERE username = ?").bind(targetUser).first();
              if (vpn) {
                let inboxRecord = await env.DB.prepare("SELECT message FROM inbox WHERE email = ? AND message LIKE ? ORDER BY id DESC LIMIT 1").bind(vpn.email, `%${targetUser}%`).first();
                let configText = "";
                if (inboxRecord) {
                  const matches = [...inboxRecord.message.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)];
                  configText = matches.length > 0 ? matches[matches.length - 1][1] : inboxRecord.message.replace(/<[^>]*>?/gm, "").trim();
                } else {
                  configText = "(Config detail tidak ditemukan di riwayat inbox)";
                }
                dbResult = `DATA DB (BERHASIL): Detail akun ${targetUser} berhasil ditarik dari database.
TUGASMU: Berikan balasan kepada Admin menggunakan FORMAT PERSIS SEPERTI DI BAWAH INI (Tanpa kamu ubah isi config-nya):

=================================
INFORMASI ${vpn.protocol.toUpperCase()}
=================================

Username : ${vpn.username}
Server   : ${vpn.server}
Expired  : ${vpn.exp}

*Catatan: API Cek Detail VPS tidak sinkron dengan Cloudflare. Data ditarik dari Riwayat Database.*
${configText}`;
              } else {
                dbResult = `DATA DB (GAGAL): Akun VPN dengan username '${targetUser}' tidak ditemukan.`;
              }
            } else if (recentTrxMatch) {
              const { results } = await env.DB.prepare("SELECT email, type, amount, balance, description, created_at FROM transactions ORDER BY id DESC LIMIT 10").all();
              if (results && results.length > 0) {
                let trxList = results.map((t, i2) => `${i2 + 1}. [${t.created_at}] ${t.email} | ${t.type === "IN" ? "+" : "-"}Rp${t.amount.toLocaleString("id-ID")} | Sisa: Rp${(t.balance || 0).toLocaleString("id-ID")} | Info: ${t.description}`).join("\n");
                dbResult = `DATA DB (BERHASIL): 10 Aktivitas Perubahan Saldo Terbaru secara Global:
${trxList}`;
              } else {
                dbResult = `DATA DB (BERHASIL): Belum ada riwayat perubahan saldo (mutasi) di database.`;
              }
            } else if (userTrxMatch) {
              let targetEmail = userTrxMatch[1].trim().toLowerCase();
              const { results } = await env.DB.prepare("SELECT type, amount, balance, description, created_at FROM transactions WHERE LOWER(email) = ? ORDER BY id DESC LIMIT 10").bind(targetEmail).all();
              if (results && results.length > 0) {
                let trxList = results.map((t, i2) => `${i2 + 1}. [${t.created_at}] ${t.type === "IN" ? "+" : "-"}Rp${t.amount.toLocaleString("id-ID")} | Sisa: Rp${(t.balance || 0).toLocaleString("id-ID")} | Info: ${t.description}`).join("\n");
                dbResult = `DATA DB (BERHASIL): Riwayat Mutasi untuk ${targetEmail} (10 terakhir):
${trxList}`;
              } else {
                dbResult = `DATA DB (BERHASIL): Tidak ada riwayat transaksi/mutasi untuk email ${targetEmail}.`;
              }
            } else if (backupMatch) {
              try {
                const botToken = appSettings.telegram_bot_token;
                const chatId = appSettings.telegram_channel_id;
                if (!botToken || !chatId) {
                  dbResult = "DATA DB (GAGAL): Bot Token atau Chat ID Telegram belum dikonfigurasi di Pengaturan Admin.";
                } else {
                  const backupObj = await generateBackupData(env);
                  const { users, inbox, invoices, settings, ppob_transactions } = backupObj;
                  const nowStr = getWIBTime();
                  const dateMatch = nowStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
                  const todayStr = dateMatch ? dateMatch[0] : "";
                  const monthStr = dateMatch ? `${dateMatch[2]}/${dateMatch[3]}` : "";
                  const isoToday = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : "";
                  const isoMonth = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}` : "";

                  const totalUsers = users.length;
                  const totalSaldo = users.reduce((sum, u) => sum + (u.balance || 0), 0);
                  const paidInvoices = (invoices || []).filter((i2) => i2.status === "PAID");
                  const ppobTx = ppob_transactions || [];
                  const xlPurchases = (inbox || []).filter((i2) => i2.title && i2.title.includes("[SUKSES] Pembelian Paket XL"));
                  const totalTransactions = paidInvoices.length + ppobTx.length + xlPurchases.length;

                  const topupMonthList = paidInvoices.filter((i2) => i2.date && (i2.date.includes(monthStr) || i2.date.includes(isoMonth)));
                  const topupThisMonth = topupMonthList.reduce((sum, i2) => sum + (i2.amount || 0), 0);
                  const ppobThisMonth = ppobTx.filter((p) => p.created_at && (p.created_at.includes(monthStr) || p.created_at.includes(isoMonth))).length +
                                        xlPurchases.filter((i2) => i2.date && (i2.date.includes(monthStr) || i2.date.includes(isoMonth))).length;

                  const topupTodayList = paidInvoices.filter((i2) => i2.date && (i2.date.includes(todayStr) || i2.date.includes(isoToday)));
                  const topupToday = topupTodayList.reduce((sum, i2) => sum + (i2.amount || 0), 0);
                  const ppobToday = ppobTx.filter((p) => p.created_at && (p.created_at.includes(todayStr) || p.created_at.includes(isoToday))).length +
                                    xlPurchases.filter((i2) => i2.date && (i2.date.includes(todayStr) || i2.date.includes(isoToday))).length;

                  const captionHtml = `<b>\u{1F4CA} Statistik AwanPulsa (Backup Manual AI)</b>

Pengguna: ${totalUsers}
Transaksi: ${totalTransactions}
Saldo: Rp ${totalSaldo.toLocaleString("id-ID")}

<b>Bulan ini:</b>
Top Up: Rp ${topupThisMonth.toLocaleString("id-ID")}
Transaksi PPOB & Pulsa: ${ppobThisMonth} transaksi

<b>Hari ini:</b>
Top Up: Rp ${topupToday.toLocaleString("id-ID")}
Transaksi PPOB & Pulsa: ${ppobToday} transaksi

#awanpulsabackup`;
                  const backupData = JSON.stringify(backupObj, null, 2);
                  await saveBackupToR2(env, backupObj, nowStr);
                  const cleanNow = nowStr.replace(/[\/\s:,]/g, "_");
                  const blob = new Blob([backupData], { type: "application/json" });
                  const formData = new FormData();
                  formData.append("chat_id", chatId);
                  formData.append("caption", captionHtml);
                  formData.append("parse_mode", "HTML");
                  formData.append("document", blob, `Backup_AwanPulsa_${cleanNow}.json`);
                  const tgReq = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                    method: "POST",
                    body: formData
                  });
                  if (tgReq.ok) {
                    let rekapText = `Rekap saldo pengguna
Total : Rp.${totalSaldo.toLocaleString("id-ID")}

`;
                    rekapText += "NO | Akun                          | Saldo      |\n";
                    users.forEach((u, i2) => {
                      const no = String(i2 + 1).padEnd(2, " ");
                      const email2 = u.email.padEnd(29, " ");
                      const balance = (u.balance || 0).toLocaleString("id-ID").padEnd(10, " ");
                      rekapText += `${no} | ${email2} | ${balance} |
`;
                    });
                    const timeMatch = nowStr.match(/(\d{2})[:\.](\d{2})/);
                    const fileNameTime = dateMatch && timeMatch ? `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}_${timeMatch[1]}${timeMatch[2]} WIB` : "now";
                    const rekapBlob = new Blob([rekapText], { type: "text/plain" });
                    const rekapFormData = new FormData();
                    rekapFormData.append("chat_id", chatId);
                    rekapFormData.append("document", rekapBlob, `rekap saldo user ${fileNameTime}.txt`);
                    await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                      method: "POST",
                      body: rekapFormData
                    });
                    dbResult = "DATA DB (BERHASIL): Backup database beserta statistik dan rekap saldo telah sukses dikirim ke Telegram Admin.";
                  } else {
                    const tgErr = await tgReq.text();
                    dbResult = `DATA DB (GAGAL): Gagal mengirim file JSON ke Telegram. Server response: ${tgErr}`;
                  }
                }
              } catch (e) {
                dbResult = `DATA DB (GAGAL): System Error saat backup - ${e.message}`;
              }
            } else if (renewVpnMatch) {
              let targetUsername = renewVpnMatch[1].trim();
              let rawDur = renewVpnMatch[2].trim().toLowerCase();
              let duration = rawDur.replace(/[^0-9]/g, "");
              let days = parseInt(duration);
              if (isNaN(days) || days <= 0) {
                dbResult = `GAGAL: Durasi tidak valid (harus angka hari).`;
              } else {
                let price = days * currentPrice;
                let u = await env.DB.prepare("SELECT balance FROM users WHERE email = ?").bind(email).first();
                if (!u || u.balance < price) {
                  dbResult = `GAGAL: Saldo tidak mencukupi (Kurang Rp ${(price - (u ? u.balance : 0)).toLocaleString("id-ID")}). Arahkan user untuk Top Up.`;
                } else {
                  let vpn = await env.DB.prepare("SELECT * FROM vpns WHERE username = ?").bind(targetUsername).first();
                  if (!vpn) {
                    dbResult = `GAGAL: Akun VPN dengan username '${targetUsername}' tidak ditemukan di database kami.`;
                  } else if (!isAdmin && vpn.email !== email) {
                    dbResult = `GAGAL (UNAUTHORIZED): Akun VPN '${targetUsername}' BUKAN milik user ini (${email}). User hanya boleh memperpanjang akun miliknya sendiri. Beritahu user dengan tegas.`;
                  } else {
                    let serverList = appSettings.servers || [];
                    let targetServer = serverList.find((s) => s.name === vpn.server);
                    if (!targetServer) {
                      throw new Error(`Server '${vpn.server}' sudah tidak aktif / tidak ditemukan di konfigurasi saat ini.`);
                    }
                    await env.DB.prepare("UPDATE users SET balance = balance - ? WHERE email = ?").bind(price, email).run();
                    const nowWib = getWIBTime();
                    await env.DB.prepare("INSERT INTO transactions (email, type, amount, description, balance, created_at) VALUES (?, 'OUT', ?, ?, ?, ?)").bind(email, price, `Perpanjang VPN ${vpn.protocol} (${targetUsername}) +${days} Hari`, u.balance - price, nowWib).run();
                    priceToRefund = price;
                    refundProtocol = vpn.protocol;
                    let proto = vpn.protocol.toLowerCase();
                    let endpoint = "";
                    if (proto.includes("ssh")) endpoint = "/srpcom/renew-ssh";
                    else if (proto.includes("vless")) endpoint = "/srpcom/renew-vlessws";
                    else if (proto.includes("trojan")) endpoint = "/srpcom/renew-trojanws";
                    else if (proto.includes("vmess")) endpoint = "/srpcom/renew-vmessws";
                    else if (proto.includes("l2tp")) endpoint = "/srpcom/renew-l2tp";
                    else throw new Error("Protokol tidak dikenali untuk perpanjangan.");
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15e3);
                    let vpsRes;
                    try {
                      const vpsReq = await fetch(targetServer.host + endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json", "x-api-key": targetServer.key },
                        body: JSON.stringify({ user: targetUsername, exp: String(days) }),
                        signal: controller.signal
                      });
                      clearTimeout(timeoutId);
                      vpsRes = await vpsReq.json();
                    } catch (fetchErr) {
                      clearTimeout(timeoutId);
                      if (fetchErr.name === "AbortError") {
                        throw new Error("Koneksi VPS Timeout (>15 detik) saat mencoba memperpanjang.");
                      }
                      throw fetchErr;
                    }
                    let configText = vpsRes.detail?.stdout || vpsRes.stdout || "";
                    let lowerConfig = configText.toLowerCase();
                    if (lowerConfig.includes("error") || lowerConfig.includes("failed") || lowerConfig.includes("not found") || lowerConfig.includes("tidak ditemukan")) {
                      throw new Error(`Gagal diperpanjang oleh server VPS: Username mungkin sudah terhapus di server aslinya.`);
                    } else if (configText) {
                      priceToRefund = 0;
                      await env.DB.prepare("UPDATE vpns SET exp = exp || ' (+' || ? || ' Hari)' WHERE username = ?").bind(days, targetUsername).run();
                      let plainConfig = configText.replace(/<\/?(b|strong|code|pre|i|u|span|div|font)[^>]*>/gi, "");
                      const cleanConfig = plainConfig.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                      const inboxMsg = `Perpanjangan VPN ${targetUsername} berhasil ditambahkan ${days} Hari.<br><br><div class="bg-gray-950 p-3 rounded-xl border border-gray-800 overflow-x-auto"><pre class="text-green-400 font-mono text-[11px] whitespace-pre-wrap break-all select-all">${cleanConfig}</pre></div>`;
                      await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(email, `[RENEW] ${targetUsername} Sukses!`, inboxMsg, nowWib).run();
                      finalReply = `Alhamdulillah ${userName}, akun VPN **${targetUsername}** berhasil diperpanjang masa aktifnya selama **${days} Hari**! \u{1F389}

Berikut adalah detail terbarunya:

<div class="bg-[#0a0a0a] p-4 rounded-xl border border-gray-700 overflow-x-auto mt-3 mb-3 shadow-inner"><pre class="text-green-400 font-mono text-[11px] leading-relaxed select-all whitespace-pre-wrap">${cleanConfig}</pre></div>

Info ini juga sudah saya amankan di Kotak Masuk kamu ya.`;
                      return jsonResponse({ success: true, reply: finalReply });
                    } else {
                      throw new Error("Server tidak memberikan respon konfigurasi saat perpanjangan (Timeout).");
                    }
                  }
                }
              }
            } else if (buyVpnMatch) {
              let rawProto = buyVpnMatch[1].trim().toLowerCase();
              let rawSrv = buyVpnMatch[2].trim().toLowerCase();
              let rawDur = buyVpnMatch[3].trim().toLowerCase();
              let customUsername = buyVpnMatch[4] ? buyVpnMatch[4].trim() : "";
              let protocol = rawProto.includes("2") || rawProto.includes("vmess") ? "vmessws" : rawProto.includes("3") || rawProto.includes("vless") ? "vlessws" : rawProto.includes("4") || rawProto.includes("trojan") ? "trojanws" : rawProto.includes("5") || rawProto.includes("l2tp") ? "l2tp" : "ssh";
              let duration = rawDur.includes("6") || rawDur.includes("trial") || rawDur.includes("jam") || rawDur === "1" ? "trial" : rawDur.replace(/[^0-9]/g, "");
              const isTrial = duration === "trial";
              const days = isTrial ? 0 : parseInt(duration);
              const price = isTrial ? 0 : days * currentPrice;
              let u = await env.DB.prepare("SELECT balance FROM users WHERE email = ?").bind(email).first();
              if (!isTrial && (isNaN(days) || days <= 0)) {
                dbResult = `GAGAL: Durasi pembelian tidak valid (terdeteksi: ${rawDur}). Durasi harus berupa angka hari yang lebih besar dari 0.`;
              } else if (!u || u.balance < price) {
                dbResult = `GAGAL: Saldo tidak mencukupi (Kurang Rp ${(price - (u ? u.balance : 0)).toLocaleString("id-ID")}).`;
              } else {
                let trialLimitReached = false;
                if (isTrial && !isAdmin) {
                  const todayDateStr = getWIBDateOnly();
                  const trialCount = await env.DB.prepare("SELECT COUNT(*) as count FROM vpns WHERE email = ? AND exp = '1 Jam' AND date LIKE ?").bind(email, `${todayDateStr}%`).first("count");
                  if (trialCount >= 3) trialLimitReached = true;
                }
                if (trialLimitReached) {
                  dbResult = `GAGAL: Batas Klaim Tercapai! User ini maksimal hanya dapat membuat 3 akun TRIAL dalam sehari. Beritahu user dengan sopan dan sarankan untuk Top Up agar bebas limit.`;
                } else {
                  let serverList = appSettings.servers || [];
                  let targetServer = null;
                  let srvIdx = parseInt(rawSrv);
                  if (!isNaN(srvIdx) && srvIdx > 0 && srvIdx <= serverList.length) targetServer = serverList[srvIdx - 1];
                  else targetServer = serverList.find((s) => s.id.toLowerCase() === rawSrv || s.name.toLowerCase().includes(rawSrv));
                  if (!targetServer) throw new Error("Server tidak ditemukan.");
                  let username = customUsername ? customUsername.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : `ap${Math.floor(1e3 + Math.random() * 9e3)}`;
                  if (username.length === 0) username = `ap${Math.floor(1e3 + Math.random() * 9e3)}`;
                  if (username.length > 15) username = username.substring(0, 15);
                  const password = crypto.randomUUID().split("-")[0];
                  if (price > 0) {
                    await env.DB.prepare("UPDATE users SET balance = balance - ? WHERE email = ?").bind(price, email).run();
                    const nowWib = getWIBTime();
                    await env.DB.prepare("INSERT INTO transactions (email, type, amount, description, balance, created_at) VALUES (?, 'OUT', ?, ?, ?, ?)").bind(email, price, `Beli VPN ${protocol.toUpperCase()} - Akun: ${username} | Server: ${targetServer.name} via AI`, u.balance - price, nowWib).run();
                    priceToRefund = price;
                    refundProtocol = protocol;
                  }
                  const vpnMap = {
                    "ssh": { ep: isTrial ? "/srpcom/trial-ssh" : "/srpcom/add-ssh", pl: isTrial ? { exp: "1", limit_ip: "2" } : { user: username, password, exp: String(days), limit_ip: "2" } },
                    "vlessws": { ep: isTrial ? "/srpcom/trial-vlessws" : "/srpcom/add-vlessws", pl: isTrial ? { exp: "1", limit_ip: "2" } : { user: username, exp: String(days), limit_quota: "0", limit_ip: "2" } },
                    "trojanws": { ep: isTrial ? "/srpcom/trial-trojanws" : "/srpcom/add-trojanws", pl: isTrial ? { exp: "1", limit_ip: "2" } : { user: username, exp: String(days), limit_quota: "0", limit_ip: "2" } },
                    "vmessws": { ep: isTrial ? "/srpcom/trial-vmessws" : "/srpcom/add-vmessws", pl: isTrial ? { exp: "1", limit_ip: "2" } : { user: username, exp: String(days), limit_quota: "0", limit_ip: "2" } },
                    "l2tp": { ep: "/srpcom/add-l2tp", pl: isTrial ? { user: `trial${Math.floor(1e3 + Math.random() * 9e3)}`, password, exp: "1" } : { user: username, password, exp: String(days) } }
                  };
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), 15e3);
                  let vpsRes;
                  try {
                    const vpsReq = await fetch(targetServer.host + vpnMap[protocol].ep, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "x-api-key": targetServer.key },
                      body: JSON.stringify(vpnMap[protocol].pl),
                      signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    vpsRes = await vpsReq.json();
                  } catch (fetchErr) {
                    clearTimeout(timeoutId);
                    if (fetchErr.name === "AbortError") {
                      throw new Error("Koneksi VPS Timeout (>15 detik) saat mencoba membuat VPN.");
                    }
                    throw fetchErr;
                  }
                  let configText = vpsRes.detail?.stdout || vpsRes.stdout || "";
                  let lowerConfig = configText.toLowerCase();
                  if (lowerConfig.includes("already exist") || lowerConfig.includes("choose another name") || lowerConfig.includes("error") || lowerConfig.includes("failed")) {
                    throw new Error(`Gagal dieksekusi VPS. Username mungkin sudah terpakai.`);
                  } else if (configText) {
                    const now = getWIBTime();
                    priceToRefund = 0;
                    let actualUsername = username;
                    if (isTrial && protocol !== "l2tp") {
                      const match = configText.match(/Username\s*:\s*([^\s<]+)/i) || configText.match(/User\s*:\s*([^\s<]+)/i) || configText.match(/Account\s*:\s*([^\s<]+)/i);
                      actualUsername = match ? match[1] : `Trial-${Math.floor(1e3 + Math.random() * 9e3)}`;
                    } else if (isTrial && protocol === "l2tp") {
                      actualUsername = vpnMap[protocol].pl.user;
                    }
                    let plainConfig = configText.replace(/<\/?(b|strong|code|pre|i|u|span|div|font)[^>]*>/gi, "");
                    const cleanConfig = plainConfig.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                    const inboxMsg = `Halo! Ini detail konfigurasi VPN Anda:<br><br><div class="bg-gray-950 p-3 rounded-xl border border-gray-800 overflow-x-auto"><pre class="text-green-400 font-mono text-[11px] whitespace-pre-wrap break-all select-all">${cleanConfig}</pre></div>`;
                    await env.DB.prepare("INSERT INTO vpns (email, server, protocol, username, date, exp) VALUES (?, ?, ?, ?, ?, ?)").bind(email, targetServer.name, protocol.toUpperCase(), actualUsername, now, isTrial ? "1 Jam" : days + " Hari").run();
                    await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(email, `[${protocol.toUpperCase()}] Pesanan Sukses!`, inboxMsg, now).run();
                    finalReply = `Alhamdulillah ${userName}, pesanan akun VPN kamu berhasil dibuat! \u{1F389}

Berikut adalah detail konfigurasinya:

<div class="bg-[#0a0a0a] p-4 rounded-xl border border-gray-700 overflow-x-auto mt-3 mb-3 shadow-inner"><pre class="text-green-400 font-mono text-[11px] leading-relaxed select-all whitespace-pre-wrap">${cleanConfig}</pre></div>

Silakan klik/tahan teks di atas untuk menyalin. Jangan khawatir, konfigurasi ini juga sudah saya amankan di menu Kotak Masuk (Inbox) kamu ya.`;
                    return jsonResponse({ success: true, reply: finalReply });
                  } else {
                    throw new Error("Server tidak memberikan respon konfigurasi (Timeout).");
                  }
                }
              }
            }
          } catch (err) {
            if (priceToRefund > 0) {
              await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(priceToRefund, email).run();
              let uRefund = await env.DB.prepare("SELECT balance FROM users WHERE email = ?").bind(email).first();
              const nowWib = getWIBTime();
              await env.DB.prepare("INSERT INTO transactions (email, type, amount, description, balance, created_at) VALUES (?, 'IN', ?, ?, ?, ?)").bind(email, priceToRefund, `Refund Pembayaran VPN Gagal (${refundProtocol.toUpperCase()}) via AI`, uRefund.balance, nowWib).run();
              dbResult = `TINDAKAN (GAGAL): ${err.message} Saldo user sebesar Rp ${priceToRefund.toLocaleString("id-ID")} telah dikembalikan (di-refund) secara otomatis ke akun user. Sampaikan permohonan maaf dan sampaikan saldo sudah aman/kembali.`;
            } else {
              dbResult = `ERROR: ${err.message}`;
            }
          }
          messages.push({ role: "assistant", content: reply }, { role: "user", content: `[SYSTEM RESPONSE]: ${dbResult}

Sekarang jawab user dengan ramah dan segera jalankan instruksi di atas.` });
          continue;
        }
        finalReply = reply.replace(/\[?\s*ACTION_[A-Z_]+[^\]\n]*\]?/ig, "").replace(/\[?\s*DB_[A-Z_]+[^\]\n]*\]?/ig, "").replace(/\[ADMIN RESPONSE\]/ig, "").replace(/\[SYSTEM RESPONSE\]/ig, "").trim();
        if (!finalReply) {
          finalReply = isAdmin ? "Siap, perintah sampun diproses dening sistem! Wonten malih sing saged kulo bantu?" : "Nggeh, sampun kulo catet. Enten sing badhe ditangletaken malih?";
        }
        break;
      }
      return jsonResponse({ success: true, reply: finalReply });
    } catch (e) {
      console.error("AI Error Exception:", e);
      return jsonResponse({ success: false, message: `System Error: ${e.message}. Silakan coba lagi.` }, 500);
    }
  }
  return null;
}
__name(handleAIRoutes, "handleAIRoutes");
__name2(handleAIRoutes, "handleAIRoutes");
__name22(handleAIRoutes, "handleAIRoutes");
__name222(handleAIRoutes, "handleAIRoutes");
function renderAIChatUI(currentUser, appSettings = {}) {
  if (appSettings.ai_chat_active === false) {
    return "";
  }
  const userName = currentUser && currentUser.name ? currentUser.name.split(" ")[0] : "Sobat";
  const initialGreetingHTML = `
        <div class="bg-white text-slate-800 p-3 rounded-2xl rounded-tl-none text-xs border border-slate-200 max-w-[85%] shadow-sm flex flex-col gap-2">
            <span>Assalamu'alaikum ${userName}! Saya Asisten Pintar <b>AwanPulsa</b>. Ada yang bisa saya bantu terkait layanan toko atau sekadar ngobrol santai?</span>
            <div class="flex flex-wrap gap-2 mt-1">
                <button onclick="window.sendQuickReply('beli pulsa')" class="bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] py-1 px-3 rounded-full transition shadow-xs border border-sky-300">⚡ beli pulsa</button>
                <button onclick="window.sendQuickReply('cara topup')" class="bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] py-1 px-3 rounded-full transition shadow-xs border border-sky-300">💳 cara topup</button>
                <button onclick="window.sendQuickReply('daftar harga')" class="bg-sky-50 hover:bg-sky-100 text-sky-700 text-[10px] py-1 px-3 rounded-full transition shadow-xs border border-sky-300">📋 daftar harga</button>
            </div>
        </div>
    `;
  return `
    <div id="aiChatWrapper" class="fixed bottom-6 right-6 z-[9999] font-sans">
        <div id="aiChatWindow" class="hidden flex flex-col bg-white border border-slate-200 w-[320px] sm:w-[380px] h-[450px] rounded-3xl shadow-2xl overflow-hidden mb-4 transform transition-all duration-300 scale-95 opacity-0 origin-bottom-right">
            <div class="bg-gradient-to-r from-sky-600 to-blue-600 p-4 flex justify-between items-center shadow-md">
                <div class="flex items-center gap-3">
                    <div class="bg-white/20 p-2 rounded-xl text-white">🤖</div>
                    <div><h4 class="text-white font-bold text-sm leading-none">Asisten Digital</h4><span class="text-sky-100 text-[10px] uppercase font-bold tracking-widest">Online</span></div>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="window.clearAiChat()" class="text-white/75 hover:text-white transition" title="Bersihkan Obrolan"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    <button onclick="window.toggleAiChat()" class="text-white/75 hover:text-white text-2xl leading-none">&times;</button>
                </div>
            </div>
            <div id="aiChatMessages" class="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3 bg-slate-50">
                ${initialGreetingHTML}
            </div>
            <div class="p-3 bg-white border-t border-slate-200">
                <div class="flex gap-2 bg-slate-100 border border-slate-200 rounded-2xl p-1 px-3 focus-within:border-sky-500 transition">
                    <input type="text" id="aiInput" placeholder="Tanya sesuatu..." class="bg-transparent border-0 outline-none text-sm text-slate-900 placeholder-slate-400 flex-1 py-2" onkeypress="if(event.key === 'Enter') window.sendAiChat()">
                    <button onclick="window.sendAiChat()" id="btnSendAi" class="text-sky-600 hover:text-sky-700 p-1"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg></button>
                </div>
            </div>
        </div>
        <button onclick="window.toggleAiChat()" class="bg-sky-600 hover:bg-sky-500 text-white p-4 rounded-full shadow-2xl transition-transform active:scale-90 group relative flex items-center justify-center">
            <span class="absolute -top-2 -left-2 bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce shadow-md">AI</span>
            <svg id="aiIconOpen" class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
            <svg id="aiIconClose" class="w-7 h-7 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
    </div>
    <script>
        window.aiHistory = window.aiHistory || [];

        window.clearAiChat = function() {
            window.aiHistory = [];
            document.getElementById('aiChatMessages').innerHTML = \`${initialGreetingHTML}\`;
        };

        window.toggleAiChat = function() {
            const win = document.getElementById('aiChatWindow');
            const iconOpen = document.getElementById('aiIconOpen');
            const iconClose = document.getElementById('aiIconClose');
            if (!win) return;
            
            if (win.classList.contains('hidden')) {
                win.classList.remove('hidden'); 
                setTimeout(() => { win.classList.add('scale-100', 'opacity-100'); }, 10);
                if (iconOpen) iconOpen.classList.add('hidden'); 
                if (iconClose) iconClose.classList.remove('hidden');
            } else {
                win.classList.remove('scale-100', 'opacity-100'); 
                setTimeout(() => { win.classList.add('hidden'); }, 300);
                if (iconOpen) iconOpen.classList.remove('hidden'); 
                if (iconClose) iconClose.classList.add('hidden');
            }
        };

        window.sendQuickReply = function(text) {
            const input = document.getElementById('aiInput');
            if (input) {
                input.value = text;
                window.sendAiChat();
            }
        };

        window.sendAiChat = async function() {
            const input = document.getElementById('aiInput');
            const msg = input.value.trim();
            if (!msg) return;
            input.value = ''; input.disabled = true;
            const container = document.getElementById('aiChatMessages');
            
            const escapeHTML = (str) => str.replace(/[&<>'"]/g, tag => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
            }[tag] || tag));

            container.innerHTML += '<div class="bg-sky-600 text-white p-3 rounded-2xl rounded-tr-none text-xs ml-auto max-w-[85%] shadow-sm">' + escapeHTML(msg) + '</div>';
            
            const loadingId = 'ai-loading-' + Date.now();
            container.innerHTML += '<div id="' + loadingId + '" class="bg-white text-slate-500 p-3 rounded-2xl rounded-tl-none text-xs italic border border-slate-200 w-fit shadow-xs">Mengetik...</div>';
            container.scrollTop = container.scrollHeight;
            
            try {
                const res = await fetch('/api/ai/chat', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ message: msg, history: window.aiHistory }) 
                });
                const data = await res.json();
                
                const loader = document.getElementById(loadingId);
                if (loader) loader.remove();
                
                if (data.success) {
                    let formatted = data.reply
                        .replace(/(https?:\\/\\/[^\\s<]+)/g, '<a href="$1" target="_blank" class="text-sky-600 hover:text-sky-700 underline font-semibold transition">$1</a>')
                        .replace(/\\*\\*(.*?)\\*\\*/g, '<strong class="text-slate-900 font-bold">$1</strong>')
                        .replace(/^-\\s+(.*)$/gm, '<div class="flex items-start gap-2 mt-1 mb-1"><span class="text-sky-600 mt-[1px]">\u2726</span><span class="flex-1 text-slate-800">$1</span></div>')
                        .replace(/\\n/g, '<br>');
                    
                    formatted = formatted.replace(/<\\/div><br>/g, '</div>').replace(/<br><div/g, '<div');

                    container.innerHTML += '<div class="bg-white text-slate-800 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed border border-slate-200 max-w-[95%] shadow-xs">' + formatted + '</div>';
                    
                    window.aiHistory.push({ role: 'user', content: msg }, { role: 'assistant', content: data.reply });
                    if (window.aiHistory.length > 20) window.aiHistory = window.aiHistory.slice(-20);
                } else { 
                    container.innerHTML += '<div class="bg-rose-50 text-rose-600 p-3 rounded-2xl text-[10px] text-center border border-rose-200">' + data.message + '</div>'; 
                }
            } catch(e) { 
                const loader = document.getElementById(loadingId);
                if (loader) loader.remove();
                container.innerHTML += '<div class="bg-rose-50 text-rose-600 p-3 rounded-2xl text-[10px] text-center border border-rose-200">Koneksi terputus. Coba lagi.</div>'; 
            }
            container.scrollTop = container.scrollHeight; 
            input.disabled = false; 
            input.focus();
        };
    <\/script>
    `;
}
__name(renderAIChatUI, "renderAIChatUI");
__name2(renderAIChatUI, "renderAIChatUI");
__name22(renderAIChatUI, "renderAIChatUI");
__name222(renderAIChatUI, "renderAIChatUI");
async function createCloudflareDNS(env, subdomain, ipAddress) {
  if (!env.CF_ZONE_ID || !env.CF_GLOBAL_KEY || !env.CF_EMAIL) {
    console.warn("CF_ZONE_ID, CF_GLOBAL_KEY, or CF_EMAIL is not set. Skipping DNS record creation.");
    return null;
  }
  const url = `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-Auth-Email": env.CF_EMAIL,
        "X-Auth-Key": env.CF_GLOBAL_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "A",
        name: subdomain,
        content: ipAddress,
        ttl: 1,
        // Auto
        proxied: false
        // DNS Only
      })
    });
    const data = await res.json();
    if (data.success) {
      return data.result.id;
    } else {
      console.error("Cloudflare DNS API Error:", data.errors);
      return null;
    }
  } catch (e) {
    console.error("Cloudflare Fetch Error:", e);
    return null;
  }
}
__name(createCloudflareDNS, "createCloudflareDNS");
__name2(createCloudflareDNS, "createCloudflareDNS");
__name22(createCloudflareDNS, "createCloudflareDNS");
__name222(createCloudflareDNS, "createCloudflareDNS");
async function deleteCloudflareDNS(env, recordId) {
  if (!env.CF_ZONE_ID || !env.CF_GLOBAL_KEY || !env.CF_EMAIL || !recordId) return false;
  const url = `https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/dns_records/${recordId}`;
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: {
        "X-Auth-Email": env.CF_EMAIL,
        "X-Auth-Key": env.CF_GLOBAL_KEY
      }
    });
    const data = await res.json();
    return !!data.success;
  } catch (e) {
    console.error("Cloudflare Delete Fetch Error:", e);
    return false;
  }
}
__name(deleteCloudflareDNS, "deleteCloudflareDNS");
__name2(deleteCloudflareDNS, "deleteCloudflareDNS");
__name22(deleteCloudflareDNS, "deleteCloudflareDNS");
__name222(deleteCloudflareDNS, "deleteCloudflareDNS");
async function renderLicensePage(env, currentUser, appSettings, url) {
  const pricePerDay = appSettings.script_price_per_day || 500;
  try {
    await env.DB.prepare(`
            CREATE TABLE IF NOT EXISTS licenses (
                id TEXT PRIMARY KEY,
                email TEXT,
                vps_name TEXT,
                ip_address TEXT,
                expires_at INTEGER,
                created_at TEXT
            )
        `).run();
  } catch (e) {
  }
  try {
    await env.DB.prepare("ALTER TABLE licenses ADD COLUMN subdomain TEXT").run();
  } catch (e) {
  }
  try {
    await env.DB.prepare("ALTER TABLE licenses ADD COLUMN cf_record_id TEXT").run();
  } catch (e) {
  }
  const licPage = url ? parseInt(url.searchParams.get("page") || "1") : 1;
  const licLimit = 10;
  const licOffset = (licPage - 1) * licLimit;
  let totalLicenses = 0;
  try {
    const totalRow = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM licenses WHERE email = ?"
    ).bind(currentUser.email).first();
    totalLicenses = totalRow ? totalRow.count : 0;
  } catch (e) {
    console.error("Gagal count lisensi:", e);
  }
  const totalPages = Math.ceil(totalLicenses / licLimit) || 1;
  let licenses = [];
  try {
    const { results } = await env.DB.prepare(
      "SELECT * FROM licenses WHERE email = ? ORDER BY rowid DESC LIMIT ? OFFSET ?"
    ).bind(currentUser.email, licLimit, licOffset).all();
    licenses = results || [];
  } catch (e) {
    console.error("Gagal load lisensi:", e);
  }
  let licenseListHtml = "";
  if (!licenses || licenses.length === 0) {
    licenseListHtml = `
            <tr><td colspan="5" class="p-8 text-center text-gray-500">Anda belum memiliki lisensi IP yang terdaftar.</td></tr>
        `;
  } else {
    licenseListHtml = licenses.map((lic) => {
      const isExpired = lic.expires_at < Date.now();
      const expDate = new Date(lic.expires_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
      const statusBadge = isExpired ? '<span class="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] px-2 py-1 rounded uppercase font-bold">Expired</span>' : '<span class="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-1 rounded uppercase font-bold">Aktif</span>';
      return `
            <tr class="hover:bg-slate-50/80 transition border-b border-slate-100 last:border-0">
                <td class="p-4 font-mono text-sm text-sky-600 font-bold">${escapeHTML(lic.ip_address)}</td>
                <td class="p-4 text-sm text-slate-800 font-medium">
                    ${escapeHTML(lic.vps_name)}
                    ${lic.subdomain ? `<br><span class="text-[10px] text-amber-700 font-mono font-bold">${escapeHTML(lic.subdomain)}</span>` : ""}
                </td>
                <td class="p-4 text-xs font-mono ${isExpired ? "text-rose-600" : "text-slate-700"}">${expDate}</td>
                <td class="p-4 text-center">${statusBadge}</td>
                <td class="p-4 flex gap-2 justify-center">
                    <button onclick="extendLicense('${lic.id}', '${lic.ip_address}')" class="bg-sky-600 hover:bg-sky-500 text-white text-[11px] px-3 py-1.5 rounded-lg uppercase font-bold transition shadow-xs">Perpanjang</button>
                    <button onclick="deleteLicense('${lic.id}', '${lic.ip_address}')" class="bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-300 text-[11px] px-3 py-1.5 rounded-lg uppercase font-bold transition shadow-xs">Hapus IP</button>
                </td>
            </tr>
            `;
    }).join("");
  }
  return `
    <div class="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-slate-200 pb-5 gap-4">
            <div>
                <h1 class="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">📜 Lisensi Autoscript</h1>
                <p class="text-slate-600 text-sm mt-2">Daftarkan IP VPS Anda agar dapat menggunakan Autoscript Installer Premium kami.</p>
            </div>
            <div class="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 flex items-center gap-3 shadow-xs">
                <span class="text-xs text-slate-600 font-bold uppercase">Harga Script</span>
                <span class="bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded font-mono font-bold border border-sky-200">Rp ${pricePerDay.toLocaleString("id-ID")} / Hari</span>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <!-- Form Registrasi IP -->
            <div class="lg:col-span-1 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-md h-fit">
                <h2 class="text-xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-3">➕ Daftarkan IP Baru</h2>
                <form id="formBuyLicense" class="space-y-5">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-2 uppercase">Nama VPS / Domain</label>
                        <input type="text" id="licName" required placeholder="Contoh: xiaoyan123" class="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none text-sm">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-2 uppercase">Alamat IPv4 VPS</label>
                        <input type="text" id="licIp" required placeholder="Contoh: 103.123.45.67" pattern="^([0-9]{1,3}\\.){3}[0-9]{1,3}$" class="w-full bg-white border border-slate-300 rounded-xl p-3 text-sky-600 font-mono placeholder-slate-400 focus:ring-2 focus:ring-sky-500 outline-none text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-2 uppercase">Masa Aktif (Durasi)</label>
                        <select id="licDuration" onchange="updateLicPrice()" class="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none text-sm font-bold">
                            <option value="30">30 Hari (1 Bulan)</option>
                            <option value="90">90 Hari (3 Bulan)</option>
                            <option value="180">180 Hari (6 Bulan)</option>
                            <option value="365">365 Hari (1 Tahun)</option>
                        </select>
                    </div>
                    <div class="flex justify-between items-center bg-sky-50 p-4 rounded-xl border border-sky-200 mt-2">
                        <span class="text-sm text-slate-600 font-medium">Total:</span>
                        <span class="text-2xl font-black text-sky-600 tracking-tight" id="licPriceDisplay">Rp ${(pricePerDay * 30).toLocaleString("id-ID")}</span>
                    </div>
                    <button type="submit" id="btnBuyLic" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 rounded-xl shadow-lg transition text-base mt-2">Bayar & Daftarkan</button>
                </form>
            </div>

            <!-- Tabel Daftar IP -->
            <div class="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
                <div class="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 font-bold">
                    <h2 class="text-xl font-bold text-slate-900">Daftar IP Saya</h2>
                    <span class="text-xs text-slate-500">Gunakan perintah <code class="bg-slate-200 px-1.5 py-0.5 rounded text-sky-700 font-mono">wget</code> untuk install di VPS.</span>
                </div>
                <div class="overflow-x-auto flex-grow custom-scrollbar">
                    <table class="w-full text-left text-sm text-slate-700 whitespace-nowrap">
                        <thead class="bg-slate-100 text-slate-700 border-b border-slate-200">
                            <tr>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs">IP Address</th>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs">Nama VPS</th>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs">Expired Date</th>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs text-center">Status</th>
                                <th class="p-4 font-bold uppercase tracking-wider text-xs text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 text-slate-800">
                            ${licenseListHtml}
                        </tbody>
                    </table>
                </div>
                
                <!-- Pagination Controls -->
                ${totalPages > 1 ? `
                <div class="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-wrap">
                    <a href="${licPage > 1 ? `/lisensi?page=${licPage - 1}` : "#"}" class="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs ${licPage <= 1 ? "opacity-50 pointer-events-none" : ""}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Sebelum
                    </a>
                    <span class="text-xs text-slate-600 font-medium">Halaman ${licPage} dari ${totalPages} (Total ${totalLicenses} IP)</span>
                    <a href="${licPage < totalPages ? `/lisensi?page=${licPage + 1}` : "#"}" class="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs ${licPage >= totalPages ? "opacity-50 pointer-events-none" : ""}">
                        Berikut <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </a>
                </div>
                ` : ""}
                
                <!-- Box Instruksi Install -->
                <div class="p-6 bg-slate-50 border-t border-slate-200">
                    <h3 class="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">🚀 Cara Install di VPS:</h3>
                    <div class="bg-slate-900 p-3.5 rounded-xl border border-slate-700 flex items-center justify-between group shadow-inner">
                        <code class="text-emerald-400 text-xs font-mono select-all">sudo wget -qO installx https://srpcom.cloud/installx && sudo chmod +x installx && sudo ./installx</code>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const LIC_PRICE_PER_DAY = ${pricePerDay};

        function updateLicPrice() {
            const days = parseInt(document.getElementById('licDuration').value);
            document.getElementById('licPriceDisplay').innerText = 'Rp ' + (days * LIC_PRICE_PER_DAY).toLocaleString('id-ID');
        }

        document.getElementById('formBuyLicense').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('licName').value.trim();
            const ip = document.getElementById('licIp').value.trim();
            const days = document.getElementById('licDuration').value;
            const price = parseInt(days) * LIC_PRICE_PER_DAY;

            const conf = await swalDark.fire({
                title: 'Konfirmasi Pendaftaran IP',
                html: 'Sistem akan memotong Saldo Anda sebesar <b class="text-green-400">Rp ' + price.toLocaleString('id-ID') + '</b>.<br>Pastikan IP <b>' + ip + '</b> sudah benar!',
                icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, Beli Lisensi'
            });

            if(!conf.isConfirmed) return;

            const btn = document.getElementById('btnBuyLic');
            btn.disabled = true; btn.innerText = 'Memproses...';

            try {
                const res = await fetch('/api/license/buy', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vps_name: name, ip_address: ip, duration: days })
                });
                const data = await res.json();
                
                if (data.success) {
                    await swalDark.fire('Berhasil', 'IP berhasil didaftarkan! Silakan jalankan script instalasi di VPS Anda.', 'success');
                    window.location.reload();
                } else {
                    swalDark.fire('Gagal', data.message, 'error');
                }
            } catch(e) {
                swalDark.fire('Error', 'Kesalahan koneksi', 'error');
            }
            btn.disabled = false; btn.innerText = 'Bayar & Daftarkan';
        });

        async function extendLicense(id, ip) {
            const { value: days, isDismissed } = await swalDark.fire({
                title: 'Perpanjang Masa Aktif',
                html: '<p class="text-sm mb-4">IP: <b class="text-cyan-400 font-mono">' + ip + '</b></p><p class="text-xs text-gray-400 mb-2">Harga: Rp ' + LIC_PRICE_PER_DAY.toLocaleString('id-ID') + '/Hari</p>',
                input: 'select',
                inputOptions: { '30': '30 Hari', '90': '90 Hari', '180': '180 Hari', '365': '365 Hari' },
                inputPlaceholder: '-- Pilih Tambahan Waktu --',
                showCancelButton: true, confirmButtonText: 'Bayar & Perpanjang'
            });

            if (isDismissed || !days) return;
            const price = parseInt(days) * LIC_PRICE_PER_DAY;

            const conf = await swalDark.fire({ title: 'Konfirmasi', text: 'Saldo akan dipotong Rp ' + price.toLocaleString('id-ID') + '. Lanjutkan?', icon: 'warning', showCancelButton: true });
            if (!conf.isConfirmed) return;

            swalDark.fire({title: 'Memproses...', didOpen: () => Swal.showLoading()});
            try {
                const res = await fetch('/api/license/extend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, duration: days }) });
                const data = await res.json();
                if(data.success) { await swalDark.fire('Berhasil', 'Masa aktif berhasil ditambah.', 'success'); window.location.reload(); }
                else { swalDark.fire('Gagal', data.message, 'error'); }
            } catch(e) { swalDark.fire('Error', 'Koneksi bermasalah', 'error'); }
        }

        async function deleteLicense(id, ip) {
            const conf = await swalDark.fire({
                title: 'Hapus Lisensi IP?',
                text: 'IP ' + ip + ' akan dihapus dan script di VPS tersebut tidak akan bisa diinstall ulang/update. (Sisa masa aktif hangus dan tidak di-refund).',
                icon: 'error', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus IP!'
            });
            if(!conf.isConfirmed) return;

            swalDark.fire({title: 'Menghapus...', didOpen: () => Swal.showLoading()});
            try {
                const res = await fetch('/api/license/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
                if((await res.json()).success) { await swalDark.fire('Dihapus', 'Lisensi IP berhasil dihapus.', 'success'); window.location.reload(); }
                else { swalDark.fire('Gagal', 'Sistem error.', 'error'); }
            } catch(e) { swalDark.fire('Error', 'Koneksi bermasalah', 'error'); }
        }
    <\/script>
    `;
}
__name(renderLicensePage, "renderLicensePage");
__name2(renderLicensePage, "renderLicensePage");
__name22(renderLicensePage, "renderLicensePage");
__name222(renderLicensePage, "renderLicensePage");
async function handleLicenseRoutes(url, request, env, currentUser, appSettings, sendTelegramLog2) {
  const path = url.pathname;
  const method = request.method;
  if (path.startsWith("/api/license")) {
    try {
      await env.DB.prepare(`
                CREATE TABLE IF NOT EXISTS licenses (
                    id TEXT PRIMARY KEY,
                    email TEXT,
                    vps_name TEXT,
                    ip_address TEXT,
                    expires_at INTEGER,
                    created_at TEXT
                )
            `).run();
    } catch (e) {
    }
    try {
      await env.DB.prepare("ALTER TABLE licenses ADD COLUMN subdomain TEXT").run();
    } catch (e) {
    }
    try {
      await env.DB.prepare("ALTER TABLE licenses ADD COLUMN cf_record_id TEXT").run();
    } catch (e) {
    }
  }
  if (path === "/api/license/check" && method === "GET") {
    const ip = url.searchParams.get("ip");
    const name = url.searchParams.get("name");
    if (!ip || !name) return jsonResponse({ success: false, message: "IP atau Nama VPS tidak diberikan." }, 400);
    try {
      let license = await env.DB.prepare("SELECT * FROM licenses WHERE ip_address = ? AND vps_name = ?").bind(ip, name).first();
      if (!license) {
        const licByIp = await env.DB.prepare("SELECT * FROM licenses WHERE ip_address = ?").bind(ip).first();
        if (licByIp) {
          return jsonResponse({
            success: false,
            message: `Kombinasi IP dan Nama VPS tidak cocok. IP ini terdaftar dengan Nama VPS: ${licByIp.vps_name}`,
            data: { vps_name: licByIp.vps_name }
          }, 403);
        }
        return jsonResponse({ success: false, message: "Kombinasi IP dan Nama VPS belum terdaftar di database Lisensi." }, 403);
      }
      if (license.expires_at < Date.now()) {
        return jsonResponse({
          success: false,
          message: "Lisensi untuk IP dan Nama VPS ini sudah KADALUARSA (Expired).",
          data: { vps_name: license.vps_name }
        }, 403);
      }
      const expDateStr = new Date(license.expires_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" });
      return jsonResponse({ success: true, message: "Lisensi Valid.", data: { vps_name: license.vps_name, expires_at: expDateStr, subdomain: license.subdomain } });
    } catch (e) {
      return jsonResponse({ success: false, message: "Database Error" }, 500);
    }
  }
  if (!currentUser) return null;
  const pricePerDay = appSettings.script_price_per_day || 500;
  if (path === "/api/license/buy" && method === "POST") {
    try {
      const { vps_name, ip_address, duration } = await request.json();
      const days = parseInt(duration);
      if (![30, 90, 180, 365].includes(days)) throw new Error("Durasi pendaftaran lisensi tidak valid.");
      if (!/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip_address)) throw new Error("Format IP Address tidak valid.");
      const checkExist = await env.DB.prepare("SELECT id FROM licenses WHERE ip_address = ?").bind(ip_address).first();
      if (checkExist) throw new Error("IP ini sudah terdaftar oleh seseorang. Silakan hapus yang lama jika ingin mendaftarkan ulang.");
      const price = days * pricePerDay;
      const deduct = await env.DB.prepare("UPDATE users SET balance = balance - ? WHERE email = ? AND balance >= ?").bind(price, currentUser.email, price).run();
      if (deduct.meta.changes === 0) throw new Error("Saldo tidak mencukupi.");
      await catatMutasi(env, currentUser.email, "OUT", price, `Beli Lisensi Script IP ${ip_address} (${days} Hari)`);
      const licenseId = "LIC-" + crypto.randomUUID().split("-")[0].toUpperCase();
      const expiresAt = Date.now() + days * 24 * 60 * 60 * 1e3;
      const nowWib = getWIBTime();
      const expDateStr = new Date(expiresAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
      let nextNum = 1001;
      try {
        const { results } = await env.DB.prepare(
          "SELECT subdomain FROM licenses WHERE subdomain LIKE 'srv-%.awanpulsa.web.id'"
        ).all();
        if (results && results.length > 0) {
          let maxNum = 1e3;
          for (const row of results) {
            if (row.subdomain) {
              const match = row.subdomain.match(/^srv-(\d{4,})\.tuban\.store$/);
              if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxNum) {
                  maxNum = num;
                }
              }
            }
          }
          nextNum = maxNum + 1;
        }
      } catch (e) {
        console.error("Gagal mendapatkan urutan subdomain:", e);
      }
      const generatedSubdomain = `srv-${nextNum}.awanpulsa.web.id`;
      let cfRecordId = null;
      if (env.CF_ZONE_ID && env.CF_GLOBAL_KEY && env.CF_EMAIL) {
        cfRecordId = await createCloudflareDNS(env, generatedSubdomain, ip_address);
      }
      await env.DB.prepare(
        "INSERT INTO licenses (id, email, vps_name, ip_address, expires_at, created_at, subdomain, cf_record_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(licenseId, currentUser.email, vps_name, ip_address, expiresAt, nowWib, generatedSubdomain, cfRecordId).run();
      if (sendTelegramLog2) await sendTelegramLog2(`\u{1F4DC} LISENSI BARU DIBELI`, `User: ${currentUser.email}
IP: ${ip_address}
Nama: <code>${vps_name}</code>
Subdomain: <code>${generatedSubdomain}</code>
Durasi: ${days} Hari &lt;expired : ${expDateStr}&gt;
Status: Sukses`, appSettings);
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 400);
    }
  }
  if (path === "/api/license/extend" && method === "POST") {
    try {
      const { id, duration } = await request.json();
      const days = parseInt(duration);
      if (![30, 90, 180, 365].includes(days)) throw new Error("Durasi perpanjangan lisensi tidak valid.");
      const price = days * pricePerDay;
      const license = await env.DB.prepare("SELECT * FROM licenses WHERE id = ?").bind(id).first();
      if (!license) throw new Error("Lisensi tidak ditemukan.");
      if (!isAdmin(currentUser, env) && license.email !== currentUser.email) throw new Error("Akses ditolak. Ini bukan lisensi Anda.");
      const deduct = await env.DB.prepare("UPDATE users SET balance = balance - ? WHERE email = ? AND balance >= ?").bind(price, currentUser.email, price).run();
      if (deduct.meta.changes === 0) throw new Error("Saldo tidak mencukupi.");
      await catatMutasi(env, currentUser.email, "OUT", price, `Perpanjang Lisensi IP ${license.ip_address} (+${days} Hari)`);
      const currentExp = license.expires_at;
      const now = Date.now();
      const baseTime = currentExp > now ? currentExp : now;
      const newExp = baseTime + days * 24 * 60 * 60 * 1e3;
      await env.DB.prepare("UPDATE licenses SET expires_at = ? WHERE id = ?").bind(newExp, id).run();
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 400);
    }
  }
  if (path === "/api/license/delete" && method === "POST") {
    try {
      const { id } = await request.json();
      const license = await env.DB.prepare("SELECT * FROM licenses WHERE id = ?").bind(id).first();
      if (!license) throw new Error("Lisensi tidak ditemukan.");
      let query = "DELETE FROM licenses WHERE id = ?";
      let params = [id];
      if (!isAdmin(currentUser, env)) {
        if (license.email !== currentUser.email) {
          throw new Error("Akses ditolak. Ini bukan lisensi Anda.");
        }
        query += " AND email = ?";
        params.push(currentUser.email);
      }
      const result = await env.DB.prepare(query).bind(...params).run();
      if (result.meta.changes === 0) throw new Error("Gagal menghapus. Data tidak ditemukan atau Anda tidak memiliki akses.");
      if (isAdmin(currentUser, env) && license.cf_record_id) {
        await deleteCloudflareDNS(env, license.cf_record_id);
      }
      return jsonResponse({ success: true });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 400);
    }
  }
  if (path === "/api/admin/licenses" && method === "GET") {
    if (!isAdmin(currentUser, env)) return jsonResponse({ success: false }, 401);
    try {
      const { results } = await env.DB.prepare("SELECT * FROM licenses ORDER BY rowid DESC").all();
      return jsonResponse({ success: true, data: results });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }
  return null;
}
__name(handleLicenseRoutes, "handleLicenseRoutes");
__name2(handleLicenseRoutes, "handleLicenseRoutes");
__name22(handleLicenseRoutes, "handleLicenseRoutes");
__name222(handleLicenseRoutes, "handleLicenseRoutes");
function renderConverterPage() {
  return "<html><body>Not Found</body></html>";
}
__name(renderConverterPage, "renderConverterPage");
__name2(renderConverterPage, "renderConverterPage");
__name22(renderConverterPage, "renderConverterPage");
__name222(renderConverterPage, "renderConverterPage");
function renderCekKuotaPage() {
  return "<html><body>Not Found</body></html>";
}
__name(renderCekKuotaPage, "renderCekKuotaPage");
__name2(renderCekKuotaPage, "renderCekKuotaPage");
__name22(renderCekKuotaPage, "renderCekKuotaPage");
__name222(renderCekKuotaPage, "renderCekKuotaPage");
async function hmacSha256(message, key) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hmacSha256, "hmacSha256");
__name2(hmacSha256, "hmacSha256");
__name22(hmacSha256, "hmacSha256");
__name222(hmacSha256, "hmacSha256");
async function createVioletTransaction(env, customer, amount, originUrl) {
  const apiKey = env.VIOLET_API_KEY;
  const secretKey = env.VIOLET_SECRET_KEY;
  const channel = env.VIOLET_CHANNEL || "QRIS2";
  const apiUrl = env.VIOLET_API_URL || "https://violetmediapay.com/api/live/create";
  if (!apiKey || !secretKey) {
    throw new Error("VIOLET_API_KEY atau VIOLET_SECRET_KEY belum diatur di Environment Variables Worker.");
  }
  const refKode = (Math.floor(Date.now() / 1e3) * 1e4 + Math.floor(Math.random() * 1e4)).toString();
  const signatureData = `${refKode}${apiKey}${amount}`;
  const signature = await hmacSha256(signatureData, secretKey);
  const payload = new URLSearchParams();
  payload.append("api_key", apiKey);
  payload.append("secret_key", secretKey);
  payload.append("channel_payment", channel);
  payload.append("ref_kode", refKode);
  payload.append("nominal", amount.toString());
  payload.append("cus_nama", customer.name || "Customer Web");
  payload.append("cus_email", customer.email || "customer@store.web");
  payload.append("url_redirect", `https://${new URL(originUrl).hostname}/`);
  payload.append("url_callback", `${originUrl.replace(/\/$/, "")}/webhook-violet`);
  payload.append("expired_time", (Math.floor(Date.now() / 1e3) + 3600).toString());
  payload.append("signature", signature);
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: payload.toString()
  });
  const resText = await response.text();
  let result;
  try {
    result = JSON.parse(resText);
  } catch (err) {
    throw new Error(`Respons dari VioletMediaPay bukan JSON. Isi respons: ${resText.substring(0, 200)}`);
  }
  if (result.status === true && result.data) {
    const txData = Array.isArray(result.data) ? result.data[0] : result.data;
    return {
      success: true,
      ref: refKode,
      checkout_url: txData.checkout_url,
      target: txData.target,
      raw: result
    };
  } else {
    return {
      success: false,
      message: result.message || "Gagal membuat transaksi di VioletMediaPay.",
      raw: result
    };
  }
}
__name(createVioletTransaction, "createVioletTransaction");
__name2(createVioletTransaction, "createVioletTransaction");
__name22(createVioletTransaction, "createVioletTransaction");
__name222(createVioletTransaction, "createVioletTransaction");
async function verifyVioletCallback(request, bodyObj, env) {
  const { status, ref } = bodyObj;
  const apiKey = env.VIOLET_API_KEY;
  const secretKey = env.VIOLET_SECRET_KEY;
  const refString = ref ? ref.toString() : "";
  const idRefString = bodyObj.id_reference ? bodyObj.id_reference.toString() : "";
  const totalAmountString = bodyObj.total_amount ? bodyObj.total_amount.toString() : "";
  const signature = request.headers.get("x-callback-signature") || bodyObj.signature || "";
  const clientIp = request.headers.get("cf-connecting-ip") || "";
  const isWhitelistedIp = clientIp === "202.155.132.37" || clientIp === "2001:df7:5300:9::122";
  const sig1 = await hmacSha256(refString, apiKey);
  const sig2 = await hmacSha256(refString, secretKey);
  const sig3 = await hmacSha256(idRefString, apiKey);
  const sig4 = await hmacSha256(idRefString, secretKey);
  const sig5 = await hmacSha256(refString + totalAmountString, apiKey);
  const sig6 = await hmacSha256(refString + totalAmountString, secretKey);
  const computedSignatures = [sig1, sig2, sig3, sig4, sig5, sig6];
  const signatureMatched = computedSignatures.includes(signature);
  let isValid = false;
  if (signature) {
    isValid = signatureMatched;
  } else {
    isValid = isWhitelistedIp;
  }
  return {
    isValid,
    clientIp,
    isWhitelistedIp,
    signature,
    ref: refString,
    amount: parseInt(totalAmountString, 10) || 0,
    status: status || "",
    raw: bodyObj
  };
}
__name(verifyVioletCallback, "verifyVioletCallback");
__name2(verifyVioletCallback, "verifyVioletCallback");
__name22(verifyVioletCallback, "verifyVioletCallback");
__name222(verifyVioletCallback, "verifyVioletCallback");

async function getAutoGoPayConfig(env, appSettings) {
  const apiKey = (appSettings && appSettings.autogopay_api_key) || (env && env.AUTOGOPAY_API_KEY) || "agp_1bae647d0c0c25307757c1a60afa7b06256c90dbefb4650f3f7e43a03d5c2a7d";
  const shopeeStatic = (appSettings && appSettings.shopeepay_qris_static) || (env && env.SHOPEEPAY_QRIS_STATIC) || "00020101021126610016ID.CO.SHOPEE.WWW01189360091800231945460208231945460303UMI51440014ID.CO.QRIS.WWW0215ID10265329492310303UMI5204572253033605802ID5911tuban store6005TUBAN61056235562070703A0163042177";
  const gopayStatic = (appSettings && appSettings.gopay_qris_static) || (env && env.GOPAY_QRIS_STATIC) || "00020101021126610014COM.GO-JEK.WWW01189360091437549297840210G7549297840303UMI51440014ID.CO.QRIS.WWW0215ID10243243071480303UMI5204504553033605802ID5913Srp Com Tuban6005TUBAN61056235562070703A0163041FE0";
  return { apiKey, shopeeStatic, gopayStatic };
}
__name(getAutoGoPayConfig, "getAutoGoPayConfig");
__name2(getAutoGoPayConfig, "getAutoGoPayConfig");
__name22(getAutoGoPayConfig, "getAutoGoPayConfig");
__name222(getAutoGoPayConfig, "getAutoGoPayConfig");

async function createShopeePayTransaction(env, appSettings, nominalUnik) {
  try {
    const { apiKey, shopeeStatic } = await getAutoGoPayConfig(env, appSettings);
    if (!apiKey || !shopeeStatic) return { success: false, message: "AutoGoPay ShopeePay belum dikonfigurasi." };
    const res = await fetch("https://v1-gateway.autogopay.site/shopeepay/qris/create", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount: parseInt(nominalUnik), qris_static: shopeeStatic })
    });
    const data = await res.json();
    if (data.success && data.data) {
      return {
        success: true,
        order_sn: data.data.order_sn || "",
        qr_url: data.data.qr_url || "",
        qr_string: data.data.qr_string || "",
        amount: data.data.amount || nominalUnik,
        expiry_time: data.data.expiry_time || ""
      };
    }
    return { success: false, message: data.message || "Gagal membuat QRIS ShopeePay." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
__name(createShopeePayTransaction, "createShopeePayTransaction");
__name2(createShopeePayTransaction, "createShopeePayTransaction");
__name22(createShopeePayTransaction, "createShopeePayTransaction");
__name222(createShopeePayTransaction, "createShopeePayTransaction");

async function createGoPayTransaction(env, appSettings, nominalUnik) {
  try {
    const { apiKey, gopayStatic } = await getAutoGoPayConfig(env, appSettings);
    if (!apiKey) return { success: false, message: "AutoGoPay GoPay belum dikonfigurasi." };
    const payload = { amount: parseInt(nominalUnik) };
    if (gopayStatic) payload.qris_static = gopayStatic;
    const res = await fetch("https://v1-gateway.autogopay.site/qris/generate", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.data) {
      return {
        success: true,
        transaction_id: data.data.transaction_id || "",
        order_id: data.data.order_id || "",
        qr_url: data.data.qr_url || "",
        checkout_url: data.data.checkout_url || "",
        qr_string: data.data.qr_string || "",
        amount: data.data.amount || nominalUnik,
        expiry_time: data.data.expiry_time || ""
      };
    }
    return { success: false, message: data.message || "Gagal membuat QRIS GoPay." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
__name(createGoPayTransaction, "createGoPayTransaction");
__name2(createGoPayTransaction, "createGoPayTransaction");
__name22(createGoPayTransaction, "createGoPayTransaction");
__name222(createGoPayTransaction, "createGoPayTransaction");

async function checkShopeePayTransactions(env, appSettings) {
  try {
    const { apiKey } = await getAutoGoPayConfig(env, appSettings);
    if (!apiKey) return [];
    const res = await fetch("https://v1-gateway.autogopay.site/shopeepay/transactions?pageSize=20", {
      method: "GET",
      headers: { "Authorization": "Bearer " + apiKey }
    });
    const data = await res.json();
    if (data.success && data.data && Array.isArray(data.data.transactions)) {
      return data.data.transactions;
    }
    return [];
  } catch (e) {
    return [];
  }
}
__name(checkShopeePayTransactions, "checkShopeePayTransactions");
__name2(checkShopeePayTransactions, "checkShopeePayTransactions");
__name22(checkShopeePayTransactions, "checkShopeePayTransactions");
__name222(checkShopeePayTransactions, "checkShopeePayTransactions");

async function checkGoPayTransactions(env, appSettings) {
  try {
    const { apiKey } = await getAutoGoPayConfig(env, appSettings);
    if (!apiKey) return [];
    const res = await fetch("https://v1-gateway.autogopay.site/transactions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const data = await res.json();
    if (data.success && data.data && Array.isArray(data.data.transactions)) {
      return data.data.transactions;
    }
    return [];
  } catch (e) {
    return [];
  }
}
__name(checkGoPayTransactions, "checkGoPayTransactions");
__name2(checkGoPayTransactions, "checkGoPayTransactions");
__name22(checkGoPayTransactions, "checkGoPayTransactions");
__name222(checkGoPayTransactions, "checkGoPayTransactions");

async function checkShopeePayStatus(env, appSettings, orderSn) {
  try {
    const { apiKey } = await getAutoGoPayConfig(env, appSettings);
    if (!apiKey || !orderSn) return null;
    const res = await fetch("https://v1-gateway.autogopay.site/shopeepay/qris/status?order_sn=" + encodeURIComponent(orderSn), {
      method: "GET",
      headers: { "Authorization": "Bearer " + apiKey }
    });
    const data = await res.json();
    if (data.success && data.data) {
      return data.data;
    }
    return null;
  } catch (e) {
    return null;
  }
}
__name(checkShopeePayStatus, "checkShopeePayStatus");
__name2(checkShopeePayStatus, "checkShopeePayStatus");
__name22(checkShopeePayStatus, "checkShopeePayStatus");
__name222(checkShopeePayStatus, "checkShopeePayStatus");

async function checkGoPayStatus(env, appSettings, transactionId) {
  try {
    const { apiKey } = await getAutoGoPayConfig(env, appSettings);
    if (!apiKey || !transactionId) return null;
    const res = await fetch("https://v1-gateway.autogopay.site/qris/status", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ transaction_id: transactionId })
    });
    const data = await res.json();
    if (data.data) return data.data;
    return null;
  } catch (e) {
    return null;
  }
}
__name(checkGoPayStatus, "checkGoPayStatus");
__name2(checkGoPayStatus, "checkGoPayStatus");
__name22(checkGoPayStatus, "checkGoPayStatus");
__name222(checkGoPayStatus, "checkGoPayStatus");
var GOOGLE_CLIENT_ID = (typeof process !== "undefined" && process.env && process.env.GOOGLE_CLIENT_ID) || "727817597785-oub85kbvvsl640v7q4cak661vn5jt7kh.apps.googleusercontent.com";
var LOGO_URL = (typeof process !== "undefined" && process.env && process.env.LOGO_URL) || "/logo-awanpulsa.png?v=2026";
var worker_default = {
  async scheduled(event, env, ctx) {
    const appSettings = await getAppSettings(env);
    if (!appSettings) return;
    try {
      const nowTs = Date.now();
      const { results: allInbox } = await env.DB.prepare("SELECT id, title, date FROM inbox WHERE title LIKE '%TRIAL%' OR title LIKE '%PENDING%'").all();
      if (allInbox && allInbox.length > 0) {
        const expiredInboxIds = [];
        for (const msg of allInbox) {
          const msgTs = parseWIBDateString(msg.date);
          if (msgTs > 0) {
            if (msg.title.includes("TRIAL") && nowTs - msgTs > 36e5) expiredInboxIds.push(msg.id);
            else if (msg.title.includes("PENDING") && nowTs - msgTs > 36e5) expiredInboxIds.push(msg.id);
          }
        }
        if (expiredInboxIds.length > 0) {
          const stmts = expiredInboxIds.map((id) => env.DB.prepare("DELETE FROM inbox WHERE id = ?").bind(id));
          await env.DB.batch(stmts);
        }
      }
      const { results: allUnpaid } = await env.DB.prepare("SELECT ref, date FROM invoices WHERE status = 'UNPAID'").all();
      if (allUnpaid && allUnpaid.length > 0) {
        const expiredRefs = [];
        for (const inv of allUnpaid) {
          const invTs = parseWIBDateString(inv.date);
          if (invTs > 0 && nowTs - invTs > 36e5) expiredRefs.push(inv.ref);
        }
        if (expiredRefs.length > 0) {
          const stmts = expiredRefs.map((ref) => env.DB.prepare("UPDATE invoices SET status = 'EXPIRED' WHERE ref = ?").bind(ref));
          await env.DB.batch(stmts);
        }
      }
    } catch (e) {
      console.error("Auto Cleanup Background Failed:", e);
    }
    const botToken = appSettings.telegram_bot_token;
    const chatId = appSettings.telegram_channel_id;
    const frequency = appSettings.auto_backup_frequency !== void 0 ? parseInt(appSettings.auto_backup_frequency) : 24;
    if (frequency <= 0 || !botToken || !chatId) return;

    const nowMs = Date.now();
    const lastBackupKey = "last_backup_timestamp";
    let lastBackupTime = 0;
    try {
      const lastBackupRow = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(lastBackupKey).first();
      if (lastBackupRow && lastBackupRow.value) {
        lastBackupTime = parseInt(lastBackupRow.value);
      }
    } catch (e) {
    }

    // Hitung interval frekuensi jam (misal 1, 2, 4, 6, 12, 24 jam)
    const intervalMs = frequency * 3600 * 1000;
    if (lastBackupTime > 0 && (nowMs - lastBackupTime < intervalMs - 120000)) {
      return;
    }

    try {
      const backupObj = await generateBackupData(env);
      const { users, invoices, ppob_transactions } = backupObj;
      const totalSaldo = users.reduce((sum, u) => sum + (u.balance || 0), 0);
      const paidInvoices = (invoices || []).filter((i) => i.status === "PAID");
      const ppobTx = ppob_transactions || [];
      const totalTransactions = paidInvoices.length + ppobTx.length;
      const wibTime = getWIBTime();
      const backupData = JSON.stringify(backupObj, null, 2);
      await saveBackupToR2(env, backupObj, wibTime);
      const blob = new Blob([backupData], { type: "application/json" });
      const cleanWib = wibTime.replace(/[\/\s:,]/g, "_");
      const file = new File([blob], `Backup_AwanPulsa_${cleanWib}.json`);
      const timesPerDay = frequency > 0 ? (24 / frequency) : 0;
      const freqText = frequency === 1 ? "Tiap 1 Jam (24x Sehari)" : `Tiap ${frequency} Jam (${timesPerDay}x Sehari)`;
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append("caption", `#awanpulsa
\u{1F4E6} <b>AUTO BACKUP DATABASE</b>

\u{1F552} Waktu: ${wibTime}
\u23F1\uFE0F Frekuensi: ${freqText}
\u{1F464} Total User: ${users.length}
\u{1F4B0} Total Saldo: Rp ${totalSaldo.toLocaleString("id-ID")}
\u{1F6CD}\uFE0F Total Transaksi: ${totalTransactions}

#autobackup #database #awanpulsabackup`);
      formData.append("parse_mode", "HTML");
      formData.append("document", file);
      await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, { method: "POST", body: formData });
      let rekapText = `Rekap saldo pengguna
Total : Rp.${totalSaldo.toLocaleString("id-ID")}

`;
      rekapText += "NO | Akun                          | Saldo      |\n";
      users.forEach((u, i) => {
        const no = String(i + 1).padEnd(2, " ");
        const email = u.email.padEnd(29, " ");
        const balance = (u.balance || 0).toLocaleString("id-ID").padEnd(10, " ");
        rekapText += `${no} | ${email} | ${balance} |
`;
      });
      const dateMatch = wibTime.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      const timeMatch = wibTime.match(/(\d{2})[:\.](\d{2})/);
      const fileNameTime = dateMatch && timeMatch ? `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}_${timeMatch[1]}${timeMatch[2]} WIB` : "now";
      const rekapBlob = new Blob([rekapText], { type: "text/plain" });
      const rekapFormData = new FormData();
      rekapFormData.append("chat_id", chatId);
      rekapFormData.append("document", rekapBlob, `rekap saldo user ${fileNameTime}.txt`);
      await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, { method: "POST", body: rekapFormData });
      try {
        await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(lastBackupKey, String(nowMs)).run();
      } catch (e) {
      }
    } catch (error) {
      console.error("Auto Backup Failed:", error);
    }
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    if (path === "/logo.png" || path === "/logo-awanpulsa.png" || path === "/favicon.ico") {
      try {
        const fsModule = require('fs');
        const pathModule = require('path');
        const isFavicon = path === "/favicon.ico";
        const targetFileName = isFavicon ? 'favicon.ico' : 'logo.png';
        let targetFilePath = pathModule.join(__dirname, targetFileName);
        if (!fsModule.existsSync(targetFilePath) && isFavicon) {
          targetFilePath = pathModule.join(__dirname, 'logo.png');
        }
        if (fsModule.existsSync(targetFilePath)) {
          const fileBuffer = fsModule.readFileSync(targetFilePath);
          return new Response(fileBuffer, {
            headers: {
              "Content-Type": isFavicon && targetFilePath.endsWith('.ico') ? "image/x-icon" : "image/png",
              "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0"
            }
          });
        }
      } catch (errLogo) {
        console.error('Gagal memuat logo/favicon:', errLogo.message);
      }
    }
    if (path === "/qris-manual.jpg" || path === "/qris-shopee.jpg" || path === "/qris-gopay.jpg" || path === "/outlet-awanjaya.jpg" || path === "/outlet.jpg") {
      try {
        const fsModule = require('fs');
        const pathModule = require('path');
        const fileName = path.replace('/', '');
        const actualFile = (fileName === 'outlet.jpg' || fileName === 'outlet-awanjaya.jpg') ? 'outlet-awanjaya.jpg' : fileName;
        const targetFile = pathModule.join(__dirname, actualFile);
        if (fsModule.existsSync(targetFile)) {
          const buffer = fsModule.readFileSync(targetFile);
          return new Response(buffer, {
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=86400"
            }
          });
        }
      } catch (e) {}
    }
    if (path === "/favicon.ico" || path === "/robots.txt" || path === "/sitemap.xml") {
      return new Response("Not Found", { status: 404 });
    }
    if (env && env.GOOGLE_CLIENT_ID) GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID;
    let appSettings = await getAppSettings(env);
    const cookieHeader = request.headers.get("Cookie") || "";
    const sessionMatch = cookieHeader.match(/session_id=([^;]+)/);
    let currentUser = null;
    let sessionId = sessionMatch ? sessionMatch[1] : null;
    if (sessionId && path !== "/webhook" && path !== "/webhook-violet" && path !== "/webhook-autogopay" && path !== "/autogopay-callback") {
      const session = await env.DB.prepare("SELECT email FROM sessions WHERE id = ? AND expires_at > datetime('now')").bind(sessionId).first();
      if (session) {
        const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(session.email).first();
        if (user) {
          if (user.is_blocked === 1 && !isSuperAdmin(user, env)) {
            currentUser = null;
          } else {
            currentUser = user;
            const unreadInboxRow = await env.DB.prepare("SELECT COUNT(*) as count FROM inbox WHERE LOWER(email) = LOWER(?) AND read = 0").bind(user.email).first();
            currentUser.inbox_unread_count = unreadInboxRow ? unreadInboxRow.count : 0;
            currentUser.inbox = [];
            currentUser.vpns = [];
            currentUser.unpaid_invoices = [];
          }
        }
      }
    }
    const isMaintenance = appSettings.maintenance_mode === true;
    const isUserAdmin = checkIsAdmin(currentUser, env);
    if (isMaintenance && !isUserAdmin) {
      if (path === "/api/auth" || path === "/api/logout" || path === "/webhook" || path === "/webhook-violet" || path === "/webhook-autogopay" || path === "/autogopay-callback") {
      } else if (path.startsWith("/api/")) {
        return jsonResponse({ success: false, message: "Sistem sedang dalam mode pemeliharaan (Maintenance)." }, 503);
      } else {
        const maintenanceHtml = `
                <!DOCTYPE html>
                <html lang="id">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Sistem Dalam Pemeliharaan - AwanPulsa</title>
                    <link rel="icon" type="image/png" href="${LOGO_URL}">
                    <script src="https://cdn.tailwindcss.com"><\/script>
                    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"><\/script>
                    <script src="https://accounts.google.com/gsi/client" async defer><\/script>
                    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
                    <style>
                        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
                        @keyframes blob { 0% { transform: translate(0px, 0px) scale(1); } 33% { transform: translate(30px, -50px) scale(1.1); } 66% { transform: translate(-20px, 20px) scale(0.9); } 100% { transform: translate(0px, 0px) scale(1); } }
                        .animate-blob { animation: blob 8s infinite ease-in-out; }
                        .animation-delay-2000 { animation-delay: 2s; }
                        .animation-delay-4000 { animation-delay: 4s; }
                        .grid-pattern {
                            background-image: radial-gradient(rgba(14, 165, 233, 0.15) 1px, transparent 1px);
                            background-size: 24px 24px;
                        }
                    </style>
                </head>
                <body class="bg-slate-50 text-slate-800 min-h-screen relative flex flex-col justify-between overflow-x-hidden selection:bg-sky-500 selection:text-white">
                    <!-- Ambient Lighting Glows -->
                    <div class="fixed top-0 left-1/4 w-[500px] h-[500px] bg-sky-200/40 rounded-full filter blur-[120px] animate-blob -z-10 pointer-events-none"></div>
                    <div class="fixed bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-200/30 rounded-full filter blur-[120px] animate-blob animation-delay-2000 -z-10 pointer-events-none"></div>
                    <div class="fixed top-1/3 right-1/3 w-[400px] h-[400px] bg-indigo-200/30 rounded-full filter blur-[120px] animate-blob animation-delay-4000 -z-10 pointer-events-none"></div>
                    <div class="fixed inset-0 grid-pattern -z-10 opacity-60 pointer-events-none"></div>

                    <!-- Corporate Header -->
                    <header class="w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-xs">
                        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 p-0.5 shadow-md shadow-sky-500/20">
                                    <img src="${LOGO_URL}" alt="AwanPulsa Logo" class="w-full h-full object-contain rounded-[10px] bg-white">
                                </div>
                                <div>
                                    <span class="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-sky-800 to-blue-900 block leading-tight">AwanPulsa</span>
                                    <span class="text-[10px] uppercase font-bold tracking-widest text-amber-600 block">✦ Awan Jaya Celluler ✦</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="relative flex h-2.5 w-2.5">
                                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                                </span>
                                <span class="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full tracking-wide inline-flex">
                                    MAINTENANCE IN PROGRESS
                                </span>
                            </div>
                        </div>
                    </header>

                    <!-- Main Section -->
                    <main class="flex-grow flex items-center justify-center px-4 py-10 sm:py-14">
                        <div class="max-w-4xl w-full mx-auto">
                            
                            <!-- Hero Statement -->
                            <div class="text-center mb-10">
                                <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold uppercase tracking-wider mb-5 shadow-xs">
                                    <svg class="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                    <span>Pemberitahuan Pemeliharaan Sistem Skala Penuh</span>
                                </div>
                                
                                <h1 class="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 leading-tight">
                                    Peningkatan & Optimalisasi <br class="hidden sm:inline">
                                    <span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700">Infrastruktur Jaringan</span>
                                </h1>
                                
                                <p class="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                                    Untuk menjamin stabilitas kecepatan bandwidth, keandalan routing proxy gateway, serta pembaruan standar keamanan enkripsi data, platform <b class="text-slate-900">AwanPulsa</b> saat ini sedang menjalani proses pemeliharaan infrastruktur rutin.
                                </p>
                                <div class="mt-4">
                                    <span class="text-xs sm:text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-medium shadow-xs">
                                        <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                        <span><b>Jaminan Keamanan:</b> Seluruh saldo akun, masa aktif VPN, dan riwayat transaksi aman 100% dan akan pulih otomatis.</span>
                                    </span>
                                </div>
                            </div>

                            <!-- 4 Telemetry Status Cards -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Node & Proxy</span>
                                        <span class="relative flex h-2.5 w-2.5">
                                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                                            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-500"></span>
                                        </span>
                                    </div>
                                    <div class="text-base font-bold text-slate-900 mb-1">Optimasi Node Jaringan</div>
                                    <p class="text-xs text-slate-500 leading-relaxed">Peningkatan kapasitas throughput dan redundansi failover server SG & ID.</p>
                                </div>

                                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Saldo & Akun</span>
                                        <span class="text-emerald-600 text-sm font-black">✔</span>
                                    </div>
                                    <div class="text-base font-bold text-slate-900 mb-1">100% Aman Terenkripsi</div>
                                    <p class="text-xs text-slate-500 leading-relaxed">Snapshot database terverifikasi penuh tanpa ada risiko data hilang.</p>
                                </div>

                                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gateway QRIS</span>
                                        <span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">STANDBY</span>
                                    </div>
                                    <div class="text-base font-bold text-slate-900 mb-1">Sistem Pembayaran</div>
                                    <p class="text-xs text-slate-500 leading-relaxed">Deteksi otomatis QRIS dinonaktifkan sementara selama pemeliharaan.</p>
                                </div>

                                <div class="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
                                    <div class="flex items-center justify-between mb-3">
                                        <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estimasi Waktu</span>
                                        <svg class="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    </div>
                                    <div class="text-base font-bold text-slate-900 mb-1">Segera Pulih Kembali</div>
                                    <p class="text-xs text-slate-500 leading-relaxed">Website otomatis dapat diakses kembali setelah audit selesai.</p>
                                </div>
                            </div>

                            <!-- Emergency Helpdesk & Administrator Portal Box -->
                            <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8 mb-8">
                                <div class="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
                                    <div>
                                        <h3 class="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
                                            <span>📞</span> Layanan Bantuan Darurat
                                        </h3>
                                        <p class="text-xs sm:text-sm text-slate-500">Butuh informasi penting terkait akun atau transaksi berjalan? Hubungi tim kami:</p>
                                    </div>
                                    <div class="flex flex-wrap gap-2.5 shrink-0">
                                        <a href="https://wa.me/628979527685" target="_blank" class="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs">
                                            <span>WhatsApp CS</span>
                                        </a>
                                        <a href="https://t.me/pejuanggto" target="_blank" class="bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-xs">
                                            <span>Telegram CS</span>
                                        </a>
                                        <button onclick="window.location.reload()" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-md cursor-pointer">
                                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                                            <span>Periksa Status Website</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Dedicated Administrator Authentication Portal -->
                                <div class="mt-6 pt-2">
                                    <div class="max-w-md mx-auto text-center">
                                        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider mb-3">
                                            <svg class="w-3.5 h-3.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                            <span>Gerbang Khusus Administrator</span>
                                        </div>
                                        <p class="text-xs text-slate-500 mb-5 leading-relaxed">Area terbatas untuk administrator pengelola platform. Pengguna biasa <b>tidak diizinkan login</b> selama mode maintenance aktif.</p>

                                        ${currentUser ? `
                                            <div class="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-center">
                                                <p class="text-amber-800 font-bold text-sm mb-1">Akses Pengguna Ditangguhkan</p>
                                                <p class="text-slate-600 text-xs mb-4">Anda saat ini masuk sebagai:<br><strong class="text-slate-900 font-mono text-sm block mt-1">${currentUser.email}</strong><br><span class="text-slate-500 text-[11px]">(Akun ini bukan Administrator)</span></p>
                                                <button onclick="logout()" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-3 px-6 rounded-xl transition w-full shadow-md cursor-pointer">Keluar Akun (Logout)</button>
                                            </div>
                                        ` : `
                                            <div class="flex flex-col items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                                                <div id="g_id_onload" data-client_id="${GOOGLE_CLIENT_ID}" data-callback="handleCredentialResponse" data-auto_prompt="false"></div>
                                                <div class="g_id_signin shadow-xs rounded" data-type="standard" data-size="large" data-theme="outline" data-text="sign_in_with" data-shape="rectangular" data-logo_alignment="center"></div>
                                            </div>
                                        `}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </main>

                    <!-- Corporate Footer -->
                    <footer class="w-full border-t border-slate-200/80 bg-white/60 py-6 text-center text-xs text-slate-400">
                        <p>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} AwanPulsa Infrastructure. Seluruh hak cipta dilindungi undang-undang.</p>
                    </footer>

                    <script>
                        async function handleCredentialResponse(response) {
                            Swal.fire({
                                title: 'Verifikasi Hak Akses...',
                                text: 'Memeriksa otorisasi administrator ke server...',
                                allowOutsideClick: false,
                                didOpen: () => { Swal.showLoading(); }
                            });
                            try {
                                const res = await fetch('/api/auth', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ credential: response.credential })
                                });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                    Swal.fire({
                                        title: 'Autentikasi Berhasil! 🎉',
                                        text: 'Selamat datang, Administrator. Mengalihkan ke Panel Kontrol...',
                                        icon: 'success',
                                        timer: 1500,
                                        showConfirmButton: false
                                    }).then(() => {
                                        window.location.href = '/admin';
                                    });
                                } else {
                                    Swal.fire({
                                        title: 'Akses Ditolak (403)',
                                        text: data.message || 'Akun Google Anda bukan akun Administrator. Selama masa pemeliharaan, pengguna biasa tidak diizinkan login.',
                                        icon: 'error',
                                        confirmButtonColor: '#0284c7',
                                        confirmButtonText: 'Tutup'
                                    });
                                }
                            } catch(e) {
                                Swal.fire('Error', 'Gagal memproses autentikasi server.', 'error');
                            }
                        }
                        async function logout() {
                            await fetch('/api/logout', { method: 'POST' });
                            window.location.reload();
                        }
                    <\/script>
                </body>
                </html>
                `;
        return new Response(maintenanceHtml, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
      }
    }
    const tsParticlesConfig = `
            <canvas id="particleCanvas" class="fixed inset-0 pointer-events-none" style="z-index: 0;"></canvas>
            <script>
                document.addEventListener("DOMContentLoaded", function() {
                    const canvas = document.getElementById("particleCanvas");
                    if (!canvas) return;
                    const ctx = canvas.getContext("2d");
                    
                    let particles = [];
                    let waves = [];
                    let mouse = { x: null, y: null, active: false };
                    
                    const isMobile = window.innerWidth < 768;
                    const maxParticles = isMobile ? 35 : 85;
                    const connectionDistance = 125;
                    const magneticRadius = 220;
                    
                    function resizeCanvas() {
                        canvas.width = window.innerWidth;
                        canvas.height = window.innerHeight;
                    }
                    window.addEventListener("resize", resizeCanvas);
                    resizeCanvas();
                    
                    class Particle {
                        constructor() {
                            this.x = Math.random() * canvas.width;
                            this.y = Math.random() * canvas.height;
                            this.baseSize = Math.random() * 2.5 + 2; // Size 2 to 4.5
                            this.size = this.baseSize;
                            this.baseVx = (Math.random() - 0.5) * 0.6;
                            this.baseVy = (Math.random() - 0.5) * 0.6;
                            this.vx = this.baseVx;
                            this.vy = this.baseVy;
                        }
                        
                        update() {
                            // Magnetic Pull Logic
                            if (mouse.active && mouse.x !== null && mouse.y !== null) {
                                const dx = mouse.x - this.x;
                                const dy = mouse.y - this.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                
                                if (dist < magneticRadius) {
                                    const force = (magneticRadius - dist) / magneticRadius;
                                    // Smoothly pull towards mouse
                                    this.vx += (dx / dist) * force * 0.28;
                                    this.vy += (dy / dist) * force * 0.28;
                                    // Dynamically grow in size
                                    this.size = this.baseSize + force * 6.5;
                                } else {
                                    this.size = this.size + (this.baseSize - this.size) * 0.08;
                                }
                            } else {
                                this.size = this.size + (this.baseSize - this.size) * 0.08;
                            }
                            
                            // Drift back to normal velocity
                            this.vx += (this.baseVx - this.vx) * 0.06;
                            this.vy += (this.baseVy - this.vy) * 0.06;
                            
                            // Move particle
                            this.x += this.vx;
                            this.y += this.vy;
                            
                            // Handle boundary collision (bounce back nicely)
                            if (this.x < 0 || this.x > canvas.width) {
                                this.baseVx = -this.baseVx;
                                this.vx = -this.vx;
                            }
                            if (this.y < 0 || this.y > canvas.height) {
                                this.baseVy = -this.baseVy;
                                this.vy = -this.vy;
                            }
                        }
                        
                        draw() {
                            // 1. Draw outer soft glow
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.size * 2.8, 0, Math.PI * 2);
                            const glow = ctx.createRadialGradient(
                                this.x, this.y, 0,
                                this.x, this.y, this.size * 2.8
                            );
                            glow.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
                            glow.addColorStop(0.3, 'rgba(6, 182, 212, 0.2)');
                            glow.addColorStop(1, 'rgba(2, 132, 199, 0)');
                            ctx.fillStyle = glow;
                            ctx.fill();
                            
                            // 2. Draw solid inner core
                            ctx.beginPath();
                            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                            ctx.fillStyle = "rgba(2, 132, 199, 0.95)";
                            ctx.fill();
                        }
                    }
                    
                    function initParticles() {
                        particles = [];
                        for (let i = 0; i < maxParticles; i++) {
                            particles.push(new Particle());
                        }
                    }
                    initParticles();
                    
                    // Track Mouse / Touch Events
                    function setMousePos(e) {
                        const x = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
                        const y = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
                        if (x !== null && y !== null) {
                            mouse.x = x;
                            mouse.y = y;
                            mouse.active = true;
                        }
                    }
                    
                    window.addEventListener("mousemove", setMousePos);
                    window.addEventListener("mouseenter", () => { mouse.active = true; });
                    window.addEventListener("mouseleave", () => { mouse.active = false; });
                    
                    window.addEventListener("touchstart", (e) => {
                        mouse.active = true;
                        setMousePos(e);
                    }, { passive: true });
                    window.addEventListener("touchmove", (e) => {
                        setMousePos(e);
                    }, { passive: true });
                    window.addEventListener("touchend", () => {
                        mouse.active = false;
                    });
                    
                    // Click Blast / Wave Trigger
                    window.addEventListener("click", function(e) {
                        waves.push({
                            x: e.clientX,
                            y: e.clientY,
                            radius: 0,
                            maxRadius: isMobile ? 120 : 190,
                            speed: isMobile ? 6 : 9,
                            force: isMobile ? 12 : 22,
                            opacity: 1
                        });
                    });
                    
                    function drawLines() {
                        for (let i = 0; i < particles.length; i++) {
                            for (let j = i + 1; j < particles.length; j++) {
                                const dx = particles[i].x - particles[j].x;
                                const dy = particles[i].y - particles[j].y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                
                                if (dist < connectionDistance) {
                                    const alpha = (1 - dist / connectionDistance) * 0.28;
                                    ctx.strokeStyle = "rgba(14, 165, 233, " + alpha + ")";
                                    ctx.lineWidth = 1;
                                    ctx.beginPath();
                                    ctx.moveTo(particles[i].x, particles[i].y);
                                    ctx.lineTo(particles[j].x, particles[j].y);
                                    ctx.stroke();
                                }
                            }
                        }
                    }
                    
                    function animate() {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        
                        // Update & draw waves
                        for (let w = waves.length - 1; w >= 0; w--) {
                            const wave = waves[w];
                            wave.radius += wave.speed;
                            wave.opacity = 1 - (wave.radius / wave.maxRadius);
                            
                            if (wave.radius >= wave.maxRadius) {
                                waves.splice(w, 1);
                                continue;
                            }
                            
                            // Draw the Ripple Shockwave
                            ctx.beginPath();
                            ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
                            ctx.strokeStyle = "rgba(6, 182, 212, " + (wave.opacity * 0.45) + ")";
                            ctx.lineWidth = 2.5;
                            ctx.shadowBlur = 12;
                            ctx.shadowColor = "rgba(14, 165, 233, 0.4)";
                            ctx.stroke();
                            ctx.shadowBlur = 0; // reset
                            
                            // Calculate Push/Blast Force for all particles
                            for (let i = 0; i < particles.length; i++) {
                                const p = particles[i];
                                const dx = p.x - wave.x;
                                const dy = p.y - wave.y;
                                const dist = Math.sqrt(dx * dx + dy * dy);
                                
                                if (Math.abs(dist - wave.radius) < 25) {
                                    const angle = Math.atan2(dy, dx);
                                    const pushForce = wave.force * (1 - wave.radius / wave.maxRadius);
                                    p.vx += Math.cos(angle) * pushForce;
                                    p.vy += Math.sin(angle) * pushForce;
                                }
                            }
                        }
                        
                        // Update & draw particles
                        for (let i = 0; i < particles.length; i++) {
                            particles[i].update();
                            particles[i].draw();
                        }
                        
                        drawLines();
                        requestAnimationFrame(animate);
                    }
                    animate();
                });
            <\/script>
        `;
    const renderLayout = /* @__PURE__ */ __name222((title, content) => {
      const metaTags = `
                <meta name="title" content="${title} - AwanPulsa">
                <meta name="description" content="AwanPulsa - Platform Cloud Agen Pulsa All Operator, Paket Data Internet, Token Listrik PLN, dan Top Up Saldo E-Wallet Otomatis 24 Jam Termurah.">
                <meta name="keywords" content="AwanPulsa, AwanPulsa, Pulsa Murah, Agen Pulsa, Beli Pulsa, Paket Data, Kuota Internet, Token PLN, Top Up E-Wallet, PPOB 24 Jam">
                <meta name="theme-color" content="#f8fafc">
                <meta property="og:type" content="website">
                <meta property="og:url" content="/">
                <meta property="og:title" content="${title} | AwanPulsa">
                <meta property="og:description" content="AwanPulsa - Platform Cloud Agen Pulsa All Operator, Paket Data Internet, Token Listrik PLN, dan Top Up Saldo E-Wallet Otomatis 24 Jam Termurah.">
                <meta property="og:image" content="${LOGO_URL}">
                <meta property="og:site_name" content="AwanPulsa">
                <meta property="twitter:card" content="summary_large_image">
                <meta property="twitter:url" content="/">
                <meta property="twitter:title" content="${title} | AwanPulsa">
                <meta property="twitter:description" content="AwanPulsa - Platform Cloud Agen Pulsa All Operator, Paket Data Internet, Token Listrik PLN, dan Top Up Saldo E-Wallet Otomatis 24 Jam Termurah.">
                <meta property="twitter:image" content="${LOGO_URL}">`;
      if (currentUser) {
        const unreadCount = currentUser.inbox_unread_count || 0;
        const badgeHtml = unreadCount > 0 ? `<span class="bg-sky-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto animate-pulse shadow-md shadow-sky-600/40">${unreadCount}</span>` : "";
        return `<!DOCTYPE html>
                <html lang="id">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <title>${title} - AwanPulsa</title>
                    ${metaTags}
                    <link rel="icon" type="image/x-icon" href="/favicon.ico">
                    <link rel="icon" type="image/png" href="${LOGO_URL}">
                    <link rel="apple-touch-icon" href="${LOGO_URL}">
                    <script src="https://cdn.tailwindcss.com"><\/script>
                    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"><\/script>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
                    <style>
                        html { scroll-behavior: smooth; } 
                        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px;} 
                        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 4px;} 
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; } 
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                        
                        /* Fix SweetAlert2 Select Options visibility in Light Theme */
                        .swal2-select {
                            background-color: #ffffff !important;
                            color: #0f172a !important;
                            border: 1px solid #cbd5e1 !important;
                        }
                        .swal2-select option {
                            background-color: #ffffff !important;
                            color: #0f172a !important;
                        }
                        
                        .swal2-dark-custom {
                            background: #0f172a !important;
                            color: #f8fafc !important;
                            border: 1px solid #334155 !important;
                            border-radius: 1.5rem !important;
                        }
                        .swal2-dark-custom .swal2-title {
                            color: #ffffff !important;
                        }
                        .swal2-dark-custom .swal2-html-container {
                            color: #cbd5e1 !important;
                        }

                        /* Pulse Hamburger Animation */
                        @keyframes pulseHamburger {
                            0%, 100% { color: #0f172a; }
                            50% { color: #0284c7; }
                        }
                        .pulse-hamburger {
                            animation: pulseHamburger 2s infinite ease-in-out;
                        }
                    </style>
                    <script>
                        // Globalisasi Konfigurasi SwalDark (Tema Cerah Bersih & Kontras)
                        const swalDark = Swal.mixin({ background: '#ffffff', color: '#0f172a', confirmButtonColor: '#0284c7', cancelButtonColor: '#64748b', customClass: { popup: 'border border-slate-200 rounded-2xl shadow-2xl' } });
                        
                        // GLOBALISASI ESCAPE HTML AGAR BISA DIPAKAI DI SEMUA MENU (TIKET, ADMIN, DLL)
                        function escapeHtmlClient(str) {
                            if (!str) return '';
                            return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
                        }
                    <\/script>
                </head>
                <body class="bg-slate-50 text-slate-800 flex flex-col md:flex-row min-h-screen overflow-x-hidden font-sans relative">
                    <!-- Global Ambient Light Accents for User Dashboard -->
                    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                        <div class="absolute -top-40 -left-40 w-96 h-96 bg-sky-100/70 rounded-full blur-[128px]"></div>
                        <div class="absolute top-1/3 -right-40 w-96 h-96 bg-cyan-100/50 rounded-full blur-[128px]"></div>
                        <div class="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-100/60 rounded-full blur-[128px]"></div>
                    </div>

                    ${tsParticlesConfig}
                    <div id="sidebarOverlay" class="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 hidden md:hidden" onclick="toggleSidebar()"></div>
                    
                    <!-- Fullscreen Loading Overlay -->
                    <div id="loadingOverlay" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center hidden">
                        <div class="relative flex items-center justify-center mb-6">
                            <!-- Outer spinning ring -->
                            <div class="w-24 h-24 rounded-full border-4 border-sky-400/30 border-t-sky-500 animate-spin"></div>
                            <!-- Logo in the center -->
                            <img src="${LOGO_URL}" alt="Logo" class="w-14 h-14 rounded-full absolute object-contain shadow-lg shadow-sky-500/20 bg-white p-1">
                        </div>
                        <h3 class="text-xl font-black text-white tracking-wider uppercase mb-2 animate-pulse">proses create akun...wait...</h3>
                        <p class="text-sm text-slate-200 font-medium">Mohon tunggu, jangan tutup atau memuat ulang halaman ini...</p>
                    </div>
                    
                    <!-- FIX TUMPANG TINDIH NAVBAR PC: md:z-0 dan md:transform-none agar modal pop-up tampil di atas navbar -->
                    <aside id="sidebar" class="fixed md:static inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col z-40 md:z-0 transform -translate-x-full md:translate-x-0 md:transform-none transition-transform duration-300 ease-in-out shadow-lg md:shadow-none">
                        <div class="p-4 border-b border-slate-200 flex items-center justify-between bg-white relative z-10">
                            <a href="/" class="flex items-center gap-3">
                                <img src="${LOGO_URL}" alt="Logo" class="w-9 h-9 rounded-full border border-slate-200 object-contain shadow-xs bg-white">
                                <div>
                                    <span class="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-700 block leading-tight">AwanPulsa</span>
                                    <span class="text-[10px] font-bold text-amber-500 tracking-wider uppercase block">✦ Awan Jaya Celluler ✦</span>
                                </div>
                            </a>
                            <button onclick="toggleSidebar()" class="md:hidden text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100 transition">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        </div>
                        <div class="p-6 border-b border-slate-200 bg-slate-50/80 relative z-10">
                            <p class="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Total Saldo Aktif</p>
                            <p class="text-2xl font-bold text-emerald-600 font-mono tracking-tight">Rp ${currentUser.balance.toLocaleString("id-ID")}</p>
                        </div>
                        <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar relative z-10">
                            ${isAdmin(currentUser, env) ? `
                            <div class="pb-3 mb-3 border-b border-slate-200">
                                <a href="/admin" class="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition shadow-xs">
                                    <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    <span class="font-bold text-sm tracking-wide">Admin Panel</span>
                                </a>
                            </div>` : ""}
                            <a href="/" class="flex items-center gap-3 p-3 rounded-xl transition ${title === "Dashboard" ? "bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-200" : "text-slate-600 hover:bg-slate-100 hover:text-sky-600 font-medium"}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg><span class="text-sm">Dashboard Utama</span></a>
                            <a href="/pulsa-ppob" class="flex items-center gap-3 p-3 rounded-xl transition ${title === "Beli Pulsa & PPOB" || title === "Pulsa & PPOB" ? "bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-200" : "text-slate-600 hover:bg-slate-100 hover:text-sky-600 font-medium"}"><svg class="w-5 h-5 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg><span class="text-sm font-bold">Pulsa & PPOB</span></a>
                            <a href="/inbox" class="flex items-center gap-3 p-3 rounded-xl transition ${title === "Inbox" ? "bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-200" : "text-slate-600 hover:bg-slate-100 hover:text-sky-600 font-medium"}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg><span class="text-sm">Kotak Masuk</span>${badgeHtml}</a>
                            <a href="/mutasi" class="flex items-center gap-3 p-3 rounded-xl transition ${title === "Riwayat Saldo" ? "bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-200" : "text-slate-600 hover:bg-slate-100 hover:text-sky-600 font-medium"}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span class="text-sm">Riwayat Saldo</span></a>
                            <a href="/tiket" class="flex items-center gap-3 p-3 rounded-xl transition ${title === "Pusat Bantuan" ? "bg-sky-50 text-sky-700 font-bold shadow-xs border border-sky-200" : "text-slate-600 hover:bg-slate-100 hover:text-sky-600 font-medium"}"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg><span class="text-sm">Pusat Bantuan</span></a>
                        </nav>
                        <div class="p-4 border-t border-slate-200 bg-slate-50/70 relative z-10">
                            <a href="/profil" title="Buka Profil Saya" class="flex items-center gap-3 p-2 -mx-2 rounded-xl hover:bg-slate-100 transition cursor-pointer group">
                                ${currentUser.picture ? `
                                    <img src="${currentUser.picture}" alt="${escapeHTML(currentUser.name || '')}" class="w-10 h-10 rounded-full object-cover shadow-sm shrink-0 border border-slate-300 transition" referrerpolicy="no-referrer">
                                ` : `
                                    <div class="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white uppercase shadow-sm shrink-0 group-hover:bg-sky-500 transition">${(currentUser.name || "U").charAt(0)}</div>
                                `}
                                <div class="overflow-hidden flex-grow">
                                    <p class="text-sm font-bold text-slate-900 truncate group-hover:text-sky-600 transition">${escapeHTML(currentUser.name || 'Pelanggan')}</p>
                                    <p class="text-[10px] text-slate-500 truncate">${currentUser.email}</p>
                                </div>
                                <svg class="w-4 h-4 text-slate-400 group-hover:text-sky-600 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                            </a>
                        </div>
                    </aside>
                    <div class="flex-1 flex flex-col h-screen overflow-hidden bg-transparent relative z-10">
                        ${appSettings && appSettings.maintenance_mode === true ? `
                        <div class="bg-rose-600 text-white font-bold text-center py-2.5 px-4 text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 z-40 shrink-0">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            <span>\u{1F6A8} MODE MAINTENANCE AKTIF — Website terkunci untuk umum. Anda masuk sebagai Administrator.</span>
                            <a href="/admin" class="underline hover:text-rose-100 font-extrabold normal-case ml-2">Panel Kontrol &rarr;</a>
                        </div>
                        ` : ""}
                        <header class="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between z-30 shadow-xs">
                            <div class="flex items-center gap-3">
                                <button onclick="toggleSidebar()" class="pulse-hamburger p-1"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
                                <img src="${LOGO_URL}" alt="Logo" class="w-8 h-8 rounded-full border border-slate-200 object-contain bg-white">
                                <span class="text-lg font-bold text-slate-900 truncate">${title}</span>
                            </div>
                            ${unreadCount > 0 ? `<a href="/inbox" class="bg-sky-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md shadow-sky-600/30 animate-pulse">${unreadCount} Baru</a>` : ""}
                        </header>
                        <main class="flex-1 overflow-y-auto custom-scrollbar relative">
                            ${content}
                            <footer class="border-t border-slate-200 mt-12 py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                                <img src="${LOGO_URL}" alt="Logo" class="w-5 h-5 opacity-80 hover:opacity-100 transition object-contain">
                                <span>&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} AwanPulsa. Hak cipta dilindungi.</span>
                            </footer>
                        </main>
                    </div>

                    <!-- PANGGIL UI CHAT DARI AI.JS -->
                    ${renderAIChatUI(currentUser, appSettings)}

                    <script>
                        function toggleSidebar() { document.getElementById('sidebar').classList.toggle('-translate-x-full'); document.getElementById('sidebarOverlay').classList.toggle('hidden'); }
                        async function logout() { await fetch('/api/logout', { method: 'POST' }); window.location.href = '/'; }
                    <\/script>
                </body>
                </html>`;
      } else {
        return `<!DOCTYPE html>
                <html lang="id">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    <title>${title} - AwanPulsa</title>
                    ${metaTags}
                    <link rel="icon" type="image/x-icon" href="/favicon.ico">
                    <link rel="icon" type="image/png" href="${LOGO_URL}">
                    <link rel="apple-touch-icon" href="${LOGO_URL}">
                    <script src="https://cdn.tailwindcss.com"><\/script>
                    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"><\/script>
                    <script src="https://accounts.google.com/gsi/client" async defer><\/script>
                    <style>
                        .glass-panel { background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); border: 1px solid rgba(226, 232, 240, 0.8); } 
                        html { scroll-behavior: smooth; }
                        
                        /* Pulse Hamburger Animation */
                        @keyframes pulseHamburger {
                            0%, 100% { color: #0f172a; }
                            50% { color: #0284c7; }
                        }
                        .pulse-hamburger {
                            animation: pulseHamburger 2s infinite ease-in-out;
                        }
                    </style>
                    <script>
                        // Globalisasi Konfigurasi SwalDark untuk Layout Publik
                        const swalDark = Swal.mixin({ background: '#ffffff', color: '#0f172a', confirmButtonColor: '#0284c7', cancelButtonColor: '#64748b', customClass: { popup: 'border border-slate-200 rounded-2xl shadow-2xl' } });
                        
                        function escapeHtmlClient(str) {
                            if (!str) return '';
                            return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag]));
                        }
                    <\/script>
                </head>
                <body class="bg-slate-50 text-slate-800 flex flex-col min-h-screen overflow-x-hidden font-sans relative">
                    <!-- Fullscreen Loading Overlay for Public Layout -->
                    <div id="loadingOverlay" class="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center hidden">
                        <div class="relative flex items-center justify-center mb-6">
                            <div class="w-20 h-20 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
                            <div class="w-12 h-12 bg-white rounded-full flex items-center justify-center absolute shadow-lg">
                                <span class="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-sky-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                            </div>
                        </div>
                        <h3 class="text-xl font-black text-white tracking-wider uppercase mb-2 animate-pulse">Memproses Pesanan...</h3>
                        <p class="text-sm text-slate-200 font-medium">Mohon tunggu, jangan tutup atau memuat ulang halaman ini...</p>
                    </div>
                    <!-- Global Ambient Light Accents for Public Landing -->
                    <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                        <div class="absolute -top-40 -left-40 w-96 h-96 bg-sky-100/70 rounded-full blur-[128px]"></div>
                        <div class="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-100/50 rounded-full blur-[128px]"></div>
                        <div class="absolute -bottom-40 left-1/2 w-96 h-96 bg-blue-100/60 rounded-full blur-[128px]"></div>
                    </div>

                    ${tsParticlesConfig}
                    ${appSettings && appSettings.maintenance_mode === true ? `
                    <div class="bg-rose-600 text-white font-bold text-center py-2.5 px-4 text-xs tracking-wider uppercase shadow-md flex items-center justify-center gap-2 relative z-50">
                        <span class="relative flex h-2 w-2">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span>\u{1F6A8} MODE MAINTENANCE AKTIF — Website terkunci untuk umum.</span>
                        <a href="/admin" class="underline hover:text-rose-100 font-extrabold normal-case ml-2">Panel Admin &rarr;</a>
                    </div>
                    ` : ""}
                    <nav class="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-xs">
                        <div class="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                            <a href="/" class="flex items-center gap-3 group">
                                <img src="${LOGO_URL}" alt="Logo" class="w-10 h-10 md:w-11 md:h-11 rounded-full border border-slate-200 shadow-sm group-hover:border-sky-500 transition duration-300 object-contain bg-white">
                                <div>
                                    <span class="text-xl md:text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-sky-600 to-blue-700 block leading-tight">AwanPulsa</span>
                                    <span class="text-[10px] md:text-[11px] font-bold text-amber-500 uppercase tracking-widest block">✦ Awan Jaya Celluler ✦</span>
                                </div>
                            </a>
                            <div class="hidden md:flex gap-7 items-center text-sm font-semibold">
                                <a href="/" class="text-slate-600 hover:text-sky-600 transition">Beranda</a>
                                <a href="/pulsa-ppob" class="text-sky-600 font-bold hover:text-sky-700 transition flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Pulsa & PPOB</a>
                                <a href="/produk" class="text-slate-600 hover:text-sky-600 transition">Produk & Harga</a>
                                <a href="/syarat-ketentuan" class="text-slate-600 hover:text-sky-600 transition">Syarat & Ketentuan</a>
                                <a href="/login" class="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold py-2 px-5 rounded-xl text-xs transition shadow-md shadow-sky-600/20 flex items-center gap-2 active:scale-95">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                                    Masuk
                                </a>
                            </div>
                            <button onclick="document.getElementById('mobileNav').classList.toggle('hidden')" class="md:hidden pulse-hamburger p-1"><svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg></button>
                        </div>
                        <div id="mobileNav" class="hidden md:hidden bg-white border-t border-slate-200 absolute w-full left-0 top-[73px] shadow-2xl">
                            <div class="flex flex-col p-4 space-y-4">
                                <a href="/" class="text-slate-700 hover:text-sky-600 font-semibold text-lg border-b border-slate-100 pb-3 flex items-center gap-3">Beranda</a>
                                <a href="/pulsa-ppob" class="text-sky-600 font-bold text-lg border-b border-slate-100 pb-3 flex items-center gap-3">Pulsa & PPOB (Instan 24 Jam)</a>
                                <a href="/produk" class="text-slate-700 hover:text-sky-600 font-semibold text-lg border-b border-slate-100 pb-3 flex items-center gap-3">Produk & Harga</a>
                                <a href="/syarat-ketentuan" class="text-slate-700 hover:text-sky-600 font-semibold text-lg border-b border-slate-100 pb-3 flex items-center gap-3">Syarat & Ketentuan</a>
                                <a href="/login" class="bg-gradient-to-r from-sky-600 to-blue-600 text-white font-bold py-3 px-4 rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-md mt-2">
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                                    Masuk Akun
                                </a>
                            </div>
                        </div>
                    </nav>
                    <main class="flex-grow relative z-10">${content}</main>
                    <footer class="bg-slate-100 border-t border-slate-200 pt-12 pb-8 mt-16 relative z-10">
                        <div class="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div>
                                <div class="flex items-center gap-3 mb-4">
                                    <img src="${LOGO_URL}" alt="Logo" class="w-9 h-9 rounded-full border border-slate-200 object-contain bg-white">
                                    <div>
                                        <h3 class="text-xl font-bold text-sky-600 leading-tight">AwanPulsa</h3>
                                        <span class="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">✦ Awan Jaya Celluler ✦</span>
                                    </div>
                                </div>
                                <p class="text-slate-600 leading-relaxed text-sm">Pusat layanan Beli Pulsa All Operator, Paket Kuota Internet, Token Listrik PLN, dan Top Up Saldo E-Wallet otomatis 24 Jam dengan harga agen termurah dan transaksi instan.</p>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm">Tautan Cepat</h4>
                                <ul class="space-y-2 text-sm text-slate-600 font-medium">
                                    <li><a href="/" class="hover:text-sky-600 transition">Beranda / Dashboard</a></li>
                                    <li><a href="/pulsa-ppob" class="hover:text-sky-600 transition">Pulsa & PPOB</a></li>
                                    <li><a href="/produk" class="hover:text-sky-600 transition">Produk & Harga</a></li>
                                    <li><a href="/syarat-ketentuan" class="hover:text-sky-600 transition">Syarat & Ketentuan</a></li>
                                </ul>
                            </div>
                            <div>
                                <h4 class="font-bold text-slate-900 mb-4 uppercase tracking-wider text-sm">Layanan Pelanggan (CS) &amp; Lokasi</h4>
                                <p class="text-sm text-slate-600 mb-3">Kunjungi gerai fisik kami atau hubungi Customer Service resmi AwanPulsa:</p>
                                <ul class="space-y-3 text-sm text-slate-700 font-medium">
                                    <li><a href="https://maps.app.goo.gl/YvAs1xFY35gEohKc7?g_st=atm" target="_blank" rel="noopener noreferrer" class="flex items-center gap-3 hover:text-emerald-600 transition group"><div class="bg-white border border-slate-200 p-2 rounded-full group-hover:border-emerald-300 shadow-xs"><svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div><span>Lokasi Toko: Google Maps Awan Jaya Celluler</span></a></li>
                                    <li><a href="https://wa.me/628979527685" target="_blank" class="flex items-center gap-3 hover:text-emerald-600 transition group"><div class="bg-white border border-slate-200 p-2 rounded-full group-hover:border-emerald-300 shadow-xs"><svg class="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg></div><span>WhatsApp: 08979527685</span></a>
                                    </li>
                                    <li><a href="https://t.me/pejuanggto" target="_blank" class="flex items-center gap-3 hover:text-sky-600 transition group"><div class="bg-white border border-slate-200 p-2 rounded-full group-hover:border-sky-300 shadow-xs"><svg class="w-4 h-4 text-sky-600" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></div><span>Telegram: @pejuanggto</span></a></li>
                                    <li><a href="mailto:admin@awanpulsa.web.id" class="flex items-center gap-3 hover:text-rose-600 transition group"><div class="bg-white border border-slate-200 p-2 rounded-full group-hover:border-rose-300 shadow-xs"><svg class="w-4 h-4 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div><span>Email: admin@awanpulsa.web.id</span></a></li>
                                </ul>
                            </div>
                        </div>
                        <div class="text-center text-slate-500 mt-10 pt-6 border-t border-slate-200 text-xs">&copy; ${(/* @__PURE__ */ new Date()).getFullYear()} AwanPulsa. Hak cipta dilindungi.</div>
                    </footer>
                </body>
                </html>`;
      }
    }, "renderLayout");
    const renderIframePage = /* @__PURE__ */ __name222((title, frameUrl) => {
      const content = `
            <div class="w-full px-2 py-2 flex flex-col h-[90vh] min-h-[650px] relative z-10">
                <div class="flex-grow bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden relative group">
                    <div class="absolute inset-0 flex items-center justify-center z-0 bg-slate-50">
                        <div class="flex flex-col items-center gap-3">
                            <svg class="w-8 h-8 text-sky-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            <p class="text-slate-500 font-medium">Memuat halaman ${title}...</p>
                        </div>
                    </div>
                    <iframe src="${frameUrl}" class="w-full h-full border-0 relative z-10 bg-transparent rounded-3xl" title="${title}"></iframe>
                </div>
            </div>`;
      return renderLayout(title, content);
    }, "renderIframePage");
    if (path === "/tiket" && method === "GET") {
      if (!currentUser) return Response.redirect(url.origin + "/", 302);
      const ticketPage = parseInt(url.searchParams.get("page") || "1");
      const ticketLimit = 10;
      const ticketOffset = (ticketPage - 1) * ticketLimit;
      const totalTickets = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM tickets WHERE email = ?"
      ).bind(currentUser.email).first("count") || 0;
      const totalPages = Math.ceil(totalTickets / ticketLimit) || 1;
      const { results: tickets } = await env.DB.prepare(
        "SELECT * FROM tickets WHERE email = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?"
      ).bind(currentUser.email, ticketLimit, ticketOffset).all();
      let ticketListHtml = "";
      if (!tickets || tickets.length === 0) {
        ticketListHtml = `<div class="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm"><p class="text-slate-500 text-lg font-medium">Belum ada riwayat tiket bantuan.</p></div>`;
      } else {
        ticketListHtml = `
                <div class="space-y-4">
                    ${tickets.map((t) => {
          let statusBadge = "";
          if (t.status === "OPEN") statusBadge = '<span class="bg-sky-50 text-sky-700 border border-sky-200 text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider">Menunggu Admin</span>';
          else if (t.status === "PENDING") statusBadge = '<span class="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider">Menunggu Balasan Anda</span>';
          else statusBadge = '<span class="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2.5 py-1 rounded-lg uppercase font-bold tracking-wider">Selesai (Closed)</span>';
          return `
                        <div onclick="openTicketView('${t.id}')" class="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-sky-500/50 hover:shadow-md transition cursor-pointer">
                            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                                <h3 class="text-lg font-bold text-slate-900 leading-snug truncate">${escapeHTML(t.subject)}</h3>
                                <div class="shrink-0 flex items-center gap-3">
                                    <span class="text-xs font-mono text-slate-500">${t.id}</span>
                                    ${statusBadge}
                                </div>
                            </div>
                            <div class="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                <span>${t.category}</span> &bull; <span>Update: ${t.updated_at}</span>
                            </div>
                        </div>`;
        }).join("")}
                </div>
                
                <!-- Pagination Controls -->
                ${totalPages > 1 ? `
                <div class="mt-8 flex items-center justify-between gap-4 flex-wrap bg-white p-4 border border-slate-200 rounded-2xl shadow-sm relative z-10">
                    <a href="${ticketPage > 1 ? `/tiket?page=${ticketPage - 1}` : "#"}" class="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${ticketPage <= 1 ? "opacity-50 pointer-events-none" : ""}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Sebelum
                    </a>
                    <span class="text-xs text-slate-500 font-medium">Halaman ${ticketPage} dari ${totalPages} (Total ${totalTickets} Tiket)</span>
                    <a href="${ticketPage < totalPages ? `/tiket?page=${ticketPage + 1}` : "#"}" class="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${ticketPage >= totalPages ? "opacity-50 pointer-events-none" : ""}">
                        Berikut <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </a>
                </div>
                ` : ""}`;
      }
      const content = `
            <div class="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
                <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-slate-200 pb-5 gap-4">
                    <div>
                        <h1 class="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">Pusat Bantuan (Tiket)</h1>
                        <p class="text-slate-500 text-sm mt-2">Laporkan kendala teknis atau masalah layanan Anda di sini.</p>
                    </div>
                    <button onclick="openCreateTicketModal()" class="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center gap-2">
                        \u2795 Buat Tiket Baru
                    </button>
                </div>
                
                ${ticketListHtml}

                <!-- Modal Buat Tiket -->
                <div id="createTicketModal" class="fixed inset-0 bg-slate-900/60 hidden z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onclick="if(event.target === this) document.getElementById('createTicketModal').classList.add('hidden')">
                    <div class="bg-white p-6 md:p-8 rounded-3xl w-full max-w-lg border border-slate-200 shadow-2xl">
                        <div class="flex justify-between items-center mb-6 border-b border-slate-200 pb-4">
                            <h3 class="text-2xl font-bold text-slate-900 tracking-tight">Kirim Tiket Baru</h3>
                            <button onclick="closeCreateTicketModal()" class="text-slate-400 hover:text-slate-700 text-3xl leading-none">&times;</button>
                        </div>
                        <form id="createTicketForm" class="space-y-5">
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Kategori Kendala</label>
                                <select id="ticketCategory" required class="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none">
                                    <option value="Kendala Server VPN">Kendala Server VPN (Mati/Lemot)</option>
                                    <option value="Kendala Top Up Saldo">Kendala Top Up Saldo (QRIS)</option>
                                    <option value="Kendala Pulsa / PPOB">Kendala Pulsa / PPOB</option>
                                    <option value="Pertanyaan Lainnya">Pertanyaan Lainnya</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Judul Masalah</label>
                                <input type="text" id="ticketSubject" required placeholder="Singkat, padat, dan jelas..." class="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none">
                            </div>
                            <div>
                                <label class="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Detail Kendala</label>
                                <textarea id="ticketMessage" required rows="4" placeholder="Jelaskan secara rinci (sertakan nomor XL, ID transaksi, atau Username VPN jika ada)..." class="w-full bg-slate-50 border border-slate-300 rounded-xl p-4 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none custom-scrollbar resize-none"></textarea>
                            </div>
                            <button type="submit" id="btnSubmitTicket" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 rounded-xl shadow-lg transition text-lg mt-4">Kirim Tiket Sekarang</button>
                        </form>
                    </div>
                </div>

                <!-- Modal Lihat & Chat Tiket -->
                <div id="ticketViewModal" class="fixed inset-0 bg-slate-900/60 hidden z-[100] flex items-center justify-center p-4 backdrop-blur-md" onclick="if(event.target === this) document.getElementById('ticketViewModal').classList.add('hidden')">
                    <div class="bg-white rounded-3xl w-full max-w-3xl max-h-[95vh] flex flex-col border border-slate-200 shadow-2xl">
                        <div class="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-3xl">
                            <div>
                                <h3 class="text-xl font-bold text-slate-900 flex items-center gap-2" id="tvTitle">Judul</h3>
                                <p class="text-xs text-slate-500 mt-1 font-mono" id="tvSubtitle">#ID - Kategori</p>
                            </div>
                            <button onclick="closeTicketView()" class="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition">&times;</button>
                        </div>
                        
                        <div id="ticketChatContainer" class="flex-grow p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4 bg-slate-50">
                            <!-- Chat Bubbles -->
                        </div>
                        
                        <div class="p-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
                            <div id="ticketReplyArea" class="flex gap-3">
                                <input type="hidden" id="replyTicketId" value="">
                                <textarea id="replyTicketMessage" rows="2" placeholder="Ketik balasan Anda di sini..." class="w-full bg-white border border-slate-300 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-sky-500 outline-none custom-scrollbar text-sm resize-none"></textarea>
                                <div class="flex flex-col gap-2 shrink-0">
                                    <button onclick="sendTicketReply()" id="btnSendReply" class="bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2.5 rounded-xl transition shadow flex-grow">Kirim</button>
                                    <button onclick="closeTicket()" id="btnCloseTicket" class="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-5 py-2 rounded-xl transition border border-slate-300">Tandai Selesai</button>
                                </div>
                            </div>
                            <div id="ticketClosedArea" class="hidden text-center p-3">
                                <p class="text-sm text-slate-500 font-bold">\u{1F512} Tiket ini telah ditutup karena masalah sudah diselesaikan.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tombol Hubungi Admin via WhatsApp & Telegram -->
                <div class="mt-12 flex flex-wrap items-center justify-center gap-4">
                    <a href="https://wa.me/628979527685?text=Halo%20Admin%20AwanPulsa,%20saya%20butuh%20bantuan" target="_blank" class="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#25D366]/20 transition-all duration-300 transform hover:-translate-y-0.5">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/>
                        </svg>
                        Hubungi via WhatsApp (08979527685)
                    </a>
                    <a href="https://t.me/pejuanggto" target="_blank" class="inline-flex items-center gap-2.5 bg-[#229ED9] hover:bg-[#208ebe] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#229ED9]/20 transition-all duration-300 transform hover:-translate-y-0.5">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.37.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z"/>
                        </svg>
                        Hubungi via Telegram (@pejuanggto)
                    </a>
                </div>

            </div>
            
            <script>
                function openCreateTicketModal() { document.getElementById('createTicketModal').classList.remove('hidden'); }
                function closeCreateTicketModal() { document.getElementById('createTicketModal').classList.add('hidden'); }
                function closeTicketView() { document.getElementById('ticketViewModal').classList.add('hidden'); window.location.reload(); }

                document.getElementById('createTicketForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = document.getElementById('btnSubmitTicket');
                    btn.disabled = true; btn.innerText = 'Mengirim...';

                    const payload = {
                        category: document.getElementById('ticketCategory').value,
                        subject: document.getElementById('ticketSubject').value.trim(),
                        message: document.getElementById('ticketMessage').value.trim()
                    };

                    try {
                        const res = await fetch('/api/ticket/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                        const data = await res.json();
                        if (data.success) {
                            await swalDark.fire('Berhasil', 'Tiket keluhan berhasil dikirim. Admin akan segera merespons.', 'success');
                            window.location.reload();
                        } else { swalDark.fire('Gagal', data.message, 'error'); }
                    } catch(e) { swalDark.fire('Error', 'Kesalahan koneksi internet', 'error'); }
                    btn.disabled = false; btn.innerText = 'Kirim Tiket Sekarang';
                });

                async function openTicketView(id) {
                    document.getElementById('ticketViewModal').classList.remove('hidden');
                    const chatContainer = document.getElementById('ticketChatContainer');
                    chatContainer.innerHTML = '<p class="text-center text-sky-600 mt-10 animate-pulse">Memuat riwayat chat...</p>';
                    document.getElementById('replyTicketId').value = id;
                    document.getElementById('replyTicketMessage').value = '';

                    try {
                        const res = await fetch('/api/ticket/view', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId: id }) });
                        const data = await res.json();

                        if (data.success) {
                            const t = data.ticket;
                            document.getElementById('tvTitle').innerText = t.subject;
                            document.getElementById('tvSubtitle').innerText = t.id + ' | ' + t.category;

                            if (t.status === 'CLOSED') {
                                document.getElementById('ticketReplyArea').classList.add('hidden');
                                document.getElementById('ticketClosedArea').classList.remove('hidden');
                            } else {
                                document.getElementById('ticketReplyArea').classList.remove('hidden');
                                document.getElementById('ticketClosedArea').classList.add('hidden');
                            }

                            if (data.replies.length === 0) {
                                chatContainer.innerHTML = '<p class="text-center text-slate-500 mt-10">Belum ada percakapan.</p>';
                            } else {
                                chatContainer.innerHTML = data.replies.map(r => {
                                    const isUser = r.sender_type === 'user';
                                    const bubbleClass = isUser 
                                        ? 'bg-sky-600 text-white rounded-l-2xl rounded-tr-2xl ml-auto shadow-md' 
                                        : 'bg-white text-slate-800 rounded-r-2xl rounded-tl-2xl mr-auto border border-slate-200 shadow-sm';
                                    
                                    const senderLabel = isUser ? '' : '<span class="text-[10px] font-bold text-sky-600 mb-1 block uppercase">Admin Support</span>';

                                    // FIX SPASI CHAT (Hapus Enter pada Template Literal)
                                    return '<div class="max-w-[85%] md:max-w-[75%] ' + (isUser ? 'ml-auto' : 'mr-auto') + '">' + senderLabel + '<div class="px-4 py-2.5 text-sm whitespace-pre-wrap break-words leading-normal ' + bubbleClass + '">' + escapeHtmlClient(r.message) + '</div><span class="text-[10px] text-slate-400 block mt-1 ' + (isUser ? 'text-right font-mono' : 'text-left font-mono') + '">' + r.created_at + '</span></div>';
                                }).join('');
                                
                                setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 100);
                            }
                        } else {
                            chatContainer.innerHTML = '<p class="text-center text-sky-600 mt-10">Gagal memuat tiket.</p>';
                        }
                    } catch(e) { chatContainer.innerHTML = '<p class="text-center text-sky-600 mt-10">Error koneksi.</p>'; }
                }

                async function sendTicketReply() {
                    const ticketId = document.getElementById('replyTicketId').value;
                    const message = document.getElementById('replyTicketMessage').value.trim();
                    if (!message) return;

                    const btn = document.getElementById('btnSendReply');
                    btn.disabled = true; btn.innerText = 'Kirim...';

                    try {
                        const res = await fetch('/api/ticket/reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId, message }) });
                        if ((await res.json()).success) {
                            openTicketView(ticketId); // reload chat
                        }
                    } catch(e) { swalDark.fire('Error', 'Gagal membalas tiket.', 'error'); }
                    btn.disabled = false; btn.innerText = 'Kirim';
                }

                async function closeTicket() {
                    const ticketId = document.getElementById('replyTicketId').value;
                    const conf = await swalDark.fire({ title: 'Tandai Selesai?', text: 'Jika masalah Anda sudah teratasi, Anda dapat menutup tiket ini.', icon: 'info', showCancelButton: true });
                    if (!conf.isConfirmed) return;

                    const btn = document.getElementById('btnCloseTicket');
                    btn.disabled = true;

                    try {
                        const res = await fetch('/api/ticket/close', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticketId }) });
                        if ((await res.json()).success) {
                            openTicketView(ticketId);
                        }
                    } catch(e) { swalDark.fire('Error', 'Gagal menutup', 'error'); }
                    btn.disabled = false;
                }
            <\/script>
            `;
      return new Response(renderLayout("Pusat Bantuan", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/vpn-saya") {
      return Response.redirect(url.origin + "/pulsa-ppob", 301);
    }
    if ((path === "/login" || path === "/masuk") && method === "GET") {
      if (currentUser) {
        return Response.redirect("https://" + url.host + "/", 302);
      }
      const loginPageHtml = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Masuk - AwanPulsa</title>
    <link rel="icon" type="image/png" href="${LOGO_URL}">
    <script src="https://cdn.tailwindcss.com"><\/script>
    <script src="https://accounts.google.com/gsi/client" async defer><\/script>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif; }
        @keyframes floatLogo {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-8px) rotate(1deg); }
        }
        @keyframes glowPulse {
            0%, 100% { opacity: 0.5; transform: scale(0.98); }
            50% { opacity: 0.85; transform: scale(1.05); }
        }
        .float-logo { animation: floatLogo 6s ease-in-out infinite; }
        .glow-pulse { animation: glowPulse 4s ease-in-out infinite; }
    </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
    <div class="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-200/50 rounded-full blur-[140px] pointer-events-none glow-pulse"></div>
    <div class="absolute bottom-10 right-10 w-96 h-96 bg-blue-200/40 rounded-full blur-[120px] pointer-events-none"></div>
    <div class="absolute top-10 left-10 w-80 h-80 bg-cyan-200/40 rounded-full blur-[100px] pointer-events-none"></div>

    <div class="relative z-10 w-full max-w-md my-auto">
        <div class="mb-6 text-center">
            <a href="/" class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-sky-600 transition py-2 px-5 rounded-full bg-white/90 border border-slate-200 hover:border-sky-400 backdrop-blur-md shadow-sm">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                Kembali ke Beranda
            </a>
        </div>

        <div class="bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-11 shadow-[0_20px_50px_-15px_rgba(14,165,233,0.15)] text-center relative overflow-hidden">
            <div class="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent"></div>

            <div class="relative mx-auto mb-7 w-32 h-32 md:w-36 md:h-36 flex items-center justify-center float-logo">
                <div class="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 rounded-3xl blur-2xl opacity-40 glow-pulse"></div>
                <div class="relative w-28 h-28 md:w-32 md:h-32 rounded-3xl p-2 bg-white border-2 border-sky-400/60 shadow-[0_10px_35px_rgba(14,165,233,0.25)] flex items-center justify-center overflow-hidden">
                    <img src="${LOGO_URL}" alt="Logo AwanPulsa" class="w-full h-full object-contain">
                </div>
            </div>

            <h1 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Awan <span>Pulsa</span>
            </h1>
            <p class="text-xs font-bold tracking-widest text-amber-500 uppercase mt-1 mb-3">✦ Awan Jaya Celluler ✦</p>
            <p class="text-xs md:text-sm text-slate-600 leading-relaxed mb-8">Silakan masuk menggunakan akun Google Anda untuk mengakses dashboard, isi saldo otomatis, dan bertransaksi Pulsa & PPOB 24 Jam nonstop.</p>

            <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-7 flex flex-col items-center justify-center shadow-inner">
                <div id="g_id_onload" data-client_id="${GOOGLE_CLIENT_ID}" data-callback="handleCredentialResponse" data-auto_prompt="false"></div>
                <div class="g_id_signin flex justify-center w-full shadow-sm" data-type="standard" data-size="large" data-theme="outline" data-text="sign_in_with" data-shape="rectangular" data-logo_alignment="left"></div>
            </div>

            <div class="grid grid-cols-2 gap-2.5 pt-5 border-t border-slate-200 text-[11px] text-slate-600">
                <div class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium">
                    <svg class="w-4 h-4 text-sky-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    <span>OAuth Resmi Google</span>
                </div>
                <div class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200 font-medium">
                    <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <span>Sistem 100% Otomatis</span>
                </div>
            </div>
        </div>

        <p class="text-center text-xs text-slate-400 mt-6">&copy; ${new Date().getFullYear()} AwanPulsa. Hak cipta dilindungi.</p>
    </div>

    <script>
        async function handleCredentialResponse(response) {
            const btn = document.querySelector('.g_id_signin');
            if (btn) btn.style.opacity = '0.5';
            try {
                const res = await fetch('/api/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ credential: response.credential })
                });
                if (res.ok) {
                    window.location.href = '/';
                } else {
                    alert('Gagal login dengan Google.');
                    if (btn) btn.style.opacity = '1';
                }
            } catch(e) {
                alert('Terjadi kesalahan saat memproses login.');
                if (btn) btn.style.opacity = '1';
            }
        }
    <\/script>
</body>
</html>`;
      return new Response(loginPageHtml, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/" && method === "GET") {
      if (!currentUser) {
        const content = `
                <div class="relative overflow-hidden bg-gradient-to-b from-sky-50/60 via-white to-slate-50 pt-10 md:pt-14 pb-20 md:pb-28">
                    <!-- Ambient background patterns -->
                    <div class="absolute inset-0 z-0 pointer-events-none">
                        <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
                        <div class="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-sky-200/50 via-cyan-100/40 to-blue-200/40 rounded-full blur-[140px]"></div>
                    </div>

                    <!-- Hero Content -->
                    <div class="relative max-w-6xl mx-auto px-4 z-10 text-center">
                        <!-- Top Pill Badge -->
                        <div class="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-sky-100/80 border border-sky-300/60 text-sky-800 text-xs md:text-sm font-bold mb-6 shadow-xs backdrop-blur-md">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            <span>⚡ Transaksi Otomatis 24 Jam Nonstop &bull; Harga Grosir Agen Termurah</span>
                        </div>

                        <!-- Main Headline -->
                        <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight mb-5 leading-[1.15]">
                            Isi Pulsa, Kuota &amp; Token PLN<br>
                            <span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 via-sky-500 to-blue-700">Serba Cepat &amp; Otomatis</span>
                        </h1>

                        <!-- Subtitle -->
                        <p class="mt-3 max-w-2xl text-base md:text-lg text-slate-600 mx-auto mb-10 leading-relaxed font-medium">
                            Platform resmi distribusi pulsa all operator, paket internet, token listrik PLN, voucher game, dan top up saldo e-wallet dengan konfirmasi instan dalam hitungan detik dan harga agen termurah se-Indonesia.
                        </p>

                        <!-- Login / Member Portal Card -->
                        <div class="relative inline-block w-full max-w-md mx-auto z-20 text-center">
                            <div class="bg-white/95 backdrop-blur-md border border-slate-200/90 p-8 md:p-10 rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(14,165,233,0.18)] relative overflow-hidden">
                                <div class="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600"></div>

                                <!-- Elevated Logo -->
                                <div class="relative mx-auto mb-6 w-24 h-24 md:w-28 md:h-28 flex items-center justify-center">
                                    <div class="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-sky-500 to-blue-600 rounded-3xl blur-xl opacity-35 animate-pulse"></div>
                                    <div class="relative w-20 h-20 md:w-24 md:h-24 rounded-3xl p-1 bg-white border-2 border-sky-400/70 shadow-lg flex items-center justify-center overflow-hidden">
                                        <img src="${LOGO_URL}" alt="Logo AwanPulsa" class="w-full h-full object-contain">
                                    </div>
                                </div>

                                <h3 class="text-2xl font-black text-slate-900 tracking-tight mb-1">
                                    Masuk ke <span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-blue-600">AwanPulsa</span>
                                </h3>
                                <p class="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">✦ Awan Jaya Celluler ✦</p>
                                <p class="text-xs md:text-sm text-slate-500 mb-6 leading-relaxed">
                                    Masuk menggunakan akun Google dengan 1 klik untuk mulai mengisi saldo otomatis dan bertransaksi 24 jam nonstop.
                                </p>

                                <!-- Google Sign In -->
                                <div class="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-col items-center justify-center mb-6 shadow-inner">
                                    <div id="g_id_onload" data-client_id="${GOOGLE_CLIENT_ID}" data-callback="handleCredentialResponse" data-auto_prompt="false"></div>
                                    <div class="g_id_signin flex justify-center w-full shadow-xs" data-type="standard" data-size="large" data-theme="outline" data-text="sign_in_with" data-shape="rectangular" data-logo_alignment="left"></div>
                                </div>

                                <!-- Trust Badges -->
                                <div class="grid grid-cols-2 gap-2.5 pt-4 border-t border-slate-100 text-[11px] text-slate-600 font-semibold">
                                    <div class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                                        <svg class="w-4 h-4 text-sky-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                        <span>OAuth Resmi Google</span>
                                    </div>
                                    <div class="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                                        <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                        <span>Proses Instan Realtime</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Direct CTA to catalog -->
                            <div class="mt-6 text-center">
                                <a href="/pulsa-ppob" class="inline-flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-sky-800 bg-white hover:bg-slate-50 border border-sky-200 shadow-sm py-2.5 px-5 rounded-xl transition">
                                    <span>Lihat Katalog &amp; Daftar Harga Produk</span>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                </a>
                            </div>
                        </div>

                        <!-- Stats Bar -->
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto">
                            <div class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                                <p class="text-2xl md:text-3xl font-black text-sky-600 font-mono">5 - 15 dtk</p>
                                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Kecepatan Transaksi</p>
                            </div>
                            <div class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                                <p class="text-2xl md:text-3xl font-black text-blue-600 font-mono">1.000+</p>
                                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Pilihan Produk</p>
                            </div>
                            <div class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                                <p class="text-2xl md:text-3xl font-black text-emerald-600 font-mono">100%</p>
                                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Otomatis &amp; Aman</p>
                            </div>
                            <div class="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-200/80 shadow-xs">
                                <p class="text-2xl md:text-3xl font-black text-amber-600 font-mono">24 / 7</p>
                                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Layanan Nonstop</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Kategori Layanan Populer -->
                <div class="py-16 md:py-24 bg-white border-y border-slate-200 relative z-10">
                    <div class="max-w-6xl mx-auto px-4">
                        <div class="text-center mb-16">
                            <span class="text-xs font-extrabold text-sky-600 uppercase tracking-widest bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">Katalog Lengkap</span>
                            <h2 class="text-3xl md:text-4xl font-black text-slate-900 mt-3">Produk &amp; Layanan Unggulan</h2>
                            <p class="text-slate-500 text-sm md:text-base max-w-2xl mx-auto mt-2">Semua kebutuhan isi ulang pulsa, kuota paket data, dan tagihan rumah tangga Anda tersedia dalam satu genggaman.</p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <!-- 1. Pulsa All Operator -->
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200 hover:border-sky-500 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
                                <div>
                                    <div class="w-14 h-14 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                                    </div>
                                    <h3 class="text-lg font-bold text-slate-900 mb-2">Pulsa All Operator</h3>
                                    <p class="text-xs text-slate-600 leading-relaxed mb-4">Telkomsel, Indosat Ooredoo, XL Axiata, Axis, Tri, dan Smartfren dengan nominal mulai Rp 1.000 hingga Rp 1.000.000.</p>
                                </div>
                                <div class="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-sky-600">
                                    <span>Harga Grosir</span>
                                    <a href="/pulsa-ppob" class="hover:underline flex items-center gap-1">Pesan &rarr;</a>
                                </div>
                            </div>

                            <!-- 2. Paket Data & Kuota -->
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200 hover:border-blue-500 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
                                <div>
                                    <div class="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
                                    </div>
                                    <h3 class="text-lg font-bold text-slate-900 mb-2">Paket Kuota Data</h3>
                                    <p class="text-xs text-slate-600 leading-relaxed mb-4">Kuota harian, mingguan, bulanan, kuota reguler, dan kuota unlimited semua jaringan 4G/5G super hemat.</p>
                                </div>
                                <div class="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-blue-600">
                                    <span>Aktivasi Detik</span>
                                    <a href="/pulsa-ppob" class="hover:underline flex items-center gap-1">Pesan &rarr;</a>
                                </div>
                            </div>

                            <!-- 3. Token Listrik PLN -->
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200 hover:border-amber-500 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
                                <div>
                                    <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    </div>
                                    <h3 class="text-lg font-bold text-slate-900 mb-2">Token Listrik PLN</h3>
                                    <p class="text-xs text-slate-600 leading-relaxed mb-4">Isi token listrik prabayar 24 Jam kapan pun. Nomor token (SN 20 Digit) langsung keluar instan setelah pembayaran.</p>
                                </div>
                                <div class="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-amber-600">
                                    <span>SN Langsung Tampil</span>
                                    <a href="/pulsa-ppob" class="hover:underline flex items-center gap-1">Pesan &rarr;</a>
                                </div>
                            </div>

                            <!-- 4. E-Wallet & Game -->
                            <div class="bg-slate-50 p-6 rounded-3xl border border-slate-200 hover:border-emerald-500 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between">
                                <div>
                                    <div class="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                                        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                    </div>
                                    <h3 class="text-lg font-bold text-slate-900 mb-2">Top Up E-Wallet &amp; Game</h3>
                                    <p class="text-xs text-slate-600 leading-relaxed mb-4">DANA, GoPay, OVO, ShopeePay, LinkAja, Maxim Driver, serta diamond game Mobile Legends, Free Fire, dan lainnya.</p>
                                </div>
                                <div class="pt-4 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-emerald-600">
                                    <span>Proses Otomatis</span>
                                    <a href="/pulsa-ppob" class="hover:underline flex items-center gap-1">Pesan &rarr;</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Mengapa Memilih AwanPulsa? -->
                <div class="py-16 md:py-24 bg-slate-50 relative z-10">
                    <div class="max-w-6xl mx-auto px-4">
                        <div class="text-center mb-16">
                            <span class="text-xs font-extrabold text-sky-600 uppercase tracking-widest bg-sky-100 border border-sky-200 px-3 py-1 rounded-full">Keunggulan Layanan</span>
                            <h2 class="text-3xl md:text-4xl font-black text-slate-900 mt-3">Mengapa Memilih AwanPulsa?</h2>
                            <div class="w-20 h-1.5 bg-gradient-to-r from-sky-500 to-blue-600 mx-auto mt-4 rounded-full shadow-xs"></div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:-translate-y-1.5 hover:border-sky-500 hover:shadow-xl transition-all duration-300">
                                <div class="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-6 border border-sky-100">
                                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900 mb-3">Kecepatan Transaksi Realtime</h3>
                                <p class="text-slate-600 text-sm leading-relaxed">Seluruh proses transaksi ditangani oleh sistem H2H otomatis dengan respon cepat rata-rata 5-15 detik tanpa menunggu approval manual admin.</p>
                            </div>

                            <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:-translate-y-1.5 hover:border-blue-500 hover:shadow-xl transition-all duration-300">
                                <div class="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
                                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900 mb-3">Harga Grosir Distributor</h3>
                                <p class="text-slate-600 text-sm leading-relaxed">Dapatkan harga termurah langsung dari server pusat terverifikasi. Sangat menguntungkan untuk kebutuhan pribadi maupun dijual kembali bagi konter pulsa.</p>
                            </div>

                            <div class="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:-translate-y-1.5 hover:border-emerald-500 hover:shadow-xl transition-all duration-300">
                                <div class="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100">
                                    <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                                </div>
                                <h3 class="text-xl font-bold text-slate-900 mb-3">Deposit &amp; Top Up Manual</h3>
                                <p class="text-slate-600 text-sm leading-relaxed">Pengisian saldo mudah via transfer Bank BSI, DANA, dan ShopeePay. Cukup kirim bukti via WhatsApp dan saldo diinput langsung oleh Admin.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section: Gerai Fisik Resmi Awan Jaya Celluler -->
                <div class="py-16 md:py-20 bg-gradient-to-b from-slate-50 to-white relative z-10 border-b border-slate-200/80">
                    <div class="max-w-6xl mx-auto px-4">
                        <div class="bg-gradient-to-br from-slate-900 via-sky-950 to-blue-950 rounded-3xl md:rounded-[2.5rem] p-6 md:p-12 text-white shadow-2xl relative overflow-hidden border border-sky-900/50">
                            <!-- Background glow decor -->
                            <div class="absolute -top-24 -right-24 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none"></div>
                            <div class="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none"></div>

                            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
                                <!-- Foto Outlet Fisik -->
                                <div class="lg:col-span-6">
                                    <div class="relative group">
                                        <div class="absolute -inset-1 bg-gradient-to-r from-sky-400 to-blue-600 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                                        <div class="relative rounded-2xl md:rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-800">
                                            <img src="/outlet-awanjaya.jpg" alt="Gerai Fisik Awan Jaya Celluler" class="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500">
                                            <div class="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 md:p-6 text-white">
                                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/90 text-white backdrop-blur-sm mb-1.5">
                                                    <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> Gerai Fisik Resmi
                                                </span>
                                                <h4 class="text-lg md:text-xl font-black">Awan Jaya Celluler</h4>
                                                <p class="text-xs md:text-sm text-slate-200">Pusat Layanan Pulsa, Paket Data, QRIS &amp; PPOB Terpercaya</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Konten Deskripsi & Layanan -->
                                <div class="lg:col-span-6 space-y-5">
                                    <div>
                                        <span class="text-xs font-extrabold text-sky-400 uppercase tracking-widest bg-sky-950/80 border border-sky-400/30 px-3.5 py-1.5 rounded-full inline-block mb-3">
                                            🏢 Toko Fisik Terverifikasi
                                        </span>
                                        <h3 class="text-2xl md:text-4xl font-black tracking-tight leading-tight">
                                            Didukung Gerai Resmi <br class="hidden sm:inline"><span class="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-cyan-300">Awan Jaya Celluler</span>
                                        </h3>
                                        <p class="text-slate-300 text-sm md:text-base leading-relaxed mt-3">
                                            Layanan <strong>AwanPulsa</strong> hadir memberikan solusi transaksi digital terpercaya yang didukung langsung oleh toko fisik <strong>Awan Jaya Celluler</strong>. Transaksi cepat, aman, dan bergaransi penuh baik langsung di gerai maupun secara online 24 jam nonstop.
                                        </p>
                                    </div>

                                    <!-- Grid Layanan Toko -->
                                    <div class="grid grid-cols-2 gap-3 pt-1">
                                        <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <div class="text-sky-400 font-bold text-sm mb-1">⚡ Pulsa &amp; Paket Data</div>
                                            <div class="text-xs text-slate-400">Telkomsel, Indosat, XL, Axis, Tri, Smartfren</div>
                                        </div>
                                        <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <div class="text-emerald-400 font-bold text-sm mb-1">📲 Bayar Pakai QRIS</div>
                                            <div class="text-xs text-slate-400">Semua Bank, GoPay, ShopeePay, DANA, OVO</div>
                                        </div>
                                        <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <div class="text-amber-400 font-bold text-sm mb-1">💳 Transfer &amp; Kirim Uang</div>
                                            <div class="text-xs text-slate-400">BRI, Mandiri, BNI, BCA &amp; Virtual Account</div>
                                        </div>
                                        <div class="p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                            <div class="text-cyan-400 font-bold text-sm mb-1">💡 Token Listrik &amp; PPOB</div>
                                            <div class="text-xs text-slate-400">PLN, PDAM, BPJS, TV Kabel, WiFi &amp; Game</div>
                                        </div>
                                    </div>

                                    <div class="pt-2 flex flex-wrap gap-3 items-center">
                                        <a href="https://maps.app.goo.gl/YvAs1xFY35gEohKc7?g_st=atm" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold px-5 py-3.5 rounded-2xl shadow-lg shadow-emerald-600/25 transition-all duration-200 text-sm">
                                            <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                            <span>Buka di Google Maps</span>
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                        </a>
                                        <a href="https://wa.me/628979527685" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-5 py-3.5 rounded-2xl border border-white/20 transition text-sm">
                                            <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
                                            <span>CS: 0897-9527-685</span>
                                        </a>
                                        <a href="/pulsa-ppob" class="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold px-5 py-3.5 rounded-2xl shadow-lg shadow-sky-500/25 transition-all duration-200 text-sm">
                                            <span>Transaksi Online</span>
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 4: Alur Transaksi Mudah -->
                <div class="py-16 md:py-24 bg-white border-b border-slate-200 relative z-10">
                    <div class="max-w-6xl mx-auto px-4">
                        <div class="text-center mb-16">
                            <span class="text-xs font-extrabold text-sky-600 uppercase tracking-widest bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">Cara Transaksi</span>
                            <h2 class="text-3xl md:text-4xl font-black text-slate-900 mt-3">4 Langkah Mudah Bertransaksi</h2>
                            <p class="text-slate-500 text-sm max-w-xl mx-auto mt-2">Mulai isi ulang pulsa dan produk digital favorit Anda tanpa ribet.</p>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div class="text-center p-6 rounded-3xl bg-slate-50 border border-slate-200/80">
                                <div class="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center font-black text-lg mx-auto mb-4 shadow-md shadow-sky-600/20">1</div>
                                <h4 class="font-bold text-slate-900 text-base mb-2">Masuk Akun Google</h4>
                                <p class="text-xs text-slate-600 leading-relaxed">Cukup 1 klik masuk dengan Google tanpa registrasi berbelit atau perlu mengingat kata sandi.</p>
                            </div>

                            <div class="text-center p-6 rounded-3xl bg-slate-50 border border-slate-200/80">
                                <div class="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg mx-auto mb-4 shadow-md shadow-blue-600/20">2</div>
                                <h4 class="font-bold text-slate-900 text-base mb-2">Isi Saldo Transfer Manual</h4>
                                <p class="text-xs text-slate-600 leading-relaxed">Pilih nominal deposit, transfer via Bank BSI, DANA, atau ShopeePay, lalu konfirmasi via WhatsApp CS. Saldo langsung diisi Admin.</p>
                            </div>

                            <div class="text-center p-6 rounded-3xl bg-slate-50 border border-slate-200/80">
                                <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg mx-auto mb-4 shadow-md shadow-emerald-600/20">3</div>
                                <h4 class="font-bold text-slate-900 text-base mb-2">Pilih Produk &amp; Tujuan</h4>
                                <p class="text-xs text-slate-600 leading-relaxed">Buka menu Pulsa &amp; PPOB, tentukan produk, dan masukkan nomor HP atau ID pelanggan tujuan.</p>
                            </div>

                            <div class="text-center p-6 rounded-3xl bg-slate-50 border border-slate-200/80">
                                <div class="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-black text-lg mx-auto mb-4 shadow-md shadow-amber-600/20">4</div>
                                <h4 class="font-bold text-slate-900 text-base mb-2">Produk Masuk &amp; Sukses</h4>
                                <p class="text-xs text-slate-600 leading-relaxed">Pesanan selesai dalam hitungan detik. Nomor Serial Number (SN) tercatat rapi di riwayat saldo Anda.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Section 5: CTA Banner -->
                <div class="py-16 bg-slate-50 relative z-10">
                    <div class="max-w-5xl mx-auto px-4">
                        <div class="bg-gradient-to-r from-sky-600 via-sky-500 to-blue-700 rounded-[2.5rem] p-8 md:p-14 text-center text-white shadow-2xl relative overflow-hidden">
                            <div class="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                            <div class="relative z-10">
                                <span class="inline-block py-1 px-3.5 rounded-full bg-white/20 text-white text-xs font-bold mb-4 backdrop-blur-sm">⚡ Layanan Terpercaya 24 Jam Nonstop</span>
                                <h2 class="text-3xl md:text-4xl font-black mb-4 tracking-tight leading-tight">Siap Memulai Transaksi Anda Hari Ini?</h2>
                                <p class="text-sky-100 text-sm md:text-base max-w-xl mx-auto mb-8 leading-relaxed font-medium">Bergabunglah sekarang untuk menikmati kecepatan pengisian pulsa, kuota, dan token listrik dengan harga grosir termurah.</p>
                                <div class="flex flex-col sm:flex-row gap-3 justify-center items-center">
                                    <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="bg-white text-sky-700 hover:bg-sky-50 font-extrabold py-3.5 px-8 rounded-xl shadow-lg transition duration-200 text-sm flex items-center gap-2 cursor-pointer">
                                        <span>Masuk &amp; Mulai Transaksi</span>
                                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
                                    </button>
                                    <a href="/pulsa-ppob" class="bg-sky-700/60 hover:bg-sky-700 text-white font-bold py-3.5 px-6 rounded-xl border border-white/20 transition duration-200 text-sm">
                                        Lihat Daftar Harga
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    async function handleCredentialResponse(response) { const res = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: response.credential }) }); if(res.ok) { window.location.reload(); } else { swalDark.fire('Gagal', 'Gagal login dengan Google.', 'error'); } }
                <\/script>
                `;
        return new Response(renderLayout("Agen Pulsa & PPOB Termurah 24 Jam", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
      } else {
        const nowTs = Date.now();
        const { results: unpaidInvoices } = await env.DB.prepare("SELECT * FROM invoices WHERE email = ? AND status = 'UNPAID'").bind(currentUser.email).all();
        const validUnpaid = [];
        if (unpaidInvoices) {
          for (const inv of unpaidInvoices) {
            const invTs = parseWIBDateString(inv.date);
            if (invTs > 0 && nowTs - invTs > 36e5) continue;
            validUnpaid.push(inv);
          }
        }
        currentUser.unpaid_invoices = validUnpaid;
        const formatRupiah = /* @__PURE__ */ __name222((angka) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(angka), "formatRupiah");
        
        const isQrisManualOn = appSettings.payment_qris_manual !== false;
        const isShopeePayOn = appSettings.payment_shopeepay === true;
        const isGoPayOn = appSettings.payment_gopay === true;
        let paymentMethodHtml = "";
        const activeMethods = [];
        if (isQrisManualOn) {
          activeMethods.push({ value: "manual_bsi", label: `🏦 Transfer Bank BSI (${appSettings.manual_bsi_rek || '7293609009'} a.n ${appSettings.manual_bsi_name || 'sutroni soga'})` });
          activeMethods.push({ value: "manual_dana", label: `📱 Transfer DANA (${appSettings.manual_dana_rek || '08979527685'} a.n ${appSettings.manual_dana_name || 'sutroni soga'})` });
          activeMethods.push({ value: "manual_shopee", label: `🛍️ Transfer Shopee / ShopeePay (${appSettings.manual_shopee_rek || '08979527685'} a.n ${appSettings.manual_shopee_name || 'hasnasyukur'})` });
          activeMethods.push({ value: "manual", label: "💳 Transfer Manual (Semua Rekening)" });
        }
        if (isShopeePayOn) activeMethods.push({ value: "shopeepay", label: "QRIS Otomatis (autocek by system)" });
        if (isGoPayOn) activeMethods.push({ value: "gopay", label: "GoPay QRIS (AutoGoPay)" });
        if (activeMethods.length > 1) {
          let optionsHtml = activeMethods.map((m) => `<option value="${m.value}">${m.label}</option>`).join("");
          paymentMethodHtml = `<select id="topupMethod" class="w-full mb-3 bg-slate-50 border border-slate-300 rounded-xl p-3 text-sm outline-none text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 transition font-medium">${optionsHtml}</select>`;
        } else if (activeMethods.length === 1) {
          paymentMethodHtml = `<input type="hidden" id="topupMethod" value="${activeMethods[0].value}">`;
        } else {
          paymentMethodHtml = `<p class="text-amber-700 text-xs mb-3 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-200">Metode Top Up saat ini sedang dinonaktifkan Admin.</p>`;
        }
        const disableTopupButton = activeMethods.length === 0 ? 'disabled class="bg-slate-200 text-slate-400 font-bold py-3 px-6 rounded-xl cursor-not-allowed shrink-0"' : 'class="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shrink-0"';
        let pendingBannerHtml = "";
        if (currentUser.unpaid_invoices && currentUser.unpaid_invoices.length > 0) {
          pendingBannerHtml = `
                        <div class="bg-amber-50 border border-amber-300 p-4 md:p-5 rounded-3xl mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
                            <div class="flex items-center gap-4">
                                <div class="bg-amber-100 p-3 rounded-full shrink-0"><svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
                                <div><h4 class="text-amber-900 font-bold text-lg">Menunggu Pembayaran!</h4><p class="text-sm text-amber-700 mt-1">Anda memiliki <b>${currentUser.unpaid_invoices.length}</b> tagihan Top Up Saldo yang belum dibayar.</p></div>
                            </div>
                            <a href="/inbox" class="w-full md:w-auto text-center bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow whitespace-nowrap">Cek Inbox Pembayaran</a>
                        </div>
                    `;
        }
        const content = `
                <div class="max-w-4xl mx-auto px-4 md:px-8 py-8">
                    <div class="mb-8 hidden md:block text-center relative z-10">
                        <h1 class="text-3xl font-black text-slate-900 mb-2 tracking-tight">Dashboard Utama</h1>
                        <p class="text-slate-500 text-sm">Kelola saldo dompet, transaksi Pulsa & PPOB, dan layanan digital Anda.</p>
                    </div>

                    ${pendingBannerHtml}

                    <div class="space-y-8 relative z-10">
                        <div class="bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden">
                            <div class="absolute -right-6 -top-6 text-slate-100"><svg class="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.26-.87-2.32-1.92H7.9c.07 1.8 1.46 3.1 3 3.5V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z"/></svg></div>
                            <h2 class="text-slate-500 font-bold uppercase tracking-wider text-xs mb-2">Total Saldo Aktif</h2>
                            <p class="text-4xl md:text-5xl font-black text-emerald-600 mb-4 tracking-tighter">${formatRupiah(currentUser.balance)}</p>
                            
                            <!-- Tombol Toggle Form Top Up -->
                            <button id="btnToggleTopup" onclick="document.getElementById('topupFormContainer').classList.toggle('hidden'); this.querySelector('.toggle-icon').classList.toggle('rotate-45');" class="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2.5 px-5 rounded-xl transition shadow-lg flex items-center gap-2 text-sm relative z-20">
                                <svg class="w-4 h-4 transition-transform duration-300 toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                                <span>Top Up Saldo</span>
                            </button>

                            <div id="topupFormContainer" class="hidden mt-6 bg-slate-50 p-5 rounded-2xl border border-slate-200 relative z-20">
                                <h3 class="text-sm font-bold text-slate-800 mb-3">Isi Ulang Saldo</h3>
                                ${paymentMethodHtml}
                                <div class="flex flex-col sm:flex-row gap-3">
                                    <select id="topupAmount" class="flex-grow bg-white border border-slate-300 rounded-xl p-3 text-sm outline-none text-slate-900 focus:ring-2 focus:ring-sky-500 transition font-bold">
                                        <option value="10000">Rp 10.000</option>
                                        <option value="20000">Rp 20.000</option>
                                        <option value="25000">Rp 25.000</option>
                                        <option value="50000" selected>Rp 50.000</option>
                                        <option value="100000">Rp 100.000</option>
                                        <option value="200000">Rp 200.000</option>
                                        <option value="300000">Rp 300.000</option>
                                        <option value="500000">Rp 500.000</option>
                                        <option value="1000000">Rp 1.000.000</option>
                                    </select>
                                    <button onclick="topUp()" id="btnTopup" ${disableTopupButton}>Top Up</button>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-20">
                            <!-- Card 1: Pulsa & PPOB -->
                            <div class="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 flex flex-col justify-between hover:border-sky-500/50 hover:shadow-2xl transition duration-300 group">
                                <div>
                                    <div class="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                    </div>
                                    <h3 class="text-lg font-black text-slate-900 mb-2">Beli Pulsa & PPOB</h3>
                                    <p class="text-xs text-slate-500 leading-relaxed mb-4">Pulsa All Operator, Kuota Data Internet, Token Listrik PLN, Top Up E-Wallet, dan Voucher Game termurah 24 Jam nonstop.</p>
                                </div>
                                <a href="/pulsa-ppob" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-4 rounded-xl text-center text-sm transition shadow-md shadow-sky-600/20 flex items-center justify-center gap-2">
                                    <span>Buka Toko Pulsa & PPOB</span>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                </a>
                            </div>

                            <!-- Card 2: Kotak Masuk (Inbox) -->
                            <div class="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-2xl transition duration-300 group">
                                <div>
                                    <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path></svg>
                                    </div>
                                    <h3 class="text-lg font-black text-slate-900 mb-2">Kotak Masuk (Inbox)</h3>
                                    <p class="text-xs text-slate-500 leading-relaxed mb-4">Lihat pesan notifikasi transaksi, status pemesanan, pengumuman penting, dan tiket bantuan Anda.</p>
                                </div>
                                <a href="/inbox" class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-center text-sm transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2">
                                    <span>Buka Kotak Masuk</span>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                </a>
                            </div>

                            <!-- Card 3: Riwayat Mutasi Saldo -->
                            <div class="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-2xl transition duration-300 group">
                                <div>
                                    <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    </div>
                                    <h3 class="text-lg font-black text-slate-900 mb-2">Riwayat Saldo</h3>
                                    <p class="text-xs text-slate-500 leading-relaxed mb-4">Pantau setiap mutasi kredit dan debit, riwayat top up, serta pemakaian saldo akun Anda secara transparan.</p>
                                </div>
                                <a href="/mutasi" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-center text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2">
                                    <span>Lihat Riwayat Mutasi</span>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                </a>
                            </div>

                            <!-- Card 4: Kotak Masuk & Bantuan -->
                            <div class="bg-white p-6 rounded-3xl shadow-xl border border-slate-200 flex flex-col justify-between hover:border-teal-500/50 hover:shadow-2xl transition duration-300 group">
                                <div>
                                    <div class="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                                    </div>
                                    <h3 class="text-lg font-black text-slate-900 mb-2">Pusat Bantuan & CS</h3>
                                    <p class="text-xs text-slate-500 leading-relaxed mb-4">Butuh bantuan transaksi atau ada kendala? Buka tiket bantuan atau hubungi Customer Service kami langsung.</p>
                                </div>
                                <a href="/tiket" class="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl text-center text-sm transition shadow-md shadow-teal-600/20 flex items-center justify-center gap-2">
                                    <span>Buka Tiket Bantuan</span>
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <script>
                    function playSuccessChime() {
                        try {
                            const AudioCtx = window.AudioContext || window.webkitAudioContext;
                            if (!AudioCtx) return;
                            const ctx = new AudioCtx();
                            const now = ctx.currentTime;
                            const osc = ctx.createOscillator();
                            const gain = ctx.createGain();
                            osc.type = 'sine';
                            osc.frequency.setValueAtTime(523.25, now);
                            osc.frequency.setValueAtTime(659.25, now + 0.1);
                            osc.frequency.setValueAtTime(783.99, now + 0.2);
                            osc.frequency.setValueAtTime(1046.50, now + 0.3);
                            gain.gain.setValueAtTime(0.2, now);
                            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
                            osc.connect(gain);
                            gain.connect(ctx.destination);
                            osc.start(now);
                            osc.stop(now + 0.8);
                        } catch(e) {}
                    }

                    let paymentCheckInterval = null;
                    function showAutoGoPayModal(data) {
                        if (paymentCheckInterval) clearInterval(paymentCheckInterval);
                        const titleMethod = data.method === 'shopeepay' ? 'QRIS Otomatis' : 'GoPay';
                        let timeLeft = 15 * 60;
                        let isChecking = false;
                        const qrImgSrc = data.qr_url ? data.qr_url : ('https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=' + encodeURIComponent(data.qr_raw || ''));

                        swalDark.fire({
                            title: data.method === 'shopeepay' ? '💳 QRIS Otomatis (autocek by system)' : ('💳 Pembayaran ' + titleMethod + ' QRIS'),
                            html: '<div class="text-left text-sm text-slate-700 space-y-3">' +
                                  '  <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">' +
                                  '    <p class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Wajib Bayar</p>' +
                                  '    <p class="text-3xl font-black text-emerald-600 tracking-tight">Rp ' + Number(data.total_amount).toLocaleString('id-ID') + '</p>' +
                                  '    <span class="inline-block mt-1 text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-md font-mono">Termasuk kode unik Rp ' + data.unique_code + '</span>' +
                                  '  </div>' +
                                  '  <div class="text-center my-2 relative">' +
                                  '    <img src="' + qrImgSrc + '" alt="QRIS" class="mx-auto rounded-2xl w-60 h-60 object-contain shadow-md border border-slate-200 bg-white p-2">' +
                                  '    <p class="text-[11px] text-slate-500 mt-2">Scan QRIS dengan <b>BCA / DANA / OVO / ShopeePay / GoPay / Semua Bank & E-Wallet</b>.</p>' +
                                  '  </div>' +
                                  '  <div class="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-mono space-y-1.5">' +
                                  '    <div class="flex justify-between items-center"><span class="text-slate-500">No. Ref:</span><span class="text-slate-900 font-bold">' + data.ref + '</span></div>' +
                                  '    <div class="flex justify-between items-center"><span class="text-slate-500">Batas Waktu:</span><span id="qrisTimer" class="text-sky-600 font-bold">15:00</span></div>' +
                                  '    <div class="flex justify-between items-center pt-1 border-t border-slate-200"><span class="text-slate-500">Status Live:</span>' +
                                  '      <span id="qrisStatusBadge" class="inline-flex items-center gap-1.5 text-xs text-amber-600 font-bold">' +
                                  '        <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>' +
                                  '        Mendeteksi otomatis...' +
                                  '      </span>' +
                                  '    </div>' +
                                  '  </div>' +
                                  '</div>',
                            showCancelButton: true,
                            confirmButtonText: '🔍 Cek Status Sekarang',
                            cancelButtonText: 'Tutup',
                            confirmButtonColor: '#0ea5e9',
                            cancelButtonColor: '#64748b',
                            didOpen: () => {
                                const timerEl = document.getElementById('qrisTimer');
                                const badgeEl = document.getElementById('qrisStatusBadge');
                                
                                const checkPaymentFn = async (isManual = false) => {
                                    if (isChecking) return false;
                                    isChecking = true;
                                    try {
                                        const chkRes = await fetch('/api/check-payment', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ ref: data.ref, order_sn: data.order_sn, transaction_id: data.transaction_id })
                                        });
                                        const chkData = await chkRes.json();
                                        if (chkData.success && chkData.status === 'PAID') {
                                            if (paymentCheckInterval) clearInterval(paymentCheckInterval);
                                            playSuccessChime();
                                            if (badgeEl) {
                                                badgeEl.innerHTML = '<span class="inline-flex items-center gap-1 text-emerald-600 font-bold">✅ Berhasil Terbayar!</span>';
                                            }
                                            await swalDark.fire({
                                                title: 'Pembayaran Berhasil! 🎉',
                                                html: '<p class="text-sm text-slate-600">Dana sebesar <b class="text-emerald-600 text-xl font-bold">Rp ' + Number(data.total_amount).toLocaleString('id-ID') + '</b> telah otomatis ditambahkan ke saldo akun Anda!</p>',
                                                icon: 'success',
                                                confirmButtonText: 'Mantap!',
                                                confirmButtonColor: '#0ea5e9'
                                            });
                                            window.location.reload();
                                            return true;
                                        } else if (isManual) {
                                            swalDark.showValidationMessage(chkData.message || 'Pembayaran belum terdeteksi. Silakan tunggu sebentar setelah transfer.');
                                        }
                                    } catch(e){}
                                    isChecking = false;
                                    return false;
                                };

                                paymentCheckInterval = setInterval(async () => {
                                    timeLeft--;
                                    if (timerEl) {
                                        const m = Math.floor(timeLeft / 60);
                                        const s = timeLeft % 60;
                                        timerEl.innerText = (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s);
                                    }
                                    if (timeLeft <= 0) {
                                        clearInterval(paymentCheckInterval);
                                        if (badgeEl) { badgeEl.innerHTML = '<span class="text-red-500 font-bold">Kedaluwarsa</span>'; }
                                    } else if (timeLeft % 3 === 0) {
                                        await checkPaymentFn(false);
                                    }
                                }, 1000);
                            },
                            preConfirm: async () => {
                                swalDark.resetValidationMessage();
                                const isPaid = await fetch('/api/check-payment', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ ref: data.ref, order_sn: data.order_sn, transaction_id: data.transaction_id })
                                }).then(r => r.json()).catch(() => ({}));
                                
                                if (isPaid && isPaid.status === 'PAID') {
                                    if (paymentCheckInterval) clearInterval(paymentCheckInterval);
                                    playSuccessChime();
                                    await swalDark.fire('Pembayaran Berhasil! 🎉', 'Saldo akun Anda telah berhasil ditambahkan!', 'success');
                                    window.location.reload();
                                    return true;
                                }
                                swalDark.showValidationMessage(isPaid.message || ('Pembayaran belum terdeteksi. Pastikan Anda telah mentransfer nominal tepat Rp ' + Number(data.total_amount).toLocaleString('id-ID')));
                                return false;
                            },
                            willClose: () => {
                                if (paymentCheckInterval) clearInterval(paymentCheckInterval);
                            }
                        });
                    }

                    let topupLockInterval = null;
                    function checkTopupLock() {
                        try {
                            const lockUntil = parseInt(localStorage.getItem('wp_topup_lock_until') || '0', 10);
                            const now = Date.now();
                            const btn = document.getElementById('btnTopup');
                            if (!btn) return;

                            if (lockUntil > now) {
                                btn.disabled = true;
                                btn.classList.add('opacity-75', 'cursor-not-allowed');
                                const updateBtn = () => {
                                    const rem = Math.ceil((lockUntil - Date.now()) / 1000);
                                    if (rem <= 0) {
                                        if (topupLockInterval) clearInterval(topupLockInterval);
                                        topupLockInterval = null;
                                        localStorage.removeItem('wp_topup_lock_until');
                                        btn.disabled = false;
                                        btn.classList.remove('opacity-75', 'cursor-not-allowed');
                                        btn.innerText = 'Top Up';
                                    } else {
                                        btn.innerText = '⏳ Tunggu (' + rem + 's)';
                                    }
                                };
                                updateBtn();
                                if (topupLockInterval) clearInterval(topupLockInterval);
                                topupLockInterval = setInterval(updateBtn, 1000);
                            } else {
                                btn.disabled = false;
                                btn.classList.remove('opacity-75', 'cursor-not-allowed');
                                btn.innerText = 'Top Up';
                            }
                        } catch(e) {}
                    }

                    function lockTopupButton(sec = 30) {
                        try {
                            localStorage.setItem('wp_topup_lock_until', String(Date.now() + (sec * 1000)));
                            checkTopupLock();
                        } catch(e) {}
                    }

                    window.copyToClipboard = function(text, label) {
                        try {
                            if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(text);
                            } else {
                                const ta = document.createElement('textarea');
                                ta.value = text;
                                document.body.appendChild(ta);
                                ta.select();
                                document.execCommand('copy');
                                document.body.removeChild(ta);
                            }
                            const toast = Swal.mixin({
                                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
                            });
                            toast.fire({ icon: 'success', title: (label || 'Teks') + ' disalin!' });
                        } catch(e) {
                            alert(label + ' disalin: ' + text);
                        }
                    };

                    function showManualTopupModal(data) {
                        const totalFmt = Number(data.total_amount || data.amount).toLocaleString('id-ID');
                        const uniqueCode = data.unique_code || 0;
                        const ref = data.ref || '';
                        const sub = data.sub_method || 'manual';

                        const bsiRek = data.bsi_rek || '${appSettings.manual_bsi_rek || "7293609009"}';
                        const bsiName = data.bsi_name || '${appSettings.manual_bsi_name || "sutroni soga"}';
                        const danaRek = data.dana_rek || '${appSettings.manual_dana_rek || "08979527685"}';
                        const danaName = data.dana_name || '${appSettings.manual_dana_name || "sutroni soga"}';
                        const shopeeRek = data.shopee_rek || '${appSettings.manual_shopee_rek || "08979527685"}';
                        const shopeeName = data.shopee_name || '${appSettings.manual_shopee_name || "hasnasyukur"}';

                        const isBsiChosen = sub === 'manual_bsi';
                        const isDanaChosen = sub === 'manual_dana';
                        const isShopeeChosen = sub === 'manual_shopee';

                        let htmlContent = '<div class="text-left text-slate-800 text-sm">';
                        htmlContent += '<div class="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-4 text-center">';
                        htmlContent += '<span class="text-xs text-emerald-800 font-bold uppercase tracking-wider block mb-1">Total Wajib Ditransfer</span>';
                        htmlContent += '<div class="flex items-center justify-center gap-2 mt-1">';
                        htmlContent += '<span class="text-3xl font-black text-emerald-600 font-mono">Rp ' + totalFmt + '</span>';
                        htmlContent += '<button type="button" onclick="window.copyToClipboard(\'' + (data.total_amount || data.amount) + '\', \'Nominal Transfer\')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow cursor-pointer" title="Salin Nominal">📋 Salin</button>';
                        htmlContent += '</div>';
                        if (uniqueCode > 0) {
                            htmlContent += '<p class="text-[11px] text-emerald-700 mt-2">*Harap transfer <b>TEPAT SEJUMLAH INI</b> (termasuk kode unik <b>' + uniqueCode + '</b>) agar Admin dapat memverifikasi dana Anda dengan cepat.</p>';
                        }
                        htmlContent += '</div>';

                        htmlContent += '<p class="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Pilihan Rekening &amp; E-Wallet Tujuan:</p>';
                        htmlContent += '<div class="space-y-2.5 mb-4">';

                        // Bank BSI
                        htmlContent += '<div class="p-3.5 rounded-2xl border ' + (isBsiChosen ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300' : 'border-slate-200 bg-slate-50') + ' transition">';
                        htmlContent += '<div class="flex items-center justify-between">';
                        htmlContent += '<div class="flex items-center gap-2.5"><span class="text-2xl">🏦</span><div><h4 class="font-extrabold text-slate-900 text-sm">Bank BSI (Bank Syariah Indonesia)</h4><p class="text-xs text-slate-600">A/N: <b class="text-slate-900">' + bsiName + '</b></p></div></div>';
                        htmlContent += '<button type="button" onclick="window.copyToClipboard(\'' + bsiRek + '\', \'No. Rekening BSI\')" class="bg-white border border-slate-300 hover:border-sky-500 text-slate-800 font-mono font-bold text-xs py-1.5 px-3 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"><span>' + bsiRek + '</span> 📋</button>';
                        htmlContent += '</div></div>';

                        // DANA
                        htmlContent += '<div class="p-3.5 rounded-2xl border ' + (isDanaChosen ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300' : 'border-slate-200 bg-slate-50') + ' transition">';
                        htmlContent += '<div class="flex items-center justify-between">';
                        htmlContent += '<div class="flex items-center gap-2.5"><span class="text-2xl">📱</span><div><h4 class="font-extrabold text-slate-900 text-sm">DANA</h4><p class="text-xs text-slate-600">A/N: <b class="text-slate-900">' + danaName + '</b></p></div></div>';
                        htmlContent += '<button type="button" onclick="window.copyToClipboard(\'' + danaRek + '\', \'Nomor DANA\')" class="bg-white border border-slate-300 hover:border-sky-500 text-slate-800 font-mono font-bold text-xs py-1.5 px-3 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"><span>' + danaRek + '</span> 📋</button>';
                        htmlContent += '</div></div>';

                        // Shopee / ShopeePay
                        htmlContent += '<div class="p-3.5 rounded-2xl border ' + (isShopeeChosen ? 'border-sky-500 bg-sky-50/70 ring-2 ring-sky-300' : 'border-slate-200 bg-slate-50') + ' transition">';
                        htmlContent += '<div class="flex items-center justify-between">';
                        htmlContent += '<div class="flex items-center gap-2.5"><span class="text-2xl">🛍️</span><div><h4 class="font-extrabold text-slate-900 text-sm">Shopee / ShopeePay</h4><p class="text-xs text-slate-600">A/N: <b class="text-slate-900">' + shopeeName + '</b></p></div></div>';
                        htmlContent += '<button type="button" onclick="window.copyToClipboard(\'' + shopeeRek + '\', \'Nomor Shopee\')" class="bg-white border border-slate-300 hover:border-sky-500 text-slate-800 font-mono font-bold text-xs py-1.5 px-3 rounded-xl transition shadow-xs flex items-center gap-1 cursor-pointer"><span>' + shopeeRek + '</span> 📋</button>';
                        htmlContent += '</div></div>';

                        htmlContent += '</div>';

                        htmlContent += '<div class="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl mb-3 text-xs text-amber-900 leading-relaxed">';
                        htmlContent += '<b>📌 Langkah Konfirmasi:</b><br>';
                        htmlContent += '1. Transfer <b>Rp ' + totalFmt + '</b> ke salah satu rekening di atas.<br>';
                        htmlContent += '2. Simpan struk / tangkapan layar bukti transfer.<br>';
                        htmlContent += '3. Klik tombol hijau <b>"Konfirmasi via WhatsApp"</b> di bawah untuk kirim bukti ke CS. Saldo akan ditambahkan oleh Admin secara manual.';
                        htmlContent += '</div>';
                        htmlContent += '<div class="text-[11px] text-slate-400 font-mono text-center">Ref: ' + ref + '</div>';
                        htmlContent += '</div>';

                        swalDark.fire({
                            title: 'Transfer Manual Top Up',
                            html: htmlContent,
                            showCancelButton: true,
                            confirmButtonText: '💬 Konfirmasi via WhatsApp',
                            cancelButtonText: 'Tutup / Bayar Nanti',
                            confirmButtonColor: '#10b981',
                            cancelButtonColor: '#64748b',
                            focusConfirm: true
                        }).then((res) => {
                            if (res.isConfirmed) {
                                let destStr = 'Bank BSI / DANA / Shopee';
                                if (isBsiChosen) destStr = 'Bank BSI (' + bsiRek + ' a.n ' + bsiName + ')';
                                else if (isDanaChosen) destStr = 'DANA (' + danaRek + ' a.n ' + danaName + ')';
                                else if (isShopeeChosen) destStr = 'Shopee (' + shopeeRek + ' a.n ' + shopeeName + ')';

                                const waMsg = [
                                    'Halo Admin AwanPulsa, saya sudah melakukan transfer untuk Top Up Saldo:',
                                    '',
                                    '• No. Ref: ' + ref,
                                    '• Email Akun: ' + USER_EMAIL,
                                    '• Nominal Transfer: Rp ' + totalFmt,
                                    '• Rekening Tujuan: ' + destStr,
                                    '',
                                    'Berikut saya lampirkan bukti transfernya. Mohon bantuannya untuk menambahkan saldo akun saya secara manual. Terima kasih!'
                                ].join(String.fromCharCode(10));

                                window.open('https://wa.me/628979527685?text=' + encodeURIComponent(waMsg), '_blank');
                            }
                        });
                    }

                    async function topUp() {
                        try {
                            const lockUntil = parseInt(localStorage.getItem('wp_topup_lock_until') || '0', 10);
                            if (lockUntil > Date.now()) {
                                const rem = Math.ceil((lockUntil - Date.now()) / 1000);
                                return swalDark.fire('Proteksi Anti Double-Click', 'Tombol transaksi sedang dikunci selama ' + rem + ' detik untuk mencegah pembuatan tagihan ganda.', 'warning');
                            }
                        } catch(e) {}

                        const amount = document.getElementById('topupAmount').value;
                        const methodEl = document.getElementById('topupMethod');
                        const method = methodEl ? methodEl.value : 'none';

                        if (method === 'none') return swalDark.fire('Gagal', 'Pembayaran sedang dinonaktifkan Admin.', 'error');

                        const btn = document.getElementById('btnTopup');
                        btn.innerText = '⏳ Memproses...'; btn.disabled = true;
                        try {
                            const res = await fetch('/api/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: parseInt(amount), method: method }) });
                            const data = await res.json();
                            if (res.status === 429 && data.locked) {
                                lockTopupButton(data.remaining_seconds || 30);
                                swalDark.fire('Proteksi Anti Double-Click', data.message, 'warning');
                                btn.innerText = 'Top Up'; btn.disabled = false;
                                return;
                            }
                            if(data.success) {
                                lockTopupButton(15);
                                if (data.method === 'manual') {
                                    showManualTopupModal(data);
                                } else if (data.method === 'shopeepay' || data.method === 'gopay') {
                                    showAutoGoPayModal(data);
                                } else if (data.checkout_url) {
                                    window.location.href = data.checkout_url;
                                } else {
                                    swalDark.fire('Berhasil', 'Invoice top up berhasil dibuat.', 'success');
                                }
                            } else {
                                swalDark.fire('Gagal', data.message, 'error');
                            }
                        } catch(e) {
                            swalDark.fire('Error', 'Gagal menghubungi server.', 'error');
                        } finally {
                            btn.innerText = 'Top Up'; btn.disabled = false;
                        }
                    }

                    window.addEventListener('DOMContentLoaded', () => {
                        checkTopupLock();
                    });
                <\/script>
                `;
        return new Response(renderLayout("Dashboard", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
      }
    }
    if (path === "/produk" && method === "GET") {
      const content = `
            <div class="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16 relative z-10">
                <div class="text-center mb-12 md:mb-16">
                    <h1 class="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">Layanan & Produk Digital</h1>
                    <p class="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">AwanPulsa menghadirkan produk digital terlengkap, harga termurah, dan pemrosesan otomatis 24 jam nonstop.</p>
                    <div class="w-24 h-1.5 bg-sky-500 mx-auto mt-6 rounded-full shadow-md"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <!-- Card 1: Pulsa & Paket Data -->
                    <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col justify-between hover:-translate-y-1.5 transition-transform duration-300">
                        <div>
                            <div class="w-14 h-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mb-6">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            </div>
                            <h3 class="text-xl font-bold text-slate-900 mb-3">Pulsa & Paket Data</h3>
                            <p class="text-sm text-slate-600 leading-relaxed mb-6">Isi ulang pulsa reguler, pulsa transfer, dan paket kuota internet untuk seluruh operator Indonesia (Telkomsel, Indosat, XL, AXIS, Tri, Smartfren).</p>
                        </div>
                        <a href="/pulsa-ppob#pulsa" class="block w-full bg-sky-600 hover:bg-sky-500 text-white text-center font-bold py-3 px-4 rounded-xl text-sm transition shadow-md">Beli Pulsa & Data</a>
                    </div>

                    <!-- Card 2: Token Listrik PLN -->
                    <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col justify-between hover:-translate-y-1.5 transition-transform duration-300">
                        <div>
                            <div class="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                            </div>
                            <h3 class="text-xl font-bold text-slate-900 mb-3">Token Listrik PLN</h3>
                            <p class="text-sm text-slate-600 leading-relaxed mb-6">Beli token listrik prabayar PLN 24 jam nonstop. Kode token 20 digit diterbitkan seketika dan otomatis masuk ke Kotak Masuk (Inbox) Anda.</p>
                        </div>
                        <a href="/pulsa-ppob#pln" class="block w-full bg-amber-600 hover:bg-amber-500 text-white text-center font-bold py-3 px-4 rounded-xl text-sm transition shadow-md">Beli Token PLN</a>
                    </div>

                    <!-- Card 3: E-Wallet & Voucher Game -->
                    <div class="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 flex flex-col justify-between hover:-translate-y-1.5 transition-transform duration-300">
                        <div>
                            <div class="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6">
                                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            </div>
                            <h3 class="text-xl font-bold text-slate-900 mb-3">E-Wallet & Voucher Game</h3>
                            <p class="text-sm text-slate-600 leading-relaxed mb-6">Top up saldo DANA, GoPay, OVO, ShopeePay, LinkAja, Maxim Driver, serta voucher game populer Mobile Legends, Free Fire, dan lainnya.</p>
                        </div>
                        <a href="/pulsa-ppob#ewallet" class="block w-full bg-emerald-600 hover:bg-emerald-500 text-white text-center font-bold py-3 px-4 rounded-xl text-sm transition shadow-md">Top Up E-Wallet</a>
                    </div>
                </div>

                <div class="mt-12 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 rounded-3xl border border-sky-200 p-8 md:p-10 text-center">
                    <h2 class="text-2xl font-black text-slate-900 mb-2">Mulai Transaksi Pulsa & PPOB Sekarang</h2>
                    <p class="text-slate-600 text-sm max-w-xl mx-auto mb-6">Nikmati kemudahan isi pulsa, kuota internet, token listrik, dan top up e-wallet 24 jam dengan harga termurah dan proses serba otomatis.</p>
                    <a href="/pulsa-ppob" class="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-sky-600/20 transition">
                        <span>Beli Sekarang</span>
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </a>
                </div>
            </div>`;
      return new Response(renderLayout("Produk & Harga", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/paket-data") {
      return Response.redirect(url.origin + "/pulsa-ppob", 301);
    }
    if ((path === "/pulsa-ppob" || path === "/pulsa") && method === "GET") {
      const ppobContent = renderPPOBContent(currentUser, appSettings, env);
      return new Response(renderLayout("Beli Pulsa & PPOB", ppobContent), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/converter") {
      return Response.redirect(url.origin + "/pulsa-ppob", 301);
    }
    if (path === "/cekpulsa-otp" || path === "/api/cekkuota-html") {
      return Response.redirect(url.origin + "/pulsa-ppob", 301);
    }
    if ((path === "/admin" || path === "/admin/tokogorontalo" || path === "/admin/ppob") && method === "GET") {
      if (!currentUser || !isAdmin(currentUser, env)) return Response.redirect(url.origin + "/", 302);
      try {
        await env.DB.prepare("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0").run();
      } catch (e) {
      }
      try {
        await env.DB.prepare("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0").run();
      } catch (e) {
      }
      const adminContent = await renderAdminDashboard(env, currentUser, appSettings);
      let autoOpenScript = "";
      if (path === "/admin/tokogorontalo" || path === "/admin/ppob") {
        autoOpenScript = "<script>window.addEventListener('DOMContentLoaded', () => { if (typeof openTokoGorontaloModal === 'function') openTokoGorontaloModal(); });</script>";
      }
      return new Response(renderLayout("Admin Dashboard", adminContent + autoOpenScript), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/inbox" && method === "GET") {
      if (!currentUser) return Response.redirect(url.origin + "/", 302);

      // Auto-sinkronisasi transaksi PPOB (Shopee, Token PLN, Wifi ID, Pulsa) yang sukses tapi pesannya belum tercatat di inbox
      try {
        const rawDb = env.DB.rawDb || (require('./db.js').rawDb);
        if (rawDb && typeof syncMissingPPOBInbox === 'function') {
          syncMissingPPOBInbox(rawDb, currentUser.email);
        }
      } catch (eSync) {}

      // Auto-cleanup pesan pending yang fakturnya sudah PAID
      await env.DB.prepare("DELETE FROM inbox WHERE LOWER(email) = LOWER(?) AND (title LIKE '%[PENDING]%' OR title LIKE '%PENDING%') AND EXISTS (SELECT 1 FROM invoices WHERE LOWER(invoices.email) = LOWER(inbox.email) AND invoices.status = 'PAID' AND inbox.message LIKE '%' || invoices.ref || '%')").bind(currentUser.email).run().catch(() => {});
      await env.DB.prepare("UPDATE inbox SET read = 1 WHERE LOWER(email) = LOWER(?) AND read = 0").bind(currentUser.email).run();
      const inboxPage = parseInt(url.searchParams.get("page") || "1");
      const inboxLimit = 10;
      const inboxOffset = (inboxPage - 1) * inboxLimit;
      const totalInbox = await env.DB.prepare(
        "SELECT COUNT(*) as count FROM inbox WHERE LOWER(email) = LOWER(?)"
      ).bind(currentUser.email).first("count") || 0;
      const totalPages = Math.ceil(totalInbox / inboxLimit) || 1;
      const { results: inboxResults } = await env.DB.prepare(
        "SELECT * FROM inbox WHERE LOWER(email) = LOWER(?) ORDER BY id DESC LIMIT ? OFFSET ?"
      ).bind(currentUser.email, inboxLimit, inboxOffset).all();
      let inboxHtml = `<div class="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm relative z-10"><p class="text-slate-500 text-lg font-medium">Belum ada pesan di kotak masuk Anda.</p></div>`;
      let pendingRefs = [];
      if (inboxResults && inboxResults.length > 0) {
        inboxHtml = inboxResults.map((msg) => {
          let msgBody = msg.message;
          const refMatch = msgBody.match(/(AGP[A-Z0-9\-]+)/);
          if (msg.title.includes("[PENDING]") && refMatch) {
            pendingRefs.push(refMatch[1]);
            if (!msgBody.includes("checkInboxPayment")) {
              msgBody += `<div style="text-align: center; margin-top: 20px;"><button onclick="checkInboxPayment('${refMatch[1]}', true)" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-md inline-flex items-center gap-2 cursor-pointer hover:scale-105"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 🔍 Cek Status Pembayaran</button><div class="mt-2 text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-mono inline-flex items-center justify-center gap-1.5"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span> Deteksi live aktif di latar belakang...</div></div>`;
            }
          }
          return `<div class="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md mb-6 hover:border-sky-400 transition relative z-10"><div class="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 border-b border-slate-100 pb-4 gap-2"><h3 class="text-xl font-bold text-sky-800 leading-snug">${msg.title}</h3><span class="text-xs font-mono text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg shrink-0">${msg.date}</span></div><div class="text-slate-700 text-sm md:text-base leading-relaxed break-words">${msgBody}</div></div>`;
        }).join("");
        if (totalPages > 1) {
          inboxHtml += `
                    <div class="mt-8 flex items-center justify-between gap-4 flex-wrap bg-white p-4 border border-slate-200 rounded-2xl shadow-sm relative z-10">
                        <a href="${inboxPage > 1 ? `/inbox?page=${inboxPage - 1}` : "#"}" class="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${inboxPage <= 1 ? "opacity-50 pointer-events-none" : ""}">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg> Sebelum
                        </a>
                        <span class="text-xs text-slate-500 font-semibold">Halaman ${inboxPage} dari ${totalPages} (Total ${totalInbox} Pesan)</span>
                        <a href="${inboxPage < totalPages ? `/inbox?page=${inboxPage + 1}` : "#"}" class="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${inboxPage >= totalPages ? "opacity-50 pointer-events-none" : ""}">
                            Berikut <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                        </a>
                    </div>`;
        }
      }
      const content = `<div class="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10"><h1 class="text-3xl font-black text-slate-900 mb-8 tracking-tight">Kotak Masuk (Inbox)</h1>${inboxHtml}</div>
      <script>
      function playSuccessChime() {
          try {
              const AudioCtx = window.AudioContext || window.webkitAudioContext;
              if (!AudioCtx) return;
              const ctx = new AudioCtx();
              const now = ctx.currentTime;
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(523.25, now);
              osc.frequency.setValueAtTime(659.25, now + 0.1);
              osc.frequency.setValueAtTime(783.99, now + 0.2);
              osc.frequency.setValueAtTime(1046.50, now + 0.3);
              gain.gain.setValueAtTime(0.2, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(now);
              osc.stop(now + 0.8);
          } catch(e) {}
      }

      let isInboxChecking = false;
      async function checkInboxPayment(ref, isManual = false) {
          if (!ref || isInboxChecking) return;
          isInboxChecking = true;
          if (isManual) {
              swalDark.fire({
                  title: 'Memeriksa Pembayaran...',
                  text: 'Sedang mengecek status ke server & gateway...',
                  allowOutsideClick: false,
                  didOpen: () => { swalDark.showLoading(); }
              });
          }
          try {
              const res = await fetch('/api/check-payment', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ref: ref })
              });
              const data = await res.json();
              if (data.success && data.status === 'PAID') {
                  playSuccessChime();
                  await swalDark.fire({
                      title: 'Pembayaran Berhasil! 🎉',
                      text: 'Pembayaran terverifikasi! Saldo akun Anda telah ditambahkan dan tagihan ini telah lunas.',
                      icon: 'success',
                      confirmButtonText: 'OK',
                      confirmButtonColor: '#22c55e'
                  });
                  window.location.reload();
                  return;
              } else if (isManual) {
                  swalDark.fire('Belum Terdeteksi', data.message || 'Pembayaran belum terdeteksi. Pastikan Anda telah mentransfer tepat sejumlah tagihan.', 'info');
              }
          } catch(e) {
              if (isManual) swalDark.fire('Error', 'Gagal menghubungi server.', 'error');
          }
          isInboxChecking = false;
      }

      const pendingList = ${JSON.stringify(pendingRefs)};
      if (pendingList && pendingList.length > 0) {
          setInterval(async () => {
              for (const r of pendingList) {
                  await checkInboxPayment(r, false);
              }
          }, 3500);
      }
      <\/script>`;
      return new Response(renderLayout("Inbox", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/lisensi") {
      return Response.redirect(url.origin + "/pulsa-ppob", 301);
    }
    if (path === "/profil" && method === "GET") {
      if (!currentUser) return Response.redirect(url.origin + "/", 302);
      const content = `
            <div class="max-w-3xl mx-auto px-4 md:px-8 py-8 md:py-12 relative z-10">
                <h1 class="text-3xl font-black text-slate-900 mb-8 border-b border-slate-200 pb-4 tracking-tight">Profil Saya</h1>
                <div class="bg-white p-6 md:p-10 rounded-3xl border border-slate-200 shadow-xl">
                    <div class="flex flex-col items-center mb-8 border-b border-slate-100 pb-6">
                        ${currentUser.picture ? `
                            <img src="${currentUser.picture}" alt="${escapeHTML(currentUser.name || '')}" class="w-20 h-20 rounded-full object-cover shadow-md border-2 border-sky-500 mb-3" referrerpolicy="no-referrer">
                        ` : `
                            <div class="w-20 h-20 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white text-2xl uppercase shadow-md mb-3">${(currentUser.name || "U").charAt(0)}</div>
                        `}
                        <h2 class="text-lg font-bold text-slate-900">${escapeHTML(currentUser.name || 'Pengguna')}</h2>
                        <p class="text-xs text-slate-500 font-mono mt-1">${currentUser.email}</p>
                    </div>
                    <form id="profileForm" class="space-y-6">
                        <div><label class="block text-sm font-bold tracking-wide text-slate-600 mb-2 uppercase">Email Akun (Terkunci)</label><input type="email" value="${currentUser.email}" disabled class="w-full bg-slate-100 border border-slate-200 rounded-xl p-4 text-slate-500 cursor-not-allowed font-medium"></div>
                        <div><label class="block text-sm font-bold tracking-wide text-slate-600 mb-2 uppercase">Nama Lengkap</label><input type="text" id="profileName" value="${escapeHTML(currentUser.name || '')}" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition font-medium"></div>
                        <div><label class="block text-sm font-bold tracking-wide text-slate-600 mb-2 uppercase">Nomor WhatsApp / XL Tersimpan</label><input type="text" id="profilePhone" value="${currentUser.phone || ""}" placeholder="Contoh: 081234567890" class="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none transition font-medium"></div>
                        <div class="pt-4"><button type="submit" id="btnUpdateProfile" class="w-full bg-sky-600 hover:bg-sky-500 text-white font-black py-4 px-4 rounded-xl transition shadow-lg text-lg tracking-wide">Simpan Perubahan</button></div>
                    </form>
                    <div class="mt-8 pt-6 border-t border-slate-100">
                        <button onclick="logout()" type="button" class="w-full bg-red-50 hover:bg-red-500 text-red-600 hover:text-white border border-red-200 hover:border-red-500 font-bold py-4 rounded-xl transition shadow-sm text-lg tracking-wide flex items-center justify-center gap-2">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg> Keluar Akun
                        </button>
                    </div>
                </div>
            </div>
            <script>
                document.getElementById('profileForm').addEventListener('submit', async (e) => {
                    e.preventDefault(); const btn = document.getElementById('btnUpdateProfile'); const name = document.getElementById('profileName').value; const phone = document.getElementById('profilePhone').value; btn.innerText = 'Menyimpan...'; btn.disabled = true;
                    try { const res = await fetch('/api/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone }) }); if((await res.json()).success) { swalDark.fire('Berhasil', 'Profil berhasil diperbarui!', 'success').then(() => window.location.reload()); } else { swalDark.fire('Gagal', 'Gagal menyimpan profil.', 'error'); btn.disabled = false; } } catch(err) { swalDark.fire('Error', 'Terjadi kesalahan.', 'error'); btn.disabled = false; }
                });
            <\/script>
            `;
      return new Response(renderLayout("Profil Saya", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/syarat-ketentuan" && method === "GET") {
      const content = `<div class="max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-16 relative z-10">
        <div class="text-center md:text-left mb-10 border-b border-slate-200 pb-6">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-bold uppercase tracking-wider mb-3">
                <span>Kebijakan Layanan Resmi</span>
            </div>
            <h1 class="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Syarat & Ketentuan</h1>
            <p class="text-slate-500 text-sm md:text-base mt-2">Harap membaca syarat dan ketentuan berikut sebelum bertransaksi di platform AwanPulsa.</p>
        </div>

        <div class="space-y-8 text-slate-700 leading-relaxed bg-white p-6 sm:p-10 md:p-12 rounded-3xl border border-slate-200 shadow-xl text-base">
            
            <section>
                <h2 class="text-xl md:text-2xl font-bold text-slate-900 mb-3 flex items-center gap-3">
                    <div class="w-2 h-7 bg-sky-500 rounded-full"></div>
                    1. Ketentuan Umum
                </h2>
                <p class="text-slate-600 mb-3">
                    AwanPulsa adalah platform penyedia produk digital terpadu yang melayani pembelian Pulsa Reguler All Operator, Paket Kuota Data Internet, Token Listrik PLN Prabayar, Top Up Saldo E-Wallet, Voucher Game, dan Pembayaran Tagihan PPOB secara otomatis 24 Jam nonstop.
                </p>
                <p class="text-slate-600">
                    Dengan mendaftar, mengakses, atau bertransaksi di AwanPulsa, Anda menyatakan telah membaca, memahami, dan menyetujui seluruh Syarat & Ketentuan yang berlaku.
                </p>
            </section>

            <section>
                <h2 class="text-xl md:text-2xl font-bold text-slate-900 mb-3 flex items-center gap-3">
                    <div class="w-2 h-7 bg-sky-500 rounded-full"></div>
                    2. Transaksi & Ketepatan Data
                </h2>
                <ul class="list-disc list-inside space-y-2 text-slate-600">
                    <li>Pengguna bertanggung jawab penuh atas kebenaran nomor handphone, nomor meter/ID Pelanggan PLN, nomor akun E-Wallet, atau nomor tujuan lainnya yang diinput saat melakukan pembelian.</li>
                    <li>Seluruh pesanan diproses secara otomatis oleh sistem server gateway secara seketika (realtime). Waktu normal proses pengisian adalah 5 s.d 60 detik.</li>
                    <li>Jika terjadi gangguan teknis (cut-off atau maintenance) pada server pusat operator/biller, transaksi dapat mengalami penundaan (pending) dan akan diproses secara otomatis begitu jalur server pusat pulih.</li>
                </ul>
            </section>

            <section>
                <h2 class="text-xl md:text-2xl font-bold text-slate-900 mb-3 flex items-center gap-3">
                    <div class="w-2 h-7 bg-sky-500 rounded-full"></div>
                    3. Saldo Akun & Pengisian Saldo (Deposit)
                </h2>
                <ul class="list-disc list-inside space-y-2 text-slate-600">
                    <li>Pengisian saldo akun dapat dilakukan melalui metode <strong>QRIS Otomatis</strong> (GoPay, ShopeePay, OVO, DANA, BCA, dan seluruh bank) maupun <strong>QRIS Manual</strong>.</li>
                    <li>Pada pembayaran QRIS Otomatis, saldo akun Anda akan bertambah secara otomatis segera setelah transaksi berhasil divalidasi oleh Payment Gateway.</li>
                    <li>Pada transfer QRIS Manual, pengguna wajib mentransfer nominal tepat sesuai kode unik dan mengirimkan konfirmasi bukti transfer ke WhatsApp Layanan Pelanggan.</li>
                    <li>Saldo di dalam akun AwanPulsa tidak memiliki masa kedaluwarsa dan dapat digunakan sewaktu-waktu untuk seluruh produk digital.</li>
                </ul>
            </section>

            <section>
                <h2 class="text-xl md:text-2xl font-bold text-slate-900 mb-3 flex items-center gap-3">
                    <div class="w-2 h-7 bg-sky-500 rounded-full"></div>
                    4. Kebijakan Pembatalan & Pengembalian Dana (Refund)
                </h2>
                <ul class="list-disc list-inside space-y-2 text-slate-600">
                    <li>Transaksi yang telah berstatus <strong>Sukses</strong> (dengan Serial Number / SN resmi dari operator pusat) adalah bersifat <strong>final</strong> dan tidak dapat dibatalkan, ditarik kembali, atau ditukar dengan alasan apapun.</li>
                    <li>Apabila transaksi dinyatakan <strong>Gagal</strong> oleh sistem operator/biller, saldo akun Anda akan dikembalikan 100% secara otomatis ke saldo akun AwanPulsa Anda.</li>
                    <li>Saldo yang sudah didepositkan ke akun AwanPulsa tidak dapat dicairkan kembali (non-refundable) ke rekening bank/e-wallet pribadi, melainkan khusus digunakan untuk bertransaksi produk digital di platform ini.</li>
                </ul>
            </section>

            <section>
                <h2 class="text-xl md:text-2xl font-bold text-slate-900 mb-3 flex items-center gap-3">
                    <div class="w-2 h-7 bg-sky-500 rounded-full"></div>
                    5. Kebijakan Penggunaan Wajar & Keamanan
                </h2>
                <p class="text-slate-600 mb-2">
                    Pengguna <strong class="text-rose-600">DILARANG KERAS</strong> menggunakan layanan, sistem, ataupun celah teknis pada platform AwanPulsa untuk:
                </p>
                <ul class="list-disc list-inside space-y-1 text-slate-600">
                    <li>Aktivitas penipuan finansial, phishing, pencucian uang (money laundering), atau tindakan melanggar hukum di wilayah Republik Indonesia.</li>
                    <li>Eksploitasi bug sistem, carding, transaksi ilegal, maupun percobaan peretasan (hacking/DDoS).</li>
                </ul>
                <p class="text-slate-600 mt-2 text-sm">
                    Manajemen AwanPulsa berhak membekukan atau memblokir akun secara sepihak jika ditemukan indikasi kecurangan atau pelanggaran hukum yang merugikan sistem maupun pihak lain.
                </p>
            </section>

            <section class="bg-sky-50/70 p-6 rounded-2xl border border-sky-100">
                <h2 class="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <span>💬</span> Hubungi Layanan Pelanggan
                </h2>
                <p class="text-sm text-slate-600 mb-4">
                    Jika mengalami kendala transaksi, saldo belum masuk, atau pertanyaan seputar layanan kami, silakan hubungi Customer Service resmi AwanPulsa:
                </p>
                <div class="flex flex-wrap gap-3">
                    <a href="https://maps.app.goo.gl/YvAs1xFY35gEohKc7?g_st=atm" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-sm transition">
                        <span>📍 Lokasi Toko: Google Maps</span>
                    </a>
                    <a href="https://wa.me/628979527685" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition">
                        <span>WhatsApp: 08979527685</span>
                    </a>
                    <a href="https://t.me/pejuanggto" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm transition">
                        <span>Telegram: @pejuanggto</span>
                    </a>
                    <a href="mailto:admin@awanpulsa.web.id" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition">
                        <span>Email: admin@awanpulsa.web.id</span>
                    </a>
                </div>
            </section>

        </div>
    </div>`;
      return new Response(renderLayout("Syarat & Ketentuan", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/kontak" && method === "GET") {
      const content = `<div class="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-16 relative z-10"><h1 class="text-3xl md:text-5xl font-black text-slate-900 mb-6 text-center tracking-tight">Pusat Bantuan CS &amp; Lokasi</h1><p class="text-slate-500 text-center mb-12 text-lg font-medium">Kami siap membantu menyelesaikan kendala transaksi pulsa, paket data, token PLN, e-wallet, deposit saldo, serta layanan gerai fisik.</p><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><a href="https://maps.app.goo.gl/YvAs1xFY35gEohKc7?g_st=atm" target="_blank" rel="noopener noreferrer" class="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-emerald-500 hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)] transition-all text-center group"><div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div><h2 class="text-xl md:text-2xl font-black text-slate-900 mb-2">Lokasi Fisik Toko</h2><p class="text-emerald-600 font-bold text-sm">Awan Jaya Celluler</p><span class="inline-block mt-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-bold">Buka di Maps &rarr;</span></a><a href="https://wa.me/628979527685" target="_blank" class="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-emerald-500 hover:shadow-[0_10px_30px_rgba(16,185,129,0.15)] transition-all text-center group"><div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg></div><h2 class="text-xl md:text-2xl font-black text-slate-900 mb-2">WhatsApp CS</h2><p class="text-emerald-600 font-mono font-bold text-xl">08979527685</p></a><a href="https://t.me/pejuanggto" target="_blank" class="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-sky-500 hover:shadow-[0_10px_30px_rgba(14,165,233,0.15)] transition-all text-center group"><div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600 group-hover:scale-110 transition"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.892-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg></div><h2 class="text-xl md:text-2xl font-black text-slate-900 mb-2">Telegram CS</h2><p class="text-sky-600 font-mono font-bold text-xl">@pejuanggto</p></a><a href="mailto:admin@awanpulsa.web.id" class="bg-white p-8 rounded-[2rem] border border-slate-200 hover:border-purple-500 hover:shadow-[0_10px_30px_rgba(168,85,247,0.15)] transition-all text-center flex flex-col justify-center group"><div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition"><svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg></div><h2 class="text-xl md:text-2xl font-black text-slate-900 mb-2">Email</h2><p class="text-purple-600 font-mono font-bold text-base truncate">admin@awanpulsa.web.id</p></a></div></div>`;
      return new Response(renderLayout("Kontak CS", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/mutasi" && method === "GET") {
      if (!currentUser) return Response.redirect(url.origin + "/", 302);
      const content = renderMutasiPage(currentUser);
      return new Response(renderLayout("Riwayat Saldo", content), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
    }
    if (path === "/api/transactions" && method === "GET") {
      return await handleMutasiAPI(request, env, currentUser);
    }
    if (path === "/api/ticket/create" && method === "POST") {
      if (!currentUser) return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      try {
        const { category, subject, message } = await request.json();
        const ticketId = "TCK-" + Math.floor(1e4 + Math.random() * 9e4);
        const now = getWIBTime();
        await env.DB.prepare("INSERT INTO tickets (id, email, subject, category, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'OPEN', ?, ?)").bind(ticketId, currentUser.email, subject, category, now, now).run();
        await env.DB.prepare("INSERT INTO ticket_replies (ticket_id, sender_type, message, created_at) VALUES (?, 'user', ?, ?)").bind(ticketId, message, now).run();
        if (sendTelegramLog) await sendTelegramLog(`\u{1F3AB} TIKET BARU [${ticketId}]`, `User: ${currentUser.email}
Kategori: ${category}
Judul: ${subject}

Pesan:
${message}`, appSettings);
        return jsonResponse({ success: true, ticketId });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    if (path === "/api/ticket/view" && method === "POST") {
      if (!currentUser) return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      try {
        const { ticketId } = await request.json();
        const ticket = await env.DB.prepare("SELECT * FROM tickets WHERE id = ? AND email = ?").bind(ticketId, currentUser.email).first();
        if (!ticket) throw new Error("Tiket tidak ditemukan.");
        const { results: replies } = await env.DB.prepare("SELECT * FROM ticket_replies WHERE ticket_id = ? ORDER BY id ASC").bind(ticketId).all();
        return jsonResponse({ success: true, ticket, replies: replies || [] });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    if (path === "/api/ticket/reply" && method === "POST") {
      if (!currentUser) return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      try {
        const { ticketId, message } = await request.json();
        const ticket = await env.DB.prepare("SELECT * FROM tickets WHERE id = ? AND email = ?").bind(ticketId, currentUser.email).first();
        if (!ticket || ticket.status === "CLOSED") throw new Error("Tiket tidak valid atau sudah ditutup.");
        const now = getWIBTime();
        await env.DB.prepare("INSERT INTO ticket_replies (ticket_id, sender_type, message, created_at) VALUES (?, 'user', ?, ?)").bind(ticketId, message, now).run();
        await env.DB.prepare("UPDATE tickets SET status = 'OPEN', updated_at = ? WHERE id = ?").bind(now, ticketId).run();
        if (sendTelegramLog) await sendTelegramLog(`\u{1F4AC} BALASAN TIKET [${ticketId}]`, `User: ${currentUser.email}

Pesan:
${message}`, appSettings);
        return jsonResponse({ success: true });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    if (path === "/api/ticket/close" && method === "POST") {
      if (!currentUser) return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      try {
        const { ticketId } = await request.json();
        const ticket = await env.DB.prepare("SELECT * FROM tickets WHERE id = ? AND email = ?").bind(ticketId, currentUser.email).first();
        if (!ticket) throw new Error("Tiket tidak ditemukan.");
        const now = getWIBTime();
        await env.DB.prepare("UPDATE tickets SET status = 'CLOSED', updated_at = ? WHERE id = ?").bind(now, ticketId).run();
        return jsonResponse({ success: true });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    if (path === "/api/auth" && method === "POST") {
      try {
        const { credential } = await request.json();
        const payload = await (await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`)).json();
        if (payload.aud !== GOOGLE_CLIENT_ID) return jsonResponse({ success: false, message: "Invalid Client ID" }, 400);

        let isNewUser = false;
        let user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(payload.email).first();
        const isAdminUser = isAdmin(user || payload.email, env);
        if (appSettings.maintenance_mode === true && !isAdminUser) {
          return jsonResponse({
            success: false,
            message: "Akses Ditolak: Sistem sedang dalam pemeliharaan berkala (Maintenance Mode). Saat ini hanya Administrator yang dapat login ke sistem."
          }, 403);
        }
        if (!user) {
          isNewUser = true;
          const initialAdmin = isSuperAdmin(payload.email, env) ? 2 : 0;
          await env.DB.prepare("INSERT INTO users (email, name, phone, balance, picture, is_admin) VALUES (?, ?, '', 0, ?, ?)").bind(payload.email, payload.name, payload.picture, initialAdmin).run();
        } else {
          if (user.is_blocked === 1) {
            if (isAdminUser) {
              await env.DB.prepare("UPDATE users SET is_blocked = 0 WHERE email = ?").bind(payload.email).run();
            } else {
              return jsonResponse({ success: false, message: "Akun diblokir." }, 403);
            }
          }
          if (isSuperAdmin(payload.email, env)) {
            await env.DB.prepare("UPDATE users SET name = ?, picture = ?, is_admin = 2 WHERE email = ?").bind(payload.name, payload.picture, payload.email).run();
          } else {
            await env.DB.prepare("UPDATE users SET name = ?, picture = ? WHERE email = ?").bind(payload.name, payload.picture, payload.email).run();
          }
        }
        const newSessionId = crypto.randomUUID();
        await env.DB.prepare("INSERT INTO sessions (id, email, expires_at) VALUES (?, ?, datetime('now', '+7 days'))").bind(newSessionId, payload.email).run();
        await sendTelegramLog("\u{1F464} LOG LOGIN AKUN", `Email: ${payload.email}
Nama: ${payload.name}
Waktu: ${getWIBTime()}`, appSettings);
        if (isNewUser) {
          const welcomeSubject = "Selamat Datang di AwanPulsa!";
          const welcomeBody = `<p>Halo <b>${escapeHTML(payload.name)}</b>,</p>
                                         <p>Terima kasih telah bergabung! Akun Anda berhasil didaftarkan di platform <b>AwanPulsa</b>.</p>
                                         <p>Kami hadir memberikan solusi proxy dan VPN premium dengan kecepatan terbaik serta dukungan berbagai protokol jaringan canggih. Anda sekarang sudah memiliki akses penuh ke Dashboard untuk:</p>
                                         <ul>
                                            <li>Mengisi saldo secara otomatis via QRIS</li>
                                            <li>Membangun server VPN baru hanya dalam hitungan detik</li>
                                            <li>Melakukan pembelian Pulsa & PPOB</li>
                                         </ul>
                                         <p>Mulai pengalaman berinternet tanpa batas bersama kami hari ini.</p>
                                         <div style="text-align: center;"><a href="https://${url.hostname}/" class="btn">Masuk ke Dashboard Utama</a></div>`;
          ctx.waitUntil(sendEmailViaGAS(payload.email, welcomeSubject, buildEmailTemplate("Selamat Datang, " + escapeHTML(payload.name) + "!", welcomeBody), env));
        } else {
          const loginSubject = "Notifikasi Login Baru pada Akun Anda";
          const loginBody = `<p>Halo <b>${escapeHTML(payload.name)}</b>,</p>
                                       <p>Sistem kami mendeteksi aktivitas login yang baru saja berhasil dilakukan ke akun AwanPulsa Anda.</p>
                                       <table class="info-table">
                                           <tr><td>Waktu Akses</td><td>${getWIBTime()}</td></tr>
                                           <tr><td>Alamat Email</td><td>${escapeHTML(payload.email)}</td></tr>
                                           <tr><td>IP Pengakses</td><td>${request.headers.get("cf-connecting-ip") || "IP Tersembunyi"}</td></tr>
                                       </table>
                                       <p>Apabila ini adalah Anda, maka tidak ada tindakan yang perlu dilakukan. Namun, apabila Anda merasa <b>tidak melakukan aktivitas login ini</b>, mohon segera hubungi Administrator kami (CS) untuk mengamankan akun dan saldo dompet Anda.</p>`;
          ctx.waitUntil(sendEmailViaGAS(payload.email, loginSubject, buildEmailTemplate("Aktivitas Login Baru", loginBody), env));
        }
        return new Response(JSON.stringify({ success: true }), { headers: { "Set-Cookie": `session_id=${newSessionId}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`, "Content-Type": "application/json" } });
      } catch (e) {
        return jsonResponse({ success: false }, 500);
      }
    }
    if (path === "/api/logout" && method === "POST") {
      if (sessionId) await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
      return new Response(JSON.stringify({ success: true }), { headers: { "Set-Cookie": `session_id=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`, "Content-Type": "application/json" } });
    }
    if (path === "/api/update-profile" && method === "POST") {
      if (!currentUser) return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      try {
        const { name, phone } = await request.json();
        if (!name) return jsonResponse({ success: false }, 400);
        await env.DB.prepare("UPDATE users SET name = ?, phone = ? WHERE email = ?").bind(name, phone || "", currentUser.email).run();
        return jsonResponse({ success: true });
      } catch (e) {
        return jsonResponse({ success: false }, 500);
      }
    }
    if (path === "/api/phonebook" && method === "POST") {
      if (!currentUser) return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      try {
        try {
          await env.DB.prepare("ALTER TABLE users ADD COLUMN phonebook TEXT DEFAULT '[]'").run();
        } catch (e) {
        }
        const { phonebook } = await request.json();
        await env.DB.prepare("UPDATE users SET phonebook = ? WHERE email = ?").bind(JSON.stringify(phonebook), currentUser.email).run();
        return jsonResponse({ success: true });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    if (path === "/api/topup" && method === "POST") {
      if (!currentUser) return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      try {
        const nowTs = Date.now();
        const { results: unpaidInvoices } = await env.DB.prepare("SELECT * FROM invoices WHERE email = ? AND status = 'UNPAID'").bind(currentUser.email).all();
        const validUnpaid = [];
        if (unpaidInvoices) {
          for (const inv of unpaidInvoices) {
            const invTs = parseWIBDateString(inv.date);
            if (invTs > 0 && nowTs - invTs > 36e5) continue;
            validUnpaid.push(inv);
          }
        }
        currentUser.unpaid_invoices = validUnpaid;
        const unpaidCount = currentUser.unpaid_invoices ? currentUser.unpaid_invoices.length : 0;
        if (unpaidCount >= 3) return jsonResponse({ success: false, message: "Terlalu banyak tagihan UNPAID. Harap lunasi atau tunggu 1 jam hingga tagihan sebelumnya kadaluarsa otomatis." }, 400);

        // Proteksi Anti Double-Click / Idempotency (30 Detik)
        if (validUnpaid && validUnpaid.length > 0) {
          const latestInv = validUnpaid[validUnpaid.length - 1];
          const latestTs = parseWIBDateString(latestInv.date);
          if (latestTs > 0 && (nowTs - latestTs < 30000)) {
            const remSec = Math.max(1, Math.ceil((30000 - (nowTs - latestTs)) / 1000));
            return jsonResponse({
              success: false,
              locked: true,
              remaining_seconds: remSec,
              message: `Proteksi Anti Double-Click: Anda baru saja membuat tagihan top up. Mohon tunggu ${remSec} detik untuk mencegah duplikasi tagihan.`
            }, 429);
          }
        }

        const { amount, method: selectedMethod } = await request.json();
        if (typeof amount !== "number" || isNaN(amount) || amount < 1e3 || amount > 1e7 || !Number.isInteger(amount)) {
          return jsonResponse({ success: false, message: "Nominal top up tidak valid. Minimal Rp 1.000 dan Maksimal Rp 10.000.000." }, 400);
        }
        if (!selectedMethod || selectedMethod.startsWith("manual")) {
          // Cari kode unik yang belum dipakai oleh invoice UNPAID saat ini untuk menghindari benturan
          const unpaidRows = await env.DB.prepare("SELECT amount FROM invoices WHERE status = 'UNPAID' AND amount >= ? AND amount <= ?").bind(amount + 1, amount + 999).all().catch(() => ({ results: [] }));
          const usedAmounts = new Set((unpaidRows.results || []).map((r) => r.amount));
          let uniqueCode = Math.floor(Math.random() * 99) + 1;
          for (let attempt = 0; attempt < 100; attempt++) {
            if (!usedAmounts.has(amount + uniqueCode)) break;
            uniqueCode = Math.floor(Math.random() * 99) + 1;
          }
          const nominalUnik = amount + uniqueCode;
          const refKode = `MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const bsiRek = appSettings.manual_bsi_rek || "7293609009";
          const bsiName = appSettings.manual_bsi_name || "sutroni soga";
          const danaRek = appSettings.manual_dana_rek || "08979527685";
          const danaName = appSettings.manual_dana_name || "sutroni soga";
          const shopeeRek = appSettings.manual_shopee_rek || "08979527685";
          const shopeeName = appSettings.manual_shopee_name || "hasnasyukur";

          let subLabel = "Transfer Manual";
          if (selectedMethod === "manual_bsi") subLabel = `Bank BSI (${bsiRek} a.n ${bsiName})`;
          else if (selectedMethod === "manual_dana") subLabel = `DANA (${danaRek} a.n ${danaName})`;
          else if (selectedMethod === "manual_shopee") subLabel = `Shopee / ShopeePay (${shopeeRek} a.n ${shopeeName})`;

          await env.DB.prepare("INSERT INTO invoices (ref, email, amount, status, date) VALUES (?, ?, ?, 'UNPAID', ?)").bind(refKode, currentUser.email, nominalUnik, getWIBTime()).run();

          const pendingMsg = `Halo! Anda telah membuat permintaan Top Up Saldo via <b>${subLabel}</b> sebesar <b class="text-green-400">Rp ${nominalUnik.toLocaleString("id-ID")}</b> (Termasuk kode unik Rp ${uniqueCode}).<br><br><b>Pilihan Rekening/E-Wallet Tujuan Transfer:</b><br>• <b>Bank BSI:</b> <code>${bsiRek}</code> (a.n ${bsiName})<br>• <b>DANA:</b> <code>${danaRek}</code> (a.n ${danaName})<br>• <b>Shopee / ShopeePay:</b> <code>${shopeeRek}</code> (a.n ${shopeeName})<br><br>Setelah berhasil transfer, silakan konfirmasi bukti transfer via WhatsApp ke CS <a href="https://wa.me/628979527685?text=${encodeURIComponent(`Halo Admin AwanPulsa, saya sudah transfer Top Up Saldo Rp ${nominalUnik.toLocaleString("id-ID")} (Ref: ${refKode}) untuk akun ${currentUser.email}. Berikut bukti transfernya:`)}" target="_blank" class="text-green-400 font-bold underline">08979527685</a> agar saldo Anda segera diisikan secara manual oleh Admin.<br><br><span style="font-size:10px;color:#6b7280;">No. Ref: ${refKode}</span>`;

          await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(currentUser.email, `[PENDING] Top Up Saldo Manual`, pendingMsg, getWIBTime()).run();

          ctx.waitUntil(sendTelegramLog("🧾 LOG CREATE TOP UP MANUAL", `User <b>${currentUser.email}</b> membuat tagihan Top Up Saldo Transfer Manual.

Nominal: Rp ${nominalUnik.toLocaleString("id-ID")} (Termasuk Kode Unik Rp ${uniqueCode})
Pilihan: ${subLabel}
Ref: ${refKode}
Status: UNPAID PENDING (Menunggu Bukti Transfer via WhatsApp CS)`, appSettings));

          return jsonResponse({
            success: true,
            method: "manual",
            sub_method: selectedMethod || "manual",
            ref: refKode,
            amount,
            unique_code: uniqueCode,
            total_amount: nominalUnik,
            bsi_rek: bsiRek,
            bsi_name: bsiName,
            dana_rek: danaRek,
            dana_name: danaName,
            shopee_rek: shopeeRek,
            shopee_name: shopeeName
          });
        }
        if (selectedMethod === "shopeepay" || selectedMethod === "auto") {
          // Cari kode unik yang belum dipakai oleh invoice UNPAID saat ini untuk menghindari benturan
          const unpaidRows = await env.DB.prepare("SELECT amount FROM invoices WHERE status = 'UNPAID' AND amount >= ? AND amount <= ?").bind(amount + 1, amount + 999).all().catch(() => ({ results: [] }));
          const usedAmounts = new Set((unpaidRows.results || []).map((r) => r.amount));
          let uniqueCode = Math.floor(Math.random() * 99) + 1;
          for (let attempt = 0; attempt < 100; attempt++) {
            if (!usedAmounts.has(amount + uniqueCode)) break;
            uniqueCode = Math.floor(Math.random() * 99) + 1;
          }
          const nominalUnik = amount + uniqueCode;
          const tx = await createShopeePayTransaction(env, appSettings, nominalUnik);
          if (tx.success) {
            const orderSn = tx.order_sn || "";
            const refKode = orderSn ? `AGPSHOPEE-${orderSn}-${Date.now()}` : `AGPSHOPEE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await env.DB.prepare("INSERT INTO invoices (ref, email, amount, status, date) VALUES (?, ?, ?, 'UNPAID', ?)").bind(refKode, currentUser.email, nominalUnik, getWIBTime()).run();
            const qrDisplay = tx.qr_url || ("https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(tx.qr_string || ''));
            const pendingMsg = `Halo! Anda telah membuat permintaan Top Up Saldo via QRIS Otomatis sebesar <b class="text-green-400">Rp ${nominalUnik.toLocaleString("id-ID")}</b> (Termasuk kode unik Rp ${uniqueCode}).<br><br>Silakan scan QRIS di bawah ini sebelum batas waktu habis (Maksimal 15 Menit):<br><br><div style="text-align: center; margin: 15px 0;"><img src="${qrDisplay}" alt="QRIS Otomatis" style="max-width:220px;border-radius:12px;margin:auto;display:block;border:1px solid #374151;"></div><br><span style="font-size:10px;color:#6b7280;">No. Ref: ${refKode}</span><div style="text-align: center; margin-top: 20px;"><button onclick="checkInboxPayment('${refKode}', true)" class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg inline-flex items-center gap-2 cursor-pointer border border-green-400/30 hover:scale-105"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 🔍 Cek Status Pembayaran</button><div class="mt-2 text-xs text-yellow-400/80 font-mono flex items-center justify-center gap-1.5"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span></span> Deteksi live aktif di latar belakang...</div></div>`;
            await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(currentUser.email, `[PENDING] Top Up Saldo`, pendingMsg, getWIBTime()).run();
            ctx.waitUntil(sendTelegramLog("🧾 LOG CREATE TOP UP", `User <b>${currentUser.email}</b> membuat tagihan Top Up Saldo.

Nominal: Rp ${nominalUnik.toLocaleString("id-ID")} (Termasuk Kode Unik Rp ${uniqueCode})
Metode: QRIS Otomatis (autocek by system)
Ref: ${refKode}
Status: UNPAID PENDING`, appSettings));
            return jsonResponse({
              success: true,
              method: "shopeepay",
              ref: refKode,
              amount,
              unique_code: uniqueCode,
              total_amount: nominalUnik,
              order_sn: tx.order_sn,
              qr_url: tx.qr_url,
              qr_raw: tx.qr_string
            });
          } else {
            return jsonResponse({ success: false, message: tx.message }, 400);
          }
        }
        if (selectedMethod === "gopay" || (selectedMethod === "auto" && appSettings.payment_gopay)) {
          // Cari kode unik yang belum dipakai oleh invoice UNPAID saat ini untuk menghindari benturan
          const unpaidRows = await env.DB.prepare("SELECT amount FROM invoices WHERE status = 'UNPAID' AND amount >= ? AND amount <= ?").bind(amount + 1, amount + 999).all().catch(() => ({ results: [] }));
          const usedAmounts = new Set((unpaidRows.results || []).map((r) => r.amount));
          let uniqueCode = Math.floor(Math.random() * 99) + 1;
          for (let attempt = 0; attempt < 100; attempt++) {
            if (!usedAmounts.has(amount + uniqueCode)) break;
            uniqueCode = Math.floor(Math.random() * 99) + 1;
          }
          const nominalUnik = amount + uniqueCode;
          const tx = await createGoPayTransaction(env, appSettings, nominalUnik);
          if (tx.success) {
            const txId = tx.transaction_id || "";
            const refKode = txId ? `AGPGOPAY-${txId}-${Date.now()}` : `AGPGOPAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            await env.DB.prepare("INSERT INTO invoices (ref, email, amount, status, date) VALUES (?, ?, ?, 'UNPAID', ?)").bind(refKode, currentUser.email, nominalUnik, getWIBTime()).run();
            const qrDisplay = tx.qr_url || ("https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=" + encodeURIComponent(tx.qr_string || ''));
            const pendingMsg = `Halo! Anda telah membuat permintaan Top Up Saldo via GoPay sebesar <b class="text-green-400">Rp ${nominalUnik.toLocaleString("id-ID")}</b> (Termasuk kode unik Rp ${uniqueCode}).<br><br>Silakan scan QRIS GoPay di bawah ini sebelum batas waktu habis (Maksimal 15 Menit):<br><br><div style="text-align: center; margin: 15px 0;"><img src="${qrDisplay}" alt="QRIS GoPay" style="max-width:220px;border-radius:12px;margin:auto;display:block;border:1px solid #374151;"></div><br><span style="font-size:10px;color:#6b7280;">No. Ref: ${refKode}</span><div style="text-align: center; margin-top: 20px;"><button onclick="checkInboxPayment('${refKode}', true)" class="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-xl text-sm transition shadow-lg inline-flex items-center gap-2 cursor-pointer border border-green-400/30 hover:scale-105"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> 🔍 Cek Status Pembayaran</button><div class="mt-2 text-xs text-yellow-400/80 font-mono flex items-center justify-center gap-1.5"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span></span> Deteksi live aktif di latar belakang...</div></div>`;
            await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(currentUser.email, `[PENDING] Top Up Saldo`, pendingMsg, getWIBTime()).run();
            ctx.waitUntil(sendTelegramLog("🧾 LOG CREATE TOP UP", `User <b>${currentUser.email}</b> membuat tagihan Top Up Saldo.

Nominal: Rp ${nominalUnik.toLocaleString("id-ID")} (Termasuk Kode Unik Rp ${uniqueCode})
Metode: GoPay (AutoGoPay)
Ref: ${refKode}
Status: UNPAID PENDING`, appSettings));
            return jsonResponse({
              success: true,
              method: "gopay",
              ref: refKode,
              amount,
              unique_code: uniqueCode,
              total_amount: nominalUnik,
              transaction_id: tx.transaction_id,
              checkout_url: tx.checkout_url,
              qr_url: tx.qr_url,
              qr_raw: tx.qr_string
            });
          } else {
            return jsonResponse({ success: false, message: tx.message }, 400);
          }
        }
        return jsonResponse({ success: false, message: "Metode pembayaran tidak valid atau sedang dinonaktifkan." }, 400);
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    if ((path === "/api/buy" || path === "/api/renew" || path === "/api/check-detail") && method === "POST") {
      return jsonResponse({ success: false, message: "Layanan VPN sudah dinonaktifkan. Silakan bertransaksi di menu Pulsa & PPOB." }, 400);
    }
    if (path === "/api/cekkuota-backend") {
      return jsonResponse({ success: false, message: "Layanan ini sudah dinonaktifkan. Silakan gunakan menu Pulsa & PPOB." }, 410);
    }
    if (path === "/webhook" && method === "POST") {
      try {
        const tripaySignature = request.headers.get("x-callback-signature");
        const rawBody = await request.text();
        const bodyObj = JSON.parse(rawBody);
        if (!await verifyWebhookSignature(env.TRIPAY_PRIVATE_KEY, rawBody, tripaySignature)) {
          return jsonResponse({ success: false, message: "Invalid Signature" }, 403);
        }
        if (bodyObj.status === "PAID") {
          const updateInvoice = await env.DB.prepare("UPDATE invoices SET status = 'PAID' WHERE ref = ? AND status = 'UNPAID'").bind(bodyObj.merchant_ref).run();
          if (updateInvoice.meta.changes === 1) {
            const invoice = await env.DB.prepare("SELECT * FROM invoices WHERE ref = ?").bind(bodyObj.merchant_ref).first();
            await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(invoice.amount, invoice.email).run();
            await catatMutasi(env, invoice.email, "IN", invoice.amount, `Top Up Saldo via TriPay (Ref: ${invoice.ref})`);
            await env.DB.prepare("DELETE FROM inbox WHERE email = ? AND title = '[PENDING] Top Up Saldo' AND message LIKE ?").bind(invoice.email, `%${bodyObj.merchant_ref}%`).run();
            await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(invoice.email, "Top Up Saldo Berhasil", `Pembayaran QRIS sebesar <b>Rp ${Number(invoice.amount).toLocaleString("id-ID")}</b> telah diverifikasi.`, getWIBTime()).run();
            await sendTelegramLog("\u{1F4B0} TOP UP SALDO BERHASIL", `Pembayaran QRIS sebesar <b>Rp ${Number(invoice.amount).toLocaleString("id-ID")}</b> telah diverifikasi.

Ref: ${invoice.ref}
Email: ${invoice.email}
Saldo otomatis ditambahkan.`, appSettings);
            const topUpSubject = `Top Up Saldo Sebesar Rp ${Number(invoice.amount).toLocaleString("id-ID")} Berhasil`;
            const topUpBody = `<p>Kami menginformasikan bahwa pembayaran Top Up Saldo Anda melalui Gateway TriPay telah kami verifikasi dengan sukses.</p>
                                           <table class="info-table">
                                               <tr><td>No. Referensi</td><td>${invoice.ref}</td></tr>
                                               <tr><td>Waktu Validasi</td><td>${getWIBTime()}</td></tr>
                                               <tr><td>Nominal Saldo</td><td style="color: #10b981; font-size: 18px;">Rp ${Number(invoice.amount).toLocaleString("id-ID")}</td></tr>
                                           </table>
                                            <p>Saldo web Anda telah ditambahkan secara otomatis dan kini dapat langsung digunakan untuk bertransaksi layanan Pulsa & PPOB tanpa hambatan.</p>
                                           <div style="text-align: center;"><a href="/" class="btn">Kembali ke Dashboard Utama</a></div>`;
            ctx.waitUntil(sendEmailViaGAS(invoice.email, topUpSubject, buildEmailTemplate("Bukti Transaksi Top Up", topUpBody), env));
          }
        }
        return jsonResponse({ success: true });
      } catch (e) {
        return jsonResponse({ success: false }, 500);
      }
    }
    if (path === "/webhook-violet" && method === "POST") {
      try {
        const rawBody = await request.text();
        const bodyObj = JSON.parse(rawBody);
        const verification = await verifyVioletCallback(request, bodyObj, env);
        if (!verification.isValid) {
          const headersObj = {};
          for (const [k, v] of request.headers.entries()) {
            headersObj[k] = v;
          }
          const errMsg = `\u2022 IP Pengirim: <code>${verification.clientIp}</code> (Status Whitelist: ${verification.isWhitelistedIp ? "YA" : "TIDAK"})
\u2022 Signature: <code>${verification.signature || "KOSONG/UNDEFINED"}</code>

\u2022 Body JSON:
<pre>${JSON.stringify(bodyObj, null, 2)}</pre>

\u2022 Headers HTTP:
<pre>${JSON.stringify(headersObj, null, 2)}</pre>`;
          await sendTelegramLog("\u26A0\uFE0F INVALID VIOLET CALLBACK", errMsg, appSettings);
          console.error("Invalid Callback Source/Signature for Violet!");
          return jsonResponse({ success: false, message: "Invalid Signature or Source IP" }, 403);
        }
        if (verification.status === "success") {
          const updateInvoice = await env.DB.prepare("UPDATE invoices SET status = 'PAID' WHERE ref = ? AND status = 'UNPAID'").bind(verification.ref).run();
          if (updateInvoice.meta.changes === 1) {
            const invoice = await env.DB.prepare("SELECT * FROM invoices WHERE ref = ?").bind(verification.ref).first();
            await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(invoice.amount, invoice.email).run();
            await catatMutasi(env, invoice.email, "IN", invoice.amount, `Top Up Saldo via Violet (Ref: ${invoice.ref})`);
            await env.DB.prepare("DELETE FROM inbox WHERE email = ? AND title = '[PENDING] Top Up Saldo' AND message LIKE ?").bind(invoice.email, `%${verification.ref}%`).run();
            await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(invoice.email, "Top Up Saldo Berhasil", `Pembayaran QRIS sebesar <b>Rp ${Number(invoice.amount).toLocaleString("id-ID")}</b> telah diverifikasi.`, getWIBTime()).run();
            await sendTelegramLog("\u{1F4B0} TOP UP SALDO BERHASIL", `Pembayaran QRIS sebesar <b>Rp ${Number(invoice.amount).toLocaleString("id-ID")}</b> telah diverifikasi.

Ref: ${invoice.ref}
Email: ${invoice.email}
Saldo otomatis ditambahkan. (Gateway: Violet)`, appSettings);
            const topUpSubject = `Top Up Saldo Sebesar Rp ${Number(invoice.amount).toLocaleString("id-ID")} Berhasil`;
            const topUpBody = `<p>Kami menginformasikan bahwa pembayaran Top Up Saldo Anda melalui Gateway VioletMediaPay telah kami verifikasi dengan sukses.</p>
                                           <table class="info-table">
                                               <tr><td>No. Referensi</td><td>${invoice.ref}</td></tr>
                                               <tr><td>Waktu Validasi</td><td>${getWIBTime()}</td></tr>
                                               <tr><td>Nominal Saldo</td><td style="color: #10b981; font-size: 18px;">Rp ${Number(invoice.amount).toLocaleString("id-ID")}</td></tr>
                                           </table>
                                           <p>Saldo web Anda telah ditambahkan secara otomatis dan kini dapat langsung digunakan.</p>
                                           <div style="text-align: center;"><a href="https://${url.hostname}/" class="btn">Kembali ke Dashboard Utama</a></div>`;
            ctx.waitUntil(sendEmailViaGAS(invoice.email, topUpSubject, buildEmailTemplate("Bukti Transaksi Top Up", topUpBody), env));
          }
        } else if (verification.status === "kadaluarsa" || verification.status === "refund") {
          await env.DB.prepare("UPDATE invoices SET status = 'EXPIRED' WHERE ref = ? AND status = 'UNPAID'").bind(verification.ref).run();
        }
        return jsonResponse({ status: true });
      } catch (e) {
        await sendTelegramLog("\u{1F6A8} ERROR DI WEBHOOK-VIOLET", `Error: ${e.message}
Stack: ${e.stack || ""}`, appSettings);
        return jsonResponse({ status: false, error: e.message }, 500);
      }
    }
    if ((path === "/webhook-autogopay" || path === "/autogopay-callback") && method === "POST") {
      try {
        const rawBody = await request.text();
        const signature = request.headers.get("x-signature") || request.headers.get("X-Signature");
        const { apiKey } = await getAutoGoPayConfig(env, appSettings);
        
        if (signature && apiKey) {
          const expectedSig = await hmacSha256(rawBody, apiKey);
          if (signature.toLowerCase() !== expectedSig.toLowerCase()) {
            return jsonResponse({ success: false, message: "Invalid webhook signature." }, 401);
          }
        }

        const bodyObj = JSON.parse(rawBody || "{}");
        const amount = bodyObj.transaction?.amount || bodyObj.amount || bodyObj.data?.amount;
        const status = String(bodyObj.transaction?.status || bodyObj.status || bodyObj.transaction_status || bodyObj.data?.status || "").toLowerCase();
        const issuer = String(bodyObj.transaction?.issuer || bodyObj.issuer || "").toLowerCase();
        const isPaidField = bodyObj.paid === true || bodyObj.transaction?.paid === true || bodyObj.data?.paid === true;
        const isStatusSuccess = (status === "settlement" || status === "success" || status === "paid" || status === "1") && status !== "pending" && status !== "2";

        // HANYA proses jika status BENAR-BENAR sukses / paid (BUKAN sekadar is_money_in yang selalu true di QRIS)
        if (amount && (isStatusSuccess || isPaidField)) {
          const orderSn = bodyObj.transaction?.order_sn || bodyObj.order_sn || bodyObj.data?.order_sn;
          let invoice = null;
          if (orderSn) {
            invoice = await env.DB.prepare("SELECT * FROM invoices WHERE status = 'UNPAID' AND (ref LIKE ? OR ref = ?)").bind(`%${orderSn}%`, orderSn).first();
          }
          if (!invoice) {
            invoice = await env.DB.prepare("SELECT * FROM invoices WHERE amount = ? AND status = 'UNPAID' AND (ref LIKE 'AGP%' OR ref LIKE 'AGPGOPAY%' OR ref LIKE 'AGPSHOPEE%') ORDER BY rowid DESC LIMIT 1").bind(parseInt(amount)).first();
          }
          if (invoice) {
            const updateInvoice = await env.DB.prepare("UPDATE invoices SET status = 'PAID' WHERE ref = ? AND status = 'UNPAID'").bind(invoice.ref).run();
            if (updateInvoice.meta.changes === 1) {
              let gatewayType = "AutoGoPay";
              if (issuer.includes("gopay") || invoice.ref.includes("GOPAY")) {
                gatewayType = "GoPay";
              } else if (issuer.includes("shopee") || invoice.ref.includes("SHOPEE")) {
                gatewayType = "ShopeePay";
              }
              await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(invoice.amount, invoice.email).run();
              await catatMutasi(env, invoice.email, "IN", invoice.amount, "Top Up Saldo via " + gatewayType + " AutoGoPay (Ref: " + invoice.ref + ")");
              await env.DB.prepare("DELETE FROM inbox WHERE email = ? AND message LIKE ?").bind(invoice.email, "%" + invoice.ref + "%").run().catch(() => {});
              await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(invoice.email, "Top Up Saldo Berhasil", "Pembayaran QRIS " + gatewayType + " sebesar <b>Rp " + Number(invoice.amount).toLocaleString("id-ID") + "</b> telah diverifikasi otomatis via Webhook.", getWIBTime()).run();
              await sendTelegramLog("💰 TOP UP SALDO BERHASIL (WEBHOOK)", "Pembayaran QRIS " + gatewayType + " sebesar <b>Rp " + Number(invoice.amount).toLocaleString("id-ID") + "</b> telah diverifikasi.\n\nRef: " + invoice.ref + "\nEmail: " + invoice.email + "\nGateway: " + gatewayType + " (AutoGoPay Webhook)", appSettings);
              const topUpSubject = "Top Up Saldo Sebesar Rp " + Number(invoice.amount).toLocaleString("id-ID") + " Berhasil";
              const topUpBody = '<p>Pembayaran Top Up Saldo Anda melalui Gateway ' + gatewayType + ' telah diverifikasi dengan sukses via Webhook.</p>' +
                                '<table class="info-table">' +
                                    '<tr><td>No. Referensi</td><td>' + invoice.ref + '</td></tr>' +
                                    '<tr><td>Waktu Validasi</td><td>' + getWIBTime() + '</td></tr>' +
                                    '<tr><td>Nominal Saldo</td><td style="color: #10b981; font-size: 18px;">Rp ' + Number(invoice.amount).toLocaleString("id-ID") + '</td></tr>' +
                              '</table>' +
                              '<div style="text-align: center;"><a href="https://' + url.hostname + '/" class="btn">Kembali ke Dashboard Utama</a></div>';
              ctx.waitUntil(sendEmailViaGAS(invoice.email, topUpSubject, buildEmailTemplate("Bukti Transaksi Top Up", topUpBody), env));
            }
            return jsonResponse({ success: true, message: "Callback processed" });
          }
        }
        return jsonResponse({ success: true, message: "Callback received" });
      } catch (e) {
        return jsonResponse({ success: false, error: e.message }, 500);
      }
    }
    if (path === "/api/check-payment" && (method === "POST" || method === "GET")) {
      if (!currentUser) return jsonResponse({ success: false, message: "Unauthorized" }, 401);
      try {
        let bodyData = {};
        if (method === "POST") {
          bodyData = await request.json().catch(() => ({}));
        }
        const ref = bodyData.ref || url.searchParams.get("ref");
        let orderSn = bodyData.order_sn || url.searchParams.get("order_sn");
        let transactionId = bodyData.transaction_id || url.searchParams.get("transaction_id");

        // Ekstrak order_sn atau transaction_id langsung dari ref jika ada
        if (!orderSn && ref && ref.startsWith("AGPSHOPEE-")) {
          const parts = ref.split("-");
          if (parts.length >= 3 && parts[1].length >= 10 && !isNaN(parts[1])) {
            orderSn = parts[1];
          }
        }
        if (!transactionId && ref && ref.startsWith("AGPGOPAY-")) {
          const parts = ref.split("-");
          if (parts.length >= 3 && parts[1].length >= 8) {
            transactionId = parts[1];
          }
        }

        if (!ref) return jsonResponse({ success: false, message: "Parameter ref diperlukan." }, 400);

        const invoice = await env.DB.prepare("SELECT * FROM invoices WHERE ref = ? AND email = ?").bind(ref, currentUser.email).first();
        if (!invoice) return jsonResponse({ success: false, message: "Invoice tidak ditemukan." }, 404);

        if (invoice.status === "PAID") {
          // Hapus pesan pending inbox jika faktur sudah PAID
          await env.DB.prepare("DELETE FROM inbox WHERE email = ? AND message LIKE ?").bind(currentUser.email, "%" + ref + "%").run().catch(() => {});
          return jsonResponse({ success: true, status: "PAID", message: "Pembayaran telah berhasil diverifikasi!" });
        }

        if (ref.startsWith("MANUAL-")) {
          return jsonResponse({
            success: true,
            status: "UNPAID",
            message: "Tagihan Transfer Manual sedang menunggu verifikasi Admin. Pastikan Anda telah mengirimkan bukti transfer ke WhatsApp CS (08979527685)."
          });
        }

        let isPaid = false;
        let gatewayType = "AutoGoPay";

        if (ref.startsWith("AGPSHOPEE-") || ref.startsWith("AGP-")) {
          gatewayType = "ShopeePay";
          let isExplicitPending = false;

          // 1. Cek spesifik order_sn via API status
          if (orderSn) {
            const statusData = await checkShopeePayStatus(env, appSettings, orderSn);
            if (statusData) {
              // HANYA jika paid === true DAN status === "success" atau order_status === 1
              if (statusData.paid === true && (statusData.status === "success" || statusData.order_status === 1)) {
                isPaid = true;
              } else if (statusData.paid === false || statusData.status === "pending" || statusData.order_status === 2) {
                // JIKA statusData mengonfirmasi pesanan masih pending, TANDAI dan JANGAN fallback yang bisa salah deteksi
                isExplicitPending = true;
              }
            }
          }

          // 2. Cek riwayat mutasi ShopeePay via /shopeepay/transactions
          // HANYA jika belum terkonfirmasi paid DAN tidak berstatus pending eksplisit
          if (!isPaid && !isExplicitPending) {
            const shopeeTrx = await checkShopeePayTransactions(env, appSettings);
            for (const trx of shopeeTrx) {
              const trxAmount = parseInt(trx.amount);
              // PENTING: Di AutoGoPay ShopeePay:
              // - status: 1 = SUCCESS / SUDAH DIBAYAR
              // - status: 2 = PENDING / BELUM DIBAYAR
              // - is_money_in bernilai true untuk SEMUA pesanan (termasuk yang belum dibayar!)
              // - title "Pembayaran Diterima" ada di SEMUA pesanan (termasuk yang belum dibayar!)
              // Oleh karena itu, HANYA terima trx.status === 1 atau settlement/success, dan TOLAK status 2 / pending!
              const isTrxSuccess = (trx.status === 1 || String(trx.status).toLowerCase() === "settlement" || String(trx.status).toLowerCase() === "success") && trx.status !== 2 && String(trx.status).toLowerCase() !== "pending";
              if (!isTrxSuccess) continue;

              if (orderSn) {
                // Jika order_sn ada, pastikan order_sn SAMA PERSIS
                if (trx.order_sn === orderSn && trxAmount === parseInt(invoice.amount)) {
                  isPaid = true;
                  break;
                }
              } else {
                // Fallback untuk invoice lama tanpa order_sn:
                // Nominal sama dan order_sn transaksi ini belum pernah di-klaim oleh invoice PAID manapun di DB
                if (trxAmount === parseInt(invoice.amount)) {
                  const alreadyClaimed = await env.DB.prepare("SELECT ref FROM invoices WHERE status = 'PAID' AND (ref LIKE ? OR ref = ?)").bind(`%${trx.order_sn}%`, trx.order_sn).first();
                  if (!alreadyClaimed) {
                    isPaid = true;
                    break;
                  }
                }
              }
            }
          }
        } else if (ref.startsWith("AGPGOPAY-")) {
          gatewayType = "GoPay";
          let isExplicitPending = false;

          // 1. Cek spesifik transaction_id jika ada
          if (transactionId) {
            const statusData = await checkGoPayStatus(env, appSettings, transactionId);
            if (statusData) {
              const txStatus = String(statusData.transaction_status || statusData.status || "").toLowerCase();
              if (statusData.paid === true || txStatus === "settlement" || txStatus === "success") {
                isPaid = true;
              } else if (txStatus === "pending" || statusData.paid === false) {
                isExplicitPending = true;
              }
            }
          }

          // 2. Cek riwayat transaksi GoPay jika belum terdeteksi
          if (!isPaid && !isExplicitPending) {
            const gopayTrx = await checkGoPayTransactions(env, appSettings);
            for (const trx of gopayTrx) {
              const trxStatus = String(trx.status || "").toLowerCase();
              const isTrxSuccess = (trxStatus === "settlement" || trxStatus === "success" || trxStatus === "paid" || trx.status === 1) && trxStatus !== "pending" && trx.status !== 2;
              if (!isTrxSuccess) continue;

              if (transactionId) {
                if ((trx.transaction_id === transactionId || trx.order_id === transactionId) && parseInt(trx.amount) === parseInt(invoice.amount)) {
                  isPaid = true;
                  break;
                }
              } else {
                if (parseInt(trx.amount) === parseInt(invoice.amount)) {
                  const alreadyClaimed = await env.DB.prepare("SELECT ref FROM invoices WHERE status = 'PAID' AND (ref LIKE ? OR ref = ?)").bind(`%${trx.transaction_id || trx.order_id}%`, trx.transaction_id || trx.order_id).first();
                  if (!alreadyClaimed) {
                    isPaid = true;
                    break;
                  }
                }
              }
            }
          }
        }

        if (isPaid) {
          const updateInvoice = await env.DB.prepare("UPDATE invoices SET status = 'PAID' WHERE ref = ? AND status = 'UNPAID'").bind(ref).run();
          if (updateInvoice.meta.changes === 1) {
            await env.DB.prepare("UPDATE users SET balance = balance + ? WHERE email = ?").bind(invoice.amount, invoice.email).run();
            await catatMutasi(env, invoice.email, "IN", invoice.amount, "Top Up Saldo via " + gatewayType + " (Ref: " + invoice.ref + ")");
            // Hapus pesan pending inbox yang bersangkutan
            await env.DB.prepare("DELETE FROM inbox WHERE email = ? AND message LIKE ?").bind(invoice.email, "%" + invoice.ref + "%").run().catch(() => {});
            await env.DB.prepare("INSERT INTO inbox (email, title, message, date, read) VALUES (?, ?, ?, ?, 0)").bind(invoice.email, "Top Up Saldo Berhasil", "Pembayaran QRIS " + gatewayType + " sebesar <b>Rp " + Number(invoice.amount).toLocaleString("id-ID") + "</b> telah diverifikasi.", getWIBTime()).run();
            await sendTelegramLog("💰 TOP UP SALDO BERHASIL", "Pembayaran QRIS sebesar <b>Rp " + Number(invoice.amount).toLocaleString("id-ID") + "</b> telah diverifikasi.\n\nRef: " + invoice.ref + "\nEmail: " + invoice.email + "\nGateway: " + gatewayType + " (AutoGoPay)\nSaldo otomatis ditambahkan.", appSettings);
            const topUpSubject = "Top Up Saldo Sebesar Rp " + Number(invoice.amount).toLocaleString("id-ID") + " Berhasil";
            const topUpBody = '<p>Pembayaran Top Up Saldo Anda melalui Gateway ' + gatewayType + ' telah diverifikasi dengan sukses.</p>' +
                              '<table class="info-table">' +
                                  '<tr><td>No. Referensi</td><td>' + invoice.ref + '</td></tr>' +
                                  '<tr><td>Waktu Validasi</td><td>' + getWIBTime() + '</td></tr>' +
                                  '<tr><td>Nominal Saldo</td><td style="color: #10b981; font-size: 18px;">Rp ' + Number(invoice.amount).toLocaleString("id-ID") + '</td></tr>' +
                              '</table>' +
                              '<div style="text-align: center;"><a href="https://' + url.hostname + '/" class="btn">Kembali ke Dashboard Utama</a></div>';
            ctx.waitUntil(sendEmailViaGAS(invoice.email, topUpSubject, buildEmailTemplate("Bukti Transaksi Top Up", topUpBody), env));
          }
          return jsonResponse({ success: true, status: "PAID", message: "Pembayaran berhasil dikonfirmasi! Saldo telah otomatis masuk ke akun Anda." });
        }

        return jsonResponse({ success: true, status: "UNPAID", message: "Pembayaran belum terdeteksi. Silakan pastikan Anda mentransfer tepat sejumlah tagihan." });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
    const tgRouteResponse = await handleTokoGorontaloRoutes(url, request, env, currentUser, appSettings, sendTelegramLog);
    if (tgRouteResponse) return tgRouteResponse;
    const kmspRouteResponse = await handleKMSPRoutes(url, request, env, currentUser, appSettings, sendTelegramLog);
    if (kmspRouteResponse) return kmspRouteResponse;
    const adminRouteResponse = await handleAdminRoutes(url, request, env, currentUser, appSettings, sendTelegramLog);
    if (adminRouteResponse) return adminRouteResponse;
    const aiResponse = await handleAIRoutes(url, request, env, currentUser, ctx);
    if (aiResponse) return aiResponse;
    const licenseRouteResponse = await handleLicenseRoutes(url, request, env, currentUser, appSettings, sendTelegramLog);
    if (licenseRouteResponse) return licenseRouteResponse;
    return new Response("Not Found", { status: 404 });
  }
};
module.exports = worker_default;
//# sourceMappingURL=worker.js.map