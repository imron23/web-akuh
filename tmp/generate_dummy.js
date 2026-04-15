const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const names = ['Ahmad Basuki', 'Siti Aminah', 'Budi Santoso', 'Laila Sari', 'Haji Mansur', 'Dewi Lestari', 'Joko Widodo', 'Andi Pratama', 'Nurul Hidayah', 'Rahmat Hidayat', 'Eko Prasetyo', 'Ratna Galih', 'Dedi Kusnadi', 'Ani Suryani', 'Hendra Wijaya', 'Siska Zuliani', 'Bambang Irawan', 'Tuti Alawiyah', 'Agus Setiawan', 'Maya Putri', 'Rizki Ramadhan', 'Indah Permata', 'Zulkifli Hasan', 'Anita Safitri', 'Ridwan Kamil', 'Lina Marlina', 'Dodi Kurniawan', 'Sri Wahyuni', 'Surya Saputra', 'Ida Farida', 'Fajar Shiddiq', 'Yuni Shara', 'Taufik Hidayat', 'Rini Soemarno', 'Adi Bing Slamet', 'Yanti Kusuma', 'Aris Munandar', 'Santi Pelangi', 'Ujang Komarudin', 'Enny Sagita', 'Iwan Fals', 'Rossa Roslaina', 'Afgan Syahreza', 'Raisa Andriana', 'Tulus Rusydi', 'Isyana Sarasvati', 'Vidi Aldiano', 'Lyodra Ginting', 'Tiara Andini', 'Ziva Magnolya'];

const relations = ['Orang Tua', 'Pasangan', 'Anak', 'Saudara', 'Teman'];
const targets = ['Umrah', 'Haji'];
const budgets = ['under25', '25to35', 'over35'];
const times = ['1-2-bulan', '3-6-bulan', 'musim-liburan', 'belum-pasti'];
const paspors = ['ready', 'mati', 'belum'];
const statuses = ['baru', 'proses', 'closing', 'batal'];
const sources = ['wizard', 'wizard-lansia', 'exit-popup', 'hero-cta'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDummy() {
  const leads = [];
  const now = new Date();

  for (let i = 0; i < 50; i++) {
    const isLansia = Math.random() > 0.7;
    const jamaahCount = isLansia ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 5) + 1;
    
    const profiles = [];
    for (let j = 0; j < jamaahCount; j++) {
      let age;
      if (isLansia && j === 0) {
        age = Math.floor(Math.random() * 20) + 60; // 60-80
      } else {
        age = Math.floor(Math.random() * 50) + 10; // 10-60
      }
      profiles.push({
        relation: j === 0 ? 'Diri Sendiri' : getRandomItem(relations),
        age: age.toString()
      });
    }

    const createdAt = new Date(now.getTime() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)); // Random date in last 30 days

    leads.push({
      id: crypto.randomUUID(),
      name: names[i],
      phone: '628' + Math.floor(1000000000 + Math.random() * 9000000000),
      targetType: getRandomItem(targets),
      budget: getRandomItem(budgets),
      waktu: getRandomItem(times),
      jamaah: jamaahCount,
      paspor: getRandomItem(paspors),
      profiles: profiles,
      source: isLansia ? 'wizard-lansia' : getRandomItem(sources),
      pageUrl: 'https://akuh.id/',
      ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      createdAt: createdAt.toISOString(),
      status: getRandomItem(statuses)
    });
  }

  // Sort by date desc
  leads.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
  
  fs.writeFileSync(path.join(dataDir, 'leads.json'), JSON.stringify(leads, null, 2));
  console.log('✅ Berhasil membuat 50 data dummy variatif!');
}

generateDummy();
