# Maita Cakes Business Management App

🚀 DREAMHUNTERS OPERATIONS SYSTEM (DHOS)
ENTERPRISE POS + OPERATIONS + COMPLIANCE PLATFORM

Version: 1.0 (Production-Ready Specification)

1. EXECUTIVE SUMMARY

Build a robust, enterprise-grade web application called DreamHunters Operations System (DHOS) that combines:

A high-performance Point of Sale (POS)

A full operations management system

ZIMRA-compliant invoicing & reporting

Inventory, suppliers, transporters, clients, and analytics

Modular architecture that scales from SME to multi-branch businesses

The system must be secure, fast, auditable, compliant, and future-proof for fiscal device integration and business growth.

2. BRANDING & DESIGN SYSTEM

Product Name: DreamHunters Operations System (DHOS)

Brand Colors:

Primary: Yellow (#FFC107)

Secondary: Black (#000000)

UI Principles:

Minimalist & professional

POS-first UX (large buttons, fast flows)

High contrast for long working hours

Tablet & desktop optimized

Typography: Clean sans-serif (Inter / Roboto equivalent)

3. SYSTEM ARCHITECTURE (MANDATORY)

Use a modular, service-oriented architecture.

Core Modules:

Authentication & Roles

POS & Sales

ZIMRA Compliance & Fiscalization

Inventory

Suppliers

Transporters & Logistics

Clients & CRM

Reporting & Analytics

Audit & Logs

System Configuration

Each module must be independently extensible.

4. AUTHENTICATION & USER MANAGEMENT
User Roles:

Super Admin

Admin

Cashier

Operations Manager

Accountant

Auditor (Read-only)

Requirements:

Secure login (JWT / session-based)

Role-based access control (RBAC)

Activity tracking per user

Login & action logs (audit trail)

Password reset & account locking

5. POS & SALES MODULE
Product Management

Product name

SKU / barcode

Category

Cost price

Selling price

VAT applicable (Yes/No)

Unit of measure

Stock tracking enabled/disabled

POS Interface

Ultra-fast item search

Barcode scanner support

Quantity editing

Line-item discounts

Cart persistence

Multiple payment methods:

Cash

Mobile Money

Bank Transfer

Split payments

Transaction Handling

Transaction ID

Cashier

Date & time

Payment breakdown

Automatic stock deduction

Refund & void controls (permission-based)

6. ZIMRA COMPLIANCE & FISCAL INVOICING (CRITICAL)
Invoice Requirements:

Sequential invoice numbering (non-editable)

Company name, address, and TIN

Client details (where applicable)

VAT breakdown (15% or configurable)

Total VAT

Gross & net amounts

Date, time, and cashier

Currency support (ZWL / USD)

Compliance Features:

Tamper-proof invoice records

Immutable invoice storage

Audit-ready logs

Invoice reprint controls

Credit note support

Fiscalization Readiness:

Design API hooks for:

ZIMRA FDMS

Fiscal devices

Third-party fiscal services

(No hard-coding. Must be plug-and-play.)

7. INVENTORY MANAGEMENT

Real-time stock levels

Stock-in (purchases)

Stock-out (sales, wastage)

Stock adjustments (authorized only)

Low-stock alerts

Inventory valuation

Stock movement history

8. SUPPLIERS MODULE

Supplier profiles

Contact details

Supplied products

Purchase orders

Goods received notes (GRN)

Supplier invoices

Payments & balances

Supplier performance overview

9. TRANSPORTERS & LOGISTICS

Transporter profiles

Vehicle details

Assigned deliveries

Delivery status:

Pending

In transit

Delivered

Delivery costs

Delivery history

Cost analysis per transporter

10. CLIENTS & CRM

Client profiles

Purchase history

Credit limits

Credit sales

Client statements

Outstanding balances

Payment tracking

11. REPORTING & ANALYTICS (ENTERPRISE LEVEL)
Automated Reports:

Daily sales

Weekly sales (auto-generated)

Monthly & annual summaries

VAT report (ZIMRA-ready)

Sales by product

Sales by cashier

Sales by client

Inventory valuation

Supplier spend

Transport cost analysis

Profit & margin reports

Export Options:

PDF

Excel

CSV

Scheduling:

Auto-generate weekly reports

Email-ready reports

Filterable by date range

12. AUDIT, LOGS & SECURITY

Full audit trail:

Logins

Sales

Edits

Refunds

Stock changes

Immutable logs

Time-stamped records

Role-based log access

Data encryption (at rest & in transit)

13. SYSTEM SETTINGS & CONFIGURATION

Company profile

Tax rates

Currencies

Invoice templates

Branch support (future-ready)

Backup & restore

System health monitoring

14. TECH STACK GUIDELINES (FLEXIBLE BUT SERIOUS)

Web-based (cloud deployable)

REST or GraphQL APIs

Scalable relational database

Offline-ready POS (future phase)

API-first architecture

Mobile & desktop compatibility

15. MVP vs PHASE 2
MVP (Launch):

POS

Products

Invoicing

Inventory

Clients

Suppliers

Weekly reports

ZIMRA-ready invoices

Phase 2:

Fiscal device integration

Mobile app

Multi-branch

Advanced analytics

Accounting integrations

16. SUCCESS CRITERIA

The system is successful if:

A cashier can process a sale in under 10 seconds

Invoices meet ZIMRA expectations

Management can view weekly performance instantly

Auditors can trace any transaction

The system scales without redesign

17. FINAL GOAL

DreamHunters Operations System should replace:

Manual invoicing

Excel tracking

Disconnected POS systems

Poor compliance visibility

It must function as a single source of truth for the business.

If you want, next I can:

Convert this into a legal SOW contract

Create database schema & tables

Draft ZIMRA invoice mockups

Create developer task breakdown (Jira-ready)

Reduce this into a Lovable ultra-optimized build prompt

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dhos-zenith.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b5165bda-e215-42d2-95cd-c07cc5298a86).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
