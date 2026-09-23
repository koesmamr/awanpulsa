-- ==========================================================
-- Schema Database AwanPulsa (Fresh Install)
-- Kompatibel dengan SQLite / Cloudflare D1
-- ==========================================================

CREATE TABLE IF NOT EXISTS users (
    email TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    balance INTEGER DEFAULT 0,
    is_blocked INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    phonebook TEXT DEFAULT '[]',
    picture TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    email TEXT,
    expires_at DATETIME
);

CREATE TABLE IF NOT EXISTS vpns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    server TEXT,
    protocol TEXT,
    username TEXT,
    date TEXT,
    exp TEXT
);

CREATE TABLE IF NOT EXISTS inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    title TEXT,
    message TEXT,
    date TEXT,
    read INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoices (
    ref TEXT PRIMARY KEY,
    email TEXT,
    amount INTEGER,
    status TEXT,
    date DATETIME
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS debug_logs (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    email TEXT,
    subject TEXT,
    category TEXT,
    status TEXT,
    created_at TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS ticket_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id TEXT,
    sender_type TEXT,
    message TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT,
    type TEXT,
    amount INTEGER,
    description TEXT,
    balance INTEGER DEFAULT 0,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS ai_usage (
    email TEXT PRIMARY KEY,
    count INTEGER,
    slot TEXT
);

CREATE TABLE IF NOT EXISTS licenses (
    id TEXT PRIMARY KEY,
    email TEXT,
    vps_name TEXT,
    ip_address TEXT,
    expires_at INTEGER,
    created_at TEXT,
    subdomain TEXT,
    cf_record_id TEXT
);

-- Indeks untuk mempercepat performa kueri
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_id ON sessions(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_vpns_email ON vpns(email);
CREATE INDEX IF NOT EXISTS idx_inbox_email ON inbox(email);
CREATE INDEX IF NOT EXISTS idx_inbox_read ON inbox(read);
CREATE INDEX IF NOT EXISTS idx_invoices_email ON invoices(email);
CREATE INDEX IF NOT EXISTS idx_invoices_ref ON invoices(ref);
CREATE INDEX IF NOT EXISTS idx_transactions_email ON transactions(email);
CREATE INDEX IF NOT EXISTS idx_tickets_email ON tickets(email);
CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket_id ON ticket_replies(ticket_id);

-- ==========================================================
-- Tabel PPOB & Toko Gorontalo
-- ==========================================================
CREATE TABLE IF NOT EXISTS ppob_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER,
    provider_name TEXT,
    product_code TEXT UNIQUE,
    product_name TEXT,
    description TEXT,
    product_type TEXT,
    category TEXT,
    brand TEXT,
    cost_price INTEGER,
    markup_type TEXT DEFAULT 'fixed',
    markup_value INTEGER DEFAULT 750,
    selling_price INTEGER,
    is_active INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ppob_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reqid TEXT UNIQUE,
    email TEXT,
    product_code TEXT,
    product_name TEXT,
    customer_no TEXT,
    cost_price INTEGER,
    selling_price INTEGER,
    status TEXT DEFAULT 'pending',
    sn TEXT DEFAULT '',
    info TEXT DEFAULT '',
    detail TEXT DEFAULT '',
    raw_response TEXT DEFAULT '',
    is_refunded INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ppob_products_code ON ppob_products(product_code);
CREATE INDEX IF NOT EXISTS idx_ppob_products_category ON ppob_products(category);
CREATE INDEX IF NOT EXISTS idx_ppob_products_brand ON ppob_products(brand);
CREATE INDEX IF NOT EXISTS idx_ppob_transactions_reqid ON ppob_transactions(reqid);
CREATE INDEX IF NOT EXISTS idx_ppob_transactions_email ON ppob_transactions(email);

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
