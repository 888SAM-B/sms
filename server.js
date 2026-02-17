require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Customer = require('./models/Customer');
const Bill = require('./models/Bill');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB Successfully!'))
    .catch((err) => console.error('Connection to MongoDB failed:', err));

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 1. Fetch All Products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 2. Save/Update Product (Upsert)
app.post('/api/products', async (req, res) => {
    try {
        const productData = req.body;
        const product = await Product.findOneAndUpdate(
            { id: productData.id },
            productData,
            { upsert: true, new: true, runValidators: true }
        );
        res.status(201).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 3. Delete Product
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findOneAndDelete({ id: req.params.id });
        res.json({ message: 'Product Deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 4. Fetch All Categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 5. Add Category
app.post('/api/categories', async (req, res) => {
    try {
        const category = new Category({ name: req.body.name });
        await category.save();
        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 6. Delete Category
app.delete('/api/categories/:name', async (req, res) => {
    try {
        await Category.findOneAndDelete({ name: req.params.name });
        res.json({ message: 'Category Deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 7. Initialize Categories if empty
app.post('/api/categories/initialize', async (req, res) => {
    try {
        const count = await Category.countDocuments();
        if (count === 0) {
            const defaultCategories = req.body.categories.map(name => ({ name }));
            await Category.insertMany(defaultCategories);
            res.json({ message: 'Default categories initialized' });
        } else {
            res.json({ message: 'Categories already exist' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- BILLING ROUTES ---

// 8. Create Bill (with real-time stock update)
app.post('/api/bills', async (req, res) => {
    try {
        const { customer, items, subtotal, tax, discount, total, paymentMethod } = req.body;

        // Generate bill number
        const billCount = await Bill.countDocuments();
        const billNumber = `INV-${Date.now()}-${billCount + 1}`;

        // Create bill
        const bill = new Bill({
            billNumber,
            customer,
            items,
            subtotal,
            tax,
            discount,
            total,
            paymentMethod
        });

        await bill.save();

        // Update stock for each item in real-time
        for (const item of items) {
            const product = await Product.findOne({ id: item.productId });
            if (product) {
                product.quantity -= item.quantity;
                await product.save();
            }
        }

        res.status(201).json(bill);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 9. Fetch All Bills
app.get('/api/bills', async (req, res) => {
    try {
        const bills = await Bill.find().sort({ createdAt: -1 });
        res.json(bills);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 10. Fetch Single Bill
app.get('/api/bills/:billNumber', async (req, res) => {
    try {
        const bill = await Bill.findOne({ billNumber: req.params.billNumber });
        if (!bill) {
            return res.status(404).json({ message: 'Bill not found' });
        }
        res.json(bill);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 11. Save/Update Customer (Upsert by phone)
app.post('/api/customers', async (req, res) => {
    try {
        const customerData = req.body;
        const customer = await Customer.findOneAndUpdate(
            { phone: customerData.phone },
            customerData,
            { upsert: true, new: true, runValidators: true }
        );
        res.status(201).json(customer);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 12. Fetch Customers (with optional phone filter)
app.get('/api/customers', async (req, res) => {
    try {
        const { phone } = req.query;
        const query = phone ? { phone } : {};
        const customers = await Customer.find(query).sort({ createdAt: -1 });
        res.json(customers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
