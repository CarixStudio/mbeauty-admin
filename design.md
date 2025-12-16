
# Momoh Beauty Design System & Implementation Guide

## 1. Core Brand Identity

### Color Palette

The color system defines the luxury aesthetic of the application.

* **Brand Primary**: `#67645e` (Warm Gray/Brown) - Used for primary buttons, sidebar active states, and headings.
* **Brand Accent**: `#d4a574` (Gold/Copper) - Used for highlights, focus rings, chart data, and subtle accents.
* **Brand Light**: `#f1f0ed` (Off-white/Bone) - The primary background color for the application, providing a softer look than pure white.
* **Semantic Colors**:
  * **Success**: Green-500/600 (Badges, trend indicators)
  * **Warning**: Amber-500 (Pending statuses)
  * **Error**: Red-500/600 (Delete actions, critical alerts)
  * **Text**: Gray-900 (Primary), Gray-500 (Secondary/Meta)

### Typography

* **Font Family**: `Inter`, sans-serif. Chosen for its neutrality, readability, and modern feel.
* **Weights**:
  * 300 (Light): Subtitles in hero areas.
  * 400 (Regular): Standard body text.
  * 500 (Medium): Labels, navigation, table headers.
  * 700 (Bold): Page titles, metric values.

## 2. Layout & Structure

### Application Shell

* **Sidebar**:
  * Fixed position on left.
  * Collapsible (Width transitions from `w-64` to `w-20`).
  * Features a "Glassmorphic" mobile drawer for smaller screens.
* **Header**:
  * Sticky positioning (`sticky top-0`).
  * Backdrop blur (`backdrop-blur-md`) to maintain context while scrolling.
  * Contains Global Search, Dark Mode toggle, Quick Actions, and Profile menu.
* **Main Content**:
  * Centered max-width container (`max-w-7xl`).
  * Padding strategies: `p-4` on mobile, `p-8` on desktop.

## 3. UI Components Implementation

### Buttons

* **Primary**: Brand Primary background, white text, subtle shadow. Hover moves to a darker gray.
* **Secondary**: Brand Light background, Brand Primary text.
* **Outline**: White background, gray border. Used for secondary actions (Cancel, Export).
* **Ghost**: Transparent background, gray text. Used for icon-only buttons in tables.

### Cards

* **Style**: White background (Dark Gray in dark mode), rounded-xl, thin border (`border-gray-100`).
* **Shadow**: Subtle shadow (`shadow-sm`) that elevates on hover for interactive cards.

### Visual Effects

* **Glassmorphism**: Used in the Login Visual Panel and Mobile Sidebar.
  * `bg-white/80` or `bg-black/20`
  * `backdrop-blur-xl`
* **Gradients**: Subtle usage in text (`bg-clip-text`) for page titles to add depth.

## 4. Animations & Micro-interactions

### Login Page

* **Visual Panel**:
  * "Aurora" background blobs (`animate-blob-spin`, `animate-blob-float`).
  * Floating glass cards with independent float animations (`float-slow`, `float-medium`, `float-fast`).
* **Button Hover**: The "Sign In" button reveals a rocket icon that slides in from the right.

### Dashboard

* **Animated Counters**: Numbers scroll up to their final value using `react-spring`.
* **Entrance**: Page content slides in from the right (`slide-in-from-right-4`).

### Interactive Elements

* **Command Palette**: The `Cmd+K` badge depresses visually when clicked/active (`translate-y-0.5`).
* **Live Globe**: Interactive WebGL globe that responds to drag and touch events.
* **Hover Cards**: Customer names in tables reveal a detailed profile card on hover.

## 5. Responsiveness Strategy

### Mobile-First Data Presentation

To avoid horizontal scrolling on data-heavy tables, we employ a **Card Transformation Pattern**:

* **Desktop (`md`+)**: Full Data Tables with sortable columns and detailed rows.
* **Mobile (`< md`)**: Tables are hidden and replaced by a stacked list of **Summary Cards**.
  * Each card displays the primary identifier (e.g., Order ID) prominently.
  * Secondary details (Status, Date, Total) are arranged in a grid within the card.
  * Actions (Edit, View) are accessible via large touch targets.

### Navigation

* **Drawer**: The sidebar completely hides on mobile, replaced by a hamburger menu triggering an overlay drawer with glassmorphism effects.
* **Context Panels**: Auxiliary panels (like AI chat context or DB schema lists) collapse into floating buttons or bottom sheets on smaller screens.

## 6. Accessibility

* **Contrast**: High contrast text colors ensures readability.
* **Focus Management**: Custom focus rings using the Brand Accent color.
* **Keyboard Support**: Global shortcuts (`Cmd/Ctrl + K`, `Cmd/Ctrl + /`) for power users.
* **ARIA**: Usage of Radix UI primitives ensures proper ARIA roles and attributes are present.
