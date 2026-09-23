/**
 * Toko Gorontalo / Apiumkm H2H PPOB Client Service
 * Menangani otentikasi session, cek saldo, sinkronisasi produk, dan eksekusi transaksi.
 */

const DEFAULT_BASE_URL = 'https://app.tupo.my.id';
const DEFAULT_USERID = '178082835085';
const DEFAULT_PIN = '650502';
const DEFAULT_PASS = '35098019';

// Pastikan koneksi outbound Node.js memprioritaskan IPv4
const dns = require('dns');
if (typeof dns.setDefaultResultOrder === 'function') {
  try { dns.setDefaultResultOrder('ipv4first'); } catch {}
}

let ipv4Dispatcher = null;
try {
  const { Agent } = require('undici');
  ipv4Dispatcher = new Agent({ connect: { family: 4 } });
} catch (e) {
  // undici fallback
}

function customFetch(url, options = {}) {
  const opts = { ...options };
  if (ipv4Dispatcher && !opts.dispatcher) {
    opts.dispatcher = ipv4Dispatcher;
  }
  return fetch(url, opts);
}

// XOR encryption key helper sesuai protokol Apiumkm/Atrilinks
function getSecretKey() {
  return [0x4e, 0x6d, 0x3e, 0x47, 0x2a, 0x5f, 0x72, 0x54, 0x3c, 0x2d, 0x71, 0x53, 0x26, 0x3b, 0x6f, 0x48]
    .map(x => String.fromCharCode(x ^ 0x1f))
    .join('');
}

function encryptPin(pin) {
  const key = getSecretKey();
  let res = '';
  for (let i = 0; i < pin.length; i++) {
    res += String.fromCharCode(pin.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return Buffer.from(res, 'binary').toString('base64');
}

// Token cache memory
let cachedSession = {
  token: null,
  expiresAt: 0,
  userData: null
};

class TokoGorontaloService {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.TOKOGORONTALO_BASE_URL || DEFAULT_BASE_URL;
    this.userid = config.userid || process.env.TOKOGORONTALO_USERID || DEFAULT_USERID;
    this.pin = config.pin || process.env.TOKOGORONTALO_PIN || DEFAULT_PIN;
    this.pass = config.pass || process.env.TOKOGORONTALO_PASS || DEFAULT_PASS;
  }

  /**
   * Login ke Web Report / Member Area Toko Gorontalo
   */
  async login(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedSession.token && cachedSession.expiresAt > now + 60000) {
      return cachedSession;
    }

    const encPin = encryptPin(this.pin);
    const res = await customFetch(`${this.baseUrl}/webreport/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userid: this.userid,
        pin: encPin
      })
    });

    if (!res.ok) {
      throw new Error(`Login gagal dengan status HTTP ${res.status}`);
    }

    const data = await res.json();
    if (!data.status || !data.data || !data.data.token) {
      throw new Error(data.message || data.pesan || 'Login gagal, periksa User ID & PIN');
    }

    cachedSession = {
      token: data.data.token,
      expiresAt: now + (30 * 60 * 1000), // Anggap berlaku 30 menit
      userData: data.data
    };

    return cachedSession;
  }

  /**
   * Cek saldo akun Toko Gorontalo
   */
  async getBalance() {
    try {
      const session = await this.login();
      const res = await customFetch(`${this.baseUrl}/sesion/check-saldo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.token}`
        },
        body: JSON.stringify({})
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} saat cek saldo`);
      }

      const data = await res.json();
      return {
        success: data.status === true,
        saldo: data.saldo !== undefined ? Number(data.saldo) : (session.userData ? session.userData.saldo : 0),
        message: data.message || 'Berhasil',
        kodemember: session.userData ? session.userData.kodemember : this.userid,
        namamember: session.userData ? session.userData.namamember : 'Member Toko Gorontalo'
      };
    } catch (err) {
      console.error('[TokoGorontalo] getBalance error:', err.message);
      return {
        success: false,
        saldo: 0,
        message: err.message,
        kodemember: this.userid,
        namamember: '-'
      };
    }
  }

  /**
   * Tarik katalog pricelist dari server Toko Gorontalo
   */
  async fetchPricelist() {
    const url = `${this.baseUrl}/h2h/produk/pricelist?userid=${encodeURIComponent(this.userid)}`;
    const res = await customFetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Gagal mengambil pricelist, HTTP status ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Format respon pricelist tidak valid');
    }

    return data;
  }

  /**
   * Helper kategorisasi produk
   */
  categorizeProduct(p) {
    const text = ((p.namaprovider || '') + ' ' + (p.namaproduk || '') + ' ' + (p.kodeproduk || '')).toLowerCase();
    
    // Khusus Voucher Wifi ID Telkom (bukan Wifi Modem)
    if ((text.includes('wifi id') || text.includes('wifi_id') || text.includes('wifi-id') || text.includes('wifiid')) && !text.includes('modem')) {
      return { category: 'wifiID', brand: 'WIFIID' };
    }

    let brand = 'LAINNYA';
    if (text.includes('byu') || text.includes('by.u')) brand = 'BYU';
    else if (text.includes('telkomsel') || text.includes('tsel') || text.includes('simp')) brand = 'TELKOMSEL';
    else if (text.includes('indosat') || text.includes('isat') || text.includes('im3')) brand = 'INDOSAT';
    else if (text.includes('axis')) brand = 'AXIS';
    else if (text.includes('xl')) brand = 'XL';
    else if (text.includes('tri') || text.includes('three')) brand = 'TRI';
    else if (text.includes('smartfren') || text.includes('smart')) brand = 'SMARTFREN';
    else if (text.includes('pln') || text.includes('listrik')) brand = 'PLN';
    else if (text.includes('dana')) brand = 'DANA';
    else if (text.includes('gopay')) brand = 'GOPAY';
    else if (text.includes('ovo')) brand = 'OVO';
    else if (text.includes('shopee')) brand = 'SHOPEEPAY';
    else if (text.includes('mobile legend') || text.includes('free fire') || text.includes('pubg') || text.includes('game')) brand = 'GAME';
    else if (text.includes('modem')) brand = 'MODEM';

    let category = 'lainnya';
    if (brand === 'PLN') category = 'pln';
    else if (['DANA', 'GOPAY', 'OVO', 'SHOPEEPAY'].includes(brand) || text.includes('ewallet') || text.includes('wallet')) category = 'ewallet';
    else if (brand === 'GAME') category = 'game';
    else if (text.includes('pulsa') || text.includes('reguler') || text.includes('transfer')) category = 'pulsa';
    else if (text.includes('data') || text.includes('kuota') || text.includes('modem') || text.includes('aigo') || text.includes('bronet') || text.includes('gb') || text.includes('unlimited') || text.includes('voucher') || text.includes('actvoc') || text.includes('combo')) category = 'data';
    else if (['TELKOMSEL', 'INDOSAT', 'XL', 'AXIS', 'TRI', 'SMARTFREN', 'BYU'].includes(brand)) category = 'pulsa';

    return { category, brand };
  }

  /**
   * Deteksi Operator Seluler berdasarkan Nomor HP
   */
  detectOperator(phone) {
    if (!phone) return null;
    const clean = String(phone).replace(/\D/g, '').replace(/^62/, '0');
    if (clean.length < 4) return null;
    const p4 = clean.substring(0, 4);

    if (p4 === '0851') {
      return 'BYU';
    }
    if (['0852', '0853', '0811', '0812', '0813', '0821', '0822', '0823'].includes(p4)) {
      return 'TELKOMSEL';
    }
    if (['0814', '0815', '0816', '0855', '0856', '0857', '0858'].includes(p4)) {
      return 'INDOSAT';
    }
    if (['0817', '0818', '0819', '0859', '0877', '0878'].includes(p4)) {
      return 'XL';
    }
    if (['0831', '0832', '0833', '0838'].includes(p4)) {
      return 'AXIS';
    }
    if (['0895', '0896', '0897', '0898', '0899'].includes(p4)) {
      return 'TRI';
    }
    if (['0881', '0882', '0883', '0884', '0885', '0886', '0887', '0888', '0889'].includes(p4)) {
      return 'SMARTFREN';
    }
    return null;
  }

  /**
   * Sinkronisasi katalog produk Toko Gorontalo ke Database SQLite
   */
  async syncProducts(rawDb, defaultMarkup = 750) {
    const products = await this.fetchPricelist();
    console.log(`[TokoGorontalo] Syncing ${products.length} products to database...`);

    const upsertStmt = rawDb.prepare(`
      INSERT INTO ppob_products (
        provider_id, provider_name, product_code, product_name, description,
        product_type, category, brand, cost_price, markup_type, markup_value,
        selling_price, is_active, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 'fixed', ?,
        ?, ?, CURRENT_TIMESTAMP
      )
      ON CONFLICT(product_code) DO UPDATE SET
        provider_id = excluded.provider_id,
        provider_name = excluded.provider_name,
        product_name = excluded.product_name,
        description = excluded.description,
        product_type = excluded.product_type,
        category = excluded.category,
        brand = excluded.brand,
        cost_price = excluded.cost_price,
        selling_price = excluded.cost_price + markup_value,
        is_active = excluded.is_active,
        updated_at = CURRENT_TIMESTAMP
    `);

    let count = 0;
    const runAll = () => {
      for (const p of products) {
        const { category, brand } = this.categorizeProduct(p);
        const costPrice = Math.round(Number(p.harga) || 0);
        const sellingPrice = costPrice + defaultMarkup;
        const isActive = p.isaktif === false ? 0 : 1;

        upsertStmt.run(
          p.idprovider || 0,
          p.namaprovider || '',
          p.kodeproduk || '',
          p.namaproduk || '',
          p.deskripsi || '',
          p.jenis || 'fixed',
          category,
          brand,
          costPrice,
          defaultMarkup,
          sellingPrice,
          isActive
        );
        count++;
      }
    };

    if (typeof rawDb.transaction === 'function') {
      rawDb.transaction(runAll)();
    } else {
      rawDb.exec('BEGIN TRANSACTION;');
      try {
        runAll();
        rawDb.exec('COMMIT;');
      } catch (err) {
        rawDb.exec('ROLLBACK;');
        throw err;
      }
    }

    console.log(`[TokoGorontalo] Successfully synced ${count} products.`);
    return { success: true, count, total: products.length };
  }

  /**
   * Cek harga produk spesifik
   */
  async checkProductPrice(productCode) {
    const url = `${this.baseUrl}/h2h/produk/price?userid=${encodeURIComponent(this.userid)}&kodeproduk=${encodeURIComponent(productCode)}`;
    const res = await customFetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Gagal cek harga produk ${productCode}, HTTP status ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Eksekusi transaksi pembelian H2H
   * Metode: JSON POST /h2h/trx/json
   */
  async createTransaction({ reqid, kodeproduk, tujuan, jenistrx = 1, nominaltrx, kodebayar, urlcallback }) {
    const endpoint = `${this.baseUrl}/h2h/trx/json`;
    const payload = {
      reqid,
      userid: this.userid,
      kodeproduk,
      tujuan,
      jenistrx: Number(jenistrx) || 1,
      urlcallback: urlcallback || '',
      pin: this.pin,
      pass: this.pass || this.pin
    };

    if (jenistrx === 2 && nominaltrx) {
      payload.nominaltrx = Number(nominaltrx);
    }
    if (jenistrx === 4 && kodebayar) {
      payload.kodebayar = kodebayar;
    }

    console.log(`[TokoGorontalo] Sending TRX -> reqid: ${reqid}, kode: ${kodeproduk}, tujuan: ${tujuan}`);

    const headers = { 'Content-Type': 'application/json' };
    try {
      const session = await this.login();
      if (session && session.token) {
        headers['Authorization'] = `Bearer ${session.token}`;
      }
    } catch (e) {
      // Ignore login error, rely on H2H credentials
    }

    const res = await customFetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    const responseText = await res.text();
    let json = null;
    try {
      json = JSON.parse(responseText);
    } catch {
      json = { status: 'error', info: responseText };
    }

    return json;
  }

  /**
   * Cek status transaksi hari ini secara manual
   */
  async checkStatusToday({ reqid, tujuan }) {
    const url = `${this.baseUrl}/h2h/trx/checktoday?reqid=${encodeURIComponent(reqid)}&userid=${encodeURIComponent(this.userid)}&tujuan=${encodeURIComponent(tujuan)}`;
    const res = await customFetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Cek status transaksi gagal dengan HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Buat tiket deposit saldo host
   */
  async createDepositTicket({ nominal, bank, urlcallback }) {
    let url = `${this.baseUrl}/h2h/tiket?userid=${encodeURIComponent(this.userid)}&nominal=${encodeURIComponent(nominal)}&bank=${encodeURIComponent(bank.toLowerCase())}`;
    if (urlcallback) {
      url += `&urlcallback=${encodeURIComponent(urlcallback)}`;
    }

    const res = await customFetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      throw new Error(`Buat tiket deposit gagal dengan HTTP ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Parser detail respon Toko Gorontalo:
   * Menguraikan DataTransaksi{...} dan DataBiaya{...}
   * untuk mengambil Ref / SN / Token PLN / dll.
   */
  parseDetail(detail) {
    if (!detail || typeof detail !== 'string') {
      return { sn: '', dataTrx: {}, dataBiaya: {} };
    }

    const dataTrx = {};
    const trxMatch = detail.match(/DataTransaksi\{([^}]+)\}/);
    if (trxMatch) {
      trxMatch[1].split('||').forEach(item => {
        const parts = item.split(':');
        const key = parts[0] ? parts[0].trim() : '';
        const val = parts.slice(1).join(':').trim();
        if (key) dataTrx[key] = val;
      });
    }

    const dataBiaya = {};
    const biayaMatch = detail.match(/DataBiaya\{([^}]+)\}/);
    if (biayaMatch) {
      biayaMatch[1].split('||').forEach(item => {
        const parts = item.split(':');
        const key = parts[0] ? parts[0].trim() : '';
        const val = parts.slice(1).join(':').trim();
        if (key) dataBiaya[key] = val;
      });
    }

    // Ambil SN atau Token
    let sn = dataTrx['Ref'] || dataTrx['Token'] || dataTrx['sn'] || dataTrx['SN'] || '';
    if (!sn && dataTrx['Kwh']) {
      sn = dataTrx['Token'] || '';
    }

    return {
      sn,
      dataTrx,
      dataBiaya
    };
  }
}

module.exports = new TokoGorontaloService();
module.exports.TokoGorontaloService = TokoGorontaloService;
