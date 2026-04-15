const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'data', 'leads.json');
const raw = fs.readFileSync(file, 'utf8');
const leads = JSON.parse(raw);

const kecamatans = [
  'Kebayoran Baru', 'Kebayoran Lama', 'Tebet', 'Setiabudi', 'Mampang Prapatan',
  'Pasar Minggu', 'Cilandak', 'Jagakarsa', 'Pancoran', 'Pesanggrahan',
  'Senen', 'Gambir', 'Menteng', 'Sawah Besar', 'Cempaka Putih',
  'Johar Baru', 'Kemayoran', 'Tanah Abang', 'Tambora', 'Grogol Petamburan',
  'Taman Sari', 'Cengkareng', 'Kebon Jeruk', 'Kalideres', 'Palmerah',
  'Kembangan', 'Penjaringan', 'Tanjung Priok', 'Koja', 'Cilincing',
  'Pademangan', 'Kelapa Gading', 'Matraman', 'Pulo Gadung', 'Jatinegara',
  'Duren Sawit', 'Kramat Jati', 'Makasar', 'Pasar Rebo', 'Ciracas',
  'Cipayung', 'Cakung', 'Bogor Tengah', 'Bogor Barat', 'Bogor Timur',
  'Beji', 'Pancoran Mas', 'Cipayung', 'Sukmajaya', 'Cimanggis'
];

const utmSources = ['ig_ads', 'fb_ads', 'google_ads', 'tiktok_ads', 'organic', 'direct'];
const utmCampaigns = ['promo_umrah_hemat', 'haji_khusus_2026', 'umrah_plus_turki', 'leads_januari', 'flash_sale'];

const updated = leads.map(l => ({
  ...l,
  wilayah: l.wilayah || kecamatans[Math.floor(Math.random() * kecamatans.length)],
  utm_source: l.utm_source || utmSources[Math.floor(Math.random() * utmSources.length)],
  utm_medium: l.utm_medium || 'social_media',
  utm_campaign: l.utm_campaign || utmCampaigns[Math.floor(Math.random() * utmCampaigns.length)]
}));

fs.writeFileSync(file, JSON.stringify(updated, null, 2));
console.log('✅ Berhasil mengupdate 50 data dummy dengan Wilayah & UTM!');
