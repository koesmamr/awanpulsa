const fs = require('fs');
const path = require('path');

// Pastikan direktori data/ tersedia
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbFileName = process.env.DB_FILE || 'awanpulsa.db';
const dbPath = path.join(dataDir, dbFileName);
const schemaPath = path.join(__dirname, 'schema.sql');
const isNewDb = !fs.existsSync(dbPath);

let rawDb = null;
let dbDriverName = '';

// Prioritaskan better-sqlite3, fallback ke node:sqlite bawaan Node.js
try {
  const Database = require('better-sqlite3');
  rawDb = new Database(dbPath);
  rawDb.pragma('journal_mode = WAL');
  rawDb.pragma('synchronous = NORMAL');
  dbDriverName = 'better-sqlite3';
} catch (err) {
  try {
    const { DatabaseSync } = require('node:sqlite');
    rawDb = new DatabaseSync(dbPath);
    rawDb.exec('PRAGMA journal_mode = WAL;');
    rawDb.exec('PRAGMA synchronous = NORMAL;');
    dbDriverName = 'node:sqlite';
  } catch (err2) {
    console.error('CRITICAL: Gagal memuat driver SQLite (better-sqlite3 maupun node:sqlite):', err2);
    throw err2;
  }
}

console.log(`[Database] Terhubung ke SQLite via ${dbDriverName} -> ${dbPath}`);

// Inisialisasi schema jika database baru atau tabel belum ada
if (fs.existsSync(schemaPath)) {
  try {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    rawDb.exec(schemaSql);
    console.log('[Database] Inisialisasi schema berhasil.');
  } catch (e) {
    console.error('[Database] Catatan inisialisasi schema:', e.message);
  }
}

// Pastikan kolom is_admin ada pada tabel users untuk database eksisting
try {
  rawDb.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0;');
} catch (e) {}

// Wrapper D1 Compatibility
class D1PreparedStatement {
  constructor(rawDb, sql, bindings = []) {
    this.rawDb = rawDb;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...args) {
    // Sanitasi parameter: ubah undefined menjadi null
    const sanitized = args.map(arg => (arg === undefined ? null : arg));
    return new D1PreparedStatement(this.rawDb, this.sql, sanitized);
  }

  async first(col) {
    try {
      const stmt = this.rawDb.prepare(this.sql);
      const row = stmt.get(...this.bindings);
      if (!row) return null;
      if (col !== undefined && col !== null) {
        return row[col] !== undefined ? row[col] : null;
      }
      return row;
    } catch (err) {
      console.error(`[DB Query Error - first]: ${this.sql}`, err);
      throw err;
    }
  }

  async all() {
    try {
      const stmt = this.rawDb.prepare(this.sql);
      const results = stmt.all(...this.bindings) || [];
      return {
        results,
        success: true,
        meta: {
          rows_read: results.length,
          rows_written: 0
        }
      };
    } catch (err) {
      console.error(`[DB Query Error - all]: ${this.sql}`, err);
      throw err;
    }
  }

  async run() {
    try {
      const stmt = this.rawDb.prepare(this.sql);
      const info = stmt.run(...this.bindings);
      const changes = info ? (info.changes !== undefined ? info.changes : 0) : 0;
      const lastRowId = info ? (info.lastInsertRowid !== undefined ? Number(info.lastInsertRowid) : 0) : 0;
      return {
        success: true,
        meta: {
          changes,
          last_row_id: lastRowId
        }
      };
    } catch (err) {
      console.error(`[DB Query Error - run]: ${this.sql}`, err);
      throw err;
    }
  }
}

class D1Database {
  constructor(rawDb) {
    this.rawDb = rawDb;
  }

  prepare(sql) {
    return new D1PreparedStatement(this.rawDb, sql);
  }

  async batch(statements) {
    const results = [];
    // Jalankan dalam transaksi
    const runBatch = () => {
      for (const s of statements) {
        const stmt = this.rawDb.prepare(s.sql);
        const info = stmt.run(...(s.bindings || []));
        results.push({
          success: true,
          meta: {
            changes: info ? info.changes : 0,
            last_row_id: info ? Number(info.lastInsertRowid) : 0
          }
        });
      }
    };

    if (typeof this.rawDb.transaction === 'function') {
      this.rawDb.transaction(runBatch)();
    } else {
      this.rawDb.exec('BEGIN TRANSACTION;');
      try {
        runBatch();
        this.rawDb.exec('COMMIT;');
      } catch (err) {
        this.rawDb.exec('ROLLBACK;');
        throw err;
      }
    }

    return results;
  }

  exec(sql) {
    return this.rawDb.exec(sql);
  }
}

const db = new D1Database(rawDb);

module.exports = {
  db,
  rawDb,
  dbDriverName,
  dbPath
};
