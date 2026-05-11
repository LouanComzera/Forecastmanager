// State Management
const VERSION = "1.1.2";
console.log(`Expense Manager v${VERSION} Initializing...`);

// Utilities
const utils = {
    num: (val) => parseFloat(val) || 0,
    curr: (val) => `R ${(parseFloat(val) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
    date: (str) => new Date(str).toLocaleDateString()
};

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
    currentView: 'summary', // Start with Dashboard
    fyStartMonth: parseInt(localStorage.getItem('fyStartMonth')) || 2, // Default March
    fixedExpenses: JSON.parse(localStorage.getItem('fixedExpenses')) || [], // Recurring items
    forecast: JSON.parse(localStorage.getItem('forecast_data')) || {
        config: { years: 3, escalation: 5, scale: 'month' },
        items: {} // { company: { sales: [], cos: [], expenses: [] } }
    }
};

// DOM Elements
const viewSummary = document.getElementById('view-summary');
const viewExpenses = document.getElementById('view-expenses');
const viewForecasting = document.getElementById('view-forecasting');
const viewSettings = document.getElementById('view-settings');
const btnViewSummary = document.getElementById('btn-view-summary');
const btnViewExpenses = document.getElementById('btn-view-expenses');
const btnViewForecasting = document.getElementById('btn-view-forecasting');
const btnViewSettings = document.getElementById('btn-view-settings');
const companyNavList = document.getElementById('company-nav-list');
const dashboardGridEl = document.getElementById('dashboard-grid');
const currentMonthDisplay = document.getElementById('current-month-display');
const expenseModal = document.getElementById('expense-modal');
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

    const forecastScaleMonth = document.getElementById('forecast-scale-month');
    const forecastScaleYear = document.getElementById('forecast-scale-year');

    // View Switching
    btnViewSummary.onclick = () => {
        state.currentView = 'summary';
        switchView();
    };

    btnViewExpenses.onclick = () => {
        state.currentView = 'expenses';
        switchView();
    };

    btnViewForecasting.onclick = () => {
        state.currentView = 'forecasting';
        switchView();
    };

    btnViewSettings.onclick = () => {
        state.currentView = 'settings';
        switchView();
    };

    // Settings listeners
    const fyStartSelect = document.getElementById('settings-fy-start');
    if (fyStartSelect) {
        fyStartSelect.value = state.fyStartMonth;
        fyStartSelect.onchange = (e) => {
            state.fyStartMonth = parseInt(e.target.value);
            localStorage.setItem('fyStartMonth', state.fyStartMonth);
            renderSummaryDashboard();
        };
    }

    const btnAddCategory = document.getElementById('btn-add-category-settings');
    if (btnAddCategory) {
        btnAddCategory.onclick = () => {
            const input = document.getElementById('new-category-input');
            const val = input.value.trim();
            if (val && !state.descriptions.includes(val)) {
                state.descriptions.push(val);
                saveState();
                input.value = '';
                renderSettings();
                updateDataLists();
            }
        };
    }

    const btnAddCompany = document.getElementById('btn-add-company-settings');
    if (btnAddCompany) {
        btnAddCompany.onclick = () => {
            const input = document.getElementById('new-company-input');
            const val = input.value.trim();
            if (val && !state.companies.includes(val)) {
                state.companies.push(val);
                saveState();
                input.value = '';
                renderSettings();
                renderCompanyNav();
                updateForecastCompanySelect();
            }
        };
    }

    // Forecasting Scale Toggles
    if (forecastScaleMonth) {
        forecastScaleMonth.onclick = () => {
            state.forecast.config.scale = 'month';
            forecastScaleMonth.classList.add('active');
            forecastScaleYear.classList.remove('active');
            renderForecasting();
        };
    }

    if (forecastScaleYear) {
        forecastScaleYear.onclick = () => {
            state.forecast.config.scale = 'year';
            forecastScaleYear.classList.add('active');
            forecastScaleMonth.classList.remove('active');
            renderForecasting();
        };
    }

    // Month Navigation
    document.getElementById('select-month').onchange = onSelectorChange;
    document.getElementById('select-year').onchange = onSelectorChange;

    prevMonthBtn.onclick = () => {
        const date = new Date(state.currentMonth + '-01');
        date.setMonth(date.getMonth() - 1);
        state.currentMonth = date.toISOString().slice(0, 7);
        updateSelectors();
        switchView();
        updateTitle();
    };

    nextMonthBtn.onclick = () => {
        const date = new Date(state.currentMonth + '-01');
        date.setMonth(date.getMonth() + 1);
        state.currentMonth = date.toISOString().slice(0, 7);
        updateSelectors();
        switchView();
        updateTitle();
    };

    // Bulk Import Trigger
    document.getElementById('btn-bulk-import').onclick = () => {
        document.getElementById('bulk-csv-upload').click();
    };

    document.getElementById('bulk-csv-upload').onchange = handleBulkImport;

    // Forecasting Import Listeners
    const btnImpSales = document.getElementById('btn-import-sales');
    const btnImpCos = document.getElementById('btn-import-cos');
    const btnImpExp = document.getElementById('btn-import-expenses');

    if (btnImpSales) btnImpSales.onclick = () => document.getElementById('sales-csv-upload')?.click();
    if (btnImpCos) btnImpCos.onclick = () => document.getElementById('cos-csv-upload')?.click();
    if (btnImpExp) btnImpExp.onclick = () => document.getElementById('forecast-exp-csv-upload')?.click();

    const inpSales = document.getElementById('sales-csv-upload');
    const inpCos = document.getElementById('cos-csv-upload');
    const inpExp = document.getElementById('forecast-exp-csv-upload');

    if (inpSales) inpSales.onchange = (e) => handleForecastImport(e, 'sales');
    if (inpCos) inpCos.onchange = (e) => handleForecastImport(e, 'cos');
    if (inpExp) inpExp.onchange = (e) => handleForecastImport(e, 'expenses');

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

    if (forecastEsc) {
        forecastEsc.oninput = (e) => {
            state.forecast.config.escalation = parseFloat(e.target.value) || 0;
            saveState();
            renderForecasting();
        };
    }

    forecastCompanySelect.onchange = (e) => {
        renderForecasting();
    };

    const btnAddItem = document.getElementById('btn-add-forecast-item');
    if (btnAddItem) {
        btnAddItem.onclick = () => {
            const company = document.getElementById('forecast-company-select').value;
            if (!company) return;
            if (!state.forecast.items[company]) state.forecast.items[company] = { sales: [], cos: [], expenses: [] };
            state.forecast.items[company].expenses.push({ description: 'New Item', amount: 0, escalation: state.forecast.config.escalation });
            saveState();
            renderForecasting();
        };
    }

    const currentYearNum = new Date().getFullYear();
    for (let y = currentYearNum + 1; y >= 2022; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        selectYear.appendChild(opt);
    }

    updateSelectors();
    renderCompanyNav();
    switchView();
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
}

function updateSelectors() {
    const selectMonth = document.getElementById('select-month');
    const selectYear = document.getElementById('select-year');
    if (!selectMonth || !selectYear) return;
    const [year, month] = state.currentMonth.split('-');
    selectMonth.value = month;
    selectYear.value = year;
}

function onSelectorChange() {
    const selectMonth = document.getElementById('select-month');
    const selectYear = document.getElementById('select-year');
    state.currentMonth = `${selectYear.value}-${selectMonth.value}`;
    switchView();
    updateTitle();
}

function updateTitle() {
    const monthName = new Date(state.currentMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (state.selectedCompany === 'all') {
        currentMonthDisplay.textContent = `All Expenses - ${monthName}`;
    } else {
        currentMonthDisplay.textContent = `${state.selectedCompany} - ${monthName}`;
    }
}

function switchView() {
    viewSummary.classList.add('hidden');
    viewExpenses.classList.add('hidden');
    viewForecasting.classList.add('hidden');
    if (viewSettings) viewSettings.classList.add('hidden');
    
    btnViewSummary.classList.remove('active');
    btnViewExpenses.classList.remove('active');
    btnViewForecasting.classList.remove('active');
    if (btnViewSettings) btnViewSettings.classList.remove('active');

    if (state.currentView === 'summary') {
        viewSummary.classList.remove('hidden');
        btnViewSummary.classList.add('active');
        renderSummaryDashboard();
    } else if (state.currentView === 'expenses') {
        viewExpenses.classList.remove('hidden');
        btnViewExpenses.classList.add('active');
        renderDashboard();
    } else if (state.currentView === 'forecasting') {
        viewForecasting.classList.remove('hidden');
        btnViewForecasting.classList.add('active');
        renderForecasting();
    } else if (state.currentView === 'settings') {
        viewSettings.classList.remove('hidden');
        btnViewSettings.classList.add('active');
        renderSettings();
    }
    renderCompanyNav();
    
    // Auto-populate fixed expenses if month is empty
    if (state.currentView === 'expenses' && (!state.expenses[state.currentMonth] || state.expenses[state.currentMonth].length === 0)) {
        if (state.fixedExpenses.length > 0) {
            if (!state.expenses[state.currentMonth]) state.expenses[state.currentMonth] = [];
            
            // Add fixed expenses for today's date in that month
            const yearMonth = state.currentMonth; // YYYY-MM
            const today = new Date().toISOString().split('T')[0];
            const defaultDate = today.startsWith(yearMonth) ? today : `${yearMonth}-01`;
            
            state.fixedExpenses.forEach(fe => {
                state.expenses[state.currentMonth].push({
                    company: fe.company,
                    description: fe.description,
                    amount: fe.amount,
                    date: defaultDate,
                    paid: false,
                    fixed: true
                });
            });
            saveState();
            renderDashboard();
        }
    }
}

function renderSettings() {
    // Categories List
    const categoryList = document.getElementById('settings-categories-list');
    if (categoryList) {
        categoryList.innerHTML = state.descriptions.sort().map(cat => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                <span>${cat}</span>
                <button onclick="deleteCategory('${cat}')" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                    <i data-lucide="trash-2" style="width:14px;"></i>
                </button>
            </div>
        `).join('');
    }

    // Companies Grid
    const companyGrid = document.getElementById('settings-companies-grid');
    if (companyGrid) {
        companyGrid.innerHTML = state.companies.sort().map(comp => `
            <div class="settings-item-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <strong style="color: var(--text-main); font-size: 0.95rem;">${comp}</strong>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="editCompany('${comp}')" class="btn btn-secondary btn-sm" style="padding: 4px 8px;"><i data-lucide="edit-3" style="width: 14px;"></i></button>
                        <button onclick="deleteCompany('${comp}')" class="btn btn-secondary btn-sm" style="padding: 4px 8px; color: #ef4444;"><i data-lucide="trash-2" style="width: 14px;"></i></button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // Fixed Expenses List
    const fixedList = document.getElementById('settings-fixed-expenses-list');
    if (fixedList) {
        if (state.fixedExpenses.length === 0) {
            fixedList.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No fixed expenses set up yet.</p>';
        } else {
            fixedList.innerHTML = state.fixedExpenses.map((fe, idx) => `
                <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <strong style="color: var(--text-main);">${fe.description}</strong>
                        <div style="display: flex; gap: 12px; font-size: 0.8rem; color: var(--text-muted);">
                            <span><i data-lucide="building-2" style="width:12px; height:12px; vertical-align:middle;"></i> ${fe.company}</span>
                            <span><i data-lucide="banknote" style="width:12px; height:12px; vertical-align:middle;"></i> R ${parseFloat(fe.amount).toLocaleString()}</span>
                        </div>
                    </div>
                    <button onclick="removeFixedExpense(${idx})" style="background:none; border:none; color:var(--warning); cursor:pointer; padding: 8px;">
                        <i data-lucide="trash-2" style="width:16px;"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    lucide.createIcons();
}

window.removeFixedExpense = (idx) => {
    if (confirm('Stop this expense from recurring in future months?')) {
        state.fixedExpenses.splice(idx, 1);
        localStorage.setItem('fixedExpenses', JSON.stringify(state.fixedExpenses));
        renderSettings();
    }
};

window.deleteCategory = (cat) => {
    if (confirm(`Delete category "${cat}"? This won't delete existing transactions.`)) {
        state.descriptions = state.descriptions.filter(c => c !== cat);
        saveState();
        renderSettings();
        updateDataLists();
    }
};

window.deleteCompany = (comp) => {
    if (confirm(`Are you sure you want to delete "${comp}"? This will hide its data until you add it back.`)) {
        state.companies = state.companies.filter(c => c !== comp);
        saveState();
        renderSettings();
        renderCompanyNav();
        updateForecastCompanySelect();
    }
};

window.editCompany = (oldName) => {
    const newName = prompt(`Enter new name for "${oldName}":`, oldName);
    if (newName && newName.trim() !== "" && newName !== oldName) {
        state.companies = state.companies.map(c => c === oldName ? newName.trim() : c);
        
        // Update data in state.expenses too
        for (let month in state.expenses) {
            state.expenses[month].forEach(exp => {
                if (exp.company === oldName) exp.company = newName.trim();
            });
        }
        
        // Update forecasting data
        if (state.forecast.items[oldName]) {
            state.forecast.items[newName.trim()] = state.forecast.items[oldName];
            delete state.forecast.items[oldName];
        }

        saveState();
        renderSettings();
        renderCompanyNav();
        updateForecastCompanySelect();
    }
};

let companyChart = null;

function renderSummaryDashboard() {
    const currentExpenses = state.expenses[state.currentMonth] || [];
    const totalExpenses = currentExpenses.reduce((sum, e) => sum + utils.num(e.amount), 0);
    const unpaidItems = currentExpenses.filter(e => !e.paid);
    const pendingTotal = unpaidItems.reduce((sum, e) => sum + utils.num(e.amount), 0);
    
    document.getElementById('summary-total-expenses').textContent = utils.curr(totalExpenses);
    document.getElementById('summary-expense-count').textContent = `${currentExpenses.length} transactions`;
    document.getElementById('summary-pending-total').textContent = utils.curr(pendingTotal);
    document.getElementById('summary-pending-count').textContent = `${unpaidItems.length} items unpaid`;
    document.getElementById('summary-company-count').textContent = state.companies.length;

    // Spending by Company Chart
    const companyTotals = {};
    currentExpenses.forEach(e => {
        companyTotals[e.company] = (companyTotals[e.company] || 0) + (parseFloat(e.amount) || 0);
    });

    const ctx = document.getElementById('company-spend-chart').getContext('2d');
    if (companyChart) companyChart.destroy();
    
    companyChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(companyTotals),
            datasets: [{
                data: Object.values(companyTotals),
                backgroundColor: [
                    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
                }
            },
            cutout: '70%'
        }
    });

    // Top Expenses List
    const topExpenses = [...currentExpenses].sort((a,b) => utils.num(b.amount) - utils.num(a.amount)).slice(0, 5);
    const listEl = document.getElementById('summary-top-expenses-list');
    listEl.innerHTML = topExpenses.map(e => `
        <div class="top-expense-item">
            <div>
                <div style="font-weight: 500;">${e.description}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${e.company}</div>
            </div>
            <div style="font-weight: 600;">${utils.curr(e.amount)}</div>
        </div>
    `).join('') || '<p style="color: var(--text-muted); padding: 20px; text-align: center;">No data for this month.</p>';
}
function saveState() {
    localStorage.setItem('expenses', JSON.stringify(state.expenses));
    localStorage.setItem('companies', JSON.stringify(state.companies));
    localStorage.setItem('descriptions', JSON.stringify(state.descriptions));
    localStorage.setItem('forecast_data', JSON.stringify(state.forecast));
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
        const total = expenses.reduce((sum, e) => sum + utils.num(e.amount), 0);
        
        const card = document.createElement('div');
        card.className = 'company-card fade-in';
        card.innerHTML = `
            <div class="company-header">
                <span class="company-name">${company}</span>
                <span class="company-total">${utils.curr(total)}</span>
            </div>
            <div class="expense-list">
                ${expenses.sort((a,b) => new Date(a.date) - new Date(b.date)).map((e) => `
                    <div class="expense-item ${e.paid ? 'is-paid' : ''}">
                        <button onclick="togglePaid('${company}', '${e.description.replace(/'/g, "\\'")}', '${e.date}', '${e.amount}')" class="paid-toggle ${e.paid ? 'paid' : 'unpaid'}" title="${e.paid ? 'Mark as Unpaid' : 'Mark as Paid'}">
                            <i data-lucide="${e.paid ? 'check-circle' : 'circle'}"></i>
                        </button>
                        <div class="expense-desc">
                            <div style="font-weight: 500;">${e.description}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">${utils.date(e.date)}</div>
                        </div>
                        <div class="expense-amt" style="margin-left: auto;">${utils.curr(e.amount)}</div>
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
        switchView();
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
        switchView();
    }
};

// Event Listeners
const btnAddExpense = document.getElementById('btn-add-expense');
if (btnAddExpense) {
    btnAddExpense.onclick = () => {
        expenseModal.style.display = 'flex';
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    };
}

const closeModal = document.getElementById('close-modal');
if (closeModal) closeModal.onclick = () => expenseModal.style.display = 'none';

const cancelExpense = document.getElementById('cancel-expense');
if (cancelExpense) cancelExpense.onclick = () => expenseModal.style.display = 'none';

if (expenseForm) {
    expenseForm.onsubmit = (e) => {
        e.preventDefault();
        
        const company = document.getElementById('company').value;
        const description = document.getElementById('description').value;
        const amount = document.getElementById('amount').value;
        const date = document.getElementById('date').value;
        const isFixed = document.getElementById('is-fixed-expense').checked;
        
        const month = date.slice(0, 7); // YYYY-MM
        
        const expenseObj = { company, description, amount, date, paid: false, fixed: isFixed };
        
        if (!state.expenses[month]) state.expenses[month] = [];
        state.expenses[month].push(expenseObj);
        
        // If fixed, add to global fixed list if not already there
        if (isFixed) {
            const alreadyExists = state.fixedExpenses.some(fe => fe.company === company && fe.description === description);
            if (!alreadyExists) {
                state.fixedExpenses.push({ company, description, amount });
                localStorage.setItem('fixedExpenses', JSON.stringify(state.fixedExpenses));
            }
        }
        
        // Add to categories if new
        if (!state.companies.includes(company)) {
            state.companies.push(company);
            renderCompanyNav();
        }
        if (!state.descriptions.includes(description)) state.descriptions.push(description);
        
        saveState();
        state.currentMonth = month;
        updateSelectors(); // Use the existing helper
        switchView(); // Refresh the active view
        updateDataLists();
        
        expenseForm.reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        expenseModal.style.display = 'none';
    };
}

// Excel Export
const btnExport = document.getElementById('btn-export');
if (btnExport) {
    btnExport.onclick = () => {
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
}

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
        state.forecast.items[company] = { sales: [], cos: [], expenses: [] };
    }

    const data = state.forecast.items[company];
    const years = state.forecast.config.years;
    const scale = state.forecast.config.scale;
    const globalEsc = state.forecast.config.escalation / 100;

    container.innerHTML = '';
    
    // Render Sales Table
    container.appendChild(createForecastTable(company, 'Sales / Revenue', data.sales || [], years, globalEsc, scale, 'sales'));
    
    // Render COS Table
    container.appendChild(createForecastTable(company, 'Cost of Sales (COS)', data.cos || [], years, globalEsc, scale, 'cos'));
    
    // Render Expenses Table
    container.appendChild(createForecastTable(company, 'Operating Expenses', data.expenses || [], years, globalEsc, scale, 'expenses'));

    lucide.createIcons();
}

function createForecastTable(company, title, items, years, globalEsc, scale, type) {
    const section = document.createElement('div');
    section.className = 'forecast-table-container fade-in';
    
    const isMonthly = scale === 'month';
    const numColumns = isMonthly ? years * 12 : years;
    
    let tableHtml = `
        <div class="forecast-table-header">
            <h3>${title}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">${isMonthly ? 'Monthly' : 'Yearly'} Projection</span>
        </div>
        <div style="overflow-x: auto;">
            <table class="forecast-table">
                <thead>
                    <tr>
                        <th style="min-width: 220px;">Line Item</th>
                        <th style="min-width: 160px;">Base Amount</th>
                        <th title="Custom escalation for this item" style="min-width: 80px;">Esc %</th>
                        ${Array.from({length: numColumns}, (_, i) => {
                            if (isMonthly) {
                                const m = (state.fyStartMonth + i) % 12;
                                const yOffset = Math.floor((state.fyStartMonth + i) / 12);
                                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                                return `<th style="min-width: 110px;">${months[m]} '${(new Date().getFullYear() + yOffset).toString().slice(-2)}</th>`;
                            } else {
                                return `<th style="min-width: 140px;">Year ${i+1}</th>`;
                            }
                        }).join('')}
                        <th style="width: 40px;"></th>
                    </tr>
                </thead>
                <tbody>
    `;

    let totals = Array(numColumns).fill(0);
    let baseTotal = 0;

    items.forEach((item, idx) => {
        const base = utils.num(item.amount);
        const displayEsc = item.escalation !== undefined ? item.escalation : (globalEsc * 100);
        const effectiveEsc = displayEsc / 100;
        if (!item.overrides) item.overrides = {};
        
        baseTotal += base;
        
        tableHtml += `
            <tr>
                <td><input type="text" value="${item.description}" class="item-edit-input" onchange="updateForecastItem('${company}', '${type}', ${idx}, 'description', this.value)"></td>
                <td><input type="number" value="${item.amount}" class="item-edit-input" style="width: 140px;" onchange="updateForecastItem('${company}', '${type}', ${idx}, 'amount', this.value)"></td>
                <td><input type="number" value="${displayEsc.toFixed(1)}" class="item-esc-input" onchange="updateForecastItem('${company}', '${type}', ${idx}, 'escalation', this.value)"></td>
                ${Array.from({length: numColumns}, (_, i) => {
                    // Revert to yearly escalation step-up: floor(i/12)
                    const yearPower = isMonthly ? Math.floor(i / 12) : (i + 1);
                    const calculated = base * Math.pow(1 + effectiveEsc, yearPower);
                    
                    // Check for manual override
                    const val = item.overrides[i] !== undefined ? item.overrides[i] : Math.round(calculated);
                    
                    totals[i] += parseFloat(val) || 0;
                    return `
                        <td class="year-val" style="min-width: 120px; padding: 4px;">
                            <div style="display: flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.03); border-radius: 4px; padding: 2px 6px; border: 1px solid transparent;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='transparent'">
                                <span style="font-size: 0.7rem; color: var(--text-muted); opacity: 0.5;">R</span>
                                <input type="number" value="${val}" 
                                    style="background: transparent; border: none; color: var(--accent-green); font-family: var(--font-mono); font-weight: 600; width: 100%; outline: none; padding: 0; font-size: 0.85rem;"
                                    onchange="updateForecastOverride('${company}', '${type}', ${idx}, ${i}, this.value)">
                            </div>
                        </td>`;
                }).join('')}
                <td>
                    <button onclick="deleteForecastItem('${company}', '${type}', ${idx})" style="background:none; border:none; color:var(--text-muted); cursor:pointer;">
                        <i data-lucide="x" style="width:14px;"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    if (items.length === 0) {
        tableHtml += `<tr><td colspan="${numColumns + 4}" style="text-align:center; color:var(--text-muted); padding: 40px;">No items found. Import a CSV to get started.</td></tr>`;
    } else {
        tableHtml += `
            <tr class="total-row">
                <td>Total ${title}</td>
                <td>${utils.curr(baseTotal)}</td>
                <td>-</td>
                ${Array.from({length: numColumns}, (_, i) => `<td class="year-val">${utils.curr(totals[i])}</td>`).join('')}
                <td></td>
            </tr>
        `;
    }

    tableHtml += `</tbody></table></div>`;
    section.innerHTML = tableHtml;
    return section;
}

window.updateForecastItem = (company, type, index, field, value) => {
    if (field === 'amount' || field === 'escalation') {
        state.forecast.items[company][type][index][field] = parseFloat(value) || 0;
    } else {
        state.forecast.items[company][type][index][field] = value;
    }
    saveState();
    renderForecasting();
};

window.deleteForecastItem = (company, type, index) => {
    state.forecast.items[company][type].splice(index, 1);
    saveState();
    renderForecasting();
};

window.updateForecastOverride = (company, type, itemIdx, monthIdx, value) => {
    const item = state.forecast.items[company][type][itemIdx];
    if (!item.overrides) item.overrides = {};
    item.overrides[monthIdx] = parseFloat(value);
    saveState();
    renderForecasting();
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


function handleForecastImport(event, type) {
    const file = event.target.files[0];
    const companySelect = document.getElementById('forecast-company-select');
    const company = companySelect ? companySelect.value : null;

    if (!file) return;
    if (!company) {
        alert("Please select a company from the dropdown before importing.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        
        if (!state.forecast.items[company]) {
            state.forecast.items[company] = { sales: [], cos: [], expenses: [] };
        }
        
        // Final safety check to ensure the specific type exists (e.g. legacy data fix)
        if (!state.forecast.items[company][type]) {
            state.forecast.items[company][type] = [];
        }

        let count = 0;
        lines.forEach((line, i) => {
            // Split by comma or semicolon and trim quotes/spaces
            const parts = line.split(/[;,]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
            
            if (parts.length < 2) return;

            // Header detection: skip if it's the first line and looks like a header
            const firstPart = parts[0].toLowerCase();
            if (i === 0 && (firstPart.includes('desc') || firstPart.includes('item') || firstPart.includes('sale') || firstPart.includes('name'))) {
                return;
            }

            const desc = parts[0];
            // Clean amount: remove everything except numbers, dots, and minus
            const amtStr = parts[1].replace(/[^\d.-]/g, '');
            const amt = parseFloat(amtStr);

            if (isNaN(amt)) return;

            const item = {
                description: desc,
                amount: amt,
                overrides: {},
                escalation: undefined
            };

            // Optional 3rd column for escalation
            if (parts.length >= 3) {
                const escStr = parts[2].replace(/[^\d.-]/g, '');
                const esc = parseFloat(escStr);
                if (!isNaN(esc)) item.escalation = esc;
            }

            state.forecast.items[company][type].push(item);
            count++;
        });

        if (count > 0) {
            saveState();
            renderForecasting();
            alert(`Successfully imported ${count} ${type} items for ${company}.`);
        } else {
            alert("No valid data rows found in the CSV. Please check the file format (Description, Amount).");
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}

init();
