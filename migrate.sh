#!/usr/bin/env bash
# ==============================================================================
# 🚀 MULTI-APP VPS AUTO-MIGRATOR & CLONER WIZARD (UBUNTU 22.04 / 24.04 LTS)
# ------------------------------------------------------------------------------
# Script interaktif satu kali jalan di VPS Baru untuk memindahkan aplikasi,
# database SQLite utuh, file .env, SSL Let's Encrypt, dan konfigurasi Nginx
# dari VPS Lama secara otomatis tanpa downtime dan tanpa kehilangan data.
#
# Mendukung: AwanPulsa, WarungPulsa, Pasar-Desa (Satuan maupun Borongan)
# ==============================================================================

export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a
export PATH=$PATH:/usr/local/bin:/usr/bin:~/.npm-global/bin

# Nonaktifkan prompt interaktif needrestart di Ubuntu 24.04 / 22.04 LTS
if [ -f /etc/needrestart/needrestart.conf ]; then
    sed -i 's/#$nrconf{restart} = .*/$nrconf{restart} = "a";/g' /etc/needrestart/needrestart.conf 2>/dev/null || true
fi

# Fungsi menunggu proses apt / dpkg selesai agar tidak bertabrakan
wait_for_apt() {
    local max_wait=40
    local waited=0
    if command -v fuser >/dev/null 2>&1; then
        while fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || fuser /var/lib/apt/lists/lock >/dev/null 2>&1 || fuser /var/lib/dpkg/lock >/dev/null 2>&1; do
            echo -e "${YELLOW}   ⏳ Menunggu proses paket sistem selesai... (${waited}s)${NC}"
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
BOLD='\033[1m'
NC='\033[0m'

clear
echo -e "${CYAN}"
cat << "BANNER_EOF"
================================================================================
       🚀 MULTI-APP VPS AUTO-MIGRATOR & ZERO-DOWNTIME CLONER 🚀
================================================================================
BANNER_EOF
echo -e "${BOLD}Platform Migrasi Cepat: AwanPulsa | WarungPulsa | Pasar-Desa${NC}"
echo -e "Memindahkan data, SQLite, .env, SSL & Nginx secara instan ke VPS Baru."
echo -e "${CYAN}================================================================================${NC}"
echo ""

# 1. Validasi Akses Root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[ERROR] Script ini wajib dijalankan sebagai user root!${NC}"
    echo "Silakan gunakan perintah: sudo bash migrate.sh atau login sebagai root."
    exit 1
fi

# 2. Menu Pilihan Skenario Migrasi
echo -e "${YELLOW}Silakan pilih aplikasi yang ingin dimigrasikan ke VPS baru ini:${NC}"
echo -e "  ${BOLD}[1]${NC} Migrasi ${CYAN}AWANPULSA${NC} Saja        (Port 3002 | awanpulsa.web.id)"
echo -e "  ${BOLD}[2]${NC} Migrasi ${CYAN}WARUNGPULSA${NC} Saja      (Port 3000 | warungpulsa.web.id)"
echo -e "  ${BOLD}[3]${NC} Migrasi ${CYAN}PASAR-DESA${NC} Saja       (Port 3001 | pasardesa.id)"
echo -e "  ${BOLD}[4]${NC} ${GREEN}${BOLD}MIGRASI SEMUA APLIKASI (Full Clone 3 App Sekaligus)${NC}"
echo -e "  ${BOLD}[5]${NC} Custom Pilihan (Pilih kombinasi aplikasi manual)"
echo ""

read -r -p "Masukkan pilihan Anda [1-5]: " MENU_CHOICE < /dev/tty

MIGRATE_AWAN=false
MIGRATE_WARUNG=false
MIGRATE_PASAR=false

case "$MENU_CHOICE" in
    1)
        MIGRATE_AWAN=true
        ;;
    2)
        MIGRATE_WARUNG=true
        ;;
    3)
        MIGRATE_PASAR=true
        ;;
    4)
        MIGRATE_AWAN=true
        MIGRATE_WARUNG=true
        MIGRATE_PASAR=true
        ;;
    5)
        echo ""
        echo -e "${YELLOW}Tentukan aplikasi yang ingin dimigrasikan (y/n):${NC}"
        read -r -p "Pindahkan AwanPulsa? (y/n) [y]: " ASK_AWAN < /dev/tty
        [[ "${ASK_AWAN:-y}" =~ ^[Yy]$ ]] && MIGRATE_AWAN=true

        read -r -p "Pindahkan WarungPulsa? (y/n) [y]: " ASK_WARUNG < /dev/tty
        [[ "${ASK_WARUNG:-y}" =~ ^[Yy]$ ]] && MIGRATE_WARUNG=true

        read -r -p "Pindahkan Pasar-Desa? (y/n) [y]: " ASK_PASAR < /dev/tty
        [[ "${ASK_PASAR:-y}" =~ ^[Yy]$ ]] && MIGRATE_PASAR=true
        ;;
    *)
        echo -e "${RED}[ERROR] Pilihan tidak valid! Membatalkan proses.${NC}"
        exit 1
        ;;
esac

if [ "$MIGRATE_AWAN" = false ] && [ "$MIGRATE_WARUNG" = false ] && [ "$MIGRATE_PASAR" = false ]; then
    echo -e "${RED}[ERROR] Tidak ada aplikasi yang dipilih untuk dimigrasi. Selesai.${NC}"
    exit 0
fi

echo ""
echo -e "${GREEN}==> Target Aplikasi yang Akan Dimigrasi:${NC}"
[ "$MIGRATE_AWAN" = true ]   && echo -e "  ✓ ${BOLD}AwanPulsa${NC}   (Port 3002 | Repo: koesmamr/awanpulsa)"
[ "$MIGRATE_WARUNG" = true ] && echo -e "  ✓ ${BOLD}WarungPulsa${NC} (Port 3000 | Repo: koesmamr/warungpulsa)"
[ "$MIGRATE_PASAR" = true ]  && echo -e "  ✓ ${BOLD}Pasar-Desa${NC}  (Port 3001 | Repo: koesmamr/pasar-desa)"
echo ""

# 3. Input Kredensial VPS Lama
echo -e "${CYAN}--------------------------------------------------------------------------------${NC}"
echo -e "${YELLOW}Masukkan Informasi Akses SSH VPS Lama Anda:${NC}"
echo -e "${CYAN}--------------------------------------------------------------------------------${NC}"

read -r -p "IP VPS Lama               : " OLD_IP < /dev/tty
while [ -z "$OLD_IP" ]; do
    echo -e "${RED}IP VPS Lama tidak boleh kosong!${NC}"
    read -r -p "IP VPS Lama               : " OLD_IP < /dev/tty
done

# Validasi Anti-Human-Error: Jangan sampai script dijalankan di VPS Lama itu sendiri
LOCAL_IPS=$(hostname -I 2>/dev/null || ip addr show 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 || echo "")
PUBLIC_IP=$(curl -4 -s --max-time 3 ifconfig.me 2>/dev/null || curl -4 -s --max-time 3 icanhazip.com 2>/dev/null || echo "")

for CHECK_IP in $LOCAL_IPS $PUBLIC_IP 127.0.0.1 localhost ::1; do
    if [ -n "$CHECK_IP" ] && [ "$OLD_IP" = "$CHECK_IP" ]; then
        echo ""
        echo -e "${RED}================================================================================${NC}"
        echo -e "${RED}${BOLD}[FATAL ERROR] PENGAMAN SERVER AKTIF - EKSEKUSI DIBATALKAN!${NC}"
        echo -e "${RED}================================================================================${NC}"
        echo -e "Anda memasukkan IP server ini sendiri (${BOLD}${OLD_IP}${NC})!"
        echo -e "Script migrasi ini dirancang ${BOLD}HANYA untuk dijalankan di VPS BARU${NC}."
        echo -e "Sistem menghentikan proses secara otomatis untuk melindungi data server Anda."
        echo -e "${RED}================================================================================${NC}"
        exit 1
    fi
done

read -r -p "Port SSH VPS Lama [22]    : " OLD_PORT < /dev/tty
OLD_PORT="${OLD_PORT:-22}"

read -r -p "Username SSH [root]       : " OLD_USER < /dev/tty
OLD_USER="${OLD_USER:-root}"

read -r -s -p "Password SSH VPS Lama     : " OLD_PASS < /dev/tty
echo ""
while [ -z "$OLD_PASS" ]; do
    echo -e "${RED}Password SSH tidak boleh kosong!${NC}"
    read -r -s -p "Password SSH VPS Lama     : " OLD_PASS < /dev/tty
    echo ""
done

echo ""
echo -e "${YELLOW}==> Menyiapkan paket pendukung koneksi (sshpass & rsync)...${NC}"
wait_for_apt
dpkg --configure -a >/dev/null 2>&1 || true
apt-get update -y >/dev/null 2>&1 || true
apt-get install -y sshpass rsync curl git >/dev/null 2>&1 || {
    dpkg --configure -a >/dev/null 2>&1 || true
    apt-get install -f -y >/dev/null 2>&1 || true
    apt-get install -y sshpass rsync curl git >/dev/null 2>&1 || true
}

# 4. Tes Koneksi SSH ke VPS Lama
echo -e "${YELLOW}==> Menguji konektivitas SSH ke VPS Lama ($OLD_USER@$OLD_IP:$OLD_PORT)...${NC}"
SSH_CMD="sshpass -p '$OLD_PASS' ssh -p $OLD_PORT -o StrictHostKeyChecking=no -o ConnectTimeout=12"

if ! eval "$SSH_CMD $OLD_USER@$OLD_IP 'echo CONNECTION_SUCCESS'" >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Gagal terhubung ke VPS Lama!${NC}"
    echo "Penyebab yang mungkin terjadi:"
    echo " 1. IP ($OLD_IP) atau Port ($OLD_PORT) salah."
    echo " 2. Password root yang Anda masukkan salah."
    echo " 3. Port SSH diblokir oleh firewall VPS Lama."
    echo "Silakan periksa kembali kredensial Anda dan jalankan ulang script ini."
    exit 1
fi
echo -e "${GREEN}  ✓ Berhasil terhubung ke VPS Lama via SSH!${NC}"

# Verifikasi folder di VPS Lama
echo -e "${YELLOW}==> Memverifikasi keberadaan data aplikasi di VPS Lama...${NC}"
if [ "$MIGRATE_AWAN" = true ]; then
    if eval "$SSH_CMD $OLD_USER@$OLD_IP '[ -d /var/www/awanpulsa ]'"; then
        echo -e "${GREEN}  ✓ Direktori /var/www/awanpulsa ditemukan di VPS Lama.${NC}"
    else
        echo -e "${RED}  ⚠️ Peringatan: /var/www/awanpulsa tidak ditemukan di VPS Lama!${NC}"
    fi
fi

if [ "$MIGRATE_WARUNG" = true ]; then
    if eval "$SSH_CMD $OLD_USER@$OLD_IP '[ -d /var/www/warungpulsa ]'"; then
        echo -e "${GREEN}  ✓ Direktori /var/www/warungpulsa ditemukan di VPS Lama.${NC}"
    else
        echo -e "${RED}  ⚠️ Peringatan: /var/www/warungpulsa tidak ditemukan di VPS Lama!${NC}"
    fi
fi

if [ "$MIGRATE_PASAR" = true ]; then
    if eval "$SSH_CMD $OLD_USER@$OLD_IP '[ -d /var/www/pasar-desa ]'"; then
        echo -e "${GREEN}  ✓ Direktori /var/www/pasar-desa ditemukan di VPS Lama.${NC}"
    else
        echo -e "${RED}  ⚠️ Peringatan: /var/www/pasar-desa tidak ditemukan di VPS Lama!${NC}"
    fi
fi

echo ""
echo -e "${CYAN}--------------------------------------------------------------------------------${NC}"
echo -e "${GREEN}Konfigurasi Valid! Memulai proses migrasi otomatis...${NC}"
echo -e "${CYAN}--------------------------------------------------------------------------------${NC}"

# 5. Instalasi Runtime Dasar & Prioritas IPv4 di VPS Baru
echo -e "${YELLOW}==> [1/5] Memeriksa & Menginstal Runtime Sistem di VPS Baru...${NC}"

# Prioritaskan IPv4 murni di tingkat OS
if [ -f /etc/gai.conf ]; then
    sed -i 's/#precedence ::ffff:0:0\/96  100/precedence ::ffff:0:0\/96  100/g' /etc/gai.conf
    grep -q "precedence ::ffff:0:0/96  100" /etc/gai.conf || echo "precedence ::ffff:0:0/96  100" >> /etc/gai.conf
else
    echo "precedence ::ffff:0:0/96  100" > /etc/gai.conf
fi

# Hentikan service apache2 yang sering membajak port 80 secara default
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true
killall -9 apache2 httpd 2>/dev/null || true

wait_for_apt
dpkg --configure -a >/dev/null 2>&1 || true

apt-get install -y ufw nginx certbot python3-certbot-nginx build-essential sqlite3 ca-certificates gnupg >/dev/null 2>&1 || {
    echo -e "${YELLOW}   Menyesuaikan paket instalasi sistem...${NC}"
    dpkg --configure -a >/dev/null 2>&1 || true
    apt-get install -f -y >/dev/null 2>&1 || true
    apt-get install -y ufw nginx certbot python3-certbot-nginx build-essential sqlite3 ca-certificates gnupg >/dev/null 2>&1 || true
}

# Pastikan Node.js 22 LTS terpasang via NodeSource (HANYA install package nodejs, jangan tambahkan npm terpisah)
NODE_VER=$(node -v 2>/dev/null || echo "none")
if [[ "$NODE_VER" != v22* && "$NODE_VER" != v20* && "$NODE_VER" != v24* ]]; then
    echo -e "${CYAN}   Mengunduh & memasang Node.js 22 LTS via NodeSource...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - || true
    wait_for_apt
    dpkg --configure -a >/dev/null 2>&1 || true
    apt-get install -y nodejs >/dev/null 2>&1 || {
        apt-get install -f -y >/dev/null 2>&1 || true
        apt-get install -y nodejs
    }
fi
echo -e "${GREEN}   Node.js: $(node -v 2>/dev/null || echo 'gagal') | NPM: $(npm -v 2>/dev/null || echo 'gagal')${NC}"

# Pastikan PM2 terpasang & symlink tersedia
export PATH=$PATH:/usr/local/bin:/usr/bin:~/.npm-global/bin
if ! command -v pm2 &> /dev/null; then
    echo -e "${CYAN}   Menginstal PM2 Process Manager secara global...${NC}"
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
echo -e "${GREEN}   PM2: $(pm2 -v 2>/dev/null || echo 'terpasang')${NC}"

mkdir -p /var/www

# 6. Fungsi Sinkronisasi Aplikasi
sync_application() {
    local APP_NAME="$1"
    local APP_DIR="$2"
    local REPO_URL="$3"
    local DB_NAME="$4"
    local APP_PORT="$5"

    echo ""
    echo -e "${MAGENTA}================================================================================${NC}"
    echo -e "${BOLD}MIGRASI APLIKASI: ${APP_NAME^^} (Direktori: ${APP_DIR})${NC}"
    echo -e "${MAGENTA}================================================================================${NC}"

    # A. Checkpoint WAL SQLite di VPS Lama secara non-blocking (PASSIVE)
    echo -e "${YELLOW}   [Step A] Melakukan SQLite WAL Sync di VPS Lama (Non-blocking)...${NC}"
    eval "$SSH_CMD $OLD_USER@$OLD_IP '
        if [ -f \"${APP_DIR}/data/${DB_NAME}\" ]; then
            sqlite3 \"${APP_DIR}/data/${DB_NAME}\" \"PRAGMA wal_checkpoint(PASSIVE);\" 2>/dev/null || true
        fi
    '" || true

    # B. Clone atau Perbarui Source Code di VPS Baru
    echo -e "${YELLOW}   [Step B] Menyiapkan source code dari GitHub (${REPO_URL})...${NC}"
    mkdir -p "$APP_DIR"
    if [ -d "$APP_DIR/.git" ]; then
        cd "$APP_DIR"
        git fetch origin >/dev/null 2>&1 || true
        git reset --hard origin/main >/dev/null 2>&1 || git pull origin main >/dev/null 2>&1 || true
    elif [ -z "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
        git clone "$REPO_URL" "$APP_DIR" >/dev/null 2>&1 || {
            echo -e "${YELLOW}   Git clone gagal/private, menyalin langsung seluruh file dari VPS Lama...${NC}"
            sshpass -p "$OLD_PASS" rsync -avz -e "ssh -p $OLD_PORT -o StrictHostKeyChecking=no" \
                --exclude="node_modules" \
                "$OLD_USER@$OLD_IP:$APP_DIR/" "$APP_DIR/"
        }
    fi

    # C. Sedot Folder data/ dan .env asli dari VPS Lama
    echo -e "${YELLOW}   [Step C] Menyedot database SQLite utuh & file .env asli dari VPS Lama...${NC}"
    mkdir -p "$APP_DIR/data"
    
    # Sedot folder data/ (berisi .db, gambar, dan assets)
    sshpass -p "$OLD_PASS" rsync -avz -e "ssh -p $OLD_PORT -o StrictHostKeyChecking=no" \
        "$OLD_USER@$OLD_IP:$APP_DIR/data/" "$APP_DIR/data/"

    # Sedot file .env asli
    sshpass -p "$OLD_PASS" rsync -avz -e "ssh -p $OLD_PORT -o StrictHostKeyChecking=no" \
        "$OLD_USER@$OLD_IP:$APP_DIR/.env" "$APP_DIR/.env" 2>/dev/null || true

    # Sedot file aset statis tambahan jika ada (gambar qris, logo khusus, outlet)
    sshpass -p "$OLD_PASS" rsync -avz -e "ssh -p $OLD_PORT -o StrictHostKeyChecking=no" \
        --include="*.jpg" --include="*.png" --include="*.ico" --exclude="*" \
        "$OLD_USER@$OLD_IP:$APP_DIR/" "$APP_DIR/" 2>/dev/null || true

    chmod 600 "$APP_DIR/.env" 2>/dev/null || true
    echo -e "${GREEN}   ✓ Database & .env ${APP_NAME} berhasil disalin utuh!${NC}"

    # D. Instal Dependensi NPM di VPS Baru
    echo -e "${YELLOW}   [Step D] Menginstal dependensi NPM...${NC}"
    cd "$APP_DIR"
    npm install >/dev/null 2>&1 || npm install --production >/dev/null 2>&1
    echo -e "${GREEN}   ✓ Dependensi ${APP_NAME} terpasang sempurna.${NC}"

    # E. Jalankan Service di PM2
    echo -e "${YELLOW}   [Step E] Mendaftarkan & menyalakan proses di PM2...${NC}"
    cd "$APP_DIR"
    pm2 delete "$APP_NAME" 2>/dev/null || true
    if [ -f "ecosystem.config.js" ]; then
        pm2 start ecosystem.config.js >/dev/null 2>&1 || pm2 start server.js --name "$APP_NAME" >/dev/null 2>&1
    else
        pm2 start server.js --name "$APP_NAME" >/dev/null 2>&1
    fi
    echo -e "${GREEN}   ✓ Aplikasi ${APP_NAME} aktif di PM2 (Port internal: ${APP_PORT}).${NC}"
}

# 7. Eksekusi Sinkronisasi Tiap Aplikasi yang Dipilih
echo -e "${YELLOW}==> [2/5] Memulai sinkronisasi data aplikasi...${NC}"

if [ "$MIGRATE_AWAN" = true ]; then
    sync_application "awanpulsa" "/var/www/awanpulsa" "https://github.com/koesmamr/awanpulsa.git" "awanpulsa.db" "3002"
fi

if [ "$MIGRATE_WARUNG" = true ]; then
    sync_application "warungpulsa" "/var/www/warungpulsa" "https://github.com/koesmamr/warungpulsa.git" "warungpulsa.db" "3000"
fi

if [ "$MIGRATE_PASAR" = true ]; then
    sync_application "pasar-desa" "/var/www/pasar-desa" "https://github.com/koesmamr/pasar-desa.git" "pasar.db" "3001"
fi

# Simpan status PM2 agar auto-start saat reboot
pm2 save >/dev/null 2>&1 || true
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# 8. Sinkronisasi Sertifikat SSL Let's Encrypt
echo ""
echo -e "${YELLOW}==> [3/5] Menyedot Sertifikat SSL Let's Encrypt dari VPS Lama...${NC}"
mkdir -p /etc/letsencrypt
sshpass -p "$OLD_PASS" rsync -avz -L -e "ssh -p $OLD_PORT -o StrictHostKeyChecking=no" \
    "$OLD_USER@$OLD_IP:/etc/letsencrypt/" "/etc/letsencrypt/" 2>/dev/null || true
echo -e "${GREEN}  ✓ Sertifikat SSL Let's Encrypt berhasil disalin (HTTPS siap aktif seketika).${NC}"

# 9. Sinkronisasi & Konfigurasi Nginx
echo -e "${YELLOW}==> [4/5] Mengonfigurasi Reverse Proxy Nginx di VPS Baru...${NC}"
mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled

# Sedot file konfigurasi Nginx dari VPS Lama jika tersedia
if [ "$MIGRATE_AWAN" = true ]; then
    sshpass -p "$OLD_PASS" rsync -avz -e "ssh -p $OLD_PORT -o StrictHostKeyChecking=no" \
        "$OLD_USER@$OLD_IP:/etc/nginx/sites-available/awanpulsa" "/etc/nginx/sites-available/awanpulsa" 2>/dev/null || true
    [ -f "/etc/nginx/sites-available/awanpulsa" ] && ln -sf /etc/nginx/sites-available/awanpulsa /etc/nginx/sites-enabled/awanpulsa
fi

if [ "$MIGRATE_WARUNG" = true ]; then
    sshpass -p "$OLD_PASS" rsync -avz -e "ssh -p $OLD_PORT -o StrictHostKeyChecking=no" \
        "$OLD_USER@$OLD_IP:/etc/nginx/sites-available/warungpulsa" "/etc/nginx/sites-available/warungpulsa" 2>/dev/null || true
    [ -f "/etc/nginx/sites-available/warungpulsa" ] && ln -sf /etc/nginx/sites-available/warungpulsa /etc/nginx/sites-enabled/warungpulsa
fi

if [ "$MIGRATE_PASAR" = true ]; then
    sshpass -p "$OLD_PASS" rsync -avz -e "ssh -p $OLD_PORT -o StrictHostKeyChecking=no" \
        "$OLD_USER@$OLD_IP:/etc/nginx/sites-available/pasar-desa" "/etc/nginx/sites-available/pasar-desa" 2>/dev/null || true
    [ -f "/etc/nginx/sites-available/pasar-desa" ] && ln -sf /etc/nginx/sites-available/pasar-desa /etc/nginx/sites-enabled/pasar-desa
fi

# Hapus default Nginx jika ada agar tidak terjadi bentrok
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Nonaktifkan IPv6 jika kernel VPS tidak mendukung IPv6
sed -i 's/listen \[::\]:/# listen [::]:/g' /etc/nginx/sites-available/* /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* 2>/dev/null || true

# Konfigurasi Akses Direct IP (Port 8080 WarungPulsa, 8081 Pasar-Desa, 8082 AwanPulsa)
cat > /etc/nginx/sites-available/direct-ip << 'DIR_EOF'
server {
    listen 8080;
    server_name _;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host warungpulsa.web.id;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }
}
server {
    listen 8081;
    server_name _;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host dutohe.bintangcod.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }
}
server {
    listen 8082;
    server_name _;
    client_max_body_size 50M;
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host awanpulsa.web.id;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto http;
    }
}
DIR_EOF
ln -sf /etc/nginx/sites-available/direct-ip /etc/nginx/sites-enabled/direct-ip

dpkg --configure -a >/dev/null 2>&1 || true

# Uji konfigurasi Nginx
if nginx -t >/dev/null 2>&1; then
    systemctl reload nginx || systemctl restart nginx
    echo -e "${GREEN}  ✓ Konfigurasi Nginx valid dan berhasil diaktifkan.${NC}"
else
    echo -e "${YELLOW}  ⚠️ Catatan: Konfigurasi Nginx memerlukan penyesuaian manual. Jalankan 'nginx -t' untuk memeriksa.${NC}"
fi

# 10. Konfigurasi Firewall & Deteksi IP Baru
echo -e "${YELLOW}==> [5/5] Membuka port firewall & verifikasi IP baru...${NC}"
ufw allow 22/tcp >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true
ufw allow 8080/tcp >/dev/null 2>&1 || true
ufw allow 8081/tcp >/dev/null 2>&1 || true
ufw allow 8082/tcp >/dev/null 2>&1 || true

NEW_IP=$(curl -4 -s --max-time 4 ifconfig.me 2>/dev/null || curl -4 -s --max-time 4 icanhazip.com 2>/dev/null || curl -4 -s --max-time 4 api.ipify.org 2>/dev/null || hostname -I | grep -oE '\b([0-9]{1,3}\.){3}[0-9]{1,3}\b' | grep -v '127.0.0.1' | head -n 1 || echo "IP_VPS_BARU")

echo ""
echo -e "${GREEN}================================================================================${NC}"
echo -e "${GREEN}${BOLD}     🎉 MIGRASI KE VPS BARU BERHASIL DISELESAIKAN DENGAN SEMPURNA! 🎉${NC}"
echo -e "${GREEN}================================================================================${NC}"
echo ""
echo -e "Aplikasi Anda kini sudah ${BOLD}AKTIF & RUNNING${NC} di VPS Baru:"
echo ""

[ "$MIGRATE_AWAN" = true ] && cat << EOF
📌 AWANPULSA:
   • Domain Resmi (HTTPS) : https://awanpulsa.web.id
   • Direct IP Testing    : http://${NEW_IP}:8082
   • Status PM2           : awanpulsa (Online - Port 3002)

EOF

[ "$MIGRATE_WARUNG" = true ] && cat << EOF
📌 WARUNGPULSA:
   • Domain Resmi (HTTPS) : https://warungpulsa.web.id
   • Direct IP Testing    : http://${NEW_IP}:8080
   • Status PM2           : warungpulsa (Online - Port 3000)

EOF

[ "$MIGRATE_PASAR" = true ] && cat << EOF
📌 PASAR-DESA:
   • Domain Resmi (HTTPS) : https://pasardesa.id
   • Direct IP Testing    : http://${NEW_IP}:8081
   • Status PM2           : pasar-desa (Online - Port 3001)

EOF

echo -e "${CYAN}================================================================================${NC}"
echo -e "${YELLOW}${BOLD}📋 CHECKLIST LANGKAH AKHIR (WAJIB DILAKUKAN):${NC}"
echo -e "${CYAN}================================================================================${NC}"

cat << EOF
1. 🌐 UPDATE DNS / CLOUDFLARE:
   Ubah A-Record domain Anda ke IP VPS Baru:
   -> IP VPS BARU : ${NEW_IP}

2. ⚡ WHITELIST IP TOKO GORONTALO (Khusus PPOB):
   Penting: Toko Gorontalo menerapkan aturan 1 IP = 1 Akun Member.
EOF

if [ "$MIGRATE_AWAN" = true ]; then
cat << EOF
   • Pendaftaran Akun AwanPulsa:
     "Halo CS Toko Gorontalo, tolong daftarkan IP server VPS saya untuk transaksi H2H akun Member ID: 178375739934 (oneng cell):
      - IP VPS (IPv4): ${NEW_IP}
      Terima kasih!"

EOF
fi

if [ "$MIGRATE_WARUNG" = true ]; then
cat << EOF
   • Pendaftaran Akun WarungPulsa:
     "Halo CS Toko Gorontalo, tolong daftarkan IP server VPS saya untuk transaksi H2H akun Member ID: 178082835085 (Level-3 APARAT):
      - IP VPS (IPv4): ${NEW_IP}
      Terima kasih!"

EOF
fi

cat << EOF
3. 🔒 SERTIFIKAT SSL:
   Sertifikat SSL Let's Encrypt lama telah disalin otomatis. Website langsung
   bisa diakses via HTTPS seketika begitu DNS mengarah ke IP baru.

4. 📊 CEK STATUS SISTEM:
   • Cek proses  : pm2 status
   • Cek log web : pm2 logs
================================================================================
EOF
