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
        // --- İŞTE BURAYA DA EKLEYİN ---
        setupCommentForm('intro');
        loadComments('intro');

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
		    
                    setupCommentForm(id);
                    loadComments(id);

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


// --- YORUM SİSTEMİ MANTIĞI ---
async function setupCommentForm(contentId) {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const formArea = document.getElementById('yorum-form-alani');
    
    if (session) {
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

async function loadComments(contentId) {
    const listEl = document.getElementById('yorumlar-listesi');
    if (!listEl) return;

    try {
        const { data: comments, error } = await supabaseClient
            .from('comments')
            .select('user_name, comment_text, created_at, admin_reply') // admin_reply eklendi
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
            
            // Admin cevabı varsa onu da ekle
            let adminReplyHtml = '';
            if (c.admin_reply) {
                adminReplyHtml = `
                    <div style="margin-top: 10px; padding: 10px; background: rgba(200, 245, 66, 0.05); border-left: 3px solid var(--accent-lime); border-radius: 0 4px 4px 0; font-size: 0.9rem;">
                        <strong style="color: var(--accent-lime);">Admin Cevabı:</strong> ${c.admin_reply}
                    </div>`;
            }

            html += `
            <div class="yorum-item">
                <div class="yorum-item-header">
                    <strong>${c.user_name || 'Misafir'}</strong>
                    <small>${date}</small>
                </div>
                <p class="yorum-item-text">${c.comment_text}</p>
                ${adminReplyHtml}
            </div>`;
        });
        listEl.innerHTML = html;
    } catch (err) {
        console.error('Yorumlar yüklenemedi:', err);
    }
}
