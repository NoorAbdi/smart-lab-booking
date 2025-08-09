// Menunggu hingga seluruh halaman HTML selesai dimuat
document.addEventListener('DOMContentLoaded', function () {

    const resultContainer = document.getElementById('result');
    let lastScanTime = 0;
    const cooldown = 5000; // 5 detik cooldown untuk mencegah scan berulang

    // Fungsi yang akan dijalankan ketika QR code berhasil dipindai
    function onScanSuccess(decodedText, decodedResult) {
        const now = Date.now();
        if (now - lastScanTime < cooldown) {
            // Jika scan terjadi terlalu cepat, abaikan
            return;
        }
        lastScanTime = now; // Update waktu scan terakhir

        // Tampilkan pesan bahwa QR terdeteksi dan sedang diproses
        resultContainer.innerHTML = `✅ QR Code terdeteksi! Memproses check-in...`;
        
        // Hentikan pemindaian agar tidak memindai terus-menerus
        // html5QrcodeScanner.clear().catch(error => {
        //     console.error("Gagal menghentikan scanner.", error);
        // });

        // Gunakan fetch untuk mengunjungi URL dari QR code di latar belakang
        fetch(decodedText)
            .then(response => response.text()) // Ambil respons sebagai teks
            .then(textResponse => {
                // Tampilkan pesan balasan dari Google Apps Script
                resultContainer.innerHTML = textResponse;
            })
            .catch(error => {
                console.error('Error:', error);
                resultContainer.innerHTML = `❌ Gagal melakukan check-in. Silakan coba lagi.`;
            });
    }

    // Fungsi yang akan dijalankan jika scan gagal (bisa diabaikan)
    function onScanFailure(error) {
        // console.warn(`Code scan error = ${error}`);
    }

    // Membuat instance scanner baru
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "reader", // ID dari div tempat kamera akan ditampilkan
        { 
            fps: 10, // Frame per second untuk video
            qrbox: { width: 250, height: 250 } // Ukuran kotak pemindaian
        },
        false // verbose = false
    );
    
    // Mulai proses pemindaian
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});