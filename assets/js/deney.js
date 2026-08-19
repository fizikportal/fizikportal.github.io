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
    return html.replace(/\.\.\/uploads\//g, 'uploads/').replace(/\.\.\/assets\//g, 'assets/');
}

document.addEventListener("DOMContentLoaded", async () => {
    await htmlYukle('includes/header.html', 'header-yeri');
    await htmlYukle('includes/footer.html', 'footer-yeri');

    const path = window.location.pathname.split('/').pop() || 'deney.html';
    document.querySelectorAll('#main-nav-links a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    let veriler = {}; // Tüm deneyler burada saklanacak

    try {
        const res = await fetch('data/deney.json');
        if (!res.ok) return;
        const deneyKayitlari = await res.json();

        // Sınıfları bul ve grupla
        const siniflar = [];
        deneyKayitlari.forEach(item => {
            const sinif = item.meta?.sinif || 'Diğer';
            if (!siniflar.includes(sinif)) siniflar.push(sinif);
            // Veriyi objemize kaydet
            veriler[item.id] = {
                meta: item.meta || {},
                html: renderBloklar(item.page || [])
            };
        });
        siniflar.sort();

        // Menüyü Oluştur
        const menu = document.getElementById('deney-menu');
        if (siniflar.length === 0) {
            menu.innerHTML = '<p class="empty-state">Henüz deney eklenmemiş.</p>';
        } else {
            let menuHtml = '';
            siniflar.forEach(sinif => {
                menuHtml += `
                <details class="kategori-group">
                    <summary class="kategori-summary"><i class="fa fa-folder-open"></i> ${sinif}</summary>
                    <div class="kategori-items">`;
                
                deneyKayitlari.forEach(item => {
                    if ((item.meta?.sinif || 'Diğer') === sinif) {
                        menuHtml += `
                        <button type="button" class="meb-baslik-btn" data-id="${item.id}" style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${item.meta?.baslik || 'Başlıksız'}</span>
                            <i class="fa fa-arrow-right" style="font-size: 12px; opacity: 0.5;"></i>
                        </button>`;
                    }
                });

                menuHtml += `</div></details>`;
            });
            // Kapatma yazısı
            menuHtml += `<div class="sidebar-kapat-yazi">Menüyü kapatmak için boş bir alana tıklayın.</div>`;
            menu.innerHTML = menuHtml;
        }

        // Menü Tıklama Mantığı
        document.querySelectorAll('.meb-baslik-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                icerikGoster(id);
                closeMenu();
            });
        });

        // URL'de ?id= varsa direkt o deneyi aç
        const urlParams = new URLSearchParams(window.location.search);
        const secilenId = urlParams.get('id');
        if (secilenId && veriler[secilenId]) {
            icerikGoster(secilenId);
            // Menüde aktif işaretle
            const activeBtn = document.querySelector(`.meb-baslik-btn[data-id="${secilenId}"]`);
            if (activeBtn) activeBtn.classList.add('active');
        }

    } catch(e) { console.error('Deney verisi yükleme hatası:', e); }

    function icerikGoster(id) {
        const veri = veriler[id];
        const icerikAlani = document.getElementById('deney-icerik');
        
        if (veri) {
            const meta = veri.meta;
            let html = '<div class="reading-meta">';
            html += '<div class="detay-geri"><a href="deney.html"><i class="fa fa-arrow-left"></i> Menüye Dön</a></div>';
            if(meta.sinif) html += `<span class="badge">${meta.sinif}</span>`;
            html += `<h1 class="reading-title">${meta.baslik || 'Başlıksız'}</h1>`;
            html += '</div>';
            html += '<div class="reading-content">';
            html += veri.html || '<p>İçerik bulunamadı.</p>';
            html += '</div>';

            icerikAlani.innerHTML = html;
            
            // Aktif sınıfını güncelle
            document.querySelectorAll('.meb-baslik-btn').forEach(b => b.classList.remove('active'));
            const activeBtn = document.querySelector(`.meb-baslik-btn[data-id="${id}"]`);
            if (activeBtn) activeBtn.classList.add('active');
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // Off-canvas Menü Aç/Kapat
    const toggleBtn = document.getElementById('deney-menu-toggle');
    const sidebar = document.getElementById('deney-sidebar');
    const overlay = document.getElementById('deney-menu-overlay');

    function closeMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (toggleBtn) toggleBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });
    if (overlay) overlay.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
});