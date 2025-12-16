
# Momoh Beauty Admin Dashboard

A production-ready, high-fidelity Admin Dashboard for Momoh Beauty, a luxury cosmetics brand. This application serves as a comprehensive command center for managing e-commerce operations, customers, and business intelligence.

## 🚀 Tech Stack

* **Core**: React 18, TypeScript, ES Modules (via `esm.sh`).
* **Styling**: Tailwind CSS (Custom Config), CSS Modules for complex animations.
* **State Management**: React Hooks (`useState`, `useReducer`, `useContext`).
* **Visualization**: Recharts (Analytics), Cobe (3D Globe), React Spring (Physics-based animation).
* **Icons**: Lucide React.
* **UI Primitives**: Radix UI (Dialog, Popover, Tooltip, Slot) for accessible component foundations.
* **Utilities**: Date-fns, clsx, tailwind-merge.

## ✨ Key Features

### 🔐 Authentication & Security

* **Secure Login Flow**: Email/Password authentication with a multi-step verification simulation.
* **2FA Simulation**: OTP entry screen with auto-focus and validation logic.
* **Audit Logging**: Immutable record of admin actions (Product updates, refunds, logins) for security compliance.
* **Session Management**: View active sessions and revoke access remotely.

### 📊 Business Intelligence

* **Executive Dashboard**: Real-time metrics (Revenue, Orders, LTV) with trend visualization.
* **Live Store View**: Interactive 3D Globe showing real-time visitor geography and a UX heatmap toggle.
* **Sentiment Analysis AI**: Analyzes customer reviews and support tickets to generate a sentiment score (0-100) and topic word cloud.
* **Reporting**: Exportable CSV reports for revenue, inventory, and customer data.

### 🛍️ E-Commerce Operations

* **Order Management**:
  * Kanban-style status tracking.
  * Bulk actions (Print Labels, Mark Shipped).
  * Detailed timeline view of order history.
* **Product PIM**:
  * Advanced product editor with tabs for General, SEO, Media, and Content.
  * **Algorithmic Variant Generator**: Automatically creates SKU combinations (e.g., Color x Size).
  * Visual Media Manager for gallery organization.
* **Inventory Control**: Low stock alerts, waitlist management, and automated restock notifications.
* **Abandoned Cart Recovery**: Tools to identify lost sales and draft recovery emails.

### 👥 Customer 360

* **CRM**: Detailed profiles with purchase history, LTV calculation, and contact info.
* **Segmentation Engine**: Visual builder to create dynamic customer cohorts based on logic (e.g., "Spent > $500").
* **Support Desk**: Integrated ticket management system.

### 🛠️ Advanced Tools

* **Database Editor**: Direct access to the mock schema with a SQL query console.
* **Momoh Intelligence (AI)**: A chat interface for natural language queries about store performance.
* **Marketing Suite**: Manage banner campaigns, discount codes, and newsletter subscribers.
* **Scheduled Actions**: Automate future price changes or product launches.

## 📱 Mobile Responsiveness

The application features a fully responsive **Adaptive Layout Strategy**:

* **Mobile Card Views**: Complex data tables (Orders, Products, Customers) automatically transform into stackable, touch-friendly cards on small screens (`< 768px`).
* **Touch Navigation**: The sidebar collapses into a slide-out drawer accessible via a hamburger menu.
* **Optimized Inputs**: Forms and modals adjust padding and size for comfortable touch interaction.

## 🎨 Design System

The application follows the **Momoh Beauty Luxury Design Language**:

* **Primary Color**: `#67645e` (Warm Earth)
* **Accent Color**: `#d4a574` (Muted Gold)
* **Typography**: Inter (Clean, modern, legible)
* **Visuals**: Glassmorphism, smooth micro-interactions, and premium whitespace usage.

## 📦 Usage

This project utilizes `esm.sh` to load dependencies directly in the browser, requiring no build step (like Webpack or Vite) for development preview.

1. **Run**: Use any static file server.
    * VS Code: Right-click `index.html` -> "Open with Live Server".
    * Terminal: `npx serve .` or `python3 -m http.server`.
2. **Access**: Open `http://localhost:3000` (or your server's port) in Chrome/Edge/Safari.
