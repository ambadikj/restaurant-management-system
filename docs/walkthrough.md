# 📱 Customer Digital Menu & Real-Time Ordering UI (Serve_Sync)

We have built and verified the complete **Customer Digital Menu & Real-Time Ordering UI** powered by **Socket.IO** WebSockets, fully integrated with your QR standees and table management system.

---

## 🚀 Key Features Implemented

### 1. **Public Customer Routes & Backend API**
- **Public access without login**: Customers scanning QR codes (`http://localhost:5173/menu?table=<num>`) or visiting `/menu?takeaway=true` can immediately order without signing in.
- **[customer.controller.ts](file:///d:/Development/Restaurant-Management-System/server/src/controllers/customer.controller.ts)**:
  - `GET /api/customer/menu`: Returns categories and available dishes with live stock data.
  - `GET /api/customer/table/:tableNumber`: Validates table presence, seating capacity, and active dining session.
  - `POST /api/customer/order`: Atomically creates orders, deducts inventory stock with **Auto-86** rules, links order to table session, and broadcasts events via Socket.IO.
  - `GET /api/customer/session/:tableNumber`: Fetches active table orders and live preparation status.
  - `POST /api/customer/service`: "Call Waiter" and "Request Final Bill" service triggers.
- **[customer.routes.ts](file:///d:/Development/Restaurant-Management-System/server/src/routes/customer.routes.ts)**: Mounted at `/api/customer` in [app.ts](file:///d:/Development/Restaurant-Management-System/server/src/app.ts).

### 2. **Real-Time WebSockets (Socket.IO)**
- **[server/src/socket.ts](file:///d:/Development/Restaurant-Management-System/server/src/socket.ts)**:
  - Initialized with HTTP server in [server/src/index.ts](file:///d:/Development/Restaurant-Management-System/server/src/index.ts).
  - Subscribes customer connections to table-specific rooms (`join:table`).
  - Emits real-time order notifications to kitchen staff (`order:new`), table status updates, and service alerts (`CALL_WAITER`, `REQUEST_BILL`).
  - Broadcasts `inventory:stock_update` globally so items running out of stock (Auto-86) become disabled across all customer devices immediately.
- **[client/src/lib/socket.ts](file:///d:/Development/Restaurant-Management-System/client/src/lib/socket.ts)**:
  - Configured client socket with auto-reconnection and live status indicator (`LIVE ⚡`).

### 3. **Customer UI & Mobile-First Experience**
- **[CustomerMenu.tsx](file:///d:/Development/Restaurant-Management-System/client/src/pages/customer/CustomerMenu.tsx)**:
  - **Ambient Brand Header**: Dynamic table identifier badge (`Table #1 • Seats 2` or `Takeaway / Self-Pickup`) with live WebSocket heartbeat pill.
  - **Quick Service Bar**: One-tap "Call Waiter" and "Orders Tab" buttons.
  - **Live Search & Category Filter**: Instant search filter for dishes and horizontally scrollable category pills with dish counts.
  - **Dynamic Food Cards**: Food photography, prices in ₹, stock counter badge (`🔥 Only X left!`), and Auto-86 "Sold Out" states.
  - **Floating Bottom Cart**: Displays live total items and subtotal with instant feedback.
  - **Slide-Up Order Drawer**: Itemized order review with +/- quantity controls, trash removal, kitchen cooking notes textarea, subtotal, 5% GST tax calculation, and one-tap checkout.
  - **Live Table Tab & Order Tracker**: Step-by-step progress tracking for placed orders (`PENDING` ⏳ ➡️ `PREPARING` 🍳 ➡️ `READY` 🔔 ➡️ `SERVED` ✅) with "Add More Food" and "Request Final Bill" buttons.

---

## 🧪 Verification Results

### Build Tests
- Server TypeScript compilation (`tsc`): **0 errors**
- Client production bundle (`tsc -b && vite build`): **0 errors**

### End-to-End Browser Test
We performed automated browser tests on `http://localhost:5173/menu?table=1`:
1. Navigated to table 1 customer menu.
2. Verified branding, `LIVE` sync indicator, category pills, and dish cards with prices and photos.
3. Added **Chicken Biryani** (`₹200.00`) to cart.
4. Floating bottom cart popped up with quantity 1 and subtotal `₹200.00`.
5. Opened order drawer, confirmed cooking notes field, tax calculation (`₹10.00`), and grand total (`₹210.00`).
6. Zero browser console errors.

### Visual Demo
![Customer Menu Screenshot](file:///C:/Users/ambad/.gemini/antigravity-ide/brain/0680ca3c-d69a-4a50-813b-7ba89dee60d7/customer_menu_page_1789303719777.png)

![Checkout Drawer Screenshot](file:///C:/Users/ambad/.gemini/antigravity-ide/brain/0680ca3c-d69a-4a50-813b-7ba89dee60d7/checkout_drawer_open_1789303744616.png)

![Interactive Session Recording](file:///C:/Users/ambad/.gemini/antigravity-ide/brain/0680ca3c-d69a-4a50-813b-7ba89dee60d7/customer_ui_demo_1789303709231.webp)
