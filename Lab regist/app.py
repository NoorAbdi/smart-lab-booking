import os
import gspread
import smtplib
import qrcode
from io import BytesIO
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, send_file
from oauth2client.service_account import ServiceAccountCredentials
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

# --- 1. INISIALISASI DAN KONFIGURASI ---
load_dotenv()

app = Flask(__name__)

# Konfigurasi dari file .env
SHEET_ID = os.getenv("SHEET_ID")
SHEET_NAME = os.getenv("SHEET_NAME")
APP_URL = os.getenv("APP_URL")
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
SMTP_SENDER_EMAIL = os.getenv("SMTP_SENDER_EMAIL")
SMTP_SENDER_PASSWORD = os.getenv("SMTP_SENDER_PASSWORD")
LAB_HEAD_EMAIL = os.getenv("LAB_HEAD_EMAIL")

# Koneksi ke Google Sheets
scope = ['https://spreadsheets.google.com/feeds', 'https://www.googleapis.com/auth/drive']
creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
client = gspread.authorize(creds)
sheet = client.open_by_key(SHEET_ID).worksheet(SHEET_NAME)

# --- 2. FUNGSI-FUNGSI HELPER ---

def time_to_minutes(time_str):
    if isinstance(time_str, str) and ':' in time_str:
        h, m = map(int, time_str.split(':'))
        return h * 60 + m
    return 0

def send_email(to_address, subject, html_body, qr_image_bytes=None):
    """Mengirim email menggunakan SMTP."""
    msg = MIMEMultipart('related')
    msg['From'] = SMTP_SENDER_EMAIL
    msg['To'] = to_address
    msg['Subject'] = subject

    msg_alternative = MIMEMultipart('alternative')
    msg.attach(msg_alternative)

    msg_text = MIMEText(html_body, 'html')
    msg_alternative.attach(msg_text)

    if qr_image_bytes:
        qr_image = MIMEImage(qr_image_bytes, name='qrcode.png')
        qr_image.add_header('Content-ID', '<qr_code_image>')
        qr_image.add_header('Content-Disposition', 'inline', filename='qrcode.png')
        msg.attach(qr_image)

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_SENDER_EMAIL, SMTP_SENDER_PASSWORD)
            server.send_message(msg)
        print(f"Email terkirim ke {to_address}")
    except Exception as e:
        print(f"Gagal mengirim email: {e}")

# --- 3. FUNGSI UNTUK TEMPLATE EMAIL (menggantikan template di Apps Script) ---

def create_approval_email_body(data, row_id):
    approve_url = f"{APP_URL}/approve?id={row_id}"
    reject_url = f"{APP_URL}/reject?id={row_id}"
    return f"""
    <p>Ada permintaan booking lab baru dengan detail:</p>
    <ul>
      <li><b>Nama:</b> {data['nama']}</li>
      <li><b>ID:</b> {data['idPengguna']}</li>
      <li><b>Email:</b> {data['emailPengguna']}</li>
      <li><b>Tanggal:</b> {data['tanggalBooking']}</li>
      <li><b>Waktu:</b> {data['waktuMulai']} - {data['waktuSelesai']}</li>
    </ul>
    <p>Silakan setujui atau tolak permintaan ini:</p>
    <a href="{approve_url}" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">SETUJUI</a>
    <a href="{reject_url}" style="background-color: #dc3545; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-left: 10px;">TOLAK</a>
    """

def create_approved_email_body(data):
    return f"""
    <html><body>
      <h2>Halo {data['nama']},</h2>
      <p>Kabar baik! Permintaan booking lab Anda untuk jadwal berikut telah disetujui:</p>
      <ul>
        <li><b>Tanggal:</b> {datetime.strptime(data['tanggalBooking'], '%Y-%m-%d').strftime('%d/%m/%Y')}</li>
        <li><b>Waktu:</b> {data['waktuMulai']} - {data['waktuSelesai']}</li>
      </ul>
      <p>Silakan pindai (scan) QR Code di bawah ini pada perangkat yang tersedia di lab untuk melakukan check-in.</p>
      <div style="padding: 20px;"><img src="cid:qr_code_image" alt="QR Code untuk Check-in"></div>
      <p>Terima kasih.</p>
    </body></html>
    """

def create_rejected_email_body(data):
    return f"""
    <h2>Halo {data['nama']},</h2>
    <p>Mohon maaf, permintaan booking lab Anda untuk jadwal berikut tidak dapat disetujui saat ini:</p>
    <ul>
       <li><b>Tanggal:</b> {datetime.strptime(data['tanggalBooking'], '%Y-%m-%d').strftime('%d/%m/%Y')}</li>
       <li><b>Waktu:</b> {data['waktuMulai']} - {data['waktuSelesai']}</li>
    </ul>
    <p>Silakan hubungi administrasi lab untuk informasi lebih lanjut.</p>
    <p>Terima kasih.</p>
    """

# --- 4. ENDPOINTS / ROUTES (menggantikan doGet dan doPost) ---

@app.route('/getBookedSlots', methods=['GET'])
def get_booked_slots():
    """Endpoint untuk mengambil jadwal yang sudah terisi pada tanggal tertentu."""
    try:
        tanggal = request.args.get('tanggal')
        if not tanggal:
            return jsonify({'status': 'gagal', 'message': 'Parameter tanggal tidak ditemukan'}), 400

        all_records = sheet.get_all_records()
        booked_slots = []
        for record in all_records:
            status = record.get('Status')
            # Memastikan tanggal cocok dan status valid
            if str(record.get('Tanggal Booking')) == tanggal and (status == "Disetujui" or status == "Menunggu Persetujuan"):
                booked_slots.append({
                    'start': record.get('Waktu Mulai'),
                    'end': record.get('Waktu Selesai')
                })
        return jsonify({'status': 'sukses', 'data': booked_slots})
    except Exception as e:
        return jsonify({'status': 'gagal', 'message': f"Terjadi kesalahan: {e}"}), 500

@app.route('/', methods=['POST'])
def handle_form_submission():
    """Endpoint untuk menerima data dari formulir pendaftaran."""
    try:
        data = request.form.to_dict()
        
        # Validasi sisi server
        all_records = sheet.get_all_records()
        new_start = time_to_minutes(data['waktuMulai'])
        new_end = time_to_minutes(data['waktuSelesai'])

        for record in all_records:
            status = record.get('Status')
            if str(record.get('Tanggal Booking')) == data['tanggalBooking'] and (status == "Disetujui" or status == "Menunggu Persetujuan"):
                existing_start = time_to_minutes(record.get('Waktu Mulai'))
                existing_end = time_to_minutes(record.get('Waktu Selesai'))
                if new_start < existing_end and existing_start < new_end:
                    return jsonify({'status': 'gagal', 'message': 'Jadwal pada jam tersebut sudah terisi.'})
        
        # Jika lolos validasi, simpan ke sheet
        import uuid
        row_id = str(uuid.uuid4())
        new_row = [
            datetime.now().isoformat(), data['nama'], data['idPengguna'], data['emailPengguna'],
            data['tanggalBooking'], data['waktuMulai'], data['waktuSelesai'],
            "Menunggu Persetujuan", row_id
        ]
        sheet.append_row(new_row, value_input_option='USER_ENTERED')
        
        # Kirim email persetujuan ke kepala lab
        email_body = create_approval_email_body(data, row_id)
        send_email(LAB_HEAD_EMAIL, f"Permintaan Booking Lab Baru: {data['nama']}", email_body)
        
        return jsonify({'status': 'sukses', 'message': 'Permintaan booking terkirim!'})

    except Exception as e:
        return jsonify({'status': 'gagal', 'message': f'Terjadi kesalahan server: {e}'}), 500

@app.route('/<action>', methods=['GET'])
def handle_action(action):
    """Endpoint untuk menangani aksi approve, reject, dan check-in."""
    row_id = request.args.get('id')
    if not row_id:
        return "Error: ID tidak ditemukan.", 400

    try:
        cell = sheet.find(row_id)
        if not cell:
            return "Error: Data booking tidak ditemukan.", 404
        
        target_row = sheet.row_values(cell.row)
        user_data = {
            'nama': target_row[1],
            'emailPengguna': target_row[3],
            'tanggalBooking': target_row[4],
            'waktuMulai': target_row[5],
            'waktuSelesai': target_row[6]
        }
        
        if action == 'approve':
            sheet.update_cell(cell.row, 8, "Disetujui")
            # Buat QR Code
            checkin_url = f"{APP_URL}/checkin?id={row_id}"
            qr_img = qrcode.make(checkin_url)
            img_bytes = BytesIO()
            qr_img.save(img_bytes, format='PNG')
            img_bytes.seek(0)
            # Kirim email
            email_body = create_approved_email_body(user_data)
            send_email(user_data['emailPengguna'], "Booking Lab Anda Telah Disetujui!", email_body, qr_image_bytes=img_bytes.read())
            return f"<h1>Konfirmasi Tindakan</h1><p>Booking untuk {user_data['nama']} telah DISETUJUI.</p>"
            
        elif action == 'reject':
            sheet.update_cell(cell.row, 8, "Ditolak")
            email_body = create_rejected_email_body(user_data)
            send_email(user_data['emailPengguna'], "Permintaan Booking Lab Anda Ditolak", email_body)
            return f"<h1>Konfirmasi Tindakan</h1><p>Booking untuk {user_data['nama']} telah DITOLAK.</p>"

        elif action == 'checkin':
            sheet.update_cell(cell.row, 8, "Datang")
            tanggal = datetime.strptime(user_data['tanggalBooking'], '%Y-%m-%d').strftime('%d/%m/%Y')
            return f"Check-in Berhasil!<br><br>Nama: {user_data['nama']}<br>Jadwal: {tanggal}, {user_data['waktuMulai']} - {user_data['waktuSelesai']}"
        
        else:
            return "Aksi tidak valid.", 400

    except Exception as e:
        return f"Terjadi kesalahan: {e}", 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)