// =================================================================
// KONFIGURASI - PASTE URL WEB APP BARU ANDA DARI GOOGLE
// =================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwgfYi9r8Ml0MWFjnM4L9Nbi_oUJ6DvXAWF1xpyAeR3Dqrg8-MPWn13yXCl2r8QxZe9Pw/exec";

// =================================================================
// BAGIAN UTAMA - TIDAK PERLU DIUBAH
// =================================================================

const form = document.getElementById('bookingForm');
const statusMessage = document.getElementById('statusMessage');
const submitButton = document.getElementById('submitButton');
const waktuMulaiSelect = document.getElementById('waktuMulai');
const waktuSelesaiSelect = document.getElementById('waktuSelesai');

// --- Fungsi untuk mengisi dropdown waktu ---
function populateTimeSlots() {
    const startTime = 8 * 60; // 08:00 dalam menit
    const endTime = 17 * 60; // 17:00 dalam menit
    const interval = 30; // 30 menit

    for (let i = startTime; i <= endTime; i += interval) {
        const hours = Math.floor(i / 60).toString().padStart(2, '0');
        const minutes = (i % 60).toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;

        // Tambahkan ke dropdown Waktu Mulai
        if (i < endTime) { // Waktu mulai tidak boleh jam 17:00
             const startOption = new Option(timeString, timeString);
             waktuMulaiSelect.add(startOption);
        }

        // Tambahkan ke dropdown Waktu Selesai
        if (i > startTime) { // Waktu selesai tidak boleh jam 08:00
            const endOption = new Option(timeString, timeString);
            waktuSelesaiSelect.add(endOption);
        }
    }
}

// --- Fungsi untuk validasi durasi booking ---
function validateTimeSelection() {
    const startValue = waktuMulaiSelect.value;
    const endValue = waktuSelesaiSelect.value;

    if (!startValue || !endValue) return;

    const [startHour, startMinute] = startValue.split(':').map(Number);
    const [endHour, endMinute] = endValue.split(':').map(Number);

    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    const duration = endTimeInMinutes - startTimeInMinutes;

    // Durasi harus positif dan tidak lebih dari 2 jam (120 menit)
    if (duration <= 0 || duration > 120) {
        statusMessage.innerText = 'Durasi booking maksimal adalah 2 jam dan waktu selesai harus setelah waktu mulai.';
        statusMessage.className = 'status-gagal';
        submitButton.disabled = true;
    } else {
        statusMessage.innerText = '';
        statusMessage.className = '';
        submitButton.disabled = false;
    }
}

// Panggil fungsi saat halaman dimuat
document.addEventListener('DOMContentLoaded', populateTimeSlots);

// Tambahkan event listener untuk validasi
waktuMulaiSelect.addEventListener('change', validateTimeSelection);
waktuSelesaiSelect.addEventListener('change', validateTimeSelection);

// --- Event listener untuk submit form ---
form.addEventListener('submit', function(e) {
    e.preventDefault();
    validateTimeSelection(); // Lakukan validasi terakhir sebelum submit
    if (submitButton.disabled) {
        alert('Mohon perbaiki isian waktu Anda.');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerText = "Mengirim...";

    fetch(SCRIPT_URL, {
        method: 'POST',
        body: new FormData(form)
    })
    .then(response => response.json())
    .then(data => {
        statusMessage.innerText = data.message;
        statusMessage.className = data.status === 'sukses' ? 'status-sukses' : 'status-gagal';
        if (data.status === 'sukses') {
            form.reset();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusMessage.innerText = 'Terjadi kesalahan! Gagal terhubung ke server.';
        statusMessage.className = 'status-gagal';
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.innerText = "Kirim Permintaan Booking";
    });
});