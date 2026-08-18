/*
    assets/js/sinav-motoru.js
    ===================================================================
    sinav_ol.php'nin motoru. soru.php'nin pratik modundan farkı: cevap
    verirken ANINDA doğru/yanlış gösterilmez, hepsi cevaplanana kadar
    bekler, sonunda toplu skor + özet gösterilir.
    ===================================================================
*/
document.addEventListener('DOMContentLoaded', () => {
    const tumSorular = window.SORU_KAYITLARI || [];

    const kurulumEl   = document.getElementById('sinav-kurulum');
    const sinavEl     = document.getElementById('sinav-alani');
    const sonucEl     = document.getElementById('sinav-sonuc');
    const sinifGrup   = document.getElementById('sinif-secim-grup');
    const konuGrup    = document.getElementById('konu-secim-grup');
    const soruSayisiInput = document.getElementById('soru-sayisi-input');
    const soruSayisiBilgi = document.getElementById('soru-sayisi-bilgi');
    const baslaBtn    = document.getElementById('sinav-basla-btn');

    if (!kurulumEl || !baslaBtn) return;

    let siraliSorular = [];
    let mevcutIndex = 0;
    let cevaplar = []; // her indekste seçilen harf ya da null

    // -----------------------------------------------------------------
    // BLOK -> HTML (main.js'in okuma mantığının küçük kopyası)
    // -----------------------------------------------------------------
    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function blokToHtml(block) {
        const tip = block.type;
        const icerik = block.content || {};
        if (tip === 'baslik') {
            const tag = ['h1', 'h2', 'h3'].includes(icerik.tag) ? icerik.tag : 'h2';
            return `<${tag}>${escapeHtml(icerik.text || '')}</${tag}>`;
        }
        if (tip === 'paragraf') return icerik.html || '';
        if (tip === 'tablo') return '<div class="site-table-wrapper">' + (icerik.html || '') + '</div>';
        if (tip === 'sutunlu_yazi') {
            const uid = block.uid;
            const layout = parseInt(icerik.layout_type || '0', 10);
            let html = '<div class="editor-row">';
            for (let i = 1; i <= layout; i++) {
                const hucreTipi = icerik[`cell_${i}_type`];
                if (hucreTipi === 'image') {
                    const yol = icerik[`image_path_block_${uid}_${i}`] || '';
                    html += `<div class="editor-col active-content"><div class="col-img-container"><img src="${yol}" alt="Görsel"></div></div>`;
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

    // Doğru cevap SADECE meta.dogru'dan okunur — içerikteki dropdown atlanır.
    function sorubloklariniAyikla(bloklar) {
        const sonuc = { govdeHtml: '', secenekler: [], cozumHtml: '' };
        (bloklar || []).forEach(block => {
            const html = blokToHtml(block);
            if (html.includes('question-options-grid')) {
                const gecici = document.createElement('div');
                gecici.innerHTML = html;
                gecici.querySelectorAll('.option-box').forEach(box => {
                    const harf = (box.querySelector('.option-prefix')?.textContent || '').replace(')', '').trim();
                    const metin = box.querySelector('.option-text')?.innerHTML || '';
                    sonuc.secenekler.push({ harf, metin });
                });

                // DÜZELTME: Şıklar ızgarasını temizleyip kalan resim/metin içeriğini soru gövdesine ekliyoruz
                gecici.querySelectorAll('.question-options-grid').forEach(grid => grid.remove());
                sonuc.govdeHtml += gecici.innerHTML;
            } else if (html.includes('meta-solution')) {
                const gecici = document.createElement('div');
                gecici.innerHTML = html;
                sonuc.cozumHtml = gecici.querySelector('.meta-content')?.innerHTML || '';
            } else if (html.includes('meta-correct') || html.includes('meta-hint')) {
                // Sınav modunda ipucu VE doğru cevap dropdown'u hiç gösterilmez.
            } else {
                sonuc.govdeHtml += html;
            }
        });
        return sonuc;
    }

    function karistir(dizi) {
        const kopya = [...dizi];
        for (let i = kopya.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [kopya[i], kopya[j]] = [kopya[j], kopya[i]];
        }
        return kopya;
    }

    // -----------------------------------------------------------------
    // KURULUM EKRANI — Sınıf/Konu dinamik listeleme
    // -----------------------------------------------------------------
    const tumSiniflar = [...new Set(tumSorular.map(s => s.meta?.sinif).filter(Boolean))].sort();

    tumSiniflar.forEach((sinif, i) => {
        const label = document.createElement('label');
        label.className = 'secim-pil';
        label.innerHTML = `<input type="radio" name="sinav-sinif" value="${escapeHtml(sinif)}" ${i === 0 ? 'checked' : ''}> ${escapeHtml(sinif)}`;
        sinifGrup.appendChild(label);
    });

    function secilenSinif() {
        const el = document.querySelector('input[name="sinav-sinif"]:checked');
        return el ? el.value : '';
    }

    function konuListesiniGuncelle() {
        const sinif = secilenSinif();
        const konular = [...new Set(
            tumSorular.filter(s => s.meta?.sinif === sinif).map(s => s.meta?.konu).filter(Boolean)
        )].sort();

        konuGrup.innerHTML = '';
        konular.forEach(konu => {
            const label = document.createElement('label');
            label.className = 'secim-pil';
            label.innerHTML = `<input type="checkbox" name="sinav-konu" value="${escapeHtml(konu)}" checked> ${escapeHtml(konu)}`;
            konuGrup.appendChild(label);
        });

        konuGrup.querySelectorAll('input').forEach(cb => cb.addEventListener('change', mevcutSoruSayisiniGuncelle));
        mevcutSoruSayisiniGuncelle();
    }

    function secilenKonular() {
        return Array.from(konuGrup.querySelectorAll('input:checked')).map(el => el.value);
    }

    function uygunSorulariBul() {
        const sinif = secilenSinif();
        const konular = secilenKonular();
        return tumSorular.filter(s => {
            const m = s.meta || {};
            return m.sinif === sinif && konular.includes(m.konu);
        });
    }

    function mevcutSoruSayisiniGuncelle() {
        const uygunlar = uygunSorulariBul();
        soruSayisiInput.max = uygunlar.length || 1;
        if (parseInt(soruSayisiInput.value, 10) > uygunlar.length) {
            soruSayisiInput.value = uygunlar.length || 1;
        }
        soruSayisiBilgi.textContent = `Seçtiğin kriterlere uygun ${uygunlar.length} soru var.`;
    }

    document.querySelectorAll('input[name="sinav-sinif"]').forEach(radio => {
        radio.addEventListener('change', konuListesiniGuncelle);
    });
    konuListesiniGuncelle();

    // -----------------------------------------------------------------
    // SINAVI BAŞLAT
    // -----------------------------------------------------------------
    baslaBtn.addEventListener('click', () => {
        const uygunlar = karistir(uygunSorulariBul());
        const istenenSayi = Math.max(1, parseInt(soruSayisiInput.value, 10) || 1);

        if (uygunlar.length === 0) {
            alert('Seçtiğin kriterlere uygun soru bulunamadı.');
            return;
        }

        siraliSorular = uygunlar.slice(0, Math.min(istenenSayi, uygunlar.length));
        cevaplar = new Array(siraliSorular.length).fill(null);
        mevcutIndex = 0;

        kurulumEl.style.display = 'none';
        sinavEl.style.display = 'block';
        soruyuGoster();
    });

    // -----------------------------------------------------------------
    // SINAV EKRANI
    // -----------------------------------------------------------------
    function soruyuGoster() {
        const soru = siraliSorular[mevcutIndex];
        const ayrilmis = sorubloklariniAyikla(soru.page || []);

        document.getElementById('sinav-ilerleme').textContent = `Soru ${mevcutIndex + 1} / ${siraliSorular.length}`;
        document.getElementById('sinav-govde').innerHTML = ayrilmis.govdeHtml;

        const secenekAlani = document.getElementById('sinav-secenekler');
        secenekAlani.innerHTML = '';
        ayrilmis.secenekler.forEach(secenek => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'secenek-btn';
            btn.dataset.harf = secenek.harf;
            if (cevaplar[mevcutIndex] === secenek.harf) btn.classList.add('secenek-secili');
            btn.innerHTML = `<span class="secenek-harf">${secenek.harf}</span><span class="secenek-metin">${secenek.metin}</span>`;
            btn.addEventListener('click', () => {
                cevaplar[mevcutIndex] = secenek.harf;
                secenekAlani.querySelectorAll('.secenek-btn').forEach(b => b.classList.remove('secenek-secili'));
                btn.classList.add('secenek-secili');
            });
            secenekAlani.appendChild(btn);
        });

        document.getElementById('sinav-geri-btn').style.display = mevcutIndex === 0 ? 'none' : 'inline-flex';
        const sonSoru = mevcutIndex === siraliSorular.length - 1;
        document.getElementById('sinav-ileri-btn').style.display = sonSoru ? 'none' : 'inline-flex';
        document.getElementById('sinav-bitir-btn').style.display = sonSoru ? 'inline-flex' : 'none';
    }

    document.getElementById('sinav-geri-btn').addEventListener('click', () => {
        if (mevcutIndex > 0) { mevcutIndex--; soruyuGoster(); }
    });
    document.getElementById('sinav-ileri-btn').addEventListener('click', () => {
        if (mevcutIndex < siraliSorular.length - 1) { mevcutIndex++; soruyuGoster(); }
    });
    document.getElementById('sinav-bitir-btn').addEventListener('click', sinaviBitir);

    // -----------------------------------------------------------------
    // SONUÇ EKRANI
    // -----------------------------------------------------------------
    function sinaviBitir() {
        let dogruSayisi = 0;
        const ozetSatirlari = siraliSorular.map((soru, i) => {
            const dogruHarf = soru.meta?.dogru || '';
            const verilenHarf = cevaplar[i];
            const dogruMu = verilenHarf === dogruHarf;
            if (dogruMu) dogruSayisi++;

            // Topluluk istatistiğine sessizce ekle (fire-and-forget)
            fetch('soru_istatistik_kaydet.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'soru_id=' + encodeURIComponent(soru.id) + '&sonuc=' + (dogruMu ? 'dogru' : 'yanlis')
            }).catch(() => {});

            return `
                <div class="ozet-satir ${dogruMu ? 'ozet-dogru' : 'ozet-yanlis'}">
                    <i class="fa-solid ${dogruMu ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
                    <span class="ozet-baslik">${escapeHtml(soru.meta?.baslik || 'Soru ' + (i + 1))}</span>
                    <span class="ozet-cevap">Cevabın: <strong>${verilenHarf || '—'}</strong> · Doğrusu: <strong>${dogruHarf || '—'}</strong></span>
                </div>
            `;
        }).join('');

        const yuzde = Math.round((dogruSayisi / siraliSorular.length) * 100);
        let derece = 'Geliştirilmeli';
        if (yuzde >= 90) derece = 'Mükemmel';
        else if (yuzde >= 70) derece = 'İyi';
        else if (yuzde >= 50) derece = 'Orta';

        sinavEl.style.display = 'none';
        sonucEl.style.display = 'block';
        sonucEl.innerHTML = `
            <div class="sinav-sonuc-ust">
                <i class="fa-solid fa-trophy"></i>
                <h2>Sınav Tamamlandı!</h2>
                <p class="sinav-sonuc-skor">${dogruSayisi} / ${siraliSorular.length} doğru (%${yuzde})</p>
                <p class="sinav-sonuc-derece">Başarı Derecen: <strong>${derece}</strong></p>
                <button type="button" class="btn-kaydet-ana" onclick="location.reload()">Yeni Sınav Başlat</button>
            </div>
            <div class="sinav-sonuc-ozet">${ozetSatirlari}</div>
        `;
    }
});