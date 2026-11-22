const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const app = require('../src/app');
const Product = require('../src/models/Product');

let server;
let baseUrl;

before(async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_test_db';
  await mongoose.connect(mongoUri);

  // Ensure unique indexes are built in MongoDB
  await Product.init();

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  await Product.deleteMany({});
  await mongoose.connection.close();
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(async () => {
  await Product.deleteMany({});
});

describe('Inventory and Data Management API Test Suite', () => {
  describe('1. Schema Validation & POST /api/products', () => {
    test('should create a valid product and return 201 Created with computed stockValue', async () => {
      const payload = {
        name: 'Study Table',
        sku: 'FURN-TB-812',
        category: 'Furniture',
        price: 3999,
        quantity: 2,
        reorderLevel: 4,
        supplier: 'IKEA India'
      };

      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.name, 'Study Table');
      assert.equal(data.sku, 'FURN-TB-812');
      assert.equal(data.price, 3999);
      assert.equal(data.quantity, 2);
      assert.equal(data.stockValue, 7998); // 3999 * 2
      assert.ok(data._id);
      assert.ok(data.id);
    });

    test('should fail validation with 400 when required fields are missing', async () => {
      const payload = {
        name: 'Incomplete Product'
      };

      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error);
    });

    test('should reject duplicate SKU with 400 error', async () => {
      const payload = {
        name: 'Product 1',
        sku: 'DUPLICATE-SKU-001',
        category: 'Stationery',
        price: 50,
        quantity: 10,
        reorderLevel: 5,
        supplier: 'Test Supplier'
      };

      // Create first product
      const res1 = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res1.status, 201);

      // Attempt to create second product with duplicate SKU
      const res2 = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      assert.equal(res2.status, 400);
      const data = await res2.json();
      assert.equal(data.success, false);
    });

    test('should reject negative price and quantity', async () => {
      const payload = {
        name: 'Invalid Price Product',
        sku: 'NEG-PRICE-001',
        category: 'Electronics',
        price: -100,
        quantity: -5,
        reorderLevel: 2,
        supplier: 'Test Supplier'
      };

      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });

  describe('2. Single Product CRUD Operations', () => {
    test('GET /api/products/:id should retrieve product by ID', async () => {
      const created = await Product.create({
        name: 'Gel Pen Pack of 15',
        sku: 'STNY-PN-713',
        category: 'Stationery',
        price: 120,
        quantity: 40,
        reorderLevel: 20,
        supplier: 'Cello Pens'
      });

      const res = await fetch(`${baseUrl}/api/products/${created._id}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.name, 'Gel Pen Pack of 15');
      assert.equal(data.sku, 'STNY-PN-713');
      assert.equal(data.stockValue, 4800);
    });

    test('GET /api/products/:id should return 404 for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/api/products/${fakeId}`);
      assert.equal(res.status, 404);
    });

    test('GET /api/products/:id should return 400 for invalid ObjectId format', async () => {
      const res = await fetch(`${baseUrl}/api/products/invalid-id-format`);
      assert.equal(res.status, 400);
    });

    test('PUT /api/products/:id should update product details and recalculate stockValue', async () => {
      const created = await Product.create({
        name: 'Gel Pen Pack of 15',
        sku: 'STNY-PN-713',
        category: 'Stationery',
        price: 120,
        quantity: 40,
        reorderLevel: 20,
        supplier: 'Cello Pens'
      });

      const updatePayload = {
        name: 'Gel Pen Pack of 15',
        sku: 'STNY-PN-713',
        category: 'Stationery',
        price: 140,
        quantity: 60
      };

      const res = await fetch(`${baseUrl}/api/products/${created._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.price, 140);
      assert.equal(data.quantity, 60);
      assert.equal(data.stockValue, 8400); // 140 * 60
    });

    test('DELETE /api/products/:id should remove product and return success message', async () => {
      const created = await Product.create({
        name: 'To Delete Item',
        sku: 'DEL-ITEM-001',
        category: 'Stationery',
        price: 10,
        quantity: 5,
        reorderLevel: 2,
        supplier: 'Test Supplier'
      });

      const res = await fetch(`${baseUrl}/api/products/${created._id}`, {
        method: 'DELETE'
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.message, 'Product deleted');
      assert.equal(data.id, created._id.toString());

      const check = await Product.findById(created._id);
      assert.equal(check, null);
    });
  });

  describe('3. Querying: Filtering, Sorting, and Pagination', () => {
    beforeEach(async () => {
      await Product.insertMany([
        { name: 'Alpha Table', sku: 'A-01', category: 'Furniture', price: 1000, quantity: 10, reorderLevel: 5, supplier: 'Supplier A' },
        { name: 'Beta Chair', sku: 'B-02', category: 'Furniture', price: 2000, quantity: 15, reorderLevel: 5, supplier: 'Supplier B' },
        { name: 'Gamma Pen', sku: 'C-03', category: 'Stationery', price: 50, quantity: 100, reorderLevel: 20, supplier: 'Supplier A' },
        { name: 'Delta Monitor', sku: 'D-04', category: 'Electronics', price: 15000, quantity: 5, reorderLevel: 2, supplier: 'Supplier C' }
      ]);
    });

    test('GET /api/products should return paginated list with total, page, totalPages, count', async () => {
      const res = await fetch(`${baseUrl}/api/products?page=1&limit=2`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.total, 4);
      assert.equal(data.page, 1);
      assert.equal(data.totalPages, 2);
      assert.equal(data.count, 2);
      assert.equal(data.products.length, 2);
    });

    test('GET /api/products?category=Furniture should filter by category', async () => {
      const res = await fetch(`${baseUrl}/api/products?category=Furniture`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.total, 2);
      assert.ok(data.products.every((p) => p.category === 'Furniture'));
    });

    test('GET /api/products?minPrice=1000&maxPrice=2500 should filter by price range', async () => {
      const res = await fetch(`${baseUrl}/api/products?minPrice=1000&maxPrice=2500`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.total, 2);
      assert.ok(data.products.every((p) => p.price >= 1000 && p.price <= 2500));
    });

    test('GET /api/products?search=Chair should search name or SKU', async () => {
      const res = await fetch(`${baseUrl}/api/products?search=Chair`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.total, 1);
      assert.equal(data.products[0].sku, 'B-02');
    });

    test('GET /api/products?sortBy=price&sortOrder=asc should sort products ascending', async () => {
      const res = await fetch(`${baseUrl}/api/products?sortBy=price&sortOrder=asc`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.products[0].price, 50);
      assert.equal(data.products[data.products.length - 1].price, 15000);
    });
  });

  describe('4. Stock Adjustment & Safe Inventory Operations', () => {
    test('PATCH /api/products/:id/stock should increment stock on restock', async () => {
      const product = await Product.create({
        name: 'Study Table',
        sku: 'FURN-TB-812',
        category: 'Furniture',
        price: 3999,
        quantity: 2,
        reorderLevel: 4,
        supplier: 'IKEA India'
      });

      const res = await fetch(`${baseUrl}/api/products/${product._id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change: 10 })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.message, 'Stock updated');
      assert.equal(data.product.quantity, 12);
      assert.equal(data.product.stockValue, 47988); // 3999 * 12
    });

    test('PATCH /api/products/:id/stock should decrement stock on sale', async () => {
      const product = await Product.create({
        name: 'Study Table',
        sku: 'FURN-TB-812',
        category: 'Furniture',
        price: 3999,
        quantity: 12,
        reorderLevel: 4,
        supplier: 'IKEA India'
      });

      const res = await fetch(`${baseUrl}/api/products/${product._id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change: -5 })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.message, 'Stock updated');
      assert.equal(data.product.quantity, 7);
      assert.equal(data.product.stockValue, 27993);
    });

    test('PATCH /api/products/:id/stock should reject decrement if resulting stock would be negative', async () => {
      const product = await Product.create({
        name: 'Study Table',
        sku: 'FURN-TB-812',
        category: 'Furniture',
        price: 3999,
        quantity: 2,
        reorderLevel: 4,
        supplier: 'IKEA India'
      });

      const res = await fetch(`${baseUrl}/api/products/${product._id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change: -10 })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error.includes('Insufficient stock'));
    });

    test('PATCH /api/products/:id/stock should return 400 if change is invalid', async () => {
      const product = await Product.create({
        name: 'Study Table',
        sku: 'FURN-TB-812',
        category: 'Furniture',
        price: 3999,
        quantity: 2,
        reorderLevel: 4,
        supplier: 'IKEA India'
      });

      const res = await fetch(`${baseUrl}/api/products/${product._id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change: 'not-a-number' })
      });

      assert.equal(res.status, 400);
    });
  });

  describe('5. Reports & Aggregations', () => {
    beforeEach(async () => {
      await Product.insertMany([
        { name: 'Low Stock Item 1', sku: 'LOW-01', category: 'Furniture', price: 100, quantity: 2, reorderLevel: 4, supplier: 'S1' },
        { name: 'Low Stock Item 2', sku: 'LOW-02', category: 'Stationery', price: 50, quantity: 5, reorderLevel: 5, supplier: 'S2' },
        { name: 'Healthy Stock Item', sku: 'HLT-01', category: 'Electronics', price: 500, quantity: 50, reorderLevel: 10, supplier: 'S3' },
        { name: 'Electronics Item 2', sku: 'ELEC-02', category: 'Electronics', price: 1500, quantity: 10, reorderLevel: 5, supplier: 'S3' }
      ]);
    });

    test('GET /api/products/low-stock should return all products where quantity <= reorderLevel', async () => {
      const res = await fetch(`${baseUrl}/api/products/low-stock`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.count, 2);
      assert.equal(data.lowStockItems.length, 2);
      assert.ok(data.lowStockItems.every((item) => item.quantity <= item.reorderLevel));
      assert.ok(data.lowStockItems[0].stockValue !== undefined);
    });

    test('GET /api/products/summary should calculate aggregation summary per category', async () => {
      const res = await fetch(`${baseUrl}/api/products/summary`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.categories, 3);
      assert.ok(Array.isArray(data.summary));

      const electronics = data.summary.find((s) => s._id === 'Electronics');
      assert.ok(electronics);
      assert.equal(electronics.totalItems, 2);
      assert.equal(electronics.totalQuantity, 60); // 50 + 10
      assert.equal(electronics.totalStockValue, 40000); // (500*50) + (1500*10) = 25000 + 15000
      assert.equal(electronics.avgPrice, 1000); // (500 + 1500)/2
    });
  });
});
