// ===== UTM & TRACKING PARAMS =====
const utmParams = {
  source: new URLSearchParams(window.location.search).get('utm_source') || '',
  medium: new URLSearchParams(window.location.search).get('utm_medium') || '',
  campaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
  content: new URLSearchParams(window.location.search).get('utm_content') || ''
};

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
  const typeFilter = document.getElementById('filter-type').value;
  const priceFilter = document.getElementById('filter-price').value;
  
  const cards = document.querySelectorAll('#pkg-grid .pkg-card');
  cards.forEach(card => {
    const cardType = card.getAttribute('data-type') || '';
    const cardPrice = card.getAttribute('data-price') || '';
    
    const typeMatch = (typeFilter === 'all') || cardType.includes(typeFilter);
    const priceMatch = (priceFilter === 'all') || cardPrice.includes(priceFilter);
    
    if (typeMatch && priceMatch) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });

  // Track filter click
  if (window.AKUHTrack) {
    window.AKUHTrack.event('ViewContent', { content_name: `Filter: Tipe=${typeFilter}, Harga=${priceFilter}` });
  }
}

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
  // Validate current step inputs
  const currentStepEl = document.getElementById(`step-${currentStep}`);
  const inputs = currentStepEl.querySelectorAll('input[required], select[required]');
  let isValid = true;
  inputs.forEach(input => {
    if (!input.value) {
      input.style.borderColor = 'red';
      isValid = false;
    } else {
      input.style.borderColor = '';
    }
  });
  if (!isValid) return;
  showStep(step);
}

function prevStep(step) {
  showStep(step);
}

// ===== DYNAMIC JAMAAH FORM =====
function renderJamaahList() {
  const count = parseInt(document.getElementById('form-jamaah').value) || 0;
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
          <input type="number" class="jamaah-age" placeholder="Usia (Tahun)" required min="1" max="110"/>
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

  btn.disabled = true;
  btn.textContent = '⏳ Mengirim...';

  let targetWaNumber = '6285710612377';
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, phone, targetType, budget, waktu, paspor,
        wilayah,
        utm_source: utmParams.source,
        utm_medium: utmParams.medium,
        utm_campaign: utmParams.campaign,
        jamaah: jamaahCount,
        profiles,
        source: isLansia ? 'wizard-lansia' : 'wizard',
        pageUrl: window.location.href
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
      { phone: phone.replace(/\D/g,''), firstName: name.split(' ')[0] },
      { currency: 'IDR', content_name: targetType + '-' + budget, value: 1 }
    );
  }

  // Format WA Message
  const budgetMap = { 'under25':'< 25 jt', '25to35':'25-35 jt', 'over35':'> 35 jt' };
  const pasporMap = { 'ready':'Sudah Ada', 'mati':'Expired', 'belum':'Belum Ada' };
  let profileText = profiles.map((p, i) => ` - J${i+1}: ${p.relation} (${p.age} thn)`).join('\n');
  if(!profileText) profileText = "- Belum diisi";

  const msg = encodeURIComponent(
    `Assalamualaikum AKUH, saya tertarik untuk daftar *${targetType.toUpperCase()}*.\n\n` +
    `*Data Pendaftar:*\nNama: ${name}\nNo WA: ${phone}\nWilayah: ${wilayah}\nPaspor: ${pasporMap[paspor] || paspor}\n\n` +
    `*UTM Info:* ${utmParams.source} / ${utmParams.campaign}\n\n` +
    `*Rencana Berangkat:*\nWaktu: ${waktu}\nBudget: ${budgetMap[budget] || budget}/pax\n` +
    `Total Jamaah: ${jamaahCount} Orang\n\n*Profil Jamaah:*\n${profileText}\n\n` +
    `Mohon info paket yang sesuai. Terima kasih!`
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
document.addEventListener('mouseleave', (e) => {
  if (e.clientY <= 0 && !exitShown) {
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
    if (!exitShown) {
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
