// ORTAK HTML YÜKLEYİCÜ
async function htmlYukle(url, elementId) {
    try {
        const res = await fetch(url);
        if (!res.ok) return;
        document.getElementById(elementId).innerHTML = await res.text();
    } catch(e) { console.error(e); }
}

document.addEventListener("DOMContentLoaded", async () => {
    // Header ve Footer'ı yükle
    await htmlYukle('includes/header.html', 'header-yeri');
    await htmlYukle('includes/footer.html', 'footer-yeri');

    // Aktif menü linkini işaretle
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('#main-nav-links a').forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        }
    });

    // Anasayfa verilerini çek
    try {
        const res = await fetch('data/anasayfa.json');
        if (!res.ok) return;
        const home = await res.json();

        // 1. HERO
        document.getElementById('hero-title').innerHTML = home.hero.title;
        document.getElementById('hero-subtitle').textContent = home.hero.subtitle;
        const cta = document.getElementById('hero-cta');
        cta.textContent = home.hero.cta_text;
        cta.href = home.hero.cta_url;

        // 2. INTRO
        document.getElementById('intro-title').textContent = home.intro.title;
        document.getElementById('intro-lead').textContent = home.intro.lead;
        const introGrid = document.getElementById('intro-grid');
        introGrid.innerHTML = ''; // Önce temizle
        home.intro.cards.forEach(card => {
            introGrid.innerHTML += `
                <article class="intro-card">
                    <div class="intro-card-icon">${card.icon}</div>
                    <h3>${card.title}</h3>
                    <p>${card.text}</p>
                </article>`;
        });

        // 3. FEATURES
        if (home.features && home.features.length > 0) {
            const featuresSection = document.getElementById('konular');
            const featuresTrack = document.getElementById('features-track');
            const featureDots = document.getElementById('feature-dots');
            
            featuresTrack.innerHTML = '';
            featureDots.innerHTML = '';
            
            home.features.forEach((feature, i) => {
                featuresTrack.innerHTML += `
                    <article class="feature-card ${i === 0 ? 'is-active' : ''}" data-feature="${feature.id}">
                        <span class="feature-label">${feature.label}</span>
                        <h3>${feature.title}</h3>
                        <p>${feature.text}</p>
                    </article>`;
                featureDots.innerHTML += `<button type="button" class="feature-dot ${i === 0 ? 'is-active' : ''}" data-index="${i}"></button>`;
            });
            featuresSection.style.display = 'block';
            startFeatureSlider();
        }

        // 4. FAQ
        if (home.faq && home.faq.length > 0) {
            const faqList = document.getElementById('faq-list');
            faqList.innerHTML = '';
            home.faq.forEach((item, i) => {
                faqList.innerHTML += `
                    <details class="faq-item" ${i === 0 ? 'open' : ''}>
                        <summary>${item.q}</summary>
                        <p>${item.a}</p>
                    </details>`;
            });
            document.getElementById('sss').style.display = 'block';
        }

    } catch(e) { console.error('Veri yükleme hatası:', e); }
});

// SLIDER MANTIĞI
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

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showFeature(index);
            resetInterval();
        });
    });

    function startAutoSlide() {
        featureInterval = setInterval(() => {
            let nextIndex = (currentFeature + 1) % cards.length;
            showFeature(nextIndex);
        }, 5000);
    }

    function resetInterval() {
        clearInterval(featureInterval);
        startAutoSlide();
    }

    if (cards.length > 0) { startAutoSlide(); }
}