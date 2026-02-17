import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import { BillItem, Customer, Bill } from '../types/billing';
import { Search, Plus, Minus, Trash2, ShoppingCart, User, FileText, Download, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BillingSystemProps {
    products: Product[];
    categories: string[];
    onBillCreated: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const BillingSystem: React.FC<BillingSystemProps> = ({ products, categories, onBillCreated }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [cart, setCart] = useState<BillItem[]>([]);
    const [customer, setCustomer] = useState<Customer>({
        name: '',
        phone: '',
        email: '',
        address: ''
    });
    const [tax, setTax] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastBill, setLastBill] = useState<Bill | null>(null);
    const [showBillPreview, setShowBillPreview] = useState(false);
    const [isLoadingCustomer, setIsLoadingCustomer] = useState(false);

    // Filter products for suggestions
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return [];
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const inStock = p.quantity > 0;
            return matchesSearch && inStock;
        }).slice(0, 8); // Limit to 8 suggestions
    }, [products, searchTerm]);

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = (subtotal * tax) / 100;
    const total = subtotal + taxAmount - discount;

    // Fetch customer by phone
    const fetchCustomerByPhone = async (phone: string) => {
        if (phone.length < 10) return;

        setIsLoadingCustomer(true);
        try {
            const response = await fetch(`${API_URL}/customers?phone=${phone}`);
            if (response.ok) {
                const customers = await response.json();
                if (customers.length > 0) {
                    const existingCustomer = customers[0];
                    setCustomer({
                        name: existingCustomer.name,
                        phone: existingCustomer.phone,
                        email: existingCustomer.email || '',
                        address: existingCustomer.address || ''
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching customer:', error);
        } finally {
            setIsLoadingCustomer(false);
        }
    };

    // Handle phone change with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (customer.phone.length >= 10) {
                fetchCustomerByPhone(customer.phone);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [customer.phone]);

    // Add to cart from suggestion
    const addToCart = (product: Product) => {
        const existingItem = cart.find(item => item.productId === product.id);

        if (existingItem) {
            if (existingItem.quantity >= product.quantity) {
                alert(`Only ${product.quantity} units available!`);
                return;
            }

            setCart(cart.map(item =>
                item.productId === product.id
                    ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
                    : item
            ));
        } else {
            setCart([...cart, {
                productId: product.id,
                productName: product.name,
                category: product.category,
                quantity: 1,
                price: product.price,
                total: product.price
            }]);
        }

        // Clear search after adding
        setSearchTerm('');
        setShowSuggestions(false);
    };

    // Update quantity
    const updateQuantity = (productId: string, newQuantity: number) => {
        const product = products.find(p => p.id === productId);

        if (newQuantity <= 0) {
            removeFromCart(productId);
            return;
        }

        if (product && newQuantity > product.quantity) {
            alert(`Only ${product.quantity} units available!`);
            return;
        }

        setCart(cart.map(item =>
            item.productId === productId
                ? { ...item, quantity: newQuantity, total: newQuantity * item.price }
                : item
        ));
    };

    // Remove from cart
    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
    };

    // Generate PDF
    const generatePDF = (bill: Bill) => {
        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', 105, 20, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('SMS - The Stock Manager', 14, 35);
        doc.text('Stock Management System', 14, 40);

        doc.setFont('helvetica', 'bold');
        doc.text(`Bill No: ${bill.billNumber}`, 140, 35);
        doc.setFont('helvetica', 'normal');
        doc.text(`Date: ${new Date(bill.createdAt).toLocaleDateString()}`, 140, 40);
        doc.text(`Time: ${new Date(bill.createdAt).toLocaleTimeString()}`, 140, 45);

        doc.setFont('helvetica', 'bold');
        doc.text('Customer Details:', 14, 55);
        doc.setFont('helvetica', 'normal');
        doc.text(`Name: ${bill.customer.name}`, 14, 60);
        doc.text(`Phone: ${bill.customer.phone}`, 14, 65);
        if (bill.customer.email) doc.text(`Email: ${bill.customer.email}`, 14, 70);
        if (bill.customer.address) doc.text(`Address: ${bill.customer.address}`, 14, 75);

        const tableData = bill.items.map(item => [
            item.productName,
            item.category,
            item.quantity.toString(),
            `₹${item.price.toFixed(2)}`,
            `₹${item.total.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: bill.customer.address ? 85 : 80,
            head: [['Product', 'Category', 'Qty', 'Price', 'Total']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
            styles: { fontSize: 9 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('helvetica', 'normal');
        doc.text(`Subtotal:`, 140, finalY);
        doc.text(`₹${bill.subtotal.toFixed(2)}`, 180, finalY, { align: 'right' });

        if (bill.tax > 0) {
            doc.text(`Tax:`, 140, finalY + 5);
            doc.text(`₹${bill.tax.toFixed(2)}`, 180, finalY + 5, { align: 'right' });
        }

        if (bill.discount > 0) {
            doc.text(`Discount:`, 140, finalY + 10);
            doc.text(`-₹${bill.discount.toFixed(2)}`, 180, finalY + 10, { align: 'right' });
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Total:`, 140, finalY + 15);
        doc.text(`₹${bill.total.toFixed(2)}`, 180, finalY + 15, { align: 'right' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Payment Method: ${bill.paymentMethod}`, 14, finalY + 15);

        doc.setFontSize(8);
        doc.text('Thank you for your business!', 105, 280, { align: 'center' });

        doc.save(`Invoice-${bill.billNumber}.pdf`);
    };

    // Create Bill
    const createBill = async () => {
        if (cart.length === 0) {
            alert('Cart is empty!');
            return;
        }

        if (!customer.name || !customer.phone) {
            alert('Please enter customer name and phone number!');
            return;
        }

        setIsProcessing(true);

        try {
            // Save/update customer first
            console.log('Saving customer:', customer);
            const customerResponse = await fetch(`${API_URL}/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(customer)
            });

            if (!customerResponse.ok) {
                const errorData = await customerResponse.json();
                console.error('Customer save error:', errorData);
                throw new Error(`Failed to save customer: ${errorData.message || 'Unknown error'}`);
            }

            const billData = {
                customer,
                items: cart,
                subtotal,
                tax: taxAmount,
                discount,
                total,
                paymentMethod
            };

            console.log('Creating bill:', billData);
            const response = await fetch(`${API_URL}/bills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(billData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Bill creation error:', errorData);
                throw new Error(`Failed to create bill: ${errorData.message || 'Unknown error'}`);
            }

            const createdBill = await response.json();
            console.log('Bill created successfully:', createdBill);
            setLastBill(createdBill);
            setShowBillPreview(true);

            // Reset form
            setCart([]);
            setCustomer({ name: '', phone: '', email: '', address: '' });
            setTax(0);
            setDiscount(0);
            setSearchTerm('');

            onBillCreated();

        } catch (error) {
            console.error('Error creating bill:', error);
            alert(`Failed to create bill: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Search Bar with Suggestions */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search products to add to cart..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg text-base focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none transition-all"
                    />

                    {/* Suggestions Dropdown */}
                    {showSuggestions && searchTerm && filteredProducts.length > 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                            {filteredProducts.map(product => (
                                <div
                                    key={product.id}
                                    onClick={() => addToCart(product)}
                                    className="p-3 hover:bg-brand-50 cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-slate-800">{product.name}</h4>
                                            <p className="text-sm text-slate-500 mt-0.5">{product.category}</p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="font-bold text-brand-600">₹{product.price.toFixed(2)}</p>
                                            <p className="text-xs text-slate-500">Stock: {product.quantity}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {showSuggestions && searchTerm && filteredProducts.length === 0 && (
                        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl p-4 text-center text-slate-400">
                            No products found
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 flex gap-4 min-h-0">
                {/* Left: Cart */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-brand-50">
                        <h2 className="text-lg font-bold text-brand-800 flex items-center gap-2">
                            <ShoppingCart size={20} />
                            Cart ({cart.length} items)
                        </h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {cart.map(item => (
                            <div key={item.productId} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800">{item.productName}</h4>
                                        <p className="text-sm text-slate-500">{item.category}</p>
                                        <p className="text-sm text-slate-600 mt-1">₹{item.price.toFixed(2)} each</p>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.productId)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                            className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-100 hover:border-brand-500 transition-all"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="w-12 text-center font-mono text-lg font-semibold">{item.quantity}</span>
                                        <button
                                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                            className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-300 rounded-lg hover:bg-slate-100 hover:border-brand-500 transition-all"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                    <span className="text-xl font-bold text-brand-600">₹{item.total.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}

                        {cart.length === 0 && (
                            <div className="text-center text-slate-400 py-16">
                                <ShoppingCart size={48} className="mx-auto mb-3 opacity-30" />
                                <p className="text-lg">Cart is empty</p>
                                <p className="text-sm mt-1">Search and add products above</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Customer & Checkout - FIXED SCROLLING */}
                <div className="w-96 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                        <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                            <User size={18} />
                            Customer Details
                        </h3>
                    </div>

                    {/* Scrollable customer form */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                            <input
                                type="tel"
                                placeholder="Enter phone number"
                                value={customer.phone}
                                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
                            />
                            {isLoadingCustomer && (
                                <p className="text-xs text-brand-600 mt-1">Looking up customer...</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                            <input
                                type="text"
                                placeholder="Customer name"
                                value={customer.name}
                                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                placeholder="Optional"
                                value={customer.email}
                                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                            <textarea
                                placeholder="Optional"
                                value={customer.address}
                                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                                rows={2}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-2 focus:ring-brand-100 outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Fixed checkout section at bottom */}
                    <div className="flex-shrink-0 p-4 border-t border-slate-100 bg-slate-50/50 space-y-3">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Tax %</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={tax}
                                    onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Discount ₹</label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={discount}
                                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Payment Method</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:border-brand-500 focus:ring-1 focus:ring-brand-100 outline-none"
                            >
                                <option>Cash</option>
                                <option>Card</option>
                                <option>UPI</option>
                                <option>Net Banking</option>
                            </select>
                        </div>

                        <div className="pt-2 space-y-1.5 text-sm">
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal:</span>
                                <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                            </div>
                            {tax > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Tax ({tax}%):</span>
                                    <span className="font-semibold">₹{taxAmount.toFixed(2)}</span>
                                </div>
                            )}
                            {discount > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>Discount:</span>
                                    <span className="font-semibold">-₹{discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold text-brand-600 pt-2 border-t-2 border-slate-200">
                                <span>Total:</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                        </div>

                        <button
                            onClick={createBill}
                            disabled={isProcessing || cart.length === 0}
                            className="w-full mt-3 px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? 'Processing...' : 'Generate Bill'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Bill Preview Modal */}
            {showBillPreview && lastBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-emerald-50">
                            <h2 className="text-xl font-bold text-emerald-800 flex items-center gap-2">
                                <FileText size={24} />
                                Bill Created Successfully!
                            </h2>
                            <button onClick={() => setShowBillPreview(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 max-h-96 overflow-y-auto">
                            <div className="text-center mb-4">
                                <p className="text-sm text-slate-500">Bill Number</p>
                                <p className="text-2xl font-bold text-brand-600">{lastBill.billNumber}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                                <div>
                                    <p className="text-slate-500">Customer</p>
                                    <p className="font-semibold">{lastBill.customer.name}</p>
                                    <p className="text-slate-600">{lastBill.customer.phone}</p>
                                </div>
                                <div>
                                    <p className="text-slate-500">Date & Time</p>
                                    <p className="font-semibold">{new Date(lastBill.createdAt).toLocaleDateString()}</p>
                                    <p className="text-slate-600">{new Date(lastBill.createdAt).toLocaleTimeString()}</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4">
                                <p className="font-semibold mb-2">Items:</p>
                                {lastBill.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm py-1">
                                        <span>{item.productName} x {item.quantity}</span>
                                        <span className="font-semibold">₹{item.total.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-slate-200 mt-4 pt-4 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span>Subtotal:</span>
                                    <span>₹{lastBill.subtotal.toFixed(2)}</span>
                                </div>
                                {lastBill.tax > 0 && (
                                    <div className="flex justify-between">
                                        <span>Tax:</span>
                                        <span>₹{lastBill.tax.toFixed(2)}</span>
                                    </div>
                                )}
                                {lastBill.discount > 0 && (
                                    <div className="flex justify-between">
                                        <span>Discount:</span>
                                        <span>-₹{lastBill.discount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-lg font-bold text-brand-600 pt-2 border-t border-slate-200">
                                    <span>Total:</span>
                                    <span>₹{lastBill.total.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                            <button
                                onClick={() => setShowBillPreview(false)}
                                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-100 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    generatePDF(lastBill);
                                    setShowBillPreview(false);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
