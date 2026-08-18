document.addEventListener('DOMContentLoaded', () => {
    const tumSorular = window.SORU_KAYITLARI || [];

    const introEl    = document.getElementById('soru-intro');
    const seciciEl   = document.getElementById('soru-secici');
    const quizEl     = document.getElementById('soru-quiz-alani');
    const sinifEl    = document.getElementById('secim-sinif');
    const konuEl     = document.getElementById('secim-konu');
    const baslaBtn   = document.getElementById('quiz-basla-btn');

    if (!quizEl || !baslaBtn) return;

    let siraliSorular = [];
    let mevcutIndex = 0;
    let dogruSayisi = 0;
    let cevaplandiMi = false;

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
    }

    function blokToHtml(block) {
        const tip = block.type;
        const icerik = block.content || {};

        if (tip === 'baslik') {
            const tag = ['h1', 'h2', 'h3'].includes(icerik.tag) ? icerik.tag : 'h2';
            return `<${tag}>${escapeHtml(icerik.text || '')}</${tag}>`;
        }
        if (tip === 'paragraf') {
            return icerik.html || '';
        }
        if (tip === 'tablo') {
            return '<div class="site-table-wrapper">' + (icerik.html || '') + '</div>';
        }
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

    function sorubloklariniAyikla(bloklar) {
        const sonuc = { govdeHtml: '', secenekler: [], ipucuHtml: '', cozumHtml: '' };

        (bloklar || []).forEach(block => {
            const html = blokToHtml(block);

            if (html.includes('question-options-grid')) {
                const gecici = document.createElement('div');
                gecici.innerHTML = html;

                // Şıkları çekiyoruz
                gecici.querySelectorAll('.option-box').forEach(box => {
                    const harf = (box.querySelector('.option-prefix')?.textContent || '').replace(')', '').trim();
                    const metin = box.querySelector('.option-text')?.innerHTML || '';
                    sonuc.secenekler.push({ harf, metin });
                });

                // DÜZELTME: Şıklar ızgarasını temizleyip kalan resim/metin içeriğini soru gövdesine ekliyoruz
                gecici.querySelectorAll('.question-options-grid').forEach(grid => grid.remove());
                sonuc.govdeHtml += gecici.innerHTML;

            } else if (html.includes('meta-hint')) {
                const gecici = document.createElement('div');
                gecici.innerHTML = html;
                sonuc.ipucuHtml = gecici.querySelector('.meta-content')?.innerHTML || '';
            } else if (html.includes('meta-solution')) {
                const gecici = document.createElement('div');
                gecici.innerHTML = html;
                sonuc.cozumHtml = gecici.querySelector('.meta-content')?.innerHTML || '';
            } else if (html.includes('meta-correct')) {
                // Kasıtlı olarak atlanıyor — doğru cevap meta.dogru'dan gelir.
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

    baslaBtn.addEventListener('click', () => {
        const sinif = sinifEl.value;
        const konu = konuEl.value;

        siraliSorular = tumSorular.filter(s => {
            const m = s.meta || {};
            const sinifUyar = !sinif || m.sinif === sinif;
            const konuUyar = !konu || m.konu === konu;
            return sinifUyar && konuUyar;
        });
        siraliSorular = karistir(siraliSorular);

        if (siraliSorular.length === 0) {
            alert('Bu kritere uygun soru bulunamadı.');
            return;
        }

        mevcutIndex = 0;
        dogruSayisi = 0;
        if (introEl) introEl.style.display = 'none';
        if (seciciEl) seciciEl.style.display = 'none';
        quizEl.style.display = 'block';
        document.getElementById('soru-layout-kapsayici')?.classList.add('quiz-aktif');
        soruyuGoster();
    });

    function soruyuGoster() {
        cevaplandiMi = false;
        const soru = siraliSorular[mevcutIndex];
        const ayrilmis = sorubloklariniAyikla(soru.page || []);

        document.getElementById('quiz-ilerleme').textContent = `Soru ${mevcutIndex + 1} / ${siraliSorular.length}`;
        document.getElementById('quiz-govde').innerHTML = ayrilmis.govdeHtml;

        const secenekAlani = document.getElementById('quiz-secenekler');
        secenekAlani.innerHTML = '';
        ayrilmis.secenekler.forEach(secenek => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'secenek-btn';
            btn.dataset.harf = secenek.harf;
            btn.innerHTML = `<span class="secenek-harf">${secenek.harf}</span><span class="secenek-metin">${secenek.metin}</span>`;
            btn.addEventListener('click', () => cevapVer(soru, secenek.harf, btn));
            secenekAlani.appendChild(btn);
        });

        const ipucuBtn = document.getElementById('ipucu-btn');
        const ipucuKutu = document.getElementById('ipucu-kutu');
        ipucuKutu.style.display = 'none';
        ipucuKutu.innerHTML = ayrilmis.ipucuHtml;
        ipucuBtn.style.display = ayrilmis.ipucuHtml ? 'inline-flex' : 'none';

        const cozumBtn = document.getElementById('cozum-btn');
        const cozumKutu = document.getElementById('cozum-kutu');
        cozumKutu.style.display = 'none';
        cozumKutu.innerHTML = ayrilmis.cozumHtml;
        cozumBtn.style.display = 'none';

        document.getElementById('quiz-sonraki-btn').style.display = 'none';
        document.getElementById('quiz-topluluk-istatistik').innerHTML = '';
    }

    function cevapVer(soru, secilenHarf, tiklananBtn) {
        if (cevaplandiMi) return;
        cevaplandiMi = true;

        const dogruHarf = (soru.meta && soru.meta.dogru) || '';
        const dogruMu = secilenHarf === dogruHarf;
        if (dogruMu) dogruSayisi++;

        document.querySelectorAll('.secenek-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.harf === dogruHarf) btn.classList.add('secenek-dogru');
            else if (btn === tiklananBtn) btn.classList.add('secenek-yanlis');
        });

        const cozumKutu = document.getElementById('cozum-kutu');
        if (cozumKutu.innerHTML.trim() !== '') {
            document.getElementById('cozum-btn').style.display = 'inline-flex';
        }
        document.getElementById('quiz-sonraki-btn').style.display = 'inline-flex';

        fetch('soru_istatistik_kaydet.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'soru_id=' + encodeURIComponent(soru.id) + '&sonuc=' + (dogruMu ? 'dogru' : 'yanlis')
        })
        .then(r => r.json())
        .then(veri => {
            if (veri.success && veri.toplam >= 5) {
                const oran = Math.round((veri.dogru / veri.toplam) * 100);
                document.getElementById('quiz-topluluk-istatistik').textContent =
                    `Bu soruyu ${veri.toplam} kişi çözdü, %${oran}'i doğru yaptı.`;
            }
        })
        .catch(() => { });
    }

    document.getElementById('ipucu-btn')?.addEventListener('click', () => {
        const kutu = document.getElementById('ipucu-kutu');
        kutu.style.display = (kutu.style.display === 'none') ? 'block' : 'none';
    });
    document.getElementById('cozum-btn')?.addEventListener('click', () => {
        const kutu = document.getElementById('cozum-kutu');
        kutu.style.display = (kutu.style.display === 'none') ? 'block' : 'none';
    });

    document.getElementById('quiz-sonraki-btn')?.addEventListener('click', () => {
        mevcutIndex++;
        if (mevcutIndex >= siraliSorular.length) {
            quizBitir();
        } else {
            soruyuGoster();
        }
    });

    function quizBitir() {
        const yuzde = Math.round((dogruSayisi / siraliSorular.length) * 100);
        quizEl.innerHTML = `
            <div class="quiz-sonuc">
                <i class="fa-solid fa-trophy"></i>
                <h2>Tamamladın!</h2>
                <p class="quiz-sonuc-skor">${dogruSayisi} / ${siraliSorular.length} doğru (%${yuzde})</p>
                <button type="button" class="btn-kaydet-ana" onclick="location.reload()">Tekrar Dene</button>
            </div>
        `;
    }
});