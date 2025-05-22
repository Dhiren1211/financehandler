class FinanceTracker {
    constructor() {
        this.currencyRates = { USD: 1, NPR: 136.79, KRW: 1393.76 };
        this.monthlyChart = null;
        this.yearlyChart = null;
        this.transactionsCache = null; // Add cache for transactions
        this.isLoadingTransactions = false;
        this.initElements();
        this.initEventListeners();
        this.initialize();
    }

    initElements() {
        this.elements = {
            dashboardLink: document.querySelector('a[href="#dashboard"]'),
            incomeLink: document.querySelector('a[href="#income"]'),
            expensesLink: document.querySelector('a[href="#expenses"]'),
            loansLink: document.querySelector('a[href="#loans"]'),
            reportsLink: document.querySelector('a[href="#reports"]'),
            remindersLink: document.querySelector('a[href="#reminders"]'),
            dashboardSection: document.getElementById("dashboard"),
            incomeSection: document.getElementById("income"),
            expensesSection: document.getElementById("expenses"),
            loansSection: document.getElementById("loans"),
            reportsSection: document.getElementById("reports"),
            remindersSection: document.getElementById("reminders"),
            transactionTableBody: document.getElementById("transaction-table-body"),
            incomeTableBody: document.getElementById("income-table-body"),
            expenseTableBody: document.getElementById("expense-table-body"),
            loanTableBody: document.getElementById("loan-table-body"),
            reportTableBody: document.getElementById("report-table-body"),
            searchInput: document.getElementById("search-input"),
            filterType: document.getElementById("filter-type"),
            filterCurrency: document.getElementById("filter-currency"),
            exportBtn: document.getElementById("export-btn"),
            addIncomeForm: document.getElementById("add-income-form"),
            addExpenseForm: document.getElementById("add-expense-form"),
            addLoanForm: document.getElementById("add-loan-form"),
            addReminderForm: document.getElementById("add-reminder-form"),
            totalSavingsElement: document.getElementById("total-savings"),
            totalIncomeElement: document.getElementById("total-income"),
            totalExpensesElement: document.getElementById("total-expenses"),
            monthlyChartCtx: document.getElementById("monthly-chart").getContext("2d"),
            yearlyChartCtx: document.getElementById("yearly-chart").getContext("2d"),
            reportStartDateInput: document.getElementById("report-start-date"),
            reportEndDateInput: document.getElementById("report-end-date"),
            reportTypeSelect: document.getElementById("report-type"),
            generateReportBtn: document.getElementById("generate-report-btn"),
            exportReportBtn: document.getElementById("export-report-btn"),
            reminderTableBody: document.getElementById("reminder-table-body")
        };
    }

    initEventListeners() {
        this.elements.dashboardLink.addEventListener("click", () => this.showSection("dashboard"));
        this.elements.incomeLink.addEventListener("click", () => this.showSection("income"));
        this.elements.expensesLink.addEventListener("click", () => this.showSection("expenses"));
        this.elements.loansLink.addEventListener("click", () => this.showSection("loans"));
        this.elements.reportsLink.addEventListener("click", () => this.showSection("reports"));
        this.elements.remindersLink.addEventListener("click", () => this.showSection("reminders"));
        
        this.elements.searchInput.addEventListener("input", () => this.filterAndRenderTransactions());
        this.elements.filterType.addEventListener("change", () => this.filterAndRenderTransactions());
        this.elements.filterCurrency.addEventListener("change", () => this.filterAndRenderTransactions());
        this.elements.exportBtn.addEventListener("click", () => this.exportTransactions());
        
        this.elements.addIncomeForm.addEventListener("submit", (e) => this.handleTransactionSubmit(e, 'income'));
        this.elements.addExpenseForm.addEventListener("submit", (e) => this.handleTransactionSubmit(e, 'expense'));
        this.elements.addLoanForm.addEventListener("submit", (e) => this.handleTransactionSubmit(e, 'loan'));
        this.elements.addReminderForm.addEventListener("submit", (e) => this.addReminder(e));
        
        this.elements.generateReportBtn.addEventListener("click", () => this.generateReport());
        this.elements.exportReportBtn.addEventListener("click", () => this.exportTransactions());
    }

    async initialize() {
        this.showSection("dashboard");
        await this.refreshAll();
        await this.renderReminders();
        this.setupDailyReminderCheck();
    }

    showMessage(message, type = "success") {
        const messageBox = document.getElementById("message-box");
        messageBox.textContent = message;
        
        // Reset all styles first
        messageBox.style.backgroundColor = "";
        messageBox.style.color = "";
        messageBox.style.borderColor = "";
        
        // Set styles based on type
        if (type === "success") {
            messageBox.style.backgroundColor = "#D1FAE5"; // bg-green-100
            messageBox.style.color = "#065F46"; // text-green-700
            messageBox.style.borderColor = "#34D399"; // border-green-400
        } else if (type === "error") {
            messageBox.style.backgroundColor = "#FEE2E2"; // bg-red-100
            messageBox.style.color = "#B91C1C"; // text-red-700
            messageBox.style.borderColor = "#F87171"; // border-red-400
        } else if (type === "warning") {
            messageBox.style.backgroundColor = "#FEF3C7"; // bg-yellow-100
            messageBox.style.color = "#92400E"; // text-yellow-700
            messageBox.style.borderColor = "#FBBF24"; // border-yellow-400
        }
        
        messageBox.style.display = "block";
        setTimeout(() => {
            messageBox.style.display = "none";
        }, 3000);
    }

    convertCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) return amount;
        const fromRate = this.currencyRates[fromCurrency];
        const toRate = this.currencyRates[toCurrency];
        if (!fromRate || !toRate) {
            return amount;
        }
        return (amount / fromRate) * toRate;
    }

    formatCurrency(amount, currency = "NPR") {
       try {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
            currencyDisplay: "code" // Force "NPR" instead of symbol or native name
        }).format(amount);
        } catch (e) {
        return `${currency} ${amount.toFixed(2)}`;
        }
    }


    // Normalize date to YYYY-MM-DD format
    normalizeDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return '';
        }
        return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD
    }

    // Show only the active section, hide others
    showSection(sectionId) {
        // Hide all sections
        const allSections = [
            this.elements.dashboardSection,
            this.elements.incomeSection,
            this.elements.expensesSection,
            this.elements.loansSection,
            this.elements.reportsSection,
            this.elements.remindersSection
        ];
        allSections.forEach(section => section.classList.add("hidden"));

        // Show the selected section
        this.elements[`${sectionId}Section`].classList.remove("hidden");

        // Remove active class from all links and add to the selected link
        Object.values(this.elements)
            .filter(el => el.classList && el.href)
            .forEach(el => el.classList.remove("active"));
        this.elements[`${sectionId}Link`].classList.add("active");
    }

    // Data fetching methods
    async fetchTransactions(force = false) {
        if (this.transactionsCache && !force) {
            return this.transactionsCache;
        }
        this.isLoadingTransactions = true;
        try {
            const response = await fetch("backend/transactions.php?action=get");
            const data = await response.json();
            if (data.success) {
                this.transactionsCache = data.transactions;
                this.isLoadingTransactions = false;
                return data.transactions;
            } else {
                this.showMessage(`Failed to fetch transactions: ${data.message || 'Unknown error'}`, "error");
                this.isLoadingTransactions = false;
                return [];
            }
        } catch (error) {
            this.showMessage("Error fetching transactions: " + error.message, "error");
            this.isLoadingTransactions = false;
            return [];
        }
    }

    invalidateTransactionsCache() {
        this.transactionsCache = null;
    }

    async fetchReminders() {
        try {
           
            const response = await fetch("backend/reminder.php?action=get");
            const data = await response.json();
          
            if (data.success) {
                return data.reminders;
            } else {
                this.showMessage(`Failed to fetch reminders: ${data.message || 'Unknown error'}`, "error");
                return [];
            }
        } catch (error) {
            this.showMessage("Error fetching reminders: " + error.message, "error");
        
            return [];
        }
    }

    // Rendering methods
    async renderTransactions(filteredTransactions = null) {
        if (this.isLoadingTransactions) {
            this.elements.transactionTableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-2 text-center">Loading...</td></tr>';
            return;
        }
        const transactions = filteredTransactions || await this.fetchTransactions();
        this.elements.transactionTableBody.innerHTML = transactions.length === 0
            ? '<tr><td colspan="6" class="px-4 py-2">No transactions found.</td></tr>'
            : transactions.map(t => this.transactionRow(t)).join("");
        this.addTransactionEventListeners();
    }

    transactionRow(t) {
        return `
            <tr>
                <td class="px-4 py-2 text-${t.type === "income" ? "green" : t.type === "expense" ? "red" : "blue"}-600">${t.type}</td>
                <td class="px-4 py-2">${t.description}</td>
                <td class="px-4 py-2">${this.formatCurrency(t.amount, t.currency)}</td>
                <td class="px-4 py-2">${t.currency}</td>
                <td class="px-4 py-2">${t.date}</td>
                <td class="px-4 py-2">
                    <button class="edit-btn bg-yellow-200 hover:bg-yellow-300 text-teal-700 font-bold py-1 px-2 rounded-md mr-1" data-id="${t.id}"><i class="fa-solid fa-edit"></i></button>
                    <button class="delete-btn bg-red-200 hover:bg-red-300 text-red-600 font-bold py-1 px-2 rounded-md" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }

    async renderIncomeTransactions(filteredTransactions = null) {
        if (this.isLoadingTransactions) {
            this.elements.incomeTableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center">Loading...</td></tr>';
            return;
        }
        const transactions = filteredTransactions || await this.fetchTransactions();
        const income = transactions.filter(t => t.type === "income");
        this.elements.incomeTableBody.innerHTML = income.length === 0
            ? '<tr><td colspan="5" class="px-4 py-2">No income transactions found.</td></tr>'
            : income.map(t => `
                <tr>
                    <td class="px-4 py-2">${t.description}</td>
                    <td class="px-4 py-2">${this.formatCurrency(t.amount, t.currency)}</td>
                    <td class="px-4 py-2">${t.currency}</td>
                    <td class="px-4 py-2">${t.date}</td>
                    <td class="px-4 py-2">
                        <button class="edit-btn bg-yellow-200 hover:bg-yellow-300 text-teal-700 font-bold py-1 px-2 rounded-md mr-1" data-id="${t.id}"><i class="fa-solid fa-edit"></i></button>
                        <button class="delete-btn bg-red-200 hover:bg-red-300 text-red-600 font-bold py-1 px-2 rounded-md" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `).join("");
        this.addTransactionEventListeners();
    }

    async renderExpenseTransactions(filteredTransactions = null) {
        if (this.isLoadingTransactions) {
            this.elements.expenseTableBody.innerHTML = '<tr><td colspan="5" class="px-4 py-2 text-center">Loading...</td></tr>';
            return;
        }
        const transactions = filteredTransactions || await this.fetchTransactions();
        const expenses = transactions.filter(t => t.type === "expense");
        this.elements.expenseTableBody.innerHTML = expenses.length === 0
            ? '<tr><td colspan="5" class="px-4 py-2">No expense transactions found.</td></tr>'
            : expenses.map(t => this.transactionRow(t)).join("");
        this.addTransactionEventListeners();
    }

    async renderLoanTransactions(filteredTransactions = null) {
        if (this.isLoadingTransactions) {
            this.elements.loanTableBody.innerHTML = '<tr><td colspan="6" class="px-4 py-2 text-center">Loading...</td></tr>';
            return;
        }
        const transactions = filteredTransactions || await this.fetchTransactions();
        const loans = transactions.filter(t => ["loan", "borrow", "due"].includes(t.type));
        this.elements.loanTableBody.innerHTML = loans.length === 0
            ? '<tr><td colspan="6" class="px-4 py-2">No loan transactions found.</td></tr>'
            : loans.map(t => this.transactionRow(t)).join("");
        this.addTransactionEventListeners();
    }

    async renderReminders() {
        const reminders = await this.fetchReminders();
        this.elements.reminderTableBody.innerHTML = reminders.length === 0
            ? '<tr><td colspan="3" class="px-4 py-2">No reminders found.</td></tr>'
            : reminders.map(r => this.reminderRow(r)).join("");
        this.addReminderEventListeners();
    }

    reminderRow(r) {
        return `
            <tr>
                <td class="px-4 py-2">${r.description}</td>
                <td class="px-4 py-2">${r.date}</td>
                <td class="px-4 py-2">
                    <button class="delete-reminder-btn bg-red-200 hover:bg-red-300 text-red-600 font-bold py-1 px-2 rounded-md" data-id="${r.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    }

    // Event handlers
    addTransactionEventListeners() {
        // Remove previous event listeners by replacing the table body (already done in render methods)
        // Add event listeners to all edit and delete buttons in all transaction tables
        const editBtns = document.querySelectorAll(
            "#transaction-table-body .edit-btn, #income-table-body .edit-btn, #expense-table-body .edit-btn, #loan-table-body .edit-btn"
        );
        const deleteBtns = document.querySelectorAll(
            "#transaction-table-body .delete-btn, #income-table-body .delete-btn, #expense-table-body .delete-btn, #loan-table-body .delete-btn"
        );
        editBtns.forEach(btn => {
            btn.onclick = (e) => this.editTransaction(e);
        });
        deleteBtns.forEach(btn => {
            btn.onclick = (e) => this.deleteTransaction(e);
        });
    }

    addReminderEventListeners() {
        // Remove previous event listeners by replacing the table body (already done in renderReminders)
        // Add event listeners to all delete buttons in the reminders table
        const deleteBtns = document.querySelectorAll("#reminder-table-body .delete-reminder-btn");
        deleteBtns.forEach(btn => {
            btn.onclick = (e) => this.deleteReminder(e);
        });
    }

    async handleTransactionSubmit(event, type) {
        event.preventDefault();
        const form = event.target;
        const formData = new FormData(form);
        const rawDate = formData.get('date') || '';
        const normalizedDate = this.normalizeDate(rawDate);
        const rawDescription = formData.get('description') || '';
        const data = {
            type: type === 'loan' ? formData.get('type') : type,
            description: rawDescription.trim(),
            amount: parseFloat(formData.get('amount') || 0),
            currency: formData.get('currency') || 'USD',
            date: normalizedDate
        };

        // Detailed validation with specific error messages
        if (!data.description) {
            this.showMessage("Description cannot be empty.", "error");
            return;
        }
        if (isNaN(data.amount) || data.amount <= 0) {
            this.showMessage("Amount must be a positive number.", "error");
            return;
        }
        if (!['USD', 'NPR', 'KRW'].includes(data.currency)) {
            this.showMessage("Please select a valid currency (USD, NPR, or KRW).", "error");
            return;
        }
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!data.date || !dateRegex.test(data.date)) {
            this.showMessage("Please select a valid date in YYYY-MM-DD format.", "error");
            return;
        }

        try {
            const response = await fetch("backend/transactions.php?action=add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                this.invalidateTransactionsCache(); // Invalidate cache after add
                await this.refreshAll();
                this.showMessage("Transaction added successfully!", "success");
                form.reset();
                this.showSection("dashboard");
            } else {
                this.showMessage(`Failed to add transaction: ${result.message || 'Unknown error'}`, "error");
            }
        } catch (error) {
            console.error("Transaction submit error:", error);
            this.showMessage("Error adding transaction: " + error.message, "error");
        }
    }

    async editTransaction(event) {
        // Always get the correct button (in case <i> is clicked)
        let btn = event.currentTarget || event.target;
        if (btn.tagName === "I" && btn.parentElement.classList.contains("edit-btn")) {
            btn = btn.parentElement;
        }
        // Defensive: get id as string and as number
        let id = btn.dataset.id || btn.getAttribute("data-id");

        // Always fetch the latest transactions to avoid stale cache/race condition
        let transactions = await this.fetchTransactions(true);

        // Try to match both as string and as number
        let transaction = transactions.find(t => t.id == id);

        if (!transaction) {
            this.showMessage("Transaction not found.", "error");
            return;
        }

        const formType = ["loan", "borrow", "due"].includes(transaction.type) ? "loan" : transaction.type;
        const oldForm = document.getElementById(`add-${formType}-form`);

        // Remove any previous event listeners by replacing the form
        const newForm = oldForm.cloneNode(true);
        oldForm.parentNode.replaceChild(newForm, oldForm);

        // Set values after the form is in the DOM
        setTimeout(() => {
            const descriptionInput = newForm.querySelector(`#${formType}-description`);
            const amountInput = newForm.querySelector(`#${formType}-amount`);
            const currencyInput = newForm.querySelector(`#${formType}-currency`);
            const dateInput = newForm.querySelector(`#${formType}-date`);
            const typeInput = formType === 'loan' ? newForm.querySelector(`#loan-type`) : null;

            if (descriptionInput) descriptionInput.value = transaction.description;
            if (amountInput) amountInput.value = transaction.amount;
            if (currencyInput) currencyInput.value = transaction.currency;
            if (dateInput) dateInput.value = transaction.date && transaction.date.length > 10 ? transaction.date.slice(0, 10) : transaction.date;
            if (typeInput) typeInput.value = transaction.type;

            const title = document.getElementById(`${formType}-form-title`);
            if (title) title.textContent = `Edit ${formType.charAt(0).toUpperCase() + formType.slice(1)}`;
        }, 0);

        this.showSection(`${formType}s`);

        const editHandler = async (e) => {
            e.preventDefault();

            const descriptionInput = newForm.querySelector(`#${formType}-description`);
            const amountInput = newForm.querySelector(`#${formType}-amount`);
            const currencyInput = newForm.querySelector(`#${formType}-currency`);
            const dateInput = newForm.querySelector(`#${formType}-date`);
            const typeInput = formType === 'loan' ? newForm.querySelector(`#loan-type`) : null;

            const updatedData = {
                id: transaction.id,
                type: formType === 'loan' ? typeInput.value : formType,
                description: descriptionInput.value.trim(),
                amount: parseFloat(amountInput.value || 0),
                currency: currencyInput.value,
                date: this.normalizeDate(dateInput.value)
            };

            if (!updatedData.description) {
                this.showMessage("Description cannot be empty.", "error");
                return;
            }
            if (isNaN(updatedData.amount) || updatedData.amount <= 0) {
                this.showMessage("Amount must be a positive number.", "error");
                return;
            }
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!updatedData.date || !dateRegex.test(updatedData.date)) {
                this.showMessage("Please select a valid date in YYYY-MM-DD format.", "error");
                return;
            }

            try {
                const response = await fetch("backend/transactions.php?action=update", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedData)
                });
                const result = await response.json();

                if (result.success) {
                    this.invalidateTransactionsCache(); // Invalidate cache after update
                    await this.refreshAll();
                    this.showMessage("Transaction updated successfully!", "success");

                    const resetForm = newForm.cloneNode(true);
                    newForm.parentNode.replaceChild(resetForm, newForm);
                    const title = document.getElementById(`${formType}-form-title`);
                    if (title) title.textContent = `Add ${formType.charAt(0).toUpperCase() + formType.slice(1)}`;
                    resetForm.addEventListener("submit", (e) => this.handleTransactionSubmit(e, formType));

                    this.showSection("dashboard");
                } else {
                    this.showMessage(`Failed to update transaction: ${result.message || 'Unknown error'}`, "error");
                }
            } catch (error) {
                this.showMessage("Error updating transaction: " + error.message, "error");
            }
        };

        newForm.addEventListener("submit", editHandler);
    }

    async deleteTransaction(event) {
        const btn = event.currentTarget || event.target;
        const id = parseInt(btn.dataset.id || btn.getAttribute("data-id"));
        if (!id) {
            this.showMessage("Invalid transaction ID.", "error");
            return;
        }
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        try {
            const response = await fetch(`backend/transactions.php?action=delete&id=${id}`, { method: "POST" });
            const data = await response.json();
            if (data.success) {
                this.invalidateTransactionsCache(); // Invalidate cache after delete
                await this.refreshAll();
                this.showMessage("Transaction deleted successfully!", "success");
            } else {
                this.showMessage(`Failed to delete transaction: ${data.message || 'Unknown error'}`, "error");
            }
        } catch (error) {
            this.showMessage("Error deleting transaction: " + error.message, "error");
        }
    }

    async addReminder(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const description = (formData.get('description') || '').trim();
    const rawDate = formData.get('date') || '';
    const normalizedDate = this.normalizeDate(rawDate);

    if (!description) {
        this.showMessage("Reminder description cannot be empty.", "error");
        return;
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!normalizedDate || !dateRegex.test(normalizedDate)) {
        this.showMessage("Please select a valid date in YYYY-MM-DD format.", "error");
        return;
    }

    const data = { description, date: normalizedDate };

    try {
        const response = await fetch("backend/reminder.php?action=add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            await this.renderReminders();
            this.showMessage("Reminder added successfully!", "success");
            form.reset();
            this.showSection("dashboard");
        } else {
            this.showMessage(`Failed to add reminder: ${result.message || 'Unknown error'}`, "error");
        }
    } catch (error) {
        console.error("Reminder add error:", error);
        this.showMessage("Error adding reminder: " + error.message, "error");
    }
}
    async deleteReminder(event) {
        const btn = event.currentTarget || event.target;
        const id = parseInt(btn.dataset.id || btn.getAttribute("data-id"));
        if (!id) {
            this.showMessage("Invalid reminder ID.", "error");
            return;
        }
        if (!confirm("Are you sure you want to delete this reminder?")) return;
        try {
            const response = await fetch(`backend/reminder.php?action=delete&id=${id}`, { method: "POST" });
            const data = await response.json();
            if (data.success) {
                await this.renderReminders();
                this.showMessage("Reminder deleted successfully!", "success");
            } else {
                this.showMessage(`Failed to delete reminder: ${data.message || 'Unknown error'}`, "error");
            }
        } catch (error) {
            this.showMessage("Error deleting reminder: " + error.message, "error");
        }
    }

    // Chart methods
    async generateMonthlyChart() {
        const transactions = await this.fetchTransactions();
        const monthlyData = {};
        
        transactions.forEach(t => {
            const month = t.date.split("-")[1];
            monthlyData[month] = monthlyData[month] || { income: 0, expense: 0, loan: 0 };
            const amountNPR = this.convertCurrency(parseFloat(t.amount), t.currency, "NPR");
            
            if (t.type === "income") monthlyData[month].income += amountNPR;
            else if (t.type === "expense") monthlyData[month].expense += amountNPR;
            else if (["loan", "borrow", "due"].includes(t.type)) monthlyData[month].loan += amountNPR;
        });

        const months = Object.keys(monthlyData).sort();
        const datasets = [
            { label: "Income (NPR)", data: months.map(m => monthlyData[m].income), backgroundColor: "#16a34a" },
            { label: "Expenses (NPR)", data: months.map(m => monthlyData[m].expense), backgroundColor: "#dc2626" },
            { label: "Loans (NPR)", data: months.map(m => monthlyData[m].loan), backgroundColor: "#3b82f6" }
        ];

        if (this.monthlyChart) this.monthlyChart.destroy();
        
        this.monthlyChart = new Chart(this.elements.monthlyChartCtx, {
            type: "bar",
            data: {
                labels: months.map(m => new Date(2000, parseInt(m)-1, 1).toLocaleString("default", { month: "short" })),
                datasets
            },
            options: {
                responsive: true,
                plugins: { title: { display: true, text: "Monthly Transactions (NPR)", font: { size: 16 } } },
                scales: { y: { beginAtZero: true, title: { display: true, text: "Amount (NPR)" } } }
            }
        });
    }

    async generateYearlyChart() {
        const transactions = await this.fetchTransactions();
        const yearlyData = {};
        
        transactions.forEach(t => {
            const year = t.date.split("-")[0];
            yearlyData[year] = yearlyData[year] || { income: 0, expense: 0, loan: 0 };
            const amountNPR = this.convertCurrency(parseFloat(t.amount), t.currency, "NPR");
            
            if (t.type === "income") yearlyData[year].income += amountNPR;
            else if (t.type === "expense") yearlyData[year].expense += amountNPR;
            else if (["loan", "borrow", "due"].includes(t.type)) yearlyData[year].loan += amountNPR;
        });

        const years = Object.keys(yearlyData).sort();
        const datasets = [
            { label: "Income (NPR)", data: years.map(y => yearlyData[y].income), borderColor: "#16a34a", fill: false },
            { label: "Expenses (NPR)", data: years.map(y => yearlyData[y].expense), borderColor: "#dc2626", fill: false },
            { label: "Loans (NPR)", data: years.map(y => yearlyData[y].loan), borderColor: "#3b82f6", fill: false }
        ];

        if (this.yearlyChart) this.yearlyChart.destroy();
        
        this.yearlyChart = new Chart(this.elements.yearlyChartCtx, {
            type: "line",
            data: { labels: years, datasets },
            options: {
                responsive: true,
                plugins: { title: { display: true, text: "Yearly Transactions (NPR)", font: { size: 16 } } },
                scales: { y: { beginAtZero: true, title: { display: true, text: "Amount (NPR)" } } }
            }
        });
    }

    // Other methods
    async calculateTotals() {
        const transactions = await this.fetchTransactions();
        let totalIncome = 0, totalExpenses = 0;
        
        transactions.forEach(t => {
            const amountNPR = this.convertCurrency(parseFloat(t.amount), t.currency, "NPR");
            if (t.type === "income") totalIncome += amountNPR;
            else if (t.type === "expense") totalExpenses += amountNPR;
        });

        this.elements.totalIncomeElement.textContent = this.formatCurrency(totalIncome, "NPR");
        this.elements.totalExpensesElement.textContent = this.formatCurrency(totalExpenses, "NPR");
        this.elements.totalSavingsElement.textContent = this.formatCurrency(totalIncome - totalExpenses, "NPR");
    }

    async filterAndRenderTransactions() {
        const searchTerm = this.elements.searchInput.value.toLowerCase();
        const selectedType = this.elements.filterType.value;
        const selectedCurrency = this.elements.filterCurrency.value;
        const transactions = await this.fetchTransactions();
        
        const filtered = transactions.filter(t => {
            const searchMatch = t.description.toLowerCase().includes(searchTerm) || t.date.includes(searchTerm);
            const typeMatch = selectedType === "all" || t.type === selectedType;
            const currencyMatch = selectedCurrency === "all" || t.currency === selectedCurrency;
            return searchMatch && typeMatch && currencyMatch;
        });
        
        await this.renderTransactions(filtered);
    }

    async exportTransactions() {
        const transactions = await this.fetchTransactions();
        const csv = "Type,Description,Amount,Currency,Date\n" + 
            transactions.map(t => `${t.type},${t.description.replace(/,/g, '')},${t.amount},${t.currency},${t.date}`).join("\n");
        
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "transactions.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showMessage("Transactions exported successfully!", "success");
    }

    async generateReport() {
        const startDate = this.elements.reportStartDateInput.value;
        const endDate = this.elements.reportEndDateInput.value;
        const reportType = this.elements.reportTypeSelect.value;
        
        if (!startDate || !endDate) {
            this.showMessage("Please select both start and end dates.", "error");
            return;
        }

        try {
            const response = await fetch(`backend/reports.php?start_date=${startDate}&end_date=${endDate}&type=${reportType}`);
            const data = await response.json();
            
            this.elements.reportTableBody.innerHTML = data.success && data.transactions.length > 0
                ? data.transactions.map(t => this.reportRow(t)).join("")
                : '<tr><td colspan="5" class="px-4 py-2">No transactions found.</td></tr>';
            
            this.showMessage(data.success ? "Report generated successfully!" : `Failed to generate report: ${data.message || 'Unknown error'}`, 
                            data.success ? "success" : "error");
        } catch (error) {
            console.error("Report generation error:", error);
            this.showMessage("Error generating report: " + error.message, "error");
        }
    }

    reportRow(t) {
        return `
            <tr>
                <td class="px-4 py-2 text-${t.type === "income" ? "green" : t.type === "expense" ? "red" : "blue"}-600">${t.type}</td>
                <td class="px-4 py-2">${t.description}</td>
                <td class="px-4 py-2">${this.formatCurrency(t.amount, t.currency)}</td>
                <td class="px-4 py-2">${t.currency}</td>
                <td class="px-4 py-2">${t.date}</td>
            </tr>
        `;
    }

    async refreshAll() {
        await this.fetchTransactions(true);
        await Promise.all([
            this.renderTransactions(),
            this.renderIncomeTransactions(),
            this.renderExpenseTransactions(),
            this.renderLoanTransactions(),
            this.calculateTotals(),
            this.generateMonthlyChart(),
            this.generateYearlyChart()
        ]);
    }

    setupDailyReminderCheck() {
        setInterval(async () => {
            const today = new Date().toISOString().split("T")[0];
            const reminders = await this.fetchReminders();
            const transactions = await this.fetchTransactions();
            
            reminders.forEach(r => {
                if (r.date === today) {
                    this.showMessage(`Reminder: ${r.description} is due today!`, "warning");
                }
            });
            
            transactions.forEach(t => {
                if (["loan", "borrow", "due"].includes(t.type) && t.date === today) {
                    this.showMessage(`Reminder: ${t.description} is due today!`, "warning");
                }
            });
        }, 86400000); // Check every 24 hours
    }
}

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {

    new FinanceTracker();

});