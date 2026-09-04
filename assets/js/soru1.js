// BLOK RENDER FONKSİYONU (Diğer sayfalarla paylaşılan)
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

document.addEventListener("DOMContentLoaded", async () => {
    await htmlYukle('includes/header.html', 'header-yeri');
    await htmlYukle('includes/footer.html', 'footer-yeri');

    const path = window.location.pathname.split('/').pop() || 'soru.html';
    document.querySelectorAll('#main-nav-links a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    // Menü Aç/Kapa
    const toggleBtn = document.getElementById('soru-menu-toggle');
    const sidebar = document.getElementById('soru-sidebar');
    const overlay = document.getElementById('soru-menu-overlay');
    const baslaBtn = document.getElementById('quiz-basla-btn');

    function openMenu() { sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeMenu() { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; }
    
    if (toggleBtn) toggleBtn.addEventListener('click', openMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    if (baslaBtn) baslaBtn.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

    // 1. Tanıtım Metnini Yükle
    try {
        const resIntro = await fetch('data/soru_ilk.json');
        if (resIntro.ok) {
            const dataIntro = await resIntro.json();
            let introHtml = (dataIntro.page || []).map(blokToHtml).join('');
            introHtml = introHtml.replace(/\.\.\/uploads\//g, 'uploads/').replace(/\.\.\/assets\//g, 'assets/');
            document.getElementById('soru-intro').innerHTML = introHtml || '<p>Fizik sorularını çözmeye başlamak için sol taraftan sınıf ve konu seçip <strong>"Sorulara Başla"</strong> butonuna tıkla.</p>';
        }
    } catch(e) { console.error('Intro yüklenemedi', e); }

    // 2. Soruları Yükle
    let tumSorular = [];
    let aktifSoruIndex = 0;
    let seciliSorular = [];

    try {
        const resSoru = await fetch('data/soru.json');
        if (!resSoru.ok) return;
        tumSorular = await resSoru.json();

        document.getElementById('soru-toplam').textContent = tumSorular.length + ' soru mevcut.';

        // Sınıf ve Konu Filtrelerini Doldur
        const siniflar = [...new Set(tumSorular.map(s => s.meta?.sinif).filter(Boolean))].sort();
        const konular = [...new Set(tumSorular.map(s => s.meta?.konu).filter(Boolean))].sort();

        const secimSinif = document.getElementById('secim-sinif');
        siniflar.forEach(s => secimSinif.innerHTML += `<option value="${s}">${s}</option>`);

        const secimKonu = document.getElementById('secim-konu');
        konular.forEach(k => secimKonu.innerHTML += `<option value="${k}">${k}</option>`);

    } catch(e) { console.error('Sorular yüklenemedi', e); }

    // 3. Quiz Mantığı
    baslaBtn.addEventListener('click', () => {
        const secSinif = document.getElementById('secim-sinif').value;
        const secKonu = document.getElementById('secim-konu').value;

        seciliSorular = tumSorular.filter(s => {
            return (!secSinif || s.meta?.sinif === secSinif) && (!secKonu || s.meta?.konu === secKonu);
        });

        if (seciliSorular.length === 0) {
            alert('Seçtiğiniz kriterlere uygun soru bulunamadı.');
            return;
        }

        aktifSoruIndex = 0;
        document.getElementById('soru-intro').style.display = 'none';
        document.getElementById('soru-quiz-alani').style.display = 'block';
        soruGoster();
    });

    function soruGoster() {
        const soru = seciliSorular[aktifSoruIndex];
        const dogruCevap = soru.meta?.dogru || 'A';

        // Soru bloklarını HTML'e çevir
        let soruHtml = (soru.page || []).map(blokToHtml).join('');
        soruHtml = soruHtml.replace(/\.\.\/uploads\//g, 'uploads/').replace(/\.\.\/assets\//g, 'assets/');

        // Geçici bir elemana koyup şık, ipucu ve çözümü ayıkla
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = soruHtml;

        // Şıkları bul
        const optionsGrid = tempDiv.querySelector('.question-options-grid');
        let siklar = [];
        if (optionsGrid) {
            optionsGrid.querySelectorAll('.option-box').forEach(box => {
                const text = box.querySelector('.option-text')?.innerHTML || '';
                siklar.push(text);
            });
            optionsGrid.remove(); // Soru gövdesinden şıkları kaldır
        }

        // İpucu ve Çözümü bul
        const ipucuBox = tempDiv.querySelector('.meta-hint .meta-content');
        const cozumBox = tempDiv.querySelector('.meta-solution .meta-content');
        let ipucu = ipucuBox ? ipucuBox.innerHTML : '';
        let cozum = cozumBox ? cozumBox.innerHTML : '';
        
        // Doğru cevap belirle alanını kaldır
        tempDiv.querySelectorAll('.meta-correct, .meta-hint, .meta-solution').forEach(el => el.remove());

        // Ekrana Bas
        document.getElementById('quiz-ilerleme').textContent = `Soru ${aktifSoruIndex + 1} / ${seciliSorular.length}`;
        document.getElementById('quiz-govde').innerHTML = tempDiv.innerHTML;

        const siklarAlani = document.getElementById('quiz-secenekler');
        siklarAlani.innerHTML = '';
        const sikHarfleri = ['A', 'B', 'C', 'D', 'E'];
        siklar.forEach((sik, i) => {
            const btn = document.createElement('button');
            btn.className = 'secenek-btn';
            btn.innerHTML = `<span class="secenek-harf">${sikHarfleri[i]}</span> ${sik}`;
            btn.addEventListener('click', () => cevapKontrol(btn, sikHarfleri[i], dogruCevap));
            siklarAlani.appendChild(btn);
        });

        // İpucu ve Çözüm butonları
        const ipucuBtn = document.getElementById('ipucu-btn');
        const cozumBtn = document.getElementById('cozum-btn');
        const ipucuKutu = document.getElementById('ipucu-kutu');
        const cozumKutu = document.getElementById('cozum-kutu');

        if (ipucu) {
            ipucuBtn.style.display = 'inline-flex';
            ipucuKutu.innerHTML = ipucu;
            ipucuBtn.onclick = () => ipucuKutu.style.display = ipucuKutu.style.display === 'none' ? 'block' : 'none';
        } else { ipucuBtn.style.display = 'none'; }
        ipucuKutu.style.display = 'none';

        if (cozum) {
            cozumBtn.style.display = 'inline-flex';
            cozumKutu.innerHTML = cozum;
            cozumBtn.onclick = () => cozumKutu.style.display = cozumKutu.style.display === 'none' ? 'block' : 'none';
        } else { cozumBtn.style.display = 'none'; }
        cozumKutu.style.display = 'none';

        // Sonraki butonu
        const sonrakiBtn = document.getElementById('quiz-sonraki-btn');
        sonrakiBtn.style.display = aktifSoruIndex < seciliSorular.length - 1 ? 'inline-flex' : 'none';
        sonrakiBtn.onclick = () => { aktifSoruIndex++; soruGoster(); };
    }

    function cevapKontrol(btn, secilenHarf, dogruCevap) {
        const tumBtnler = document.querySelectorAll('.secenek-btn');
        tumBtnler.forEach(b => b.disabled = true);

        if (secilenHarf === dogruCevap) {
            btn.classList.add('secenek-dogru');
        } else {
            btn.classList.add('secenek-yanlis');
            // Doğru şıkkı da işaretle
            tumBtnler.forEach(b => {
                const harf = b.querySelector('.secenek-harf').textContent;
                if (harf === dogruCevap) b.classList.add('secenek-dogru');
            });
        }
    }
});
