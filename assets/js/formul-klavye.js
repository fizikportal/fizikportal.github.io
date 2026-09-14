// ==========================================================================
// formul-klavye.js — GÖRSEL FORMÜL KURUCU (LaTeX bilmeden formül yaz)
// --------------------------------------------------------------------------
// LaTeX yalnızca KAYIT/BİÇİM dili olarak kalır; sen hiç yazmazsın:
//   • Harf, rakam, = + - , boşluk → klavyeden normal yazılır
//   • Semboller (· × ÷ ± π Δ √ → ° ...) → tek tıkla eklenir
//   • Yapılar (kesir, üs, alt, kök, vektör, parantez, metin) → mini form
//     doldurursun, LaTeX'i o üretir
// Kurulum: <textarea data-formul-klavye> olan HER yere otomatik kurulur
// (formul.php modalı + editor-fizik.js formül modalı). Önizleme,
// textarea'nın kendi 'input' olayıyla tazeleniyorsa aynen çalışır.
// ==========================================================================
(function () {
'use strict';

const SEMBOLLER = [
    ['\\cdot', '·'], ['\\times', '×'], ['\\div', '÷'], ['\\pm', '±'],
    ['\\approx', '≈'], ['\\neq', '≠'], ['\\leq', '≤'], ['\\geq', '≥'],
    ['\\infty', '∞'], ['\\propto', '∝'], ['\\rightarrow', '→'], ['\\Rightarrow', '⇒'],
    ['\\pi', 'π'], ['\\Delta', 'Δ'], ['\\theta', 'θ'], ['\\lambda', 'λ'],
    ['\\mu', 'μ'], ['\\Omega', 'Ω'], ['\\alpha', 'α'], ['\\beta', 'β'],
    ['\\gamma', 'γ'], ['\\Sigma', 'Σ'], ['\\int', '∫'], ['^\\circ', '°']
];
const YAPILAR = [
    { ad: 'Kesir a/b',  alanlar: ['Üst', 'Alt'],   yap: function (g) { return '\\dfrac{' + g[0] + '}{' + g[1] + '}'; } },
    { ad: 'Üs (x²)',    alanlar: ['Taban', 'Üs'],  yap: function (g) { return g[0] + '^{' + g[1] + '}'; } },
    { ad: 'Alt (xₙ)',   alanlar: ['Taban', 'Alt'], yap: function (g) { return g[0] + '_{' + g[1] + '}'; } },
    { ad: 'Kök √',      alanlar: ['Kök içi'],      yap: function (g) { return '\\sqrt{' + g[0] + '}'; } },
    { ad: 'Vektör F⃗',  alanlar: ['Sembol'],       yap: function (g) { return '\\vec{' + g[0] + '}'; } },
    { ad: '( )',        alanlar: ['İç'],           yap: function (g) { return '\\left(' + g[0] + '\\right)'; } },
    { ad: 'Metin/birim', alanlar: ['Yazı'],        yap: function (g) { return '\\text{' + g[0] + '}'; } }
];

const STIL =
'.fk-panel{background:rgba(255,255,255,.04);border:1px solid var(--glass-border,rgba(255,255,255,.14));border-radius:10px;padding:8px 10px;margin:0 0 8px;}' +
'.fk-grup-etiket{font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text-soft,#8a8aa3);margin:2px 0 4px;}' +
'.fk-satir{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px;}' +
'.fk-panel button{min-width:30px;height:28px;padding:0 8px;border:1px solid var(--glass-border,rgba(255,255,255,.14));background:var(--bg-deep,#1a1420);color:var(--text-primary,#eee);border-radius:6px;cursor:pointer;font-size:13px;}' +
'.fk-panel button:hover{border-color:var(--accent-lime,#6c5ce7);color:var(--accent-lime,#6c5ce7);}' +
'.fk-yapi{font-size:12px;}' +
'.fk-mini{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:6px;border-top:1px dashed var(--glass-border,rgba(255,255,255,.14));}' +
'.fk-mini-ad{font-size:12px;font-weight:700;color:var(--accent-gold,#f0b429);}' +
'.fk-mini input{width:90px;padding:6px 8px;background:var(--bg-deep,#1a1420);border:1px solid var(--glass-border,rgba(255,255,255,.14));border-radius:6px;color:var(--text-primary,#eee);font-size:13px;outline:none;}' +
'.fk-mini-ekle{background:var(--accent-lime,#6c5ce7);border-color:var(--accent-lime,#6c5ce7);color:#10221b;font-weight:700;}' +
'.fk-mini-vazgec{min-width:26px;}';

let stilEklendi = false;
function stilEkle() {
    if (stilEklendi) return;
    stilEklendi = true;
    const s = document.createElement('style');
    s.textContent = STIL;
    document.head.appendChild(s);
}

function yerlestir(ta, metin) {
    const s = ta.selectionStart || 0;
    const e = ta.selectionEnd || 0;
    ta.value = ta.value.slice(0, s) + metin + ta.value.slice(e);
    const pos = s + metin.length;
    ta.focus();
    ta.setSelectionRange(pos, pos);
    ta.dispatchEvent(new Event('input', { bubbles: true }));   // önizleme tazelenir
}

function miniForm(panel, ta, yapi) {
    const eski = panel.querySelector('.fk-mini');
    if (eski) eski.remove();
    const kutu = document.createElement('div');
    kutu.className = 'fk-mini';
    kutu.innerHTML = '<span class="fk-mini-ad">' + yapi.ad + '</span>' +
        yapi.alanlar.map(function (a, i) {
            return '<input type="text" data-i="' + i + '" placeholder="' + a + '">';
        }).join('') +
        '<button type="button" class="fk-mini-ekle">Ekle</button>' +
        '<button type="button" class="fk-mini-vazgec">×</button>';
    panel.appendChild(kutu);
    const ilk = kutu.querySelector('input');
    if (ilk) ilk.focus();
    kutu.querySelector('.fk-mini-ekle').addEventListener('click', function () {
        const g = Array.from(kutu.querySelectorAll('input')).map(function (i) { return i.value.trim(); });
        yerlestir(ta, yapi.yap(g));
        kutu.remove();
    });
    kutu.querySelector('.fk-mini-vazgec').addEventListener('click', function () { kutu.remove(); ta.focus(); });
    kutu.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter')  { ev.preventDefault(); kutu.querySelector('.fk-mini-ekle').click(); }
        if (ev.key === 'Escape') { kutu.remove(); ta.focus(); }
    });
}

function bagla(ta) {
    if (ta.dataset.fkBagli) return;
    if (ta.offsetWidth === 0 && ta.offsetHeight === 0) return;  // gizli alana kurulma
    ta.dataset.fkBagli = '1';
    stilEkle();
    const panel = document.createElement('div');
    panel.className = 'fk-panel';
    let html = '<div class="fk-grup-etiket">Semboller — tek tık</div><div class="fk-satir">';
    SEMBOLLER.forEach(function (c) {
        html += '<button type="button" data-latex="' + c[0] + '" title="' + c[0] + '">' + c[1] + '</button>';
    });
    html += '</div><div class="fk-grup-etiket">Yapılar — mini form doldur</div><div class="fk-satir">';
    YAPILAR.forEach(function (y, i) {
        html += '<button type="button" class="fk-yapi" data-yapi="' + i + '">' + y.ad + '</button>';
    });
    html += '</div>';
    panel.innerHTML = html;
    ta.parentNode.insertBefore(panel, ta);
    panel.addEventListener('click', function (e) {
        const sb = e.target.closest('button[data-latex]');
        if (sb) { yerlestir(ta, sb.dataset.latex); return; }
        const yb = e.target.closest('button[data-yapi]');
        if (yb) miniForm(panel, ta, YAPILAR[+yb.dataset.yapi]);
    });
}

function tara() {
    document.querySelectorAll('textarea[data-formul-klavye]').forEach(bagla);
}
window.formulKlavyeTara = tara;   // ← IIFE İÇİNDE, tara'dan hemen sonra
if (document.body) tara();
document.addEventListener('DOMContentLoaded', tara);
new MutationObserver(tara).observe(document.documentElement, { childList: true, subtree: true });
})();