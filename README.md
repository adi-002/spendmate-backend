# SpendMate Backend API

A Node.js/Express backend API for managing personal finances and tracking transactions.

## 🚀 Tech Stack

- **Node.js** with **Express.js**
- **MongoDB** with **Mongoose**
- **JWT** for authentication
- **bcryptjs** for password hashing
- **CORS** enabled

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB instance running
- npm or yarn

## ⚙️ Installation

1. Clone the repository
```bash
git clone <repository-url>
cd spendmate-backend
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory
```env
PORT=5001
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development

# Gmail API Configuration (Optional - for email integration)
# See GMAIL_SETUP.md for detailed setup instructions
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5001/api/email/auth/callback
```

4. Start the server
```bash
# Production mode
npm start

# Development mode (with nodemon)
npm run dev
```

The server will start on `http://localhost:5001`

---

## 📚 API Documentation

### Base URL
```
http://localhost:5001
```

---

## 🔐 Authentication APIs

### 1. Register User

**Endpoint:** `POST /api/auth/register`

**Description:** Create a new user account

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** `201 Created`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "68c5967a47e30828cab23164",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:5001/api/auth/register' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword123"
}'
```

---

### 2. Login User

**Endpoint:** `POST /api/auth/login`

**Description:** Authenticate user and receive JWT token

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response:** `200 OK`
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "68c5967a47e30828cab23164",
    "email": "john@example.com",
    "name": "John Doe"
  }
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:5001/api/auth/login' \
--header 'Content-Type: application/json' \
--data-raw '{
  "email": "john@example.com",
  "password": "securepassword123"
}'
```

---

## 💰 Transaction APIs

> **Note:** All transaction endpoints require authentication. Include the JWT token in the `Authorization` header as `Bearer <token>`.

### 3. Get All Transactions

**Endpoint:** `GET /api/transactions`

**Description:** Retrieve all transactions for the authenticated user (sorted by date, newest first)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Response:** `200 OK`
```json
[
  {
    "_id": "68c59abc47e30828cab23165",
    "user": "68c5967a47e30828cab23164",
    "amount": 500,
    "currency": "INR",
    "type": "expense",
    "category": "Food",
    "date": "2026-01-17T00:00:00.000Z",
    "description": "Lunch at restaurant",
    "source": "manual",
    "metadata": {
      "vendor": "Restaurant XYZ",
      "paymentMethod": "credit card"
    },
    "createdAt": "2026-01-17T17:30:00.000Z",
    "updatedAt": "2026-01-17T17:30:00.000Z"
  }
]
```

**cURL Example:**
```bash
curl --location 'http://localhost:5001/api/transactions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 4. Create Transaction

**Endpoint:** `POST /api/transactions`

**Description:** Create a new transaction (income or expense)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "amount": 500,
  "currency": "INR",
  "type": "expense",
  "category": "Food",
  "date": "2026-01-17",
  "description": "Lunch at restaurant",
  "source": "manual",
  "metadata": {
    "vendor": "Restaurant XYZ",
    "paymentMethod": "credit card"
  }
}
```

**Field Descriptions:**
- `amount` (required): Transaction amount (Number)
- `type` (required): Either `"income"` or `"expense"`
- `currency` (optional): Currency code (default: `"INR"`)
- `category` (optional): Transaction category (String)
- `date` (optional): Transaction date (default: current date)
- `description` (optional): Transaction description (String)
- `source` (optional): Source of transaction (default: `"manual"`)
- `metadata` (optional): Additional metadata (Object)

**Response:** `201 Created`
```json
{
  "_id": "68c59abc47e30828cab23165",
  "user": "68c5967a47e30828cab23164",
  "amount": 500,
  "currency": "INR",
  "type": "expense",
  "category": "Food",
  "date": "2026-01-17T00:00:00.000Z",
  "description": "Lunch at restaurant",
  "source": "manual",
  "metadata": {
    "vendor": "Restaurant XYZ",
    "paymentMethod": "credit card"
  },
  "createdAt": "2026-01-17T17:30:00.000Z",
  "updatedAt": "2026-01-17T17:30:00.000Z"
}
```

**cURL Example (Expense):**
```bash
curl --location 'http://localhost:5001/api/transactions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data '{
  "amount": 500,
  "currency": "INR",
  "type": "expense",
  "category": "Food",
  "date": "2026-01-17",
  "description": "Lunch at restaurant",
  "source": "manual",
  "metadata": {
    "vendor": "Restaurant XYZ",
    "paymentMethod": "credit card"
  }
}'
```

**cURL Example (Income):**
```bash
curl --location 'http://localhost:5001/api/transactions' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data '{
  "amount": 50000,
  "currency": "INR",
  "type": "income",
  "category": "Salary",
  "date": "2026-01-15",
  "description": "Monthly salary",
  "source": "manual"
}'
```

---

### 5. Update Transaction

**Endpoint:** `PUT /api/transactions/:id`

**Description:** Update an existing transaction (user must own the transaction)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**URL Parameters:**
- `id`: Transaction ID

**Request Body:** (Include only fields you want to update)
```json
{
  "amount": 600,
  "description": "Updated: Dinner at restaurant",
  "category": "Dining"
}
```

**Response:** `200 OK`
```json
{
  "_id": "68c59abc47e30828cab23165",
  "user": "68c5967a47e30828cab23164",
  "amount": 600,
  "currency": "INR",
  "type": "expense",
  "category": "Dining",
  "date": "2026-01-17T00:00:00.000Z",
  "description": "Updated: Dinner at restaurant",
  "source": "manual",
  "metadata": {
    "vendor": "Restaurant XYZ",
    "paymentMethod": "credit card"
  },
  "createdAt": "2026-01-17T17:30:00.000Z",
  "updatedAt": "2026-01-17T18:00:00.000Z"
}
```

**cURL Example:**
```bash
curl --location --request PUT 'http://localhost:5001/api/transactions/68c59abc47e30828cab23165' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data '{
  "amount": 600,
  "description": "Updated: Dinner at restaurant",
  "category": "Dining"
}'
```

---

### 6. Delete Transaction

**Endpoint:** `DELETE /api/transactions/:id`

**Description:** Delete a transaction (user must own the transaction)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**URL Parameters:**
- `id`: Transaction ID

**Response:** `200 OK`
```json
{
  "message": "Deleted"
}
```

**cURL Example:**
```bash
curl --location --request DELETE 'http://localhost:5001/api/transactions/68c59abc47e30828cab23165' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## 📧 Email Integration APIs

> **Note:** Email integration requires Gmail API setup. See [GMAIL_SETUP.md](GMAIL_SETUP.md) for configuration instructions.

### 7. Get Gmail OAuth URL

**Endpoint:** `GET /api/email/auth/url`

**Description:** Get the Gmail authorization URL to connect your Gmail account

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Response:** `200 OK`
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:5001/api/email/auth/url' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Usage:**
1. Call this endpoint to get the OAuth URL
2. Open the URL in a browser
3. Grant Gmail read-only permissions
4. Copy the authorization code from the redirect URL
5. Use the code in the callback endpoint

---

### 8. Connect Gmail Account

**Endpoint:** `POST /api/email/auth/callback`

**Description:** Complete OAuth flow and save Gmail credentials

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "code": "authorization_code_from_google"
}
```

**Response:** `200 OK`
```json
{
  "message": "Gmail connected successfully",
  "emailSyncEnabled": true
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:5001/api/email/auth/callback' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN' \
--data '{
  "code": "4/0AeanS0..."
}'
```

---

### 9. Sync Emails

**Endpoint:** `POST /api/email/sync`

**Description:** Manually trigger email sync to fetch and parse transaction emails

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Query Parameters:**
- `maxResults` (optional): Maximum number of emails to fetch (default: 50)
- `after` (optional): Fetch emails after this date (format: YYYY/MM/DD)

**Response:** `200 OK`
```json
{
  "message": "Email sync completed",
  "stats": {
    "emailsProcessed": 25,
    "transactionsCreated": 18,
    "failedToParse": 7
  },
  "transactions": [
    {
      "_id": "68c5a1b2c3d4e5f6a7b8c9d0",
      "user": "68c5967a47e30828cab23164",
      "amount": 250,
      "currency": "INR",
      "type": "expense",
      "category": "Food & Dining",
      "date": "2026-01-17T00:00:00.000Z",
      "description": "Swiggy",
      "source": "email",
      "metadata": {
        "merchant": "Swiggy",
        "upiId": "swiggy@paytm",
        "refNumber": "402912345678",
        "emailSubject": "You paid Rs.250.00 to Swiggy",
        "paymentMethod": "UPI"
      },
      "createdAt": "2026-01-17T18:30:00.000Z",
      "updatedAt": "2026-01-17T18:30:00.000Z"
    }
  ]
}
```

**cURL Example:**
```bash
curl --location --request POST 'http://localhost:5001/api/email/sync?maxResults=50' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Supported Email Sources:**
- Indian banks (HDFC, ICICI, SBI, Axis, Kotak, etc.)
- Payment apps (Paytm, PhonePe, Google Pay, Amazon Pay)
- Credit card notifications
- UPI transaction alerts

---

### 10. Get Sync Status

**Endpoint:** `GET /api/email/sync/status`

**Description:** Get Gmail connection status and last sync information

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Response:** `200 OK`
```json
{
  "emailSyncEnabled": true,
  "lastEmailSync": "2026-01-17T18:30:00.000Z",
  "gmailConnected": true
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:5001/api/email/sync/status' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 11. Disconnect Gmail

**Endpoint:** `DELETE /api/email/disconnect`

**Description:** Disconnect Gmail integration and remove stored credentials

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Response:** `200 OK`
```json
{
  "message": "Gmail disconnected successfully",
  "emailSyncEnabled": false
}
```

**cURL Example:**
```bash
curl --location --request DELETE 'http://localhost:5001/api/email/disconnect' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

### 12. Get Recent Emails

**Endpoint:** `GET /api/email/emails`

**Description:** Fetch a list of recent transaction-related emails (metadata only, without parsing)

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Query Parameters:**
- `maxResults` (optional): Maximum number of emails to fetch (default: 50)
- `after` (optional): Fetch emails after this date (format: YYYY/MM/DD)

**Response:** `200 OK`
```json
{
  "count": 25,
  "emails": [
    {
      "id": "18d4f2a1b2c3d4e5",
      "subject": "You paid Rs.250.00 to Swiggy",
      "sender": "PhonePe <alerts@phonepe.com>",
      "date": "2026-01-17T14:30:00.000Z",
      "snippet": "Your payment of Rs.250.00 to Swiggy via PhonePe was successful. UPI Ref No: 402912345678"
    },
    {
      "id": "18d4f2a1b2c3d4e6",
      "subject": "Rs.1500.00 debited from your account",
      "sender": "HDFC Bank <alerts@hdfcbank.com>",
      "date": "2026-01-16T10:15:00.000Z",
      "snippet": "Dear Customer, Rs.1500.00 has been debited from your account ending 1234 on 16-Jan-26. Available balance: Rs.25000.00"
    }
  ]
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:5001/api/email/emails?maxResults=50' \
--header 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Use Case:**
- Debug which emails are being fetched
- Preview emails before syncing
- Verify email filtering is working correctly

---

## ❤️ Health Check

### 12. Health Check

**Endpoint:** `GET /health`

**Description:** Check if the server is running

**Response:** `200 OK`
```json
{
  "status": "ok"
}
```

**cURL Example:**
```bash
curl --location 'http://localhost:5001/health'
```

---

## 🔒 Authentication Flow

1. **Register** a new user using `/api/auth/register`
2. **Login** with credentials using `/api/auth/login` to receive a JWT token
3. **Include the token** in the `Authorization` header for all transaction API calls:
   ```
   Authorization: Bearer <your_jwt_token>
   ```
4. Token expires in **7 days**

---

## 📊 Transaction Types

- **income**: Money received (salary, freelance, gifts, etc.)
- **expense**: Money spent (food, bills, shopping, etc.)

---
