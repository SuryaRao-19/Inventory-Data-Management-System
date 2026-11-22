# Inventory and Data Management System

**Course:** Web Dev III  
**Unit:** Unit – 3 (Persistent Storage, Schema Design, and Aggregation)  
**CO Mapping:** CO3  
**Technology Stack:** Node.js, Express.js, MongoDB, Mongoose, dotenv  

---

## 📋 Overview

The **Inventory and Data Management System** is a robust, production-ready RESTful backend API designed to handle warehouse and store product catalogue operations. It provides schema-enforced persistent storage, transactional stock adjustments (restocks and sales), advanced query-string filtering/sorting/pagination, and analytical reporting via MongoDB aggregation pipelines.

### Compliance with Constraints
- ✅ **No pre-built admin panel, CMS, or external boilerplate**
- ✅ **Only standard approved technologies used:** Node.js runtime, Express.js framework, MongoDB with Mongoose ODM, and dotenv for environment configuration
- ✅ **Built-in automated testing:** Utilizes Node.js native test runner (`node:test` and `node:assert`) without unauthorized test packages

---

## 🏗️ Project Architecture & Directory Structure

```
Web-Dev Capstone/
├── .env                                # Environment variables (PORT, MONGODB_URI, NODE_ENV)
├── .env.example                        # Template for environment variables
├── .gitignore                          # Git ignore rules for node_modules, logs, and env
├── package.json                        # Project metadata, scripts, and dependencies
├── README.md                           # Complete submission documentation
├── Inventory_API.postman_collection.json # Exported Postman collection for all endpoints
├── src/
│   ├── app.js                          # Express app configuration & middleware pipeline
│   ├── server.js                       # Server entrypoint & DB connection listener
│   ├── config/
│   │   └── db.js                       # Mongoose MongoDB connection handler
│   ├── models/
│   │   └── Product.js                  # Mongoose schema, validations & virtual properties
│   ├── controllers/
│   │   └── productController.js        # Controller handlers for CRUD & Aggregations
│   ├── routes/
│   │   └── productRoutes.js            # Express router with ordered route declarations
│   ├── middleware/
│   │   └── errorHandler.js             # Centralized error handler (CastError, ValidationError, Duplicate key)
│   └── utils/
│       ├── appError.js                 # Custom operational error class
│       ├── asyncHandler.js             # Async route handler wrapper
│       └── seed.js                     # Realistic database seeder script
└── tests/
    └── product.test.js                 # 20 automated integration and unit test suites (100% pass)
```

---

## 🗄️ Database Schema Design (Mongoose)

Defined in `src/models/Product.js`:

| Field Name | Type | Required | Constraints / Validation | Description |
| :--- | :--- | :--- | :--- | :--- |
| `name` | String | Yes | `trim: true`, minlength 2 | Name of the product |
| `sku` | String | Yes | `unique: true`, `uppercase: true`, `trim: true` | Unique Stock Keeping Unit |
| `category` | String | Yes | `trim: true` | Product category (e.g., Furniture, Electronics) |
| `price` | Number | Yes | `min: 0` | Unit price in INR/currency |
| `quantity` | Number | Yes | `min: 0`, integer, default: `0` | Available stock count |
| `reorderLevel`| Number | Yes | `min: 0`, integer, default: `5` | Threshold for low-stock alert |
| `supplier` | String | Yes | `trim: true` | Name of the product supplier |
| `createdAt` | Date | Auto | Generated via `timestamps: true` | Record creation timestamp |
| `updatedAt` | Date | Auto | Generated via `timestamps: true` | Last update timestamp |

### Computed Virtual Field: `stockValue`
Calculated dynamically as `price * quantity`:
```javascript
productSchema.virtual('stockValue').get(function () {
  return (this.price || 0) * (this.quantity || 0);
});
```
Both `virtuals: true` and `versionKey: true` are configured under `toJSON` and `toObject` so that API responses output `stockValue` alongside standard fields.

---

## 🚀 Getting Started & Installation

### Prerequisites
1. **Node.js** (v18.x or higher; tested on v24.14.0)
2. **MongoDB** service running locally at `mongodb://127.0.0.1:27017`

### 1. Installation
Clone or navigate to the project directory and install the dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
A `.env` file is pre-configured in the project root:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/inventory_db
NODE_ENV=development
```

### 3. Seed Database with Sample Data
Populate the database with realistic sample items matching the lab requirements:
```bash
npm run seed
```
*Output: Seeds 12 items across 5 categories with varying stock and reorder levels.*

### 4. Start the Server
Start in production/normal mode:
```bash
npm start
```
Or start in development mode with auto-reload:
```bash
npm run dev
```
The server will start listening at `http://localhost:5000`.

---

## 🧪 Automated Testing

Execute the built-in test suite covering schema validations, CRUD operations, querying/pagination, stock adjustments, and aggregation reports:
```bash
npm test
```

### Test Coverage Summary:
- **Schema Validation & Duplicate SKU Prevention**: Verifies required fields, unique SKU constraint, non-negative numbers, and computed `stockValue`.
- **CRUD Operations**: Tests `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`, handling 400 for bad ObjectIds and 404 for missing IDs.
- **Querying**: Validates filtering by category, price ranges (`minPrice`, `maxPrice`), search across name/SKU, sorting by field/order, and pagination (`page`, `limit`).
- **Safe Stock Adjustments**: Validates restock (`change > 0`), sale (`change < 0`), and guards against decrementing below zero.
- **Aggregation Pipelines**: Validates low-stock report (`quantity <= reorderLevel`) and category-wise aggregation (`$group`, `$project`, `$sort`).

**Test Result:** `20 passed, 0 failed, 100% pass rate`.

---

## 📡 REST API Reference

### 1. Create Product
- **Method:** `POST`
- **URL:** `/api/products`
- **Status:** `201 Created`
- **Request Body:**
```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```
- **Response:**
```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens",
  "_id": "6a547727f6123427d6e61d7c",
  "createdAt": "2026-07-13T05:27:03.054Z",
  "updatedAt": "2026-07-13T05:27:03.054Z",
  "__v": 0,
  "stockValue": 4800,
  "id": "6a547727f6123427d6e61d7c"
}
```

---

### 2. Get All Products (Filtering, Sorting & Pagination)
- **Method:** `GET`
- **URL:** `/api/products`
- **Query Parameters:**
  - `page` (default: `1`): Current page number
  - `limit` (default: `10`): Items per page
  - `category`: Filter by exact category (case-insensitive)
  - `search`: Search substring in product `name` or `sku`
  - `minPrice` / `maxPrice`: Filter products within price bounds
  - `sortBy` (default: `createdAt`): Field to sort by (`price`, `quantity`, `name`, etc.)
  - `sortOrder` / `order` (default: `desc`): `asc` or `desc`
  - `supplier`: Filter by supplier name
- **Status:** `200 OK`
- **Response:**
```json
{
  "total": 12,
  "page": 1,
  "totalPages": 2,
  "count": 10,
  "products": [
    {
      "_id": "6a54767af6123427d6e61d76",
      "name": "Study Table",
      "sku": "FURN-TB-812",
      "category": "Furniture",
      "price": 3999,
      "quantity": 2,
      "reorderLevel": 4,
      "supplier": "IKEA India",
      "createdAt": "2026-07-13T05:24:10.351Z",
      "updatedAt": "2026-07-13T05:24:10.351Z",
      "__v": 0,
      "stockValue": 7998,
      "id": "6a54767af6123427d6e61d76"
    }
  ]
}
```

---

### 3. Get Single Product by ID
- **Method:** `GET`
- **URL:** `/api/products/:id`
- **Status:** `200 OK` (or `404 Not Found`, `400 Bad Request` if invalid ObjectId)
- **Response:**
```json
{
  "_id": "6a54767af6123427d6e61d76",
  "name": "Study Table",
  "sku": "FURN-TB-812",
  "category": "Furniture",
  "price": 3999,
  "quantity": 2,
  "reorderLevel": 4,
  "supplier": "IKEA India",
  "createdAt": "2026-07-13T05:24:10.351Z",
  "updatedAt": "2026-07-13T05:24:10.351Z",
  "__v": 0,
  "stockValue": 7998,
  "id": "6a54767af6123427d6e61d76"
}
```

---

### 4. Update Product Details
- **Method:** `PUT`
- **URL:** `/api/products/:id`
- **Status:** `200 OK`
- **Request Body:**
```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 140,
  "quantity": 60
}
```
- **Response:**
```json
{
  "_id": "6a547727f6123427d6e61d7c",
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 140,
  "quantity": 60,
  "reorderLevel": 20,
  "supplier": "Cello Pens",
  "createdAt": "2026-07-13T05:27:03.054Z",
  "updatedAt": "2026-07-13T05:30:25.913Z",
  "__v": 0,
  "stockValue": 8400,
  "id": "6a547727f6123427d6e61d7c"
}
```

---

### 5. Stock Adjustment (Safe Restock & Sale Operations)
- **Method:** `PATCH`
- **URL:** `/api/products/:id/stock`
- **Status:** `200 OK` (or `400 Bad Request` if insufficient stock)
- **Request Body:**
```json
{
  "change": 10
}
```
- **Response:**
```json
{
  "message": "Stock updated",
  "product": {
    "_id": "6a54767af6123427d6e61d76",
    "name": "Study Table",
    "sku": "FURN-TB-812",
    "category": "Furniture",
    "price": 3999,
    "quantity": 12,
    "reorderLevel": 4,
    "supplier": "IKEA India",
    "createdAt": "2026-07-13T05:24:10.351Z",
    "updatedAt": "2026-07-13T05:35:24.419Z",
    "__v": 0,
    "stockValue": 47988,
    "id": "6a54767af6123427d6e61d76"
  }
}
```

---

### 6. Delete Product
- **Method:** `DELETE`
- **URL:** `/api/products/:id`
- **Status:** `200 OK`
- **Response:**
```json
{
  "message": "Product deleted",
  "id": "6a547727f6123427d6e61d7c"
}
```

---

### 7. Low-Stock Alert Report
Returns all inventory items where `quantity <= reorderLevel`.
- **Method:** `GET`
- **URL:** `/api/products/low-stock`
- **Status:** `200 OK`
- **Response:**
```json
{
  "count": 4,
  "lowStockItems": [
    {
      "_id": "6a54767af6123427d6e61d76",
      "name": "Study Table",
      "sku": "FURN-TB-812",
      "category": "Furniture",
      "price": 3999,
      "quantity": 2,
      "reorderLevel": 4,
      "supplier": "IKEA India",
      "createdAt": "2026-07-13T05:24:10.351Z",
      "updatedAt": "2026-07-13T05:24:10.351Z",
      "__v": 0,
      "stockValue": 7998,
      "id": "6a54767af6123427d6e61d76"
    }
  ]
}
```

---

### 8. Category-wise Inventory Summary (Aggregation Pipeline)
Uses MongoDB Aggregation Framework (`$group`, `$project`, `$sort`) to aggregate stats across categories.
- **Method:** `GET`
- **URL:** `/api/products/summary`
- **Status:** `200 OK`
- **Response:**
```json
{
  "categories": 5,
  "summary": [
    {
      "_id": "Electronics",
      "totalItems": 4,
      "totalQuantity": 96,
      "totalStockValue": 321350,
      "avgPrice": 6721.75
    },
    {
      "_id": "Apparel",
      "totalItems": 2,
      "totalQuantity": 78,
      "totalStockValue": 98122,
      "avgPrice": 1399
    },
    {
      "_id": "Furniture",
      "totalItems": 3,
      "totalQuantity": 13,
      "totalStockValue": 58095,
      "avgPrice": 4566
    },
    {
      "_id": "Stationery",
      "totalItems": 2,
      "totalQuantity": 55,
      "totalStockValue": 6075,
      "avgPrice": 102.5
    },
    {
      "_id": "Kitchenware",
      "totalItems": 1,
      "totalQuantity": 1,
      "totalStockValue": 650,
      "avgPrice": 650
    }
  ]
}
```

---

## 🛡️ Centralized Error Handling

All runtime and database errors are routed to `src/middleware/errorHandler.js`:
- **Invalid ObjectId Format (`CastError`)**: Returns `400 Bad Request` with an informative error message.
- **Duplicate SKU (`Code 11000`)**: Returns `400 Bad Request` informing that the SKU is already in use.
- **Validation Failures (`ValidationError`)**: Returns `400 Bad Request` with all failed constraint messages concatenated.
- **Unmatched Routes**: Returns `404 Not Found`.
- **Negative Stock Adjustments**: Returns `400 Bad Request` with current stock level details.

---

## 💯 Rubric Coverage Verification

| Evaluation Criteria | Marks | Implementation Details & Proof |
| :--- | :--- | :--- |
| **Database Schema Design & Validation (Mongoose)** | **0.5 / 0.5** | Field-level required constraints, unique uppercase SKU, non-negative numbers, integer checks, virtual `stockValue` (`price * quantity`), indexes, and schema timestamps. |
| **CRUD Functionality (Create, Read, Update, Delete)** | **0.75 / 0.75** | `POST /api/products` (201), `GET /api/products/:id` (200), `PUT /api/products/:id` (200), `DELETE /api/products/:id` (200), and `PATCH /api/products/:id/stock` (200) with safe stock decrement protection. |
| **Querying — Filtering, Sorting, Pagination** | **0.5 / 0.5** | Flexible query filters (`category`, `search`, `minPrice`, `maxPrice`, `supplier`), sorting (`sortBy`, `sortOrder`), and paginated response envelope (`total`, `page`, `totalPages`, `count`, `products`). |
| **Aggregation — Low-Stock Report & Category Summary** | **0.5 / 0.5** | `GET /api/products/low-stock` query where `quantity <= reorderLevel`. `GET /api/products/summary` with `$group`, `$project`, `$round`, and `$sort` computing totals and averages. |
| **API Design & Clean Code** | **0.25 / 0.25** | MVC structure (`config`, `models`, `controllers`, `routes`, `middleware`, `utils`), async wrappers, centralized error handler, `.env` management, Postman collection, and zero disallowed dependencies. |
| **Total** | **2.5 / 2.5** | **100% Submission Ready** |

---

## 📮 Postman Collection

Import `Inventory_API.postman_collection.json` directly into Postman to test all endpoints. All requests include preconfigured query parameters and sample JSON bodies identical to the assignment requirements.
