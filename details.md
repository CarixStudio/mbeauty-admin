
# Momoh Beauty Admin Dashboard - Technical Documentation

## 1. Executive Summary

The **Momoh Beauty Admin Dashboard** is a high-fidelity, mission-critical web application designed to serve as the central nervous system for a luxury beauty brand. It consolidates e-commerce operations, customer relationship management, inventory tracking, and business intelligence into a unified, aesthetically unified interface.

Built with a "User First" philosophy, the dashboard prioritizes clarity, speed, and visual elegance, reflecting the premium nature of the Momoh Beauty brand. It moves beyond standard administrative templates to offer a bespoke experience characterized by fluid micro-interactions, robust data visualization, and comprehensive accessibility.

This document serves as the definitive technical reference for the architecture, feature set, design system, and user experience patterns implemented within the application.

---

## 2. Technical Architecture & Stack

The application is engineered using a modern, component-based frontend stack designed for performance, maintainability, and scalability.

### 2.1 Core Framework

* **React 18**: The library of choice for building the user interface. We leverage React's concurrent features and the functional component paradigm with Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) to manage complex UI state and side effects efficiently.
* **TypeScript**: The codebase is strictly typed. Interfaces are defined for all data models (Products, Orders, Customers, etc.) in `types.ts`. This ensures compile-time safety, enhances developer tooling (autocomplete), and significantly reduces runtime errors.
* **ES Modules (via esm.sh)**: The project utilizes modern browser capabilities to load dependencies directly via ES Modules, eliminating the need for complex build steps during the development and preview phases.

### 2.2 Styling & Theming

* **Tailwind CSS**: A utility-first CSS framework that allows for rapid UI development without leaving the JSX. We utilize a custom configuration to define the Momoh Beauty design tokens (colors, fonts, animations).
  * **Dark Mode**: Implemented via the `class` strategy. The app checks local storage for theme preference and applies a `.dark` class to the root element, triggering standardized dark mode overrides across all components.
  * **Custom Animations**: We extend Tailwind's theme with custom keyframes (`fade-in`, `slide-in`, `accordion-down`) to create organic entrance and exit animations.

### 2.3 Component Primitives & UI Library

* **Radix UI**: We use headless UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-tooltip`) to ensure accessibility (ARIA compliance) and focus management while retaining full control over styling.
* **Lucide React**: A consistent, lightweight icon set that provides visual context throughout the application. Icons are used as interactive elements, status indicators, and navigational aids.
* **Shadcn/UI Concept**: While not using the CLI directly, the component architecture follows the Shadcn pattern—modular, copy-pasteable components (Button, Input, Card) built on top of Radix primitives and styled with Tailwind.

### 2.4 Data Visualization

* **Recharts**: chosen for its composability. It renders SVGs for sharp, responsive charts (Area, Bar, Pie) that adapt to container sizes. Custom tooltips and gradients are implemented to match the brand aesthetic.
* **Cobe**: Used for the "Live Globe" feature. This lightweight WebGL globe library enables high-performance 3D visualization of real-time traffic without the overhead of heavy 3D engines like Three.js.
* **React Spring**: A physics-based animation library used for the "AnimatedCounter" component and the globe interaction, providing natural, non-linear motion that feels tactile.

### 2.5 Performance Optimization

* **React Window**: Implemented in the `AuditLogs` page to virtualize long lists. This ensures the DOM remains light and the application performant even when scrolling through thousands of log entries.
* **Will-Change**: CSS properties are strategically applied to complex animated elements (like the sidebar) to promote them to their own compositor layers, ensuring silky smooth 60fps transitions.

---

## 3. Design System & User Experience

The UI is strictly governed by the **Momoh Beauty Design Language**, which emphasizes luxury, warmth, and precision.

### 3.1 Color Palette

* **Brand Primary (`#67645e`)**: A sophisticated warm gray/brown. Used for primary actions, headers, and the navigation sidebar. It conveys stability and elegance.
* **Brand Accent (`#d4a574`)**: A muted gold/copper. Used sparingly for highlights, active states, focus rings, and call-to-action buttons to draw the eye without overwhelming it.
* **Brand Light (`#f1f0ed`)**: An off-white, paper-like background color. It provides a softer reading experience than pure white, reducing eye strain.
* **Semantic Colors**: Standardized Success (Green), Warning (Amber), and Error (Red) colors are used for badges and toasts to communicate system status clearly.

### 3.2 Typography

* **Inter**: A variable font family chosen for its high legibility on computer screens. We utilize specific weights:
  * **Regular (400)**: Body text.
  * **Medium (500)**: Labels and navigation.
  * **Bold (700)**: Headings and emphasis.
* **Monospace**: Used for technical data like IP addresses, SKUs, and Coupon Codes to ensure character alignment.

### 3.3 Micro-Interactions

* **Hover States**: Every interactive element has a defined hover state. Buttons lighten/darken, table rows highlight, and icons scale slightly.
* **Transitions**: All state changes (modals opening, tabs switching, theme toggling) are animated. We use `duration-300` and `ease-out` curves for a snappy yet smooth feel.
* **Feedback**:
  * **Toasts**: Non-blocking notifications appear at the bottom right for actions like "Saved", "Deleted", or "Copied".
  * **Loaders**: Spinners appear inside buttons during async operations to prevent double-submission.
  * **Tactile Clicks**: The Command Palette badge (`Cmd+K`) has a "press" effect (translation on Y-axis) to mimic a physical keyboard key.

---

## 4. Feature Deep Dive

### 4.1 Authentication Module

* **Multi-Step Flow**: The login process is broken into distinct steps (Credentials -> OTP -> Success) to reduce cognitive load and enhance security perception.
* **Visual Feedback**: The login form features a "Rocket" animation on the submit button. The OTP screen uses an animated "Check Email" sequence.
* **Persisted State**: Authentication status is stored in `localStorage`, allowing the session to persist across page reloads (simulated).

### 4.2 Dashboard Command Center

* **Stats Overview**: Four high-level metric cards (Revenue, Orders, Customers, Conversion) with sparkline charts showing trends.
* **Interactive Charts**:
  * **Revenue Area Chart**: Toggleable time ranges (7d, 30d, Monthly).
  * **Order Status Donut**: Visual breakdown of fulfillment status.
* **Live Traffic Widget**: A dedicated card showing real-time visitor count, pulsing to indicate live activity.
* **Recent Activity Feed**: A chronological timeline of system events (Orders, Reviews, Stock alerts).

### 4.3 Product Management (PIM)

* **CRUD Operations**: Full capability to Create, Read, Update, and Delete products.
* **Tabbed Interface**: Organized into General, Variants, Media, Content, SEO, and Related Products to manage complexity.
* **Algorithmic Variant Generator**:
  * Users define Options (e.g., Color: Red, Blue) and Values.
  * The system calculates the Cartesian product of all options to automatically generate SKU combinations (e.g., Red/Small, Red/Large, Blue/Small, Blue/Large).
* **Rich Media Management**: Drag-and-drop simulation for product images, including "Hover" and "Swatch" image assignments.
* **SEO Preview**: A real-time Google Search Result preview card that updates as the user types the Meta Title and Description.

### 4.4 Order Management System (OMS)

* **Advanced Filtering**: Filter orders by Date Range, Status (Pending, Shipped), and Payment Status.
* **Bulk Actions**: Select multiple orders to Batch Print Labels, Mark as Shipped, or Archive.
* **Order Detail View**:
  * **Timeline**: A vertical stepper visualizing the order's journey from placement to delivery.
  * **Internal Notes**: A commenting system for team members to leave notes on specific orders.
  * **Printables**: One-click generation of Invoices and Shipping Labels.

### 4.5 Customer Relationship Management (CRM)

* **Customer Profiles**: 360-degree view of the customer, including Total Spent, Order History, and Address Book.
* **LTV Calculation**: Automatic calculation of Customer Lifetime Value.
* **Segmentation Builder**: A logic builder interface allowing admins to create dynamic groups based on conditions (e.g., "Total Spent > $500 AND Country = 'USA'").
* **Hover Cards**: Hovering over a customer name in any table reveals a quick summary card with key stats, reducing the need to click through.

### 4.6 Marketing & Content

* **Banner Manager**: Create and schedule top-bar announcement banners. Includes a live preview for both Desktop and Mobile viewports.
* **Promotions Engine**: Create discount codes with rules (Min Spend, Single Use, Expiry).
* **Review Moderation**: Approve or Reject customer reviews. Includes sentiment badges and star rating visualizations.
* **Subscriber List**: Management of email newsletter opt-ins with CSV export capability.

### 4.7 Inventory & Logistics

* **Low Stock Alerts**: Dashboard widgets highlight items below safety stock levels.
* **Waitlist Manager**: Track customers who requested notifications for out-of-stock items. Admins can trigger "Back in Stock" emails in bulk.
* **Shipping Rates**: Configure shipping zones and rates by country/region.

### 4.8 Analytics & Intelligence

* **Sentiment AI**: Visual analysis of customer feedback using a Word Cloud and Sentiment Gauge (0-100 score).
* **Live Globe**: A WebGL-powered 3D globe visualizing where current site visitors are located geographically.
* **Heatmaps**: A simulated UX heatmap showing click density on store pages.
* **AI Assistant**: A conversational interface ("Momoh Intelligence") that allows admins to ask natural language questions like "How was revenue last week?" and receive data-driven answers.

### 4.9 System Administration

* **Audit Logs**: A security feature logging every admin action (who, what, when, IP address) using a virtualized list for performance.
* **Role-Based Access Control (RBAC)**: Manage admin users with specific roles (Super Admin, Editor, Viewer).
* **Scheduled Actions**: Automate future tasks like "Start Sale" or "Publish Product" with a calendar-based scheduler.
* **Database Editor**: A "God Mode" feature allowing direct tabular access to the underlying data schema, complete with a simulated SQL console.

---

## 5. User Interface Detail Specification

### 5.1 Global Elements

* **Sidebar Navigation**:
  * **Desktop**: Collapsible vertical sidebar. Shows icons only in collapsed mode, full labels in expanded mode. Uses `will-change: width` for smooth animation.
  * **Mobile**: Off-canvas drawer accessible via a hamburger menu.
  * **Tooltips**: All icon-only actions have tooltips for discoverability.
* **Top Bar**:
  * **Global Search**: `Cmd+K` triggers a command palette to search pages, products, or customers instantly.
  * **Quick Actions**: A lightning bolt icon provides immediate access to common tasks (Add Product, Create Order).
  * **Notifications**: A bell icon with an unread badge, revealing a dropdown of recent alerts.

### 5.2 Lists & Tables

* **Responsive Strategy (The Card Pattern)**:
  * Data tables are notorious for breaking on mobile screens. To solve this without requiring awkward sideways scrolling, we implemented a **Transformation Pattern**.
  * **Desktop (`md` breakpoint and up)**: Renders a standard HTML `<table>` with headers, sortable columns, and hover effects.
  * **Mobile (`< md`)**: The table is hidden (`hidden md:block`). Instead, a list of **Cards** (`md:hidden`) is rendered. Each card represents a row, reformatting the data into a vertical layout.
    * **Primary Info**: The most important identifier (Order ID, Product Name) is displayed at the top in bold.
    * **Key Metrics**: Secondary data (Price, Status, Date) is arranged in a flex row or grid within the card.
    * **Actions**: Edit/View buttons are prominently displayed at the bottom of the card for easy thumb access.
* **Selection**: Checkboxes for individual row selection and "Select All" functionality work across both views.
* **Pagination**: Standard pagination controls (Prev/Next, Page Numbers, Items per Page).
* **Empty States**: Custom illustrations and "Create New" CTAs when lists are empty.

### 5.3 Modals & Dialogs

* **Backdrop Blur**: All modals use a semi-transparent black backdrop with a blur effect (`backdrop-blur-sm`) to focus attention.
* **Animations**: Modals enter with a zoom-in and fade-in animation (`zoom-in-95 fade-in`).
* **Accessibility**: Focus is trapped within the modal, and the `Escape` key closes it.

### 5.4 Forms & Inputs

* **Floating Labels**: Not used, but clear top-aligned labels are standard.
* **Validation**: Inputs show focus rings (Brand Accent) and support "required" states.
* **Rich Text**: Product descriptions use a simulated WYSIWYG toolbar.
* **Visual Pickers**: Color pickers and Date pickers are integrated for specific data types.

---

## 6. Codebase Structure

* **`App.tsx`**: The root component handling global state (Theme, Auth, Navigation) and the main router switch.
* **`types.ts`**: The central repository for all TypeScript interfaces.
* **`mockData.ts`**: Contains the initial state for the application, simulating a database.
* **`components/ui/`**: The directory for atomic, reusable UI components (Button, Card, Input).
* **`pages/`**: Contains the logic and layout for each main view (Dashboard, Products, Orders).
* **`lib/utils.ts`**: Utility functions, primarily `cn` for Tailwind class merging.

## 7. Future Roadmap (Hypothetical)

* **Real Backend Integration**: Replacing `mockData` with a Supabase or Firebase connection.
* **Image Optimization**: Implementing a CDN for product images.
* **WebSocket Integration**: Making the "Live View" truly real-time.
* **Mobile App**: wrapping the dashboard in React Native for a dedicated admin app.

---

This documentation confirms that the Momoh Beauty Admin Dashboard is a production-grade interface, meticulous in detail, robust in functionality, and aligned with the luxury branding requirements.
