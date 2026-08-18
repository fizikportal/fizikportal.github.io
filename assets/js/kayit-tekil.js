// ==========================================================================
// KAYIT-TEKIL.JS - TEKİL SAYFALARIN ORTAK JSONBİN MOTORU
// (soru_ilk, egitim vb. sayfalar için)
// ==========================================================================

const MASTER_KEY = '$2a$10$hoEcTWYG61JDdqk2la71Veddbtk73v/joKCtYExbBKqnXE9Ss.NtS';
const API_URL = `https://api.jsonbin.io/v3/b/${window.PAGE_BIN_ID}`;
const CURRENT_PAGE = window.CURRENT_PAGE;

async function htmlYukle(url, elementId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} bulunamadı (404)`);
        const html = await response.text();
        document.getElementById(elementId).innerHTML = html;
    } catch (error) {
        console.error(error);
        document.getElementById(elementId).innerHTML = `<div style="color:red; padding:10px;">Hata: ${url} yüklenemedi.</div>`;
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await htmlYukle('includes/sidebar.html', 'sidebar-yeri'); 
    await htmlYukle('includes/toolbar.html', 'toolbar-yeri');

    // Eğer bu sayfa soru_ilk ise Soru Elemanları menüsünü göster
    if (CURRENT_PAGE === 'soru_ilk' || CURRENT_PAGE === 'soru') {
        const soruGrubu = document.getElementById('soru-elemani-grubu');
        if (soruGrubu) soruGrubu.style.display = '';
    }

    const canvas = document.getElementById('word-canvas');
    const saveBtn = document.getElementById('btn-save-page');
    const previewBtn = document.getElementById('btn-preview');
    const sonGuncellemeSpan = document.getElementById('son-guncelleme-yazi');

    if (!canvas) return;

    // --- HTML'İ BLOK JSON YAPISINA ÇEVİREN FONKSİYON (Sizin yazdığınız) ---
    function getBlockData(rootElement) {
        const blocks = [];
        const nodes = Array.from(rootElement.childNodes);
        
        nodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() === '') return;
            const block = { uid: 'block_' + Date.now() + '_' + Math.floor(Math.random() * 10000) };
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (['H1', 'H2', 'H3'].includes(node.tagName)) {
                    block.type = 'baslik';
                    block.content = { tag: node.tagName.toLowerCase(), text: node.innerText };
                } 
                else if (node.classList.contains('editor-row')) {
                    block.type = 'sutunlu_yazi';
                    const cols = node.querySelectorAll(':scope > .editor-col');
                    block.content = { layout_type: String(cols.length) };
                    cols.forEach((col, index) => {
                        const i = index + 1;
                        const img = col.querySelector('img');
                        const text = col.querySelector('.col-text-content');
                        if (img) {
                            block.content[`cell_${i}_type`] = 'image';
                            block.content[`image_path_block_${block.uid}_${i}`] = img.getAttribute('src');
                            block.content[`text_block_${block.uid}_${i}`] = "";
                        } else if (text) {
                            block.content[`cell_${i}_type`] = 'text';
                            block.content[`text_block_${block.uid}_${i}`] = text.innerHTML;
                            block.content[`image_path_block_${block.uid}_${i}`] = "";
                        }
                    });
                }
                else if (node.tagName === 'TABLE') {
                    block.type = 'tablo';
                    node.querySelectorAll('*').forEach(el => {
                        let tAlign = el.style.textAlign;
                        let vAlign = el.style.verticalAlign;
                        el.removeAttribute('style');
                        if (tAlign) el.style.textAlign = tAlign;
                        if (vAlign) el.style.verticalAlign = vAlign;
                    });
                    block.content = { html: node.outerHTML };
                }
                else {
                    block.type = 'paragraf';
                    node.querySelectorAll('*').forEach(el => {
                        if (el.tagName !== 'IMG') {
                            let tAlign = el.style.textAlign;
                            el.removeAttribute('style');
                            if (tAlign) el.style.textAlign = tAlign;
                        }
                    });
                    block.content = { html: node.outerHTML };
                }
            } else if (node.nodeType === Node.TEXT_NODE) {
                block.type = 'paragraf';
                block.content = { html: `<p>${node.textContent}</p>` };
            }
            if (block.type) blocks.push(block);
        });
        return { page: blocks };
    }

    // --- JSONBİN'DEN VERİYİ YÜKLEME ---
    try {
        const res = await fetch(API_URL + '/latest', { headers: { 'X-Master-Key': MASTER_KEY } });
        if (!res.ok) throw new Error('Veri okunamadı');
        const data = await res.json();
        const veri = data.record || {};

        if (veri.son_guncelleme && sonGuncellemeSpan) {
            sonGuncellemeSpan.textContent = 'Son güncelleme: ' + veri.son_guncelleme;
            sonGuncellemeSpan.style.display = 'block';
        }

        let editorData = [];
        if (veri.page && Array.isArray(veri.page)) {
            editorData = veri.page;
        } else if (veri.icerik) { // Eski HTML string sistemi uyumu
            editorData = [{type: 'paragraf', content: {html: veri.icerik}}];
        }

        if (editorData.length === 0) {
            editorData = [{type: 'paragraf', content: {html: '<h2>Başlığınızı buraya yazın</h2><p>İçeriğe başlamak için tıklayın...</p>'}}];
        }

        window.EDITOR_DATA = editorData;
        if (typeof window.renderEditor === 'function') window.renderEditor();

    } catch (hata) {
        console.error('Veri yükleme hatası:', hata);
    }

    // --- KAYDET (JSONBİN'E PUT) ---
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            saveBtn.disabled = true;
            const eskiYazi = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i> Kaydediliyor...';

            const blockData = getBlockData(canvas);
            const simdi = new Date().toLocaleString('tr-TR');
            const kayitVerisi = {
                son_guncelleme: simdi,
                page: blockData.page
            };

            try {
                await fetch(API_URL, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-Master-Key': MASTER_KEY },
                    body: JSON.stringify(kayitVerisi)
                });

                if (sonGuncellemeSpan) {
                    sonGuncellemeSpan.textContent = 'Son güncelleme: ' + simdi;
                    sonGuncellemeSpan.style.display = 'block';
                }

                saveBtn.innerHTML = '<i class="fa-solid fa-check me-2"></i> Kaydedildi!';
                setTimeout(() => {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = eskiYazi;
                }, 1800);
            } catch(err) {
                alert('Kaydetme hatası: ' + err.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = eskiYazi;
            }
        });
    }

    // --- ÖNGÖRÜNÜM (Sizin yazdığınız) ---
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const pencere = window.open('', '_blank');
            pencere.document.write(`
                <!DOCTYPE html><html lang="tr"><head><meta charset="UTF-8"><title>Öngörünüm</title>
                <style>
                    body { background:#f3f4f6; margin:0; padding:40px 20px; font-family:'Segoe UI',Tahoma,Verdana,sans-serif; }
                    .paper { max-width: 900px; margin: 0 auto; background:#fff; padding:40px; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.08); color:#202124; line-height:1.6; }
                    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    .editor-row { display: flex; gap: 16px; margin: 16px 0; }
                    .editor-col { flex: 1; min-height: 120px; padding: 10px; border: 1px dashed #ccc; border-radius: 6px; background-color: #fafafa; }
                    .col-img-container img, .single-img-container img { max-width: 100%; height: auto; border-radius: 4px; }
                    .img-caption { display: block; font-size: 12px; color: #666; margin-top: 6px; text-align: center; font-style: italic; }
                </style></head><body><div class="paper">${canvas.innerHTML}</div></body></html>
            `);
            pencere.document.close();
        });
    }
});