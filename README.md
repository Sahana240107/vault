# VaultMERN

VaultMERN is a full-stack digital product ownership vault for storing bills, warranty cards, service records, and shared household product data in one place. It combines AI-powered document scanning, cloud file storage, warranty reminders, and collaborative vault access to help users manage their purchases after checkout.

## Live Demo

- Frontend: [https://vault-bay-eight.vercel.app](https://vault-bay-eight.vercel.app)
- Backend API: [https://vault-10u8.onrender.com](https://vault-10u8.onrender.com)

## Highlights

- Secure authentication with JWT-based login and registration
- AI-assisted bill scanning with automatic product field extraction
- Cloudinary-backed storage for bills, PDFs, avatars, and warranty cards
- Warranty expiry tracking with scheduled reminders
- Real-time notifications using Socket.IO
- Shared vaults with owner, editor, and viewer roles
- Product history with bills, warranty documents, and service logs
- Geo-based service center support
- Responsive React frontend deployed on Vercel
- Node.js + Express backend deployed on Render

## Tech Stack

### Frontend

- React 19
- Vite
- React Router
- Socket.IO Client

### Backend

- Node.js
- Express
- MongoDB Atlas + Mongoose
- Socket.IO
- Multer
- Cloudinary
- Groq API
- Tesseract.js
- Nodemailer
- node-cron

## Core Features

### 1. Digital Product Vault

Users can create and manage vaults that hold all of their owned products. Each product can store:

- product name, brand, category, and notes
- purchase date and purchase price
- serial number
- warranty expiry date
- bill image or bill PDF
- separate warranty card file
- service history records

### 2. AI Bill Scanning

The app supports uploading receipt images and PDFs. For image uploads, the backend:

- uploads the file to Cloudinary
- runs OCR and structured extraction with Groq Vision
- falls back to Tesseract and text parsing when needed
- returns extracted values such as name, brand, category, purchase date, price, warranty expiry, and serial number

This helps users auto-fill product information instead of entering everything manually.

### 3. Warranty Reminders

VaultMERN runs a daily warranty checker job that:

- finds products nearing expiry
- respects each user's selected reminder windows
- creates in-app notifications
- pushes real-time alerts through Socket.IO
- sends email reminders where configured

### 4. Shared Vault Collaboration

Vaults can be shared with other registered users. Roles include:

- `owner`
- `editor`
- `viewer`

This allows families or teams to manage products together while preserving edit permissions.

### 5. Document History

Users can open a document vault view to:

- preview stored bills and warranty cards
- upload missing warranty cards later
- export product documentation reports
- track which items still need documents

## Project Structure

```text
vault/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── server/
│       ├── config/
│       ├── controllers/
│       ├── jobs/
│       ├── middleware/
│       ├── models/
│       ├── routes/
│       ├── services/
│       └── utils/
└── frontend/
    ├── package.json
    └── src/
        ├── components/
        ├── context/
        ├── pages/
        └── services/
```

## Database Design

MongoDB Atlas stores the application data in collections modeled around the product vault workflow:

- `users`
- `vaults`
- `vaultmembers`
- `products`
- `servicehistories`
- `notifications`
- `servicecenters`

At a high level:

- a user can belong to multiple vaults through `vaultmembers`
- a vault contains multiple products
- a product can have multiple service history entries
- notifications are generated per user and optionally linked to products
- uploaded files are stored in Cloudinary, while MongoDB stores only their URLs

## API Overview

The Express backend exposes routes for:

- `/api/auth`
- `/api/vaults`
- `/api/products`
- `/api/products/:id/service`
- `/api/upload`
- `/api/notifications`
- `/api/geo`

Health check:

- `/api/health`

## Environment Variables

### Backend

Create `backend/.env` with the following values:

```env
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

GROQ_API_KEY=your_groq_api_key

SMTP_HOST=your_smtp_host
SMTP_PORT=your_smtp_port
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173

PORT=5000
```

### Frontend

Create `frontend/.env` with:

```env
VITE_API_URL=http://localhost:5000
```

For production:

- `VITE_API_URL=https://vault-10u8.onrender.com`
- `CLIENT_URL=https://vault-bay-eight.vercel.app`
- `FRONTEND_URL=https://vault-bay-eight.vercel.app`

## Local Development

### 1. Clone the repository

```bash
git clone https://github.com/Sahana240107/vault.git
cd vault
```

### 2. Install dependencies

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 3. Start the backend

```bash
cd backend
npm run dev
```

### 4. Start the frontend

```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173` and backend runs on `http://localhost:5000`.

## Deployment

### Frontend

- Hosted on Vercel
- Build command: `npm run build`
- Required env var: `VITE_API_URL=https://vault-10u8.onrender.com`

### Backend

- Hosted on Render
- Start command: `npm start`
- Must include correct production CORS settings:

```env
CLIENT_URL=https://vault-bay-eight.vercel.app
FRONTEND_URL=https://vault-bay-eight.vercel.app
```

## How File Storage Works

- Users upload bills, warranty cards, and avatars through the backend
- Multer keeps uploads in memory temporarily
- Files are streamed to Cloudinary
- The backend stores the returned `secure_url`
- Product documents are saved in MongoDB as:
  - `billImageUrl`
  - `billPdfUrl`
  - `warrantyCardUrl`

This keeps MongoDB lightweight while storing documents in a CDN-friendly cloud asset service.

## Roadmap Ideas

- password reset flow
- stronger session management and device revocation
- dashboard charts backed by aggregated analytics endpoints
- document deletion and Cloudinary asset cleanup
- better PDF parsing support for bills
- automated tests for API and UI flows

## Author

Built by [Sahana240107](https://github.com/Sahana240107)

