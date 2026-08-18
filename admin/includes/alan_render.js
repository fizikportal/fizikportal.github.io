// PHP'deki meta_alan_render.php ve modal.php içindeki popupAlanRenderla'nın
// JavaScript karşılığı. Verilen alan tanımına göre HTML üretir.

window.metaAlanRenderla = function(alan, meta) {
    const ad = 'meta_' + alan.key;
    const deger = (meta && meta[alan.key] !== undefined) ? meta[alan.key] : (alan.default || '');
    
    let html = `<div class="meta-alan">
        <label>${alan.label}</label>`;

    if (alan.type === 'select') {
        html += `<select id="${ad}" name="${ad}" class="meta-input">`;
        alan.options.forEach(opt => {
            const selected = (opt === deger) ? 'selected' : '';
            html += `<option value="${opt}" ${selected}>${opt}</option>`;
        });
        html += `</select>`;
    } 
    else if (alan.type === 'text') {
        const placeholder = alan.placeholder || '';
        html += `<input type="text" id="${ad}" name="${ad}" class="meta-input" value="${deger}" placeholder="${placeholder}">`;
    } 
    else if (alan.type === 'kapak') {
        const imgSrc = deger ? '../' + deger : '';
        const imgDisplay = deger ? '' : 'display:none;';
        const textDisplay = deger ? 'display:none;' : '';
        
        html += `<input type="hidden" id="${ad}" name="${ad}" value="${deger}">
                 <button type="button" class="kapak-sec-btn" id="kapakSecBtn_${alan.key}" onclick="kapakSec('${ad}', 'kapakOnizleme_${alan.key}', 'kapakSecMetni_${alan.key}')">
                     <img id="kapakOnizleme_${alan.key}" src="${imgSrc}" style="${imgDisplay}" alt="">
                     <span id="kapakSecMetni_${alan.key}" style="${textDisplay}">
                         <i class="fa-solid fa-image"></i> Galeri
                     </span>
                 </button>`;
    }

    html += `</div>`;
    return html;
};

// Popup (Yeni Kayıt) için slight farklılık gösteren versiyonu
window.popupAlanRenderla = function(alan) {
    const inputId = 'popup-' + alan.key;
    let html = `<div class="popup-alan">
        <label>${alan.label}</label>`;

    if (alan.type === 'select') {
        html += `<select class="popup-select" id="${inputId}">`;
        alan.options.forEach(opt => {
            const selected = (opt === (alan.default || '')) ? 'selected' : '';
            html += `<option value="${opt}" ${selected}>${opt}</option>`;
        });
        html += `</select>`;
    } 
    else if (alan.type === 'text') {
        const placeholder = alan.placeholder || '';
        html += `<input type="text" class="popup-input" id="${inputId}" placeholder="${placeholder}">`;
    } 
    else if (alan.type === 'kapak') {
        html += `<input type="hidden" id="${inputId}">
                 <button type="button" class="kapak-sec-btn" id="popupKapakSecBtn" onclick="kapakSec('${inputId}', 'popupKapakOnizleme', 'popupKapakSecMetni')">
                     <img id="popupKapakOnizleme" src="" style="display:none;" alt="">
                     <span id="popupKapakSecMetni"><i class="fa-solid fa-image"></i> Galeri</span>
                 </button>`;
    }

    html += `</div>`;
    return html;
};