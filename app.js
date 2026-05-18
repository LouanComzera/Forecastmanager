// State Management
const VERSION = "1.2.4";
console.log(`Expense Manager v${VERSION} Initializing...`);

// Utilities
const utils = {
    num: (val) => parseFloat(val) || 0,
    curr: (val) => `R ${(parseFloat(val) || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}`,
    date: (str) => new Date(str).toLocaleDateString()
};

let state = {
    expenses: {},
    companies: ["RSA", "Equisim", "Eazytask", "Muniflow", "Comzera Solutions", "Comzera Technologies"],
    descriptions: ["VAT", "Azure", "Sage", "Konsulent", "Lou-an", "Dian Expense", "PAYE/UIF", "Mongo"],
    currentMonth: new Date().toISOString().slice(0, 7),
    selectedCompany: 'all',
    currentView: 'summary',
    fyStartMonth: 2,
    fixedExpenses: [],
    forecast: { config: { years: 3, escalation: 5, scale: 'month' }, items: {} },
    pettyCash: {},
    workspaces: [{ id: 'w_global', name: 'Global Workspace', companies: [] }],
    users: [],
    currentUser: null,
    mileageRate: 4.50,
    currentUserId: null
};

// Selected Workspace ID
state.selectedWorkspaceId = 'w_global';

// Access Control Helper (Now filters based on selected workspace AND user context!)
const utils_access = {
    canViewAll: () => state.currentUser && state.currentUser.role === 'Admin',
    getAllowedCompanies: () => {
        // If w_global is selected or the user is admin and w_global is selected, show all
        if (state.selectedWorkspaceId === 'w_global') {
            if (state.currentUser && state.currentUser.role !== 'Admin') {
                let allowed = new Set();
                state.currentUser.workspaces.forEach(wId => {
                    const ws = state.workspaces.find(w => w.id === wId);
                    if (ws && ws.companies) {
                        ws.companies.forEach(c => allowed.add(c));
                    }
                });
                return Array.from(allowed);
            }
            return state.companies;
        }
        
        // Otherwise, show only the companies that belong to the active workspace
        const activeWs = state.workspaces.find(w => w.id === state.selectedWorkspaceId);
        if (activeWs && activeWs.companies) {
            return activeWs.companies;
        }
        return [];
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

// Petty Cash DOM (Initialized in init)
let viewPettyCash, btnViewPettyCash, pettyUserSelect, pettyReceiptModal, travelModal;

// Initialize
function init() {
    // Initialize Petty Cash DOM
    viewPettyCash = document.getElementById('view-petty-cash');
    btnViewPettyCash = document.getElementById('btn-view-petty-cash');
    pettyUserSelect = document.getElementById('petty-cash-user-select');
    pettyReceiptModal = document.getElementById('petty-receipt-modal');
    travelModal = document.getElementById('travel-modal');

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

    btnViewPettyCash.onclick = () => {
        state.currentView = 'petty-cash';
        switchView();
    };

    // Settings listeners
    const fyStartSelect = document.getElementById('settings-fy-start');
    if (fyStartSelect) {
        fyStartSelect.value = state.fyStartMonth;
        fyStartSelect.onchange = (e) => {
            state.fyStartMonth = parseInt(e.target.value);
            saveState();
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
    // Workspace Switcher Logic
    window.updateWorkspaceDropdown = function() {
        const activeWorkspaceSelect = document.getElementById('active-workspace-select');
        if (activeWorkspaceSelect) {
            // Show w_global plus workspaces owned by this user (or all if admin)
            const allowedWorkspaces = state.currentUser && state.currentUser.role === 'Admin' 
                ? state.workspaces 
                : state.workspaces.filter(w => w.id === 'w_global' || w.ownerId === state.currentUser.id);

            activeWorkspaceSelect.innerHTML = allowedWorkspaces.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
            if (state.selectedWorkspaceId) {
                if (allowedWorkspaces.some(w => w.id === state.selectedWorkspaceId)) {
                    activeWorkspaceSelect.value = state.selectedWorkspaceId;
                } else {
                    state.selectedWorkspaceId = 'w_global';
                    activeWorkspaceSelect.value = 'w_global';
                    saveState();
                }
            }
            
            activeWorkspaceSelect.onchange = (e) => {
                state.selectedWorkspaceId = e.target.value;
                saveState();
                
                // Refresh entire UI context for this workspace
                renderCompanyNav();
                switchView();
                renderSummaryDashboard();
            };
        }
    };
    updateWorkspaceDropdown();

    // Settings: Add Workspace
    const btnAddWorkspace = document.getElementById('btn-add-workspace');
    if (btnAddWorkspace) {
        btnAddWorkspace.onclick = () => {
            const input = document.getElementById('new-workspace-name');
            const val = input.value.trim();
            if (val) {
                const checkedBoxes = Array.from(document.querySelectorAll('#new-workspace-companies input:checked')).map(cb => cb.value);
                const newWs = {
                    id: 'w_' + Date.now(),
                    name: val,
                    companies: checkedBoxes,
                    ownerId: state.currentUser ? state.currentUser.id : null
                };
                state.workspaces.push(newWs);
                saveState();
                input.value = '';
                // Uncheck all
                document.querySelectorAll('#new-workspace-companies input').forEach(cb => cb.checked = false);
                renderSettings();
                updateWorkspaceDropdown();
            }
        };
    }

    // Settings: Add User
    const btnAddUser = document.getElementById('btn-add-user');
    if (btnAddUser) {
        btnAddUser.onclick = () => {
            const nameInput = document.getElementById('new-user-name');
            const roleInput = document.getElementById('new-user-role');
            const wsSelect = document.getElementById('new-user-workspaces');
            const emailInput = document.getElementById('new-user-email');
            const passInput = document.getElementById('new-user-password');
            
            const val = nameInput.value.trim();
            const emailVal = emailInput.value.trim().toLowerCase();
            const passVal = passInput.value;
            
            if (val && emailVal && passVal) {
                if (state.users.some(u => u.email === emailVal)) {
                    alert('An account with this email already exists.');
                    return;
                }
                
                const selectedWs = Array.from(wsSelect.selectedOptions).map(opt => opt.value);
                const newUser = {
                    id: 'u_' + Date.now(),
                    name: val,
                    email: emailVal,
                    password: passVal,
                    role: roleInput.value,
                    workspaces: selectedWs
                };
                state.users.push(newUser);
                saveState();
                nameInput.value = '';
                emailInput.value = '';
                passInput.value = '';
                renderSettings();
                
                updateWorkspaceDropdown();
                updatePettyUserSelect();
            } else {
                alert('Please fill in all fields.');
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
    updatePettyUserSelect();
    lucide.createIcons();
    
    // Set default date in form
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    
    // Date Picker Enhancements (Removed to fix global click trap)
    const dateInput = document.getElementById('date');
    const todayBtn = document.getElementById('btn-set-today');
    
    if (todayBtn && dateInput) {
        todayBtn.onclick = (e) => {
            e.stopPropagation();
            dateInput.value = new Date().toISOString().split('T')[0];
        };
    }

    // Petty Cash Listeners
    if (document.getElementById('btn-add-petty-receipt')) {
        document.getElementById('btn-add-petty-receipt').onclick = () => {
            if (pettyReceiptModal) pettyReceiptModal.style.display = 'flex';
            const dateInput = document.getElementById('petty-receipt-date');
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        };
    }
    if (document.getElementById('btn-log-travel')) {
        document.getElementById('btn-log-travel').onclick = () => {
            if (travelModal) travelModal.style.display = 'flex';
            const dateInput = document.getElementById('travel-date');
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
        };
    }
    if (document.getElementById('close-petty-modal')) document.getElementById('close-petty-modal').onclick = () => pettyReceiptModal.style.display = 'none';
    if (document.getElementById('cancel-petty-receipt')) document.getElementById('cancel-petty-receipt').onclick = () => pettyReceiptModal.style.display = 'none';
    if (document.getElementById('close-travel-modal')) document.getElementById('close-travel-modal').onclick = () => travelModal.style.display = 'none';
    if (document.getElementById('cancel-travel')) document.getElementById('cancel-travel').onclick = () => travelModal.style.display = 'none';
    
    if (pettyUserSelect) pettyUserSelect.onchange = () => renderPettyCash();

    const btnSavePetty = document.getElementById('btn-save-petty-receipt');
    if (btnSavePetty) {
        btnSavePetty.onclick = () => {
            console.log("Saving Petty Cash Receipt...");
            const month = state.currentMonth;
            const user = pettyUserSelect ? pettyUserSelect.value : 'lou-an';
            
            const amountInput = document.getElementById('petty-receipt-amount');
            const dateInput = document.getElementById('petty-receipt-date');
            const descInput = document.getElementById('petty-receipt-desc');
            const compInput = document.getElementById('petty-receipt-company');

            if (!amountInput.value || !dateInput.value || !descInput.value || !compInput.value) {
                alert("Please fill in all fields.");
                return;
            }

            const entry = {
                company: compInput.value,
                description: descInput.value,
                amount: parseFloat(amountInput.value) || 0,
                date: dateInput.value,
                id: Date.now()
            };
            
            if (!state.pettyCash[month]) state.pettyCash[month] = {};
            if (!state.pettyCash[month][user]) state.pettyCash[month][user] = { receipts: [], travel: [] };
            
            state.pettyCash[month][user].receipts.push(entry);
            localStorage.setItem('petty_cash', JSON.stringify(state.pettyCash));
            
            renderPettyCash();
            if (pettyReceiptModal) pettyReceiptModal.style.display = 'none';
            document.getElementById('petty-receipt-form').reset();
            alert("Receipt Saved!");
        };
    }

    const btnSaveTravel = document.getElementById('btn-save-travel');
    if (btnSaveTravel) {
        btnSaveTravel.onclick = () => {
            console.log("Saving Travel Trip...");
            const month = state.currentMonth;
            const user = pettyUserSelect ? pettyUserSelect.value : 'lou-an';
            
            const kilosInput = document.getElementById('travel-kilos');
            const reasonInput = document.getElementById('travel-reason');
            const dateInput = document.getElementById('travel-date');
            const compInput = document.getElementById('travel-company');

            if (!kilosInput.value || !reasonInput.value || !dateInput.value || !compInput.value) {
                alert("Please fill in all fields.");
                return;
            }

            const entry = {
                company: compInput.value,
                kilos: parseFloat(kilosInput.value) || 0,
                reason: reasonInput.value,
                date: dateInput.value,
                id: Date.now()
            };
            
            if (!state.pettyCash[month]) state.pettyCash[month] = {};
            if (!state.pettyCash[month][user]) state.pettyCash[month][user] = { receipts: [], travel: [] };
            
            state.pettyCash[month][user].travel.push(entry);
            localStorage.setItem('petty_cash', JSON.stringify(state.pettyCash));
            
            renderPettyCash();
            if (travelModal) travelModal.style.display = 'none';
            document.getElementById('travel-form').reset();
            alert("Trip Logged!");
        };
    }

    // ULTIMATE FALLBACK: Global click listener to completely bypass ALL caching and HTML structure issues.
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            const btnText = e.target.textContent.trim();
            if (btnText === 'Save Receipt') {
                e.preventDefault();
                e.stopPropagation();
                console.log("Global Hijack: Saving Petty Cash...");
                
                const month = state.currentMonth;
                const user = pettyUserSelect ? pettyUserSelect.value : 'lou-an';
                const amountInput = document.getElementById('petty-receipt-amount');
                const dateInput = document.getElementById('petty-receipt-date');
                const descInput = document.getElementById('petty-receipt-desc');
                const compInput = document.getElementById('petty-receipt-company');
                
                if (!amountInput || !amountInput.value) return; // Basic safety
                
                const entry = {
                    company: compInput ? compInput.value : '',
                    description: descInput ? descInput.value : '',
                    amount: parseFloat(amountInput.value) || 0,
                    date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
                    id: Date.now()
                };
                
                if (!state.pettyCash[month]) state.pettyCash[month] = {};
                if (!state.pettyCash[month][user]) state.pettyCash[month][user] = { receipts: [], travel: [] };
                
                state.pettyCash[month][user].receipts.push(entry);
                localStorage.setItem('petty_cash', JSON.stringify(state.pettyCash));
                
                renderPettyCash();
                if (pettyReceiptModal) pettyReceiptModal.style.display = 'none';
                
                // Manually clear instead of resetting the form to avoid date picker focus bugs
                if(amountInput) amountInput.value = '';
                if(descInput) descInput.value = '';
                if(compInput) compInput.value = '';
                
                alert("Receipt Saved Successfully!");
            }
            
            if (btnText === 'Log Trip') {
                e.preventDefault();
                e.stopPropagation();
                console.log("Global Hijack: Saving Travel...");
                
                const month = state.currentMonth;
                const user = pettyUserSelect ? pettyUserSelect.value : 'lou-an';
                const kilosInput = document.getElementById('travel-kilos');
                const reasonInput = document.getElementById('travel-reason');
                const dateInput = document.getElementById('travel-date');
                const compInput = document.getElementById('travel-company');
                
                if (!kilosInput || !kilosInput.value) return;
                
                const entry = {
                    company: compInput ? compInput.value : '',
                    kilos: parseFloat(kilosInput.value) || 0,
                    reason: reasonInput ? reasonInput.value : '',
                    date: dateInput ? dateInput.value : new Date().toISOString().split('T')[0],
                    id: Date.now()
                };
                
                if (!state.pettyCash[month]) state.pettyCash[month] = {};
                if (!state.pettyCash[month][user]) state.pettyCash[month][user] = { receipts: [], travel: [] };
                
                state.pettyCash[month][user].travel.push(entry);
                localStorage.setItem('petty_cash', JSON.stringify(state.pettyCash));
                
                renderPettyCash();
                if (travelModal) travelModal.style.display = 'none';
                
                if(kilosInput) kilosInput.value = '';
                if(reasonInput) reasonInput.value = '';
                if(compInput) compInput.value = '';
                
                alert("Trip Logged Successfully!");
            }
        }
    });
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

function renderCompanyNav() {
    const select = document.getElementById('company-nav-select');
    const currentVal = state.selectedCompany;
    
    const allowedCompanies = utils_access.getAllowedCompanies().sort();
    
    select.innerHTML = '<option value="all">All Companies</option>' + 
        allowedCompanies.map(c => `<option value="${c}">${c}</option>`).join('');
    
    if (currentVal === 'all' || allowedCompanies.includes(currentVal)) {
        select.value = currentVal;
    } else {
        select.value = 'all';
        state.selectedCompany = 'all';
    }
    
    // Update the visual "active" state of other buttons
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    if (state.currentView === 'forecasting') {
        const fcBtn = document.getElementById('btn-view-forecasting');
        if(fcBtn) fcBtn.classList.add('active');
    }
}

function switchView() {
    // 1. Enforce Access Control Layout Changes
    const isAdmin = utils_access.canViewAll();
    const btnSettings = document.getElementById('btn-view-settings');
    const btnForecasting = document.getElementById('btn-view-forecasting');
    
    if (btnSettings) btnSettings.style.display = isAdmin ? 'flex' : 'none';
    if (btnForecasting) btnForecasting.style.display = isAdmin ? 'flex' : 'none';

    // Force redirection if a standard user is somehow on a restricted page
    if (!isAdmin && (state.currentView === 'settings' || state.currentView === 'forecasting')) {
        state.currentView = 'summary';
    }

    viewSummary.classList.add('hidden');
    viewExpenses.classList.add('hidden');
    viewForecasting.classList.add('hidden');
    if (viewSettings) viewSettings.classList.add('hidden');
    if (viewPettyCash) viewPettyCash.classList.add('hidden');
    
    btnViewSummary.classList.remove('active');
    btnViewExpenses.classList.remove('active');
    if (btnForecasting) btnForecasting.classList.remove('active');
    if (btnSettings) btnSettings.classList.remove('active');
    if (btnViewPettyCash) btnViewPettyCash.classList.remove('active');

    if (state.currentView === 'summary') {
        viewSummary.classList.remove('hidden');
        btnViewSummary.classList.add('active');
        renderSummaryDashboard();
    } else if (state.currentView === 'expenses') {
        viewExpenses.classList.remove('hidden');
        btnViewExpenses.classList.remove('active');
        renderDashboard();
    } else if (state.currentView === 'forecasting' && isAdmin) {
        viewForecasting.classList.remove('hidden');
        btnForecasting.classList.add('active');
        renderForecasting();
    } else if (state.currentView === 'settings' && isAdmin) {
        viewSettings.classList.remove('hidden');
        btnSettings.classList.add('active');
        renderSettings();
    } else if (state.currentView === 'petty-cash') {
        viewPettyCash.classList.remove('hidden');
        btnViewPettyCash.classList.add('active');
        renderPettyCash();
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
            
            const allowed = utils_access.getAllowedCompanies();
            
            state.fixedExpenses.forEach(fe => {
                // Only auto-add if the user has access to this company
                if (allowed.includes(fe.company)) {
                    state.expenses[state.currentMonth].push({
                        company: fe.company,
                        description: fe.description,
                        amount: fe.amount,
                        date: defaultDate,
                        paid: false,
                        fixed: true
                    });
                }
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
    
    
    // Workspaces Grid
    const wsGrid = document.getElementById('settings-workspaces-grid');
    if (wsGrid) {
        wsGrid.innerHTML = state.workspaces.map(w => `
            <div class="settings-item-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: var(--text-main); font-size: 0.95rem;">${w.name}</strong>
                    ${w.id !== 'w_global' ? `<button onclick="deleteWorkspace('${w.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i data-lucide="trash-2" style="width: 14px;"></i></button>` : ''}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                    Companies: ${w.companies && w.companies.length ? w.companies.join(', ') : 'None'}
                </div>
            </div>
        `).join('');
    }
    
    // New Workspace Company Checkboxes
    const wsCompanies = document.getElementById('new-workspace-companies');
    if (wsCompanies) {
        wsCompanies.innerHTML = state.companies.sort().map(c => `
            <label style="display: flex; align-items: center; gap: 4px; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px; cursor: pointer;">
                <input type="checkbox" value="${c}"> ${c}
            </label>
        `).join('');
    }

    // Users Grid
    const usersGrid = document.getElementById('settings-users-grid');
    if (usersGrid) {
        usersGrid.innerHTML = state.users.map(u => {
            const wsNames = u.workspaces.map(wId => {
                const ws = state.workspaces.find(w => w.id === wId);
                return ws ? ws.name : 'Unknown';
            }).join(', ');
            
            return `
            <div class="settings-item-card" style="background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong style="color: var(--text-main); font-size: 0.95rem;">${u.name}</strong>
                        <span style="font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; background: ${u.role === 'Admin' ? 'rgba(236, 72, 153, 0.2)' : 'rgba(16, 185, 129, 0.2)'}; color: ${u.role === 'Admin' ? '#ec4899' : '#10b981'};">${u.role}</span>
                    </div>
                    ${state.users.length > 1 ? `<button onclick="deleteUser('${u.id}')" style="background:none; border:none; color:#ef4444; cursor:pointer;"><i data-lucide="trash-2" style="width: 14px;"></i></button>` : ''}
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; flex-direction: column; gap: 4px;">
                    <div><i data-lucide="folder-tree" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i>${wsNames || 'None'}</div>
                    <div style="margin-top: 4px;"><i data-lucide="mail" style="width:12px; height:12px; vertical-align:middle; margin-right:4px;"></i>${u.email}</div>
                </div>
            </div>
        `}).join('');
    }
    
    // New User Workspaces Select
    const userWsSelect = document.getElementById('new-user-workspaces');
    if (userWsSelect) {
        userWsSelect.innerHTML = state.workspaces.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    }
    
    lucide.createIcons();
}

function updatePettyUserSelect() {
    const select = document.getElementById('petty-cash-user-select');
    if (!select || !state.currentUser) return;
    const currentVal = select.value;
    
    // If Admin, show everyone. If User, only show themselves.
    const allowedUsers = state.currentUser.role === 'Admin' ? state.users : [state.currentUser];
    
    select.innerHTML = allowedUsers.sort((a,b) => a.name.localeCompare(b.name)).map(u => `
        <option value="${u.id}">${u.name}</option>
    `).join('');
    
    if (currentVal && allowedUsers.some(u => u.id === currentVal)) {
        select.value = currentVal;
    } else if (allowedUsers.length > 0) {
        select.value = allowedUsers[0].id;
    }
}

window.deleteUser = (userId) => {
    if (state.users.length <= 1) return alert("Cannot delete the last user.");
    if (confirm(`Remove this user?`)) {
        state.users = state.users.filter(u => u.id !== userId);
        if (state.currentUser.id === userId) {
            state.currentUser = state.users[0];
            state.currentUserId = state.currentUser.id; saveState();
        }
        saveState();
        renderSettings();
        
        const activeUserSelect = document.getElementById('active-user-select');
        if (activeUserSelect) {
            activeUserSelect.innerHTML = state.users.map(u => `<option value="${u.id}">${u.name} (${u.role})</option>`).join('');
            activeUserSelect.value = state.currentUser.id;
        }
        
        updatePettyUserSelect();
        renderCompanyNav();
        switchView();
    }
};

window.deleteWorkspace = (wsId) => {
    if (wsId === 'w_global') return alert("Cannot delete Global Workspace.");
    if (confirm(`Delete this workspace? Existing data will not be lost, but users assigned to this workspace may lose access to these companies.`)) {
        state.workspaces = state.workspaces.filter(w => w.id !== wsId);
        // Remove from users
        state.users.forEach(u => {
            u.workspaces = u.workspaces.filter(w => w !== wsId);
        });
        saveState();
        renderSettings();
        renderCompanyNav();
        switchView();
    }
};

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
    let currentExpenses = state.expenses[state.currentMonth] || [];
    const allowedCompanies = utils_access.getAllowedCompanies();
    
    // Filter expenses by allowed companies for standard users
    if (!utils_access.canViewAll()) {
        currentExpenses = currentExpenses.filter(e => allowedCompanies.includes(e.company));
    }

    const totalExpenses = currentExpenses.reduce((sum, e) => sum + utils.num(e.amount), 0);
    const unpaidItems = currentExpenses.filter(e => !e.paid);
    const pendingTotal = unpaidItems.reduce((sum, e) => sum + utils.num(e.amount), 0);
    
    document.getElementById('summary-total-expenses').textContent = utils.curr(totalExpenses);
    document.getElementById('summary-expense-count').textContent = `${currentExpenses.length} transactions`;
    document.getElementById('summary-pending-total').textContent = utils.curr(pendingTotal);
    document.getElementById('summary-pending-count').textContent = `${unpaidItems.length} items unpaid`;
    document.getElementById('summary-company-count').textContent = allowedCompanies.length;

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
    if (state.currentUser) {
        state.currentUserId = state.currentUser.id;
    }
    fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
    }).catch(console.error);
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
    const allowedCompanies = utils_access.getAllowedCompanies();
    
    // Always filter by what the user is allowed to see first
    if (!utils_access.canViewAll()) {
        currentExpenses = currentExpenses.filter(e => allowedCompanies.includes(e.company));
    }
    
    // Then apply company dropdown filter
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
                    // Use the exact same compounding index for both views
                    const yearPower = isMonthly ? Math.floor(i / 12) : i;
                    const calculated = base * Math.pow(1 + effectiveEsc, yearPower);
                    
                    // Check for manual override
                    const overrideKey = isMonthly ? `m_${i}` : `y_${i}`;
                    const val = item.overrides[overrideKey] !== undefined ? item.overrides[overrideKey] : Math.round(calculated);
                    
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
    
    const isMonthly = state.forecast.config.scale === 'month';
    const overrideKey = isMonthly ? `m_${monthIdx}` : `y_${monthIdx}`;
    
    if (value.trim() === '') {
        // Clear the override so auto-math takes over again
        delete item.overrides[overrideKey];
    } else {
        const parsedVal = parseFloat(value);
        item.overrides[overrideKey] = parsedVal;
        
        // Propagate to future months if requested
        if (confirm("Would you like to apply this amount to all future periods?")) {
            const numColumns = isMonthly ? state.forecast.config.years * 12 : state.forecast.config.years;
            for (let i = monthIdx + 1; i < numColumns; i++) {
                const futureKey = isMonthly ? `m_${i}` : `y_${i}`;
                item.overrides[futureKey] = parsedVal;
            }
        }
    }
    
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



function renderPettyCash() {
    if (state.currentView !== 'petty-cash') return;
    
    const month = state.currentMonth;
    const user = pettyUserSelect ? pettyUserSelect.value : 'lou-an';
    const data = (state.pettyCash[month] && state.pettyCash[month][user]) 
        ? state.pettyCash[month][user] 
        : { receipts: [], travel: [] };

    // Stats
    const cashTotal = data.receipts.reduce((sum, r) => sum + r.amount, 0);
    const totalKilos = data.travel.reduce((sum, t) => sum + t.kilos, 0);
    const travelValue = totalKilos * state.mileageRate;
    const totalClaim = cashTotal + travelValue;

    document.getElementById('petty-cash-total').textContent = utils.curr(cashTotal);
    document.getElementById('petty-cash-count').textContent = `${data.receipts.length} receipts`;
    document.getElementById('petty-travel-kilos').textContent = `${totalKilos.toFixed(1)} KM`;
    document.getElementById('petty-travel-value').textContent = `${utils.curr(travelValue)} reimbursement`;
    document.getElementById('petty-total-claim').textContent = utils.curr(totalClaim);

    // Receipts Table
    const receiptsBody = document.getElementById('petty-receipts-list');
    if (receiptsBody) {
        receiptsBody.innerHTML = data.receipts.length ? data.receipts.map(r => `
            <tr>
                <td>${utils.date(r.date)}</td>
                <td>${r.description}</td>
                <td><span class="company-tag">${r.company}</span></td>
                <td class="text-right">${utils.curr(r.amount)}</td>
                <td class="text-right">
                    <button onclick="deletePettyItem('receipts', ${r.id})" class="btn-icon" style="color: var(--accent-red); background:none; border:none; cursor:pointer;">
                        <i data-lucide="trash-2" style="width:14px;"></i>
                    </button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">No receipts logged.</td></tr>';
    }

    // Travel Table
    const travelBody = document.getElementById('petty-travel-list');
    if (travelBody) {
        travelBody.innerHTML = data.travel.length ? data.travel.map(t => `
            <tr>
                <td>${utils.date(t.date)}</td>
                <td>${t.kilos} KM</td>
                <td>${t.reason}</td>
                <td><span class="company-tag">${t.company}</span></td>
                <td class="text-right">
                    <button onclick="deletePettyItem('travel', ${t.id})" class="btn-icon" style="color: var(--accent-red); background:none; border:none; cursor:pointer;">
                        <i data-lucide="trash-2" style="width:14px;"></i>
                    </button>
                </td>
            </tr>
        `).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">No travel logged.</td></tr>';
    }

    lucide.createIcons();
}

window.deletePettyItem = (type, id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    const month = state.currentMonth;
    const user = pettyUserSelect.value;
    state.pettyCash[month][user][type] = state.pettyCash[month][user][type].filter(item => item.id !== id);
    localStorage.setItem('petty_cash', JSON.stringify(state.pettyCash));
    renderPettyCash();
};

// Session Security & Email/Password Authenticator Controller
let authMode = 'login'; // 'login' or 'signup'

window.toggleAuthMode = function() {
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const loginFields = document.getElementById('login-form-fields');
    const signupFields = document.getElementById('signup-form-fields');
    const toggleBtn = document.getElementById('auth-toggle-btn');
    const footerText = document.getElementById('auth-footer-text');
    const errorMsg = document.getElementById('auth-error');
    if (errorMsg) errorMsg.style.opacity = "0";

    if (authMode === 'login') {
        authMode = 'signup';
        title.textContent = 'Create Account';
        subtitle.textContent = 'Register to manage your strategic workspaces';
        loginFields.style.display = 'none';
        signupFields.style.display = 'flex';
        footerText.textContent = 'Already have an account?';
        toggleBtn.textContent = 'Sign In';
    } else {
        authMode = 'login';
        title.textContent = 'Welcome Back';
        subtitle.textContent = 'Enter your credentials to access your Expense Manager';
        loginFields.style.display = 'flex';
        signupFields.style.display = 'none';
        footerText.textContent = "Don't have an account?";
        toggleBtn.textContent = 'Sign Up';
    }
};

window.handleLogin = function() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-password').value;

    if (!email || !pass) {
        showAuthError('Please fill in all fields.');
        return;
    }

    const user = state.users.find(u => u.email === email && u.password === pass);
    if (user) {
        // Success!
        state.currentUser = user;
        state.currentUserId = user.id; saveState();
        sessionStorage.setItem('authenticatedUserId', user.id);
        
        // Hide overlay
        const overlay = document.getElementById('auth-overlay');
        if (overlay) {
            overlay.style.opacity = "0";
            setTimeout(() => { overlay.style.display = 'none'; }, 300);
        }

        // Sync workspaces and refresh entire UI context
        init();
        renderCompanyNav();
        switchView();
        renderSummaryDashboard();
        updatePettyUserSelect();
    } else {
        showAuthError('Invalid email or password.');
    }
};

window.handleSignup = function() {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim().toLowerCase();
    const pass = document.getElementById('signup-password').value;
    
    if (!name || !email || !pass) {
        showAuthError('Please fill in all fields.');
        return;
    }

    if (state.users.some(u => u.email === email)) {
        showAuthError('An account with this email already exists.');
        return;
    }

    // Create new user profile
    const newUser = {
        id: 'u_' + Date.now(),
        name: name,
        email: email,
        password: pass,
        role: 'User', // New signups are users by default
        workspaces: ['w_global']
    };

    state.users.push(newUser);
    saveState();

    // Automatically log them in
    state.currentUser = newUser;
    state.currentUserId = newUser.id; saveState();
    sessionStorage.setItem('authenticatedUserId', newUser.id);

    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
        overlay.style.opacity = "0";
        setTimeout(() => { overlay.style.display = 'none'; }, 300);
    }

    // Clean forms
    document.getElementById('signup-name').value = '';
    document.getElementById('signup-email').value = '';
    document.getElementById('signup-password').value = '';

    init();
    renderCompanyNav();
    switchView();
    renderSummaryDashboard();
    updatePettyUserSelect();
};

function showAuthError(msg) {
    const errorMsg = document.getElementById('auth-error');
    if (errorMsg) {
        errorMsg.textContent = msg;
        errorMsg.style.opacity = "1";
    }
}

window.logoutSession = function() {
    sessionStorage.removeItem('authenticatedUserId');
    showAuthScreen();
};

window.showAuthScreen = function() {
    const overlay = document.getElementById('auth-overlay');
    if (!overlay) return;
    
    // Reset inputs
    const emailIn = document.getElementById('login-email');
    const passIn = document.getElementById('login-password');
    if (emailIn) emailIn.value = '';
    if (passIn) passIn.value = '';
    
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    
    const errorMsg = document.getElementById('auth-error');
    if (errorMsg) errorMsg.style.opacity = "0";
};


// Intercept boot check
async function boot() {
    try {
        const res = await fetch('/api/state');
        if (res.ok) {
            const data = await res.json();
            Object.assign(state, data);
        }
    } catch (e) {
        console.error("Failed to load state", e);
    }
    
    // Data Migration & Default Setup for Email / Password
    if (state.users.length === 0) {
        const legacyPeople = ["Lou-an", "Dian", "Antigravity"];
        state.users = legacyPeople.map((p, idx) => ({
            id: 'u_' + Date.now() + '_' + idx,
            name: p,
            email: p.toLowerCase() + '@comzera.com',
            password: 'comzera',
            role: 'Admin',
            workspaces: ['w_global']
        }));
        if(state.workspaces[0]) state.workspaces[0].companies = [...state.companies];
        saveState();
    }

    let schemaUpdated = false;
    state.users.forEach(u => {
        if (!u.email) {
            u.email = (u.name.toLowerCase() + '@comzera.com').replace(/\s+/g, '');
            u.password = 'comzera';
            schemaUpdated = true;
        }
    });
    if (schemaUpdated) saveState();

    if (state.currentUserId) {
        state.currentUser = state.users.find(u => u.id === state.currentUserId) || null;
    }

    init();

    const authUserId = sessionStorage.getItem('authenticatedUserId');
    if (authUserId && state.users.some(u => u.id === authUserId)) {
        const overlay = document.getElementById('auth-overlay');
        if (overlay) overlay.style.display = 'none';
    } else {
        showAuthScreen(); // Full lock on boot
    }
}
boot();

function downloadCSVTemplate(type) {
    let csvContent = "";
    let fileName = "";
    
    if (type === 'actuals') {
        csvContent = "Date,Company,Description,Amount\n2026-05-01,Your company name,Consulting Fee,15000.00\n2026-05-05,Your company name,Office Rent,8500.00";
        fileName = "Dashboard_Template.csv";
    } else {
        csvContent = "Description,Amount,Escalation %\nProduct Sales A,45000,5.0\nMonthly Service Fee,12000,7.5";
        fileName = "Forecasting_Template.csv";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
