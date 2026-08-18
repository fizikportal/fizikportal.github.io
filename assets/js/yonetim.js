document.addEventListener('DOMContentLoaded', () => {
    const tumVeriler = window.YONETIM_VERI || {};
    const menuEl = document.getElementById('yonetim-menu');
    const icerikEl = document.getElementById('yonetim-icerik');
    const commentMaddeIdEl = document.getElementById('comment-madde-id');

    let seciliMaddeId = 'intro';

    // 1. Kategorilere Göre Grupla
    const kategoriler = {};
    Object.entries(tumVeriler).forEach(([kayitId, item]) => {
        if (kayitId === 'intro') return;
        const kat = item.meta?.konu || 'Genel';
        if (!kategoriler[kat]) kategoriler[kat] = [];
        kategoriler[kat].push({ ...item, kayitId: kayitId });
    });

    // 2. Menüyü Çiz
    let menuHtml = '';
    for (const kat in kategoriler) {
        menuHtml += `
            <details class="kategori-group" open>
                <summary class="kategori-summary"><i class="fa fa-folder"></i> ${kat}</summary>
                <div class="kategori-items">
        `;
        kategoriler[kat].forEach(item => {
            menuHtml += `<button class="meb-baslik-btn" data-id="${item.kayitId}">${item.meta?.baslik || 'Başlıksız'}</button>`;
        });
        menuHtml += `</div></details>`;
    }
    if (menuEl) menuEl.innerHTML = menuHtml || '<p class="empty-state" style="padding:20px 0;">Henüz madde eklenmemiş.</p>';

    // 3. Madde Yükleme Fonksiyonu
    function maddeYukle(id) {
        const veri = tumVeriler[id];
        if (veri) {
            document.querySelectorAll('.meb-baslik-btn').forEach(b => b.classList.remove('active'));
            const btn = document.querySelector(`.meb-baslik-btn[data-id="${id}"]`);
            if (btn) btn.classList.add('active');

            icerikEl.innerHTML = veri.html;
            seciliMaddeId = id;
            if (commentMaddeIdEl) commentMaddeIdEl.value = id;
            loadComments(id);
        } else {
            const ilkId = Object.keys(tumVeriler)[0];
            if (ilkId) maddeYukle(ilkId);
        }
    }

    document.querySelectorAll('.meb-baslik-btn').forEach(btn => {
        btn.addEventListener('click', () => maddeYukle(btn.dataset.id));
    });

    // --- YORUM SİSTEMİ ---
    const badWords = ["amk","aq","orospu","sik","piç","kahpe","ibne","yarrak","fuck","shit","bitch","mal","salak","aptal"];
    const commentForm = document.getElementById('comment-form');
    const commentsSection = document.getElementById('comments-section');

    async function loadComments(maddeId) {
        if (!commentsSection) return;
        
        try {
            const response = await fetch('data/comments.json', { cache: 'no-store' });
            if (!response.ok) throw new Error('Yorum dosyası okunamadı');
            const comments = await response.json();
            
            // Karmaşayı giderdik: Sadece ID eşleşmesine bakıyoruz.
            const approved = comments.filter(c => c.page === maddeId && c.status === 'approved');

            let html = `<h3 class="yorumlar-title"><i class="fa fa-comments"></i> Yorumlar (${approved.length})</h3>`;
            if (approved.length === 0) {
                html += `<p class="yorumlar-empty">Bu maddeye henüz onaylanmış yorum bulunmuyor.</p>`;
            } else {
                approved.forEach(comment => {
                    html += `
                        <div class="yorum-item">
                            <div class="yorum-item-header">
                                <strong>${escapeHtml(comment.name || 'Anonim')}</strong>
                                <small>${comment.date || ''}</small>
                            </div>
                            <p class="yorum-item-text">${escapeHtml(comment.text)}</p>
                        </div>`;
                });
            }
            commentsSection.innerHTML = html;
        } catch(e) { 
            commentsSection.innerHTML = `<p class="yorumlar-empty">Yorumlar yüklenemedi.</p>`; 
        }
    }

    if (commentForm) {
        commentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const text = document.getElementById('comment-text').value.trim();
            const name = window.CURRENT_USERNAME || document.getElementById('comment-name')?.value.trim() || 'Anonim';

            if (!text) return;
            if (badWords.some(w => text.toLowerCase().includes(w) || name.toLowerCase().includes(w))) {
                alert("Uygunsuz kelimeler tespit edildi. Lütfen kelimelerinizi düzeltin.");
                return;
            }
            try {
                const response = await fetch('add_comment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: name,
                        text: text,
                        // Artık sayfa adını 'yonetim_intro' değil, direkt 'intro' olarak kaydediyoruz.
                        page: seciliMaddeId 
                    })
                });
                const result = await response.json();
                if (result.success) {
                    alert('Yorumunuz onaya gönderildi. Admin onayladıktan sonra görünecektir.');
                    document.getElementById('comment-text').value = '';
                    loadComments(seciliMaddeId); 
                } else {
                    alert(result.message || 'Hata oluştu.');
                }
            } catch(err) { 
                alert('Yorum gönderilemedi. Lütfen konsolu kontrol edin.'); 
            }
        });
    }

    function escapeHtml(text) { 
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // İlk açılışta intro yükle, yoksa ilk maddeyi yükle
    if (tumVeriler['intro']) {
        maddeYukle('intro');
    } else if (Object.keys(tumVeriler).length > 0) {
        maddeYukle(Object.keys(tumVeriler)[0]);
    }
});