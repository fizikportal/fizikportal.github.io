// SUPABASE BAĞLANTISI
const SUPABASE_URL = "https://xynrvyltphhlctgknsbl.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_s4GbYjutbYiSdLEqzDG4gQ_rXbEnFyJ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const ADMIN_EMAIL = "validebag.fizik@gmail.com";

// ORTAK HTML YÜKLEYİCÜ
async function htmlYukle(url, elementId) {
    try {
        const res = await fetch(url);
        if (!res.ok) return;
        document.getElementById(elementId).innerHTML = await res.text();
    } catch(e) { console.error(e); }
}

// ÇIKIŞ YAP FONKSİYONU
async function cikisYap() {
    await supabaseClient.auth.signOut();
    window.location.href = 'index.html';
}

// KULLANICI GİRİŞ DURUMUNU KONTROL ET VE MENÜYÜ GÜNCELLE
async function checkAuthState() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const navAuth = document.getElementById('nav-auth-yeri');
    if (!navAuth) return;
    
    if (session) {
        const user = session.user;
        const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
        
        if (user.email === ADMIN_EMAIL) {
            // ADMIN GİRİŞİ YAPTIYSA
            navAuth.innerHTML = `
                <div style="position: relative;">
                    <button id="admin-dropdown-toggle" style="background: none; border: none; color: var(--text-primary); cursor: pointer; font-size: 1.4rem;">
                        <i class="fa fa-user-cog"></i>
                    </button>
                    <div id="admin-dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; background: var(--bg-mid); border: 1px solid var(--glass-border); border-radius: 8px; padding: 10px; min-width: 180px; z-index: 9999; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                        <a href="admin_yorumlar.html" style="display: flex; align-items: center; gap: 8px; color: var(--text-primary); text-decoration: none; padding: 8px 12px; border-radius: 6px; font-size: 14px;"><i class="fa fa-comments"></i> Yorumları Oku</a>
                        <a href="#" id="theme-toggle-btn" style="display: flex; align-items: center; gap: 8px; color: var(--text-primary); text-decoration: none; padding: 8px 12px; border-radius: 6px; font-size: 14px;"><i class="fa fa-palette"></i> Tema Değiştir</a>
                        <a href="#" onclick="cikisYap()" style="display: flex; align-items: center; gap: 8px; color: #ef4444; text-decoration: none; padding: 8px 12px; border-radius: 6px; font-size: 14px;"><i class="fa fa-sign-out-alt"></i> Çıkış Yap</a>
                    </div>
                </div>
            `;
        } else {
            // NORMAL KULLANICI GİRİŞİ YAPTIYSA
            navAuth.innerHTML = `
                <span style="color: var(--text-primary); margin-right: 10px; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 6px;">
                    <i class="fa fa-user-circle"></i> ${fullName}
                </span>
                <button onclick="cikisYap()" class="btn-login" style="cursor:pointer; border: none;">
                    <i class="fa fa-sign-out-alt"></i> Çıkış
                </button>
            `;
        }
    } else {
        // GİRİŞ YAPMADIYSA
        navAuth.innerHTML = `
            <a href="giris.html" class="btn-login">Giriş</a>
            <a href="kayit_ol.html" class="btn-register">Kayıt Ol</a>
        `;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await htmlYukle('includes/header.html', 'header-yeri');
    await htmlYukle('includes/footer.html', 'footer-yeri');

    // Aktif menü linkini işaretle
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('#main-nav-links a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    // Kullanıcı giriş durumunu kontrol et
    checkAuthState();

    // Tüm tıklamaları body seviyesinde yakala (Mobil menü ve dropdown için en garantili yöntem)
    document.body.addEventListener('click', (e) => {
        // 3 Çizgi Menü Tıklaması
        if (e.target.closest('#nav-toggle')) {
            document.getElementById('nav-links-container').classList.toggle('active');
        }
        // Admin Dropdown Tıklaması
        if (e.target.closest('#admin-dropdown-toggle')) {
            const menu = document.getElementById('admin-dropdown-menu');
            if(menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        }
        // Tema Değiştir Tıklaması
        if (e.target.closest('#theme-toggle-btn')) {
            e.preventDefault();
            const body = document.body;
            const themes = ['theme-warm-amber', 'theme-deep-space', 'theme-cyber-ocean', 'theme-forest-matrix'];
            let currentTheme = themes.find(t => body.classList.contains(t)) || 'theme-warm-amber';
            let nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
            body.classList.remove(currentTheme);
            body.classList.add(nextTheme);
            localStorage.setItem('site_theme', nextTheme); // Seçilen temayı tarayıcıya kaydet
        }
    });

    // Sayfa açılışında kayıtlı temayı yükle
    const savedTheme = localStorage.getItem('site_theme');
    if (savedTheme) {
        document.body.className = document.body.className.replace(/theme-\S+/g, '');
        document.body.classList.add(savedTheme);
    }

    // Anasayfa verilerini çek (SADECE ANASAYFADA ÇALIŞIR)
    if (path === 'index.html' || path === '') {
        try {
            const res = await fetch('data/anasayfa.json');
            if (!res.ok) return;
            const home = await res.json();

            const heroTitle = document.getElementById('hero-title');
            if (!heroTitle) return;

            heroTitle.innerHTML = home.hero.title;
            document.getElementById('hero-subtitle').textContent = home.hero.subtitle;
            const cta = document.getElementById('hero-cta');
            cta.textContent = home.hero.cta_text;
            cta.href = home.hero.cta_url;

            document.getElementById('intro-title').textContent = home.intro.title;
            document.getElementById('intro-lead').textContent = home.intro.lead;
            const introGrid = document.getElementById('intro-grid');
            introGrid.innerHTML = '';
            home.intro.cards.forEach(card => {
                introGrid.innerHTML += `<article class="intro-card"><div class="intro-card-icon">${card.icon}</div><h3>${card.title}</h3><p>${card.text}</p></article>`;
            });

            if (home.features && home.features.length > 0) {
                const featuresSection = document.getElementById('konular');
                const featuresTrack = document.getElementById('features-track');
                const featureDots = document.getElementById('feature-dots');
                featuresTrack.innerHTML = '';
                featureDots.innerHTML = '';
                home.features.forEach((feature, i) => {
                    featuresTrack.innerHTML += `<article class="feature-card ${i === 0 ? 'is-active' : ''}" data-feature="${feature.id}"><span class="feature-label">${feature.label}</span><h3>${feature.title}</h3><p>${feature.text}</p></article>`;
                    featureDots.innerHTML += `<button type="button" class="feature-dot ${i === 0 ? 'is-active' : ''}" data-index="${i}"></button>`;
                });
                featuresSection.style.display = 'block';
                startFeatureSlider();
            }

            if (home.faq && home.faq.length > 0) {
                const faqList = document.getElementById('faq-list');
                faqList.innerHTML = '';
                home.faq.forEach((item, i) => {
                    faqList.innerHTML += `<details class="faq-item" ${i === 0 ? 'open' : ''}><summary>${item.q}</summary><p>${item.a}</p></details>`;
                });
                document.getElementById('sss').style.display = 'block';
            }

        } catch(e) { console.error('Veri yükleme hatası:', e); }
    }
});

function startFeatureSlider() {
    const dots = document.querySelectorAll('.feature-dot');
    const cards = document.querySelectorAll('.feature-card');
    let currentFeature = 0;
    let featureInterval;

    function showFeature(index) {
        cards.forEach((card, i) => card.classList.toggle('is-active', i === index));
        dots.forEach((dot, i) => dot.classList.toggle('is-active', i === index));
        currentFeature = index;
    }
    dots.forEach((dot, index) => { dot.addEventListener('click', () => { showFeature(index); resetInterval(); }); });
    function startAutoSlide() { featureInterval = setInterval(() => { let nextIndex = (currentFeature + 1) % cards.length; showFeature(nextIndex); }, 5000); }
    function resetInterval() { clearInterval(featureInterval); startAutoSlide(); }
    if (cards.length > 0) { startAutoSlide(); }
}