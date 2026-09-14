// ==========================================================================
// editor-fizik.js — FİZİK MODÜLÜ (formül + simgeler)
// --------------------------------------------------------------------------
// A) MATHJAX TEMBEL YÜKLEYİCİ — ilk formül işleminde CDN'den çekilir;
//    sayfa açılışında editörde .ed-math varsa otomatik typeset edilir.
// B) FORMÜL  → data-action="formulEkle" · LaTeX modalı + canlı önizleme
//    + GÖRSEL KLAVYE: textarea'daki data-formul-klavye etiketi sayesinde
//    formul-klavye.js paneli modalın içine otomatik kurulur.
//    Kayıt sözleşmesi: <span class="ed-math" data-tex="…">\( … \)</span>
//    Çift tık → düzenle. Span atomiktir (contenteditable=false).
// C) SİMGE   → data-action="simgeMenu" / "vektorMenu"
//    Kategorili ızgara; menü açıkken peş peşe simge eklenebilir.
//    insertText ile gider → Geri Al zinciri BOZULMAZ.
// Bağımlılık: editor-core.js ve editor-ekle.js ÖNCE yüklenmelidir.
//   (edMesaj, edMenuKapat, edMenuDisTik, edMenuEsc, edAktifMenu → ekle'den)
// ==========================================================================
(function () {
    'use strict';
    if (typeof EDITOR_VAR === 'undefined' || !EDITOR_VAR) return;  // editörsüz sayfada pasif

    // --------------------------------------------------------------------------
    // A) MATHJAX — tembel yükleme + typeset yardımcısı
    // --------------------------------------------------------------------------
    let mjSoz = null;
    function mathJaxYukle() {
        if (window.MathJax && window.MathJax.typesetPromise) return Promise.resolve(window.MathJax);
        if (mjSoz) return mjSoz;
        window.MathJax = {
            tex: { inlineMath: [['\\(', '\\)']] },
            svg: { fontCache: 'global' },
            startup: { typeset: false }
        };
        mjSoz = new Promise(function (coz, reddet) {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
            s.async = true;
            s.onload = function () {
                const hazir = (window.MathJax.startup && window.MathJax.startup.promise)
                    ? window.MathJax.startup.promise : Promise.resolve();
                hazir.then(function () { coz(window.MathJax); });
            };
            s.onerror = function () { mjSoz = null; reddet(new Error('MathJax CDN')); };
            document.head.appendChild(s);
        });
        return mjSoz;
    }
    function mathJaxTurlendir(kok) {
        mathJaxYukle().then(function (mj) {
            if (mj.typesetClear) mj.typesetClear([kok]);
            return mj.typesetPromise([kok]);
        }).catch(function () {
            edMesaj('MathJax yüklenemedi — formül ham (LaTeX) görünür.');
        });
    }
    function formulSpanYap(latex) {
        const span = document.createElement('span');
        span.className = 'ed-math';
        span.dataset.tex = latex;
        span.title = 'Çift tıkla: formülü düzenle';
        span.setAttribute('contenteditable', 'false');
        span.textContent = '\\(' + latex + '\\)';
        return span;
    }

    // --------------------------------------------------------------------------
    // B) FORMÜL MODALI — textarea + görsel klavye + canlı önizleme
    // --------------------------------------------------------------------------
    function formulModaliAc(baslik, onayMetni, ilkTex, onOnay) {
        const arka = document.createElement('div');
        arka.className = 'ed-modal-arka';
        arka.innerHTML =
            '<div class="ed-modal ed-modal-formul">' +
            '<h3>' + baslik + '</h3>' +
            '<textarea class="ed-formul-girdi" data-formul-klavye rows="3" spellcheck="false" placeholder="Örn: F = m \\cdot a   veya   v = \\frac{\\Delta x}{\\Delta t}"></textarea>' +
            '<div class="ed-formul-onizleme"><span class="ed-formul-onizleme-ic">…</span></div>' +
            '<div class="ed-formul-ipucu">Düz kısımları yaz (harf, rakam, = + -); sembol ve yapıları klavyeden tıkla.</div>' +
            '<div class="ed-modal-butonlar">' +
            '<button type="button" class="ed-modal-btn vazgec">Vazgeç</button>' +
            '<button type="button" class="ed-modal-btn ana onay">' + onayMetni + '</button>' +
            '</div>' +
            '</div>';
        document.body.appendChild(arka);
        const girdi    = arka.querySelector('.ed-formul-girdi');
        const onizKutu = arka.querySelector('.ed-formul-onizleme');
        const oniz     = arka.querySelector('.ed-formul-onizleme-ic');
        girdi.value = ilkTex || '';

        function kapat() { arka.remove(); document.removeEventListener('keydown', esc, true); }
        function esc(e)  { if (e.key === 'Escape') kapat(); }
        document.addEventListener('keydown', esc, true);
        arka.addEventListener('mousedown', function (e) { if (e.target === arka) kapat(); });
        arka.querySelector('.vazgec').addEventListener('click', kapat);

        let gecikme = null;
        function onizlemeTazele() {
            const tex = girdi.value.trim();
            oniz.textContent = tex ? '\\(' + tex + '\\)' : '…';
            mathJaxYukle().then(function (mj) {
                if (mj.typesetClear) mj.typesetClear([onizKutu]);
                return mj.typesetPromise([onizKutu]);
            }).catch(function () {});
        }
        girdi.addEventListener('input', function () {
            clearTimeout(gecikme);
            gecikme = setTimeout(onizlemeTazele, 350);
        });
        girdi.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) arka.querySelector('.onay').click();
        });
        arka.querySelector('.onay').addEventListener('click', function () {
            const tex = girdi.value.trim();
            if (!tex) { girdi.focus(); return; }
            kapat();
            onOnay(tex);
        });
        setTimeout(function () { girdi.focus(); onizlemeTazele(); }, 0);
    }

    edKaydetIsleyici('formulEkle', function () {
        editorArea.focus();
        secimiGeriYukle();
        formulModaliAc('Formül Ekle', 'Ekle', '', function (tex) {
            const span = formulSpanYap(tex);
            araligaEkle(span);          // core: kayıtlı imleç konumuna ekler
            mathJaxTurlendir(span);
            edMesaj('Formül eklendi.');
        });
    });

    // B2) FORMÜL DÜZENLE — çift tık
    editorArea.addEventListener('dblclick', function (e) {
        const hedef = e.target.closest ? e.target.closest('.ed-math') : null;
        if (!hedef) return;
        formulModaliAc('Formülü Düzenle', 'Güncelle', hedef.dataset.tex || '', function (tex) {
            const yeni = formulSpanYap(tex);
            hedef.replaceWith(yeni);
            mathJaxTurlendir(yeni);
            secimiKaydet();
        });
    });

    // --------------------------------------------------------------------------
    // C) SİMGE IZGARALARI — ed-menu içinde kategori kategori düğmeler
    // --------------------------------------------------------------------------
    const ED_SIMGELER = {
        'Yunan':     ['α','β','γ','δ','ε','ζ','η','θ','ι','κ','λ','μ','ν','ξ','π','ρ','σ','τ','υ','φ','χ','ψ','ω','Γ','Δ','Θ','Λ','Ξ','Π','Σ','Φ','Ψ','Ω'],
        'İşleç':     ['±','×','·','÷','≠','≈','≅','≤','≥','∝','∼','≪','≫','∞','∂','∇'],
        'Matematik': ['√','∛','∫','∮','∑','∏','½','⅓','¼','¾'],
        'Birim':     ['°','′','″','Å','Ω','℃','µ','ℓ']
    };
    const ED_VEKTORLER = {
        'Ok / Vektör': ['→','←','↑','↓','⇄','⇌','↗','↘','⟂','∥','⊙','⊗','◌⃗']
    };
    function edSimgeIzgaraAc(btn, sozluk) {
        if (edAktifMenu) { edMenuKapat(); return; }
        const menu = document.createElement('div');
        menu.className = 'ed-menu ed-simge-menu';
        Object.keys(sozluk).forEach(function (baslik) {
            const et = document.createElement('div');
            et.className = 'ed-menu-etiket';
            et.textContent = baslik;
            menu.appendChild(et);
            const izgara = document.createElement('div');
            izgara.className = 'ed-simge-izgara';
            sozluk[baslik].forEach(function (s) {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'ed-simge-btn';
                b.textContent = s;
                b.title = (s === '◌⃗') ? 'Üstüne ok: önce harfi yaz, sonra buna tıkla' : s;
                b.addEventListener('click', function () {
                    calistirKomut('insertText', (s === '◌⃗') ? '\u20D7' : s);
                });
                izgara.appendChild(b);
            });
            menu.appendChild(izgara);
        });
        document.body.appendChild(menu);
        // Konum: edMenuAc ile aynı mantık (altta taşarsa ÜSTÜNE aç)
        const r = btn.getBoundingClientRect();
        let sol = r.left;
        if (sol + menu.offsetWidth > window.innerWidth - 8) sol = window.innerWidth - 8 - menu.offsetWidth;
        menu.style.left = sol + 'px';
        menu.style.top = ((r.bottom + 6 + menu.offsetHeight > window.innerHeight - 8)
            ? Math.max(8, r.top - menu.offsetHeight - 6)
            : (r.bottom + 6)) + 'px';
        edAktifMenu = menu;
        setTimeout(function () {
            document.addEventListener('mousedown', edMenuDisTik, true);
            document.addEventListener('keydown', edMenuEsc, true);
            window.addEventListener('scroll', edMenuKapat, true);
            window.addEventListener('resize', edMenuKapat);
        }, 0);
    }
    edKaydetIsleyici('simgeMenu',  function (btn) { edSimgeIzgaraAc(btn, ED_SIMGELER); });
    edKaydetIsleyici('vektorMenu', function (btn) { edSimgeIzgaraAc(btn, ED_VEKTORLER); });

    // --------------------------------------------------------------------------
    // D) AÇILIŞTA MEVCUT FORMÜLLERİ RENDER ET (kayıt düzenleme modu)
    // --------------------------------------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        if (editorArea.querySelector('.ed-math')) mathJaxTurlendir(editorArea);
    });
})();