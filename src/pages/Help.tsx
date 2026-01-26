import { Download, FileText, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const guideContent = `# DreamHunters Operations System (DHOS)
## Point of Sale (POS) User Guide

**Developed by DATAPLEX SOFTWARES**

---

## Introduction

The **DreamHunters Operations System (DHOS)** Point of Sale module is a high-performance, enterprise-grade sales processing system designed for speed, accuracy, and ZIMRA compliance. Built by **DATAPLEX SOFTWARES**, this POS system enables cashiers to process transactions quickly while maintaining full audit trails and fiscal compliance.

### Key Features

- ⚡ Ultra-Fast Processing – Complete sales in under 10 seconds
- 🔍 Smart Product Search – Find products instantly by name, SKU, or barcode
- 💳 Multiple Payment Methods – Cash, Mobile Money, Bank Transfer, and Split Payments
- 📊 Real-Time Inventory – Automatic stock deduction on sale
- 🧾 ZIMRA-Compliant Invoices – Sequential numbering with full VAT breakdown
- 🔒 Secure & Auditable – Every transaction is logged and traceable

---

## Getting Started

### Logging In

1. Navigate to the DHOS login page
2. Enter your username and password
3. Click Login
4. You will be directed to the Dashboard

### Accessing the POS

From the Dashboard or Sidebar:
- Click Point of Sale in the left navigation menu
- Or use the Quick Action button on the Dashboard

---

## POS Interface Overview

The POS screen is divided into three main sections:

### Left Panel – Product Selection
- Search Bar: Type product name, SKU, or scan barcode
- Category Filters: Filter products by category (All, Beverages, Groceries, etc.)
- Product Grid: Click any product card to add to cart

### Right Panel – Cart & Checkout
- Cart Items: List of selected products with quantities
- Quantity Controls: Adjust item quantities (+/-)
- Remove Button: Remove items from cart
- Order Summary: Subtotal, VAT, and Total
- Payment Buttons: Process payment by method

---

## Processing a Sale

### Step 1: Add Products to Cart

**Option A – Search**
1. Click the search bar or press "/" to focus
2. Type product name or SKU
3. Click the product to add to cart

**Option B – Barcode Scanner**
1. Position cursor in search field
2. Scan product barcode
3. Product is automatically added to cart

**Option C – Category Browse**
1. Select a category filter
2. Click on product cards to add items

### Step 2: Adjust Quantities

- Click the + button to increase quantity
- Click the - button to decrease quantity
- Minimum quantity is 1; use remove button to delete item

### Step 3: Review Order

Verify the following before checkout:
- ✓ All items are correct
- ✓ Quantities are accurate
- ✓ Subtotal and VAT are displayed
- ✓ Total amount is correct

### Step 4: Process Payment

Select the appropriate payment method:
- Cash – For cash transactions
- Mobile Money – For EcoCash, OneMoney, etc.
- Bank Transfer – For bank card or transfer payments

---

## Payment Methods

### Cash Payment
- Accept cash from customer
- System calculates change (if applicable)
- Transaction marked as completed

### Mobile Money
- Supported providers: EcoCash, OneMoney, Telecash
- Customer initiates payment on their phone
- Confirm payment receipt before completing

### Bank Transfer
- For card payments or direct bank transfers
- Verify payment confirmation
- Reference number logged with transaction

---

## Receipts & Invoices (ZIMRA Compliant)

Every invoice includes:
- Invoice Number: Sequential, non-editable (e.g., INV-2024-0001)
- Date & Time: Transaction timestamp
- Company Details: Business name, address, TIN
- Cashier: Name of processing cashier
- Items: Product name, quantity, unit price, line total
- Subtotal: Total before VAT
- VAT (15%): Tax amount on applicable items
- Total: Final amount due
- Payment Method: How payment was made
- Currency: USD or ZWL

---

## Keyboard Shortcuts

- "/" : Focus search bar
- "Esc" : Clear search / Close dialogs
- "Enter" : Confirm action

---

## Troubleshooting

### Product Not Found
- Verify spelling or SKU
- Check if product is active in system
- Contact admin to add new products

### Payment Failed
- Verify payment was received
- Check network connection
- Try alternative payment method
- Contact supervisor if issue persists

---

## Support

**DATAPLEX SOFTWARES**

📧 Email: support@dataplexsoftwares.com
📞 Phone: +263 XX XXX XXXX
🌐 Website: www.dataplexsoftwares.com

---

© 2026 DATAPLEX SOFTWARES. All Rights Reserved.
`;

export default function Help() {
  const handleDownload = () => {
    const blob = new Blob([guideContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DHOS-POS-User-Guide.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>DHOS POS User Guide - DATAPLEX SOFTWARES</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; line-height: 1.6; }
              h1 { color: #1a1a1a; border-bottom: 2px solid #0066cc; padding-bottom: 10px; }
              h2 { color: #333; margin-top: 30px; }
              h3 { color: #555; }
              hr { margin: 20px 0; border: none; border-top: 1px solid #ddd; }
              ul, ol { padding-left: 20px; }
              li { margin: 5px 0; }
            </style>
          </head>
          <body>
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${guideContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Help & Documentation</h1>
          <p className="text-muted-foreground mt-1">POS User Guide by DATAPLEX SOFTWARES</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download Guide
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>DHOS Point of Sale User Guide</CardTitle>
            <p className="text-sm text-muted-foreground">Version 1.0 | January 2026</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="bg-muted/50 rounded-lg p-6 space-y-6">
              {/* Introduction */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">Introduction</h2>
                <p className="text-muted-foreground">
                  The <strong>DreamHunters Operations System (DHOS)</strong> Point of Sale module is a high-performance, 
                  enterprise-grade sales processing system designed for speed, accuracy, and ZIMRA compliance. 
                  Built by <strong>DATAPLEX SOFTWARES</strong>.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span>⚡</span> Ultra-Fast Processing
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>🔍</span> Smart Product Search
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>💳</span> Multiple Payment Methods
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>📊</span> Real-Time Inventory
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>🧾</span> ZIMRA-Compliant Invoices
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>🔒</span> Secure & Auditable
                  </div>
                </div>
              </section>

              <Separator />

              {/* Processing a Sale */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">Processing a Sale</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-foreground">Step 1: Add Products</h3>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                      <li>Search by name/SKU or scan barcode</li>
                      <li>Click product cards to add to cart</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Step 2: Adjust Quantities</h3>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                      <li>Use +/- buttons to modify quantities</li>
                      <li>Click trash icon to remove items</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Step 3: Process Payment</h3>
                    <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                      <li>Select payment method: Cash, Mobile Money, or Bank Transfer</li>
                      <li>Complete transaction and print receipt</li>
                    </ul>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Keyboard Shortcuts */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">Keyboard Shortcuts</h2>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between bg-background rounded px-3 py-2">
                    <span className="text-muted-foreground">Focus search</span>
                    <kbd className="bg-muted px-2 py-0.5 rounded text-xs">/</kbd>
                  </div>
                  <div className="flex justify-between bg-background rounded px-3 py-2">
                    <span className="text-muted-foreground">Close/Clear</span>
                    <kbd className="bg-muted px-2 py-0.5 rounded text-xs">Esc</kbd>
                  </div>
                </div>
              </section>

              <Separator />

              {/* Support */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">Support</h2>
                <div className="bg-background rounded-lg p-4">
                  <p className="font-semibold text-foreground">DATAPLEX SOFTWARES</p>
                  <div className="text-sm text-muted-foreground mt-2 space-y-1">
                    <p>📧 support@dataplexsoftwares.com</p>
                    <p>📞 +263 XX XXX XXXX</p>
                    <p>🌐 www.dataplexsoftwares.com</p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        © 2026 DATAPLEX SOFTWARES. All Rights Reserved.
      </p>
    </div>
  );
}
