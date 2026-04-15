/**
 * build-districts.js
 * Mengunduh semua data kecamatan dari wilayah.id dan menyimpan ke data/districts.json
 * Jalankan SEKALI sebelum build Docker:
 *   node scripts/build-districts.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'AKUH-CRM/1.0', Accept: 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('📡 Mengunduh data provinsi dari wilayah.id...');
  const provRes = await get('https://wilayah.id/api/provinces.json');
  const provinces = provRes.data || [];
  console.log(`✅ ${provinces.length} provinsi ditemukan`);

  const allDistricts = [];

  for (const prov of provinces) {
    console.log(`\n🏛️  Provinsi: ${prov.name} (${prov.code})`);
    let regencies = [];
    try {
      const regRes = await get(`https://wilayah.id/api/regencies/${prov.code}.json`);
      regencies = regRes.data || [];
    } catch (e) {
      console.warn(`  ⚠️  Gagal ambil kabupaten ${prov.code}: ${e.message}`);
      continue;
    }

    for (const reg of regencies) {
      try {
        await sleep(100); // rate limit
        const distRes = await get(`https://wilayah.id/api/districts/${reg.code}.json`);
        const districts = distRes.data || [];
        for (const d of districts) {
          allDistricts.push({
            name: d.name,
            full: `${d.name}, ${reg.name}, ${prov.name}`,
            regency: reg.name,
            province: prov.name,
          });
        }
        process.stdout.write(`  ✓ ${reg.name}: ${districts.length} kecamatan\n`);
      } catch (e) {
        console.warn(`  ⚠️  Gagal ambil kecamatan ${reg.code}: ${e.message}`);
      }
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'districts.json');
  fs.writeFileSync(outPath, JSON.stringify(allDistricts, null, 2));
  console.log(`\n🎉 Selesai! ${allDistricts.length} kecamatan disimpan ke ${outPath}`);
}

main().catch(e => { console.error('❌ Fatal:', e); process.exit(1); });
