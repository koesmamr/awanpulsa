/**
 * Toko Gorontalo / PPOB Route Handlers & UI Renderer
 */

const service = require('./tokogorontalo.js');

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json;charset=UTF-8' }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

/**
 * Memeriksa apakah respon dari server provider menandakan transaksi MASIH PROSES / PENDING / SUSPECT.
 * Sangat krusial untuk Token PLN dan sistem OtomaX/Tupo!
 * Pesan seperti "Status transaksi tidak dapat terjemahkan hubungi admin" di OtomaX BUKAN GAGAL,
 * melainkan switch provider belum selesai mem-parsing balasan supplier / masih menunggu balasan PLN Biller.
 */
function isPendingOrProcessing(status, info, detail, rc) {
  const combined = ((status || '') + ' ' + (info || '') + ' ' + (detail || '') + ' ' + (rc || '')).toLowerCase();
  
  if (
    combined.includes('tidak dapat terjemahkan') ||
    combined.includes('belum terjemahkan') ||
    combined.includes('terjemahkan') ||
    combined.includes('sedang diproses') ||
    combined.includes('dalam proses') ||
    combined.includes('proses') ||
    combined.includes('processing') ||
    combined.includes('pending') ||
    combined.includes('menunggu') ||
    combined.includes('antrian') ||
    combined.includes('antri') ||
    combined.includes('suspect') ||
    combined.includes('biller timeout') ||
    combined.includes('silakan tunggu') ||
    combined.includes('silahkan tunggu') ||
    combined.includes('tunggu')
  ) {
    return true;
  }

  if (rc !== undefined && rc !== null) {
    const r = String(rc).trim().toLowerCase();
    if (['03', '05', '06', '68', '99', 'pending', 'processing', 'process', 'in_process'].includes(r)) {
      return true;
    }
  }

  const st = String(status || '').trim().toLowerCase();
  if (['pending', 'proses', 'processing', 'in_progress', 'queued', 'queue'].includes(st)) {
    return true;
  }

  return false;
}

function isSuccessStatus(val) {
  if (val === null || val === undefined) return false;
  if (val === true || val === 1 || val === '1') return true;
  const s = String(val).toLowerCase().trim();
  if (['success', 'sukses', 'berhasil', '00', 'true'].includes(s)) return true;
  return s.includes('sukses') || s.includes('berhasil') || s.includes('success');
}

function isProviderFailure(status, info, detail, rc, success) {
  // 1. JIKA TERINDIKASI PROSES / PENDING / SUSPECT / TERJEMAHKAN -> BUKAN GAGAL, JANGAN REFUND!
  if (isPendingOrProcessing(status, info, detail, rc)) {
    return false;
  }

  // 2. Jika sukses -> bukan kegagalan
  if (isSuccessStatus(status) || isSuccessStatus(info) || rc === '00' || rc === '0') {
    return false;
  }

  // 3. Cek kegagalan pasti / pesan penolakan definitif dari provider
  const combined = ((status || '') + ' ' + (info || '') + ' ' + (detail || '')).toLowerCase();
  const hasDefinitiveFailMessage = 
    combined.includes('gagal') ||
    combined.includes('fail') ||
    combined.includes('batal') ||
    combined.includes('tolak') ||
    combined.includes('reject') ||
    combined.includes('salah') ||
    combined.includes('tidak ditemukan') ||
    combined.includes('tidak terdaftar') ||
    combined.includes('tidak valid') ||
    combined.includes('invalid') ||
    combined.includes('gangguan') ||
    combined.includes('cut off') ||
    combined.includes('tutup') ||
    combined.includes('expired') ||
    combined.includes('kadaluarsa') ||
    combined.includes('hangus') ||
    combined.includes('kurang') ||
    combined.includes('saldo host tidak cukup') ||
    combined.includes('saldo tidak mencukupi');

  if (hasDefinitiveFailMessage) {
    return true;
  }

  const st = String(status || '').toLowerCase().trim();
  if (['failed', 'gagal', 'batal', 'rejected', 'declined', 'cancel'].includes(st)) {
    return true;
  }

  if (rc !== undefined && rc !== null && String(rc).trim() !== '') {
    const rcStr = String(rc).trim().toLowerCase();
    if (!['00', '0', 'pending', 'processing', ''].includes(rcStr)) {
      return true;
    }
  }

  if (success === false && !isPendingOrProcessing(status, info, detail, rc)) {
    return true;
  }

  return false;
}

function escapeTgHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Mengirim notifikasi Telegram untuk event PPOB (sukses/refund/alert).
 * Bekerja baik saat dipanggil dari HTTP route (menggunakan sendTelegramLog yang dipassing)
 * maupun dari timer interval background (fallback fetch langsung ke Telegram Bot API).
 */
async function dispatchTelegramLog(rawDb, statusHeader, bodyMsg, appSettings = null, sendTelegramLog = null) {
  try {
    let settings = appSettings;
    if (!settings && rawDb) {
      try {
        const row = rawDb.prepare("SELECT value FROM settings WHERE key = 'app'").get();
        if (row && row.value) {
          settings = JSON.parse(row.value);
        }
      } catch (e) {}
    }

    if (sendTelegramLog && typeof sendTelegramLog === 'function') {
      await sendTelegramLog(statusHeader, bodyMsg, settings);
      return;
    }

    // Direct Telegram Bot API fallback
    if (!settings) return;
    const botToken = String(settings.telegram_bot_token || '').trim();
    const rawChatId = String(settings.telegram_channel_id || '').trim();
    if (!botToken || !rawChatId) return;

    const candidateIds = [rawChatId];
    if (/^-\d{9,12}$/.test(rawChatId) && !rawChatId.startsWith('-100')) {
      candidateIds.push('-100' + rawChatId.substring(1));
    } else if (/^\d{9,12}$/.test(rawChatId)) {
      candidateIds.push('-100' + rawChatId);
    }

    const cleanHeader = String(statusHeader || '').trim();
    const headerPrefix = cleanHeader.startsWith('#awanpulsa') ? '' : '#awanpulsa\n';
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const wib = new Date(utcTime + 7 * 3600000);
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${pad(wib.getDate())}/${pad(wib.getMonth() + 1)}/${wib.getFullYear()}, ${pad(wib.getHours())}.${pad(wib.getMinutes())}.${pad(wib.getSeconds())} WIB`;
    const finalMessage = `${headerPrefix}<b>${cleanHeader}</b>\n\n${bodyMsg}\n\n🕒 ${timeStr}`;

    for (const targetChatId of candidateIds) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: targetChatId, text: finalMessage, parse_mode: 'HTML' })
        });
        const data = await res.json();
        if (data && data.ok) return;
      } catch (e) {}
    }
  } catch (err) {
    console.warn('[dispatchTelegramLog Error]:', err.message);
  }
}

/**
 * Format pesan Telegram untuk transaksi PPOB yang sukses
 */
function formatPPOBTelegramSuccess(order, sn) {
  const name = order.product_name || 'Produk PPOB';
  const nameLower = name.toLowerCase();
  const isWifi = nameLower.includes('wifi');
  const isPln = nameLower.includes('token') || nameLower.includes('pln') || nameLower.includes('listrik');

  let labelSn = 'SN / Bukti';
  if (isWifi) {
    labelSn = 'Kode Voucher Wifi ID';
  } else if (isPln) {
    labelSn = 'Token Listrik PLN';
  }

  const priceVal = order.selling_price || order.cost_price || order.price || 0;
  const priceStr = priceVal ? `Rp ${Number(priceVal).toLocaleString('id-ID')}` : '-';

  return (
    `Produk: <b>${escapeTgHtml(name)}</b>\n` +
    `Tujuan: <code>${escapeTgHtml(order.customer_no || '-')}</code>\n` +
    `Harga: <b>${priceStr}</b>\n` +
    `${labelSn}: <code>${escapeTgHtml(sn || '-')}</code>\n` +
    `User: ${escapeTgHtml(order.email || '-')}\n` +
    `Ref: <code>${escapeTgHtml(order.reqid || '-')}</code>\n` +
    `Status: <b>SUCCESS (Selesai Diproses)</b>`
  );
}

/**
 * Eksekusi Auto-Refund Instan
 * Mengembalikan saldo ke akun pengguna seketika tanpa menunggu proses manual admin,
 * mencatat mutasi saldo akun, mengirim notifikasi Inbox, serta logging Telegram.
 */
async function executeAutoRefund(rawDb, order, failureReason, source = 'webhook', sendTelegramLog = null, appSettings = null) {
  if (!order || !order.reqid || !order.email) return { refunded: false, reason: 'invalid_order' };

  // Ambil transaksi paling terkini dari database
  const current = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(order.reqid);
  if (!current) return { refunded: false, reason: 'order_not_found' };

  // Pastikan tidak pernah di-refund ganda (Idempotency)
  if (current.is_refunded === 1 || current.status === 'refunded') {
    console.log(`[Auto-Refund] Order ${order.reqid} sudah pernah di-refund sebelumnya.`);
    return { refunded: false, reason: 'already_refunded' };
  }

  // Jika statusnya success, tidak boleh di-refund
  if (isSuccessStatus(current.status)) {
    console.warn(`[Auto-Refund] Order ${order.reqid} berstatus success, refund dibatalkan.`);
    return { refunded: false, reason: 'order_was_success' };
  }

  const refundAmount = Number(current.selling_price) || 0;
  if (refundAmount <= 0) {
    return { refunded: false, reason: 'zero_amount' };
  }

  const nowWIB = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
  const cleanReason = String(failureReason || current.info || 'Transaksi ditolak oleh sistem provider').trim();

  // Eksekusi atomic refund
  const runRefundTransaction = () => {
    // 1. Tandai ppob_transactions sebagai refunded & failed
    const updateResult = rawDb.prepare(`
      UPDATE ppob_transactions
      SET status = 'failed',
          is_refunded = 1,
          info = CASE WHEN info IS NULL OR info = '' THEN ? ELSE info END,
          updated_at = CURRENT_TIMESTAMP
      WHERE reqid = ? AND (is_refunded = 0 OR is_refunded IS NULL)
    `).run(cleanReason, order.reqid);

    if (updateResult.changes === 0) {
      return false; // Race condition caught
    }

    // 2. Kembalikan saldo pengguna seketika itu juga (100% Instan) - Case-insensitive email
    rawDb.prepare('UPDATE users SET balance = balance + ? WHERE LOWER(email) = LOWER(?)').run(refundAmount, current.email);

    // 3. Catat ke mutasi transaksi akun (tipe 'IN')
    rawDb.prepare(`
      INSERT INTO transactions (email, type, amount, description, balance, created_at)
      VALUES (?, 'IN', ?, ?, (SELECT balance FROM users WHERE LOWER(email) = LOWER(?)), ?)
    `).run(
      current.email,
      refundAmount,
      `Auto-Refund PPOB Gagal: ${current.product_name} (${current.customer_no}) - Ref: ${order.reqid}`,
      current.email,
      nowWIB
    );

    // 4. Kirim notifikasi instan ke Inbox pengguna
    const titleMsg = `⚠️ Refund Saldo: Pembelian ${current.product_name} Gagal`;
    const bodyMsg = `
      <div style="font-family: inherit; line-height: 1.6;">
        <p style="margin-bottom: 8px;">Pesanan produk digital Anda tidak berhasil diproses oleh server provider dan <b style="color: #16a34a;">saldo telah otomatis dikembalikan (Refund) 100% secara instan</b> ke akun Anda tanpa perlu menunggu konfirmasi admin.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin: 12px 0; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><b>Ref ID:</b> <span style="font-family: monospace;">${order.reqid}</span></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><b>Produk:</b> <span>${escapeHtml(current.product_name)}</span></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><b>Tujuan:</b> <span style="font-family: monospace;">${escapeHtml(current.customer_no)}</span></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #dc2626;"><b>Keterangan:</b> <span>${escapeHtml(cleanReason)}</span></div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px; color: #16a34a; font-weight: bold; font-size: 14px;">
            <span>Saldo Dikembalikan:</span>
            <span style="font-family: monospace;">+ Rp ${refundAmount.toLocaleString('id-ID')}</span>
          </div>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 6px;">Saldo akun Anda telah bertambah seketika dan dapat langsung digunakan kembali untuk transaksi berikutnya.</p>
      </div>
    `;

    rawDb.prepare(`
      INSERT INTO inbox (email, title, message, date, read)
      VALUES (?, ?, ?, ?, 0)
    `).run(current.email, titleMsg, bodyMsg, nowWIB);

    return true;
  };

  let wasRefunded = false;
  if (typeof rawDb.transaction === 'function') {
    wasRefunded = rawDb.transaction(runRefundTransaction)();
  } else {
    rawDb.exec('BEGIN TRANSACTION;');
    try {
      wasRefunded = runRefundTransaction();
      rawDb.exec('COMMIT;');
    } catch (e) {
      rawDb.exec('ROLLBACK;');
      throw e;
    }
  }

  if (wasRefunded) {
    console.log(`[Auto-Refund SUCCESS] Ref: ${order.reqid} -> Rp ${refundAmount} refunded to ${current.email} via ${source}`);

    // Kirim Telegram Log untuk audit admin
    try {
      const isHostBalanceLow = cleanReason.toLowerCase().includes('saldo tidak cukup') || cleanReason.toLowerCase().includes('saldo host');
      await dispatchTelegramLog(
        rawDb,
        isHostBalanceLow ? '🚨 PERINGATAN: SALDO DEPOSIT HOST HABIS / KURANG' : '💸 AUTO-REFUND INSTAN BERHASIL',
        `Order PPOB Gagal dari Provider!\n\n` +
        `Ref: <code>${escapeTgHtml(order.reqid)}</code>\n` +
        `User: <b>${escapeTgHtml(current.email)}</b>\n` +
        `Produk: <b>${escapeTgHtml(current.product_name)}</b>\n` +
        `Tujuan: <code>${escapeTgHtml(current.customer_no)}</code>\n` +
        `Alasan: <i>${escapeTgHtml(cleanReason)}</i>\n` +
        `Saldo Dikembalikan: <b>Rp ${refundAmount.toLocaleString('id-ID')}</b> (100% Instan)\n` +
        `Sumber: <code>${source.toUpperCase()}</code>` +
        (isHostBalanceLow ? `\n\n⚠️ <b>PENTING:</b> Saldo deposit di akun Toko Gorontalo (Host) Anda sudah menipis/kurang dari modal produk. Segera lakukan Deposit / Isi Saldo di Toko Gorontalo agar transaksi member dapat berjalan lancar!` : ''),
        appSettings,
        sendTelegramLog
      );
    } catch (tgErr) {
      console.warn('[Auto-Refund Telegram Error]:', tgErr.message);
    }
    return { refunded: true, amount: refundAmount };
  }

  return { refunded: false, reason: 'duplicate_or_rolled_back' };
}

/**
 * Menyimpan notifikasi transaksi PPOB / Token PLN / E-Wallet Sukses ke Kotak Masuk (Inbox) Akun Pembeli
 */
function saveSuccessPPOBToInbox(rawDb, { email, product_name, customer_no, sn, reqid }) {
  if (!rawDb || !email || !reqid) return;
  try {
    const cleanEmail = String(email).trim().toLowerCase();
    const existingInbox = rawDb.prepare('SELECT id FROM inbox WHERE message LIKE ?').get(`%${reqid}%`);
    if (existingInbox) return; // Mencegah pesan ganda (idempotency)

    const nowWIB = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB';
    const prodLower = (product_name || '').toLowerCase();
    const isTokenPLN = prodLower.includes('token') || prodLower.includes('pln');
    const isWifiID = prodLower.includes('wifi');
    const isEwallet = ['shopee', 'shopeepay', 'dana', 'ovo', 'gopay', 'linkaja', 'ewallet', 'wallet'].some(w => prodLower.includes(w));
    const isGame = ['game', 'diamond', 'mobile legends', 'free fire', 'pubg', 'genshin', 'valorant'].some(w => prodLower.includes(w));

    let labelSN = 'SERIAL NUMBER (SN) / BUKTI';
    let iconEmoji = '📱';
    let productDesc = 'Pesanan produk digital Anda telah <b style="color: #16a34a;">berhasil diproses</b> oleh server provider.';

    if (isTokenPLN) {
      labelSN = 'KODE TOKEN PLN (20 DIGIT)';
      iconEmoji = '⚡';
      productDesc = 'Token listrik PLN Anda telah <b style="color: #16a34a;">berhasil diterbitkan</b> dan siap dimasukkan ke meteran listrik.';
    } else if (isWifiID) {
      labelSN = 'KODE VOUCHER / AKUN WIFI ID (USERNAME & PASSWORD)';
      iconEmoji = '📶';
      productDesc = 'Voucher Wifi ID Anda telah <b style="color: #16a34a;">berhasil diterbitkan</b> dan siap digunakan untuk login ke jaringan @wifi.id.';
    } else if (isEwallet) {
      labelSN = 'STATUS & BUKTI TOP UP';
      iconEmoji = '👛';
      productDesc = 'Top Up saldo e-wallet Anda telah <b style="color: #16a34a;">berhasil ditambahkan</b> langsung ke akun penerima.';
    } else if (isGame) {
      labelSN = 'KODE VOUCHER / SERIAL NUMBER';
      iconEmoji = '🎮';
      productDesc = 'Voucher / Top Up Game Anda telah <b style="color: #16a34a;">berhasil diproses</b> ke akun game tujuan.';
    }

    const titleMsg = `${iconEmoji} Pembelian ${product_name || 'Produk'} Berhasil!`;
    const cleanSn = (sn && String(sn).trim() !== '-' && String(sn).trim() !== '') ? String(sn).trim() : (isEwallet ? 'SUKSES TERISI' : 'BERHASIL DIPROSES');

    const bodyMsg = `
      <div style="font-family: inherit; line-height: 1.6;">
        <p style="margin-bottom: 8px;">${productDesc}</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px; margin: 12px 0; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><b>Ref ID:</b> <span style="font-family: monospace;">${escapeHtml(reqid)}</span></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><b>Produk:</b> <span>${escapeHtml(product_name || '-')}</span></div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;"><b>Tujuan / No Akun:</b> <span style="font-family: monospace; font-weight: bold;">${escapeHtml(customer_no || '-')}</span></div>
          <div style="background-color: #ffffff; border: 1.5px dashed #16a34a; border-radius: 10px; padding: 12px; margin-top: 8px; text-align: center;">
            <span style="font-size: 11px; color: #15803d; font-weight: bold; display: block; margin-bottom: 4px; letter-spacing: 0.5px;">${labelSN}</span>
            <span style="font-family: monospace; font-size: 19px; font-weight: 900; color: #166534; letter-spacing: 1.5px; user-select: all; display: inline-block; padding: 3px 10px; background: #dcfce7; border-radius: 8px;">${escapeHtml(cleanSn)}</span>
          </div>
        </div>
        <p style="font-size: 12px; color: #64748b; margin-top: 6px;">Waktu Transaksi: ${nowWIB}</p>
      </div>
    `;

    rawDb.prepare(`
      INSERT INTO inbox (email, title, message, date, read)
      VALUES (?, ?, ?, ?, 0)
    `).run(cleanEmail, titleMsg, bodyMsg, nowWIB);

    console.log(`[Inbox Saved] Sukses transaksi ${reqid} tersimpan ke Inbox ${cleanEmail}`);
  } catch (err) {
    console.error('[saveSuccessPPOBToInbox Error]:', err.message);
  }
}

/**
 * Sinkronisasi Otomatis Transaksi PPOB yang Sukses ke Inbox Pembeli.
 * Memeriksa transaksi berstatus 'success' atau transaksi 'pending' yang faktanya sudah sukses
 * dari respon provider / info provider.
 */
function syncMissingPPOBInbox(rawDb, targetEmail = null) {
  if (!rawDb) return;
  try {
    // 1. Cek transaksi yang statusnya 'pending' tetapi responnya mengandung sukses / berhasil
    let fixSql = `
      SELECT reqid, email, product_name, customer_no, sn, info, detail, raw_response, status
      FROM ppob_transactions
      WHERE (status = 'pending' OR status IS NULL OR status = '')
        AND (is_refunded = 0 OR is_refunded IS NULL)
        AND (
          LOWER(info) LIKE '%berhasil%' OR LOWER(info) LIKE '%sukses%' OR LOWER(info) LIKE '%success%'
          OR LOWER(detail) LIKE '%berhasil%' OR LOWER(detail) LIKE '%sukses%' OR LOWER(detail) LIKE '%success%'
          OR LOWER(raw_response) LIKE '%berhasil%' OR LOWER(raw_response) LIKE '%sukses%' OR LOWER(raw_response) LIKE '%success%'
          OR (sn IS NOT NULL AND length(sn) >= 6)
        )
    `;
    const fixParams = [];
    if (targetEmail) {
      fixSql += ' AND LOWER(email) = LOWER(?)';
      fixParams.push(targetEmail);
    }
    const pendingSuccesses = rawDb.prepare(fixSql).all(...fixParams);
    for (const tx of pendingSuccesses) {
      console.log(`[Inbox Auto-Sync] Mengoreksi status pending menjadi success untuk Ref: ${tx.reqid}`);
      rawDb.prepare(`
        UPDATE ppob_transactions
        SET status = 'success',
            updated_at = CURRENT_TIMESTAMP
        WHERE reqid = ?
      `).run(tx.reqid);
      saveSuccessPPOBToInbox(rawDb, {
        email: tx.email,
        product_name: tx.product_name,
        customer_no: tx.customer_no,
        sn: tx.sn || tx.info || 'SUKSES',
        reqid: tx.reqid
      });
    }

    // 2. Cek semua transaksi yang sudah 'success' namun pesannya belum tercatat di inbox
    let sql = `
      SELECT reqid, email, product_name, customer_no, sn, info, status, created_at
      FROM ppob_transactions
      WHERE status = 'success'
    `;
    const params = [];
    if (targetEmail) {
      sql += ' AND LOWER(email) = LOWER(?)';
      params.push(targetEmail);
    }
    sql += ' ORDER BY id DESC LIMIT 50';

    const successfulOrders = rawDb.prepare(sql).all(...params);
    for (const order of successfulOrders) {
      if (!order.reqid || !order.email) continue;
      const existing = rawDb.prepare('SELECT id FROM inbox WHERE message LIKE ?').get(`%${order.reqid}%`);
      if (!existing) {
        console.log(`[Inbox Auto-Sync] Membuat pesan inbox yang terlewat untuk Ref: ${order.reqid} (${order.product_name}) ke ${order.email}`);
        saveSuccessPPOBToInbox(rawDb, {
          email: order.email,
          product_name: order.product_name,
          customer_no: order.customer_no,
          sn: order.sn || order.info || 'SUKSES',
          reqid: order.reqid
        });
      }
    }
  } catch (err) {
    console.error('[syncMissingPPOBInbox Error]:', err.message);
  }
}

/**
 * Otomatis Menyimpan Nomor HP baru / ID Pelanggan PLN ke Buku Kontak (Phonebook) Buyer
 * Memastikan pembeli tidak harus memasukkan nomor secara manual setiap bertransaksi.
 */
function autoSaveBuyerContact(rawDb, { email, customer_no, product, service }) {
  if (!rawDb || !email || !customer_no) return;
  try {
    const cleanNo = String(customer_no).trim();
    if (!cleanNo || cleanNo.length < 4) return;

    // Tentukan kategori & label default
    let category = (product && product.category) ? String(product.category).toLowerCase() : '';
    let brand = (product && product.brand) ? String(product.brand).toUpperCase() : '';
    const nameLower = (product && product.product_name ? String(product.product_name) : '').toLowerCase();

    if (!category) {
      if (nameLower.includes('wifi')) {
        category = 'wifiID';
      } else if (nameLower.includes('pln') || nameLower.includes('token') || nameLower.includes('listrik')) {
        category = 'pln';
      } else if (nameLower.includes('dana') || nameLower.includes('gopay') || nameLower.includes('ovo') || nameLower.includes('shopee')) {
        category = 'ewallet';
      } else if (nameLower.includes('data') || nameLower.includes('kuota') || nameLower.includes('gb')) {
        category = 'data';
      } else if (nameLower.includes('pulsa')) {
        category = 'pulsa';
      } else {
        category = 'all';
      }
    }

    const BRAND_DISPLAY = {
      'TELKOMSEL': 'Telkomsel',
      'BYU': 'By.U',
      'INDOSAT': 'Indosat IM3',
      'XL': 'XL Axiata',
      'AXIS': 'Axis',
      'TRI': 'Tri (3)',
      'SMARTFREN': 'Smartfren',
      'PLN': 'Token PLN',
      'DANA': 'DANA',
      'GOPAY': 'GoPay',
      'OVO': 'OVO',
      'SHOPEEPAY': 'ShopeePay',
      'GAME': 'Game',
      'WIFIID': 'Wifi ID'
    };

    let label = '';
    if (category === 'wifiid' || category === 'wifiid') {
      label = 'Wifi ID Penerima';
    } else if (category === 'pln') {
      label = 'Token PLN';
    } else if (category === 'pulsa' || category === 'data') {
      let detected = brand;
      if ((!detected || detected === 'LAINNYA') && service && typeof service.detectOperator === 'function') {
        detected = service.detectOperator(cleanNo) || '';
      }
      label = BRAND_DISPLAY[detected] || detected || 'Nomor HP';
    } else if (category === 'ewallet') {
      label = BRAND_DISPLAY[brand] || brand || 'E-Wallet';
    } else if (category === 'game') {
      label = brand || 'Akun Game';
    } else {
      label = BRAND_DISPLAY[brand] || brand || 'Nomor Favorit';
    }

    // Cek apakah nomor sudah ada di daftar kontak user
    const existing = rawDb.prepare('SELECT id, label, category FROM user_contacts WHERE email = ? AND customer_no = ?').get(email, cleanNo);

    if (existing) {
      // Jika nomor sudah ada, jangan timpa label kustom buatan user (misal: "Rumah Nenek")!
      // Cukup perbarui updated_at agar nomor ini otomatis naik ke urutan teratas (paling baru dipakai)
      rawDb.prepare('UPDATE user_contacts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(existing.id);
      console.log(`[AutoSaveContact] Nomor sudah ada, waktu pemakaian diperbarui: ${existing.label} (${cleanNo}) untuk ${email}`);
    } else {
      // Jika nomor baru, otomatis masukkan ke user_contacts
      rawDb.prepare(`
        INSERT INTO user_contacts (email, label, customer_no, category, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(email, label, cleanNo, category);
      console.log(`[AutoSaveContact] Nomor baru otomatis tersimpan ke Phonebook: ${label} (${cleanNo}) kategori ${category} untuk ${email}`);
    }
  } catch (err) {
    console.error('[autoSaveBuyerContact Error]:', err.message);
  }
}

// Set untuk melacak order yang sedang dipantau di background agar tidak polling ganda
const activePollerReqIds = new Set();

/**
 * Pemantau status transaksi di latar belakang (Background Auto-Poller)
 * Memungkinkan pembeli langsung melanjutkan aktivitas tanpa menunggu di halaman loading.
 * Server akan terus memantau hingga token PLN terbit dan langsung memasukkannya ke Inbox pembeli.
 */
function startBackgroundOrderPoller(rawDb, orderInfo, sendTelegramLog, appSettings) {
  const { reqid, customer_no, email, product_name } = orderInfo;
  if (!reqid || activePollerReqIds.has(reqid)) return;

  activePollerReqIds.add(reqid);
  console.log(`[Background Poller Started] Ref: ${reqid} (${product_name} ke ${customer_no})`);

  let attempts = 0;
  const maxAttempts = 20; // 20 kali x 3 detik = 60 detik

  const checkNext = async () => {
    attempts++;
    try {
      // Cek apakah transaksi di database sudah berstatus final
      const current = rawDb.prepare('SELECT status, is_refunded, sn FROM ppob_transactions WHERE reqid = ?').get(reqid);
      if (!current || current.status === 'success' || current.is_refunded === 1) {
        activePollerReqIds.delete(reqid);
        return;
      }

      const live = await service.checkStatusToday({ reqid, tujuan: customer_no });
      if (live) {
        const liveStatus = live.status !== undefined ? live.status : (live.rc !== undefined ? live.rc : '');
        const infoText = live.info || live.message || live.pesan || '';
        const detailText = live.detail || '';

        let sn = '';
        if (detailText) {
          const parsed = service.parseDetail(detailText);
          if (parsed.sn) sn = parsed.sn;
        }
        if (!sn && live.bukti) {
          sn = String(live.bukti).trim();
        }

        if (isSuccessStatus(liveStatus) || isSuccessStatus(infoText) || live.rc === '00' || (sn && sn.length >= 6)) {
          console.log(`[Background Poller SUKSES] Ref: ${reqid}, SN: ${sn}`);
          rawDb.prepare(`
            UPDATE ppob_transactions
            SET status = 'success',
                sn = COALESCE(NULLIF(?, ''), sn),
                info = COALESCE(NULLIF(?, ''), info),
                detail = COALESCE(NULLIF(?, ''), detail),
                updated_at = CURRENT_TIMESTAMP
            WHERE reqid = ?
          `).run(sn, infoText, detailText, reqid);

          // Masukkan ke Kotak Masuk (Inbox) Pembeli seketika itu juga!
          saveSuccessPPOBToInbox(rawDb, { email, product_name, customer_no, sn, reqid });

          // Otomatis simpan nomor ke buku kontak pembeli
          autoSaveBuyerContact(rawDb, {
            email,
            customer_no,
            product: { product_name, category: 'pln', brand: 'PLN' }
          });

          // Kirim log Telegram
          try {
            await dispatchTelegramLog(
              rawDb,
              '⚡ PPOB TRANSAKSI BERHASIL',
              formatPPOBTelegramSuccess({ product_name, customer_no, email, reqid }, sn),
              appSettings,
              sendTelegramLog
            );
          } catch (tgErr) {
            console.warn('[Background Poller Telegram Error]:', tgErr.message);
          }

          activePollerReqIds.delete(reqid);
          return;
        }

        if (isProviderFailure(liveStatus, infoText, detailText, live.rc, live.success)) {
          console.log(`[Background Poller GAGAL] Ref: ${reqid}, Reason: ${infoText || detailText}`);
          await executeAutoRefund(rawDb, orderInfo, infoText || detailText || 'Ditolak provider', 'background_poller', sendTelegramLog, appSettings);
          activePollerReqIds.delete(reqid);
          return;
        }
      }
    } catch (err) {
      console.warn(`[Background Poller Error] Ref: ${reqid} (attempt ${attempts}):`, err.message);
    }

    if (attempts < maxAttempts) {
      setTimeout(checkNext, 3000);
    } else {
      activePollerReqIds.delete(reqid);
      console.log(`[Background Poller Finished] Ref: ${reqid} reached max attempts. Will be reconciled by cron.`);
    }
  };

  setTimeout(checkNext, 2500);
}

/**
 * Auto-Reconcile PPOB Transactions:
 * 1. Memeriksa setiap transaksi yang berstatus 'failed' / 'gagal' tetapi belum di-refund (is_refunded = 0),
 *    dan seketika mengembalikan saldo ke akun pengguna.
 * 2. Memeriksa transaksi berstatus 'pending' yang dibuat dalam 48 jam terakhir,
 *    melakukan live check ke server provider (Toko Gorontalo).
 *    Jika di server provider berstatus gagal -> OTOMATIS REFUND 100% INSTAN.
 *    Jika di server provider berstatus sukses -> update SN / Token PLN dan notifikasi Inbox.
 */
async function autoReconcilePPOBTransactions(rawDb, service, sendTelegramLog = null, appSettings = null, targetEmail = null) {
  let reconciledCount = 0;

  try {
    // 1. Tangani transaksi yang statusnya sudah 'failed' / 'gagal' tetapi is_refunded masih 0
    let failedSql = `
      SELECT * FROM ppob_transactions
      WHERE (
        status IN ('failed', 'gagal', 'error', 'batal', 'rejected', 'declined', 'refund', 'cancel')
        OR status LIKE '%gagal%'
        OR status LIKE '%fail%'
        OR status LIKE '%batal%'
        OR status LIKE '%reject%'
      ) AND (is_refunded = 0 OR is_refunded IS NULL)
    `;
    const failedParams = [];
    if (targetEmail) {
      failedSql += ' AND LOWER(email) = LOWER(?)';
      failedParams.push(targetEmail);
    }
    failedSql += ' ORDER BY id DESC LIMIT 25';

    const unrefundedFailed = rawDb.prepare(failedSql).all(...failedParams);
    for (const tx of unrefundedFailed) {
      console.log(`[Auto-Reconcile] Menemukan transaksi gagal belum di-refund: Ref ${tx.reqid} (${tx.email})`);
      const refResult = await executeAutoRefund(
        rawDb,
        tx,
        tx.info || 'Auto-refund transaksi berstatus gagal pada server provider',
        'reconcile_unrefunded',
        sendTelegramLog,
        appSettings
      );
      if (refResult.refunded) reconciledCount++;
    }

    // 2. Tangani transaksi yang masih berstatus 'pending' dalam 48 jam terakhir
    if (service && typeof service.checkStatusToday === 'function') {
      let pendingSql = `
        SELECT * FROM ppob_transactions
        WHERE (status = 'pending' OR status IS NULL OR status = '')
          AND (is_refunded = 0 OR is_refunded IS NULL)
          AND created_at >= datetime('now', '-2 days')
      `;
      const pendingParams = [];
      if (targetEmail) {
        pendingSql += ' AND LOWER(email) = LOWER(?)';
        pendingParams.push(targetEmail);
      }
      pendingSql += ' ORDER BY id DESC LIMIT 15';

      const pendingOrders = rawDb.prepare(pendingSql).all(...pendingParams);
      for (const tx of pendingOrders) {
        try {
          const live = await service.checkStatusToday({ reqid: tx.reqid, tujuan: tx.customer_no });
          if (live && (live.status !== undefined || live.info)) {
            const liveStatus = String(live.status || '').toLowerCase().trim();
            const infoText = String(live.info || live.message || live.pesan || '').trim();
            const detailText = String(live.detail || '').trim();

            let sn = tx.sn || '';
            if (detailText) {
              const parsed = service.parseDetail(detailText);
              if (parsed.sn) sn = parsed.sn;
            }
            if (!sn && live.bukti) {
              sn = String(live.bukti).trim();
            }

            if (isProviderFailure(liveStatus, infoText, detailText, live.rc, live.success)) {
              // Status Gagal pada server provider -> SEKETIKA AUTO-REFUND 100%
              console.log(`[Auto-Reconcile GAGAL] Live check order ${tx.reqid} gagal: ${infoText || liveStatus}`);
              const refResult = await executeAutoRefund(
                rawDb,
                tx,
                infoText || detailText || 'Transaksi dinyatakan gagal oleh server provider',
                'reconcile_live_check',
                sendTelegramLog,
                appSettings
              );
              if (refResult.refunded) reconciledCount++;
            } else if (isSuccessStatus(liveStatus) || isSuccessStatus(infoText) || live.rc === '00' || (sn && sn.length >= 6)) {
              // Status Sukses pada server provider -> UPDATE & NOTIFIKASI INBOX
              console.log(`[Auto-Reconcile SUKSES] Live check order ${tx.reqid} sukses. SN: ${sn}`);
              rawDb.prepare(`
                UPDATE ppob_transactions
                SET status = 'success',
                    sn = COALESCE(NULLIF(?, ''), sn),
                    info = COALESCE(NULLIF(?, ''), info),
                    detail = COALESCE(NULLIF(?, ''), detail),
                    updated_at = CURRENT_TIMESTAMP
                WHERE reqid = ?
              `).run(sn, infoText, detailText, tx.reqid);

              saveSuccessPPOBToInbox(rawDb, {
                email: tx.email,
                product_name: tx.product_name,
                customer_no: tx.customer_no,
                sn,
                reqid: tx.reqid
              });

              autoSaveBuyerContact(rawDb, {
                email: tx.email,
                customer_no: tx.customer_no,
                product: { product_name: tx.product_name, category: tx.category, brand: tx.brand }
              });

              // Kirim notifikasi Telegram bahwa transaksi PPOB / Voucher Wifi ID / Token PLN telah BERHASIL!
              try {
                await dispatchTelegramLog(
                  rawDb,
                  '⚡ PPOB TRANSAKSI BERHASIL',
                  formatPPOBTelegramSuccess(tx, sn),
                  appSettings,
                  sendTelegramLog
                );
              } catch (tgErr) {
                console.warn('[Auto-Reconcile Telegram Error]:', tgErr.message);
              }
            }
          }
        } catch (err) {
          // Gagal live check satu order, lanjutkan yang lain
        }
      }
    }
  } catch (globalErr) {
    console.warn('[Auto-Reconcile Error]:', globalErr.message);
  }

  try {
    syncMissingPPOBInbox(rawDb, targetEmail);
  } catch (eSync) {}

  return reconciledCount;
}

// Background auto-reconciliation timer setiap 30 detik
if (typeof setInterval !== 'undefined') {
  setInterval(async () => {
    try {
      const db = require('../db.js');
      if (db && db.rawDb) {
        await autoReconcilePPOBTransactions(db.rawDb, service);
      }
    } catch (e) {}
  }, 30000);
}

async function handleTokoGorontaloRoutes(url, request, env, currentUser, appSettings, sendTelegramLog) {
  const path = url.pathname;
  const method = request.method;
  const rawDb = env.DB.rawDb || (require('../db.js').rawDb);

  try {
    rawDb.exec('ALTER TABLE ppob_transactions ADD COLUMN is_refunded INTEGER DEFAULT 0;');
  } catch (e) {}

  try {
    rawDb.exec(`
      CREATE TABLE IF NOT EXISTS user_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        label TEXT NOT NULL,
        customer_no TEXT NOT NULL,
        category TEXT DEFAULT 'all',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_user_contacts_email ON user_contacts(email);
    `);
  } catch (e) {}

  if (currentUser && currentUser.email) {
    try {
      syncMissingPPOBInbox(rawDb, currentUser.email);
    } catch (eSync) {}

    // Jalankan auto-reconcile non-blocking untuk currentUser
    // Segera me-refund saldo jika ada transaksi gagal sebelumnya yang belum di-refund
    setTimeout(() => {
      autoReconcilePPOBTransactions(rawDb, service, sendTelegramLog, appSettings, currentUser.email).catch(() => {});
    }, 5);
  }

  // ================================================================
  // 1. WEBHOOK / CALLBACK HANDLER DARI TOKO GORONTALO
  // ================================================================
  if (path === '/api/webhook/tokogorontalo') {
    try {
      let payload = {};

      if (method === 'POST') {
        const contentType = (request.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
          try {
            payload = await request.json();
          } catch (e) {
            const raw = await request.text();
            try { payload = JSON.parse(raw); } catch {
              payload = Object.fromEntries(new URLSearchParams(raw));
            }
          }
        } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
          try {
            const fd = await request.formData();
            for (const [k, v] of fd.entries()) payload[k] = v;
          } catch (e) {
            const raw = await request.text();
            payload = Object.fromEntries(new URLSearchParams(raw));
          }
        } else {
          try {
            const raw = await request.text();
            try { payload = JSON.parse(raw); } catch {
              payload = Object.fromEntries(new URLSearchParams(raw));
            }
          } catch (e) {}
        }
      } else if (method === 'GET') {
        for (const [k, v] of url.searchParams.entries()) {
          payload[k] = v;
        }
      }

      console.log('[Webhook TokoGorontalo] Received payload:', JSON.stringify(payload));

      const reqid = payload.reqid || payload.trxid || payload.idtrx || payload.refid || payload.reff || payload.orderid || url.searchParams.get('reqid') || url.searchParams.get('trxid');
      if (!reqid) {
        return jsonResponse({ status: 'ignored', message: 'No reqid provided' });
      }

      const rawStatus = payload.status !== undefined ? payload.status : (payload.rc !== undefined ? payload.rc : (payload.st || payload.hasil));
      const normalizedStatus = String(rawStatus !== undefined && rawStatus !== null ? rawStatus : '').toLowerCase().trim();
      const info = payload.info || payload.pesan || payload.message || payload.keterangan || payload.note || '';
      const detail = payload.detail || payload.sn || payload.token || '';

      // Cari transaksi di database
      let existing = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(reqid);
      if (!existing) {
        existing = rawDb.prepare('SELECT * FROM ppob_transactions WHERE LOWER(reqid) = LOWER(?)').get(reqid);
      }
      if (!existing) {
        console.warn(`[Webhook TokoGorontalo] Order not found for reqid: ${reqid}`);
        return jsonResponse({ status: 'ok', message: 'Order not found, logged' });
      }

      let sn = existing.sn || '';
      if (detail) {
        const parsed = service.parseDetail(detail);
        if (parsed.sn) sn = parsed.sn;
      }

      const isFailed = isProviderFailure(normalizedStatus, info, detail, payload.rc, payload.success);
      const isSuccess = isSuccessStatus(normalizedStatus) || (payload.rc === '00');

      // Update data transaksi dari webhook
      rawDb.prepare(`
        UPDATE ppob_transactions
        SET status = CASE 
              WHEN status = 'failed' THEN 'failed'
              WHEN ? = 1 THEN 'success'
              WHEN ? = 1 THEN 'failed'
              ELSE COALESCE(NULLIF(?, ''), status)
            END,
            sn = COALESCE(NULLIF(?, ''), sn),
            info = COALESCE(NULLIF(?, ''), info),
            detail = COALESCE(NULLIF(?, ''), detail),
            raw_response = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE reqid = ?
      `).run(
        isSuccess ? 1 : 0,
        isFailed ? 1 : 0,
        normalizedStatus,
        sn,
        info || '',
        detail || '',
        JSON.stringify(payload),
        existing.reqid
      );

      // 1. Handle SUCCESS
      if (isSuccess && !isSuccessStatus(existing.status)) {
        saveSuccessPPOBToInbox(rawDb, {
          email: existing.email,
          product_name: existing.product_name,
          customer_no: existing.customer_no,
          sn,
          reqid: existing.reqid
        });

        autoSaveBuyerContact(rawDb, {
          email: existing.email,
          customer_no: existing.customer_no,
          product: { product_name: existing.product_name, category: existing.category, brand: existing.brand },
          service
        });

        try {
          await dispatchTelegramLog(
            rawDb,
            '⚡ PPOB TRANSAKSI BERHASIL',
            formatPPOBTelegramSuccess(existing, sn),
            appSettings,
            sendTelegramLog
          );
        } catch (tgErr) {
          console.warn('[Webhook Telegram Error]:', tgErr.message);
        }
      }

      // 2. Handle FAILED -> Auto-Refund Instan Seketika itu Juga Tanpa Menunggu Admin
      if (isFailed) {
        const failureReason = info || detail || 'Ditolak / Gagal dari server provider';
        console.log(`[Webhook TokoGorontalo] Order ${existing.reqid} gagal (${failureReason}). Mengeksekusi auto-refund...`);
        await executeAutoRefund(rawDb, existing, failureReason, 'webhook', sendTelegramLog, appSettings);
      }

      return jsonResponse({ status: 'ok', received: true });
    } catch (e) {
      console.error('[Webhook TokoGorontalo Error]:', e.message);
      return jsonResponse({ status: 'error', message: e.message }, 500);
    }
  }

  // ================================================================
  // 2. PUBLIC / CUSTOMER PPOB API
  // ================================================================
  if (path === '/api/ppob/categories' && method === 'GET') {
    const categories = [
      { id: 'pulsa', name: 'Pulsa Reguler', icon: 'smartphone', desc: 'Isi pulsa instan semua operator' },
      { id: 'data', name: 'Paket Data', icon: 'wifi', desc: 'Kuota & internet murah' },
      { id: 'pln', name: 'Token PLN', icon: 'zap', desc: 'Listrik prabayar 24/7' },
      { id: 'ewallet', name: 'Top Up E-Wallet', icon: 'wallet', desc: 'DANA, GoPay, OVO, ShopeePay' },
      { id: 'game', name: 'Voucher Game', icon: 'gamepad', desc: 'ML, FF, PUBG, Roblox dll' },
      { id: 'wifiID', name: 'Wifi ID', icon: 'rss', desc: 'Voucher Wifi ID Telkom' }
    ];
    return jsonResponse({ success: true, categories });
  }

  if (path === '/api/ppob/detect-operator' && method === 'GET') {
    const phone = url.searchParams.get('phone') || '';
    const brand = service.detectOperator(phone);
    return jsonResponse({ success: true, phone, brand });
  }

  if (path === '/api/ppob/products' && method === 'GET') {
    // Auto-fix DB: Pastikan produk Wifi ID Telkom masuk ke wifiID dan produk modem ke data
    try {
      rawDb.prepare(`
        UPDATE ppob_products 
        SET category = 'wifiID', brand = 'WIFIID' 
        WHERE (product_code LIKE 'wifi-id%' OR product_code LIKE 'wifi_id%' OR product_name LIKE '%wifi id%')
          AND product_name NOT LIKE '%modem%'
      `).run();
      rawDb.prepare(`
        UPDATE ppob_products 
        SET category = 'data', brand = 'MODEM' 
        WHERE product_name LIKE '%Modem%' OR provider_name LIKE '%Modem%' OR product_code LIKE 'adh%' OR product_code LIKE 'adw%'
      `).run();
    } catch(e) {}

    let category = url.searchParams.get('category') || '';
    let brand = url.searchParams.get('brand') || '';
    const phone = url.searchParams.get('phone') || '';

    if (!brand && phone) {
      const detected = service.detectOperator(phone);
      if (detected) brand = detected;
    }

    let sql = "SELECT id, product_code, product_name, description, product_type, category, brand, cost_price, selling_price FROM ppob_products WHERE is_active = 1 AND (product_type != 'open' OR product_type IS NULL)";
    const params = [];

    if (category) {
      if (category === 'wifiID') {
        sql += ` AND (
          category = ? 
          OR brand = ? 
          OR product_code LIKE 'wifi-id%' 
          OR product_code LIKE 'wifi_id%' 
          OR product_name LIKE '%wifi id%'
        ) AND product_name NOT LIKE ? AND product_code NOT LIKE ? AND product_code NOT LIKE ?`;
        params.push('wifiID', 'WIFIID', '%modem%', 'adh%', 'adw%');
      } else {
        sql += ' AND category = ?';
        params.push(category);
      }
    }
    if (brand && category !== 'wifiID') {
      sql += ' AND brand = ?';
      params.push(brand.toUpperCase());
    }

    sql += ' ORDER BY selling_price ASC LIMIT 250';

    try {
      const products = rawDb.prepare(sql).all(...params);
      return jsonResponse({ success: true, count: products.length, brand, category, products });
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }

  // ================================================================
  // 5. BUKU KONTAK / NOMOR FAVORIT (QUICK RE-ORDER)
  // ================================================================
  if (path === '/api/contacts') {
    if (!currentUser) {
      return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu.' }, 401);
    }

    if (method === 'GET') {
      try {
        const category = (url.searchParams.get('category') || '').trim().toLowerCase();
        let contacts;
        if (category && category !== 'all') {
          contacts = rawDb.prepare(`
            SELECT id, label, customer_no, category, created_at, updated_at
            FROM user_contacts
            WHERE email = ? AND (category = ? OR category = 'all')
            ORDER BY updated_at DESC, id DESC
          `).all(currentUser.email, category);
        } else {
          contacts = rawDb.prepare(`
            SELECT id, label, customer_no, category, created_at, updated_at
            FROM user_contacts
            WHERE email = ?
            ORDER BY updated_at DESC, id DESC
          `).all(currentUser.email);
        }
        return jsonResponse({ success: true, count: contacts.length, contacts });
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }

    if (method === 'POST') {
      try {
        const body = await request.json();
        let { label, customer_no, category } = body;

        customer_no = (customer_no || '').toString().trim();
        if (!customer_no) {
          return jsonResponse({ success: false, message: 'Nomor atau ID pelanggan wajib diisi.' }, 400);
        }

        label = (label || '').toString().trim() || customer_no;
        if (label.length > 60) label = label.substring(0, 60);

        category = (category || 'all').toString().trim().toLowerCase();
        const validCats = ['pulsa', 'data', 'pln', 'ewallet', 'game', 'wifiid', 'wifiID', 'all'];
        if (!validCats.includes(category)) category = 'all';

        // Cek apakah nomor sudah tersimpan untuk user ini
        const existing = rawDb.prepare('SELECT id FROM user_contacts WHERE email = ? AND customer_no = ?').get(currentUser.email, customer_no);

        if (existing) {
          rawDb.prepare(`
            UPDATE user_contacts
            SET label = ?, category = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND email = ?
          `).run(label, category, existing.id, currentUser.email);
          return jsonResponse({ success: true, message: 'Kontak berhasil diperbarui.', id: existing.id });
        } else {
          const info = rawDb.prepare(`
            INSERT INTO user_contacts (email, label, customer_no, category)
            VALUES (?, ?, ?, ?)
          `).run(currentUser.email, label, customer_no, category);
          return jsonResponse({ success: true, message: 'Kontak berhasil disimpan.', id: info.lastInsertRowid });
        }
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }

    if (method === 'DELETE') {
      try {
        let id = url.searchParams.get('id');
        if (!id) {
          try {
            const body = await request.json();
            id = body.id;
          } catch(e) {}
        }

        if (!id) {
          return jsonResponse({ success: false, message: 'ID kontak wajib disertakan.' }, 400);
        }

        const res = rawDb.prepare('DELETE FROM user_contacts WHERE id = ? AND email = ?').run(id, currentUser.email);
        if (res.changes > 0) {
          return jsonResponse({ success: true, message: 'Kontak berhasil dihapus.' });
        } else {
          return jsonResponse({ success: false, message: 'Kontak tidak ditemukan atau Anda tidak memiliki akses.' }, 404);
        }
      } catch (e) {
        return jsonResponse({ success: false, message: e.message }, 500);
      }
    }
  }

  if (path.startsWith('/api/contacts/') && method === 'DELETE') {
    if (!currentUser) {
      return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu.' }, 401);
    }
    const id = path.split('/')[3];
    if (!id) {
      return jsonResponse({ success: false, message: 'ID kontak wajib disertakan.' }, 400);
    }
    try {
      const res = rawDb.prepare('DELETE FROM user_contacts WHERE id = ? AND email = ?').run(id, currentUser.email);
      if (res.changes > 0) {
        return jsonResponse({ success: true, message: 'Kontak berhasil dihapus.' });
      } else {
        return jsonResponse({ success: false, message: 'Kontak tidak ditemukan.' }, 404);
      }
    } catch (e) {
      return jsonResponse({ success: false, message: e.message }, 500);
    }
  }

  if (path === '/api/ppob/order' && method === 'POST') {
    if (!currentUser) {
      return jsonResponse({ success: false, message: 'Silakan login terlebih dahulu untuk melakukan transaksi.' }, 401);
    }

    try {
      const { product_code, customer_no } = await request.json();
      if (!product_code || !customer_no) {
        return jsonResponse({ success: false, message: 'Kode produk dan nomor tujuan wajib diisi.' }, 400);
      }

      // Ambil produk
      const product = rawDb.prepare('SELECT * FROM ppob_products WHERE product_code = ? AND is_active = 1').get(product_code);
      if (!product) {
        return jsonResponse({ success: false, message: 'Produk tidak ditemukan atau sedang tidak aktif.' }, 404);
      }

      // Proteksi Anti Double-Click / Idempotency
      // Mencegah saldo terpotong ganda jika user menekan tombol berulang kali untuk nomor dan produk yang sama saat masih pending
      const recentTx = rawDb.prepare(`
        SELECT reqid, product_code, customer_no, created_at, status, is_refunded,
          CAST((strftime('%s', 'now') - strftime('%s', created_at)) AS INTEGER) as elapsed_sec
        FROM ppob_transactions
        WHERE email = ? AND product_code = ? AND customer_no = ? AND status = 'pending' AND (is_refunded = 0 OR is_refunded IS NULL)
        ORDER BY id DESC
        LIMIT 1
      `).get(currentUser.email, product_code, customer_no);

      if (recentTx && recentTx.elapsed_sec !== null && recentTx.elapsed_sec < 15) {
        const remaining = Math.max(1, 15 - Math.max(0, recentTx.elapsed_sec));
        return jsonResponse({
          success: false,
          locked: true,
          remaining_seconds: remaining,
          message: `Proteksi Anti Double-Click: Pesanan untuk nomor ${customer_no} sedang dalam antrian pemrosesan. Mohon tunggu ${remaining} detik.`
        }, 429);
      }

      // Ambil data user terkini
      const user = rawDb.prepare('SELECT balance FROM users WHERE email = ?').get(currentUser.email);
      const userBalance = Number(user.balance) || 0;
      const price = Number(product.selling_price) || 0;

      if (userBalance < price) {
        return jsonResponse({
          success: false,
          message: `Saldo Anda (Rp ${userBalance.toLocaleString('id-ID')}) tidak mencukupi untuk membeli produk seharga Rp ${price.toLocaleString('id-ID')}. Silakan Top Up saldo terlebih dahulu.`
        });
      }

      // Generate REQID unik
      const reqid = `WP${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Potong saldo user
      rawDb.prepare('UPDATE users SET balance = balance - ? WHERE email = ?').run(price, currentUser.email);
      
      // Catat mutasi saldo
      rawDb.prepare(`
        INSERT INTO transactions (email, type, amount, description, balance, created_at)
        VALUES (?, 'OUT', ?, ?, (SELECT balance FROM users WHERE email = ?), ?)
      `).run(
        currentUser.email,
        price,
        `Pembelian ${product.product_name} ke ${customer_no} (Ref: ${reqid})`,
        currentUser.email,
        new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
      );

      // Simpan transaksi awal dengan status pending
      rawDb.prepare(`
        INSERT INTO ppob_transactions (
          reqid, email, product_code, product_name, customer_no, cost_price, selling_price, status, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `).run(
        reqid,
        currentUser.email,
        product.product_code,
        product.product_name,
        customer_no,
        product.cost_price,
        price
      );

      // URL Callback webhook
      const webhookUrl = `${url.origin}/api/webhook/tokogorontalo`;

      // Eksekusi API Toko Gorontalo
      // Di Toko Gorontalo / OtomaX, paket fixed denom (shp10, dna10, gpy10, pulsa, data, pln)
      // menggunakan jenistrx = 1. Hanya produk dengan product_type = 'open' yang menggunakan jenistrx = 2.
      const isOpen = product.product_type === 'open';
      const jenistrx = isOpen ? 2 : 1;

      let apiResult;
      try {
        apiResult = await service.createTransaction({
          reqid,
          kodeproduk: product.product_code,
          tujuan: customer_no,
          jenistrx,
          nominaltrx: isOpen ? product.cost_price : undefined,
          urlcallback: webhookUrl
        });
      } catch (apiErr) {
        console.error('[PPOB CreateTransaction Exception]:', apiErr);
        // CRITICAL FIX: Provider network/timeout/exception -> Langsung Auto-Refund Seketika!
        await executeAutoRefund(
          rawDb,
          {
            reqid,
            email: currentUser.email,
            selling_price: price,
            product_name: product.product_name,
            customer_no
          },
          'Gagal menghubungi server provider: ' + (apiErr.message || 'Koneksi terputus'),
          'api_exception',
          sendTelegramLog,
          appSettings
        );

        return jsonResponse({
          success: true,
          reqid,
          status: 'failed',
          refunded: true,
          product_name: product.product_name,
          customer_no,
          price,
          sn: '',
          message: 'Transaksi gagal menghubungi server provider. Saldo Anda telah otomatis dikembalikan (Refund 100% Instan).'
        });
      }

      console.log(`[PPOB Order Result] reqid: ${reqid} ->`, JSON.stringify(apiResult));

      let finalStatus = 'pending';
      let sn = '';
      let infoMsg = apiResult.info || apiResult.message || apiResult.pesan || 'Transaksi sedang diproses oleh sistem provider.';
      let detailMsg = apiResult.detail || '';

      const rawApiStatus = apiResult.status !== undefined ? apiResult.status : (apiResult.rc !== undefined ? apiResult.rc : '');
      const isImmediateFailed = isProviderFailure(rawApiStatus, infoMsg, detailMsg, apiResult.rc, apiResult.success);

      if (isSuccessStatus(rawApiStatus) || isSuccessStatus(infoMsg) || apiResult.rc === '00') {
        finalStatus = 'success';
        if (detailMsg) {
          const parsed = service.parseDetail(detailMsg);
          if (parsed.sn) sn = parsed.sn;
        }
        if (!sn && apiResult.bukti) sn = String(apiResult.bukti).trim();
      } else if (isImmediateFailed) {
        finalStatus = 'failed';
        infoMsg = infoMsg || detailMsg || 'Transaksi ditolak oleh server provider';
        console.log(`[PPOB Order Immediate Failed] Ref: ${reqid}. Melakukan auto-refund instan...`);
        await executeAutoRefund(
          rawDb,
          {
            reqid,
            email: currentUser.email,
            selling_price: price,
            product_name: product.product_name,
            customer_no
          },
          infoMsg,
          'immediate_order_api',
          sendTelegramLog,
          appSettings
        );
      } else {
        // Status masih pending (misal Token PLN yang baru diproses oleh Biller PLN).
        // TIDAK PERLU menahan / blocking koneksi HTTP user!
        finalStatus = 'pending';
      }

      // Update transaksi di DB
      rawDb.prepare(`
        UPDATE ppob_transactions
        SET status = CASE WHEN is_refunded = 1 THEN 'failed' ELSE ? END,
            sn = COALESCE(NULLIF(?, ''), sn),
            info = COALESCE(NULLIF(?, ''), info),
            detail = COALESCE(NULLIF(?, ''), detail),
            raw_response = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE reqid = ?
      `).run(
        finalStatus,
        sn,
        infoMsg,
        detailMsg || JSON.stringify(apiResult),
        JSON.stringify(apiResult),
        reqid
      );

      // JIKA SUKSES LANGSUNG: SIMPAN KE INBOX PEMBELI!
      if (finalStatus === 'success') {
        saveSuccessPPOBToInbox(rawDb, {
          email: currentUser.email,
          product_name: product.product_name,
          customer_no,
          sn,
          reqid
        });
      }

      // JIKA PENDING: JALANKAN BACKGROUND POLLER OTOMATIS (NON-BLOCKING)
      // Server akan memantau terus hingga token PLN terbit dan langsung memasukkannya ke Inbox pembeli!
      if (finalStatus === 'pending') {
        startBackgroundOrderPoller(
          rawDb,
          {
            reqid,
            email: currentUser.email,
            product_name: product.product_name,
            customer_no,
            selling_price: price
          },
          sendTelegramLog,
          appSettings
        );
      }

      // AUTOSAVE NOMOR KE PHONEBOOK / BUKU KONTAK FAVORIT BUYER
      // Memastikan nomor HP baru atau ID PLN yang diisikan buyer otomatis tersimpan tanpa harus memasukkan manual
      if (finalStatus !== 'failed') {
        autoSaveBuyerContact(rawDb, {
          email: currentUser.email,
          customer_no,
          product,
          service
        });
      }

      // Kirim Telegram Log
      if (sendTelegramLog) {
        await sendTelegramLog(
          finalStatus === 'success' ? '⚡ PPOB TRANSAKSI BERHASIL' : '🛒 ORDER PPOB BARU',
          `Produk: <b>${product.product_name}</b>\nTujuan: <code>${customer_no}</code>\nHarga: Rp ${price.toLocaleString('id-ID')}\nStatus: ${finalStatus.toUpperCase()}\nRef: ${reqid}\nUser: ${currentUser.email}` + (sn ? `\nSN/Token: <code>${sn}</code>` : ''),
          appSettings
        );
      }

      const isPln = product.category === 'pln' || (product.product_name || '').toLowerCase().includes('pln');
      const isWifi = product.category === 'wifiID' || (product.product_name || '').toLowerCase().includes('wifi');
      const isEwallet = product.category === 'ewallet' || ['shopeepay', 'shopee', 'dana', 'ovo', 'gopay', 'linkaja'].some(b => (product.brand || '').toLowerCase().includes(b) || (product.product_name || '').toLowerCase().includes(b));
      const isGame = product.category === 'game';

      let pendingMessage = 'Pesanan Anda sedang diproses oleh server provider. Status dan rincian transaksi akan otomatis diperbarui.';
      if (isPln) {
        pendingMessage = 'Pesanan Token PLN Anda sedang diproses oleh server PLN. Anda tidak perlu menunggu di halaman ini, kode token akan otomatis masuk ke Kotak Masuk (Inbox) Anda begitu diterbitkan.';
      } else if (isWifi) {
        pendingMessage = 'Pesanan Voucher Wifi ID Anda sedang diproses oleh server provider. Anda tidak perlu menunggu di halaman ini, kode voucher (Username & Password) akan otomatis masuk ke Kotak Masuk (Inbox) Anda begitu diterbitkan.';
      } else if (isEwallet) {
        pendingMessage = 'Top Up saldo E-Wallet sedang diproses ke nomor tujuan. Saldo akan otomatis bertambah ke akun penerima.';
      } else if (isGame) {
        pendingMessage = 'Pesanan Voucher / Top Up Game sedang diproses ke akun tujuan.';
      } else {
        pendingMessage = 'Pesanan pulsa / kuota data sedang diproses oleh operator ke nomor tujuan.';
      }

      return jsonResponse({
        success: true,
        reqid,
        status: finalStatus,
        refunded: finalStatus === 'failed',
        product_name: product.product_name,
        customer_no,
        price,
        sn,
        message: finalStatus === 'pending'
          ? pendingMessage
          : infoMsg
      });

    } catch (e) {
      console.error('[PPOB Order Error]:', e);
      return jsonResponse({ success: false, message: 'Gagal memproses pesanan: ' + e.message }, 500);
    }
  }

  if (path === '/api/ppob/order-status' && method === 'GET') {
    const reqid = url.searchParams.get('reqid') || '';
    if (!reqid) return jsonResponse({ success: false, message: 'Parameter reqid wajib diisi' }, 400);

    let order = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(reqid);
    if (!order) {
      order = rawDb.prepare('SELECT * FROM ppob_transactions WHERE LOWER(reqid) = LOWER(?)').get(reqid);
    }
    if (!order) return jsonResponse({ success: false, message: 'Pesanan tidak ditemukan' }, 404);

    // 1. Jika transaksi di DB sudah berstatus gagal tetapi belum di-refund -> Langsung auto-refund!
    if (isProviderFailure(order.status, order.info, order.detail) && (order.is_refunded === 0 || !order.is_refunded)) {
      console.log(`[Order-Status] Auto-refund transaksi gagal belum di-refund: Ref ${order.reqid}`);
      await executeAutoRefund(rawDb, order, order.info || 'Transaksi dinyatakan gagal pada server provider', 'order_status_check', sendTelegramLog, appSettings);
      order = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(order.reqid);
    }

    // 2. Jika masih pending, coba cek status ke server Toko Gorontalo secara live
    if (order.status === 'pending' || !order.status) {
      try {
        const live = await service.checkStatusToday({ reqid: order.reqid, tujuan: order.customer_no });
        if (live) {
          const liveStatus = live.status !== undefined ? live.status : (live.rc !== undefined ? live.rc : '');
          const infoText = live.info || live.message || live.pesan || '';
          const detailText = live.detail || '';

          let sn = order.sn || '';
          if (detailText) {
            const parsed = service.parseDetail(detailText);
            if (parsed.sn) sn = parsed.sn;
          }
          if (!sn && live.bukti) {
            sn = String(live.bukti).trim();
          }

          if (isProviderFailure(liveStatus, infoText, detailText, live.rc, live.success)) {
            // Auto-refund instan HANYA jika provider melaporkan kegagalan pasti saat live check
            console.log(`[Order-Status Live Check GAGAL] Ref: ${order.reqid}. Melakukan auto-refund instan...`);
            await executeAutoRefund(rawDb, order, infoText || detailText || 'Gagal dari server provider', 'live_check', sendTelegramLog, appSettings);
            order = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(order.reqid);
          } else if (isSuccessStatus(liveStatus) || isSuccessStatus(infoText) || live.rc === '00' || (sn && sn.length >= 6)) {
            const wasPending = (order.status === 'pending' || !order.status);
            rawDb.prepare(`
              UPDATE ppob_transactions
              SET status = 'success',
                  sn = COALESCE(NULLIF(?, ''), sn),
                  info = COALESCE(NULLIF(?, ''), info),
                  detail = COALESCE(NULLIF(?, ''), detail),
                  updated_at = CURRENT_TIMESTAMP
              WHERE reqid = ?
            `).run(sn, infoText, detailText, order.reqid);
            order = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(order.reqid);

            // Buat notifikasi Inbox sukses kartu voucher/token jika belum ada
            try {
              saveSuccessPPOBToInbox(rawDb, {
                email: order.email,
                product_name: order.product_name,
                customer_no: order.customer_no,
                sn,
                reqid: order.reqid
              });
            } catch (eInbox) {}

            // Kirim log Telegram jika sebelumnya pending dan sekarang sukses
            if (wasPending) {
              try {
                await dispatchTelegramLog(
                  rawDb,
                  '⚡ PPOB TRANSAKSI BERHASIL',
                  formatPPOBTelegramSuccess(order, sn),
                  appSettings,
                  sendTelegramLog
                );
              } catch (tgErr) {
                console.warn('[Order-Status Telegram Error]:', tgErr.message);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[PPOB Live Check Error]:', err.message);
      }
    }

    return jsonResponse({ success: true, order });
  }

  // ================================================================
  // 3. ADMIN API ENDPOINTS (HANYA ADMINISTRATOR)
  // ================================================================
  if (path.startsWith('/api/admin/tokogorontalo/')) {
    const isUserAdmin = (user) => {
      if (!user) return false;
      if (user.is_admin === 1 || user.is_admin === '1' || user.is_admin === 2 || user.is_admin === '2' || user.is_admin === true) return true;
      const userEmail = (user.email || '').toLowerCase().trim();
      const adminEmail = ((env && env.ADMIN_EMAIL) || (typeof process !== 'undefined' && process.env && process.env.ADMIN_EMAIL) || 'syamsul18782@gmail.com').toLowerCase().trim();
      if (userEmail === adminEmail || userEmail === 'syamsul18782@gmail.com') return true;
      if (rawDb && userEmail) {
        try {
          const row = rawDb.prepare('SELECT is_admin FROM users WHERE LOWER(email) = ?').get(userEmail);
          if (row && (row.is_admin === 1 || row.is_admin === '1' || row.is_admin === 2 || row.is_admin === '2' || row.is_admin === true)) return true;
        } catch (e) {}
      }
      return false;
    };

    const isUserSuperAdmin = (user) => {
      if (!user) return false;
      if (user.is_admin === 2 || user.is_admin === '2') return true;
      const userEmail = (user.email || '').toLowerCase().trim();
      const adminEmail = ((env && env.ADMIN_EMAIL) || (typeof process !== 'undefined' && process.env && process.env.ADMIN_EMAIL) || 'syamsul18782@gmail.com').toLowerCase().trim();
      if (userEmail === adminEmail || userEmail === 'syamsul18782@gmail.com') return true;
      if (rawDb && userEmail) {
        try {
          const row = rawDb.prepare('SELECT is_admin FROM users WHERE LOWER(email) = ?').get(userEmail);
          if (row && (row.is_admin === 2 || row.is_admin === '2')) return true;
        } catch (e) {}
      }
      return false;
    };

    if (!isUserAdmin(currentUser)) {
      return jsonResponse({ success: false, message: 'Unauthorized. Hanya Administrator yang dapat mengakses menu ini.' }, 401);
    }

    // A. Info Akun & Saldo Host
    if (path === '/api/admin/tokogorontalo/info' && method === 'GET') {
      const balanceInfo = await service.getBalance();
      const productCount = rawDb.prepare('SELECT COUNT(*) as count FROM ppob_products').get().count;
      const activeCount = rawDb.prepare('SELECT COUNT(*) as count FROM ppob_products WHERE is_active = 1').get().count;
      const orderCount = rawDb.prepare('SELECT COUNT(*) as count FROM ppob_transactions').get().count;
      
      const settingRow = rawDb.prepare('SELECT value FROM settings WHERE key = ?').get('tokogorontalo_default_markup');
      let defaultMarkup = 750;
      if (settingRow && settingRow.value) {
        defaultMarkup = parseInt(settingRow.value) || 750;
      } else {
        const modeRow = rawDb.prepare('SELECT markup_value FROM ppob_products WHERE markup_value > 0 GROUP BY markup_value ORDER BY COUNT(*) DESC LIMIT 1').get();
        if (modeRow && modeRow.markup_value !== undefined) defaultMarkup = modeRow.markup_value;
      }

      return jsonResponse({
        success: true,
        balance: balanceInfo,
        productCount,
        activeCount,
        orderCount,
        defaultMarkup,
        config: {
          userid: service.userid,
          baseUrl: service.baseUrl
        }
      });
    }

    // B. Sinkronisasi Katalog Produk
    if (path === '/api/admin/tokogorontalo/sync' && method === 'POST') {
      if (!isUserSuperAdmin(currentUser)) {
        return jsonResponse({ success: false, message: 'Akses ditolak: Hanya Super Admin yang diizinkan untuk mensinkronkan katalog produk.' }, 403);
      }
      try {
        let markup = 750;
        try {
          const body = await request.json();
          if (body.markup !== undefined) markup = Number(body.markup);
        } catch {}

        const result = await service.syncProducts(rawDb, markup);

        // Simpan default markup ke settings
        try {
          rawDb.prepare(`
            INSERT INTO settings (key, value) VALUES ('tokogorontalo_default_markup', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).run(String(markup));
        } catch {}

        return jsonResponse({
          success: true,
          count: result.count,
          total: result.total,
          defaultMarkup: markup,
          message: `Berhasil mensinkronkan ${result.count} produk dari Toko Gorontalo (Markup: +Rp ${markup.toLocaleString('id-ID')}).`
        });
      } catch (e) {
        return jsonResponse({ success: false, message: 'Gagal sinkronisasi produk: ' + e.message }, 500);
      }
    }

    // C. Daftar Produk PPOB (Tabel Admin dengan Pencarian & Pagination)
    if (path === '/api/admin/tokogorontalo/products' && method === 'GET') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
      const limit = Math.max(10, Math.min(100, parseInt(url.searchParams.get('limit') || '30')));
      const offset = (page - 1) * limit;
      const search = url.searchParams.get('search') || '';
      const category = url.searchParams.get('category') || '';
      const brand = url.searchParams.get('brand') || '';

      let sql = 'SELECT * FROM ppob_products WHERE 1=1';
      let countSql = 'SELECT COUNT(*) as total FROM ppob_products WHERE 1=1';
      const params = [];
      const countParams = [];

      if (search) {
        sql += ' AND (product_code LIKE ? OR product_name LIKE ? OR provider_name LIKE ?)';
        countSql += ' AND (product_code LIKE ? OR product_name LIKE ? OR provider_name LIKE ?)';
        const q = `%${search}%`;
        params.push(q, q, q);
        countParams.push(q, q, q);
      }
      if (category) {
        sql += ' AND category = ?';
        countSql += ' AND category = ?';
        params.push(category);
        countParams.push(category);
      }
      if (brand) {
        sql += ' AND brand = ?';
        countSql += ' AND brand = ?';
        params.push(brand);
        countParams.push(brand);
      }

      sql += ' ORDER BY id ASC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const total = rawDb.prepare(countSql).get(...countParams).total;
      const products = rawDb.prepare(sql).all(...params);

      return jsonResponse({
        success: true,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        products
      });
    }

    // D. Update Produk Satuan (Harga / Status Aktif)
    if (path === '/api/admin/tokogorontalo/update-product' && method === 'POST') {
      if (!isUserSuperAdmin(currentUser)) {
        return jsonResponse({ success: false, message: 'Akses ditolak: Hanya Super Admin yang diizinkan untuk mengedit produk.' }, 403);
      }
      const { product_code, selling_price, markup_value, is_active } = await request.json();
      if (!product_code) return jsonResponse({ success: false, message: 'Kode produk wajib ada' }, 400);

      rawDb.prepare(`
        UPDATE ppob_products
        SET selling_price = COALESCE(?, selling_price),
            markup_value = COALESCE(?, markup_value),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE product_code = ?
      `).run(selling_price, markup_value, is_active, product_code);

      return jsonResponse({ success: true, message: `Produk ${product_code} berhasil diperbarui.` });
    }

    // E. Bulk Markup Per Kategori / Global
    if (path === '/api/admin/tokogorontalo/bulk-markup' && method === 'POST') {
      if (!isUserSuperAdmin(currentUser)) {
        return jsonResponse({ success: false, message: 'Akses ditolak: Hanya Super Admin yang diizinkan untuk mengubah markup produk.' }, 403);
      }
      const { category, brand, markup_value } = await request.json();
      const markup = Math.max(0, parseInt(markup_value) || 0);

      let sql = 'UPDATE ppob_products SET markup_value = ?, selling_price = cost_price + ?, updated_at = CURRENT_TIMESTAMP WHERE 1=1';
      const params = [markup, markup];

      if (category) {
        sql += ' AND category = ?';
        params.push(category);
      }
      if (brand) {
        sql += ' AND brand = ?';
        params.push(brand);
      }

      const info = rawDb.prepare(sql).run(...params);

      // Simpan ke settings sebagai default markup jika diterapkan secara global
      if (!category && !brand) {
        try {
          rawDb.prepare(`
            INSERT INTO settings (key, value) VALUES ('tokogorontalo_default_markup', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
          `).run(String(markup));
        } catch {}
      }

      return jsonResponse({
        success: true,
        changes: info.changes,
        defaultMarkup: markup,
        message: `Berhasil menyimpan dan menerapkan markup +Rp ${markup.toLocaleString('id-ID')} pada ${info.changes} produk.`
      });
    }

    // F. Riwayat Transaksi PPOB Admin
    if (path === '/api/admin/tokogorontalo/orders' && method === 'GET') {
      const limit = Math.min(100, parseInt(url.searchParams.get('limit') || '50'));
      const orders = rawDb.prepare(`
        SELECT * FROM ppob_transactions ORDER BY id DESC LIMIT ?
      `).all(limit);
      return jsonResponse({ success: true, orders });
    }

    // G. Cek Status Manual Pesanan dari Admin
    if (path === '/api/admin/tokogorontalo/orders/check' && method === 'POST') {
      const { reqid, customer_no } = await request.json();
      const live = await service.checkStatusToday({ reqid, tujuan: customer_no });
      
      if (live && live.status) {
        const newStatus = String(live.status).toLowerCase();
        let sn = '';
        if (live.detail) {
          const parsed = service.parseDetail(live.detail);
          sn = parsed.sn;
        }

        const existingOrder = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(reqid);
        const wasPending = existingOrder && (existingOrder.status === 'pending' || !existingOrder.status);

        rawDb.prepare(`
          UPDATE ppob_transactions
          SET status = CASE WHEN is_refunded = 1 THEN 'failed' ELSE ? END,
              sn = COALESCE(NULLIF(?, ''), sn),
              info = COALESCE(NULLIF(?, ''), info),
              detail = COALESCE(NULLIF(?, ''), detail),
              updated_at = CURRENT_TIMESTAMP
          WHERE reqid = ?
        `).run(newStatus, sn, live.info || '', live.detail || '', reqid);

        // Auto-refund instan jika provider mengembalikan status gagal saat admin memeriksa
        if (isFailureStatus(newStatus) || isFailureStatus(live.info)) {
          const order = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(reqid);
          if (order) {
            await executeAutoRefund(rawDb, order, live.info || 'Gagal dari server provider', 'admin_check', sendTelegramLog, appSettings);
          }
        } else if (isSuccessStatus(newStatus) || live.rc === '00' || (sn && sn.length >= 6)) {
          const updatedOrder = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(reqid);
          if (updatedOrder) {
            saveSuccessPPOBToInbox(rawDb, {
              email: updatedOrder.email,
              product_name: updatedOrder.product_name,
              customer_no: updatedOrder.customer_no,
              sn: sn || updatedOrder.sn,
              reqid: updatedOrder.reqid
            });
            autoSaveBuyerContact(rawDb, {
              email: updatedOrder.email,
              customer_no: updatedOrder.customer_no,
              product: { product_name: updatedOrder.product_name, category: updatedOrder.category, brand: updatedOrder.brand }
            });

            if (wasPending) {
              try {
                await dispatchTelegramLog(
                  rawDb,
                  '⚡ PPOB TRANSAKSI BERHASIL',
                  formatPPOBTelegramSuccess(updatedOrder, sn || updatedOrder.sn),
                  appSettings,
                  sendTelegramLog
                );
              } catch (tgErr) {
                console.warn('[Admin Check Telegram Error]:', tgErr.message);
              }
            }
          }
        }
      }

      return jsonResponse({ success: true, live });
    }

    // H. Manual Refund Pesanan dari Admin jika diperlukan
    if (path === '/api/admin/tokogorontalo/orders/refund' && method === 'POST') {
      const { reqid, reason } = await request.json();
      if (!reqid) return jsonResponse({ success: false, message: 'reqid wajib diisi' }, 400);

      const order = rawDb.prepare('SELECT * FROM ppob_transactions WHERE reqid = ?').get(reqid);
      if (!order) return jsonResponse({ success: false, message: 'Pesanan tidak ditemukan' }, 404);

      const result = await executeAutoRefund(rawDb, order, reason || 'Refund manual oleh Administrator', 'admin_manual', sendTelegramLog, appSettings);
      if (result.refunded) {
        return jsonResponse({ success: true, message: `Berhasil mengembalikan saldo Rp ${result.amount.toLocaleString('id-ID')} ke akun ${order.email}` });
      } else {
        return jsonResponse({ success: false, message: `Refund tidak dapat diproses: ${result.reason}` }, 400);
      }
    }

    // H. Buat Tiket Deposit Saldo Host
    if (path === '/api/admin/tokogorontalo/tiket-deposit' && method === 'POST') {
      const { nominal, bank } = await request.json();
      if (!nominal || !bank) {
        return jsonResponse({ success: false, message: 'Nominal dan Bank wajib diisi' }, 400);
      }
      const ticket = await service.createDepositTicket({ nominal, bank });
      return jsonResponse({ success: true, ticket });
    }

    // I. Cek IP Public Server VPS (Untuk didaftarkan ke Whitelist Toko Gorontalo)
    if (path === '/api/admin/tokogorontalo/server-ip' && method === 'GET') {
      let ipv4 = '116.212.74.104';
      let ipv6 = '2001:df7:5300:23::68';
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
        const ipData = await ipRes.json();
        if (ipData && ipData.ip) ipv4 = ipData.ip;
      } catch (e) {}
      return jsonResponse({ success: true, ip: ipv4, ipv4, ipv6 });
    }
  }

  return null; // Teruskan jika bukan route Toko Gorontalo
}

/**
 * Render Konten Halaman Beli Pulsa & PPOB
 */
function renderPPOBContent(currentUser, appSettings, env) {
  const userBalance = currentUser ? Number(currentUser.balance) || 0 : 0;
  
  return `
  <div class="max-w-6xl mx-auto px-4 py-8">
      <!-- Header Banner -->
      <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white p-8 md:p-12 mb-8 shadow-xl">
          <div class="relative z-10 max-w-2xl">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-sky-100 backdrop-blur-md mb-4 border border-white/20">
                  <svg class="w-3.5 h-3.5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20"><path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"></path></svg>
                  Layanan 24 Jam Otomatis
              </span>
              <h1 class="text-3xl md:text-5xl font-black tracking-tight mb-3">Isi Pulsa, Data & Token PLN</h1>
              <p class="text-sky-100 text-sm md:text-base leading-relaxed mb-6">
                  Nikmati transaksi digital serba instan dengan harga termurah. Saldo langsung masuk dalam hitungan detik dengan Serial Number (SN) resmi.
              </p>
              ${currentUser ? `
              <div class="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20">
                  <span class="text-xs text-sky-200">Saldo Akun Anda:</span>
                  <span class="text-lg font-black text-white font-mono">Rp ${userBalance.toLocaleString('id-ID')}</span>
                  <a href="/" class="ml-2 text-xs bg-white text-sky-700 font-bold px-3 py-1 rounded-xl hover:bg-sky-50 transition shadow-xs">+ Top Up</a>
              </div>
              ` : `
              <a href="/login" class="inline-flex items-center gap-2 bg-white text-sky-700 font-bold px-6 py-3 rounded-2xl hover:bg-sky-50 transition shadow-lg text-sm">
                  Masuk untuk Bertransaksi &rarr;
              </a>
              `}
          </div>
          <!-- Decorative circle -->
          <div class="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
      </div>

      <!-- Kategori Tab Selector -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          <button onclick="selectCategory('pulsa')" id="cat-btn-pulsa" class="cat-btn active flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition font-bold text-center gap-2 shadow-xs cursor-pointer">
              <div class="w-12 h-12 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              </div>
              <span class="text-sm">Pulsa Reguler</span>
          </button>
          <button onclick="selectCategory('data')" id="cat-btn-data" class="cat-btn flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition font-bold text-center gap-2 shadow-xs cursor-pointer">
              <div class="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
              </div>
              <span class="text-sm">Paket Data</span>
          </button>
          <button onclick="selectCategory('pln')" id="cat-btn-pln" class="cat-btn flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition font-bold text-center gap-2 shadow-xs cursor-pointer">
              <div class="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <span class="text-sm">Token PLN</span>
          </button>
          <button onclick="selectCategory('ewallet')" id="cat-btn-ewallet" class="cat-btn flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition font-bold text-center gap-2 shadow-xs cursor-pointer">
              <div class="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
              </div>
              <span class="text-sm">E-Wallet</span>
          </button>
          <button onclick="selectCategory('game')" id="cat-btn-game" class="cat-btn flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition font-bold text-center gap-2 shadow-xs cursor-pointer">
              <div class="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"></path></svg>
              </div>
              <span class="text-sm">Voucher Game</span>
          </button>
          <button onclick="selectCategory('wifiID')" id="cat-btn-wifiID" class="cat-btn flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition font-bold text-center gap-2 shadow-xs cursor-pointer">
              <div class="w-12 h-12 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
              </div>
              <span class="text-sm">Wifi ID</span>
          </button>
      </div>

      <!-- Main Interaction Form -->
      <div class="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm mb-8">
          <!-- Input Nomor HP / ID Pelanggan & Quick Re-Order Favorites -->
          <div class="mb-6">
              <div class="flex items-center justify-between mb-2">
                  <label id="input-label" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Nomor Handphone Tujuan
                  </label>
                  ${currentUser ? `
                  <div class="flex items-center gap-2">
                      <button type="button" onclick="openContactBookModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-xl border border-sky-200 transition cursor-pointer shadow-2xs">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                          <span>Buku Kontak</span>
                      </button>
                      <button type="button" onclick="quickSaveCurrentContact()" class="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition cursor-pointer shadow-2xs" title="Simpan nomor ini ke Favorit">
                          <span>⭐</span>
                          <span>Simpan</span>
                      </button>
                  </div>
                  ` : `
                  <a href="/login" class="text-xs text-slate-400 hover:text-sky-600 transition flex items-center gap-1">
                      <span>📖</span>
                      <span>Login untuk simpan nomor favorit</span>
                  </a>
                  `}
              </div>

              <div class="relative">
                  <input type="tel" id="customerNoInput" oninput="handlePhoneInput(this.value)" placeholder="Contoh: 081234567890"
                         class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl py-4 pl-4 pr-36 text-lg font-mono font-bold text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none transition">
                  <!-- Operator Badge Detected -->
                  <div id="operatorBadge" class="absolute right-3 top-1/2 -translate-y-1/2 hidden items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                      <span id="operatorLogo" class="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
                      <span id="operatorName" class="text-xs font-black text-slate-800 uppercase tracking-wider">TELKOMSEL</span>
                  </div>
              </div>

              <!-- Quick Re-Order Favorite Chips Container -->
              ${currentUser ? `
              <div id="favoriteChipsWrapper" class="mt-2.5">
                  <div class="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      <span class="flex items-center gap-1.5">
                          <svg class="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                          <span>Nomor Favorit (Quick Re-Order):</span>
                      </span>
                      <button type="button" onclick="openContactBookModal()" class="text-[10px] text-sky-600 hover:underline cursor-pointer lowercase">kelola buku kontak &raquo;</button>
                  </div>
                  <div id="favoriteChipsContainer" class="flex flex-wrap items-center gap-2">
                      <span class="text-xs text-slate-400 italic">Memuat kontak favorit...</span>
                  </div>
              </div>
              ` : ''}

              <p id="helperText" class="text-xs text-slate-400 mt-2">Ketik 4 digit nomor HP untuk otomatis mendeteksi operator (Telkomsel, Indosat, XL, Axis, Tri, Smartfren, By.U).</p>
          </div>

          <!-- Brand / Provider Pills (untuk E-Wallet atau Game) -->
          <div id="brandSelectorContainer" class="hidden mb-6">
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pilih Layanan</label>
              <div id="brandPills" class="flex flex-wrap gap-2"></div>
          </div>

          <!-- Products Grid -->
          <div>
              <!-- Anti Double-Click / Idempotency 30s Lock Banner -->
              <div id="trxLockNotice" class="hidden mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-300 text-amber-900 shadow-sm flex items-center justify-between">
                  <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                          ⏳
                      </div>
                      <div>
                          <div class="font-extrabold text-sm text-amber-950 flex items-center gap-2">
                              <span>Proteksi Anti Double-Click Aktif</span>
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 uppercase">30 Detik</span>
                          </div>
                          <p class="text-xs text-amber-800 mt-0.5">Tombol transaksi dikunci sementara untuk mencegah saldo terpotong ganda saat koneksi internet lambat.</p>
                      </div>
                  </div>
                  <div class="text-right shrink-0 pl-3">
                      <span class="text-[11px] font-bold text-amber-700 block uppercase tracking-wider">Terkunci</span>
                      <span id="trxLockTimerBadge" class="text-2xl font-black font-mono text-amber-900">30s</span>
                  </div>
              </div>

              <div class="flex items-center justify-between mb-4">
                  <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wider" id="productListTitle">Pilihan Produk</h3>
                  <span id="productCountBadge" class="text-xs text-slate-400 font-medium">0 produk tersedia</span>
              </div>

              <!-- Loading Skeleton -->
              <div id="productsLoading" class="hidden grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div class="p-5 rounded-2xl border border-slate-200 animate-pulse bg-slate-50 h-28"></div>
                  <div class="p-5 rounded-2xl border border-slate-200 animate-pulse bg-slate-50 h-28"></div>
                  <div class="p-5 rounded-2xl border border-slate-200 animate-pulse bg-slate-50 h-28"></div>
              </div>

              <!-- Empty State -->
              <div id="productsEmpty" class="text-center py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                  <svg class="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                  <p class="text-slate-600 font-bold text-sm mb-1">Silakan masukkan nomor tujuan di atas</p>
                  <p class="text-slate-400 text-xs">Daftar denominasi dan harga akan otomatis tampil.</p>
              </div>

              <!-- Real Products Grid -->
              <div id="productsGrid" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"></div>
          </div>
      </div>
  </div>

  <!-- MODAL BUKU KONTAK & NOMOR FAVORIT -->
  <div id="contactBookModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs hidden z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto" onclick="if(event.target === this) closeContactBookModal()">
      <div class="bg-white rounded-3xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          <!-- Modal Header -->
          <div class="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
              <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/30 text-lg">
                      📖
                  </div>
                  <div>
                      <h3 class="text-xl font-black text-slate-900 tracking-tight">Buku Kontak & Nomor Favorit</h3>
                      <p class="text-xs text-slate-500">Pilih nomor yang tersimpan untuk langsung mengisi transaksi 1-klik</p>
                  </div>
              </div>
              <button onclick="closeContactBookModal()" class="text-slate-400 hover:text-slate-800 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto space-y-5 flex-1">
              <!-- Search & Filter Tab Row -->
              <div>
                  <div class="relative mb-3">
                      <input type="text" id="contactSearchInput" oninput="filterModalContacts(this.value)" placeholder="Cari nama kontak atau nomor..."
                             class="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 focus:bg-white focus:border-sky-500 focus:outline-none transition">
                      <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                  </div>

                  <!-- Category filter pills in modal -->
                  <div class="flex flex-wrap gap-1.5" id="modalCategoryPills">
                      <button type="button" onclick="setModalContactCategory('all')" class="modal-cat-pill active px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-sky-600 text-white" data-cat="all">Semua</button>
                      <button type="button" onclick="setModalContactCategory('pulsa')" class="modal-cat-pill px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="pulsa">📱 Pulsa/Data</button>
                      <button type="button" onclick="setModalContactCategory('pln')" class="modal-cat-pill px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="pln">⚡ PLN</button>
                      <button type="button" onclick="setModalContactCategory('ewallet')" class="modal-cat-pill px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="ewallet">💳 E-Wallet</button>
                      <button type="button" onclick="setModalContactCategory('game')" class="modal-cat-pill px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="game">🎮 Game</button>
                      <button type="button" onclick="setModalContactCategory('wifiID')" class="modal-cat-pill px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer bg-slate-100 text-slate-600 hover:bg-slate-200" data-cat="wifiID">📶 Wifi ID</button>
                  </div>
              </div>

              <!-- Contact List -->
              <div id="modalContactsList" class="space-y-2 max-h-64 overflow-y-auto pr-1">
                  <!-- Rendered dynamically -->
              </div>

              <!-- Form Tambah Kontak Baru -->
              <div class="border-t border-slate-200 pt-4">
                  <div class="flex items-center justify-between mb-3 cursor-pointer" onclick="toggleAddContactForm()">
                      <span class="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <span>➕</span> Tambah Kontak Baru
                      </span>
                      <span id="toggleAddIcon" class="text-xs text-sky-600 font-bold">Buka Form &darr;</span>
                  </div>

                  <form id="addContactForm" onsubmit="saveNewContactFromModal(event)" class="hidden space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                          <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nama / Label Kontak</label>
                          <input type="text" id="newContactLabel" required placeholder="Contoh: Meteran Rumah / Ibu / Kantor"
                                 class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none">
                      </div>
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                              <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Nomor HP / ID Pelanggan</label>
                              <input type="text" id="newContactNumber" required placeholder="Contoh: 08123456789 atau 141234..."
                                     class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none">
                          </div>
                          <div>
                              <label class="block text-[11px] font-bold text-slate-500 uppercase mb-1">Kategori</label>
                              <select id="newContactCategory" class="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none">
                                  <option value="pulsa">📱 Pulsa & Paket Data</option>
                                  <option value="pln">⚡ Token PLN</option>
                                  <option value="ewallet">💳 E-Wallet</option>
                                  <option value="game">🎮 Voucher Game</option>
                                  <option value="wifiID">📶 Wifi ID</option>
                                  <option value="all">🌐 Semua Kategori</option>
                              </select>
                          </div>
                      </div>
                      <div class="text-right pt-1">
                          <button type="submit" class="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-xs cursor-pointer">
                              Simpan Kontak
                          </button>
                      </div>
                  </form>
              </div>
          </div>

          <!-- Modal Footer -->
          <div class="p-4 border-t border-slate-200 bg-slate-50/60 flex justify-between items-center text-xs text-slate-500">
              <span id="contactCountStatus">0 kontak tersimpan</span>
              <button onclick="closeContactBookModal()" class="px-4 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition cursor-pointer">
                  Tutup
              </button>
          </div>
      </div>
  </div>

  <style>
      .cat-btn.active {
          border-color: #0284c7 !important;
          background-color: #f0f9ff !important;
          color: #0369a1 !important;
      }
      .cat-btn:not(.active) {
          border-color: #e2e8f0;
          background-color: #ffffff;
          color: #64748b;
      }
      .cat-btn:not(.active):hover {
          border-color: #cbd5e1;
          background-color: #f8fafc;
      }
      .modal-cat-pill.active {
          background-color: #0284c7 !important;
          color: #ffffff !important;
      }
  </style>

  <script>
      function escapeHtmlClient(str) {
          if (!str) return '';
          return String(str)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
      }

      const isUserLoggedIn = ${currentUser ? 'true' : 'false'};
      let userContacts = [];
      let modalActiveCategory = 'all';
      let modalSearchQuery = '';

      let currentCategory = 'pulsa';
      let currentBrand = '';
      let detectedBrand = '';
      let cachedProducts = [];

      const BRAND_NAMES = {
          'TELKOMSEL': 'Telkomsel',
          'INDOSAT': 'Indosat IM3',
          'XL': 'XL Axiata',
          'AXIS': 'Axis',
          'TRI': 'Tri (3)',
          'SMARTFREN': 'Smartfren',
          'BYU': 'By.U',
          'PLN': 'Token PLN',
          'DANA': 'DANA',
          'GOPAY': 'GoPay',
          'OVO': 'OVO',
          'SHOPEEPAY': 'Shopee / ShopeePay',
          'GAME': 'Game',
          'WIFIID': 'Wifi ID'
      };

      function selectCategory(cat, targetBrand = '') {
          currentCategory = cat;
          try {
              const hashTarget = targetBrand ? '#' + targetBrand.toLowerCase() : '#' + cat;
              if (window.location.hash !== hashTarget) {
                  history.replaceState(null, '', hashTarget);
              }
          } catch(e) {}
          document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
          const btn = document.getElementById('cat-btn-' + cat);
          if (btn) btn.classList.add('active');

          const input = document.getElementById('customerNoInput');
          const label = document.getElementById('input-label');
          const helper = document.getElementById('helperText');
          const brandContainer = document.getElementById('brandSelectorContainer');

          if (cat === 'pln') {
              label.innerText = 'Nomor Meter / ID Pelanggan PLN';
              input.placeholder = 'Contoh: 14510906234 (11-12 digit)';
              helper.innerText = 'Masukkan 11-12 digit ID Pelanggan atau Nomor Meter PLN.';
              brandContainer.classList.add('hidden');
              currentBrand = 'PLN';
              fetchProducts();
          } else if (cat === 'ewallet') {
              label.innerText = 'Nomor HP Akun Shopee / E-Wallet';
              input.placeholder = 'Contoh: 081234567890';
              helper.innerText = 'Pilih e-wallet (Shopee, DANA, GoPay, OVO) lalu masukkan nomor HP yang terdaftar.';
              brandContainer.classList.remove('hidden');
              const ewalletBrands = ['SHOPEEPAY', 'DANA', 'GOPAY', 'OVO'];
              const selectedBrand = targetBrand && ewalletBrands.includes(targetBrand.toUpperCase()) ? targetBrand.toUpperCase() : 'SHOPEEPAY';
              renderBrandPills(ewalletBrands, selectedBrand);
              currentBrand = selectedBrand;
              fetchProducts();
          } else if (cat === 'game') {
              label.innerText = 'User ID Akun Game';
              input.placeholder = 'Masukkan User ID (Contoh: 12345678)';
              helper.innerText = 'Pilih game lalu masukkan User ID & Server ID.';
              brandContainer.classList.remove('hidden');
              renderBrandPills(['GAME'], 'GAME');
              currentBrand = 'GAME';
              fetchProducts();
          } else if (cat === 'wifiID') {
              label.innerText = 'Nomor HP / WhatsApp Penerima Voucher';
              input.placeholder = 'Contoh: 081234567890 (Untuk kirim kode voucher)';
              helper.innerText = 'Kode voucher Wifi ID & username/password akan langsung dikirim ke Inbox & WhatsApp penerima.';
              brandContainer.classList.add('hidden');
              currentBrand = 'WIFIID';
              fetchProducts();
          } else {
              label.innerText = 'Nomor Handphone Tujuan';
              input.placeholder = 'Contoh: 081234567890';
              helper.innerText = 'Ketik 4 digit nomor HP untuk otomatis mendeteksi operator.';
              brandContainer.classList.add('hidden');
              handlePhoneInput(input.value);
          }
          renderFavoriteChips();
      }

      function renderBrandPills(brands, activeBrand = '') {
          const container = document.getElementById('brandPills');
          const targetActive = activeBrand || brands[0];
          container.innerHTML = brands.map((b) => \`
              <button onclick="setBrand('\${b}')" id="pill-\${b}" class="brand-pill \${b === targetActive ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'} font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer">
                  \${BRAND_NAMES[b] || b}
              </button>
          \`).join('');
      }

      function setBrand(brand) {
          currentBrand = brand;
          document.querySelectorAll('.brand-pill').forEach(btn => {
              btn.classList.remove('bg-sky-600', 'text-white');
              btn.classList.add('bg-slate-100', 'text-slate-700');
          });
          const activeBtn = document.getElementById('pill-' + brand);
          if (activeBtn) {
              activeBtn.classList.remove('bg-slate-100', 'text-slate-700');
              activeBtn.classList.add('bg-sky-600', 'text-white');
          }
          fetchProducts();
      }

      async function handlePhoneInput(val) {
          const clean = val.replace(/\\D/g, '');
          const badge = document.getElementById('operatorBadge');
          const nameSpan = document.getElementById('operatorName');

          if (currentCategory === 'pln' || currentCategory === 'ewallet' || currentCategory === 'game' || currentCategory === 'wifiID') {
              badge.classList.add('hidden');
              return;
          }

          if (clean.length >= 4) {
              try {
                  const res = await fetch('/api/ppob/detect-operator?phone=' + clean);
                  const data = await res.json();
                  if (data.success && data.brand) {
                      detectedBrand = data.brand;
                      currentBrand = data.brand;
                      nameSpan.innerText = BRAND_NAMES[data.brand] || data.brand;
                      badge.classList.remove('hidden');
                      badge.classList.add('flex');
                      fetchProducts();
                      return;
                  }
              } catch(e) {}
          }

          badge.classList.add('hidden');
          if (clean.length < 4) {
              currentBrand = '';
              document.getElementById('productsGrid').innerHTML = '';
              document.getElementById('productsEmpty').classList.remove('hidden');
              document.getElementById('productCountBadge').innerText = '0 produk';
          }
      }

      async function fetchProducts() {
          const loading = document.getElementById('productsLoading');
          const grid = document.getElementById('productsGrid');
          const empty = document.getElementById('productsEmpty');
          const countBadge = document.getElementById('productCountBadge');

          loading.classList.remove('hidden');
          grid.innerHTML = '';
          empty.classList.add('hidden');

          try {
              let url = '/api/ppob/products?category=' + currentCategory;
              if (currentBrand) url += '&brand=' + currentBrand;

              const res = await fetch(url);
              const data = await res.json();
              loading.classList.add('hidden');

              if (data.success && data.products && data.products.length > 0) {
                  let list = data.products;
                  if (currentCategory === 'wifiID') {
                      list = list.filter(p => {
                          const code = (p.product_code || '').toLowerCase();
                          const name = (p.product_name || '').toLowerCase();
                          return !code.startsWith('adh') && !code.startsWith('adw') && !name.includes('modem');
                      });
                  }
                  cachedProducts = list;
                  countBadge.innerText = list.length + ' produk tersedia';
                  renderProductCards(list);
              } else {
                  empty.classList.remove('hidden');
                  countBadge.innerText = '0 produk';
              }
          } catch(e) {
              loading.classList.add('hidden');
              empty.classList.remove('hidden');
          }
      }

      const TRX_LOCK_STORAGE_KEY = 'wp_trx_lock_until';
      let trxLockInterval = null;

      function getTrxLockUntil() {
          try {
              return parseInt(localStorage.getItem(TRX_LOCK_STORAGE_KEY) || '0', 10);
          } catch(e) {
              return 0;
          }
      }

      function isTrxLocked() {
          return getTrxRemainingSeconds() > 0;
      }

      function getTrxRemainingSeconds() {
          const lockUntil = getTrxLockUntil();
          const now = Date.now();
          if (lockUntil > now) {
              return Math.ceil((lockUntil - now) / 1000);
          }
          return 0;
      }

      function setTrxLock(seconds = 30) {
          try {
              const expireAt = Date.now() + (seconds * 1000);
              localStorage.setItem(TRX_LOCK_STORAGE_KEY, String(expireAt));
          } catch(e) {}
          startTrxLockCountdown();
      }

      function clearTrxLock() {
          try {
              localStorage.removeItem(TRX_LOCK_STORAGE_KEY);
          } catch(e) {}
          if (trxLockInterval) {
              clearInterval(trxLockInterval);
              trxLockInterval = null;
          }
          const notice = document.getElementById('trxLockNotice');
          if (notice) notice.classList.add('hidden');
          updateAllButtonsLockState(0);
      }

      function startTrxLockCountdown() {
          if (trxLockInterval) clearInterval(trxLockInterval);

          const tick = () => {
              const remaining = getTrxRemainingSeconds();
              const notice = document.getElementById('trxLockNotice');
              const badge = document.getElementById('trxLockTimerBadge');

              if (remaining <= 0) {
                  clearTrxLock();
                  return;
              }

              if (notice) notice.classList.remove('hidden');
              if (badge) badge.innerText = remaining + 's';
              updateAllButtonsLockState(remaining);
          };

          tick();
          trxLockInterval = setInterval(tick, 1000);
      }

      function updateAllButtonsLockState(remaining = 0) {
          const isLocked = remaining > 0;
          document.querySelectorAll('.btn-buy-product').forEach(btn => {
              if (isLocked) {
                  btn.disabled = true;
                  btn.classList.remove('bg-sky-600', 'hover:bg-sky-500', 'cursor-pointer');
                  btn.classList.add('bg-slate-300', 'text-slate-600', 'cursor-not-allowed');
                  btn.innerText = '⏳ Tunggu (' + remaining + 's)';
              } else {
                  btn.disabled = false;
                  btn.classList.add('bg-sky-600', 'hover:bg-sky-500', 'cursor-pointer');
                  btn.classList.remove('bg-slate-300', 'text-slate-600', 'cursor-not-allowed');
                  btn.innerText = 'Beli';
              }
          });
      }

      function renderProductCards(products) {
          const grid = document.getElementById('productsGrid');
          const remaining = getTrxRemainingSeconds();
          const isLocked = remaining > 0;

          let list = products;
          if (currentCategory === 'wifiID') {
              list = products.filter(p => {
                  const code = (p.product_code || '').toLowerCase();
                  const name = (p.product_name || '').toLowerCase();
                  return !code.startsWith('adh') && !code.startsWith('adw') && !name.includes('modem');
              });
          }

          grid.innerHTML = list.map(p => \`
              <div onclick="handleCardClick('\${p.product_code}')" class="p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-sky-500 hover:shadow-lg transition cursor-pointer flex flex-col justify-between group">
                  <div>
                      <div class="flex items-start justify-between gap-2 mb-2">
                          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                              \${p.brand}
                          </span>
                          <span class="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Instan 24 Jam
                          </span>
                      </div>
                      <h4 class="font-extrabold text-slate-900 text-base mb-1 group-hover:text-sky-600 transition">
                          \${escapeHtmlClient(p.product_name)}
                      </h4>
                      <p class="text-xs text-slate-400 line-clamp-2 mb-4">
                          \${escapeHtmlClient(p.description || p.product_name)}
                      </p>
                  </div>
                  <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div class="text-lg font-black text-sky-600 font-mono">
                          Rp \${Number(p.selling_price).toLocaleString('id-ID')}
                      </div>
                      <button type="button" class="btn-buy-product \${isLocked ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer'} font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs" \${isLocked ? 'disabled' : ''}>
                          \${isLocked ? '⏳ Tunggu (' + remaining + 's)' : 'Beli'}
                      </button>
                  </div>
              </div>
          \`).join('');
      }

      function handleCardClick(productCode) {
          if (!isUserLoggedIn) {
              const product = cachedProducts.find(p => p.product_code === productCode);
              const prodName = product ? product.product_name : 'produk ini';
              swalDark.fire({
                  title: 'Silakan Masuk Terlebih Dahulu',
                  html: \`Untuk membeli <b>\${escapeHtmlClient(prodName)}</b>, Anda perlu masuk ke akun terlebih dahulu.<br><br><span class="text-xs text-slate-500">Cukup 1-klik masuk dengan akun Google tanpa ribet.</span>\`,
                  icon: 'info',
                  showCancelButton: true,
                  confirmButtonText: 'Masuk Sekarang',
                  cancelButtonText: 'Nanti Saja',
                  confirmButtonColor: '#0284c7'
              }).then(res => {
                  if (res.isConfirmed) {
                      window.location.href = '/login';
                  }
              });
              return;
          }

          if (isTrxLocked()) {
              const rem = getTrxRemainingSeconds();
              swalDark.fire({
                  title: 'Tombol Transaksi Dikunci',
                  html: \`Tombol transaksi dikunci selama <b>\${rem} detik</b> untuk mencegah saldo terpotong ganda saat koneksi lambat.<br><br><span class="text-xs text-slate-500">Silakan tunggu hitungan mundur selesai.</span>\`,
                  icon: 'warning',
                  timer: 3500,
                  timerProgressBar: true
              });
              return;
          }
          confirmOrder(productCode);
      }

      async function confirmOrder(productCode) {
          if (!isUserLoggedIn) {
              swalDark.fire({
                  title: 'Silakan Masuk Terlebih Dahulu',
                  text: 'Anda perlu masuk terlebih dahulu untuk melakukan pembelian.',
                  icon: 'warning',
                  showCancelButton: true,
                  confirmButtonText: 'Masuk Sekarang',
                  cancelButtonText: 'Batal',
                  confirmButtonColor: '#0284c7'
              }).then(res => {
                  if (res.isConfirmed) {
                      window.location.href = '/login';
                  }
              });
              return;
          }

          if (isTrxLocked()) {
              const rem = getTrxRemainingSeconds();
              swalDark.fire({
                  title: 'Tombol Transaksi Dikunci',
                  html: \`Tombol transaksi sedang dikunci selama <b>\${rem} detik</b> untuk proteksi saldo ganda.\`,
                  icon: 'warning',
                  timer: 3000,
                  timerProgressBar: true
              });
              return;
          }

          const product = cachedProducts.find(p => p.product_code === productCode);
          if (!product) return;

          const customerNo = document.getElementById('customerNoInput').value.trim();
          if (!customerNo) {
              swalDark.fire('Perhatian', 'Silakan masukkan nomor tujuan terlebih dahulu!', 'warning');
              document.getElementById('customerNoInput').focus();
              return;
          }

          const result = await swalDark.fire({
              title: 'Konfirmasi Pembelian',
              html: \`
                  <div class="text-left space-y-3 p-2 text-sm">
                      <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <p class="text-xs text-slate-500 font-medium">Produk</p>
                          <p class="font-bold text-slate-900 text-base">\${product.product_name}</p>
                      </div>
                      <div class="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <p class="text-xs text-slate-500 font-medium">Nomor Tujuan</p>
                          <p class="font-bold text-sky-600 font-mono text-base">\${customerNo}</p>
                      </div>
                      <div class="flex justify-between items-center bg-sky-50 p-3 rounded-xl border border-sky-200">
                          <span class="text-sm font-bold text-sky-900">Total Harga</span>
                          <span class="text-lg font-black text-sky-700 font-mono">Rp \${Number(product.selling_price).toLocaleString('id-ID')}</span>
                      </div>
                      <p class="text-xs text-slate-500 italic">*Pembayaran akan langsung memotong saldo akun AwanPulsa Anda.</p>
                  </div>
              \`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Bayar Sekarang',
              cancelButtonText: 'Batal',
              confirmButtonColor: '#0284c7',
              showLoaderOnConfirm: true,
              preConfirm: () => {
                  const confirmBtn = Swal.getConfirmButton();
                  if (confirmBtn) {
                      confirmBtn.disabled = true;
                      confirmBtn.innerText = 'Memproses...';
                  }
                  return true;
              }
          });

          if (result.isConfirmed) {
              executeOrder(product.product_code, customerNo);
          }
      }

      async function executeOrder(productCode, customerNo) {
          // Kunci tombol transaksi selama 30 detik setelah diklik
          setTrxLock(30);

          const overlay = document.getElementById('loadingOverlay');
          if (overlay) overlay.classList.remove('hidden');

          try {
              const res = await fetch('/api/ppob/order', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ product_code: productCode, customer_no: customerNo })
              });
              const data = await res.json();
              if (overlay) overlay.classList.add('hidden');

              if (res.status === 401) {
                  swalDark.fire({
                      title: 'Silakan Masuk Terlebih Dahulu',
                      text: data.message || 'Silakan login terlebih dahulu untuk melakukan transaksi.',
                      icon: 'warning',
                      confirmButtonText: 'Masuk Sekarang',
                      confirmButtonColor: '#0284c7'
                  }).then(() => {
                      window.location.href = '/login';
                  });
                  return;
              }

              if (res.status === 429 && data.locked) {
                  setTrxLock(data.remaining_seconds || 30);
                  swalDark.fire('Proteksi Anti Double-Click', data.message, 'warning');
                  return;
              }

              if (data.success) {
                  if (isUserLoggedIn) {
                      loadUserContacts();
                  }
                  const isPending = data.status === 'pending';
                  const isSuccess = data.status === 'success';
                  const isFailed = data.status === 'failed';
                  const prodNameLower = (data.product_name || '').toLowerCase();
                  const isPln = currentCategory === 'pln' || prodNameLower.includes('pln') || prodNameLower.includes('token');
                  const isWifi = currentCategory === 'wifiID' || prodNameLower.includes('wifi');
                  const isGame = currentCategory === 'game';
                  const isEwallet = currentCategory === 'ewallet';

                  let codeName = 'Serial Number (SN)';
                  let modalIconEmoji = '📱';
                  let snLabel = 'SERIAL NUMBER (SN) / BUKTI:';

                  if (isPln) {
                      codeName = 'kode token PLN';
                      modalIconEmoji = '⚡';
                      snLabel = 'KODE TOKEN PLN (20 DIGIT):';
                  } else if (isWifi) {
                      codeName = 'kode voucher / akun Wifi ID';
                      modalIconEmoji = '📶';
                      snLabel = 'KODE VOUCHER / USERNAME & PASSWORD:';
                  } else if (isEwallet) {
                      codeName = 'nomor referensi';
                      modalIconEmoji = '💳';
                      snLabel = 'NOMOR REFERENSI:';
                  } else if (isGame) {
                      codeName = 'kode voucher game';
                      modalIconEmoji = '🎮';
                      snLabel = 'KODE VOUCHER / SN GAME:';
                  }

                  const snText = data.sn ? \`<div class="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl mt-3 text-center"><p class="text-xs text-emerald-700 font-bold mb-1 tracking-wide">\${snLabel}</p><p class="font-mono font-black text-emerald-900 text-lg select-all tracking-wider">\${data.sn}</p></div>\` : '';

                  let modalTitle = modalIconEmoji + ' Pesanan Diproses!';
                  let modalIcon = 'info';
                  let statusColorClass = 'bg-amber-100 text-amber-700';
                  let statusDesc = \`
                      <div class="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-sky-950 text-xs leading-relaxed space-y-1.5">
                          <b class="text-sky-800 flex items-center gap-1.5 text-sm">
                              <svg class="w-4 h-4 text-sky-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              Anda Tidak Perlu Menunggu di Halaman Ini!
                          </b>
                          <p>Pesanan telah diterima server provider. Server kami otomatis memproses di latar belakang dan <b>\${codeName} akan otomatis masuk ke Kotak Masuk (Inbox)</b> akun Anda begitu diterbitkan (biasanya 5–30 detik).</p>
                      </div>
                  \`;

                  if (isSuccess) {
                      modalTitle = 'Transaksi Berhasil!';
                      modalIcon = 'success';
                      statusColorClass = 'bg-emerald-100 text-emerald-700';
                      statusDesc = \`<p class="text-xs text-slate-600 leading-relaxed">Pesanan Anda telah <b>berhasil diproses</b> oleh provider! \${codeName} juga telah otomatis disimpan ke <b>Kotak Masuk (Inbox)</b> akun Anda.</p>\`;
                  } else if (isFailed) {
                      modalTitle = 'Transaksi Gagal / Ditolak';
                      modalIcon = 'error';
                      statusColorClass = 'bg-rose-100 text-rose-700';
                      statusDesc = '<p class="text-xs text-slate-600 leading-relaxed">Transaksi ditolak oleh server provider dan <b class="text-emerald-600">saldo Anda telah otomatis dikembalikan (Refund 100% Instan)</b> ke akun Anda.</p>';
                  }

                  const result = await swalDark.fire({
                      title: modalTitle,
                      html: \`
                          <div class="text-left space-y-3 text-sm">
                              \${statusDesc}
                              <div class="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5 font-medium">
                                  <div class="flex justify-between"><b>Ref ID:</b> <span class="font-mono text-slate-600">\${data.reqid}</span></div>
                                  <div class="flex justify-between"><b>Produk:</b> <span class="text-slate-900">\${escapeHtmlClient(data.product_name)}</span></div>
                                  <div class="flex justify-between"><b>Tujuan:</b> <span class="font-mono text-slate-900 font-bold">\${escapeHtmlClient(data.customer_no)}</span></div>
                                  <div class="flex justify-between items-center pt-1.5 border-t border-slate-200">
                                      <b>Status:</b>
                                      <span class="font-bold uppercase px-2.5 py-0.5 rounded-md text-[11px] \${statusColorClass}">
                                          \${isPending ? 'SEDANG DIPROSES' : data.status}
                                      </span>
                                  </div>
                                  \${data.message ? \`
                                  <div class="mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
                                      <b>Pesan Provider:</b> \${escapeHtmlClient(data.message)}
                                      \${data.message.includes('device anda tidak terdaftar') ? '<br><span class="text-[11px] text-slate-600 mt-1 block"><b>Solusi:</b> Daftarkan IP Server VPS Anda ke Admin / CS Toko Gorontalo agar di-whitelist.</span>' : ''}
                                      \${data.message.toLowerCase().includes('saldo tidak cukup') ? '<br><span class="text-[11px] text-amber-700 font-medium mt-1 block"><b>Catatan:</b> Ini adalah saldo deposit host di server Toko Gorontalo yang sedang menipis/kurang dari modal produk. Saldo dompet Anda sendiri 100% aman dan telah otomatis dikembalikan secara utuh.</span>' : ''}
                                  </div>
                                  \` : ''}
                              </div>
                              \${snText}
                              <p class="text-[11px] text-slate-400 italic mt-2">Pemberitahuan resmi dan bukti transaksi dapat dicek kapan saja di menu <b>Kotak Masuk (Inbox)</b>.</p>
                          </div>
                      \`,
                      icon: modalIcon,
                      showCancelButton: isPending || isSuccess,
                      confirmButtonText: (isPending || isSuccess) ? 'Buka Kotak Masuk' : 'Tutup',
                      cancelButtonText: 'Tutup / Tetap di Sini',
                      confirmButtonColor: '#0284c7'
                  });

                  if (result.isConfirmed && (isPending || isSuccess)) {
                      window.location.href = '/inbox';
                  } else {
                      window.location.reload();
                  }
              } else {
                  if (!data.locked) {
                      clearTrxLock();
                  }
                  swalDark.fire('Gagal', data.message || 'Transaksi gagal diproses', 'error');
              }
          } catch(e) {
              document.getElementById('loadingOverlay').classList.add('hidden');
              swalDark.fire('Error', 'Terjadi kesalahan jaringan: ' + e.message, 'error');
          }
      }

      // ================================================================
      // BUKU KONTAK & NOMOR FAVORIT (QUICK RE-ORDER) CLIENT LOGIC
      // ================================================================
      async function loadUserContacts() {
          if (!isUserLoggedIn) return;
          try {
              const res = await fetch('/api/contacts');
              const data = await res.json();
              if (data.success && Array.isArray(data.contacts)) {
                  userContacts = data.contacts;
                  renderFavoriteChips();
                  renderModalContacts();
              }
          } catch(e) {
              console.warn('[Contacts Load Error]:', e.message);
          }
      }

      function getCategoryIcon(cat) {
          switch((cat || '').toLowerCase()) {
              case 'pln': return '⚡';
              case 'ewallet': return '💳';
              case 'game': return '🎮';
              case 'wifiid': return '📶';
              case 'pulsa':
              case 'data': return '📱';
              default: return '⭐';
          }
      }

      function getCategoryBadgeLabel(cat) {
          switch((cat || '').toLowerCase()) {
              case 'pln': return 'PLN';
              case 'pulsa': return 'PULSA';
              case 'data': return 'DATA';
              case 'ewallet': return 'E-WALLET';
              case 'game': return 'GAME';
              case 'wifiid': return 'WIFI ID';
              default: return 'SEMUA';
          }
      }

      function renderFavoriteChips() {
          const container = document.getElementById('favoriteChipsContainer');
          if (!container) return;

          if (!isUserLoggedIn) {
              container.innerHTML = '';
              return;
          }

          let matched = userContacts.filter(c => {
              if (!c.category || c.category === 'all') return true;
              if (currentCategory === 'pln') return c.category === 'pln';
              if (currentCategory === 'pulsa' || currentCategory === 'data') return c.category === 'pulsa' || c.category === 'data';
              if (currentCategory === 'ewallet') return c.category === 'ewallet';
              if (currentCategory === 'game') return c.category === 'game';
              if (currentCategory === 'wifiID') return c.category === 'wifiid' || c.category === 'wifiID';
              return true;
          });

          if (matched.length === 0) {
              container.innerHTML = \`
                  <div class="flex items-center gap-1.5 text-xs text-slate-400 py-0.5">
                      <span>Nomor HP atau ID PLN yang Anda transaksikan akan <b>otomatis tersimpan</b> di sini untuk Quick Re-Order 1-klik di masa depan.</span>
                  </div>
              \`;
              return;
          }

          const displayChips = matched.slice(0, 8);
          let html = displayChips.map(c => {
              const icon = getCategoryIcon(c.category);
              return \`
                  <button type="button" onclick="selectContact('\${escapeHtmlClient(c.customer_no)}')"
                          class="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 border border-slate-200 transition cursor-pointer shadow-2xs">
                      <span class="text-xs">\${icon}</span>
                      <span class="font-bold text-slate-800 group-hover:text-sky-700">\${escapeHtmlClient(c.label)}</span>
                      <span class="text-slate-400 font-mono text-[11px]">(\${escapeHtmlClient(c.customer_no)})</span>
                  </button>
              \`;
          }).join('');

          if (matched.length > 8) {
              html += \`
                  <button type="button" onclick="openContactBookModal()" class="text-xs font-bold text-sky-600 hover:text-sky-800 px-2 py-1 cursor-pointer">
                      +\${matched.length - 8} lainnya &raquo;
                  </button>
              \`;
          }

          container.innerHTML = html;
      }

      function selectContact(customerNo) {
          const input = document.getElementById('customerNoInput');
          if (!input) return;
          input.value = customerNo;
          closeContactBookModal();
          input.focus();

          input.classList.add('ring-4', 'ring-sky-200', 'border-sky-500');
          setTimeout(() => {
              input.classList.remove('ring-4', 'ring-sky-200');
          }, 600);

          if (currentCategory === 'pln' || currentCategory === 'ewallet' || currentCategory === 'game' || currentCategory === 'wifiID') {
              fetchProducts();
          } else {
              handlePhoneInput(customerNo);
          }
      }

      async function quickSaveCurrentContact() {
          if (!isUserLoggedIn) {
              swalDark.fire({
                  title: 'Login Diperlukan',
                  text: 'Silakan login terlebih dahulu untuk menyimpan nomor ke daftar favorit Anda.',
                  icon: 'info',
                  showCancelButton: true,
                  confirmButtonText: 'Masuk / Login',
                  cancelButtonText: 'Nanti',
                  confirmButtonColor: '#0284c7'
              }).then(res => {
                  if (res.isConfirmed) window.location.href = '/login';
              });
              return;
          }

          const input = document.getElementById('customerNoInput');
          const customerNo = input ? input.value.trim() : '';
          if (!customerNo) {
              swalDark.fire('Perhatian', 'Ketik atau masukkan nomor HP / ID Pelanggan terlebih dahulu di kotak input.', 'warning');
              if (input) input.focus();
              return;
          }

          let defaultLabel = '';
          if (currentCategory === 'pln') defaultLabel = 'Meteran Rumah';
          else if (currentCategory === 'pulsa' || currentCategory === 'data') defaultLabel = 'Nomor Pribadi';

          const { value: label } = await swalDark.fire({
              title: '⭐ Simpan ke Favorit',
              text: 'Simpan nomor ' + customerNo + ' agar bisa diisi ulang dengan 1-klik di masa depan.',
              input: 'text',
              inputLabel: 'Nama / Label Kontak:',
              inputPlaceholder: 'Contoh: Meteran Rumah, Ibu, Ayah, Kantor',
              inputValue: defaultLabel,
              showCancelButton: true,
              confirmButtonText: 'Simpan Kontak',
              cancelButtonText: 'Batal',
              confirmButtonColor: '#0284c7',
              inputValidator: (val) => {
                  if (!val || !val.trim()) {
                      return 'Label / nama kontak tidak boleh kosong!';
                  }
              }
          });

          if (label) {
              try {
                  const res = await fetch('/api/contacts', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          label: label.trim(),
                          customer_no: customerNo,
                          category: currentCategory || 'all'
                      })
                  });
                  const data = await res.json();
                  if (data.success) {
                      swalDark.fire({
                          title: 'Berhasil Disimpan!',
                          text: 'Nomor ' + customerNo + ' (' + label + ') berhasil ditambahkan ke Buku Kontak Favorit Anda.',
                          icon: 'success',
                          timer: 2000,
                          showConfirmButton: false
                      });
                      await loadUserContacts();
                  } else {
                      swalDark.fire('Gagal Menyimpan', data.message || 'Terjadi kesalahan saat menyimpan kontak.', 'error');
                  }
              } catch(e) {
                  swalDark.fire('Error', 'Kesalahan jaringan: ' + e.message, 'error');
              }
          }
      }

      function openContactBookModal() {
          if (!isUserLoggedIn) {
              swalDark.fire({
                  title: 'Login Diperlukan',
                  text: 'Silakan login terlebih dahulu untuk mengakses Buku Kontak Favorit.',
                  icon: 'info',
                  showCancelButton: true,
                  confirmButtonText: 'Masuk / Login',
                  cancelButtonText: 'Batal',
                  confirmButtonColor: '#0284c7'
              }).then(res => {
                  if (res.isConfirmed) window.location.href = '/login';
              });
              return;
          }

          const modal = document.getElementById('contactBookModal');
          if (!modal) return;

          const currentInputVal = document.getElementById('customerNoInput') ? document.getElementById('customerNoInput').value.trim() : '';
          const newNumInput = document.getElementById('newContactNumber');
          if (newNumInput && currentInputVal && !newNumInput.value) {
              newNumInput.value = currentInputVal;
          }

          const catSelect = document.getElementById('newContactCategory');
          if (catSelect && currentCategory) {
              catSelect.value = currentCategory;
          }

          renderModalContacts();
          modal.classList.remove('hidden');
      }

      function closeContactBookModal() {
          const modal = document.getElementById('contactBookModal');
          if (modal) modal.classList.add('hidden');
      }

      function setModalContactCategory(cat) {
          modalActiveCategory = cat;
          document.querySelectorAll('.modal-cat-pill').forEach(btn => {
              if (btn.getAttribute('data-cat') === cat) {
                  btn.classList.remove('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
                  btn.classList.add('bg-sky-600', 'text-white');
              } else {
                  btn.classList.remove('bg-sky-600', 'text-white');
                  btn.classList.add('bg-slate-100', 'text-slate-600', 'hover:bg-slate-200');
              }
          });
          renderModalContacts();
      }

      function filterModalContacts(val) {
          modalSearchQuery = (val || '').trim().toLowerCase();
          renderModalContacts();
      }

      function renderModalContacts() {
          const listContainer = document.getElementById('modalContactsList');
          const countStatus = document.getElementById('contactCountStatus');
          if (!listContainer) return;

          let filtered = userContacts.filter(c => {
              if (modalActiveCategory !== 'all') {
                  if (modalActiveCategory === 'pulsa') {
                      if (c.category !== 'pulsa' && c.category !== 'data' && c.category !== 'all') return false;
                  } else if (c.category !== modalActiveCategory && c.category !== 'all') {
                      return false;
                  }
              }
              if (modalSearchQuery) {
                  const l = (c.label || '').toLowerCase();
                  const n = (c.customer_no || '').toLowerCase();
                  return l.includes(modalSearchQuery) || n.includes(modalSearchQuery);
              }
              return true;
          });

          if (countStatus) {
              countStatus.innerText = \`\${userContacts.length} total kontak tersimpan (\${filtered.length} ditampilkan)\`;
          }

          if (filtered.length === 0) {
              listContainer.innerHTML = \`
                  <div class="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                      <p class="text-slate-500 font-bold text-sm mb-1">Tidak ada kontak ditemukan</p>
                      <p class="text-slate-400 text-xs">Gunakan formulir di bawah untuk menambahkan nomor favorit baru.</p>
                  </div>
              \`;
              return;
          }

          listContainer.innerHTML = filtered.map(c => {
              const icon = getCategoryIcon(c.category);
              const catBadgeLabel = getCategoryBadgeLabel(c.category);
              return \`
                  <div class="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 transition group bg-white shadow-2xs">
                      <div class="flex items-center gap-3 min-w-0">
                          <div class="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-sky-100 text-slate-600 group-hover:text-sky-700 flex items-center justify-center text-base shrink-0 transition">
                              \${icon}
                          </div>
                          <div class="min-w-0">
                              <div class="flex items-center gap-2">
                                  <span class="font-extrabold text-slate-900 text-sm truncate">\${escapeHtmlClient(c.label)}</span>
                                  <span class="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 shrink-0">
                                      \${catBadgeLabel}
                                  </span>
                              </div>
                              <div class="font-mono text-xs text-sky-600 font-bold mt-0.5 tracking-tight truncate">
                                  \${escapeHtmlClient(c.customer_no)}
                              </div>
                          </div>
                      </div>
                      <div class="flex items-center gap-2 shrink-0 ml-3">
                          <button type="button" onclick="selectContact('\${escapeHtmlClient(c.customer_no)}')"
                                  class="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition shadow-2xs cursor-pointer">
                              Gunakan
                          </button>
                          <button type="button" onclick="deleteContact(\${c.id}, '\${escapeHtmlClient(c.label)}')"
                                  class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer" title="Hapus kontak">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                      </div>
                  </div>
              \`;
          }).join('');
      }

      async function deleteContact(id, label) {
          const confirm = await swalDark.fire({
              title: 'Hapus Kontak?',
              html: \`Apakah Anda yakin ingin menghapus kontak <b>\${escapeHtmlClient(label)}</b> dari daftar favorit?\`,
              icon: 'warning',
              showCancelButton: true,
              confirmButtonText: 'Ya, Hapus',
              cancelButtonText: 'Batal',
              confirmButtonColor: '#ef4444'
          });

          if (confirm.isConfirmed) {
              try {
                  const res = await fetch('/api/contacts?id=' + id, { method: 'DELETE' });
                  const data = await res.json();
                  if (data.success) {
                      swalDark.fire({
                          title: 'Dihapus',
                          text: 'Kontak berhasil dihapus.',
                          icon: 'success',
                          timer: 1500,
                          showConfirmButton: false
                      });
                      await loadUserContacts();
                  } else {
                      swalDark.fire('Gagal', data.message || 'Gagal menghapus kontak.', 'error');
                  }
              } catch(e) {
                  swalDark.fire('Error', 'Kesalahan jaringan: ' + e.message, 'error');
              }
          }
      }

      function toggleAddContactForm(forceState) {
          const form = document.getElementById('addContactForm');
          const icon = document.getElementById('toggleAddIcon');
          if (!form) return;
          const shouldOpen = forceState !== undefined ? forceState : form.classList.contains('hidden');
          if (shouldOpen) {
              form.classList.remove('hidden');
              if (icon) icon.innerHTML = 'Tutup Form &uarr;';
          } else {
              form.classList.add('hidden');
              if (icon) icon.innerHTML = 'Buka Form &darr;';
          }
      }

      async function saveNewContactFromModal(e) {
          e.preventDefault();
          const labelInput = document.getElementById('newContactLabel');
          const numInput = document.getElementById('newContactNumber');
          const catSelect = document.getElementById('newContactCategory');

          const label = labelInput ? labelInput.value.trim() : '';
          const customer_no = numInput ? numInput.value.trim() : '';
          const category = catSelect ? catSelect.value : 'all';

          if (!customer_no) {
              swalDark.fire('Perhatian', 'Nomor / ID pelanggan wajib diisi.', 'warning');
              return;
          }

          try {
              const res = await fetch('/api/contacts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ label: label || customer_no, customer_no, category })
              });
              const data = await res.json();
              if (data.success) {
                  if (labelInput) labelInput.value = '';
                  if (numInput) numInput.value = '';
                  toggleAddContactForm(false);
                  swalDark.fire({
                      title: 'Kontak Ditambahkan',
                      text: 'Kontak baru berhasil disimpan ke buku favorit.',
                      icon: 'success',
                      timer: 1500,
                      showConfirmButton: false
                  });
                  await loadUserContacts();
              } else {
                  swalDark.fire('Gagal', data.message || 'Gagal menyimpan kontak.', 'error');
              }
          } catch(e) {
              swalDark.fire('Error', 'Kesalahan jaringan: ' + e.message, 'error');
          }
      }

      // Initial run & Hash router for F5 / Refresh
      function getValidCategoryFromHash() {
          const rawHash = (window.location.hash || '').replace('#', '').toLowerCase().trim();
          if (rawHash === 'shopee' || rawHash === 'shopeepay') {
              return { cat: 'ewallet', brand: 'SHOPEEPAY' };
          }
          if (rawHash === 'dana') {
              return { cat: 'ewallet', brand: 'DANA' };
          }
          if (rawHash === 'gopay') {
              return { cat: 'ewallet', brand: 'GOPAY' };
          }
          if (rawHash === 'ovo') {
              return { cat: 'ewallet', brand: 'OVO' };
          }
          const validCats = ['pulsa', 'data', 'pln', 'ewallet', 'game', 'wifiid'];
          if (!validCats.includes(rawHash)) return { cat: 'pulsa', brand: '' };
          return { cat: rawHash === 'wifiid' ? 'wifiID' : rawHash, brand: '' };
      }

      window.addEventListener('DOMContentLoaded', () => {
          if (isTrxLocked()) {
              startTrxLockCountdown();
          }
          if (isUserLoggedIn) {
              loadUserContacts();
          }
          const route = getValidCategoryFromHash();
          selectCategory(route.cat, route.brand);
      });

      window.addEventListener('hashchange', () => {
          const route = getValidCategoryFromHash();
          if (route.cat !== currentCategory || (route.brand && route.brand !== currentBrand)) {
              selectCategory(route.cat, route.brand);
          }
      });

      window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
              const modal = document.getElementById('contactBookModal');
              if (modal && !modal.classList.contains('hidden')) {
                  closeContactBookModal();
              }
          }
      });
  </script>
  `;
}

/**
 * Render Modal Admin Panel Toko Gorontalo
 */
function renderTokoGorontaloAdminModal(isCurrentSuperAdmin = false) {
  return `
  <!-- MODAL TOKO GORONTALO / PPOB ADMIN -->
  <div id="tokoGorontaloModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-xs hidden z-[100] flex items-center justify-center p-4 md:p-6 overflow-y-auto" onclick="if(event.target === this) closeTokoGorontaloModal()">
      <div class="bg-white rounded-3xl border border-slate-200 w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
          <!-- Modal Header -->
          <div class="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
              <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <div>
                      <h3 class="text-xl font-black text-slate-900 tracking-tight">Integrasi Toko Gorontalo (PPOB)</h3>
                      <p class="text-xs text-slate-500">Kelola Saldo Host, Sinkronisasi Produk & Margin Keuntungan</p>
                  </div>
              </div>
              <button onclick="closeTokoGorontaloModal()" class="text-slate-400 hover:text-slate-800 p-2 rounded-xl hover:bg-slate-100 transition">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
          </div>

          <!-- Modal Body -->
          <div class="p-6 overflow-y-auto custom-scrollbar space-y-6 flex-1">
              <!-- Grid Kartu Info & Saldo Host -->
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <!-- Saldo Host -->
                  <div class="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50/60 to-white">
                      <div class="flex items-center justify-between mb-2">
                          <span class="text-xs font-bold text-indigo-700 uppercase tracking-wider">Saldo Host Toko Gorontalo</span>
                          <button onclick="refreshTokoGorontaloInfo()" title="Cek Saldo Terkini" class="text-indigo-600 hover:text-indigo-800 p-1">
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                          </button>
                      </div>
                      <p id="tgSaldoDisplay" class="text-2xl font-black text-slate-900 font-mono tracking-tight">Memuat...</p>
                      <p id="tgMemberName" class="text-xs text-slate-500 mt-1">Level-3 APARAT (178082835085)</p>
                  </div>

                  <!-- Total Produk di Database -->
                  <div class="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50/60 to-white">
                      <span class="text-xs font-bold text-sky-700 uppercase tracking-wider block mb-2">Produk Tersinkron</span>
                      <p id="tgProductCount" class="text-2xl font-black text-slate-900 font-mono tracking-tight">Memuat...</p>
                      <p class="text-xs text-slate-500 mt-1">Siap dijual ke pelanggan</p>
                  </div>

                  <!-- Total Transaksi PPOB -->
                  <div class="p-5 rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50/60 to-white">
                      <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider block mb-2">Total Transaksi</span>
                      <p id="tgOrderCount" class="text-2xl font-black text-slate-900 font-mono tracking-tight">Memuat...</p>
                      <p class="text-xs text-slate-500 mt-1">Pesanan pulsa, token & e-wallet</p>
                  </div>
              </div>

              <!-- Pendaftaran IP Whitelist H2H Notice -->
              <div class="p-5 rounded-2xl border border-amber-200 bg-amber-50/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div class="space-y-1">
                      <div class="flex items-center gap-2">
                          <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-black">!</span>
                          <h4 class="font-extrabold text-slate-900 text-sm">Pendaftaran IP Server VPS (H2H Toko Gorontalo)</h4>
                      </div>
                      <p class="text-xs text-slate-600 leading-relaxed">
                          Toko Gorontalo mewajibkan <b>IP Server VPS</b> terdaftar di akun Member Anda. Jika belum terdaftar, API mengembalikan error: <code class="bg-amber-100 text-amber-900 px-1 py-0.5 rounded font-mono text-[11px]">"device anda tidak terdaftar"</code>.
                      </p>
                      <p class="text-xs text-slate-700 font-medium pt-0.5">
                          IP Server VPS Anda: <b id="tgServerIpDisplay" class="font-mono text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">Mendeteksi...</b>
                      </p>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                      <button onclick="copyTgIpRegistrationFormat()" class="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-xs">
                          <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                          Salin Format Chat
                      </button>
                      <a id="tgWaLink" href="https://wa.me/62815240260221" target="_blank" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-2 shadow-sm cursor-pointer">
                          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                          Chat CS Toko Gorontalo
                      </a>
                  </div>
              </div>

              <!-- Action Bar: Sync & Markup -->
              <div class="p-5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                      <h4 class="font-extrabold text-slate-900 text-sm mb-1">Pengaturan Markup & Sinkronisasi Katalog</h4>
                      <p class="text-xs text-slate-500">Tentukan margin keuntungan (Markup) lalu klik <b>Simpan Markup</b>, atau tarik harga modal terbaru dari server provider.</p>
                  </div>
              ${isCurrentSuperAdmin ? `
              <div class="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
                  <div class="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-2xs">
                      <span class="text-xs font-bold text-slate-500">Markup Rp</span>
                      <input type="number" id="tgSyncMarkupInput" value="750" class="w-24 font-bold font-mono text-sm text-slate-800 focus:outline-none" placeholder="750">
                  </div>
                  <button onclick="applyGlobalMarkup()" id="tgSaveMarkupBtn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer" title="Simpan nilai markup ini dan terapkan langsung ke harga jual produk lokal">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                      Simpan Markup
                  </button>
                  <button onclick="runTokoGorontaloSync()" id="tgSyncBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition shadow-sm flex items-center gap-1.5 shrink-0 cursor-pointer" title="Tarik harga modal terbaru dari server Toko Gorontalo dan terapkan markup ini">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                      Sinkronkan Dari Server
                  </button>
              </div>
              ` : `
              <div class="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center gap-2">
                  <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2-2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  <span>Mode Baca (Read-Only): Hanya <b>Super Admin</b> yang dapat mengubah markup &amp; sinkronisasi produk.</span>
              </div>
              `}
              </div>

              <!-- Filter & Search Produk -->
              <div class="flex flex-col md:flex-row gap-3 items-center justify-between">
                  <div class="flex gap-2 w-full md:w-auto flex-wrap">
                      <select id="tgFilterCategory" onchange="loadAdminProducts(1)" class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700">
                          <option value="">Semua Kategori</option>
                          <option value="pulsa">Pulsa Reguler</option>
                          <option value="data">Paket Data</option>
                          <option value="pln">Token PLN</option>
                          <option value="ewallet">E-Wallet</option>
                          <option value="game">Voucher Game</option>
                          <option value="wifiID">Wifi ID</option>
                      </select>
                      <select id="tgFilterBrand" onchange="loadAdminProducts(1)" class="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700">
                          <option value="">Semua Operator / Brand</option>
                          <option value="TELKOMSEL">Telkomsel</option>
                          <option value="INDOSAT">Indosat</option>
                          <option value="XL">XL</option>
                          <option value="AXIS">Axis</option>
                          <option value="TRI">Tri</option>
                          <option value="SMARTFREN">Smartfren</option>
                          <option value="BYU">By.U</option>
                          <option value="PLN">PLN</option>
                          <option value="DANA">DANA</option>
                          <option value="GOPAY">GoPay</option>
                          <option value="OVO">OVO</option>
                          <option value="SHOPEEPAY">ShopeePay</option>
                          <option value="WIFIID">Wifi ID</option>
                      </select>
                  </div>
                  <div class="w-full md:w-64">
                      <input type="text" id="tgSearchInput" onkeyup="if(event.key==='Enter') loadAdminProducts(1)" placeholder="Cari nama / kode produk..."
                             class="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-indigo-500">
                  </div>
              </div>

              <!-- Tabel Produk PPOB -->
              <div class="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <div class="overflow-x-auto max-h-96 custom-scrollbar">
                      <table class="w-full text-left border-collapse text-xs">
                          <thead>
                              <tr class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                                  <th class="p-3">Kode</th>
                                  <th class="p-3">Nama Produk</th>
                                  <th class="p-3">Kategori</th>
                                  <th class="p-3">Brand</th>
                                  <th class="p-3">Modal Host</th>
                                  <th class="p-3">Markup</th>
                                  <th class="p-3">Harga Jual</th>
                                  <th class="p-3">Status</th>
                                  <th class="p-3 text-center">Aksi</th>
                              </tr>
                          </thead>
                          <tbody id="tgProductsTableBody" class="divide-y divide-slate-100">
                              <tr><td colspan="9" class="p-6 text-center text-slate-400">Memuat data produk...</td></tr>
                          </tbody>
                      </table>
                  </div>
                  <!-- Pagination -->
                  <div class="p-3 border-t border-slate-200 flex justify-between items-center text-xs bg-slate-50">
                      <span id="tgPaginationInfo" class="text-slate-500 font-medium">Halaman 1 dari 1</span>
                      <div class="flex gap-2">
                          <button onclick="changeAdminProductsPage(-1)" id="tgPrevBtn" class="bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-50">Sebelumnya</button>
                          <button onclick="changeAdminProductsPage(1)" id="tgNextBtn" class="bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-50">Selanjutnya</button>
                      </div>
                  </div>
              </div>
          </div>
      </div>
  </div>

  <script>
      const tgIsSuperAdmin = ${isCurrentSuperAdmin ? 'true' : 'false'};
      let tgCurrentPage = 1;
      let tgTotalPages = 1;
      let tgLoadedProducts = [];

      function openTokoGorontaloModal() {
          const modal = document.getElementById('tokoGorontaloModal');
          if (modal) modal.classList.remove('hidden');
          try {
              if (window.location.hash !== '#tokogorontalo') {
                  history.replaceState(null, '', '#tokogorontalo');
              }
          } catch(e) {}
          refreshTokoGorontaloInfo();
          loadAdminProducts(1);
      }

      function closeTokoGorontaloModal() {
          const modal = document.getElementById('tokoGorontaloModal');
          if (modal) modal.classList.add('hidden');
          try {
              if (window.location.hash === '#tokogorontalo' || window.location.hash === '#ppob') {
                  history.replaceState(null, '', window.location.pathname + (window.location.search || ''));
              }
          } catch(e) {}
      }

      let tgDetectedIpv4 = '116.212.74.104';
      let tgDetectedIpv6 = '2001:df7:5300:23::68';

      async function loadTgServerIp() {
          try {
              const res = await fetch('/api/admin/tokogorontalo/server-ip');
              const data = await res.json();
              const displayEl = document.getElementById('tgServerIpDisplay');
              const waLinkEl = document.getElementById('tgWaLink');

              if (data.success) {
                  if (data.ipv4) tgDetectedIpv4 = data.ipv4;
                  if (data.ipv6) tgDetectedIpv6 = data.ipv6;
                  if (displayEl) displayEl.innerText = tgDetectedIpv4 + ' (IPv4) | ' + tgDetectedIpv6 + ' (IPv6)';
                  if (waLinkEl) {
                      const tgLines = [
                          'Halo Admin Toko Gorontalo, tolong daftarkan IP server VPS saya untuk transaksi H2H akun Member ID: 178082835085:',
                          '- IPv4: ' + tgDetectedIpv4,
                          '- IPv6: ' + tgDetectedIpv6,
                          'Terima kasih!'
                      ];
                      const msg = encodeURIComponent(tgLines.join(String.fromCharCode(10)));
                      waLinkEl.href = 'https://wa.me/62815240260221?text=' + msg;
                  }
              }
          } catch(e) {
              console.error('Failed to load server IP:', e);
          }
      }

      function copyTgIpRegistrationFormat() {
          const tgLines = [
              'Halo Admin Toko Gorontalo, tolong daftarkan IP server VPS saya untuk transaksi H2H akun Member ID: 178082835085:',
              '- IPv4: ' + tgDetectedIpv4,
              '- IPv6: ' + tgDetectedIpv6,
              'Terima kasih!'
          ];
          const text = tgLines.join(String.fromCharCode(10));
          if (navigator.clipboard && navigator.clipboard.writeText) {
              navigator.clipboard.writeText(text).then(() => {
                  swalDark.fire({
                      icon: 'success',
                      title: 'Format Chat Tersalin!',
                      text: 'Silakan kirimkan ke Admin WhatsApp Toko Gorontalo (0815240260221).',
                      timer: 3000,
                      showConfirmButton: false
                  });
              }).catch(() => {
                  prompt('Salin pesan format pendaftaran IP di bawah ini:', text);
              });
          } else {
              prompt('Salin pesan format pendaftaran IP di bawah ini:', text);
          }
      }

      async function refreshTokoGorontaloInfo() {
          loadTgServerIp();
          try {
              const res = await fetch('/api/admin/tokogorontalo/info');
              const data = await res.json();
              if (data.success) {
                  document.getElementById('tgSaldoDisplay').innerText = 'Rp ' + Number(data.balance.saldo).toLocaleString('id-ID');
                  document.getElementById('tgMemberName').innerText = (data.balance.namamember || 'Member') + ' (' + data.balance.kodemember + ')';
                  document.getElementById('tgProductCount').innerText = data.productCount + ' Produk';
                  document.getElementById('tgOrderCount').innerText = data.orderCount + ' Transaksi';
                  if (data.defaultMarkup !== undefined) {
                      const input = document.getElementById('tgSyncMarkupInput');
                      if (input) input.value = data.defaultMarkup;
                  }
              }
          } catch(e) {
              console.error('Info error:', e);
          }
      }

      async function applyGlobalMarkup() {
          if (!tgIsSuperAdmin) {
              swalDark.fire('Akses Ditolak', 'Hanya Super Admin yang memiliki hak akses untuk mengubah markup produk.', 'warning');
              return;
          }
          const markupInput = document.getElementById('tgSyncMarkupInput');
          const markup = parseInt(markupInput.value) || 0;
          const cat = document.getElementById('tgFilterCategory') ? document.getElementById('tgFilterCategory').value : '';
          const brand = document.getElementById('tgFilterBrand') ? document.getElementById('tgFilterBrand').value : '';

          let targetDesc = 'seluruh produk (1.143 produk)';
          if (cat && brand) targetDesc = 'kategori ' + cat.toUpperCase() + ' brand ' + brand;
          else if (cat) targetDesc = 'kategori ' + cat.toUpperCase();
          else if (brand) targetDesc = 'brand ' + brand;

          const confirm = await swalDark.fire({
              title: 'Simpan & Terapkan Markup?',
              html: 'Simpan dan terapkan nilai markup keuntungan <b>+Rp ' + markup.toLocaleString('id-ID') + '</b> ke <b>' + targetDesc + '</b>?<br><br><span class="text-xs text-slate-400">Harga Jual semua produk akan otomatis disesuaikan secara instan: <i>Harga Modal + Rp ' + markup.toLocaleString('id-ID') + '</i>.</span>',
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Ya, Simpan & Terapkan',
              cancelButtonText: 'Batal',
              confirmButtonColor: '#059669'
          });

          if (!confirm.isConfirmed) return;

          const btn = document.getElementById('tgSaveMarkupBtn');
          btn.disabled = true;
          btn.innerHTML = '<span class="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full"></span> Menyimpan...';

          try {
              const res = await fetch('/api/admin/tokogorontalo/bulk-markup', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                      markup_value: markup,
                      category: cat || undefined,
                      brand: brand || undefined
                  })
              });
              const data = await res.json();
              btn.disabled = false;
              btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Simpan Markup';

              if (data.success) {
                  swalDark.fire({
                      title: 'Markup Berhasil Disimpan!',
                      text: data.message,
                      icon: 'success',
                      timer: 2500,
                      showConfirmButton: false
                  });
                  loadAdminProducts(tgCurrentPage);
              } else {
                  swalDark.fire('Gagal', data.message || 'Gagal menyimpan markup.', 'error');
              }
          } catch(e) {
              btn.disabled = false;
              btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg> Simpan Markup';
              swalDark.fire('Error', 'Kesalahan jaringan: ' + e.message, 'error');
          }
      }

      async function runTokoGorontaloSync() {
          if (!tgIsSuperAdmin) {
              swalDark.fire('Akses Ditolak', 'Hanya Super Admin yang memiliki hak akses untuk sinkronisasi produk.', 'warning');
              return;
          }
          const btn = document.getElementById('tgSyncBtn');
          const markupInput = document.getElementById('tgSyncMarkupInput');
          const markup = parseInt(markupInput.value) || 750;

          btn.disabled = true;
          btn.innerHTML = '<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span> Menyinkronkan...';

          try {
              const res = await fetch('/api/admin/tokogorontalo/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ markup })
              });
              const data = await res.json();
              btn.disabled = false;
              btn.innerHTML = '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg> Sinkronkan Sekarang';

              if (data.success) {
                  swalDark.fire('Sukses', data.message, 'success');
                  refreshTokoGorontaloInfo();
                  loadAdminProducts(1);
              } else {
                  swalDark.fire('Gagal', data.message, 'error');
              }
          } catch(e) {
              btn.disabled = false;
              btn.innerText = 'Sinkronkan Sekarang';
              swalDark.fire('Error', 'Kesalahan jaringan: ' + e.message, 'error');
          }
      }

      async function loadAdminProducts(page = 1) {
          tgCurrentPage = page;
          const search = document.getElementById('tgSearchInput').value.trim();
          const category = document.getElementById('tgFilterCategory').value;
          const brand = document.getElementById('tgFilterBrand').value;
          const tbody = document.getElementById('tgProductsTableBody');

          tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400">Memuat data produk...</td></tr>';

          try {
              let url = '/api/admin/tokogorontalo/products?page=' + page + '&limit=30';
              if (search) url += '&search=' + encodeURIComponent(search);
              if (category) url += '&category=' + encodeURIComponent(category);
              if (brand) url += '&brand=' + encodeURIComponent(brand);

              const res = await fetch(url);
              const data = await res.json();

              if (data.success) {
                  tgTotalPages = data.totalPages || 1;
                  tgLoadedProducts = data.products || [];
                  document.getElementById('tgPaginationInfo').innerText = 'Halaman ' + data.page + ' dari ' + tgTotalPages + ' (Total ' + data.total + ' produk)';
                  document.getElementById('tgPrevBtn').disabled = data.page <= 1;
                  document.getElementById('tgNextBtn').disabled = data.page >= tgTotalPages;

                  if (data.products.length === 0) {
                      tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-slate-400">Tidak ada produk ditemukan.</td></tr>';
                      return;
                  }

                  tbody.innerHTML = data.products.map(p => \`
                      <tr class="hover:bg-slate-50 transition">
                          <td class="p-3 font-mono font-bold text-sky-600">\${p.product_code}</td>
                          <td class="p-3 font-medium text-slate-900">\${escapeHtmlClient(p.product_name)}</td>
                          <td class="p-3 uppercase text-[10px] font-bold text-slate-500">\${p.category}</td>
                          <td class="p-3 uppercase text-[10px] font-bold text-indigo-600">\${p.brand}</td>
                          <td class="p-3 font-mono text-slate-600">Rp \${Number(p.cost_price).toLocaleString('id-ID')}</td>
                          <td class="p-3 font-mono text-emerald-600">+Rp \${Number(p.markup_value).toLocaleString('id-ID')}</td>
                          <td class="p-3 font-mono font-bold text-slate-900">Rp \${Number(p.selling_price).toLocaleString('id-ID')}</td>
                          <td class="p-3">
                              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold \${p.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                                  \${p.is_active ? 'AKTIF' : 'NONAKTIF'}
                              </span>
                          </td>
                          <td class="p-3 text-center">
                              \${tgIsSuperAdmin 
                                  ? '<button onclick="editProductModal(\\\'' + p.product_code + '\\\')" class="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-xs transition cursor-pointer">Edit</button>'
                                  : '<span class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg cursor-not-allowed" title="Hanya Super Admin yang diizinkan mengedit produk">🔒 Terkunci</span>'}
                          </td>
                      </tr>
                  \`).join('');
              }
          } catch(e) {
              tbody.innerHTML = '<tr><td colspan="9" class="p-6 text-center text-rose-500">Gagal memuat produk.</td></tr>';
          }
      }

      function changeAdminProductsPage(delta) {
          const target = tgCurrentPage + delta;
          if (target >= 1 && target <= tgTotalPages) {
              loadAdminProducts(target);
          }
      }

      function onSwalMarkupChange(costPrice) {
          const mInput = document.getElementById('swalEditMarkup');
          const pInput = document.getElementById('swalEditPrice');
          if (mInput && pInput) {
              const m = parseInt(mInput.value) || 0;
              pInput.value = costPrice + m;
          }
      }

      function onSwalPriceChange(costPrice) {
          const mInput = document.getElementById('swalEditMarkup');
          const pInput = document.getElementById('swalEditPrice');
          if (mInput && pInput) {
              const p = parseInt(pInput.value) || 0;
              mInput.value = Math.max(0, p - costPrice);
          }
      }

      async function editProductModal(code) {
          if (!tgIsSuperAdmin) {
              swalDark.fire('Akses Ditolak', 'Hanya Super Admin yang memiliki hak akses untuk mengedit produk.', 'warning');
              return;
          }
          const p = (tgLoadedProducts || []).find(x => x.product_code === code);
          if (!p) return;
          const name = escapeHtmlClient(p.product_name || code);
          const costPrice = Number(p.cost_price) || 0;
          const currentMarkup = Number(p.markup_value) || 0;
          const currentPrice = Number(p.selling_price) || 0;
          const currentActive = p.is_active ? 1 : 0;

          const modalHtml = 
              '<div class="text-left space-y-3 p-2 text-xs">' +
                  '<div class="bg-slate-100 p-3 rounded-xl border border-slate-200">' +
                      '<div class="font-extrabold text-slate-900 text-sm">' + name + '</div>' +
                      '<div class="text-[11px] font-mono text-slate-500 mt-1 flex justify-between">' +
                          '<span>Kode: <b class="text-sky-600">' + code + '</b></span>' +
                          '<span>Modal Host: <b class="text-slate-800 font-mono">Rp ' + costPrice.toLocaleString('id-ID') + '</b></span>' +
                      '</div>' +
                  '</div>' +
                  '<div class="grid grid-cols-2 gap-3">' +
                      '<div>' +
                          '<label class="font-bold text-slate-700 block mb-1">Markup Untung (Rp)</label>' +
                          '<input type="number" id="swalEditMarkup" value="' + currentMarkup + '" oninput="onSwalMarkupChange(' + costPrice + ')" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-indigo-500">' +
                      '</div>' +
                      '<div>' +
                          '<label class="font-bold text-slate-700 block mb-1">Harga Jual (Rp)</label>' +
                          '<input type="number" id="swalEditPrice" value="' + currentPrice + '" oninput="onSwalPriceChange(' + costPrice + ')" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-mono font-bold text-sm focus:bg-white focus:outline-none focus:border-indigo-500">' +
                      '</div>' +
                  '</div>' +
                  '<p class="text-[11px] text-slate-400 italic">Rumus: Harga Jual = Modal Host (Rp ' + costPrice.toLocaleString('id-ID') + ') + Markup Untung.</p>' +
                  '<div>' +
                      '<label class="font-bold text-slate-700 block mb-1">Status Produk</label>' +
                      '<select id="swalEditActive" class="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl font-bold text-xs focus:bg-white focus:outline-none focus:border-indigo-500">' +
                          '<option value="1"' + (currentActive ? ' selected' : '') + '>AKTIF (Bisa Dibeli Pelanggan)</option>' +
                          '<option value="0"' + (!currentActive ? ' selected' : '') + '>NONAKTIF (Disembunyikan)</option>' +
                      '</select>' +
                  '</div>' +
              '</div>';

          const { value: formValues } = await swalDark.fire({
              title: 'Edit Produk ' + code,
              html: modalHtml,
              showCancelButton: true,
              confirmButtonText: 'Simpan',
              cancelButtonText: 'Batal',
              confirmButtonColor: '#0284c7',
              preConfirm: () => {
                  return {
                      price: document.getElementById('swalEditPrice').value,
                      markup: document.getElementById('swalEditMarkup').value,
                      active: document.getElementById('swalEditActive').value
                  };
              }
          });

          if (formValues) {
              try {
                  const res = await fetch('/api/admin/tokogorontalo/update-product', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                          product_code: code,
                          selling_price: parseInt(formValues.price),
                          markup_value: parseInt(formValues.markup),
                          is_active: parseInt(formValues.active)
                      })
                  });
                  const data = await res.json();
                  if (data.success) {
                      swalDark.fire('Sukses', data.message, 'success');
                      loadAdminProducts(tgCurrentPage);
                  } else {
                      swalDark.fire('Gagal', data.message, 'error');
                  }
              } catch(e) {
                  swalDark.fire('Error', e.message, 'error');
              }
          }
      }

      // Auto-open Toko Gorontalo Modal on F5 / direct hash navigation
      function checkTgHashRouting() {
          const hash = (window.location.hash || '').toLowerCase();
          const params = new URLSearchParams(window.location.search);
          const tab = (params.get('tab') || '').toLowerCase();
          if (hash === '#tokogorontalo' || hash === '#ppob' || tab === 'tokogorontalo' || tab === 'ppob') {
              const modal = document.getElementById('tokoGorontaloModal');
              if (modal && modal.classList.contains('hidden')) {
                  openTokoGorontaloModal();
              }
          }
      }

      window.addEventListener('DOMContentLoaded', checkTgHashRouting);
      window.addEventListener('hashchange', checkTgHashRouting);

      // ESC key listener to close modal
      window.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
              const modal = document.getElementById('tokoGorontaloModal');
              if (modal && !modal.classList.contains('hidden')) {
                  closeTokoGorontaloModal();
              }
          }
      });
  </script>
  `;
}

module.exports = {
  handleTokoGorontaloRoutes,
  renderPPOBContent,
  renderTokoGorontaloAdminModal,
  autoSaveBuyerContact,
  saveSuccessPPOBToInbox,
  syncMissingPPOBInbox
};
