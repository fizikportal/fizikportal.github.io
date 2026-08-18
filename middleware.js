export function middleware(req) {
    // SADECE /admin KLASÖRÜNE GİRMEK İSTEYENLERE ŞİFRE SOR
    if (req.nextUrl.pathname.startsWith('/admin')) {
        const basicAuth = req.headers.get('authorization');
        
        // KULLANICI ADI VE ŞİFRENİZİ BURADAN DEĞİŞTİRİN:
        const kullaniciAdi = 'admin';
        const sifre = 'Fizik2024';

        if (basicAuth) {
            const authValue = basicAuth.split(' ')[1];
            if (atob(authValue) === `${kullaniciAdi}:${sifre}`) {
                return; // Şifre doğru, sayfayı aç
            }
        }
        
        // Şifre yanlışsa veya girilmediyse şifre kutusu çıkart
        return new Response('Erişim Engellendi', {
            status: 401,
            headers: {
                'WWW-Authenticate': 'Basic realm="Güvenli Alan"'
            }
        });
    }
}
