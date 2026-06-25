const STORAGE_KEY = 'dreamsAccountingData';
const SIDEBAR_KEY = 'dreamsAccountingSidebarCollapsed';
const DEFAULT_TAX_RATE = 0.15;
const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
const today = new Date();
let cloudReady = false;
let state = loadState();

const forms = {
    sale: document.getElementById('saleForm'),
    expense: document.getElementById('expenseForm'),
    client: document.getElementById('clientForm'),
    product: document.getElementById('productForm')
};

const filters = {
    type: document.getElementById('periodType'),
    month: document.getElementById('periodMonth'),
    semester: document.getElementById('periodSemester'),
    year: document.getElementById('periodYear')
};

enhanceSidebar();
enhanceShortcuts();

Object.values(forms).forEach(form => {
    if (!form) return;
    form.querySelector('[name="date"]')?.setAttribute('value', formatDate(today));
});

if (filters.month) filters.month.value = String(today.getMonth() + 1);
if (filters.year) filters.year.value = String(today.getFullYear());

forms.sale?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(forms.sale);
    const invoiceFile = forms.sale.querySelector('[name="invoice"]')?.files?.[0];
    state.sales.push({
        id: createId(),
        date: data.date,
        client: data.client,
        item: data.item,
        amount: Number(data.amount),
        taxRate: Number(data.taxRate ?? DEFAULT_TAX_RATE),
        notes: data.notes || '',
        invoice: invoiceFile ? {
            name: invoiceFile.name,
            size: invoiceFile.size,
            type: invoiceFile.type || 'application/pdf'
        } : null
    });
    ensureClient(data.client);
    ensureProduct(data.item, Number(data.amount));
    await persistAndRender();
    forms.sale.reset();
    forms.sale.querySelector('[name="date"]').value = formatDate(today);
});

forms.expense?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(forms.expense);
    state.expenses.push({
        id: createId(),
        date: data.date,
        category: data.category,
        description: data.description,
        amount: Number(data.amount)
    });
    await persistAndRender();
    forms.expense.reset();
    forms.expense.querySelector('[name="date"]').value = formatDate(today);
});

forms.client?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(forms.client);
    state.clients.push({
        id: createId(),
        name: data.name,
        country: data.country || 'Ecuador',
        contact: data.contact || 'Sin contacto'
    });
    await persistAndRender();
    forms.client.reset();
});

forms.product?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = formData(forms.product);
    state.products.push({
        id: createId(),
        name: data.name,
        category: data.category || 'General',
        price: Number(data.price || 0),
        stock: Number(data.stock || 0)
    });
    await persistAndRender();
    forms.product.reset();
});

Object.values(filters).forEach(input => input?.addEventListener('input', render));

document.getElementById('seedDataButton')?.addEventListener('click', async () => {
    if (state.sales.length || state.expenses.length || state.clients.length || state.products.length) return;
    seedData();
    await persistAndRender();
});

document.getElementById('exportButton')?.addEventListener('click', exportCsv);

document.addEventListener('click', async (e) => {
    const deleteButton = e.target.closest('[data-delete]');
    if (deleteButton) {
        const [collection, id] = deleteButton.dataset.delete.split(':');
        state[collection] = state[collection].filter(item => item.id !== id);
        await window.dreamsSupabase?.deleteAccountingRecord?.(id);
        await persistAndRender();
        return;
    }

    const dayButton = e.target.closest('[data-calendar-date]');
    if (dayButton) {
        renderCalendarDetails(dayButton.dataset.calendarDate);
    }
});

function loadState() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
    return { sales: [], expenses: [], clients: [], products: [] };
}

async function guardAccountingSession() {
    if (window.dreamsSupabase?.configured()) {
        const session = await window.dreamsSupabase.getSession();
        if (!session) window.location.href = 'index.html#login-contabilidad';
        return Boolean(session);
    }

    window.location.href = 'index.html#login-contabilidad';
    return false;
}

function enhanceSidebar() {
    const sidebar = document.querySelector('.accounting-sidebar');
    const nav = sidebar?.querySelector('.side-nav');
    if (!sidebar || !nav) return;

    const saved = localStorage.getItem(SIDEBAR_KEY) === 'true';
    document.body.classList.toggle('sidebar-collapsed', saved);

    nav.querySelectorAll('a').forEach(link => {
        if (link.querySelector('.nav-icon')) return;
        const label = link.textContent.trim();
        link.dataset.label = label;
        link.title = label;
        link.innerHTML = `${navIcon(link.getAttribute('href'))}<span class="nav-label">${escapeHtml(label)}</span>`;
    });

    const toggle = sidebar.querySelector('.sidebar-toggle') || document.createElement('button');
    const isExistingToggle = toggle.parentElement === sidebar;
    toggle.className = 'sidebar-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', saved ? 'Expandir menú de contabilidad' : 'Ocultar menú de contabilidad');
    toggle.setAttribute('aria-expanded', String(!saved));
    if (!toggle.innerHTML.trim()) toggle.innerHTML = '<span></span><span></span>';
    if (!isExistingToggle) sidebar.insertBefore(toggle, nav);

    toggle.addEventListener('click', () => {
        const collapsed = !document.body.classList.contains('sidebar-collapsed');
        document.body.classList.toggle('sidebar-collapsed', collapsed);
        localStorage.setItem(SIDEBAR_KEY, String(collapsed));
        toggle.setAttribute('aria-label', collapsed ? 'Expandir menú de contabilidad' : 'Ocultar menú de contabilidad');
        toggle.setAttribute('aria-expanded', String(!collapsed));
    });
}

function navIcon(href = '') {
    const icons = {
        'contabilidad.html': 'M4 11.5 12 4l8 7.5M6.5 10.5V20h11v-9.5',
        'ventas.html': 'M5 12h14M15 8l4 4-4 4M5 7h6M5 17h6',
        'gastos.html': 'M19 12H5M9 8l-4 4 4 4M13 7h6M13 17h6',
        'clientes.html': 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 10 0M17 11a2.5 2.5 0 1 0 0-5M15 20a4.5 4.5 0 0 1 6 0',
        'productos.html': 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9ZM4 7.5l8 4.5 8-4.5M12 12v9',
        'balance.html': 'M5 19V9M12 19V5M19 19v-7M3 19h18',
        'sri.gob.ec': 'M7 4h10v16H7zM10 8h4M10 12h4M10 16h4'
    };
    const path = icons[Object.keys(icons).find(key => href.includes(key))] || 'M5 12h14M12 5v14';
    return `<span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${path}"/></svg></span>`;
}

function enhanceShortcuts() {
    document.querySelectorAll('.shortcut-buttons .quick-card').forEach(link => {
        if (link.querySelector('.shortcut-icon')) return;
        const icon = navIcon(link.getAttribute('href') || '').replace('nav-icon', 'shortcut-icon');
        link.insertAdjacentHTML('afterbegin', icon);
    });
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cloudRecordsFromState() {
    return ['sales', 'expenses', 'clients', 'products'].flatMap(collection =>
        state[collection].map(item => ({
            id: item.id,
            collection,
            data: item
        }))
    );
}

async function saveCloudState() {
    if (!cloudReady || !window.dreamsSupabase?.configured()) return;
    try {
        await window.dreamsSupabase.upsertAccountingRecords(cloudRecordsFromState());
        setSyncMessage('Guardado en la nube.');
    } catch (error) {
        console.warn('No se pudo sincronizar con Supabase:', error.message);
        setSyncMessage('Guardado localmente. No se pudo sincronizar con la nube.');
    }
}

async function hydrateCloudState() {
    if (!window.dreamsSupabase?.configured()) return;
    try {
        const records = await window.dreamsSupabase.loadAccountingRecords();
        if (!records || !records.length) {
            cloudReady = true;
            await saveCloudState();
            return;
        }
        const mergedState = mergeState(state, records);
        state = mergedState;
        cloudReady = true;
        saveState();
        render();
        await saveCloudState();
    } catch (error) {
        cloudReady = true;
        console.warn('No se pudo cargar Supabase:', error.message);
        setSyncMessage('No se pudo cargar la nube. Los cambios se guardarán localmente.');
    }
}

function mergeState(localState, records) {
    const merged = {
        sales: [...localState.sales],
        expenses: [...localState.expenses],
        clients: [...localState.clients],
        products: [...localState.products]
    };

    const indexes = Object.fromEntries(
        Object.keys(merged).map(collection => [
            collection,
            new Map(merged[collection].map((item, index) => [item.id, index]))
        ])
    );

    records.forEach(record => {
        const collection = record.collection;
        const item = record.data;
        if (!merged[collection] || !item?.id) return;
        const existingIndex = indexes[collection].get(item.id);
        if (existingIndex === undefined) {
            indexes[collection].set(item.id, merged[collection].length);
            merged[collection].push(item);
        } else {
            merged[collection][existingIndex] = item;
        }
    });

    return merged;
}

function setSyncMessage(message) {
    let target = document.getElementById('syncStatusMessage');
    if (!target) {
        target = document.createElement('div');
        target.id = 'syncStatusMessage';
        target.className = 'sync-status-message';
        document.body.appendChild(target);
    }
    target.textContent = message;
    target.classList.add('visible');
    clearTimeout(setSyncMessage.timer);
    setSyncMessage.timer = setTimeout(() => target.classList.remove('visible'), 3200);
}

async function startAccountingApp() {
    const allowed = await guardAccountingSession();
    if (!allowed) return;
    render();
    await hydrateCloudState();
    setInterval(updateClock, 30000);
}

function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
}

function createId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(date) {
    return date.toISOString().slice(0, 10);
}

function monthName(index) {
    return ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][index];
}

function isInsidePeriod(dateString) {
    const type = filters.type?.value || 'month';
    const date = new Date(`${dateString}T00:00:00`);
    const year = Number(filters.year?.value || today.getFullYear());
    if (type === 'all') return true;
    if (date.getFullYear() !== year) return false;
    if (type === 'year') return true;
    if (type === 'month') return date.getMonth() + 1 === Number(filters.month?.value || today.getMonth() + 1);
    return Number(filters.semester?.value || 1) === 1 ? date.getMonth() <= 5 : date.getMonth() >= 6;
}

function periodLabel() {
    const type = filters.type?.value || 'month';
    const year = filters.year?.value || today.getFullYear();
    if (type === 'all') return 'Todos';
    if (type === 'year') return year;
    if (type === 'month') return `${monthName(Number(filters.month?.value || today.getMonth() + 1) - 1)} ${year}`;
    return `${filters.semester?.value === '2' ? 'Jul-Dic' : 'Ene-Jun'} ${year}`;
}

function filteredSales() {
    return state.sales.filter(item => isInsidePeriod(item.date));
}

function filteredExpenses() {
    return state.expenses.filter(item => isInsidePeriod(item.date));
}

function sum(items) {
    return items.reduce((total, item) => total + Number(item.amount || 0), 0);
}

function saleTax(sale) {
    return Number(sale.amount || 0) * Number(sale.taxRate ?? DEFAULT_TAX_RATE);
}

function sumTax(sales) {
    return sales.reduce((total, sale) => total + saleTax(sale), 0);
}

async function persistAndRender() {
    saveState();
    render();
    await saveCloudState();
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function render() {
    const sales = filteredSales();
    const expenses = filteredExpenses();
    const totalSales = sum(sales);
    const totalExpenses = sum(expenses);
    const vat = sumTax(sales);
    const profit = totalSales - totalExpenses;

    setText('activePeriodLabel', periodLabel());
    setText('salesMetric', currency.format(totalSales));
    setText('expensesMetric', currency.format(totalExpenses));
    setText('vatMetric', currency.format(vat));
    setText('profitMetric', currency.format(profit));
    setText('clientsMetric', state.clients.length);
    setText('balanceStatus', profit >= 0 ? 'Balance positivo' : 'Balance por revisar');
    setText('monthlySummary', profit >= 0 ? 'Mes saludable' : 'Revisar gastos');
    setText('flowSales', currency.format(totalSales));
    setText('flowExpenses', currency.format(totalExpenses));
    setText('flowVat', currency.format(vat));
    setText('flowProfit', currency.format(profit));

    renderDatalists();
    renderLists();
    renderHistory(sales, expenses);
    renderSalesOnly();
    renderExpensesOnly();
    renderChart(sales);
    renderYearLineChart();
    renderBalanceInsights(sales);
    renderCategories(expenses);
    renderCashflow(totalSales, totalExpenses, vat, profit);
    renderTopProducts(sales);
    renderCalendar(sales);
    updateClock();
}

function renderDatalists() {
    const clientList = document.getElementById('clientList');
    const productList = document.getElementById('productList');
    const clientSelect = document.getElementById('saleClientSelect');
    const productSelect = document.getElementById('saleProductSelect');
    if (clientList) clientList.innerHTML = state.clients.map(client => `<option value="${escapeHtml(client.name)}"></option>`).join('');
    if (productList) productList.innerHTML = state.products.map(product => `<option value="${escapeHtml(product.name)}"></option>`).join('');
    if (clientSelect) fillSelect(clientSelect, state.clients.map(client => client.name), 'Selecciona un cliente');
    if (productSelect) fillSelect(productSelect, state.products.map(product => product.name), 'Selecciona un producto');
}

function fillSelect(select, values, placeholder) {
    const current = select.value;
    select.innerHTML = `<option value="">${placeholder}</option>${values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('')}`;
    if (values.includes(current)) select.value = current;
}

function renderLists() {
    renderStack('clientsList', state.clients, 'clients', item => ({
        title: item.name,
        detail: `${item.country} · ${item.contact}`
    }));
    renderStack('productsList', state.products, 'products', item => ({
        title: item.name,
        detail: `${item.category} · ${currency.format(item.price || 0)} · Stock ${item.stock || 0}`
    }));
}

function renderStack(targetId, items, collection, mapper) {
    const target = document.getElementById(targetId);
    if (!target) return;
    if (!items.length) {
        target.innerHTML = '<div class="empty-state">Todavía no hay registros.</div>';
        return;
    }
    target.innerHTML = items.slice().reverse().map(item => {
        const mapped = mapper(item);
        return `
            <div class="list-item">
                <div>
                    <strong>${escapeHtml(mapped.title)}</strong>
                    <span>${escapeHtml(mapped.detail)}</span>
                </div>
                <button class="icon-button" type="button" aria-label="Eliminar" data-delete="${collection}:${item.id}">×</button>
            </div>
        `;
    }).join('');
}

function movementRows(sales, expenses) {
    return [
        ...sales.map(item => ({
            id: item.id,
            collection: 'sales',
            date: item.date,
            type: 'Venta',
            detail: item.item,
            meta: item.client,
            amount: item.amount,
            taxRate: item.taxRate ?? DEFAULT_TAX_RATE,
            invoice: item.invoice
        })),
        ...expenses.map(item => ({
            id: item.id,
            collection: 'expenses',
            date: item.date,
            type: 'Gasto',
            detail: item.description,
            meta: item.category,
            amount: -item.amount
        }))
    ].sort((a, b) => b.date.localeCompare(a.date));
}

function renderHistory(sales, expenses) {
    const target = document.getElementById('historyTable');
    if (!target) return;
    const rows = movementRows(sales, expenses);
    if (!rows.length) {
        target.innerHTML = '<tr><td colspan="6" class="empty-state">No hay movimientos para este periodo.</td></tr>';
        return;
    }
    target.innerHTML = rows.map(row => `
        <tr>
            <td>${row.date}</td>
            <td><strong>${row.type}</strong></td>
            <td>${escapeHtml(row.detail)}${row.invoice ? `<span class="invoice-pill">${escapeHtml(row.invoice.name)}</span>` : ''}</td>
            <td>${escapeHtml(row.meta)}</td>
            <td>${currency.format(row.amount)}</td>
            <td><button class="icon-button" type="button" aria-label="Eliminar movimiento" data-delete="${row.collection}:${row.id}">×</button></td>
        </tr>
    `).join('');
}

function renderSalesOnly() {
    const target = document.getElementById('salesOnlyTable');
    if (!target) return;
    const rows = state.sales.slice().sort((a, b) => b.date.localeCompare(a.date));
    if (!rows.length) {
        target.innerHTML = '<tr><td colspan="7" class="empty-state">Todavía no hay ventas guardadas.</td></tr>';
        return;
    }
    target.innerHTML = rows.map(row => `
        <tr>
            <td>${row.date}</td>
            <td>${escapeHtml(row.client)}</td>
            <td>${escapeHtml(row.item)}</td>
            <td>${formatTaxRate(row.taxRate ?? DEFAULT_TAX_RATE)}</td>
            <td>${row.invoice ? `<span class="invoice-pill">${escapeHtml(row.invoice.name)}</span>` : '<span class="muted-text">Sin PDF</span>'}</td>
            <td>${currency.format(row.amount)}</td>
            <td><button class="icon-button" type="button" aria-label="Eliminar venta" data-delete="sales:${row.id}">×</button></td>
        </tr>
    `).join('');
}

function formatTaxRate(rate) {
    return `${Math.round(Number(rate || 0) * 100)}%`;
}

function renderExpensesOnly() {
    const target = document.getElementById('expensesOnlyTable');
    if (!target) return;
    const rows = state.expenses.slice().sort((a, b) => b.date.localeCompare(a.date));
    if (!rows.length) {
        target.innerHTML = '<tr><td colspan="5" class="empty-state">Todavía no hay gastos guardados.</td></tr>';
        return;
    }
    target.innerHTML = rows.map(row => `
        <tr>
            <td>${row.date}</td>
            <td>${escapeHtml(row.category)}</td>
            <td>${escapeHtml(row.description)}</td>
            <td>${currency.format(row.amount)}</td>
            <td><button class="icon-button" type="button" aria-label="Eliminar gasto" data-delete="expenses:${row.id}">×</button></td>
        </tr>
    `).join('');
}

function monthlyTotals(sales) {
    return Array.from({ length: 12 }, (_, index) => ({
        month: index,
        total: sum(sales.filter(item => new Date(`${item.date}T00:00:00`).getMonth() === index))
    }));
}

function renderChart(sales) {
    const target = document.getElementById('salesChart');
    if (!target) return;
    const totals = monthlyTotals(sales);
    const max = Math.max(...totals.map(item => item.total), 1);
    target.innerHTML = totals.map(item => `
        <div class="bar-row">
            <span>${monthName(item.month)}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (item.total / max) * 100)}%"></div></div>
            <strong>${currency.format(item.total)}</strong>
        </div>
    `).join('');
}

function renderYearLineChart() {
    const target = document.getElementById('yearLineChart');
    if (!target) return;
    const year = Number(filters.year?.value || today.getFullYear());
    const sales = state.sales.filter(item => new Date(`${item.date}T00:00:00`).getFullYear() === year);
    const totals = monthlyTotals(sales);
    const max = Math.max(...totals.map(item => item.total), 1);
    const points = totals.map((item, index) => {
        const x = 24 + (index * (552 / 11));
        const y = 152 - ((item.total / max) * 116);
        return `${x},${y}`;
    }).join(' ');
    target.innerHTML = `
        <svg viewBox="0 0 600 190" role="img" aria-label="Curva anual de ventas">
            <polyline class="line-area" points="24,168 ${points} 576,168"></polyline>
            <polyline class="line-path" points="${points}"></polyline>
            ${totals.map((item, index) => {
                const x = 24 + (index * (552 / 11));
                const y = 152 - ((item.total / max) * 116);
                return `<circle cx="${x}" cy="${y}" r="4"><title>${monthName(item.month)}: ${currency.format(item.total)}</title></circle>`;
            }).join('')}
        </svg>
        <div class="line-labels">${totals.map(item => `<span>${monthName(item.month)}</span>`).join('')}</div>
    `;
}

function renderBalanceInsights(sales) {
    const groupedProducts = sales.reduce((acc, sale) => {
        if (!acc[sale.item]) acc[sale.item] = { qty: 0, total: 0 };
        acc[sale.item].qty += 1;
        acc[sale.item].total += Number(sale.amount || 0);
        return acc;
    }, {});
    const groupedDates = sales.reduce((acc, sale) => {
        if (!acc[sale.date]) acc[sale.date] = { qty: 0, total: 0 };
        acc[sale.date].qty += 1;
        acc[sale.date].total += Number(sale.amount || 0);
        return acc;
    }, {});
    const topProduct = Object.entries(groupedProducts).sort((a, b) => b[1].total - a[1].total)[0];
    const bestDate = Object.entries(groupedDates).sort((a, b) => b[1].total - a[1].total)[0];
    setText('salesCountMetric', sales.length);
    setText('productionMetric', sales.length);
    setText('topProductMetric', topProduct ? topProduct[0] : 'Sin datos');
    setText('bestDateMetric', bestDate ? `${bestDate[0]} · ${currency.format(bestDate[1].total)}` : 'Sin datos');
}

function renderCashflow(sales, expenses, vat, profit) {
    const target = document.getElementById('cashflowChart');
    if (!target) return;
    const rows = [
        ['Ventas', sales],
        ['Gastos', expenses],
        ['IVA', vat],
        ['Utilidad', Math.max(profit, 0)]
    ];
    const max = Math.max(...rows.map(row => row[1]), 1);
    target.innerHTML = rows.map(([label, value]) => `
        <div class="bar-row">
            <span>${label}</span>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (value / max) * 100)}%"></div></div>
            <strong>${currency.format(value)}</strong>
        </div>
    `).join('');
}

function renderCategories(expenses) {
    const target = document.getElementById('categoryBreakdown');
    if (!target) return;
    const grouped = expenses.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + Number(item.amount || 0);
        return acc;
    }, {});
    const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
        target.innerHTML = '<div class="empty-state">Sin gastos registrados.</div>';
        return;
    }
    target.innerHTML = entries.map(([category, total]) => `
        <div class="category-line"><span>${escapeHtml(category)}</span><strong>${currency.format(total)}</strong></div>
    `).join('');
}

function renderTopProducts(sales) {
    const target = document.getElementById('topProductsList');
    if (!target) return;
    const grouped = sales.reduce((acc, sale) => {
        if (!acc[sale.item]) acc[sale.item] = { qty: 0, total: 0 };
        acc[sale.item].qty += 1;
        acc[sale.item].total += Number(sale.amount || 0);
        return acc;
    }, {});
    const rows = Object.entries(grouped).sort((a, b) => b[1].total - a[1].total).slice(0, 5);
    if (!rows.length) {
        target.innerHTML = '<div class="empty-state">Registra ventas para ver productos destacados.</div>';
        return;
    }
    target.innerHTML = rows.map(([name, data], index) => `
        <div class="rank-item">
            <span>${index + 1}</span>
            <div><strong>${escapeHtml(name)}</strong><small>${data.qty} venta(s) · ${currency.format(data.total)}</small></div>
        </div>
    `).join('');
}

function renderCalendar(sales) {
    const target = document.getElementById('salesCalendar');
    if (!target) return;
    const year = Number(filters.year?.value || today.getFullYear());
    const month = Number(filters.month?.value || today.getMonth() + 1) - 1;
    setText('calendarMonthLabel', `${monthName(month)} ${year}`);

    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const offset = (first.getDay() + 6) % 7;
    const salesByDate = sales.reduce((acc, sale) => {
        acc[sale.date] = acc[sale.date] || [];
        acc[sale.date].push(sale);
        return acc;
    }, {});

    const cells = ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(day => `<div class="calendar-week">${day}</div>`);
    for (let i = 0; i < offset; i++) cells.push('<div class="calendar-day muted"></div>');
    for (let day = 1; day <= last.getDate(); day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const daySales = salesByDate[date] || [];
        cells.push(`
            <button class="calendar-day ${daySales.length ? 'has-sales' : ''}" type="button" data-calendar-date="${date}">
                <span>${day}</span>
                ${daySales.length ? `<small>${daySales.length} venta(s)</small>` : ''}
            </button>
        `);
    }
    target.innerHTML = cells.join('');
    renderCalendarDetails(formatDate(today));
}

function renderCalendarDetails(date) {
    const target = document.getElementById('calendarDetails');
    if (!target) return;
    const sales = state.sales.filter(sale => sale.date === date);
    setText('calendarDetailTitle', date);
    if (!sales.length) {
        target.innerHTML = '<div class="empty-state">No hay ventas registradas para esta fecha.</div>';
        return;
    }
    target.innerHTML = sales.map(sale => `
        <div class="list-item">
            <div><strong>${escapeHtml(sale.client)}</strong><span>${escapeHtml(sale.item)} · ${currency.format(sale.amount)}</span></div>
        </div>
    `).join('');
}

function updateClock() {
    const timeEl = document.getElementById('ecuadorTime');
    const dateEl = document.getElementById('ecuadorDate');
    if (!timeEl || !dateEl) return;
    const now = new Date();
    timeEl.textContent = new Intl.DateTimeFormat('es-EC', {
        timeZone: 'America/Guayaquil',
        hour: '2-digit',
        minute: '2-digit'
    }).format(now);
    dateEl.textContent = new Intl.DateTimeFormat('es-EC', {
        timeZone: 'America/Guayaquil',
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    }).format(now);
}

function ensureClient(name) {
    if (!name || state.clients.some(client => client.name.toLowerCase() === name.toLowerCase())) return;
    state.clients.push({ id: createId(), name, country: 'Ecuador', contact: 'Sin contacto' });
}

function ensureProduct(name, price) {
    if (!name || state.products.some(product => product.name.toLowerCase() === name.toLowerCase())) return;
    state.products.push({ id: createId(), name, category: 'Venta registrada', price, stock: 0 });
}

function seedData() {
    state.clients.push(
        { id: createId(), name: 'Andes Market', country: 'Ecuador', contact: 'ventas@andes.ec' },
        { id: createId(), name: 'Casa Norte', country: 'Chile', contact: '+56 9 0000 0000' },
        { id: createId(), name: 'Studio Austral', country: 'Argentina', contact: 'hola@austral.ar' }
    );
    state.products.push(
        { id: createId(), name: 'Identidad visual', category: 'Branding', price: 850, stock: 4 },
        { id: createId(), name: 'Campaña digital', category: 'Marketing', price: 620, stock: 8 },
        { id: createId(), name: 'Sublimación corporativa', category: 'Producción', price: 340, stock: 15 }
    );
    state.sales.push(
        { id: createId(), date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-04`, client: 'Casa Norte', item: 'Sublimación corporativa', amount: 340, taxRate: 0.15, notes: '' },
        { id: createId(), date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-12`, client: 'Studio Austral', item: 'Campaña digital', amount: 620, taxRate: 0.15, notes: '' },
        { id: createId(), date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-18`, client: 'Andes Market', item: 'Identidad visual', amount: 850, taxRate: 0, notes: '' }
    );
    state.expenses.push(
        { id: createId(), date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-05`, category: 'Producción', description: 'Materiales', amount: 180 },
        { id: createId(), date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`, category: 'Marketing', description: 'Pauta de lanzamiento', amount: 120 },
        { id: createId(), date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-20`, category: 'Tecnología', description: 'Software creativo', amount: 65 }
    );
}

function exportCsv() {
    const rows = [
        ['tipo', 'fecha', 'detalle', 'categoria_cliente', 'iva', 'monto'],
        ...state.sales.map(item => ['venta', item.date, item.item, item.client, formatTaxRate(item.taxRate ?? DEFAULT_TAX_RATE), item.amount]),
        ...state.expenses.map(item => ['gasto', item.date, item.description, item.category, '', item.amount])
    ];
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dreams-contabilidad-${formatDate(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

startAccountingApp();
