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
    const cikisBtn = document.getElementById('sinav-cikis-btn');
    const ileriBtn = document.getElementById('sinav-ileri-btn');
    const geriBtn = document.getElementById('sinav-geri-btn');
    const bitirBtn = document.getElementById('sinav-bitir-btn');

    function openMenu() { sidebar.classList.add('open'); overlay.classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeMenu() { sidebar.classList.remove('open'); overlay.classList.remove('active'); document.body.style.overflow = ''; }
    
    if (toggleBtn) toggleBtn.addEventListener('click', openMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
    if (baslaBtn) baslaBtn.addEventListener('click', closeMenu);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    
    // Sınavdan Çıkış
    if (cikisBtn) {
        cikisBtn.addEventListener('click', () => {
            if (confirm('Sınavdan çıkmak istediğinize emin misiniz? Sonuçlarınız kaybolacak.')) {
                document.getElementById('soru-quiz-alani').style.display = 'none';
                document.getElementById('soru-intro').style.display = 'block';
                document.getElementById('soru-menu-toggle').style.display = 'inline-flex';
            }
        });
    }

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
    let cevaplar = [];

    try {
        const resSoru = await fetch('data/soru.json');
        if (!resSoru.ok) return;
        tumSorular = await resSoru.json();

        document.getElementById('soru-toplam').textContent = tumSorular.length + ' soru mevcut.';

        const siniflar = [...new Set(tumSorular.map(s => s.meta?.sinif).filter(Boolean))].sort();
        const konular = [...new Set(tumSorular.map(s => s.meta?.konu).filter(Boolean))].sort();

        const secimSinif = document.getElementById('secim-sinif');
        siniflar.forEach(s => secimSinif.innerHTML += `<option value="${s}">${s}</option>`);

        const secimKonu = document.getElementById('secim-konu');
        konular.forEach(k => secimKonu.innerHTML += `<option value="${k}">${k}</option>`);

    } catch(e) { console.error('Sorular yüklenemedi', e); }

    // 3. Quiz Başlat
    if (baslaBtn) {
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

            seciliSorular.sort(() => Math.random() - 0.5);
            const sayi = parseInt(document.getElementById('soru-sayisi-input').value) || 10;
            window.sinavSorulari = seciliSorular.slice(0, Math.min(sayi, seciliSorular.length));
            
            cevaplar = new Array(window.sinavSorulari.length).fill(null);
            aktifSoruIndex = 0;
            
            document.getElementById('soru-intro').style.display = 'none';
            document.getElementById('soru-quiz-alani').style.display = 'block';
            document.getElementById('soru-menu-toggle').style.display = 'none';
            
            soruGoster();
        });
    }

    function soruGoster() {
        const soru = window.sinavSorulari[aktifSoruIndex];
        const dogruCevap = soru.meta?.dogru || 'A';

        let soruHtml = (soru.page || []).map(blokToHtml).join('');
        soruHtml = soruHtml.replace(/\.\.\/uploads\//g, 'uploads/').replace(/\.\.\/assets\//g, 'assets/');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = soruHtml;

        const optionsGrid = tempDiv.querySelector('.question-options-grid');
        let siklar = [];
        if (optionsGrid) {
            optionsGrid.querySelectorAll('.option-box').forEach(box => {
                siklar.push(box.querySelector('.option-text')?.innerHTML || '');
            });
            optionsGrid.remove();
        }

        // İpucu ve Çözümü bul
        const ipucuBox = tempDiv.querySelector('.meta-hint .meta-content');
        const cozumBox = tempDiv.querySelector('.meta-solution .meta-content');
        let ipucu = ipucuBox ? ipucuBox.innerHTML : '';
        let cozum = cozumBox ? cozumBox.innerHTML : '';
        
        tempDiv.querySelectorAll('.meta-correct, .meta-hint, .meta-solution').forEach(el => el.remove());

        document.getElementById('sinav-ilerleme').textContent = `Soru ${aktifSoruIndex + 1} / ${window.sinavSorulari.length}`;
        document.getElementById('sinav-govde').innerHTML = tempDiv.innerHTML;

        const siklarAlani = document.getElementById('sinav-secenekler');
        siklarAlani.innerHTML = '';
        const sikHarfleri = ['A', 'B', 'C', 'D', 'E'];
        
                siklar.forEach((sik, i) => {
            const harf = sikHarfleri[i];
            const btn = document.createElement('button');
            btn.className = 'secenek-btn';
            
            // Eğer soru daha önce çözüldüyse (Geri butonu ile dönüldüyse), doğru/yanlışı göster
            if (cevaplar[aktifSoruIndex] !== null) {
                btn.disabled = true;
                if (harf === dogruCevap) {
                    btn.classList.add('secenek-dogru');
                } else if (harf === cevaplar[aktifSoruIndex]) {
                    btn.classList.add('secenek-yanlis');
                }
            } else {
                // Tıklanma Anında Doğru/Yanlış Göster (Anında Geri Bildirim)
                btn.addEventListener('click', () => {
                    const tumBtnler = siklarAlani.querySelectorAll('button');
                    tumBtnler.forEach(b => b.disabled = true); // Tüm butonları kilitle
                    
                    cevaplar[aktifSoruIndex] = harf; // Cevabı kaydet
                    
                    if (harf === dogruCevap) {
                        btn.classList.add('secenek-dogru'); // Tıklananı yeşil yap
                    } else {
                        btn.classList.add('secenek-yanlis'); // Tıklananı kırmızı yap
                        // Doğru şıkkı da yeşil yap
                        tumBtnler.forEach(b => {
                            const h = b.querySelector('.secenek-harf').textContent;
                            if (h === dogruCevap) b.classList.add('secenek-dogru');
                        });
                    }
                });
            }
            
            btn.innerHTML = `<span class="secenek-harf">${harf}</span> ${sik}`;
            siklarAlani.appendChild(btn);
        });

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

        // Navigasyon Butonları
        geriBtn.style.display = aktifSoruIndex > 0 ? 'inline-flex' : 'none';
        
        if (aktifSoruIndex < window.sinavSorulari.length - 1) {
            ileriBtn.style.display = 'inline-flex';
            bitirBtn.style.display = 'none';
        } else {
            ileriBtn.style.display = 'none';
            bitirBtn.style.display = 'inline-flex';
        }
    }

    // 4. Navigasyon Event Listener'ları
    if (ileriBtn) {
        ileriBtn.addEventListener('click', () => {
            if (aktifSoruIndex < window.sinavSorulari.length - 1) { aktifSoruIndex++; soruGoster(); }
        });
    }
    if (geriBtn) {
        geriBtn.addEventListener('click', () => {
            if (aktifSoruIndex > 0) { aktifSoruIndex--; soruGoster(); }
        });
    }

    // 5. Sınavı Bitir
    if (bitirBtn) {
        bitirBtn.addEventListener('click', () => {
            let dogruSayisi = 0;
            let ozetHtml = '';

            window.sinavSorulari.forEach((soru, i) => {
                const dogruCevap = soru.meta?.dogru || 'A';
                const kullaniciCevap = cevaplar[i] || 'Boş';
                
                if (kullaniciCevap === dogruCevap) {
                    dogruSayisi++;
                    ozetHtml += `<div class="ozet-satir ozet-dogru"><i class="fa fa-check"></i><span class="ozet-baslik">Soru ${i+1}</span><span class="ozet-cevap">Cevabınız: ${kullaniciCevap} | Doğru: ${dogruCevap}</span></div>`;
                } else {
                    ozetHtml += `<div class="ozet-satir ozet-yanlis"><i class="fa fa-times"></i><span class="ozet-baslik">Soru ${i+1}</span><span class="ozet-cevap">Cevabınız: ${kullaniciCevap} | Doğru: ${dogruCevap}</span></div>`;
                }
            });

            const yuzde = Math.round((dogruSayisi / window.sinavSorulari.length) * 100);
            
            document.getElementById('soru-quiz-alani').style.display = 'none';
            const sonucDiv = document.getElementById('sinav-sonuc');
            sonucDiv.style.display = 'block';
            sonucDiv.innerHTML = `
                <div class="sinav-sonuc-ust">
                    <i class="fa-solid fa-trophy"></i>
                    <h2>Sınav Bitti!</h2>
                    <p class="sinav-sonuc-skor">${dogruSayisi} / ${window.sinavSorulari.length} Doğru</p>
                    <p class="sinav-sonuc-derece">Başarı: %${yuzde}</p>
                </div>
                <div class="sinav-sonuc-ozet">
                    ${ozetHtml}
                </div>
                <div style="text-align:center; margin-top:30px;">
                    <a href="soru.html" class="btn-kaydet-ana" style="max-width:200px; margin:0 auto;">Yeni Sınav</a>
                </div>
            `;
        });
    }
});