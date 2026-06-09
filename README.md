# ServiceSync — Real-Time Service Booking API & Dashboard

ServiceSync is a streamlined full-stack service booking platform featuring a Node.js/Express backend API, a React dashboard frontend styled with Tailwind CSS, and an immutable Solidity smart contract audit trail for booking status changes.

---

## 🌐 Live Deployments

*Please replace these placeholders with your actual deployed URLs:*
- **Frontend Dashboard (Vercel)**: `https://servicesync-delta.vercel.app`
- **Backend API Gateway (Render)**: `https://servicesync-backend-kin4.onrender.com`

---

## 🚀 Quick Start Instructions

Follow these steps to run the blockchain network, backend server, and frontend dashboard on your local machine.

### Prerequisites

Ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **MongoDB** (running locally on port `27017` or use a MongoDB Atlas URI)

---

### Step 1: Install Dependencies

From the root of the project directory, run:
```bash
npm run install:all
```
*This script automatically installs package dependencies for the root monorepo, backend, frontend, and blockchain projects.*

---

### Step 2: Start the Blockchain Node

Open a terminal window and run:
```bash
# Start a local Hardhat Ethereum node
npm run blockchain
```
*This node runs on `http://127.0.0.1:8545` (Chain ID: `1337`). You will see a list of accounts and private keys.*

---

### Step 3: Deploy the Smart Contract

Open a new terminal window and deploy the Solidity audit contract:
```bash
# Deploys the contract and logs the address
npm run deploy:contract
```
**Example output:**
```
BookingAudit contract successfully deployed!
Address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```
*Note: If the deployed address differs from `0x5FbDB2315678afecb367f032d93F642f64180aa3`, copy the address and update the `CONTRACT_ADDRESS` value in `backend/.env`.*

---

### Step 4: Run Backend & Frontend Concurrently

In a new terminal window, start both Express and Vite development servers:
```bash
npm run dev
```
- **Backend API**: Running on [http://localhost:5000](http://localhost:5000)
- **Frontend Dashboard**: Running on [http://localhost:3000](http://localhost:3000)

*Alternatively, you can run all three processes (Blockchain + Backend + Frontend) using a single command: `npm run dev:full`.*

---

## 📁 Repository Directory Structure

```
servicesync/
├── backend/
│   ├── config/             # Database connection setup
│   ├── middleware/         # JWT parsing and role guard middleware
│   ├── models/             # Mongoose schemas (User, Service, Booking, Review)
│   ├── routes/             # REST API routers
│   ├── services/           # Ethers.js blockchain connection module
│   ├── .env                # Local development variables (CORS, JWT, RPC)
│   ├── .env.example        # Env configuration template
│   ├── package.json        # Backend dependencies
│   └── server.js           # Server bootstrapper & configuration
├── blockchain/
│   ├── contracts/          # Solidity smart contracts
│   │   └── BookingAudit.sol
│   ├── scripts/            # Contract deployment scripts
│   │   └── deploy.js
│   ├── hardhat.config.js   # Hardhat development setup
│   └── package.json        # Blockchain dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable React components (Navbar, etc.)
│   │   ├── context/        # AuthContext for session management
│   │   ├── pages/          # LandingPage, AuthPages, Dashboards
│   │   ├── services/       # Axios API helper config
│   │   ├── App.jsx         # Layout structure & routes
│   │   ├── index.css       # Tailwind directives
│   │   └── main.jsx        # Bootstrap entry
│   ├── tailwind.config.js  # Styling setups
│   └── package.json        # Frontend dependencies
├── ServiceSync_Postman_Collection.json   # Imports-ready API requests collection
├── package.json            # Monorepo configuration
├── verify.js               # Diagnostic sanity compilation checks
└── README.md               # Setup and documentation manual
```

---

## ⚙️ Environment Variables (`backend/.env`)

Create a `.env` in the `backend/` folder (created automatically with defaults):
- `PORT`: Port server runs on (defaults to `5000`).
- `MONGO_URI`: Connection string to your MongoDB instance.
- `JWT_SECRET`: Token signature secret key.
- `RPC_URL`: JSON-RPC endpoint to communicate with Ethereum (defaults to `http://127.0.0.1:8545`).
- `CONTRACT_ADDRESS`: Address of the deployed `BookingAudit` contract.
- `ACTOR_PRIVATE_KEY`: Hardhat account private key used by the backend to sign transactions (uses default first account).

---

## 🔌 API Documentation

All API responses return a consistent JSON envelope structure:
```json
{
  "success": true,
  "data": { ... },
  "message": "Information status text"
}
```

### 1. Authentication Endpoints
- **`POST /api/auth/register`**: Signup a new account.
  - Body: `{ "name": "...", "email": "...", "password": "...", "role": "Customer" | "Provider" }`
- **`POST /api/auth/login`**: Authenticate and retrieve a JWT token.
  - Body: `{ "email": "...", "password": "..." }`

### 2. Service Listings Endpoints
- **`POST /api/services`**: Create a new service listing (*Providers only*).
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "title": "...", "category": "...", "price": 40, "coordinates": [lng, lat], "description": "..." }`
- **`GET /api/services`**: Retrieve paginated service listings with optional filters and geospatial sorting.
  - Query Params:
    - `page` (default: 1)
    - `limit` (default: 10)
    - `category` (optional: filter by category)
    - `longitude` & `latitude` (optional: sorts services nearest first based on coordinates!)
- **`GET /api/services/:id`**: Get full service details.
- **`PUT /api/services/:id`**: Update listing (*Service owner only*).
- **`DELETE /api/services/:id`**: Delete listing (*Service owner only*).

### 3. Bookings Endpoints
- **`POST /api/bookings`**: Book a service (*Customers only*).
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "serviceId": "..." }`
  - *Business rule: A Provider cannot book their own service.*
- **`PATCH /api/bookings/:id/status`**: Update booking status (*Service owner only*).
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "status": "confirmed" | "completed" }`
  - *Status flow enforced: pending ➔ confirmed ➔ completed. Logs update events directly on-chain.*
- **`POST /api/bookings/:id/rate`**: Review a completed booking (*Customer of booking only*).
  - Body: `{ "rating": 1-5, "comment": "..." }`
- **`GET /api/bookings/:id/audit`**: Retrieve the blockchain audit trail for this booking.
  - *Fetches the immutable ledger status history from the smart contract.*

### 4. Ratings Profile Endpoint
- **`GET /api/providers/:id/profile`**: Public endpoint aggregating the average rating and reviews list for a provider.

---

## 🔒 Blockchain Audit Trail Details

The ledger records status updates via a smart contract (`blockchain/contracts/BookingAudit.sol`):
- **Contract Type**: Solidity `BookingAudit`
- **Functionality**:
  - `recordStatusChange(string bookingId, string oldStatus, string newStatus, address actor)`: Logs status transitions, timestamps, and actor address.
  - `getAuditLogs(string bookingId)`: Returns the full array of status actions for that booking.
- **Graceful Fallback**: If the local blockchain node is not active, the backend handles the error, writes the event to a simulated mock ledger, and includes a `"mode": "mock"` key in the API response so the application flow is never disrupted.
