// BLOK RENDER FONKSİYONU
function blokToHtml(block) {
    const tip = block.type || '';
    const icerik = block.content || [];
    if (tip === 'baslik') {
        const tag = ['h1', 'h2', 'h3'].includes(icerik.tag) ? icerik.tag : 'h2';
        return `<${tag}>${icerik.text || ''}</${tag}>`;
    }
    if (tip === 'paragraf' || tip === 'tablo') return icerik.html || '';
    if (tip === 'sutunlu_yazi') {
        const uid = block.uid || '';
        const layout = parseInt(icerik.layout_type || 0);
        let html = '<div class="editor-row" contenteditable="false">';
        for (let i = 1; i <= layout; i++) {
            const hucreTipi = icerik[`cell_${i}_type`] || '';
            if (hucreTipi === 'image') {
                const imgYolu = (icerik[`image_path_block_${uid}_${i}`] || '').replace('../', '');
                html += `<div class="editor-col active-content"><div class="col-img-container"><img src="${imgYolu}" alt="Görsel"></div></div>`;
            } else {
                const metin = icerik[`text_block_${uid}_${i}`] || '';
                html += `<div class="editor-col active-content"><div class="col-text-content">${metin}</div></div>`;
            }
        }
        return html + '</div>';
    }
    return '';
}

function renderBloklar(bloklar) {
    if (!Array.isArray(bloklar)) return '';
    let html = bloklar.map(blokToHtml).join('');
    // Yolları düzelt
    html = html.replace(/\.\.\/uploads\//g, 'uploads/').replace(/\.\.\/assets\//g, 'assets/');
    return html;
}

document.addEventListener("DOMContentLoaded", async () => {
    await htmlYukle('includes/header.html', 'header-yeri');
    await htmlYukle('includes/footer.html', 'footer-yeri');

    const path = window.location.pathname.split('/').pop() || 'yonetim.html';
    document.querySelectorAll('#main-nav-links a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    // 1. Verileri Tutacağımız Obje
    let veriler = {
        'intro': { meta: { baslik: 'Eğitim Modeli', konu: 'Genel' }, html: '' }
    };

    try {
        // 2. Eğitim Modelini Çek
        const resEgitim = await fetch('data/egitim.json');
        if (resEgitim.ok) {
            const dataEgitim = await resEgitim.json();
            veriler['intro'].html = renderBloklar(dataEgitim.page || []);
            // Sayfa açıldığında varsayılan olarak intro göster
            document.getElementById('yonetim-icerik').innerHTML = veriler['intro'].html || '<p>İçerik bulunamadı.</p>';
        }

        // 3. Yönetmelikleri Çek
        const resYonetim = await fetch('data/yonetim.json');
        if (!resYonetim.ok) return;
        const yonetimKayitlari = await resYonetim.json();

        // 4. Sol Menüyü Oluştur
        const menu = document.getElementById('yonetim-menu');
        menu.innerHTML = ''; // "Yükleniyor..." yazısını temizle

        // "Eğitim Modeli" butonunu ekle
        let menuHtml = `<button class="meb-baslik-btn active" data-id="intro"><i class="fa fa-graduation-cap"></i> Eğitim Modeli</button>`;
        
        // Kategorilere göre grupla
        const kategoriler = {};
        yonetimKayitlari.forEach(item => {
            const konu = item.meta?.konu || 'Genel';
            if (!kategoriler[konu]) kategoriler[konu] = [];
            kategoriler[konu].push(item);
        });

        // Kategorileri menüye bas
        Object.keys(kategoriler).sort().forEach(konu => {
            menuHtml += `
                <details class="kategori-group">
                    <summary class="kategori-summary"><i class="fa fa-folder"></i> ${konu}</summary>
                    <div class="kategori-items">`;
            
            kategoriler[konu].forEach(item => {
                const id = item.id;
                const baslik = item.meta?.baslik || 'Başlıksız';
                // Veriyi objemize kaydet
                veriler[id] = {
                    meta: item.meta,
                    html: renderBloklar(item.page || [])
                };
                // Menü butonunu oluştur
                menuHtml += `<button class="meb-baslik-btn" data-id="${id}">${baslik}</button>`;
            });

            menuHtml += `</div></details>`;
        });

        menu.innerHTML = menuHtml;

        // 5. Menü Butonlarına Tıklama Mantığı
        document.querySelectorAll('.meb-baslik-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const veri = veriler[id];
                if (veri) {
                    document.getElementById('yonetim-icerik').innerHTML = veri.html || '<p>İçerik bulunamadı.</p>';
                    // Aktif sınıfını güncelle
                    document.querySelectorAll('.meb-baslik-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    // Menüyü kapat
                    closeMenu();
                    // Sayfayı yukarı kaydır
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });

    } catch(e) { console.error('Yönetim verisi yükleme hatası:', e); }

    // 6. Off-canvas Menü Aç/Kapat
    const toggleBtn = document.getElementById('yonetim-menu-toggle');
    const sidebar = document.getElementById('yonetim-sidebar');
    const overlay = document.getElementById('yonetim-menu-overlay');

    function openMenu() {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (toggleBtn) toggleBtn.addEventListener('click', openMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
});