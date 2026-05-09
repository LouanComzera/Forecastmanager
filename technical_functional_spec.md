# Technical & Functional Specification: Brytsite Expense Manager

## 1. Executive Summary
The Brytsite Expense Manager is a high-end, browser-based financial dashboard designed for multi-company expense tracking, long-term financial forecasting, and automated invoice generation. It prioritizes a premium UI/UX experience while maintaining a zero-backend architecture, relying on `localStorage` for data persistence.

---

## 2. Functional Specification

### 2.1 Expense Dashboard
*   **Time-Period Navigation**: Users select the working period via a Month and Year dropdown system in the sidebar. Quick navigation is provided via "Previous" and "Next" buttons.
*   **Company Management**: Multi-company support via a central state. Users can view expenses for "All Companies" or filter down to a specific entity using a sidebar dropdown.
*   **Expense Entry**: 
    *   **Manual**: A dedicated modal for adding single expenses (Date, Company, Description, Amount). Includes a "Today" shortcut and an enforced calendar picker.
    *   **Bulk Import**: A global CSV import tool that parses `Date, Company, Description, Amount` and automatically splits entries into the correct company buckets.
*   **Payment Tracking**: Each expense features a "Paid" toggle. Marking an item as paid visually dims the row and updates the company's "Total Due" in real-time.
*   **Data Export**: Generates a multi-sheet Excel file. Sheet 1 contains a high-level overview (totals per company + payment status), and subsequent sheets contain itemized lists for each individual company.

### 2.2 Financial Forecasting Module
*   **Configurable Projections**: Users can set a forecast duration (1–10 years) and a yearly escalation percentage (e.g., 5% inflation/growth).
*   **Categorization**: Separates projections into **Cost of Sales (COS)** and **Operating Expenses**.
*   **Data Input**:
    *   **Manual**: Inline editing of line-item descriptions and base amounts.
    *   **CSV Template**: Per-company CSV upload for importing base line items.
*   **Projection Engine**: Automatically calculates future costs using the formula:  
    `Projected = Base * (1 + Escalation)^Year`
*   **Visual Totals**: Provides yearly totals for COS and Expenses to aid in long-term cash flow planning.

### 2.3 Invoice Generation
*   **Automated Filtering**: Scans the selected company’s ledger for the current month and extracts only "Unpaid" items.
*   **Professional Layout**: A printable, minimalist invoice template featuring "Bill From", "Bill To", and itemized transaction tables.
*   **PDF Generation**: Utilizes standard browser print protocols with custom CSS media queries to ensure a clean, UI-free PDF output.

---

## 3. Technical Specification

### 3.1 Architecture
*   **Frontend**: Single Page Application (SPA) built with Semantic HTML5, Vanilla JavaScript (ES6+), and Vanilla CSS.
*   **Persistence**: `localStorage` API. Data is serialized to JSON.
    *   `expenses`: Keyed by `YYYY-MM`.
    *   `companies`: Flat array of active entities.
    *   `forecast_data`: Object containing configuration and per-company line items.
*   **Icons**: Lucide-JS (SVG-based).
*   **Excel Engine**: SheetJS (XLSX.js).

### 3.2 State Structure
```javascript
let state = {
    expenses: {
        "2026-05": [
            { company: "RSA", description: "Azure", amount: "4500", date: "2026-05-01", paid: false }
        ]
    },
    companies: ["RSA", "Equisim", ...],
    currentView: "expenses", // Toggle between 'expenses' and 'forecasting'
    forecast: {
        config: { years: 3, escalation: 5 },
        items: {
            "RSA": { cos: [], expenses: [] }
        }
    }
}
```

### 3.3 UI Component System
*   **Glassmorphism**: Cards and modals utilize `backdrop-filter: blur()` and semi-transparent backgrounds for a premium feel.
*   **Responsive Layout**: Flexbox and CSS Grid are used throughout to ensure the sidebar and dashboard adapt to different viewport sizes.
*   **Sticky Headers**: Dashboard and Invoice headers remain pinned to the top during vertical scrolling for improved accessibility.

---

## 4. Workflow & Security
*   **Data Privacy**: As a client-side application, all financial data remains on the user's local machine. No data is transmitted to external servers.
*   **Error Handling**: Logic includes type-coercion (String vs Number) for amounts to ensure consistency between CSV imports and manual entries.
