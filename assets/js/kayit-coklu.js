// ==========================================================================
// KAYIT-COKLU.JS - TÜM SAYFALARIN ORTAK JSONBİN MOTORU (DİNAMİK TABLO SİSTEMİ)
// ==========================================================================

const MASTER_KEY = '$2a$10$hoEcTWYG61JDdqk2la71Veddbtk73v/joKCtYExbBKqnXE9Ss.NtS';
const API_URL = `https://api.jsonbin.io/v3/b/${window.PAGE_BIN_ID}`;
const CURRENT_PAGE = window.CURRENT_PAGE;

const urlParams = new URLSearchParams(window.location.search);
const editId = urlParams.get('duzenle') || '';
const silId = urlParams.get('sil');
const mod = editId ? 'duzenle' : 'liste';

// 1. POPUP (MODAL) AÇMA KAPAMA
function yeniBaglamAc() {
    const modal = document.getElementById('yeniBaglamModal');
    if (modal) modal.classList.add('active');
}
function baglamKapat() {
    const modal = document.getElementById('yeniBaglamModal');
    if (modal) modal.classList.remove('active');
}

// 2. HTML YÜKLEME FONKSİYONU
async function htmlYukle(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} bulunamadı (404)`);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
        
        if (elementId === 'modal-yeri' && window.ALAN_TANIMLARI) {
            const sayfaAlanlari = window.ALAN_TANIMLARI[CURRENT_PAGE] || { once: [], sonra: [] };
            let onceHtml = '';
            sayfaAlanlari.once.forEach(a => onceHtml += window.popupAlanRenderla(a));
            document.getElementById('popup-ozel-alanlar-once').innerHTML = onceHtml;

            let sonraHtml = '';
            sayfaAlanlari.sonra.forEach(a => sonraHtml += window.popupAlanRenderla(a));
            document.getElementById('popup-ozel-alanlar-sonra').innerHTML = sonraHtml;
        }
    } catch (error) {
        console.error(error);
        document.getElementById(elementId).innerHTML = `<div style="color:red; padding:10px;">Hata: ${url} yüklenemedi.</div>`;
    }
}

// 3. SAYFA AÇILIŞ MANTIĞI
document.addEventListener("DOMContentLoaded", async () => {
    await htmlYukle('includes/sidebar.html', 'sidebar-yeri'); 
    await htmlYukle('includes/toolbar.html', 'toolbar-yeri');
    await htmlYukle('includes/modal.html', 'modal-yeri');

    // Eğer bu sayfa soru sayfasıysa, Soru Elemanları menüsünü görünür yap
    if (CURRENT_PAGE === 'soru') {
        const soruGrubu = document.getElementById('soru-elemani-grubu');
        if (soruGrubu) soruGrubu.style.display = '';
    }

    if (window.ALAN_TANIMLARI) {
        const sayfaAlanlari = window.ALAN_TANIMLARI[CURRENT_PAGE] || { once: [], sonra: [] };
        const metaCubugu = document.querySelector('.meta-cubugu');
        if (metaCubugu) {
            sayfaAlanlari.once.forEach(a => { metaCubugu.insertAdjacentHTML('afterbegin', window.metaAlanRenderla(a, {})); });
            sayfaAlanlari.sonra.forEach(a => { metaCubugu.insertAdjacentHTML('beforeend', window.metaAlanRenderla(a, {})); });
        }

        // DİNAMİK TABLO BAŞLIKLARI OLUŞTURMA
        const thead = document.getElementById('liste-basliklari');
        if(thead) {
            let theadHtml = '<tr style="text-align: left; border-bottom: 2px solid #ddd;">';
            sayfaAlanlari.once.forEach(a => {
                if (a.liste_baslik) theadHtml += `<th style="width:${a.liste_genislik || 'auto'}">${a.liste_baslik}</th>`;
            });
            theadHtml += `<th style="width:160px">Konu</th>`;
            theadHtml += `<th>Başlık</th>`;
            sayfaAlanlari.sonra.forEach(a => {
                if (a.liste_baslik) theadHtml += `<th style="width:${a.liste_genislik || 'auto'}">${a.liste_baslik}</th>`;
            });
            theadHtml += `<th style="width:120px" class="text-end">İşlemler</th>`;
            theadHtml += '</tr>';
            thead.innerHTML = theadHtml;
        }
    }

    if (mod === 'liste') {
        document.getElementById('liste-alani').style.display = 'block';
        document.getElementById('duzenleme-alani').style.display = 'none';
        document.getElementById('header-buttons').innerHTML = `
            <button type="button" class="btn-kaydet-ana" onclick="yeniBaglamAc()">
                <i class="fa-solid fa-plus"></i> Yeni Kayıt Ekle
            </button>`;
        
        if (silId) {
            try {
                const res = await fetch(API_URL + '/latest', { headers: { 'X-Master-Key': MASTER_KEY } });
                let data = await res.json();
                let veriler = data.record || [];
                const yeniListe = veriler.filter(v => v.id !== silId);
                await fetch(API_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY }, body: JSON.stringify(yeniListe) });
                alert('Kayıt başarıyla silindi!');
            } catch(e) { alert('Silme hatası: ' + e.message); }
            window.location.href = CURRENT_PAGE + '.html';
        } else {
            verileriYukle();
        }
    } else {
        document.getElementById('liste-alani').style.display = 'none';
        document.getElementById('duzenleme-alani').style.display = 'block';
        document.getElementById('header-buttons').innerHTML = `
            <a href="${CURRENT_PAGE}.html" class="btn-onizleme"><i class="fa-solid fa-list"></i> Listeye Dön</a>`;
        duzenlemeVerisiYukle(editId);
    }

    document.getElementById('btn-save-page').addEventListener('click', kaydetVeyaGuncelle);
});

// 4. POPUP TAMAM'A BASILINCA YENİ KAYIT OLUŞTURMA
async function popupTamam() {
    const baslik = document.getElementById('popup-baslik').value;
    const konu = document.getElementById('popup-konu').value;
    if(!baslik || !konu) { alert('Lütfen başlık ve konu girin.'); return; }

    const yeniId = CURRENT_PAGE + '_' + Date.now();
    const meta = { baslik, konu };

    if (window.ALAN_TANIMLARI) {
        const sayfaAlanlari = window.ALAN_TANIMLARI[CURRENT_PAGE] || { once: [], sonra: [] };
        [...sayfaAlanlari.once, ...sayfaAlanlari.sonra].forEach(alan => {
            const el = document.getElementById('popup-' + alan.key);
            if(el) meta[alan.key] = el.value;
        });
    }

    const yeniKayit = { id: yeniId, meta: meta, page: [{ type: 'paragraf', content: { html: '<h2>Başlığınızı buraya yazın</h2><p>İçeriğe başlamak için tıklayın...</p>' } }] };

    try {
        const res = await fetch(API_URL + '/latest', { headers: { 'X-Master-Key': MASTER_KEY } });
        const data = await res.json();
        let veriler = data.record || [];
        veriler.push(yeniKayit);
        await fetch(API_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY }, body: JSON.stringify(veriler) });
        baglamKapat();
        window.location.href = CURRENT_PAGE + '.html?duzenle=' + yeniId;
    } catch(e) { alert('Kayıt eklenirken hata: ' + e.message); }
}

// 5. LİSTELEME FONKSİYONU (DİNAMİK TABLO SATIRLARI)
async function verileriYukle() {
    try {
        const response = await fetch(API_URL + '/latest', { headers: { 'X-Master-Key': MASTER_KEY } });
        if (!response.ok) throw new Error('JSONBin verisi okunamadı!');
        const data = await response.json();
        const veriler = data.record || [];

        const tabloGovdesi = document.getElementById('veri-tablosu-govdesi');
        tabloGovdesi.innerHTML = '';

        if (veriler.length === 0) {
            tabloGovdesi.innerHTML = `<tr><td colspan="100" class="liste-bos"><i class="fa-solid fa-folder-open"></i><br>Henüz bir kayıt eklenmemiş.</td></tr>`;
            return;
        }

        const tersVeriler = veriler.reverse();
        const sayfaAlanlari = window.ALAN_TANIMLARI[CURRENT_PAGE] || { once: [], sonra: [] };

        tersVeriler.forEach(item => {
            const m = item.meta || {};
            let rowHtml = '';
            
            sayfaAlanlari.once.forEach(a => {
                if (a.liste_baslik) rowHtml += renderListCell(a, m);
            });
            
            rowHtml += `<td><span class="konu-badge">${escapeHtml(m.konu || 'Genel')}</span></td>`;
            rowHtml += `<td class="baslik-hucre">${escapeHtml(m.baslik || 'Başlıksız')}</td>`;
            
            sayfaAlanlari.sonra.forEach(a => {
                if (a.liste_baslik) rowHtml += renderListCell(a, m);
            });
            
            rowHtml += `<td class="text-end">
                <a href="${CURRENT_PAGE}.html?duzenle=${item.id}" class="islem-btn" title="Düzenle"><i class="fa-solid fa-pen"></i></a>
                <a href="${CURRENT_PAGE}.html?sil=${item.id}" class="islem-btn islem-btn-sil" title="Sil"><i class="fa-solid fa-trash"></i></a>
            </td>`;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            tr.innerHTML = rowHtml;
            tabloGovdesi.appendChild(tr);
        });
    } catch (hata) {
        console.error('Hata:', hata);
        document.getElementById('veri-tablosu-govdesi').innerHTML = `<tr><td colspan="100" class="liste-bos" style="color: red;"><i class="fa-solid fa-triangle-exclamation"></i><br>${hata.message}</td></tr>`;
    }
}

// DİNAMİK HÜCRE OLUŞTURUCU (PHP'deki listeHucresiBas fonksiyonu)
function renderListCell(alan, m) {
    let deger = m[alan.key] || '-';
    let stil = alan.liste_stil || 'normal';
    
    if (stil === 'kapak') {
        if (deger && deger !== '-') {
            return `<td><img src="../${deger}" class="liste-kapak-thumb" alt="" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"><div class="liste-kapak-bos" style="display:none;"><i class="fa-solid fa-image"></i></div></td>`;
        } else {
            return `<td><div class="liste-kapak-bos"><i class="fa-solid fa-image"></i></div></td>`;
        }
    } else if (stil === 'kalin') {
        return `<td><strong>${escapeHtml(deger)}</strong></td>`;
    } else {
        return `<td>${escapeHtml(deger)}</td>`;
    }
}

// 6. DÜZENLEME VERİSİ YÜKLEME
async function duzenlemeVerisiYukle(id) {
    if (id === 'new') {
        document.getElementById('edit_id').value = '';
        window.EDITOR_DATA = [{type: 'paragraf', content: {html: '<h2>Başlığınızı buraya yazın</h2><p>İçeriğe başlamak için tıklayın...</p>'}}];
        if (typeof window.renderEditor === 'function') window.renderEditor();
        return;
    }

    try {
        const response = await fetch(API_URL + '/latest', { headers: { 'X-Master-Key': MASTER_KEY } });
        const data = await response.json();
        const veriler = data.record || [];
        
        const item = veriler.find(v => v.id === id);
        if (item) {
            const m = item.meta || {};
            document.getElementById('edit_id').value = item.id;
            document.getElementById('meta_konu').value = m.konu || '';
            document.getElementById('meta_baslik').value = m.baslik || '';

            if (window.ALAN_TANIMLARI) {
                const sayfaAlanlari = window.ALAN_TANIMLARI[CURRENT_PAGE] || { once: [], sonra: [] };
                [...sayfaAlanlari.once, ...sayfaAlanlari.sonra].forEach(alan => {
                    const el = document.getElementById('meta_' + alan.key);
                    if(el) el.value = m[alan.key] || '';
                });
            }

            let sayfaVerisi = item.page || [];
            if (sayfaVerisi.length > 0 && typeof sayfaVerisi === 'string') {
                sayfaVerisi = [{type: 'paragraf', content: {html: sayfaVerisi}}];
            }
            window.EDITOR_DATA = sayfaVerisi;
            if (typeof window.renderEditor === 'function') window.renderEditor();
        } else {
            alert('Kayıt bulunamadı!');
            window.location.href = CURRENT_PAGE + '.html';
        }
    } catch (hata) {
        console.error('Düzenleme verisi yükleme hatası:', hata);
    }
}

// 7. KAYDET VE GÜNCELLE
async function kaydetVeyaGuncelle() {
    const id = document.getElementById('edit_id').value || CURRENT_PAGE + '_' + Date.now();
    const meta = {
        konu: document.getElementById('meta_konu').value,
        baslik: document.getElementById('meta_baslik').value
    };

    if (window.ALAN_TANIMLARI) {
        const sayfaAlanlari = window.ALAN_TANIMLARI[CURRENT_PAGE] || { once: [], sonra: [] };
        [...sayfaAlanlari.once, ...sayfaAlanlari.sonra].forEach(alan => {
            const el = document.getElementById('meta_' + alan.key);
            if(el) meta[alan.key] = el.value;
        });
    }
    
    let pageData = [{type: 'paragraf', content: {html: document.getElementById('word-canvas').innerHTML}}];
    if (typeof window.getEditorData === 'function') {
        pageData = window.getEditorData();
    }

    const yeniKayit = { id, meta, page: pageData };

    try {
        const res = await fetch(API_URL + '/latest', { headers: { 'X-Master-Key': MASTER_KEY } });
        const data = await res.json();
        let veriler = data.record || [];

        const index = veriler.findIndex(v => v.id === id);
        if (index > -1) { veriler[index] = yeniKayit; } else { veriler.push(yeniKayit); }

        await fetch(API_URL, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY }, body: JSON.stringify(veriler) });
        alert('Veri başarıyla kaydedildi!');
        window.location.href = CURRENT_PAGE + '.html';
    } catch (hata) {
        alert('Kaydetme hatası: ' + hata.message);
    }
}

function escapeHtml(text) {
    if(text === null || typeof text === 'undefined') return '';
    const map = {'&': '&amp;','<': '&lt;','>': '&gt;','"': '&quot;',"'": '&#039;'};
    return String(text).replace(/[&<>"']/g, function(m) { return map[m]; });
}