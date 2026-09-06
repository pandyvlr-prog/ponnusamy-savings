const fs = require('fs');

let js = fs.readFileSync('js/loan.js', 'utf8');

// I will write a custom replacement script to update the `createLoan` signature, UI bindings, and initialization logic.
// First, update `createLoan` function signature and body.

const newCreateLoan = `
    // Helper to add months
    function getMonthsBetween(startYYYYMM, endYYYYMM) {
        const months = [];
        let curr = startYYYYMM;
        while (curr <= endYYYYMM) {
            months.push(curr);
            let [y, m] = curr.split('-').map(Number);
            m++;
            if (m > 12) { m = 1; y++; }
            curr = \`\${y}-\${String(m).padStart(2, '0')}\`;
        }
        return months;
    }

    async function createLoan(customerName, amount, rate, mode, startMonth, principalPayment) {
        const client = getClient();
        if (!client) { alert('Database not connected.'); return null; }

        const loanPayload = {
            customer_name: customerName,
            original_amount: amount,
            annual_interest_rate: rate,
            payment_mode: mode,
            status: 'Active'
        };

        const { data: loan, error: loanErr } = await client
            .from('loans')
            .insert([loanPayload])
            .select()
            .single();

        if (loanErr) {
            console.error('Create loan error:', loanErr);
            alert('Error creating loan: ' + loanErr.message);
            return null;
        }

        const currentMonth = currentMonthStr();
        const monthsToGenerate = startMonth ? getMonthsBetween(startMonth, currentMonth) : [currentMonth];
        
        let currentOutstanding = amount;
        const installments = [];

        for (const monthStr of monthsToGenerate) {
            if (currentOutstanding <= 0) break; // Loan fully paid

            const interest = calcInterest(currentOutstanding, rate);
            let prinPaid = 0;
            
            if (mode === 'Interest + Principal') {
                // If it's the very first month of a retro-active loan, do we charge principal? Yes, based on the user's input.
                // However, usually the first month might just be interest, or full EMI.
                // Let's charge the full Principal Payment for every generated month.
                prinPaid = Math.min(principalPayment, currentOutstanding);
            }

            const emi = calcEMI(interest, prinPaid);
            const closing = calcClosing(currentOutstanding, prinPaid);

            installments.push({
                loan_id: loan.id,
                customer_name: customerName,
                month: monthStr,
                opening_principal: currentOutstanding,
                annual_interest_rate: rate,
                interest_amount: interest,
                principal_paid: prinPaid,
                emi_amount: emi,
                closing_principal: closing,
                status: monthStr === currentMonth ? 'Pending' : 'Paid', // Mark past months as Paid
                due_date: \`\${monthStr}-05\`, // Default to 5th of the month
                paid_at: monthStr === currentMonth ? null : new Date().toISOString()
            });

            currentOutstanding = closing;
        }

        if (installments.length > 0) {
            const { error: instErr } = await client.from('loan_installments').insert(installments);
            if (instErr) {
                console.error('Create installment error:', instErr);
            }
        }

        return loan;
    }`;

const oldCreateLoanStart = js.indexOf('    async function createLoan(customerName, amount, rate, mode) {');
const oldCreateLoanEnd = js.indexOf('    async function updateInstallmentStatus(id, newStatus) {');

if (oldCreateLoanStart !== -1 && oldCreateLoanEnd !== -1) {
    js = js.substring(0, oldCreateLoanStart) + newCreateLoan + '\n\n' + js.substring(oldCreateLoanEnd);
} else {
    console.log("Could not find createLoan function");
}

// Now update UI bindings
const newUIBindings = `
        // Save loan
        const btnSave = document.getElementById('ln-btn-save');
        if (btnSave) {
            btnSave.addEventListener('click', async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('ln-customer-name');
                const amtInput = document.getElementById('ln-amount');
                const rateInput = document.getElementById('ln-rate');
                const startMonthInput = document.getElementById('ln-start-month');
                const prinInput = document.getElementById('ln-principal-amount');
                const modeInput = document.querySelector('input[name="ln-mode"]:checked');

                const name = (nameInput && nameInput.value.trim()) || '';
                const amt = parseFloat(amtInput && amtInput.value);
                const rate = parseFloat(rateInput && rateInput.value);
                const startMonth = (startMonthInput && startMonthInput.value) || currentMonthStr();
                const mode = modeInput ? modeInput.value : 'Interest Only';
                
                let principalPayment = 0;
                if (mode === 'Interest + Principal') {
                    principalPayment = parseFloat(prinInput && prinInput.value);
                    if (!principalPayment || principalPayment <= 0) {
                        alert('Please enter a valid Principal Payment amount.');
                        prinInput && prinInput.focus();
                        return;
                    }
                    if (principalPayment > amt) {
                        alert('Principal Payment cannot exceed total loan amount.');
                        prinInput && prinInput.focus();
                        return;
                    }
                }

                if (!name) { alert('Please enter the customer name.'); nameInput && nameInput.focus(); return; }
                if (!amt || amt <= 0) { alert('Please enter a valid loan amount.'); amtInput && amtInput.focus(); return; }
                if (!rate || rate <= 0) { alert('Please enter a valid interest rate.'); rateInput && rateInput.focus(); return; }

                const originalText = btnSave.textContent;
                btnSave.textContent = 'Creating...';
                btnSave.disabled = true;

                const loan = await createLoan(name, amt, rate, mode, startMonth, principalPayment);

                btnSave.textContent = originalText;
                btnSave.disabled = false;

                if (loan) {
                    closeAddModal();
                    renderDashboard();
                    if (typeof showNotification === 'function') showNotification('Loan created successfully!', 'success');
                }
            });
        }
        
        // Handle Payment Mode change
        const modeRadios = document.querySelectorAll('input[name="ln-mode"]');
        const prinField = document.getElementById('ln-principal-field');
        const prinInput = document.getElementById('ln-principal-amount');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'Interest + Principal') {
                    if (prinField) prinField.style.display = 'flex';
                    if (prinInput) prinInput.setAttribute('required', 'true');
                } else {
                    if (prinField) prinField.style.display = 'none';
                    if (prinInput) prinInput.removeAttribute('required');
                }
            });
        });

        // Set default month to current month on modal open
        const btnAdd = document.getElementById('ln-btn-add');
        if (btnAdd) {
            btnAdd.addEventListener('click', () => {
                const startMonthInput = document.getElementById('ln-start-month');
                if (startMonthInput) {
                    startMonthInput.value = currentMonthStr();
                }
                openAddModal();
            });
        }
`;

const oldSaveLoanStart = js.indexOf('        // Save loan');
const oldSaveLoanEnd = js.indexOf('        // Watch navigation to loan screen');

if (oldSaveLoanStart !== -1 && oldSaveLoanEnd !== -1) {
    js = js.substring(0, oldSaveLoanStart) + newUIBindings + '\n' + js.substring(oldSaveLoanEnd);
} else {
    console.log("Could not find Save Loan bindings");
}

fs.writeFileSync('js/loan.js', js);
console.log('loan.js updated');
