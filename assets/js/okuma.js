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
setupCommentForm(seciliId);
loadComments(seciliId);
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


// --- YORUM SİSTEMİ MANTIĞI ---
async function setupCommentForm(contentId) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const formArea = document.getElementById('yorum-form-alani');
    
    if (session) {
        // Kullanıcı giriş yapmış, formu göster
        const user = session.user;
        const fullName = user.user_metadata?.full_name || user.email;
        
        formArea.innerHTML = `
            <form id="comment-form" class="yorum-form">
                <textarea id="comment-text" class="yorum-textarea" rows="3" placeholder="Merhaba ${fullName.split(' ')[0]}, yorumunu yaz..." required></textarea>
                <button type="submit" class="yorum-submit"><i class="fa fa-paper-plane"></i> Gönder</button>
            </form>
        `;
        
        document.getElementById('comment-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = document.getElementById('comment-text').value;
            const submitBtn = e.target.querySelector('button');
            submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i>';
            submitBtn.disabled = true;

            try {
                const { error } = await supabaseClient.from('comments').insert({
                    content_id: contentId,
                    user_email: user.email,
                    user_name: fullName,
                    comment_text: text
                });

                if (error) throw error;

                formArea.innerHTML = `
                    <div style="text-align:center; padding:20px; color: var(--accent-lime);">
                        <i class="fa fa-check-circle fa-2x"></i><br>
                        <strong>Yorumunuz alındı!</strong><br>
                        Admin onayından sonra yayınlanacaktır.
                    </div>
                `;
            } catch (err) {
                alert('Yorum gönderilemedi: ' + err.message);
                submitBtn.innerHTML = '<i class="fa fa-paper-plane"></i> Gönder';
                submitBtn.disabled = false;
            }
        });
    } else {
        // Kullanıcı giriş yapmamış
        formArea.innerHTML = `
            <div class="yorum-login">
                <i class="fa fa-lock"></i>
                <h3>Yorum yapmak için giriş yapmalısınız</h3>
                <div class="yorum-login-buttons">
                    <a href="giris.html" class="btn-login">Giriş Yap</a>
                    <a href="kayit_ol.html" class="btn-register">Kayıt Ol</a>
                </div>
            </div>
        `;
    }
}

// ── XSS KALKANI — kullanıcı kontrollü metinler ekrana basılmadan temizlenir ──
function esc(deger) {
    return String(deger ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function loadComments(contentId) {
    const listEl = document.getElementById('yorumlar-listesi');
    if (!listEl) return;

    try {
        const { data: comments, error } = await supabaseClient
            .from('comments')
            .select('user_name, comment_text, created_at, admin_reply')
            .eq('content_id', contentId)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!comments || comments.length === 0) {
            listEl.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem; text-align: center;">Henüz onaylanmış yorum bulunmuyor.</p>';
            return;
        }

        let html = `<h3 class="yorumlar-title"><i class="fa fa-comments"></i> ${comments.length} Yorum</h3>`;
        comments.forEach(c => {
            const date = new Date(c.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

            let adminReplyHtml = '';
            if (c.admin_reply) {
                adminReplyHtml = `
                    <div style="margin-top: 10px; padding: 10px; background: rgba(200, 245, 66, 0.05); border-left: 3px solid var(--accent-lime); border-radius: 0 4px 4px 0; font-size: 0.9rem;">
                        <strong style="color: var(--accent-lime);">Admin Cevabı:</strong> ${esc(c.admin_reply)}
                    </div>`;
            }

            html += `
            <div class="yorum-item">
                <div class="yorum-item-header">
                    <strong>${esc(c.user_name)}</strong>
                    <small>${date}</small>
                </div>
                <p class="yorum-item-text">${esc(c.comment_text)}</p>
                ${adminReplyHtml}
            </div>`;
        });
        listEl.innerHTML = html;
    } catch (err) {
        console.error('Yorumlar yüklenemedi:', err);
    }
}