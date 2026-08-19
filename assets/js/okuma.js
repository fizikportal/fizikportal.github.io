// BLOK RENDER FONKSİYONU (PHP'deki blok_render.php'nin JS karşılığı)
function blokToHtml(block) {
    const tip = block.type || '';
    const icerik = block.content || [];

    if (tip === 'baslik') {
        const tag = ['h1', 'h2', 'h3'].includes(icerik.tag) ? icerik.tag : 'h2';
        return `<${tag}>${icerik.text || ''}</${tag}>`;
    }
    if (tip === 'paragraf' || tip === 'tablo') {
        return icerik.html || '';
    }
    if (tip === 'sutunlu_yazi') {
        const uid = block.uid || '';
        const layout = parseInt(icerik.layout_type || 0);
        let html = '<div class="editor-row" contenteditable="false">';
        for (let i = 1; i <= layout; i++) {
            const hucreTipi = icerik[`cell_${i}_type`] || '';
            if (hucreTipi === 'image') {
                // Yolları ../uploads/ yerine uploads/ yap
                const imgYolu = (icerik[`image_path_block_${uid}_${i}`] || '').replace('../', '');
                html += `<div class="editor-col active-content"><div class="col-img-container"><img src="${imgYolu}" alt="Görsel"></div></div>`;
            } else {
                const metin = icerik[`text_block_${uid}_${i}`] || '';
                html += `<div class="editor-col active-content"><div class="col-text-content">${metin}</div></div>`;
            }
        }
        html += '</div>';
        return html;
    }
    return '';
}

function renderBloklar(bloklar) {
    if (!Array.isArray(bloklar)) return '';
    let html = '';
    bloklar.forEach(block => { html += blokToHtml(block); });
    // Tüm ../uploads/ ve ../assets/ yollarını düzelt
    html = html.replace(/\.\.\/uploads\//g, 'uploads/').replace(/\.\.\/assets\//g, 'assets/');
    return html;
}

// SAYFA YÜKLENDİĞİNDE ÇALIŞACAK MANTIK
document.addEventListener("DOMContentLoaded", async () => {
    await htmlYukle('includes/header.html', 'header-yeri');
    await htmlYukle('includes/footer.html', 'footer-yeri');

    // Aktif menü linkini işaretle
    const path = window.location.pathname.split('/').pop() || 'okuma.html';
    document.querySelectorAll('#main-nav-links a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    // Kategori butonu aç/kapa
    const toggleBtn = document.getElementById('kategori-toggle-btn');
    const filtreCubugu = document.getElementById('filtre-cubugu-gizli');
    if (toggleBtn && filtreCubugu) {
        toggleBtn.addEventListener('click', () => filtreCubugu.classList.toggle('aktif'));
    }

    // URL Parametrelerini al (?id= veya ?konu=)
    const urlParams = new URLSearchParams(window.location.search);
    const seciliId = urlParams.get('id');
    const konuFiltre = urlParams.get('konu') || '';

    try {
        const res = await fetch('data/okuma.json');
        if (!res.ok) return;
        const okumaKayitlari = await res.json();

        if (seciliId) {
            // --- DETAY GÖRÜNÜMÜ ---
            document.getElementById('liste-gorunumu').style.display = 'none';
            document.getElementById('detay-gorunumu').style.display = 'block';

            const seciliKayit = okumaKayitlari.find(k => k.id === seciliId);
            if (seciliKayit) {
                const meta = seciliKayit.meta || {};
                
                if (meta.kapak) {
                    document.getElementById('detay-cover').innerHTML = `<img src="${meta.kapak.replace('../','')}" alt="Kapak">`;
                }
                if (meta.konu) {
                    document.getElementById('detay-badge').textContent = meta.konu;
                }
                document.getElementById('detay-baslik').textContent = meta.baslik || 'Başlıksız';
                
                let metaHtml = '';
                if (meta.yazar) metaHtml += `<span><i class="fa fa-user"></i> ${meta.yazar}</span> `;
                if (meta.tarih) metaHtml += `<span><i class="fa fa-clock"></i> ${meta.tarih}</span>`;
                document.getElementById('detay-meta').innerHTML = metaHtml;

                document.getElementById('detay-icerik').innerHTML = renderBloklar(seciliKayit.page || []) || '<p>İçerik bulunamadı.</p>';
            }
        } else {
            // --- LİSTE GÖRÜNÜMÜ ---
            document.getElementById('liste-gorunumu').style.display = 'block';
            document.getElementById('detay-gorunumu').style.display = 'none';

            // Kategorileri bul
            let konular = [];
            okumaKayitlari.forEach(k => {
                const konu = k.meta?.konu || '';
                if (konu && !konular.includes(konu)) konular.push(konu);
            });
            konular.sort();

            // Kategori butonlarını bas
            let filtreHtml = `<a href="okuma.html" class="filtre-pil ${konuFiltre === '' ? 'aktif' : ''}">Tümü</a>`;
            konular.forEach(k => {
                filtreHtml += `<a href="okuma.html?konu=${encodeURIComponent(k)}" class="filtre-pil ${konuFiltre === k ? 'aktif' : ''}">${k}</a>`;
            });
            if (filtreCubugu) filtreCubugu.innerHTML = filtreHtml;

            // Listeyi filtrele
            let listelenecek = okumaKayitlari;
            if (konuFiltre !== '') {
                listelenecek = okumaKayitlari.filter(k => (k.meta?.konu || '') === konuFiltre);
            }

            // Kartları bas
            const grid = document.getElementById('readings-grid');
            if (listelenecek.length === 0) {
                grid.innerHTML = '<div class="empty-state"><p>Henüz okuma parçası eklenmemiş.</p></div>';
            } else {
                let gridHtml = '';
                listelenecek.forEach(item => {
                    const meta = item.meta || {};
                    const id = item.id || '';
                    const coverImg = meta.kapak ? meta.kapak.replace('../','') : '';
                    
                    gridHtml += `
                    <article class="reading-card">
                        <a href="okuma.html?id=${encodeURIComponent(id)}" class="card-thumb">
                            ${coverImg ? `<img src="${coverImg}" alt="${meta.baslik || ''}" loading="lazy">` : ''}
                            ${meta.konu ? `<span class="card-category-badge">${meta.konu}</span>` : ''}
                        </a>
                        <div class="card-body">
                            <h2 class="card-title">
                                <a href="okuma.html?id=${encodeURIComponent(id)}">${meta.baslik || 'Başlıksız'}</a>
                            </h2>
                            <div class="card-meta-row">
                                ${meta.yazar ? `<span><i class="fa fa-user"></i> ${meta.yazar}</span>` : ''}
                                ${meta.tarih ? `<time><i class="fa fa-clock"></i> ${meta.tarih}</time>` : ''}
                            </div>
                            <a href="okuma.html?id=${encodeURIComponent(id)}" class="card-link">Oku →</a>
                        </div>
                    </article>`;
                });
                grid.innerHTML = gridHtml;
            }
        }

    } catch(e) { console.error('Okuma verisi yükleme hatası:', e); }
});