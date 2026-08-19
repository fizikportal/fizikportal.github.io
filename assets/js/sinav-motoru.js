// BLOK RENDER (Diğer sayfalarla aynı)
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

    const path = window.location.pathname.split('/').pop() || 'sinav_ol.html';
    document.querySelectorAll('#main-nav-links a').forEach(link => {
        if (link.getAttribute('href') === path) link.classList.add('active');
    });

    let tumSorular = [];
    let seciliSinif = '';
    let seciliKonular = [];
    let sinavSorulari = [];
    let aktifSoru = 0;
    let cevaplar = []; // Kullanıcının cevapları

    // 1. Verileri Yükle
    try {
        const res = await fetch('data/soru.json');
        if (!res.ok) return;
        tumSorular = await res.json();
        
        // Sınıfları ve Konuları Çıkar
        const siniflar = [...new Set(tumSorular.map(s => s.meta?.sinif).filter(Boolean))].sort();
        const konular = [...new Set(tumSorular.map(s => s.meta?.konu).filter(Boolean))].sort();

        // Sınıf Kutularını Oluştur
        const sinifGrup = document.getElementById('sinif-secim-grup');
        siniflar.forEach(s => {
            sinifGrup.innerHTML += `<label class="secim-pil"><input type="radio" name="sinif" value="${s}"> ${s}</label>`;
        });
        sinifGrup.querySelectorAll('input').forEach(r => {
            r.addEventListener('change', (e) => seciliSinif = e.target.value);
        });

        // Konu Kutularını Oluştur
        const konuGrup = document.getElementById('konu-secim-grup');
        konular.forEach(k => {
            konuGrup.innerHTML += `<label class="secim-pil"><input type="checkbox" value="${k}"> ${k}</label>`;
        });
        konuGrup.querySelectorAll('input').forEach(c => {
            c.addEventListener('change', (e) => {
                if (e.target.checked) seciliKonular.push(e.target.value);
                else seciliKonular = seciliKonular.filter(k => k !== e.target.value);
            });
        });

    } catch(e) { console.error('Sorular yüklenemedi', e); }

    // 2. Sınavı Başlat
    document.getElementById('sinav-basla-btn').addEventListener('click', () => {
        let filtrelenmis = tumSorular.filter(s => {
            const sinifUygun = !seciliSinif || s.meta?.sinif === seciliSinif;
            const konuUygun = seciliKonular.length === 0 || seciliKonular.includes(s.meta?.konu);
            return sinifUygun && konuUygun;
        });

        if (filtrelenmis.length === 0) {
            alert('Seçtiğiniz kriterlere uygun soru bulunamadı.');
            return;
        }

        // Soruları Karıştır
        filtrelenmis.sort(() => Math.random() - 0.5);
        
        // İstenen Soru Sayısını Al
        const sayi = parseInt(document.getElementById('soru-sayisi-input').value) || 10;
        sinavSorulari = filtrelenmis.slice(0, Math.min(sayi, filtrelenmis.length));
        
        // Sınavı Başlat
        cevaplar = new Array(sinavSorulari.length).fill(null);
        aktifSoru = 0;
        
        document.getElementById('sinav-kurulum').style.display = 'none';
        document.getElementById('sinav-alani').style.display = 'block';
        document.getElementById('sinav-sonuc').style.display = 'none';
        
        soruGoster();
    });

    // 3. Soru Göster
    function soruGoster() {
        const soru = sinavSorulari[aktifSoru];
        
        // Soru HTML'ini oluştur ve şıkları ayıkla
        let soruHtml = (soru.page || []).map(blokToHtml).join('');
        soruHtml = soruHtml.replace(/\.\.\/uploads\//g, 'uploads/').replace(/\.\.\/assets\//g, 'assets/');

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = soruHtml;

        // Şıkları bul
        const optionsGrid = tempDiv.querySelector('.question-options-grid');
        let siklar = [];
        if (optionsGrid) {
            optionsGrid.querySelectorAll('.option-box').forEach(box => {
                siklar.push(box.querySelector('.option-text')?.innerHTML || '');
            });
            optionsGrid.remove();
        }

        // İpucu ve Çözümü bul (Sınav modunda gösterme, kaldır)
        tempDiv.querySelectorAll('.meta-correct, .meta-hint, .meta-solution').forEach(el => el.remove());

        // Ekrana Bas
        document.getElementById('sinav-ilerleme').textContent = `Soru ${aktifSoru + 1} / ${sinavSorulari.length}`;
        document.getElementById('sinav-govde').innerHTML = tempDiv.innerHTML;

        const siklarAlani = document.getElementById('sinav-secenekler');
        siklarAlani.innerHTML = '';
        const sikHarfleri = ['A', 'B', 'C', 'D', 'E'];
        
        siklar.forEach((sik, i) => {
            const harf = sikHarfleri[i];
            const btn = document.createElement('button');
            btn.className = 'secenek-btn';
            if (cevaplar[aktifSoru] === harf) btn.classList.add('secenek-secili'); // Seçiliyi işaretle
            btn.innerHTML = `<span class="secenek-harf">${harf}</span> ${sik}`;
            btn.addEventListener('click', () => {
                cevaplar[aktifSoru] = harf;
                // Tüm butonlardan seçiliyi kaldır
                siklarAlani.querySelectorAll('button').forEach(b => b.classList.remove('secenek-secili'));
                btn.classList.add('secenek-secili');
            });
            siklarAlani.appendChild(btn);
        });

        // Butonları Ayarla
        document.getElementById('sinav-geri-btn').style.display = aktifSoru > 0 ? 'inline-flex' : 'none';
        const ileriBtn = document.getElementById('sinav-ileri-btn');
        const bitirBtn = document.getElementById('sinav-bitir-btn');
        
        if (aktifSoru < sinavSorulari.length - 1) {
            ileriBtn.style.display = 'inline-flex';
            bitirBtn.style.display = 'none';
        } else {
            ileriBtn.style.display = 'none';
            bitirBtn.style.display = 'inline-flex';
        }
    }

    // 4. Navigasyon
    document.getElementById('sinav-ileri-btn').addEventListener('click', () => {
        if (aktifSoru < sinavSorulari.length - 1) { aktifSoru++; soruGoster(); }
    });
    document.getElementById('sinav-geri-btn').addEventListener('click', () => {
        if (aktifSoru > 0) { aktifSoru--; soruGoster(); }
    });

    // 5. Sınavı Bitir ve Sonuç Göster
    document.getElementById('sinav-bitir-btn').addEventListener('click', () => {
        let dogruSayisi = 0;
        let ozetHtml = '';

        sinavSorulari.forEach((soru, i) => {
            const dogruCevap = soru.meta?.dogru || 'A';
            const kullaniciCevap = cevaplar[i] || 'Boş';
            
            if (kullaniciCevap === dogruCevap) {
                dogruSayisi++;
                ozetHtml += `<div class="ozet-satir ozet-dogru"><i class="fa fa-check"></i><span class="ozet-baslik">Soru ${i+1}</span><span class="ozet-cevap">Cevabınız: ${kullaniciCevap} | Doğru: ${dogruCevap}</span></div>`;
            } else {
                ozetHtml += `<div class="ozet-satir ozet-yanlis"><i class="fa fa-times"></i><span class="ozet-baslik">Soru ${i+1}</span><span class="ozet-cevap">Cevabınız: ${kullaniciCevap} | Doğru: ${dogruCevap}</span></div>`;
            }
        });

        const yuzde = Math.round((dogruSayisi / sinavSorulari.length) * 100);
        
        document.getElementById('sinav-alani').style.display = 'none';
        const sonucDiv = document.getElementById('sinav-sonuc');
        sonucDiv.style.display = 'block';
        sonucDiv.innerHTML = `
            <div class="sinav-sonuc-ust">
                <i class="fa-solid fa-trophy"></i>
                <h2>Sınav Bitti!</h2>
                <p class="sinav-sonuc-skor">${dogruSayisi} / ${sinavSorulari.length} Doğru</p>
                <p class="sinav-sonuc-derece">Başarı: %${yuzde}</p>
            </div>
            <div class="sinav-sonuc-ozet">
                ${ozetHtml}
            </div>
            <div style="text-align:center; margin-top:30px;">
                <a href="sinav_ol.html" class="btn-kaydet-ana" style="max-width:200px; margin:0 auto;">Yeni Sınav</a>
            </div>
        `;
    });

    // CSS Eksikliği İçin (Secili şık için stil)
    const style = document.createElement('style');
    style.innerHTML = `.secenek-btn.secenek-secili { border-color: var(--accent-cyan) !important; background: var(--glass) !important; } .secenek-btn:disabled { opacity: 1; cursor: pointer; }`;
    document.head.appendChild(style);
});