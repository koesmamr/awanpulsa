const fs = require('fs');
const path = require('path');

// BACA REFERENSI DARI FOLDER 37 WARUNGPULSA (HANYA DIBACA, TIDAK DIUBAH SAMA SEKALI)
const srcPath = path.resolve(__dirname, '../37 warungpulsa/app.js');
console.log('Membaca file referensi dari:', srcPath);
let code = fs.readFileSync(srcPath, 'utf8');

// 1. Rebranding nama brand dan identitas
code = code.replace(/Warung\s*Pulsa\s*Cendana/g, 'AwanPulsa');
code = code.replace(/WARUNG\s*PULSA\s*CENDANA/g, 'AWANPULSA');
code = code.replace(/WARUNG\s*PULSA\s*CONVERTER/g, 'AWANPULSA CONVERTER');
code = code.replace(/WARUNG\s*PULSA\s*OTP\s*XL/g, 'AWANPULSA OTP XL');
code = code.replace(/Warung\s*Pulsa/g, 'AwanPulsa');
code = code.replace(/WARUNG\s*PULSA/g, 'AWANPULSA');

// 2. Domain & Email
code = code.replace(/warungpulsa\.web\.id/g, 'awanpulsa.web.id');
code = code.replace(/warungpulsa\.com/g, 'awanpulsa.web.id');
code = code.replace(/admin@warungpulsa\.com/g, 'admin@awanpulsa.web.id');

// 3. Backup tags & prefix transaksi
code = code.replace(/#warungpulsabackup/g, '#awanpulsabackup');
code = code.replace(/#warungpulsa/g, '#awanpulsa');
code = code.replace(/Backup_WarungPulsa_/g, 'Backup_AwanPulsa_');
code = code.replace(/warungpulsa/g, 'awanpulsa');
code = code.replace(/Halo%20Admin%20Warung%20Pulsa/g, 'Halo%20Admin%20AwanPulsa');
code = code.replace(/Warung\s*<span([^>]+)>Pulsa<\/span>/g, 'Awan <span$1>Pulsa</span>');

// 4. Update AI Assistant Persona ke AwanPulsa
code = code.replace(
  /Asisten Digital Warung Pulsa Cendana/g,
  'Asisten Digital AwanPulsa'
);
code = code.replace(
  /Warung Pulsa Cendana adalah platform/g,
  'AwanPulsa adalah platform'
);

// 5. Update slogan/deskripsi
code = code.replace(
  /Platform Agen Pulsa All Operator/g,
  'Platform Cloud Agen Pulsa All Operator'
);

// Simpan HANYA ke folder 39 awanpulsa
const destPath = path.resolve(__dirname, 'app.js');
fs.writeFileSync(destPath, code, 'utf8');
console.log('Berhasil membuat app.js di folder 39 awanpulsa! Ukuran file:', code.length, 'bytes.');
