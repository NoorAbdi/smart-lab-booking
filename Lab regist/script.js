// =================================================================
// KONFIGURASI - PASTE URL WEB APP BARU ANDA DARI GOOGLE
// =================================================================
const SCRIPT_URL = "http://127.0.0.1:5000";

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

// --- Fungsi untuk mengubah string waktu (HH:mm) menjadi menit dari tengah malam ---
function timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

// --- Fungsi untuk mengambil data booking yang sudah disetujui dari server ---
async function fetchBookedSlots(date) {
    if (!date) {
        bookedSlotsForSelectedDate = [];
        populateTimeSlots(); // Kosongkan dan reset jika tanggal dikosongkan
        return;
    }
    
    statusMessage.innerText = "Mengecek jadwal yang tersedia...";
    statusMessage.className = '';
    submitButton.disabled = true;

    try {
        const response = await fetch(`${SCRIPT_URL}?action=getBookedSlots&tanggal=${date}`);
        const result = await response.json();
        
        if (result.status === 'sukses') {
            bookedSlotsForSelectedDate = result.data.map(slot => ({
                start: timeToMinutes(slot.start),
                end: timeToMinutes(slot.end)
            }));
            statusMessage.innerText = "Jadwal berhasil dimuat. Silakan pilih waktu.";
            statusMessage.className = 'status-sukses';
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        statusMessage.innerText = `Gagal memuat jadwal: ${error.message}`;
        statusMessage.className = 'status-gagal';
        bookedSlotsForSelectedDate = []; // Reset jika terjadi error
    } finally {
        populateTimeSlots(); // Perbarui dropdown waktu
    }
}

// --- Fungsi untuk mengisi dan mengunci dropdown waktu ---
function populateTimeSlots() {
    const selectedStartTime = waktuMulaiSelect.value;
    const selectedEndTime = waktuSelesaiSelect.value;

    waktuMulaiSelect.innerHTML = '<option value="">Pilih Waktu</option>';
    waktuSelesaiSelect.innerHTML = '<option value="">Pilih Waktu</option>';

    const startTime = 8 * 60; // 08:00 dalam menit
    const endTime = 17 * 60; // 17:00 dalam menit
    const interval = 30;

    for (let i = startTime; i <= endTime; i += interval) {
        const hours = Math.floor(i / 60).toString().padStart(2, '0');
        const minutes = (i % 60).toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        const currentTimeInMinutes = i;
        
        let isBooked = false;
        for (const slot of bookedSlotsForSelectedDate) {
            if (currentTimeInMinutes >= slot.start && currentTimeInMinutes < slot.end) {
                isBooked = true;
                break;
            }
        }
        
        if (i < endTime) {
             const startOption = new Option(timeString, timeString);
             if (isBooked) {
                 startOption.disabled = true;
                 startOption.innerText = `${timeString} (Booked)`;
             }
             waktuMulaiSelect.add(startOption);
        }

        if (i > startTime) {
            let isEndBooked = false;
            for (const slot of bookedSlotsForSelectedDate) {
                if (currentTimeInMinutes > slot.start && currentTimeInMinutes <= slot.end) {
                    isEndBooked = true;
                    break;
                }
            }
            const endOption = new Option(timeString, timeString);
             if (isEndBooked) {
                 endOption.disabled = true;
                 endOption.innerText = `${timeString} (Booked)`;
             }
            waktuSelesaiSelect.add(endOption);
        }
    }
    
    waktuMulaiSelect.value = selectedStartTime;
    waktuSelesaiSelect.value = selectedEndTime;
    
    validateTimeSelection();
}

// --- Fungsi untuk validasi durasi dan tumpang tindih ---
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

    if (duration <= 0 || duration > 120) {
        statusMessage.innerText = 'Durasi booking maksimal 2 jam dan waktu selesai harus setelah waktu mulai.';
        statusMessage.className = 'status-gagal';
        submitButton.disabled = true;
        return;
    }

    for (const slot of bookedSlotsForSelectedDate) {
        if (startTimeInMinutes < slot.end && endTimeInMinutes > slot.start) {
            statusMessage.innerText = 'Waktu yang Anda pilih tumpang tindih dengan jadwal lain.';
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
    const today = new Date().toISOString().split('T')[0];
    tanggalBookingInput.setAttribute('min', today);
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
            tanggalBookingInput.value = '';
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
        submitButton.disabled = false;
        submitButton.innerText = "Kirim Permintaan Booking";
    });
});