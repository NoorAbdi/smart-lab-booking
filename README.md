# Smart Lab Booking System

A high-code web application designed for efficient lab management in academic environments.

## Features

- **QR Code Check-In**  
  Streamlined and secure user authentication using QR codes.

- **Conflict Detection**  
  Automatically detects overlapping bookings to prevent schedule conflicts.

- **Role-Based Access Control**  
  Different access levels for admins, lab assistants, and students.

- **Microsoft Teams Calendar Integration**  
  Syncs lab bookings with Microsoft Teams for centralized scheduling and reminders.

## Tech Stack

- Frontend: React.js with Vite
- Backend: Node.js + Express.js
- Database: PostgreSQL via Supabase
- Hosting (Frontend): Vercel
- Hosting (Backend): Render
- QR Code Generation: qrcode npm package
- QR Code Scanner (PC): html5-qrcode (JS Library)
- Authentication: Supabase
- Calendar Integration: Microsoft Graph API
- Version Control: Github

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/smart-lab-booking.git
2. Navigate to the project directory:
   ```
   cd smart-lab-booking
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Configure environment variables:
   
- Create a .env file based on .env.example
- Add your Firebase and Microsoft Graph API credentials

5. Start the development server:
   ```
   npm run dev
   ```
## Usage
- Admins can manage lab schedules, users, and approve bookings.
- Students can request bookings and check in via QR code.
- All bookings are reflected in the integrated Teams calendar.
