// State Management
let state = {
    expenses: JSON.parse(localStorage.getItem('expenses')) || {},
    companies: JSON.parse(localStorage.getItem('companies')) || [
        "RSA", "Equisim", "Eazytask", "Muniflow", "Comzera Solutions", "Comzera Technologies"
    ],
    descriptions: JSON.parse(localStorage.getItem('descriptions')) || [
        "VAT", "Azure", "Sage", "Konsulent", "Lou-an", "Dian Expense", "PAYE/UIF", "Mongo"
    ],
    currentMonth: new Date().toISOString().slice(0, 7),
    selectedCompany: 'all',
    currentView: 'expenses',
    forecast: JSON.parse(localStorage.getItem('forecast_data')) || {
        config: { years: 3, escalation: 5 },
        items: {} // { companyName: { cos: [], expenses: [] } }
    }
};

// DOM Elements
const viewExpenses = document.getElementById('view-expenses');
const viewForecasting = document.getElementById('view-forecasting');
const btnViewForecasting = document.getElementById('btn-view-forecasting');
const companyNavList = document.getElementById('company-nav-list');
const dashboardGridEl = document.getElementById('dashboard-grid');
const currentMonthDisplay = document.getElementById('current-month-display');
const expenseModal = document.getElementById('expense-modal');
const categoriesModal = document.getElementById('categories-modal');
const expenseForm = document.getElementById('expense-form');
const companyOptions = document.getElementById('company-options');
const descriptionOptions = document.getElementById('description-options');

// Initialize
function init() {
    const selectMonth = document.getElementById('select-month');
    const selectYear = document.getElementById('select-year');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const companyNavSelect = document.getElementById('company-nav-select');
    const forecastYears = document.getElementById('forecast-years');
    const forecastEsc = document.getElementById('forecast-esc');
    const forecastCompanySelect = document.getElementById('forecast-company-select');
    const invoiceModal = document.getElementById('invoice-modal');

    // View Switching
    btnViewForecasting.onclick = () => {
        state.currentView = 'forecasting';
        switchView();
    };

    // Invoice Logic
    document.getElementById('btn-gen-invoice').onclick = () => {
        if (state.selectedCompany === 'all') {
            alert('Please select a specific company to generate an invoice.');
            return;
        }
        generateInvoice(state.selectedCompany);
        invoiceModal.style.display = 'flex';
    };

    document.getElementById('close-invoice').onclick = () => {
        invoiceModal.style.display = 'none';
    };

    // Bulk Import Trigger
    document.getElementById('btn-bulk-import').onclick = () => {
        document.getElementById('bulk-csv-upload').click();
    };

    document.getElementById('bulk-csv-upload').onchange = handleBulkImport;

    // Company Navigation Change
    companyNavSelect.onchange = (e) => {
        state.selectedCompany = e.target.value;
        state.currentView = 'expenses';
        switchView();
    };

    // Forecast Config Listeners
    forecastYears.oninput = (e) => {
        state.forecast.config.years = parseInt(e.target.value) || 1;
        saveState();
        renderForecasting();
    };

    forecastEsc.oninput = (e) => {
        state.forecast.config.escalation = parseFloat(e.target.value) || 0;
        saveState();
        renderForecasting();
    };

    forecastCompanySelect.onchange = (e) => {
        renderForecasting();
    };

    // Populate Years (e.g., from 2020 to 5 years in future)
    const currentYearNum = new Date().getFullYear();
    for (let y = currentYearNum + 1; y >= 2022; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        selectYear.appendChild(opt);
    }

    const updateSelectors = () => {
        const [year, month] = state.currentMonth.split('-');
        selectMonth.value = month;
        selectYear.value = year;
    };

    const onSelectorChange = () => {
        state.currentMonth = `${selectYear.value}-${selectMonth.value}`;
        renderDashboard();
        updateTitle();
    };

    selectMonth.onchange = onSelectorChange;
    selectYear.onchange = onSelectorChange;

    prevMonthBtn.onclick = () => {
        const date = new Date(state.currentMonth + '-01');
        date.setMonth(date.getMonth() - 1);
        state.currentMonth = date.toISOString().slice(0, 7);
        updateSelectors();
        renderDashboard();
        updateTitle();
    };

    nextMonthBtn.onclick = () => {
        const date = new Date(state.currentMonth + '-01');
        date.setMonth(date.getMonth() + 1);
        state.currentMonth = date.toISOString().slice(0, 7);
        updateSelectors();
        renderDashboard();
        updateTitle();
    };

    updateSelectors();
    renderCompanyNav();
    renderDashboard();
    updateDataLists();
    updateForecastCompanySelect();
    lucide.createIcons();
    
    // Set default date in form
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    // Date Picker Enhancements
    const dateInput = document.getElementById('date');
    const todayBtn = document.getElementById('btn-set-today');
    const dateWrapper = document.querySelector('.date-input-wrapper');
    
    if (todayBtn) {
        todayBtn.onclick = (e) => {
            e.stopPropagation();
            dateInput.value = new Date().toISOString().split('T')[0];
        };
    }

    const openPicker = (e) => {
        if (typeof dateInput.showPicker === 'function') {
            try {
                dateInput.showPicker();
            } catch (err) {
                console.log("showPicker failed, falling back to focus");
            }
        }
    };

    if (dateWrapper) dateWrapper.onclick = openPicker;
    dateInput.onfocus = openPicker;

    updateTitle();
}

function switchView() {
    if (state.currentView === 'expenses') {
        viewExpenses.style.display = 'block';
        viewForecasting.style.display = 'none';
        btnViewForecasting.classList.remove('active');
        renderDashboard();
    } else {
        viewExpenses.style.display = 'none';
        viewForecasting.style.display = 'block';
        btnViewForecasting.classList.add('active');
        renderForecasting();
    }
    renderCompanyNav();
}

// Persistence
function saveState() {
    localStorage.setItem('expenses', JSON.stringify(state.expenses));
    localStorage.setItem('companies', JSON.stringify(state.companies));
    localStorage.setItem('descriptions', JSON.stringify(state.descriptions));
    localStorage.setItem('forecast_data', JSON.stringify(state.forecast));
}

function updateTitle() {
    const monthName = new Date(state.currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (state.selectedCompany === 'all') {
        currentMonthDisplay.textContent = `All Expenses - ${monthName}`;
    } else {
        currentMonthDisplay.textContent = `${state.selectedCompany} - ${monthName}`;
    }
}

function renderCompanyNav() {
    const select = document.getElementById('company-nav-select');
    const currentVal = state.selectedCompany;
    
    select.innerHTML = '<option value="all">All Companies</option>' + 
        state.companies.sort().map(c => `<option value="${c}">${c}</option>`).join('');
    
    select.value = currentVal;
    
    // Update the visual "active" state of other buttons
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (state.currentView === 'forecasting') {
        document.getElementById('btn-view-forecasting').classList.add('active');
    }
}

function renderDashboard() {
    dashboardGridEl.innerHTML = '';
    let currentExpenses = state.expenses[state.currentMonth] || [];
    
    // Filter by company if needed
    if (state.selectedCompany !== 'all') {
        currentExpenses = currentExpenses.filter(e => e.company === state.selectedCompany);
    }
    
    if (currentExpenses.length === 0) {
        dashboardGridEl.innerHTML = `
            <div class="empty-state fade-in">
                <i data-lucide="file-text"></i>
                <p>No expenses recorded for this selection.</p>
                <button class="btn btn-primary" onclick="document.getElementById('btn-add-expense').click()">
                    Add First Expense
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    // Group by company
    const grouped = currentExpenses.reduce((acc, exp) => {
        if (!acc[exp.company]) acc[exp.company] = [];
        acc[exp.company].push(exp);
        return acc;
    }, {});

    Object.keys(grouped).sort().forEach(company => {
        const expenses = grouped[company];
        const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
        
        const card = document.createElement('div');
        card.className = 'company-card fade-in';
        card.innerHTML = `
            <div class="company-header">
                <span class="company-name">${company}</span>
                <span class="company-total">R ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="expense-list">
                ${expenses.sort((a,b) => new Date(a.date) - new Date(b.date)).map((e) => `
                    <div class="expense-item ${e.paid ? 'is-paid' : ''}">
                        <button onclick="togglePaid('${company}', '${e.description.replace(/'/g, "\\'")}', '${e.date}', '${e.amount}')" class="paid-toggle ${e.paid ? 'paid' : 'unpaid'}" title="${e.paid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                            <i data-lucide="${e.paid ? 'check-circle' : 'circle'}"></i>
                        </button>
                        <div class="expense-desc">
                            <div style="font-weight: 500;">${e.description}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${new Date(e.date).toLocaleDateString()}</div>
                        </div>
                        <div class="expense-amt" style="margin-left: auto;">R ${parseFloat(e.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
                        <button onclick="deleteExpense('${company}', '${e.description.replace(/'/g, "\\'")}', '${e.date}', '${e.amount}')" style="background: none; border: none; color: var(--text-muted); cursor: pointer; margin-left: 10px;">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                `).join('')}
            </div>
        `;
        dashboardGridEl.appendChild(card);
    });
    lucide.createIcons();
}

function updateDataLists() {
    companyOptions.innerHTML = state.companies.map(c => `<option value="${c}">`).join('');
    descriptionOptions.innerHTML = state.descriptions.map(d => `<option value="${d}">`).join('');
}

// Actions
window.togglePaid = (company, description, date, amount) => {
    const masterList = state.expenses[state.currentMonth];
    if (!masterList) return;
    
    const target = masterList.find(e => 
        e.company === company && 
        e.description === description && 
        e.date === date && 
        String(e.amount) === String(amount)
    );
    
    if (target) {
        target.paid = !target.paid;
        saveState();
        renderDashboard();
    }
};

window.deleteExpense = (company, description, date, amount) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    const masterList = state.expenses[state.currentMonth];
    if (!masterList) return;
    
    const actualIndex = masterList.findIndex(e => 
        e.company === company && 
        e.description === description && 
        e.date === date && 
        String(e.amount) === String(amount)
    );
    
    if (actualIndex > -1) {
        masterList.splice(actualIndex, 1);
        if (masterList.length === 0) delete state.expenses[state.currentMonth];
        saveState();
        renderDashboard();
    }
};

// Event Listeners
document.getElementById('btn-add-expense').onclick = () => {
    expenseModal.style.display = 'flex';
};

document.getElementById('close-modal').onclick = 
document.getElementById('cancel-expense').onclick = () => {
    expenseModal.style.display = 'none';
};

expenseForm.onsubmit = (e) => {
    e.preventDefault();
    
    const company = document.getElementById('company').value;
    const description = document.getElementById('description').value;
    const amount = document.getElementById('amount').value;
    const date = document.getElementById('date').value;
    
    const month = date.slice(0, 7); // YYYY-MM
    
    if (!state.expenses[month]) state.expenses[month] = [];
    state.expenses[month].push({ company, description, amount, date, paid: false });
    
    // Add to categories if new
    if (!state.companies.includes(company)) {
        state.companies.push(company);
        renderCompanyNav();
    }
    if (!state.descriptions.includes(description)) state.descriptions.push(description);
    
    saveState();
    state.currentMonth = month;
    monthPicker.value = month;
    renderDashboard();
    updateTitle();
    updateDataLists();
    
    expenseForm.reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    expenseModal.style.display = 'none';
};

// Categories Management
document.getElementById('btn-manage-categories').onclick = () => {
    renderCategoryTags();
    categoriesModal.style.display = 'flex';
};

function renderCategoryTags() {
    const compTags = document.getElementById('company-tags');
    const descTags = document.getElementById('description-tags');
    
    compTags.innerHTML = state.companies.map(c => `
        <span style="background: var(--bg-main); border: 1px solid var(--border); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
            ${c} <i data-lucide="x" style="width: 12px; height: 12px; cursor: pointer;" onclick="removeCompany('${c}')"></i>
        </span>
    `).join('');
    
    descTags.innerHTML = state.descriptions.map(d => `
        <span style="background: var(--bg-main); border: 1px solid var(--border); padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
            ${d} <i data-lucide="x" style="width: 12px; height: 12px; cursor: pointer;" onclick="removeDescription('${d}')"></i>
        </span>
    `).join('');
    
    lucide.createIcons();
}

window.removeCompany = (name) => {
    state.companies = state.companies.filter(c => c !== name);
    saveState();
    renderCategoryTags();
    updateDataLists();
};

window.removeDescription = (name) => {
    state.descriptions = state.descriptions.filter(d => d !== name);
    saveState();
    renderCategoryTags();
    updateDataLists();
};

document.getElementById('add-company-btn').onclick = () => {
    const val = document.getElementById('new-company').value.trim();
    if (val && !state.companies.includes(val)) {
        state.companies.push(val);
        saveState();
        renderCategoryTags();
        updateDataLists();
        document.getElementById('new-company').value = '';
    }
};

document.getElementById('add-description-btn').onclick = () => {
    const val = document.getElementById('new-description').value.trim();
    if (val && !state.descriptions.includes(val)) {
        state.descriptions.push(val);
        saveState();
        renderCategoryTags();
        updateDataLists();
        document.getElementById('new-description').value = '';
    }
};

document.getElementById('close-cat-modal').onclick = 
document.getElementById('close-cat-btn').onclick = () => {
    categoriesModal.style.display = 'none';
};

// Excel Export
document.getElementById('btn-export').onclick = () => {
    const currentExpenses = state.expenses[state.currentMonth] || [];
    if (currentExpenses.length === 0) {
        alert('No data to export for this month.');
        return;
    }

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Group by company
    const grouped = currentExpenses.reduce((acc, exp) => {
        if (!acc[exp.company]) acc[exp.company] = [];
        acc[exp.company].push(exp);
        return acc;
    }, {});

    const sortedCompanies = Object.keys(grouped).sort();

    // 1. Create Overview Sheet
    const overviewData = [
        ["Company", "Total Expense", "Status"],
        ...sortedCompanies.map(company => {
            const expenses = grouped[company];
            const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const allPaid = expenses.every(e => e.paid);
            return [company, total, allPaid ? "ALL PAID" : "PENDING"];
        }),
        ["", "", ""],
        ["Grand Total", currentExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0), ""]
    ];
    const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(wb, wsOverview, "Overview");

    // 2. Create individual sheets per company
    sortedCompanies.forEach(company => {
        const expenses = grouped[company];
        const companyData = [
            ["Date", "Description", "Amount", "Status"],
            ...expenses.sort((a,b) => new Date(a.date) - new Date(b.date)).map(e => [
                e.date, 
                e.description, 
                parseFloat(e.amount),
                e.paid ? "PAID" : "UNPAID"
            ]),
            ["", "", "", ""],
            ["Total", "", expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0), ""]
        ];
        const wsCompany = XLSX.utils.aoa_to_sheet(companyData);
        
        // Excel sheet names limited to 31 chars
        const sheetName = company.substring(0, 31).replace(/[\\/?*:[\]]/g, "");
        XLSX.utils.book_append_sheet(wb, wsCompany, sheetName);
    });

    // Highly robust download
    const fileName = `Expenses_Report_${state.currentMonth}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// Forecasting Logic
function updateForecastCompanySelect() {
    const select = document.getElementById('forecast-company-select');
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = state.companies.sort().map(c => `<option value="${c}">${c}</option>`).join('');
    if (currentVal && state.companies.includes(currentVal)) select.value = currentVal;
    else if (state.companies.length > 0) select.value = state.companies.sort()[0];
}

function renderForecasting() {
    const container = document.getElementById('forecast-tables-container');
    const company = document.getElementById('forecast-company-select').value;
    if (!container || !company) return;

    if (!state.forecast.items[company]) {
        state.forecast.items[company] = { cos: [], expenses: [] };
    }

    const data = state.forecast.items[company];
    const years = state.forecast.config.years;
    const esc = state.forecast.config.escalation / 100;

    container.innerHTML = '';
    
    // Render COS Table
    container.appendChild(createForecastTable(company, 'Cost of Sales', data.cos, years, esc));
    
    // Render Expenses Table
    container.appendChild(createForecastTable(company, 'Expenses', data.expenses, years, esc));
}

function createForecastTable(company, title, items, years, esc) {
    const type = title === 'Cost of Sales' ? 'cos' : 'expenses';
    const section = document.createElement('div');
    section.className = 'forecast-table-container fade-in';
    
    let tableHtml = `
        <div class="forecast-table-header">
            <h3>${title}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Yearly Projection</span>
        </div>
        <div style="overflow-x: auto;">
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th style="min-width: 200px;">Line Item</th>
                        <th>Base Amount</th>
                        ${Array.from({length: years}, (_, i) => `<th>Year ${i+1}</th>`).join('')}
                        <th style="width: 40px;"></th>
                    </tr>
                </thead>
                <tbody>
    `;

    let totals = Array(years + 1).fill(0);

    items.forEach((item, idx) => {
        const base = parseFloat(item.amount) || 0;
        totals[0] += base;
        
        tableHtml += `
            <tr>
                <td><input type="text" value="${item.description}" onchange="updateForecastItem('${company}', '${type}', ${idx}, 'description', this.value)"></td>
                <td><input type="number" value="${item.amount}" onchange="updateForecastItem('${company}', '${type}', ${idx}, 'amount', this.value)"></td>
                ${Array.from({length: years}, (_, i) => {
                    const projected = base * Math.pow(1 + esc, i + 1);
                    totals[i+1] += projected;
                    return `<td class="year-val">R ${projected.toLocaleString(undefined, {maximumFractionDigits: 0})}</td>`;
                }).join('')}
                <td>
                    <button onclick="deleteForecastItem('${company}', '${type}', ${idx})" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                        <i data-lucide="x" style="width:14px;"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    // Add Empty Row if no items
    if (items.length === 0) {
        tableHtml += `<tr><td colspan="${years + 3}" style="text-align:center; color:var(--text-muted); padding: 40px;">No items. Import CSV or click "Add Item" above.</td></tr>`;
    } else {
        // Total Row
        tableHtml += `
            <tr class="total-row">
                <td>Total ${title}</td>
                <td>R ${totals[0].toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                ${Array.from({length: years}, (_, i) => `<td class="year-val">R ${totals[i+1].toLocaleString(undefined, {maximumFractionDigits: 0})}</td>`).join('')}
                <td></td>
            </tr>
        `;
    }

    tableHtml += `</tbody></table></div>`;
    section.innerHTML = tableHtml;
    return section;
}

window.updateForecastItem = (company, type, index, field, value) => {
    state.forecast.items[company][type][index][field] = field === 'amount' ? parseFloat(value) : value;
    saveState();
    renderForecasting();
};

window.deleteForecastItem = (company, type, index) => {
    state.forecast.items[company][type].splice(index, 1);
    saveState();
    renderForecasting();
};

document.getElementById('btn-add-forecast-item').onclick = () => {
    const company = document.getElementById('forecast-company-select').value;
    if (!company) return;
    if (!state.forecast.items[company]) state.forecast.items[company] = { cos: [], expenses: [] };
    
    // Add to expenses by default
    state.forecast.items[company].expenses.push({ description: 'New Item', amount: 0 });
    saveState();
    renderForecasting();
};

// CSV Import for Forecasting
let activeImportType = 'cos';
document.getElementById('btn-import-cos').onclick = () => {
    activeImportType = 'cos';
    document.getElementById('forecast-csv-upload').click();
};
document.getElementById('btn-import-expenses').onclick = () => {
    activeImportType = 'expenses';
    document.getElementById('forecast-csv-upload').click();
};

document.getElementById('forecast-csv-upload').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        const company = document.getElementById('forecast-company-select').value;
        
        if (!state.forecast.items[company]) state.forecast.items[company] = { cos: [], expenses: [] };
        
        lines.forEach(line => {
            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 2) {
                const description = parts[0];
                const amount = parseFloat(parts[1].replace(/[^\d.-]/g, '')) || 0;
                state.forecast.items[company][activeImportType].push({ description, amount });
            }
        });
        
        saveState();
        renderForecasting();
        e.target.value = ''; // Reset for next import
    };
    reader.readAsText(file);
};

function handleBulkImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(l => l.trim());
        let count = 0;
        
        lines.forEach((line, index) => {
            // Skip header if it contains "date" or "company"
            if (index === 0 && (line.toLowerCase().includes('date') || line.toLowerCase().includes('company'))) return;
            
            const parts = line.split(',').map(p => p.trim());
            if (parts.length >= 4) {
                const dateStr = parts[0];
                const company = parts[1];
                const description = parts[2];
                const amount = parseFloat(parts[3].replace(/[^\d.-]/g, '')) || 0;
                
                if (!dateStr || !company || !description) return;

                const month = dateStr.slice(0, 7); // YYYY-MM
                
                if (!state.expenses[month]) state.expenses[month] = [];
                state.expenses[month].push({ company, description, amount, date: dateStr, paid: false });
                
                // Add company if new
                if (!state.companies.includes(company)) {
                    state.companies.push(company);
                }
                count++;
            }
        });
        
        saveState();
        renderCompanyNav();
        renderDashboard();
        updateDataLists();
        updateForecastCompanySelect();
        alert(`Success! Imported ${count} transactions across multiple companies.`);
        e.target.value = ''; // Reset
    };
    reader.readAsText(file);
}

function generateInvoice(company) {
    const masterList = state.expenses[state.currentMonth] || [];
    const unpaidItems = masterList.filter(e => e.company === company && !e.paid);
    
    const itemsBody = document.getElementById('invoice-items-body');
    const invDate = document.getElementById('inv-date');
    const invNum = document.getElementById('inv-number');
    const invTo = document.getElementById('inv-to-company');
    const invTotal = document.getElementById('inv-total');
    const invRef = document.getElementById('inv-ref');

    // Populate metadata
    const now = new Date();
    invDate.textContent = `Date: ${now.toLocaleDateString()}`;
    invNum.textContent = `Invoice #: INV-${now.getTime().toString().slice(-6)}`;
    invTo.textContent = company;
    invRef.textContent = `${company.slice(0,3).toUpperCase()}-${state.currentMonth}`;

    itemsBody.innerHTML = '';
    let total = 0;

    unpaidItems.forEach(item => {
        const amt = parseFloat(item.amount);
        total += amt;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.date}</td>
            <td>${item.description}</td>
            <td style="text-align: right;">R ${amt.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
        `;
        itemsBody.appendChild(row);
    });

    if (unpaidItems.length === 0) {
        itemsBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 40px; color: #999;">No unpaid expenses for this company.</td></tr>';
    }

    invTotal.textContent = `R ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    lucide.createIcons();
}

init();
