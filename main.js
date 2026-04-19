// ===== UTM & TRACKING PARAMS =====
const utmParams = {
  source: new URLSearchParams(window.location.search).get('utm_source') || '',
  medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
  campaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
  content: new URLSearchParams(window.location.search).get('utm_content') || ''
};

// ===== VALIDASI NOMOR HP INDONESIA =====
/**
 * Format yang valid:
 *  - 08xxxxxxx   (min 10 digit total)
 *  - 628xxxxxxx  (mulai 62, min 10 digit)
 *  - +628xxxxxxx (mulai +62)
 *  - Panjang digit bersih: 8–13 angka
 */
function validatePhoneID(raw) {
  // Hapus semua karakter selain angka dan +
  const cleaned = raw.replace(/[^\d+]/g, '');
  // Hapus leading + jika ada
  const digitsOnly = cleaned.replace(/^\+/, '');

  // Harus dimulai dengan 08 atau 628
  if (!/^(08|628)/.test(digitsOnly)) {
    return { valid: false, msg: 'Mulai dengan 08 atau 628 (contoh: 08123456789)' };
  }

  // Hitung digit murni (tanpa strip/spasi)
  const digitCount = digitsOnly.length;
  if (digitCount < 9) {
    return { valid: false, msg: `Nomor terlalu pendek (${digitCount} digit, min 10 untuk 08xx / min 11 untuk 628xx)` };
  }
  if (digitCount > 15) {
    return { valid: false, msg: 'Nomor terlalu panjang (maks 15 digit)' };
  }

  return { valid: true, normalized: digitsOnly };
}

// ===== HELPER: Tampilkan error field =====
function setFieldError(input, msg) {
  input.style.borderColor = '#ef4444';
  input.style.boxShadow = '0 0 0 3px rgba(239,68,68,.15)';
  // Hapus error lama
  const old = input.parentElement.querySelector('.field-err');
  if (old) old.remove();
  if (msg) {
    const err = document.createElement('div');
    err.className = 'field-err';
    err.style.cssText = 'color:#ef4444;font-size:11px;font-weight:600;margin-top:4px;display:flex;align-items:center;gap:4px';
    err.innerHTML = `<span>⚠️</span> ${msg}`;
    input.parentElement.appendChild(err);
  }
  // Shake animation
  input.classList.remove('shake');
  void input.offsetWidth;
  input.classList.add('shake');
}

function clearFieldError(input) {
  input.style.borderColor = '';
  input.style.boxShadow = '';
  const old = input.parentElement.querySelector('.field-err');
  if (old) old.remove();
  input.classList.remove('shake');
}

// Inject shake CSS sekali
(function injectValidationStyles() {
  if (document.getElementById('validation-styles')) return;
  const s = document.createElement('style');
  s.id = 'validation-styles';
  s.textContent = `
    @keyframes shake {
      0%,100%{transform:translateX(0)}
      20%,60%{transform:translateX(-5px)}
      40%,80%{transform:translateX(5px)}
    }
    .shake { animation: shake .35s ease; }
    .field-ok {
      border-color: #10b981 !important;
      box-shadow: 0 0 0 3px rgba(16,185,129,.12) !important;
    }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin:0; }
    input[type=number] { -moz-appearance: textfield; }
  `;
  document.head.appendChild(s);
})();

// ===== ENFORCE NUMBER-ONLY INPUT =====
function enforceNumberOnly(input, opts = {}) {
  const { min = null, max = null } = opts;

  // Blokir karakter non-angka saat mengetik
  input.addEventListener('keydown', (e) => {
    const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Enter'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return; // Allow ctrl+a, ctrl+c, etc.
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  });

  // Hapus karakter non-angka saat paste
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const digits = pasted.replace(/\D/g, '');
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const current = input.value;
    input.value = current.slice(0, start) + digits + current.slice(end);
    input.dispatchEvent(new Event('input'));
  });

  // Validasi range saat blur
  if (min !== null || max !== null) {
    input.addEventListener('blur', () => {
      const val = parseInt(input.value);
      if (isNaN(val)) { setFieldError(input, `Harap isi angka`); return; }
      if (min !== null && val < min) { setFieldError(input, `Minimum ${min}`); return; }
      if (max !== null && val > max) { setFieldError(input, `Maksimum ${max}`); return; }
      clearFieldError(input);
    });
  }
}

// ===== NAVBAR SCROLL EFFECT =====
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.style.boxShadow = '0 4px 24px rgba(0,0,0,0.12)';
  } else {
    navbar.style.boxShadow = '0 2px 16px rgba(0,0,0,0.07)';
  }
});

// ===== MOBILE SIDEBAR =====
const hamburgerBtn = document.getElementById('hamburger-btn');
const mobileSidebar = document.getElementById('mobile-sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const sidebarClose = document.getElementById('sidebar-close');

function openSidebar() {
  mobileSidebar.classList.add('open');
  sidebarOverlay.classList.add('open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  mobileSidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

hamburgerBtn.addEventListener('click', openSidebar);
sidebarClose.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Close sidebar on nav link click
mobileSidebar.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeSidebar);
});

// ===== SMOOTH SCROLL for anchor links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      const offset = 80; // navbar height
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

// ===== FAQ ACCORDION =====
function toggleFaq(questionEl) {
  const item = questionEl.parentElement;
  const isOpen = item.classList.contains('open');
  // Close all
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  // Open current if it was closed
  if (!isOpen) item.classList.add('open');
}

// ===== PACKAGE FILTER =====
function applyFilters() {
  const travelFilter = document.getElementById('filter-travel').value;
  const monthFilter = document.getElementById('filter-month').value;
  const priceFilter = document.getElementById('filter-price').value;
  
  const cards = document.querySelectorAll('#pkg-grid .pkg-card');
  cards.forEach(card => {
    const cardTravel = card.getAttribute('data-travel') || '';
    const cardMonth = card.getAttribute('data-month') || '';
    const cardPrice = card.getAttribute('data-price') || '';
    
    const travelMatch = (travelFilter === 'all') || cardTravel.includes(travelFilter);
    const monthMatch = (monthFilter === 'all') || cardMonth.includes(monthFilter);
    const priceMatch = (priceFilter === 'all') || cardPrice.includes(priceFilter);
    
    if (travelMatch && monthMatch && priceMatch) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });

  // Track filter click
  if (window.AKUHTrack) {
    window.AKUHTrack.event('ViewContent', { content_name: `Filter: Travel=${travelFilter}, Bulan=${monthFilter}, Harga=${priceFilter}` });
  }
}

// ===== SELECT PACKAGE =====
window.selectPackage = function(name, travel, hotelMakkah, hotelMadinah, maskapai, harga, tanggal, durasi) {
  // Store data in hidden inputs
  document.getElementById('selected-pkg-name').value = name;
  document.getElementById('selected-pkg-travel').value = travel;
  document.getElementById('selected-pkg-hotel-makkah').value = hotelMakkah;
  document.getElementById('selected-pkg-hotel-madinah').value = hotelMadinah;
  document.getElementById('selected-pkg-maskapai').value = maskapai;
  document.getElementById('selected-pkg-harga').value = harga;
  document.getElementById('selected-pkg-tanggal').value = tanggal;
  document.getElementById('selected-pkg-durasi').value = durasi;

  // Show banner
  document.getElementById('banner-pkg-name').textContent = name;
  document.getElementById('banner-pkg-details').innerHTML =
    `✈️ ${maskapai} &nbsp;·&nbsp; ⏱ ${durasi} &nbsp;·&nbsp; 📅 ${tanggal}<br>` +
    `🏨 Makkah: ${hotelMakkah}<br>` +
    `🕌 Madinah: ${hotelMadinah}<br>` +
    `💰 Mulai ${harga}`;
  document.getElementById('selected-pkg-banner').style.display = 'block';

  // Auto-set form-type to umrah
  const formType = document.getElementById('form-type');
  if (formType) formType.value = 'umrah';

  // Track
  if (window.AKUHTrack) {
    window.AKUHTrack.event('ViewContent', { content_name: `Paket Dipilih: ${name}` });
  }
};

window.clearSelectedPackage = function() {
  ['selected-pkg-name','selected-pkg-travel','selected-pkg-hotel-makkah','selected-pkg-hotel-madinah',
   'selected-pkg-maskapai','selected-pkg-harga','selected-pkg-tanggal','selected-pkg-durasi'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('selected-pkg-banner').style.display = 'none';
};

// ===== SCROLL ANIMATION (Intersection Observer) =====
const animEls = document.querySelectorAll('.anim-fade');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
animEls.forEach(el => observer.observe(el));

// ===== WILAYAH AUTOCOMPLETE =====
const wilayahInput = document.getElementById('form-wilayah');
const suggestionsCont = document.getElementById('wilayah-suggestions');

if (wilayahInput) {
  wilayahInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length < 3) {
      suggestionsCont.innerHTML = '';
      return;
    }

    try {
      // Menggunakan API internal untuk koordinasi FE dan BE yang lebih stabil
      const res = await fetch(`/api/wilayah?q=${encodeURIComponent(query)}`);
      const { data } = await res.json();
      if (data && data.length > 0) {
        suggestionsCont.innerHTML = data.slice(0, 10).map(k => `
          <div class="autocomplete-item" onclick="selectWilayah('${k.full || k.name}')">
            <strong>${k.name}</strong>
            ${k.regency ? `<span style="font-size:11px;color:#888;margin-left:4px">${k.regency}${k.province ? ', ' + k.province : ''}</span>` : ''}
          </div>
        `).join('');
      } else {
        suggestionsCont.innerHTML = '<div class="autocomplete-item" style="color:#888;font-size:12px;text-align:center">Kecamatan tidak ditemukan</div>';
      }
    } catch (err) {
      console.error('Wilayah API Error:', err);
    }
  });
}

window.selectWilayah = function(name) {
  wilayahInput.value = name;
  suggestionsCont.innerHTML = '';
};

document.addEventListener('click', (e) => {
  if (e.target !== wilayahInput) suggestionsCont.innerHTML = '';
});

animEls.forEach(el => observer.observe(el));

// ===== WIZARD FORM LOGIC =====
let currentStep = 1;

function showStep(step) {
  document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`step-${step}`).classList.add('active');
  
  document.querySelectorAll('.wizard-step-bullet').forEach((el, index) => {
    el.classList.remove('active');
    el.classList.remove('completed');
    if (index + 1 === step) {
      el.classList.add('active');
    } else if (index + 1 < step) {
      el.classList.add('completed');
      el.innerHTML = '✔';
    } else {
      el.innerHTML = index + 1;
    }
  });

  const titles = ['Langkah 1: Identitas', 'Langkah 2: Rencana & Budget', 'Langkah 3: Kelengkapan'];
  document.getElementById('wizard-title').innerText = titles[step - 1];
  currentStep = step;
}

function nextStep(step) {
  const currentStepEl = document.getElementById(`step-${currentStep}`);
  const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
  let isValid = true;

  inputs.forEach(input => {
    if (!input.value.trim()) {
      setFieldError(input, 'Field ini wajib diisi');
      isValid = false;
    } else {
      clearFieldError(input);
    }
  });

  // Validasi khusus nomor WhatsApp di Step 1
  if (currentStep === 1) {
    const phoneInput = document.getElementById('form-wa');
    if (phoneInput && phoneInput.value) {
      const result = validatePhoneID(phoneInput.value);
      if (!result.valid) {
        setFieldError(phoneInput, result.msg);
        isValid = false;
      } else {
        clearFieldError(phoneInput);
        phoneInput.classList.add('field-ok');
        // Normalisasi: simpan format bersih tanpa + tapi dengan 08 atau 628
        // (biarkan user input apa adanya, normalisasi hanya di submit)
      }
    }
  }

  if (!isValid) return;
  showStep(step);
}

function prevStep(step) {
  showStep(step);
}

// ===== DYNAMIC JAMAAH FORM =====
function renderJamaahList() {
  const jamaahInput = document.getElementById('form-jamaah');
  let count = parseInt(jamaahInput.value) || 0;

  // Validasi range
  if (count < 0) { jamaahInput.value = ''; count = 0; }
  if (count > 10) { jamaahInput.value = '10'; count = 10; setFieldError(jamaahInput, 'Maks 10 jamaah'); }
  else if (count >= 1) clearFieldError(jamaahInput);

  const container = document.getElementById('jamaah-container');
  container.innerHTML = '';
  if (count <= 0) return;

  for (let i = 1; i <= count; i++) {
    const defaultLabel = i === 1 ? 'Pemesan Utama (Anda)' : `Jamaah ${i}`;
    container.innerHTML += `
      <div class="jamaah-box">
        <label style="font-size:12px;font-weight:700;color:var(--primary)">${defaultLabel}</label>
        <div class="form-group" style="margin-top:6px;">
          <select class="jamaah-rel" required>
            <option value="">-- Hubungan --</option>
            ${i === 1 ? '<option value="Diri Sendiri">Diri Sendiri / Pemesan</option>' : ''}
            <option value="Orang Tua">Orang Tua</option>
            <option value="Istri/Suami">Istri / Suami</option>
            <option value="Anak">Anak</option>
            <option value="Keluarga Lain">Keluarga Lain / Saudara</option>
            <option value="Teman/Orang Lain">Teman / Orang Lain</option>
          </select>
        </div>
        <div class="form-group">
          <input type="text" inputmode="numeric" class="jamaah-age"
            placeholder="Usia (Tahun)" required
            pattern="[0-9]*" maxlength="3"
            onkeydown="if(!/[0-9]/.test(event.key) && !['Backspace','Delete','Tab','ArrowLeft','ArrowRight'].includes(event.key)) event.preventDefault()"
            oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,3);
              const v=parseInt(this.value);
              if(this.value && (v<1||v>110)){this.style.borderColor='#ef4444';const e=this.parentElement.querySelector('.field-err');if(!e){const d=document.createElement('div');d.className='field-err';d.style.cssText='color:#ef4444;font-size:11px;font-weight:600;margin-top:4px';d.textContent='\u26A0\uFE0F Usia 1\u2013110 tahun';this.parentElement.appendChild(d);}}else{this.style.borderColor='';const e=this.parentElement.querySelector('.field-err');if(e)e.remove();}"
          />
        </div>
      </div>
    `;
  }
}

// ===== SUBMIT WIZARD (FE to BE Sync) =====
async function submitWizard(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-form');
  
  // Step 1
  const targetType = document.getElementById('form-type').value;
  const name = document.getElementById('form-name').value.trim();
  const phone = document.getElementById('form-wa').value.trim();
  const wilayah = document.getElementById('form-wilayah').value.trim();
  // Step 2
  const waktu = document.getElementById('form-waktu').value;
  const budget = document.getElementById('form-budget').value;
  // Step 3
  const paspor = document.getElementById('form-paspor').value;
  const jamaahCount = parseInt(document.getElementById('form-jamaah').value) || 1;

  // Selected package data
  const selectedPkg = {
    name: document.getElementById('selected-pkg-name').value,
    travel: document.getElementById('selected-pkg-travel').value,
    hotelMakkah: document.getElementById('selected-pkg-hotel-makkah').value,
    hotelMadinah: document.getElementById('selected-pkg-hotel-madinah').value,
    maskapai: document.getElementById('selected-pkg-maskapai').value,
    harga: document.getElementById('selected-pkg-harga').value,
    tanggal: document.getElementById('selected-pkg-tanggal').value,
    durasi: document.getElementById('selected-pkg-durasi').value,
  };

  // Collect profiles
  const profiles = [];
  const rels = document.querySelectorAll('.jamaah-rel');
  const ages = document.querySelectorAll('.jamaah-age');
  rels.forEach((rel, i) => {
    profiles.push({
      relation: rel.value,
      age: ages[i].value
    });
  });

  const isLansia = profiles.some(p => parseInt(p.age) >= 60);

  // ── Validasi phone sebelum kirim ──
  const phoneResult = validatePhoneID(phone);
  if (!phoneResult.valid) {
    const phoneInput = document.getElementById('form-wa');
    setFieldError(phoneInput, phoneResult.msg);
    btn.disabled = false;
    btn.textContent = 'Kirim & Konsultasi';
    return;
  }

  // ── Validasi profiles: semua harus terisi ──
  let profilesValid = true;
  document.querySelectorAll('.jamaah-rel').forEach((rel, i) => {
    const ageEl = document.querySelectorAll('.jamaah-age')[i];
    if (!rel.value) { setFieldError(rel, 'Pilih hubungan jamaah'); profilesValid = false; }
    else clearFieldError(rel);
    const age = parseInt(ageEl?.value);
    if (!ageEl?.value || isNaN(age) || age < 1 || age > 110) {
      setFieldError(ageEl, 'Usia 1–110 tahun'); profilesValid = false;
    } else clearFieldError(ageEl);
  });
  if (!profilesValid) {
    btn.disabled = false;
    btn.textContent = 'Kirim & Konsultasi';
    return;
  }

  // Normalisasi nomor ke format 62xxx
  const normalizedPhone = phoneResult.normalized.startsWith('0')
    ? '62' + phoneResult.normalized.slice(1)
    : phoneResult.normalized;

  btn.disabled = true;
  btn.textContent = '⏳ Mengirim...';

  let targetWaNumber = '6285710612377';
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone: normalizedPhone, targetType, budget, waktu, paspor,
        wilayah,
        utm_source: utmParams.source,
        utm_medium: utmParams.medium,
        utm_campaign: utmParams.campaign,
        jamaah: jamaahCount,
        profiles,
        source: isLansia ? 'wizard-lansia' : 'wizard',
        pageUrl: window.location.href,
        selectedPackage: selectedPkg.name || null,
        packageTravel: selectedPkg.travel || null,
        packageHotelMakkah: selectedPkg.hotelMakkah || null,
        packageHotelMadinah: selectedPkg.hotelMadinah || null,
        packageMaskapai: selectedPkg.maskapai || null,
        packageHarga: selectedPkg.harga || null,
        packageTanggal: selectedPkg.tanggal || null,
        packageDurasi: selectedPkg.durasi || null,
      })
    });
    const data = await res.json();
    if (!data.success && !data.id) throw new Error('API error');
    if (data.waNumber) targetWaNumber = data.waNumber;
  } catch (_) {
    console.log('[AKUH] Backend fallback ke WA');
  }

  if (window.AKUHTrack) {
    window.AKUHTrack.lead(
      { phone: normalizedPhone, firstName: name.split(' ')[0] },
      {
        currency: 'IDR',
        content_name: `${targetType}-${budget}`,
        content_ids: [selectedPkg.name || 'konsultasi-umrah-haji'],
        content_type: 'product',
        value: 1
      }
    );
  }

  // Format WA Message
  const budgetMap = { 'under25':'< 25 jt', '25to35':'25-35 jt', 'over35':'> 35 jt' };
  const pasporMap = { 'ready':'Sudah Ada', 'mati':'Expired', 'belum':'Belum Ada' };
  let profileText = profiles.map((p, i) => ` - J${i+1}: ${p.relation} (${p.age} thn)`).join('\n');
  if(!profileText) profileText = "- Belum diisi";

  // Build package info block for WA
  let pkgBlock = '';
  if (selectedPkg.name) {
    pkgBlock =
      `\n*Paket yang Diminati:*\n` +
      `Nama: ${selectedPkg.name}\n` +
      `Travel: ${selectedPkg.travel}\n` +
      `Maskapai: ${selectedPkg.maskapai} · ${selectedPkg.durasi}\n` +
      `Tanggal: ${selectedPkg.tanggal}\n` +
      `Hotel Makkah: ${selectedPkg.hotelMakkah}\n` +
      `Hotel Madinah: ${selectedPkg.hotelMadinah}\n` +
      `Harga: ${selectedPkg.harga}\n`;
  }

  const msg = encodeURIComponent(
    `Assalamualaikum AKUH, saya tertarik untuk daftar *${targetType.toUpperCase()}*.\n\n` +
    `*Data Pendaftar:*\nNama: ${name}\nNo WA: ${phone}\nWilayah: ${wilayah}\nPaspor: ${pasporMap[paspor] || paspor}\n\n` +
    `*UTM Info:* ${utmParams.source} / ${utmParams.campaign}\n\n` +
    `*Rencana Berangkat:*\nWaktu: ${waktu}\nBudget: ${budgetMap[budget] || budget}/pax\n` +
    `Total Jamaah: ${jamaahCount} Orang\n\n*Profil Jamaah:*\n${profileText}\n` +
    pkgBlock +
    `\nMohon info paket yang sesuai. Terima kasih!`
  );

  window.open(`https://wa.me/${targetWaNumber}?text=${msg}`, '_blank');

  btn.disabled = false;
  btn.textContent = 'Kirim & Konsultasi';
  showToast();
  document.getElementById('consultation-form').reset();
  showStep(1); // Reset back to step 1
  document.getElementById('jamaah-container').innerHTML = '';
}

// ===== TOAST NOTIFICATION =====
function showToast() {
  const toast = document.getElementById('toast');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

// ===== EXIT INTENT POPUP =====
let exitShown = false;

function isUserFillingForm() {
  const form = document.getElementById('consultation-form');
  return form && form.contains(document.activeElement);
}

document.addEventListener('mouseleave', (e) => {
  if (e.clientY <= 0 && !exitShown && !isUserFillingForm()) {
    exitShown = true;
    document.getElementById('exit-popup').classList.add('show');
  }
});

function closeExitPopup() {
  document.getElementById('exit-popup').classList.remove('show');
}

// Close popup on ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeExitPopup();
});

// Also show on mobile after 30 sec with no scroll to bottom
let mobileExitTimer = null;
if (window.innerWidth < 768) {
  mobileExitTimer = setTimeout(() => {
    if (!exitShown && !isUserFillingForm()) {
      exitShown = true;
      document.getElementById('exit-popup').classList.add('show');
    }
  }, 30000);
}

// ===== FLOATING WA BUTTON - hide on form section =====
const floatWa = document.getElementById('float-wa');
const ctaSection = document.getElementById('cta-form');

window.addEventListener('scroll', () => {
  if (!ctaSection) return;
  const rect = ctaSection.getBoundingClientRect();
  if (rect.top < window.innerHeight && rect.bottom > 0) {
    floatWa.style.opacity = '0';
    floatWa.style.pointerEvents = 'none';
  } else {
    floatWa.style.opacity = '1';
    floatWa.style.pointerEvents = 'auto';
  }
}, { passive: true });

// ===== HERO parallel stars animation =====
const heroTrustItems = document.querySelectorAll('.trust-item');
heroTrustItems.forEach((item, i) => {
  item.style.opacity = '0';
  item.style.transform = 'translateY(20px)';
  item.style.transition = `opacity 0.5s ease ${0.8 + i * 0.15}s, transform 0.5s ease ${0.8 + i * 0.15}s`;
  setTimeout(() => {
    item.style.opacity = '1';
    item.style.transform = 'translateY(0)';
  }, 100);
});

// ===== HERO content animation =====
const heroContent = document.querySelector('.hero-content');
if (heroContent) {
  heroContent.style.opacity = '0';
  heroContent.style.transform = 'translateY(40px)';
  heroContent.style.transition = 'opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s';
  setTimeout(() => {
    heroContent.style.opacity = '1';
    heroContent.style.transform = 'translateY(0)';
  }, 100);
}

// ===== ACTIVE NAV LINK on scroll =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-menu a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });
  navLinks.forEach(link => {
    link.style.color = '';
    link.style.background = '';
    if (link.getAttribute('href') === '#' + current) {
      link.style.color = 'var(--primary)';
      link.style.background = 'var(--bg-section)';
    }
  });
}, { passive: true });

// ===== INIT VALIDASI INPUT =====
(function initValidation() {
  // Enforce number-only pada input jumlah jamaah
  const jamaahInput = document.getElementById('form-jamaah');
  if (jamaahInput) {
    enforceNumberOnly(jamaahInput, { min: 1, max: 10 });
  }

  // Phone input: allow angka, spasi, dash, +
  const phoneInput = document.getElementById('form-wa');
  if (phoneInput) {
    // Atribut sudah di-set di HTML (autocomplete="tel", inputmode, maxlength)
    // Hanya pasang event listeners di sini
    phoneInput.addEventListener('keydown', (e) => {
      const allowed = ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End','Enter'];
      if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
      if (!/[0-9+\-\s]/.test(e.key)) e.preventDefault();
    });

    // Strip paste ke angka+tanda saja
    phoneInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData).getData('text');
      const cleaned = pasted.replace(/[^\d+\-\s]/g, '').trim();
      phoneInput.value = cleaned;
      phoneInput.dispatchEvent(new Event('input'));
    });

    // Real-time feedback saat blur
    phoneInput.addEventListener('blur', () => {
      if (!phoneInput.value) return;
      const result = validatePhoneID(phoneInput.value);
      if (!result.valid) {
        setFieldError(phoneInput, result.msg);
      } else {
        clearFieldError(phoneInput);
        phoneInput.classList.add('field-ok');
      }
    });

    // Clear error saat mulai ketik ulang
    phoneInput.addEventListener('input', () => {
      phoneInput.classList.remove('field-ok');
      const errEl = phoneInput.parentElement.querySelector('.field-err');
      if (errEl) errEl.remove();
      phoneInput.style.borderColor = '';
      phoneInput.style.boxShadow = '';
    });
  }
})();
