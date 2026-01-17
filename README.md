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

## ❤️ Health Check

### 7. Health Check

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
