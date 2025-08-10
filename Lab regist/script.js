// --- KONFIGURASI ---
const BASE_URL = "http://127.0.0.1:5000";

// --- ELEMEN DOM ---
const form = document.getElementById('bookingForm');
const statusMessage = document.getElementById('statusMessage');
const submitButton = document.getElementById('submitButton');
const namaInput = document.getElementById('nama');
const idInput = document.getElementById('idPengguna');
const emailInput = document.getElementById('emailPengguna');
const tanggalBookingInput = document.getElementById('tanggalBooking');
const waktuMulaiSelect = document.getElementById('waktuMulai');
const waktuSelesaiSelect = document.getElementById('waktuSelesai');
const purposeSelect = document.getElementById('bookingPurpose');
const otherPurposeContainer = document.getElementById('other-purpose-container');
const otherPurposeInput = document.getElementById('otherPurpose');

let bookedSlotsForSelectedDate = [];

// --- FUNGSI HELPER ---
function timeToMinutes(time) {
    if (typeof time !== 'string' || !time.includes(':')) return 0;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

async function fetchBookedSlots(date) { /* ... (tidak berubah dari sebelumnya) ... */ }
function populateTimeSlots() { /* ... (tidak berubah dari sebelumnya) ... */ }

// ======================================================================
// FUNGSI VALIDASI BARU: Diperbarui dengan pengecekan spesifik
// ======================================================================
function validateForm() {
    let allValid = true;
    let message = 'Time slot is available. Ready to submit.';

    // 1. Validasi Nama (hanya huruf dan spasi)
    const nameRegex = /^[A-Za-z\s]+$/;
    if (namaInput.value.trim() !== '' && !nameRegex.test(namaInput.value)) {
        message = 'Name can only contain letters and spaces.';
        allValid = false;
    }

    // 2. Validasi ID (hanya angka)
    const idRegex = /^[0-9]+$/;
    if (idInput.value.trim() !== '' && !idRegex.test(idInput.value)) {
        message = 'NIM / User ID can only contain numbers.';
        allValid = false;
    }

    // 3. Validasi Email (harus berdomain @my.sampoernauniversity.ac.id)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@my\.sampoernauniversity\.ac\.id$/;
    if (emailInput.value.trim() !== '' && !emailRegex.test(emailInput.value)) {
        message = 'Email must use @my.sampoernauniversity.ac.id domain.';
        allValid = false;
    }

    // 4. Validasi isian wajib lainnya
    const isNamaFilled = namaInput.value.trim() !== '';
    const isIdFilled = idInput.value.trim() !== '';
    const isEmailFilled = emailInput.value.trim() !== '';
    const isTanggalFilled = tanggalBookingInput.value !== '';
    const isWaktuMulaiFilled = waktuMulaiSelect.value !== '';
    const isWaktuSelesaiFilled = waktuSelesaiSelect.value !== '';
    const isPurposeFilled = purposeSelect.value !== '';
    
    let isOtherPurposeValid = true;
    if (purposeSelect.value === 'Other') {
        isOtherPurposeValid = otherPurposeInput.value.trim() !== '';
    }

    // 5. Validasi Durasi Waktu
    let isTimeDurationValid = false;
    if (isWaktuMulaiFilled && isWaktuSelesaiFilled) {
        const startTimeInMinutes = timeToMinutes(waktuMulaiSelect.value);
        const endTimeInMinutes = timeToMinutes(waktuSelesaiSelect.value);
        const duration = endTimeInMinutes - startTimeInMinutes;
        if (duration <= 0 || duration > 120) {
            allValid = false;
            message = 'End time must be after start time and duration max 2 hours.';
        } else {
            isTimeDurationValid = true;
        }
    }

    // Cek semua kondisi
    if (allValid && isNamaFilled && isIdFilled && isEmailFilled && isTanggalFilled && isWaktuMulaiFilled && isWaktuSelesaiFilled && isPurposeFilled && isOtherPurposeValid && isTimeDurationValid) {
        submitButton.disabled = false;
        statusMessage.innerText = message;
        statusMessage.className = 'status-sukses';
    } else {
        submitButton.disabled = true;
        // Tampilkan pesan error pertama yang ditemukan jika ada isian
        if (isNamaFilled || isIdFilled || isEmailFilled) {
             statusMessage.innerText = message;
             statusMessage.className = 'status-gagal';
        }
    }
}

// --- EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    tanggalBookingInput.setAttribute('min', todayStr);
    populateTimeSlots();
});

tanggalBookingInput.addEventListener('change', function() {
    fetchBookedSlots(this.value).finally(() => {
        validateForm();
    });
});

form.addEventListener('input', validateForm);

purposeSelect.addEventListener('change', function() {
    if (this.value === 'Other') {
        otherPurposeContainer.classList.remove('hidden');
        otherPurposeInput.required = true;
    } else {
        otherPurposeContainer.classList.add('hidden');
        otherPurposeInput.required = false;
        otherPurposeInput.value = '';
    }
    validateForm();
});

form.addEventListener('submit', function(e) { /* ... (tidak berubah dari sebelumnya) ... */ });

// KODE LENGKAP UNTUK FUNGSI YANG DISINGKAT
async function fetchBookedSlots(date) {
    if (!date) {
        bookedSlotsForSelectedDate = [];
        populateTimeSlots();
        return;
    }
    statusMessage.innerText = "Checking schedule...";
    statusMessage.className = '';
    submitButton.disabled = true;
    try {
        const response = await fetch(`${BASE_URL}/api/getBookedSlots?tanggal=${date}`);
        const result = await response.json();
        if (result.status === 'sukses') {
            bookedSlotsForSelectedDate = result.data.map(slot => ({
                start: timeToMinutes(slot.start),
                end: timeToMinutes(slot.end)
            }));
            statusMessage.innerText = "Schedule loaded. Please select a time.";
            statusMessage.className = 'status-sukses';
        } else { throw new Error(result.message || 'Failed to fetch data.'); }
    } catch (error) {
        console.error('Error fetching booked slots:', error);
        statusMessage.innerText = `Failed to load schedule. Please try again later.`;
        statusMessage.className = 'status-gagal';
        bookedSlotsForSelectedDate = [];
    } finally {
        populateTimeSlots();
    }
}
function populateTimeSlots() {
    const lastSelectedStart = waktuMulaiSelect.value;
    const lastSelectedEnd = waktuSelesaiSelect.value;
    waktuMulaiSelect.innerHTML = '<option value="">Select Time</option>';
    waktuSelesaiSelect.innerHTML = '<option value="">Select Time</option>';
    const startTime = 8 * 60, endTime = 17 * 60, interval = 30;
    for (let i = startTime; i <= endTime; i += interval) {
        const hours = Math.floor(i / 60).toString().padStart(2, '0');
        const minutes = (i % 60).toString().padStart(2, '0');
        const timeString = `${hours}:${minutes}`;
        let isBooked = false;
        for (const slot of bookedSlotsForSelectedDate) {
            if (i >= slot.start && i < slot.end) { isBooked = true; break; }
        }
        if (i < endTime) {
            const startOption = new Option(isBooked ? `${timeString} (Booked)`: timeString, timeString);
            startOption.disabled = isBooked;
            waktuMulaiSelect.add(startOption);
        }
        if (i > startTime) {
            const endOption = new Option(timeString, timeString);
            let isEndBooked = false;
            for (const slot of bookedSlotsForSelectedDate) {
                if (i > slot.start && i <= slot.end) { isEndBooked = true; break; }
            }
            if(isEndBooked) {
                endOption.disabled = true;
                endOption.innerText = `${timeString} (Booked)`;
            }
            waktuSelesaiSelect.add(endOption);
        }
    }
    waktuMulaiSelect.value = lastSelectedStart;
    waktuSelesaiSelect.value = lastSelectedEnd;
    validateForm();
}
form.addEventListener('submit', function(e) {
    e.preventDefault();
    validateForm(); 
    if (submitButton.disabled) {
        alert('Please fill in all required fields correctly before submitting.');
        return;
    }
    submitButton.disabled = true;
    submitButton.innerText = "Sending...";
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
            otherPurposeContainer.classList.add('hidden');
            otherPurposeInput.required = false;
            bookedSlotsForSelectedDate = [];
            populateTimeSlots();
        }
    })
    .catch(error => {
        console.error('Error:', error);
        statusMessage.innerText = 'An error occurred! Failed to connect to the server.';
        statusMessage.className = 'status-gagal';
    })
    .finally(() => {
        submitButton.innerText = "Send Booking Request";
        validateForm();
    });
});