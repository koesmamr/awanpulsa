#!/usr/bin/env bash
# ==============================================================================
# AUTOINSTALL SCRIPT: AWANPULSA (UBUNTU 24.04 / 22.04 LTS READY)
# Mengadopsi Pola Multi-Tenant VPS & GitHub Git Clone Seperti Warung Pulsa
# Aman Berdampingan dengan WarungPulsa & Pasar-Desa (Tanpa Bentrok)
# ==============================================================================
set -e

# Warna Terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}"
echo "=================================================================="
echo "      ☁️  AUTOINSTALL AWANPULSA - MULTI-APP VPS READY ☁️         "
echo "      Platform Cloud PPOB, Pulsa & Layanan Digital Otomatis       "
echo "=================================================================="
echo -e "${NC}"

# 1. Validasi Akses Root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] Script ini wajib dijalankan sebagai user root!${NC}"
    echo "Gunakan perintah: sudo bash install.sh atau login sebagai root."
    exit 1
fi

DOMAIN="${DOMAIN:-awanpulsa.web.id}"
APP_PORT=3002
ALT_PORT=8082
APP_DIR="/var/www/awanpulsa"
REPO_URL="${REPO_URL:-https://github.com/koesmamr/awanpulsa.git}"
BRANCH="${BRANCH:-main}"

# 2. Deteksi Lingkungan VPS (Cek WarungPulsa & Pasar-Desa)
echo -e "${YELLOW}==> [1/7] Memeriksa lingkungan server multi-app...${NC}"

if [ -d "/var/www/warungpulsa" ] || [ -f "/etc/nginx/sites-available/warungpulsa" ]; then
    echo -e "${GREEN}  ✓ Terdeteksi aplikasi Warung Pulsa di VPS ini.${NC}"
fi

if [ -d "/var/www/pasar-desa" ] || [ -f "/etc/nginx/sites-available/pasar-desa" ]; then
    echo -e "${GREEN}  ✓ Terdeteksi aplikasi Pasar Desa di VPS ini.${NC}"
fi

echo -e "${GREEN}  ✓ AwanPulsa akan dipasang di Port ${APP_PORT} (terisolasi) agar semua aplikasi aman 100%.${NC}"

# Bersihkan jika Certbot sempat salah menyuntikkan SSL awanpulsa ke dalam config warungpulsa
if [ -f "/etc/nginx/sites-available/warungpulsa" ]; then
    if grep -q "awanpulsa" /etc/nginx/sites-available/warungpulsa; then
        echo -e "${YELLOW}  ⚠️ Terdeteksi konfigurasi awanpulsa tertempel di warungpulsa. Mengoreksi...${NC}"
        cp /etc/nginx/sites-available/warungpulsa /etc/nginx/sites-available/warungpulsa.bak_$(date +%s) 2>/dev/null || true
        cat > /etc/nginx/sites-available/warungpulsa << 'WP_EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name warungpulsa.web.id www.warungpulsa.web.id _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
WP_EOF
        echo -e "${GREEN}  ✓ Konfigurasi Warung Pulsa berhasil dipulihkan murni ke Port 3000.${NC}"
    fi
fi

# 3. Update paket Ubuntu & instal dependensi dasar sistem
echo -e "${YELLOW}==> [2/7] Memeriksa paket dasar sistem...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential sqlite3

# 4. Periksa Node.js 22 LTS & PM2
echo -e "${YELLOW}==> [3/7] Memeriksa runtime Node.js 22 LTS...${NC}"
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt install -y nodejs
fi
echo -e "${GREEN}   Node.js: $(node -v)${NC}"
echo -e "${GREEN}   NPM: $(npm -v)${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}   Menginstal PM2 Process Manager secara global...${NC}"
    npm install -g pm2
fi

# 5. Download / Sinkronisasi Source Code dari GitHub
echo -e "${YELLOW}==> [4/7] Mengunduh source code AwanPulsa dari GitHub (${REPO_URL})...${NC}"
mkdir -p /var/www

CURRENT_DIR="$(pwd)"
if [ -f "$CURRENT_DIR/server.js" ] && [ "$CURRENT_DIR" != "$APP_DIR" ]; then
    echo -e "${CYAN}   Menyalin source code dari direktori lokal saat ini ($CURRENT_DIR)...${NC}"
    mkdir -p "$APP_DIR"
    cp -ru "$CURRENT_DIR"/* "$APP_DIR"/ 2>/dev/null || true
    cp -ru "$CURRENT_DIR"/.[!.]* "$APP_DIR"/ 2>/dev/null || true
    cd "$APP_DIR"
elif [ -d "$APP_DIR/.git" ]; then
    echo -e "${CYAN}   Direktori $APP_DIR sudah ada. Memperbarui dari repository Git...${NC}"
    cd "$APP_DIR"
    git fetch origin
    git reset --hard "origin/$BRANCH" || git pull origin "$BRANCH" || true
else
    echo -e "${CYAN}   Meng-clone repository baru ke $APP_DIR...${NC}"
    rm -rf "$APP_DIR"
    git clone "$REPO_URL" "$APP_DIR" || {
        echo -e "${RED}[ERROR] Gagal clone repo $REPO_URL. Pastikan repository GitHub sudah dibuat dan bersifat Public.${NC}"
        exit 1
    }
    cd "$APP_DIR"
fi

# Pastikan logo resmi AwanPulsa terpasang dan sinkron
if [ -f "$APP_DIR/logo-awanpulsa.png" ]; then
    cp -f "$APP_DIR/logo-awanpulsa.png" "$APP_DIR/logo.png" 2>/dev/null || true
fi

# 6. Instal dependensi NPM
echo -e "${YELLOW}==> [5/7] Menginstal dependensi NPM untuk AwanPulsa...${NC}"
cd "$APP_DIR"
mkdir -p "$APP_DIR/data"
npm install --omit=dev || npm install --production

# 7. Setup file .env (Jika belum ada)
echo -e "${YELLOW}==> [6/7] Menyiapkan konfigurasi .env AwanPulsa...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
    if [ -f "$APP_DIR/.env.example" ]; then
        cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    else
        cat > "$APP_DIR/.env" << EOF
PORT=3002
NODE_ENV=production
APP_NAME=Awan Pulsa
DOMAIN_NAME=${DOMAIN}
ADMIN_EMAIL=admin@${DOMAIN}
BACKUP_PASSWORD=AwanPulsa2026Secure!

TOKOGORONTALO_BASE_URL=https://app.tupo.my.id
TOKOGORONTALO_USERID=your_userid
TOKOGORONTALO_PIN=your_pin
TOKOGORONTALO_PASS=your_password
EOF
    fi
    chmod 600 "$APP_DIR/.env"
    echo -e "${GREEN}   File .env berhasil dibuat di $APP_DIR/.env${NC}"
else
    echo -e "${GREEN}   File .env sudah ada, memastikan kredensial sistem terpasang...${NC}"
fi

# Perbarui Google OAuth jika variabel diberikan saat eksekusi installer
if [ -n "$GOOGLE_CLIENT_ID" ]; then
    sed -i "s|GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}|g" "$APP_DIR/.env"
fi
if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    sed -i "s|GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}|g" "$APP_DIR/.env"
fi

# Pastikan kredensial resmi Toko Gorontalo terpasang di .env
if [ -f "$APP_DIR/.env" ]; then
    sed -i "s|TOKOGORONTALO_BASE_URL=.*|TOKOGORONTALO_BASE_URL=https://app.tupo.my.id|g" "$APP_DIR/.env"
    sed -i "s|TOKOGORONTALO_USERID=.*|TOKOGORONTALO_USERID=178375739934|g" "$APP_DIR/.env"
    sed -i "s|TOKOGORONTALO_PIN=.*|TOKOGORONTALO_PIN=210284|g" "$APP_DIR/.env"
    sed -i "s|TOKOGORONTALO_PASS=.*|TOKOGORONTALO_PASS=71377019|g" "$APP_DIR/.env"
    echo -e "${GREEN}   Kredensial Toko Gorontalo (178375739934) berhasil dipasang ke .env.${NC}"
fi

# 8. Konfigurasi Nginx Virtual Host Khusus AwanPulsa (DILARANG default_server!)
echo -e "${YELLOW}==> [7/7] Mengonfigurasi Nginx Virtual Host AwanPulsa (Port ${APP_PORT})...${NC}"

SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

cat > /etc/nginx/sites-available/awanpulsa << EOF
# 1. Routing HTTP Port 80
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}

# 2. Akses Direct IP Port ${ALT_PORT} (Dapat diakses langsung via IP VPS)
server {
    listen ${ALT_PORT};
    listen [::]:${ALT_PORT};
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF

# Jika sertifikat SSL sudah pernah digenerate oleh Certbot, sertakan blok HTTPS Port 443
if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo -e "${GREEN}   Sertifikat SSL Let's Encrypt terdeteksi untuk ${DOMAIN}! Mengaktifkan blok HTTPS...${NC}"
    cat >> /etc/nginx/sites-available/awanpulsa << EOF

# 3. Routing HTTPS Port 443 Resmi AwanPulsa -> Port ${APP_PORT}
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN} www.${DOMAIN};

    ssl_certificate ${SSL_CERT};
    ssl_certificate_key ${SSL_KEY};
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
EOF
fi

# Aktifkan site Nginx khusus awanpulsa
ln -sf /etc/nginx/sites-available/awanpulsa /etc/nginx/sites-enabled/awanpulsa

# Validasi & reload Nginx
nginx -t && systemctl reload nginx

# 9. Jalankan proses PM2 khusus 'awanpulsa'
echo -e "${YELLOW}==> Memastikan proses PM2 AwanPulsa aktif (Port ${APP_PORT})...${NC}"
cd "$APP_DIR"
pm2 delete awanpulsa 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Buka firewall untuk port alternatif jika UFW aktif
ufw allow ${ALT_PORT}/tcp 2>/dev/null || true

# Ambil IP VPS Publik
SERVER_IP=$(curl -s ifconfig.me || curl -s icanhazip.com || echo "IP_VPS_ANDA")

echo ""
echo -e "${GREEN}=================================================================="
echo "  🎉 AUTOINSTALL AWANPULSA BERHASIL DIPERBARUI!"
echo "==================================================================${NC}"
echo -e "Web AwanPulsa Anda sekarang sudah AKTIF di server VPS!"
echo ""
echo -e "👉 ${CYAN}Akses Domain Resmi (HTTPS):${NC}"
echo -e "   ${YELLOW}https://${DOMAIN}${NC}"
echo ""
echo -e "👉 ${CYAN}Akses Alternatif Direct IP:${NC}"
echo -e "   ${YELLOW}http://${SERVER_IP}:${ALT_PORT}${NC}"
echo ""
echo "📌 Lokasi instalasi : /var/www/awanpulsa"
echo "📌 Status PM2       : ketik 'pm2 status' atau 'pm2 logs awanpulsa'"
echo "📌 Edit Konfigurasi : nano /var/www/awanpulsa/.env"
echo "📌 Terapkan Edit    : pm2 restart awanpulsa"
echo "=================================================================="
