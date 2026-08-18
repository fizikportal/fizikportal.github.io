// ==========================================================================
// 1. DOM ELEMANLARI VE DEĞİŞKENLER
// ==========================================================================
const tableBtn = document.getElementById('tableBtn');
const tableDropdownMenu = document.querySelector('.table-dropdown-menu');
const btnInsertTable = document.getElementById('btn-insert-table');
const btnUpdateTable = document.getElementById('btn-update-table');
const tableStatusBadge = document.getElementById('table-status-badge');
const editorModeBadge = document.getElementById('editor-mode');
// Inputlar
const tblRows = document.getElementById('tbl-rows');
const tblCols = document.getElementById('tbl-cols');
const tblWidth = document.getElementById('tbl-width');
const tblBorder = document.getElementById('tbl-border');
const tblTheme = document.getElementById('tbl-theme');
const editorArea = document.getElementById('word-canvas');
let lastSelectedRange = null;
let currentEditingTable = null; // Düzenlenen mevcut tablo

// ==========================================================================
// 2. TEK TIKLA SEÇME VE ÇİFT TIKLA DÜZENLEME MOTORU (Güvenli Versiyon)
// ==========================================================================
if (editorArea) {
    editorArea.addEventListener('click', (e) => {
        const target = e.target.closest('.meta-content, .img-caption');
        if (target && editorArea.contains(target)) {
            if (target.getAttribute('contenteditable') !== 'true') {
                e.preventDefault();
                const range = document.createRange();
                range.selectNodeContents(target);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
        }
    });

    editorArea.addEventListener('dblclick', (e) => {
        const target = e.target.closest('.meta-content, .img-caption');
        if (target && editorArea.contains(target)) {
            target.setAttribute('contenteditable', 'true');
            target.focus();
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.collapse(false);
            }
        }
    });

    editorArea.addEventListener('focusout', (e) => {
        const target = e.target.closest('.meta-content, .img-caption');
        if (target && target !== editorArea) {
            target.setAttribute('contenteditable', 'false');
        }
    });
}
// ==========================================================================
// 3. TABLO YÖNETİM MOTORU
// ==========================================================================
if (tableBtn) {
    tableBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        saveSelection();
        tableDropdownMenu.classList.toggle('active');
        if (!currentEditingTable) {
            resetTableDropdownMode();
        }
    });
}

document.addEventListener('click', (e) => {
    if (tableDropdownMenu && !tableDropdownMenu.contains(e.target) && (!tableBtn || !tableBtn.contains(e.target))) {
        tableDropdownMenu.classList.remove('active');
    }
});

function saveSelection() {
    if (!editorArea) return;
    const sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        if (editorArea.contains(range.commonAncestorContainer)) {
            lastSelectedRange = range;
        }
    }
}

function restoreSelection() {
    if (!editorArea) return;
    if (lastSelectedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(lastSelectedRange);
    } else {
        editorArea.focus();
    }
}

if (btnInsertTable) {
    btnInsertTable.addEventListener('click', () => {
        restoreSelection();
        const rows = parseInt(tblRows.value) || 3;
        const cols = parseInt(tblCols.value) || 3;
        const widthClass = tblWidth.value;
        const borderClass = tblBorder.value;
        const themeClass = tblTheme.value;
        const table = document.createElement('table');
        table.classList.add(widthClass, borderClass, themeClass);
        const tbody = document.createElement('tbody');
        for (let r = 0; r < rows; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < cols; c++) {
                const cell = document.createElement(r === 0 ? 'th' : 'td');
                cell.innerHTML = '<br>';
                tr.appendChild(cell);
            }
            tbody.appendChild(tr);
        }
        table.appendChild(tbody);
        const sel = window.getSelection();
        if (sel.rangeCount) {
            const range = sel.getRangeAt(0);
            range.deleteContents();
            range.insertNode(table);
            const p = document.createElement('p');
            p.innerHTML = '<br>';
            table.after(p);
            range.setStart(table.querySelector('th, td'), 0);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        tableDropdownMenu.classList.remove('active');
    });
}

if (editorArea) {
    editorArea.addEventListener('click', (e) => {
        const table = e.target.closest('table');
        if (table) {
            currentEditingTable = table;
            if (editorModeBadge) editorModeBadge.textContent = "Tablo Düzenleme";
            tableStatusBadge.textContent = "Tablo Düzenleme Modu";
            tableStatusBadge.classList.add('edit-mode');
            btnInsertTable.style.display = 'none';
            btnUpdateTable.style.display = 'block';
            tblRows.value = table.rows.length;
            tblCols.value = table.rows[0] ? table.rows[0].cells.length : 0;
            selectMatchOption(tblWidth, table);
            selectMatchOption(tblBorder, table);
            selectMatchOption(tblTheme, table);
        } else {
            currentEditingTable = null;
            if (editorModeBadge) editorModeBadge.textContent = "Yazım";
            resetTableDropdownMode();
        }
    });
}

function selectMatchOption(selectElement, tableElement) {
    Array.from(selectElement.options).forEach(option => {
        if (tableElement.classList.contains(option.value)) {
            selectElement.value = option.value;
        }
    });
}

function resetTableDropdownMode() {
    if (tableStatusBadge) {
        tableStatusBadge.textContent = "Yeni Tablo Modu";
        tableStatusBadge.classList.remove('edit-mode');
    }
    if (btnInsertTable) btnInsertTable.style.display = 'block';
    if (btnUpdateTable) btnUpdateTable.style.display = 'none';
}

if (btnUpdateTable) {
    btnUpdateTable.addEventListener('click', () => {
        if (!currentEditingTable) return;
        Array.from(tblWidth.options).forEach(opt => currentEditingTable.classList.remove(opt.value));
        Array.from(tblBorder.options).forEach(opt => currentEditingTable.classList.remove(opt.value));
        Array.from(tblTheme.options).forEach(opt => currentEditingTable.classList.remove(opt.value));
        currentEditingTable.classList.add(tblWidth.value, tblBorder.value, tblTheme.value);
        const targetRows = parseInt(tblRows.value) || 1;
        const targetCols = parseInt(tblCols.value) || 1;
        let currentRows = currentEditingTable.rows.length;
        let currentCols = currentEditingTable.rows[0] ? currentEditingTable.rows[0].cells.length : 0;
        if (targetCols !== currentCols) {
            for (let i = 0; i < currentEditingTable.rows.length; i++) {
                const row = currentEditingTable.rows[i];
                while (row.cells.length < targetCols) {
                    const cellType = row.rowIndex === 0 ? 'th' : 'td';
                    const newCell = document.createElement(cellType);
                    newCell.innerHTML = '<br>';
                    row.appendChild(newCell);
                }
                while (row.cells.length > targetCols) {
                    row.deleteCell(-1);
                }
            }
        }
        while (currentEditingTable.rows.length < targetRows) {
            const newRow = currentEditingTable.insertRow();
            for (let i = 0; i < targetCols; i++) {
                newRow.insertCell().innerHTML = '<br>';
            }
        }
        while (currentEditingTable.rows.length > targetRows) {
            currentEditingTable.deleteRow(-1);
        }
        tableDropdownMenu.classList.remove('active');
        currentEditingTable = null;
        resetTableDropdownMode();
    });
}

if (editorArea) {
    editorArea.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;
            const activeNode = selection.anchorNode;
            const cell = activeNode.nodeType === 3 ? activeNode.parentElement.closest('td, th') : activeNode.closest('td, th');
            if (cell) {
                const row = cell.parentElement;
                const table = row.closest('table');
                const isLastCellInRow = (cell === row.lastElementChild);
                const isLastRowInTable = (row === table.rows[table.rows.length - 1]);
                if (isLastCellInRow && isLastRowInTable) {
                    e.preventDefault();
                    const colCount = row.cells.length;
                    const newRow = table.insertRow();
                    for (let i = 0; i < colCount; i++) {
                        const newCell = newRow.insertCell();
                        newCell.innerHTML = '<br>';
                    }
                    setTimeout(() => {
                        const firstCell = newRow.cells[0];
                        firstCell.focus();
                        const range = document.createRange();
                        range.setStart(firstCell, 0);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }, 10);
                }
            }
        }
    });
}

// ==========================================================================
// 4. METİN BİÇİMLENDİRME MOTORU (SÜTUN UYUMLU)
// ==========================================================================
const formatButtons = document.querySelectorAll('.toolbar-btn[data-command]');
formatButtons.forEach(btn => {
    btn.addEventListener('mousedown', (e) => { e.preventDefault(); });
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        const command = btn.getAttribute('data-command');
        if (!editorArea) return;
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let container = selection.getRangeAt(0).commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
            const colText = container.closest('.col-text-content');
            if (colText && editorArea.contains(colText)) {
                colText.focus();
            } else if (container.isContentEditable && editorArea.contains(container)) {
                container.focus();
            }
        }
        if (command === 'superscript' || command === 'subscript') {
            executeScriptStyle(command);
        } else {
            document.execCommand(command, false, null);
        }
        updateFormatButtonStates();
    });
});

function executeScriptStyle(command) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
    const targetTag = command === 'superscript' ? 'SUP' : 'SUB';
    const oppositeTag = command === 'superscript' ? 'SUB' : 'SUP';
    const existingTag = container.closest(targetTag);
    if (existingTag && editorArea.contains(existingTag)) {
        let parent = existingTag.parentNode;
        while (existingTag.firstChild) { parent.insertBefore(existingTag.firstChild, existingTag); }
        existingTag.remove();
        if (parent) parent.normalize();
        return;
    }
    const existingOpposite = container.closest(oppositeTag);
    if (existingOpposite && editorArea.contains(existingOpposite)) {
        let parent = existingOpposite.parentNode;
        while (existingOpposite.firstChild) { parent.insertBefore(existingOpposite.firstChild, existingOpposite); }
        existingOpposite.remove();
        if (parent) parent.normalize();
    }
    document.execCommand(command, false, null);
}

function updateFormatButtonStates() {
    formatButtons.forEach(btn => {
        const command = btn.getAttribute('data-command');
        try {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                let container = selection.getRangeAt(0).commonAncestorContainer;
                if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
                if (command === 'superscript' && container.closest('sup')) btn.classList.add('active');
                else if (command === 'subscript' && container.closest('sub')) btn.classList.add('active');
                else if (command === 'superscript' || command === 'subscript') btn.classList.remove('active');
                else {
                    if (document.queryCommandState(command)) btn.classList.add('active');
                    else btn.classList.remove('active');
                }
            }
        } catch (e) {}
    });
}

document.addEventListener('selectionchange', () => {
    if (!editorArea) return;
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorArea.contains(range.commonAncestorContainer)) updateFormatButtonStates();
    }
});

// ==========================================================================
// 5. YAZI TIPI BOYUTU MOTORU
// ==========================================================================
const fontSizeSelect = document.getElementById('font-size-select');
if (fontSizeSelect) {
    fontSizeSelect.addEventListener('change', function () {
        const size = this.value;
        if (!size || !editorArea) return;
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let container = selection.getRangeAt(0).commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
            const colText = container.closest('.col-text-content');
            if (colText && editorArea.contains(colText)) colText.focus();
        }
        changeSelectedFontSize(size);
        this.value = ""; 
    });
}

function changeSelectedFontSize(size) {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString().trim().length === 0) return;
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
    if (container.tagName === 'SPAN' && container.childNodes.length === 1 && editorArea.contains(container)) {
        container.style.fontSize = size; return;
    }
    const span = document.createElement('span');
    span.style.fontSize = size;
    try { range.surroundContents(span); } 
    catch (e) {
        document.execCommand('fontSize', false, '7');
        const fontElements = editorArea.querySelectorAll('font[size="7"]');
        fontElements.forEach(font => {
            const replacementSpan = document.createElement('span');
            replacementSpan.style.fontSize = size;
            replacementSpan.innerHTML = font.innerHTML;
            font.parentNode.replaceChild(replacementSpan, font);
        });
    }
}

function updateFontSizeDropdownState() {
    if (!fontSizeSelect) return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        let container = selection.getRangeAt(0).commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
        const spanWithFont = container.closest('span[style*="font-size"]');
        if (spanWithFont) {
            const currentSize = spanWithFont.style.fontSize;
            if ([...fontSizeSelect.options].some(opt => opt.value === currentSize)) {
                fontSizeSelect.value = currentSize; return;
            }
        }
    }
    fontSizeSelect.value = "";
}

// ==========================================================================
// 6. BAŞLIK SEÇİM MOTORU
// ==========================================================================
const headingSelect = document.getElementById('heading-select');
if (headingSelect) {
    headingSelect.addEventListener('change', function () {
        const targetBlock = this.value;
        if (!editorArea) return;
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            let container = selection.getRangeAt(0).commonAncestorContainer;
            if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
            const colText = container.closest('.col-text-content');
            if (colText && editorArea.contains(colText)) colText.focus();
        }
        document.execCommand('formatBlock', false, `<${targetBlock}>`);
    });
}

function updateHeadingDropdownState() {
    if (!headingSelect) return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        let container = selection.getRangeAt(0).commonAncestorContainer;
        if (container.nodeType === Node.TEXT_NODE) container = container.parentNode;
        const closestBlock = container.closest('h1, h2, h3, p');
        if (closestBlock) {
            headingSelect.value = closestBlock.tagName.toLowerCase(); return;
        }
    }
    headingSelect.value = "p";
}

document.addEventListener('selectionchange', () => {
    if (!editorArea) return;
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (editorArea.contains(range.commonAncestorContainer)) {
            updateFontSizeDropdownState();
            updateHeadingDropdownState();
        }
    }
});

// ==========================================================================
// 7. GALERİ ENTEGRASYON KÖPRÜSÜ
// ==========================================================================
const columnSelect = document.getElementById('column-select');
let aktifResimCallback = null;

function triggerImageSelectionForColumn(callback) {
    aktifResimCallback = callback;
    const width = 900, height = 600;
    const left = (screen.width - width) / 2, top = (screen.height - height) / 2;
    let path = window.location.pathname.split('/').pop();
    let hedef = path.replace('.php', '').replace('.html', '') || 'genel';
    window.open(`galeri.html?hedef=${hedef}&tip=icerik`, 'Galeri', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`);
}
window.galeridenResmiAl = function(dosyaYolu) {
    if (typeof aktifResimCallback === 'function') { aktifResimCallback(dosyaYolu); aktifResimCallback = null; }
};

function escapeHtmlAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ==========================================================================
// 8. TEKLİ RESİM VE SÜTUN MOTORU
// ==========================================================================
function insertSingleImageWithCaption(imageUrl) {
    if (!imageUrl || !editorArea) return;
    editorArea.focus();
    const container = document.createElement('div');
    container.className = 'single-img-container';
    container.setAttribute('contenteditable', 'false');
    container.innerHTML = `<img src="${escapeHtmlAttr(imageUrl)}" alt="Görsel">`;
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(container);
        const p = document.createElement('p'); p.innerHTML = '<br>';
        container.parentNode.insertBefore(p, container.nextSibling);
        const captionDiv = container.querySelector('.img-caption');
        if(captionDiv) {
            const newRange = document.createRange();
            newRange.selectNodeContents(captionDiv);
            newRange.collapse(false);
            selection.removeAllRanges(); selection.addRange(newRange);
            captionDiv.focus();
        }
    } else { editorArea.appendChild(container); }
}

if (columnSelect) {
    columnSelect.addEventListener('change', function () {
        const colCount = parseInt(this.value, 10);
        if (!colCount || !editorArea) return;
        editorArea.focus();
        if (colCount === 1) {
            triggerImageSelectionForColumn((imageUrl) => { if (imageUrl) insertSingleImageWithCaption(imageUrl); });
            this.value = ""; return; 
        }
        const row = document.createElement('div');
        row.className = 'editor-row';
        row.setAttribute('contenteditable', 'false');
        for (let i = 0; i < colCount; i++) {
            const col = document.createElement('div');
            col.className = 'editor-col';
            col.innerHTML = `<div class="col-placeholder"><button class="col-placeholder-btn select-text-btn">📝 Yazı Alanı</button><button class="col-placeholder-btn select-img-btn">🖼️ Resim Alanı</button></div>`;
            row.appendChild(col);
        }
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents(); range.insertNode(row);
            const p = document.createElement('p'); p.innerHTML = '<br>';
            row.parentNode.insertBefore(p, row.nextSibling);
        } else { editorArea.appendChild(row); }
        this.value = ""; 
    });
}

if (editorArea) {
    editorArea.addEventListener('click', (e) => {
        if (e.target.classList.contains('select-text-btn')) {
            e.preventDefault();
            const col = e.target.closest('.editor-col');
            if (col) {
                col.classList.add('active-content');
                col.innerHTML = `<div class="col-text-content" contenteditable="true"><p><br></p></div>`;
                const textArea = col.querySelector('.col-text-content');
                textArea.focus();
                const newRange = document.createRange();
                newRange.selectNodeContents(textArea); newRange.collapse(false);
                const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(newRange);
                textArea.addEventListener('input', function() {
                    if (this.innerText.trim() === '') {
                        col.classList.remove('active-content');
                        col.innerHTML = `<div class="col-placeholder"><button class="col-placeholder-btn select-text-btn">📝 Yazı Alanı</button><button class="col-placeholder-btn select-img-btn">🖼️ Resim Alanı</button></div>`;
                    }
                });
            }
        }
        if (e.target.classList.contains('select-img-btn')) {
            e.preventDefault();
            const col = e.target.closest('.editor-col');
            if (col) {
                triggerImageSelectionForColumn((imageUrl) => {
                    if (imageUrl) {
                        col.classList.add('active-content');
                        col.innerHTML = `<div class="col-img-container" contenteditable="false"><img src="${escapeHtmlAttr(imageUrl)}" alt="Sütun Görseli"></div>`;
                    }
                });
            }
        }
        if (e.target.closest('.col-img-container img')) {
            e.preventDefault();
            const col = e.target.closest('.editor-col');
            if (col) {
                triggerImageSelectionForColumn((imageUrl) => {
                    if (imageUrl) {
                        col.classList.add('active-content');
                        col.innerHTML = `<div class="col-img-container" contenteditable="false"><img src="${escapeHtmlAttr(imageUrl)}" alt="Sütun Görseli"></div>`;
                    }
                });
            }
        }
    });
}

// ==========================================================================
// 9. EXCEL TARZI SORU ELEMANLARI YÖNETİMİ
// ==========================================================================
const questionElementSelect = document.getElementById('question-element-select');
if (questionElementSelect) {
    questionElementSelect.addEventListener('change', function () {
        const selectedType = this.value;
        if (!selectedType || !editorArea) return;
        editorArea.focus();
        let elementToInsert = null;
        switch (selectedType) {
            case 'options':
                elementToInsert = document.createElement('div');
                elementToInsert.className = 'question-options-grid';
                elementToInsert.setAttribute('contenteditable', 'false');
                ['A', 'B', 'C', 'D', 'E'].forEach(sik => {
                    const box = document.createElement('div');
                    box.className = 'option-box';
                    box.innerHTML = `<span class="option-prefix">${sik})</span><div class="option-text" contenteditable="true"></div>`;
                    elementToInsert.appendChild(box);
                });
                break;
            case 'correct-answer':
                elementToInsert = document.createElement('div');
                elementToInsert.className = 'meta-box meta-correct';
                elementToInsert.setAttribute('contenteditable', 'false');
                elementToInsert.innerHTML = `<div class="meta-title text-success"><i class="fa-solid fa-check-circle"></i> Doğru Cevap Belirle</div><div class="meta-content-wrapper"><select class="correct-answer-select"><option value="A">A Şıkkı</option><option value="B">B Şıkkı</option><option value="C">C Şıkkı</option><option value="D">D Şıkkı</option><option value="E">E Şıkkı</option></select></div>`;
                break;
            case 'solution':
                elementToInsert = document.createElement('div');
                elementToInsert.className = 'meta-box meta-solution';
                elementToInsert.setAttribute('contenteditable', 'false');
                elementToInsert.innerHTML = `<div class="meta-title text-primary"><i class="fa-solid fa-lightbulb"></i> Soru Çözüm Açıklaması</div><div class="meta-content" contenteditable="true" placeholder="Detaylı çözüm adımlarını buraya yazın..."></div>`;
                break;
            case 'hint':
                elementToInsert = document.createElement('div');
                elementToInsert.className = 'meta-box meta-hint';
                elementToInsert.setAttribute('contenteditable', 'false');
                elementToInsert.innerHTML = `<div class="meta-title text-warning"><i class="fa-solid fa-key"></i> Öğrenci İpucu / Yardımcı Not</div><div class="meta-content" contenteditable="true" placeholder="Öğrenciye yol gösterecek ipucunu buraya yazın..."></div>`;
                break;
        }
        if (elementToInsert) ekleVeOdaklan(elementToInsert);
        this.value = ""; 
    });
}

function ekleVeOdaklan(element) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents(); range.insertNode(element);
    const p = document.createElement('p'); p.innerHTML = '<br>';
    element.parentNode.insertBefore(p, element.nextSibling);
    const editableChild = element.querySelector('[contenteditable="true"], .option-text, .meta-content');
    if (editableChild) {
        setTimeout(() => {
            editableChild.focus();
            const newRange = document.createRange();
            newRange.selectNodeContents(editableChild); newRange.collapse(false);
            selection.removeAllRanges(); selection.addRange(newRange);
        }, 50);
    }
}

// ==========================================================================
// BÖLÜNMÜŞ (SPLIT) MADDE VE ALT MADDE MOTORU
// ==========================================================================
const maddeAnaBtn = document.getElementById('madde-ana-btn');
const maddeOkBtn = document.getElementById('madde-ok-btn');
const maddeDropdownMenu = document.getElementById('madde-dropdown-menu');
const maddeAltBtn = document.getElementById('madde-alt-btn');

if (maddeOkBtn && maddeDropdownMenu) {
    maddeOkBtn.addEventListener('click', function (e) { e.stopPropagation(); maddeDropdownMenu.classList.toggle('show'); });
    document.addEventListener('click', function () { maddeDropdownMenu.classList.remove('show'); });
}
if (maddeAnaBtn) {
    maddeAnaBtn.addEventListener('click', function (e) {
        e.preventDefault(); if (!editorArea) return; editorArea.focus();
        const p = document.createElement('p');
        p.innerHTML = `<strong>MADDE ${getNextArticleNumber()} – </strong><span style="font-weight: normal;">&nbsp;</span>`;
        ekleVeDuzMetneOdaklan(p);
    });
}
if (maddeAltBtn) {
    maddeAltBtn.addEventListener('click', function (e) {
        e.preventDefault(); if (!editorArea) return; editorArea.focus();
        const nextSubInfo = getNextSubArticleNumber();
        const p = document.createElement('p');
        p.innerHTML = `<strong>${nextSubInfo.artNum}.${nextSubInfo.subNum}. </strong><span style="font-weight: normal;">&nbsp;</span>`;
        ekleVeDuzMetneOdaklan(p);
        if (maddeDropdownMenu) maddeDropdownMenu.classList.remove('show');
    });
}

function ekleVeDuzMetneOdaklan(paragraph) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents(); range.insertNode(paragraph);
        const emptyP = document.createElement('p'); emptyP.innerHTML = '<br>';
        paragraph.parentNode.insertBefore(emptyP, paragraph.nextSibling);
        const targetSpan = paragraph.querySelector('span');
        if (targetSpan) {
            const textNode = targetSpan.firstChild || targetSpan;
            const newRange = document.createRange();
            newRange.setStart(textNode, 0); newRange.setEnd(textNode, textNode.length || 0); newRange.collapse(false);
            selection.removeAllRanges(); selection.addRange(newRange);
        }
    } else { editorArea.appendChild(paragraph); }
    if (typeof triggerCanvasChange === 'function') triggerCanvasChange();
}

function getNextArticleNumber() {
    if (!editorArea) return 1;
    const text = editorArea.innerText || editorArea.textContent;
    const regex = /\bMADDE\s+(\d+)/gi; let match; let maxNum = 0;
    while ((match = regex.exec(text)) !== null) { const num = parseInt(match[1], 10); if (num > maxNum) maxNum = num; }
    return maxNum + 1;
}

function getNextSubArticleNumber() {
    if (!editorArea) return { artNum: 1, subNum: 1 };
    const text = editorArea.innerText || editorArea.textContent;
    const mainRegex = /\bMADDE\s+(\d+)/gi; let mainMatch; let lastArtNum = 1;
    while ((mainMatch = mainRegex.exec(text)) !== null) { lastArtNum = parseInt(mainMatch[1], 10); }
    const subRegex = new RegExp(`\\b${lastArtNum}\\.(\\d+)\\.`, 'g'); let subMatch; let lastSubNum = 0;
    while ((subMatch = subRegex.exec(text)) !== null) { const currentSubNum = parseInt(subMatch[1], 10); if (currentSubNum > lastSubNum) lastSubNum = currentSubNum; }
    return { artNum: lastArtNum, subNum: lastSubNum + 1 };
}

// ==========================================================================
// RESİM BOYUTLANDIRMA
// ==========================================================================
if (editorArea) {
    const resizeOverlay = document.createElement('div');
    resizeOverlay.className = 'img-resize-overlay';
    resizeOverlay.innerHTML = `<div class="img-resize-handle" data-corner="nw"></div> <div class="img-resize-handle" data-corner="ne"></div> <div class="img-resize-handle" data-corner="sw"></div> <div class="img-resize-handle" data-corner="se"></div> <button type="button" class="img-resize-delete" title="Resmi Sil"><i class="fa-solid fa-trash"></i></button>`;
    document.body.appendChild(resizeOverlay);
    let secilenResim = null, suruklemeAktif = false, baslangicX = 0, baslangicY = 0, baslangicGenislik = 0, baslangicYukseklik = 0, enBoyOrani = 1, aktifKose = '';

    function overlayKonumlandir() {
        if (!secilenResim) return;
        const r = secilenResim.getBoundingClientRect();
        resizeOverlay.style.top = r.top + 'px'; resizeOverlay.style.left = r.left + 'px';
        resizeOverlay.style.width = r.width + 'px'; resizeOverlay.style.height = r.height + 'px';
    }
    function resmiSecimeAl(img) { secilenResim = img; resizeOverlay.classList.add('active'); overlayKonumlandir(); }
    function secimiTemizle() { secilenResim = null; resizeOverlay.classList.remove('active'); }
    function seciliResmiSil() {
        if (!secilenResim) return;
        const kolon = secilenResim.closest('.editor-col');
        if (kolon) { kolon.classList.remove('active-content'); kolon.innerHTML = `<div class="col-placeholder"><button class="col-placeholder-btn select-text-btn">📝 Yazı Alanı</button><button class="col-placeholder-btn select-img-btn">🖼️ Resim Alanı</button></div>`; secimiTemizle(); return; }
        const tekliKapsayici = secilenResim.closest('.single-img-container');
        if (tekliKapsayici) tekliKapsayici.remove(); else secilenResim.remove();
        secimiTemizle();
    }
    resizeOverlay.querySelector('.img-resize-delete').addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); seciliResmiSil(); });
    document.addEventListener('keydown', (e) => { if (secilenResim && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); seciliResmiSil(); } });
    editorArea.addEventListener('click', (e) => { if (e.target.tagName === 'IMG') resmiSecimeAl(e.target); else if (!e.target.closest('.img-resize-handle')) secimiTemizle(); });
    document.addEventListener('click', (e) => { if (!editorArea.contains(e.target) && !e.target.closest('.img-resize-overlay') && !e.target.closest('.toolbar')) secimiTemizle(); });
    window.addEventListener('scroll', () => { if (secilenResim) overlayKonumlandir(); }, true);
    window.addEventListener('resize', () => { if (secilenResim) overlayKonumlandir(); });
    resizeOverlay.querySelectorAll('.img-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            if (!secilenResim) return; e.preventDefault(); e.stopPropagation(); suruklemeAktif = true; aktifKose = handle.dataset.corner;
            const r = secilenResim.getBoundingClientRect();
            baslangicX = e.clientX; baslangicY = e.clientY; baslangicGenislik = r.width; baslangicYukseklik = r.height; enBoyOrani = baslangicGenislik / baslangicYukseklik;
        });
    });
    document.addEventListener('mousemove', (e) => {
        if (!suruklemeAktif || !secilenResim) return;
        const deltaX = e.clientX - baslangicX;
        const yon = (aktifKose === 'ne' || aktifKose === 'se') ? 1 : -1;
        let yeniGenislik = baslangicGenislik + (deltaX * yon);
        if (yeniGenislik < 40) yeniGenislik = 40;
        secilenResim.style.width = yeniGenislik + 'px'; secilenResim.style.height = (yeniGenislik / enBoyOrani) + 'px'; overlayKonumlandir();
    });
    document.addEventListener('mouseup', () => { suruklemeAktif = false; });
}

// ==========================================================================
// 10. AKILLI YAPIŞTIRMA MOTORU
// ==========================================================================
if (editorArea) {
    editorArea.addEventListener('paste', function(e) {
        e.preventDefault(); let text = '';
        if (e.clipboardData && e.clipboardData.getData) text = e.clipboardData.getData('text/plain');
        else if (window.clipboardData && window.clipboardData.getData) text = window.clipboardData.getData('Text');
        if (text) { const formattedText = text.replace(/\n/g, '<br>'); document.execCommand('insertHTML', false, formattedText); showPasteNotification(); }
    });
}

function showPasteNotification() {
    const existing = document.querySelector('.paste-notification');
    if (existing) existing.remove();
    const notif = document.createElement('div');
    notif.className = 'paste-notification';
    notif.innerHTML = `<i class="fa fa-check-circle"></i> Biçimlendirme temizlendi, sadece metin yapıştırıldı.`;
    document.body.appendChild(notif);
    setTimeout(() => { notif.classList.add('fade-out'); setTimeout(() => notif.remove(), 300); }, 2000);
}

// ==========================================================================
// 11. ÖZEL SAĞ TIK MENÜSÜ
// ==========================================================================
if (editorArea) {
    document.addEventListener('click', function() { const existingMenu = document.getElementById('custom-context-menu'); if (existingMenu) existingMenu.remove(); });
    editorArea.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const existingMenu = document.getElementById('custom-context-menu');
        if (existingMenu) existingMenu.remove();
        const menu = document.createElement('div');
        menu.id = 'custom-context-menu'; menu.className = 'custom-context-menu';
        menu.innerHTML = `<div class="ctx-item" data-cmd="bold"><i class="fa fa-bold"></i> Kalın</div><div class="ctx-item" data-cmd="italic"><i class="fa fa-italic"></i> İtalik</div><div class="ctx-item" data-cmd="underline"><i class="fa fa-underline"></i> Altı Çizili</div><div class="ctx-divider"></div><div class="ctx-item" data-cmd="removeFormat"><i class="fa fa-eraser"></i> Biçimi Temizle</div><div class="ctx-item" data-cmd="pastePlain"><i class="fa fa-paste"></i> Sadece Metin Yapıştır</div>`;
        menu.style.position = 'absolute'; menu.style.left = e.pageX + 'px'; menu.style.top = e.pageY + 'px'; menu.style.zIndex = '9999';
        document.body.appendChild(menu);
        menu.querySelectorAll('.ctx-item').forEach(item => {
            item.addEventListener('mousedown', function(e) { e.preventDefault(); });
            item.addEventListener('click', function(e) {
                e.stopPropagation(); 
                const cmd = this.getAttribute('data-cmd');
                if (cmd === 'pastePlain') {
                    if (navigator.clipboard && navigator.clipboard.readText) {
                        navigator.clipboard.readText().then(text => { document.execCommand('insertText', false, text); if (typeof showPasteNotification === 'function') showPasteNotification(); }).catch(() => alert('Tarayıcı güvenliği gereği panoya otomatik erişilemedi. Lütfen klavyeden Ctrl+V tuşlarını kullanarak yapıştırın.'));
                    } else { alert('Tarayıcınız panodan otomatik okumayı desteklemiyor. Lütfen Ctrl+V ile yapıştırın.'); }
                } else if (cmd === 'removeFormat') document.execCommand('removeFormat', false, null);
                else document.execCommand(cmd, false, null);
                menu.remove(); 
            });
        });
    });
}

// ==========================================================================
// 12. EDİTÖRÜ RENDER EDEN FONKSİYON (DIŞARIDAN ÇAĞRILABİLİR)
// ==========================================================================
window.renderEditor = function() {
    const canvas = document.getElementById('word-canvas');
    if (!canvas) return;
    if (typeof window.EDITOR_DATA !== 'undefined' && Array.isArray(window.EDITOR_DATA)) {
        let htmlOutput = '';
        window.EDITOR_DATA.forEach(block => {
            if (block.type === 'baslik') htmlOutput += `<${block.content.tag}>${block.content.text}</${block.content.tag}>`;
            else if (block.type === 'paragraf') htmlOutput += block.content.html;
            else if (block.type === 'tablo') htmlOutput += block.content.html;
            else if (block.type === 'sutunlu_yazi') {
                const layout_type = block.content.layout_type;
                htmlOutput += `<div class="editor-row" contenteditable="false">`;
                for (let i = 1; i <= layout_type; i++) {
                    const cellType = block.content[`cell_${i}_type`];
                    if (cellType === 'image') {
                        const imgPath = block.content[`image_path_block_${block.uid}_${i}`];
                        htmlOutput += `<div class="editor-col active-content"><div class="col-img-container" contenteditable="false"><img src="${imgPath}" alt="Sütun Görseli"><div class="img-caption" contenteditable="true"></div></div></div>`;
                    } else {
                        const textContent = block.content[`text_block_${block.uid}_${i}`];
                        htmlOutput += `<div class="editor-col active-content"><div class="col-text-content" contenteditable="true">${textContent}</div></div>`;
                    }
                }
                htmlOutput += `</div>`;
            }
        });
        canvas.innerHTML = htmlOutput;
    }
};
document.addEventListener('DOMContentLoaded', window.renderEditor);