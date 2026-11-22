require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const sampleProducts = [
  {
    name: 'Study Table',
    sku: 'FURN-TB-812',
    category: 'Furniture',
    price: 3999,
    quantity: 2,
    reorderLevel: 4,
    supplier: 'IKEA India'
  },
  {
    name: 'Ergonomic Office Chair',
    sku: 'FURN-CH-102',
    category: 'Furniture',
    price: 5499,
    quantity: 3,
    reorderLevel: 5,
    supplier: 'Featherlite'
  },
  {
    name: 'Bookshelf Unit',
    sku: 'FURN-SH-305',
    category: 'Furniture',
    price: 4200,
    quantity: 8,
    reorderLevel: 2,
    supplier: 'Godrej Interio'
  },
  {
    name: 'Gel Pen Pack of 15',
    sku: 'STNY-PN-713',
    category: 'Stationery',
    price: 120,
    quantity: 40,
    reorderLevel: 20,
    supplier: 'Cello Pens'
  },
  {
    name: 'Spiral Notebook A4',
    sku: 'STNY-NB-401',
    category: 'Stationery',
    price: 85,
    quantity: 15,
    reorderLevel: 25,
    supplier: 'Classmate'
  },
  {
    name: 'Wireless Bluetooth Headphones',
    sku: 'ELEC-HP-901',
    category: 'Electronics',
    price: 2499,
    quantity: 35,
    reorderLevel: 10,
    supplier: 'boAt Lifestyle'
  },
  {
    name: 'Mechanical Gaming Keyboard',
    sku: 'ELEC-KB-550',
    category: 'Electronics',
    price: 4599,
    quantity: 20,
    reorderLevel: 5,
    supplier: 'Logitech'
  },
  {
    name: '4K Ultra-HD Monitor 27-inch',
    sku: 'ELEC-MN-720',
    category: 'Electronics',
    price: 18990,
    quantity: 6,
    reorderLevel: 3,
    supplier: 'LG Electronics'
  },
  {
    name: 'Wireless Mouse',
    sku: 'ELEC-MS-110',
    category: 'Electronics',
    price: 799,
    quantity: 35,
    reorderLevel: 15,
    supplier: 'Logitech'
  },
  {
    name: 'Cotton Casual Crewneck T-Shirt',
    sku: 'APP-TS-201',
    category: 'Apparel',
    price: 899,
    quantity: 50,
    reorderLevel: 15,
    supplier: 'Zara India'
  },
  {
    name: 'Slim Fit Denim Jeans',
    sku: 'APP-JN-402',
    category: 'Apparel',
    price: 1899,
    quantity: 28,
    reorderLevel: 10,
    supplier: 'Levi Strauss'
  },
  {
    name: 'Stainless Steel Insulated Water Bottle',
    sku: 'KIT-BT-501',
    category: 'Kitchenware',
    price: 650,
    quantity: 1,
    reorderLevel: 10,
    supplier: 'Milton'
  }
];

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_db';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);

    console.log('Clearing existing product inventory...');
    await Product.deleteMany({});

    console.log('Seeding sample products...');
    const inserted = await Product.insertMany(sampleProducts);
    console.log(`Successfully seeded ${inserted.length} products!`);

    await mongoose.connection.close();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
