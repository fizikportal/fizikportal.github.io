document.addEventListener('DOMContentLoaded', () => {
    const themeCards = document.querySelectorAll('.theme-card');
    const saveButton = document.getElementById('btn-save');
    let seciliTema = document.body.className.match(/theme-([a-z-]+)/)?.[1] || 'warm-amber';

    // Tema Kartlarına Tıklama Olayı
    themeCards.forEach(card => {
        card.addEventListener('click', () => {
            // Aktif kart tasarımını güncelle
            themeCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // Yeni temayı al
            const yeniTema = card.getAttribute('data-theme');
            seciliTema = yeniTema;

            // Body üzerindeki eski tema sınıfını temizle ve yenisini bas
            // Bu sayede anlık canlı önizleme gerçekleşir!
            document.body.className = document.body.className.replace(/theme-[a-z-]+/g, '');
            document.body.classList.add(`theme-${yeniTema}`);
        });
    });

    // Kaydet Butonu Tıklama Olayı (AJAX POST)
    saveButton.addEventListener('click', () => {
        saveButton.disabled = true;
        saveButton.innerText = 'Kaydediliyor...';

        const formData = new FormData();
        formData.append('tema', seciliTema);

        fetch('ayarlar.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                saveButton.innerText = '✓ Kaydedildi!';
                saveButton.style.backgroundColor = 'var(--accent-cyan)';
                
                setTimeout(() => {
                    saveButton.disabled = false;
                    saveButton.innerText = 'Değişiklikleri Kaydet';
                    saveButton.style.backgroundColor = 'var(--accent-lime)';
                }, 2000);
            } else {
                alert('Hata: ' + data.message);
                saveButton.disabled = false;
                saveButton.innerText = 'Tekrar Dene';
            }
        })
        .catch(err => {
            console.error('Kayıt hatası:', err);
            alert('Sunucuyla bağlantı kurulamadı.');
            saveButton.disabled = false;
            saveButton.innerText = 'Değişiklikleri Kaydet';
        });
    });
});