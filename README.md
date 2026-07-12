# 🍽️ Real-Time Restaurant Management & POS System

## 📖 Project Overview
This is a Real-Time Restaurant Management & Point of Sale (POS) System designed to digitize and automate restaurant operations. It eliminates paper order slips by enabling customers to place orders via table-specific QR codes. Orders are instantly routed to a real-time Kitchen Display System, while inventory is tracked automatically to prevent overselling. 

This project was built to streamline the dining experience, offering role-based access control and real-time communication for Admins, Cashiers, Kitchen Staff, and Customers.

## 🎯 Key Features
* **QR-Based Customer Ordering:** No app download required; customers scan, browse, and order directly from their mobile browsers.
* **Real-Time Kitchen Updates:** Live order syncing using WebSockets (Socket.IO) to eliminate paper tickets.
* **Automated Inventory Control:** Daily limits and automatic stock deductions prevent ordering out-of-stock items.
* **Streamlined Billing:** Cashiers can view active dining sessions, generate bills, and process payments (Cash/UPI/Card).
* **Role-Based Access Control (RBAC):** Secure access separated by Admin, Cashier, and Kitchen roles.

## 🏗️ Technology Stack

**Frontend:**
* React (with Vite)
* TypeScript
* Tailwind CSS

**Backend:**
* Node.js & Express
* TypeScript
* Socket.IO (Real-time WebSockets)
* JWT & bcrypt (Authentication)

**Database:**
* PostgreSQL
* Prisma ORM

## 👥 System Roles

1. **Admin:** Manages the overarching restaurant data (Employees, Categories, Menu Items, Daily Inventory Limits, Tables, and QR Codes) and views reports.
2. **Cashier:** Controls front-of-house operations. Opens dining sessions, manages table statuses, generates bills, and processes payments.
3. **Kitchen Staff:** Views a live feed of incoming orders, updates preparation statuses, and marks items as ready/served.
4. **Customer:** No login required. Scans table QR code, browses the menu, places orders, and continues ordering until billing is requested.

## 📂 Folder Structure

```text
Restaurant-Management-System/
├── client/                 # React Frontend
├── server/                 # Express Backend
│   ├── prisma/             # Schema, migrations, and seed scripts
│   ├── src/
│   │   ├── controllers/    # Route logic
│   │   ├── middleware/     # Auth and validation
│   │   ├── routes/         # Express routing
│   │   ├── prisma/         # Prisma client instantiation
│   │   ├── app.ts          # Express app setup
│   │   └── index.ts        # Server entry point
│   └── uploads/menu/       # Local image storage
├── database/               # Database documentation/diagrams
└── docs/                   # Additional project documentation