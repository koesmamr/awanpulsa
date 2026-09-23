# ☁️ AwanPulsa (Ubuntu VPS Ready & Multi-Tenant)

Platform layanan isi ulang pulsa all operator, paket data internet, PPOB, token PLN, e-wallet, voucher game, dan layanan digital otomatis berbasis **Node.js** dan **SQLite** lokal.

> **💡 Multi-App Safe:** Aplikasi ini dirancang agar dapat diinstal di VPS baru maupun **berdampingan dengan aplikasi lain yang sudah ada** (seperti `warungpulsa` di Port 3000 dan `pasar-desa` di Port 3001) tanpa bentrok port dan tanpa menimpa konfigurasi Nginx yang sudah berjalan.

---

## ⚡ Metode Cepat: Autoinstall 1 Perintah (Rekomendasi VPS)

Setelah semua file di-push ke repository GitHub (`koesmamr/awanpulsa`), Anda cukup login sebagai user **`root`** via SSH di VPS dan jalankan **1 baris perintah** berikut:

```bash
curl -sSL https://raw.githubusercontent.com/koesmamr/awanpulsa/main/install.sh | bash
```

*(Atau jika ingin menentukan domain atau port secara dinamis saat eksekusi):*
```bash
DOMAIN="awanpulsa.web.id" curl -sSL https://raw.githubusercontent.com/koesmamr/awanpulsa/main/install.sh | bash
```

---

## 📤 Langkah Upload / Push File ke GitHub (Pertama Kali)

Buka terminal di komputer lokal pada folder `39 awanpulsa` lalu jalankan perintah berikut untuk meng-upload ke repository GitHub:

```bash
# 1. Inisialisasi Git
git init
git add .
git commit -m "feat: initial commit AwanPulsa ready for multi-tenant VPS"

# 2. Atur branch utama ke main
git branch -M main

# 3. Hubungkan ke repository GitHub Anda (buat repository 'awanpulsa' terlebih dahulu di github.com)
git remote add origin https://github.com/koesmamr/awanpulsa.git

# 4. Push ke GitHub
git push -u origin main
```

---

## 🛡️ Mengapa Aman dari Bentrok dengan Warung Pulsa & Pasar Desa?

Script autoinstall telah dibekali isolasi multi-aplikasi:
1. **Port Internal Khusus**:
   - `warungpulsa` berjalan di internal Port **3000**.
   - `pasar-desa` berjalan di internal Port **3001**.
   - **`awanpulsa`** berjalan di internal Port **3002**.
2. **Akses Direct IP Sebelum DNS Aktif**:
   - Nginx otomatis menyiapkan port `8082` (`http://IP_VPS:8082`) agar web AwanPulsa bisa diakses dan ditinjau sebelum pengaturan DNS domain `awanpulsa.web.id` selesai.
3. **Proses PM2 Terpisah**:
   - Memiliki nama unik `awanpulsa`, sehingga perintah `pm2 restart awanpulsa` tidak akan mengganggu `warungpulsa` maupun `pasar-desa`.
4. **Konfigurasi Nginx Aman**:
   - Menggunakan file `/etc/nginx/sites-available/awanpulsa` dengan filter domain khusus dan **TIDAK menggunakan `default_server`**, sehingga domain lain tetap aman 100%.
5. **Database SQLite Mandiri**:
   - File database tersimpan di `/var/www/awanpulsa/data/awanpulsa.db`.

---

## 🌐 Cara Hubungkan Domain `awanpulsa.web.id` & Pasang SSL (HTTPS)

1. Di registrar domain tempat Anda membeli `awanpulsa.web.id`, buat **DNS A Record**:
   - **Host:** `@` &rarr; **Target:** `IP_VPS_ANDA`
   - **Host:** `www` &rarr; **Target:** `IP_VPS_ANDA`
2. Tunggu masa propagasi DNS (5 - 30 menit).
3. Setelah domain mengarah ke VPS, aktifkan HTTPS gratis Let's Encrypt:
   ```bash
   certbot --nginx -d awanpulsa.web.id -d www.awanpulsa.web.id
   ```

---

## 🔌 Konfigurasi API Toko Gorontalo (Akun / Kode Berbeda)

Buka file konfigurasi di VPS:
```bash
nano /var/www/awanpulsa/.env
```

Sesuaikan kredensial Toko Gorontalo dengan akun baru AwanPulsa Anda:
```env
TOKOGORONTALO_BASE_URL=https://app.tupo.my.id
TOKOGORONTALO_USERID=userid_baru_anda
TOKOGORONTALO_PIN=pin_baru_anda
TOKOGORONTALO_PASS=password_baru_anda
```

> **Catatan Penting:** Daftarkan IP Publik VPS Anda ke pihak Admin / CS Toko Gorontalo untuk akun baru ini agar transaksi H2H diizinkan.

Setelah mengedit `.env`, restart aplikasi:
```bash
pm2 restart awanpulsa
```

Lalu masuk ke panel Admin di web: `http://awanpulsa.web.id/admin#tokogorontalo` (atau via port 8082) dan klik tombol **"Sinkronkan Katalog Produk"** untuk mengunduh seluruh produk secara otomatis.

---

## 🛠️ Perintah Pemeliharaan Server

| Kebutuhan | Perintah di Terminal VPS |
| :--- | :--- |
| **Cek Status Semua Server** | `pm2 status` |
| **Lihat Log Realtime AwanPulsa** | `pm2 logs awanpulsa` |
| **Restart AwanPulsa** | `pm2 restart awanpulsa` |
| **Stop AwanPulsa** | `pm2 stop awanpulsa` |
| **Edit Konfigurasi API** | `nano /var/www/awanpulsa/.env` *(lalu `pm2 restart awanpulsa`)* |
| **Reload Web Server Nginx** | `systemctl reload nginx` |
| **Backup Database Manual** | `cp /var/www/awanpulsa/data/awanpulsa.db /root/backup-awanpulsa-$(date +%F).db` |
