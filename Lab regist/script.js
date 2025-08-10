// =================================================================
// KONFIGURASI - SAMBUNGKAN KE SERVER PYTHON ANDA
// =================================================================
const BASE_URL = "http://127.0.0.1:5000"; // Alamat server Python

// =================================================================
// BAGIAN UTAMA - TIDAK PERLU DIUBAH
// =================================================================

const form = document.getElementById('bookingForm');
const statusMessage = document.getElementById('statusMessage');
const submitButton = document.getElementById('submitButton');
const tanggalBookingInput = document.getElementById('tanggalBooking');
const waktuMulaiSelect = document.getElementById('waktuMulai');
const waktuSelesaiSelect = document.getElementById('waktuSelesai');

let bookedSlotsForSelectedDate = [];

// --- Fungsi utilitas untuk mengubah "HH:mm" menjadi menit ---
function timeToMinutes(time) {
    if (typeof time !== 'string' || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// --- Fungsi untuk mengambil jadwal yang sudah terisi dari server ---
async function fetchBookedSlots(date) {
    if (!date) {
        bookedSlotsForSelectedDate = [];
        populateTimeSlots();
        return;
    }
    
    statusMessage.innerText = "Mengecek jadwal...";
    statusMessage.className = '';
    submitButton.disabled = true;

    try {
        // PERBAIKAN DI SINI: Menggunakan BASE_URL
        const response = await fetch(`${BASE_URL}/api/getBookedSlots?tanggal=${date}`);
        const result = await response.json();
        
        if (result.status === 'sukses') {
            bookedSlotsForSelectedDate = result.data.map(slot => ({
                start: timeToMinutes(slot.start),
                end: timeToMinutes(slot.end)
            }));
            statusMessage.innerText = "Jadwal berhasil dimuat. Silakan pilih waktu.";
            statusMessage.className = 'status-sukses';
        } else {
            throw new Error(result.message || 'Gagal mengambil data dari server.');
        }
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        statusMessage.innerText = `Gagal memuat jadwal. Periksa koneksi atau coba lagi nanti.`;
        statusMessage.className = 'status-gagal';
        bookedSlotsForSelectedDate = [];
    } finally {
        populateTimeSlots();
    }
}

// --- Fungsi untuk mengisi dropdown waktu ---
function populateTimeSlots() {
    const lastSelectedStart = waktuMulaiSelect.value;
    const lastSelectedEnd = waktuSelesaiSelect.value;
    
    waktuMulaiSelect.innerHTML = '<option value="">Pilih Waktu</option>';
    waktuSelesaiSelect.innerHTML = '<option value="">Pilih Waktu</option>';

    const startTime = 8 * 60, endTime = 17 * 60, interval = 30;

    for (let i = startTime; i <= endTime; i += interval) {
        const hours = Math.floor(i / 60).toString().padStart(2, '0');
        const minutes = (i % 60).toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        
        let isBooked = false;
        for (const slot of bookedSlotsForSelectedDate) {
            if (i >= slot.start && i < slot.end) {
                isBooked = true;
                break;
            }
        }

        if (i < endTime) {
            const startOption = new Option(isBooked ? `${timeString} (Terisi)`: timeString, timeString);
            startOption.disabled = isBooked;
            waktuMulaiSelect.add(startOption);
        }

        if (i > startTime) {
            const endOption = new Option(timeString, timeString);
            let isEndBooked = false;
            for (const slot of bookedSlotsForSelectedDate) {
                if (i > slot.start && i <= slot.end) {
                    isEndBooked = true;
                    break;
                }
            }
            if(isEndBooked) {
                endOption.disabled = true;
                endOption.innerText = `${timeString} (Terisi)`;
            }
            waktuSelesaiSelect.add(endOption);
        }
    }

    waktuMulaiSelect.value = lastSelectedStart;
    waktuSelesaiSelect.value = lastSelectedEnd;
    
    validateTimeSelection();
}

// --- Fungsi validasi ---
function validateTimeSelection() {
    const startValue = waktuMulaiSelect.value;
    const endValue = waktuSelesaiSelect.value;

    if (!startValue || !endValue) {
        submitButton.disabled = true;
        return;
    }

    const startTimeInMinutes = timeToMinutes(startValue);
    const endTimeInMinutes = timeToMinutes(endValue);
    const duration = endTimeInMinutes - startTimeInMinutes;

    if (duration <= 0) {
        statusMessage.innerText = 'Waktu selesai harus setelah waktu mulai.';
        statusMessage.className = 'status-gagal';
        submitButton.disabled = true;
        return;
    }
    if (duration > 120) {
        statusMessage.innerText = 'Durasi booking maksimal adalah 2 jam.';
        statusMessage.className = 'status-gagal';
        submitButton.disabled = true;
        return;
    }

    for (const slot of bookedSlotsForSelectedDate) {
        if (startTimeInMinutes < slot.end && endTimeInMinutes > slot.start) {
            statusMessage.innerText = 'Waktu yang Anda pilih bertabrakan dengan jadwal lain.';
            statusMessage.className = 'status-gagal';
            submitButton.disabled = true;
            return;
        }
    }
    
    statusMessage.innerText = 'Rentang waktu tersedia.';
    statusMessage.className = 'status-sukses';
    submitButton.disabled = false;
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    tanggalBookingInput.setAttribute('min', todayStr);
    populateTimeSlots(); 
});

tanggalBookingInput.addEventListener('change', function() {
    fetchBookedSlots(this.value);
});

waktuMulaiSelect.addEventListener('change', validateTimeSelection);
waktuSelesaiSelect.addEventListener('change', validateTimeSelection);

form.addEventListener('submit', function(e) {
    e.preventDefault();
    validateTimeSelection(); 
    if (submitButton.disabled) {
        alert('Mohon perbaiki isian waktu Anda. Perhatikan pesan status di bawah formulir.');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerText = "Mengirim...";

    // PERBAIKAN DI SINI: Menggunakan BASE_URL
    fetch(`${BASE_URL}/api/submitBooking`, {
        method: 'POST',
        body: new FormData(form)
    })
    .then(response => response.json())
    .then(data => {
        statusMessage.innerText = data.message;
        statusMessage.className = data.status === 'sukses' ? 'status-sukses' : 'status-gagal';
        if (data.status === 'sukses') {
            form.reset();
            bookedSlotsForSelectedDate = [];
            populateTimeSlots();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusMessage.innerText = 'Terjadi kesalahan! Gagal terhubung ke server.';
        statusMessage.className = 'status-gagal';
    })
    .finally(() => {
        submitButton.innerText = "Kirim Permintaan Booking";
        validateTimeSelection();
    });
});