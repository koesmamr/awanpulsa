#!/usr/bin/env bash
# ==============================================================================
# AUTOINSTALL SCRIPT: AWANPULSA (UBUNTU 24.04 / 22.04 LTS READY)
# Mengadopsi Pola Multi-Tenant VPS & GitHub Git Clone Seperti Warung Pulsa
# Aman Berdampingan dengan WarungPulsa & Pasar-Desa (Tanpa Bentrok)
# ==============================================================================
set -e

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
export PATH=$PATH:/usr/local/bin:/usr/bin:~/.npm-global/bin

if [ -f /etc/needrestart/needrestart.conf ]; then
    sed -i 's/#$nrconf{restart} = .*/$nrconf{restart} = "a";/g' /etc/needrestart/needrestart.conf 2>/dev/null || true
fi

wait_for_apt() {
    local max_wait=40
    local waited=0
    if command -v fuser >/dev/null 2>&1; then
        while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
            echo "   ⏳ Menunggu proses paket sistem selesai... (${waited}s)"
            sleep 3
            waited=$((waited + 3))
            if [ $waited -ge $max_wait ]; then
                killall -9 apt-get apt unattended-upgrade-shutdown dpkg 2>/dev/null || true
                rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/lib/apt/lists/lock /var/cache/apt/archives/lock
                dpkg --configure -a 2>/dev/null || true
                break
            fi
        done
    fi
}

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

# 0. Prioritaskan IPv4 di tingkat OS
echo -e "${YELLOW}==> Mengonfigurasi prioritas IPv4 murni...${NC}"
if [ -f /etc/gai.conf ]; then
    sed -i 's/#precedence ::ffff:0:0\/96  100/precedence ::ffff:0:0\/96  100/g' /etc/gai.conf
    grep -q "precedence ::ffff:0:0/96  100" /etc/gai.conf || echo "precedence ::ffff:0:0/96  100" >> /etc/gai.conf
else
    echo "precedence ::ffff:0:0/96  100" > /etc/gai.conf
fi

# Hentikan apache2 jika ada
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true
killall -9 apache2 httpd 2>/dev/null || true

# 2. Deteksi Lingkungan VPS (Cek WarungPulsa & Pasar-Desa)
echo -e "${YELLOW}==> [1/7] Memeriksa lingkungan server multi-app...${NC}"

if [ -d "/var/www/warungpulsa" ] || [ -f "/etc/nginx/sites-available/warungpulsa" ]; then
    echo -e "${GREEN}  ✓ Terdeteksi aplikasi Warung Pulsa di VPS ini.${NC}"
fi

if [ -d "/var/www/pasar-desa" ] || [ -f "/etc/nginx/sites-available/pasar-desa" ]; then
    echo -e "${GREEN}  ✓ Terdeteksi aplikasi Pasar Desa di VPS ini.${NC}"
fi

echo -e "${GREEN}  ✓ AwanPulsa akan dipasang di Port ${APP_PORT} (terisolasi) & Direct IP Port ${ALT_PORT}.${NC}"

# 3. Update paket Ubuntu & instal dependensi dasar sistem
echo -e "${YELLOW}==> [2/7] Memeriksa paket dasar sistem...${NC}"
wait_for_apt
dpkg --configure -a >/dev/null 2>&1 || true
apt-get update -y
apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential sqlite3 ca-certificates gnupg >/dev/null 2>&1 || {
    dpkg --configure -a >/dev/null 2>&1 || true
    apt-get install -f -y >/dev/null 2>&1 || true
    apt-get install -y curl git ufw nginx certbot python3-certbot-nginx build-essential sqlite3 ca-certificates gnupg
}

# 4. Periksa Node.js 22 LTS & PM2
echo -e "${YELLOW}==> [3/7] Memeriksa runtime Node.js 22 LTS...${NC}"
NODE_VER=$(node -v 2>/dev/null || echo "none")
if ! command -v node &> /dev/null || [[ $(node -v | cut -d'.' -f1 | tr -d 'v') -lt 20 ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - || true
    wait_for_apt
    dpkg --configure -a >/dev/null 2>&1 || true
    apt-get install -y nodejs
fi
echo -e "${GREEN}   Node.js: $(node -v)${NC}"
echo -e "${GREEN}   NPM: $(npm -v)${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}   Menginstal PM2 Process Manager secara global...${NC}"
    npm install -g pm2 || npm install -g pm2 --force
    hash -r 2>/dev/null || true
fi
for p in /usr/local/bin/pm2 /usr/bin/pm2 $(which pm2 2>/dev/null); do
    if [ -f "$p" ]; then
        ln -sf "$p" /usr/bin/pm2 2>/dev/null || true
        ln -sf "$p" /usr/local/bin/pm2 2>/dev/null || true
        break
    fi
done

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
        echo -e "${RED}[ERROR] Gagal clone repo $REPO_URL. Pastikan repository GitHub bersifat Public.${NC}"
        exit 1
    }
    cd "$APP_DIR"
fi

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
TOKOGORONTALO_USERID=178375739934
TOKOGORONTALO_PIN=210284
TOKOGORONTALO_PASS=71377019
EOF
    fi
    chmod 600 "$APP_DIR/.env"
    echo -e "${GREEN}   File .env berhasil dibuat di $APP_DIR/.env${NC}"
else
    echo -e "${GREEN}   File .env sudah ada, memastikan kredensial sistem terpasang...${NC}"
fi

# Pastikan kredensial resmi Toko Gorontalo terpasang di .env
if [ -f "$APP_DIR/.env" ]; then
    sed -i "s|TOKOGORONTALO_BASE_URL=.*|TOKOGORONTALO_BASE_URL=https://app.tupo.my.id|g" "$APP_DIR/.env"
    sed -i "s|TOKOGORONTALO_USERID=.*|TOKOGORONTALO_USERID=178375739934|g" "$APP_DIR/.env"
    sed -i "s|TOKOGORONTALO_PIN=.*|TOKOGORONTALO_PIN=210284|g" "$APP_DIR/.env"
    sed -i "s|TOKOGORONTALO_PASS=.*|TOKOGORONTALO_PASS=71377019|g" "$APP_DIR/.env"
    echo -e "${GREEN}   Kredensial Toko Gorontalo (178375739934 - oneng cell) terpasang di .env.${NC}"
fi

# 8. Konfigurasi Nginx Virtual Host Khusus AwanPulsa
echo -e "${YELLOW}==> [7/7] Mengonfigurasi Nginx Virtual Host AwanPulsa (Port ${APP_PORT})...${NC}"

SSL_CERT="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
SSL_KEY="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"

cat > /etc/nginx/sites-available/awanpulsa << EOF
# 1. Routing HTTP Port 80
server {
    listen 80;
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

if [ -f "$SSL_CERT" ] && [ -f "$SSL_KEY" ]; then
    echo -e "${GREEN}   Sertifikat SSL Let's Encrypt terdeteksi untuk ${DOMAIN}! Mengaktifkan blok HTTPS...${NC}"
    cat >> /etc/nginx/sites-available/awanpulsa << EOF

# 3. Routing HTTPS Port 443 Resmi AwanPulsa -> Port ${APP_PORT}
server {
    listen 443 ssl;
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
nginx -t && systemctl reload nginx

# 9. Jalankan proses PM2 khusus 'awanpulsa'
echo -e "${YELLOW}==> Memastikan proses PM2 AwanPulsa aktif (Port ${APP_PORT})...${NC}"
cd "$APP_DIR"
pm2 delete awanpulsa 2>/dev/null || true
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js
else
    pm2 start server.js --name "awanpulsa"
fi
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# Buka firewall untuk port alternatif jika UFW aktif
ufw allow ${ALT_PORT}/tcp 2>/dev/null || true
ufw allow 80/tcp 2>/dev/null || true
ufw allow 443/tcp 2>/dev/null || true

# Ambil IP VPS Publik murni IPv4
SERVER_IP=$(curl -4 -s --max-time 4 ifconfig.me 2>/dev/null || curl -4 -s --max-time 4 icanhazip.com 2>/dev/null || curl -4 -s --max-time 4 api.ipify.org 2>/dev/null || echo "IP_VPS_ANDA")

echo ""
echo -e "${GREEN}=================================================================="
echo "  🎉 AUTOINSTALL AWANPULSA BERHASIL DISELESAIKAN!"
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
echo ""
echo "⚡ WHITELIST IP TOKO GORONTALO (H2H):"
echo "   Kirimkan format berikut ke CS Toko Gorontalo (0815240260221):"
echo "   ----------------------------------------------------------------------"
echo "   Halo Admin Toko Gorontalo, tolong daftarkan IP server VPS saya untuk"
echo "   transaksi H2H akun Member ID: 178375739934 (oneng cell):"
echo "   - IP VPS (IPv4): ${SERVER_IP}"
echo "   Terima kasih!"
echo "   ----------------------------------------------------------------------"
echo "=================================================================="
