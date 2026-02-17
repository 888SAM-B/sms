export interface BillItem {
    productId: string;
    productName: string;
    category: string;
    quantity: number;
    price: number;
    total: number;
}

export interface Customer {
    name: string;
    phone: string;
    email?: string;
    address?: string;
}

export interface Bill {
    billNumber: string;
    customer: Customer;
    items: BillItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    paymentMethod: string;
    createdAt: Date;
}
