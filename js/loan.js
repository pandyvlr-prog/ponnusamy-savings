/**
 * LOAN MODULE - Complete Fresh Rewrite (v2)
 * Self-contained, no connection to chit/members system.
 * Customer name is stored as free text (no FK to members table).
 */

const LoanApp = (() => {

    // ─── SUPABASE HELPERS ───────────────────────────────────────────────────────

    function getClient() { return window.supabaseClient; }

    // ─── FINANCIAL CALCULATIONS ─────────────────────────────────────────────────

    function calcInterest(openingBalance, annualRate) {
        return Math.round((openingBalance * (annualRate / 12 / 100)) * 100) / 100;
    }
    function calcEMI(interest, principalPaid) {
        return Math.round((interest + principalPaid) * 100) / 100;
    }
    function calcClosing(opening, principalPaid) {
        return Math.round((opening - principalPaid) * 100) / 100;
    }
    function currentMonthStr() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    function fmt(n) {
        const num = parseFloat(n) || 0;
        return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    // ─── DATA ────────────────────────────────────────────────────────────────────

    async function getLoans() {
        const client = getClient();
        if (!client) return [];
        const { data, error } = await client.from('loans').select('*').order('created_at', { ascending: false });
        if (error) { console.error('getLoans error:', error); return []; }
        return data || [];
    }

    async function getAllInstallments() {
        const client = getClient();
        if (!client) return [];
        const { data, error } = await client.from('loan_installments').select('*');
        if (error) { console.error('getAllInstallments error:', error); return []; }
        return data || [];
    }

    async function getInstallmentsForLoan(loanId) {
        const client = getClient();
        if (!client) return [];
        const { data, error } = await client.from('loan_installments').select('*').eq('loan_id', loanId);
        if (error) { console.error('getInstallmentsForLoan error:', error); return []; }
        return data || [];
    }


    // Helper to add months
    function getMonthsBetween(startYYYYMM, endYYYYMM) {
        const months = [];
        let curr = startYYYYMM;
        while (curr <= endYYYYMM) {
            months.push(curr);
            let [y, m] = curr.split('-').map(Number);
            m++;
            if (m > 12) { m = 1; y++; }
            curr = `${y}-${String(m).padStart(2, '0')}`;
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
                due_date: `${monthStr}-05`, // Default to 5th of the month
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
    }

    async function updateInstallmentStatus(id, newStatus) {
        const client = getClient();
        if (!client) return false;
        const update = { status: newStatus, paid_at: newStatus === 'Paid' ? new Date().toISOString() : null };
        const { error } = await client.from('loan_installments').update(update).eq('id', id);
        if (error) { console.error('Status update error:', error); return false; }
        return true;
    }

    // ─── RENDER DASHBOARD ────────────────────────────────────────────────────────

    async function renderDashboard() {
        const tbody = document.getElementById('loan-tbody');
        if (!tbody) return;
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-secondary);">Loading...</td></tr>`;

        const loans = await getLoans();
        const allInsts = await getAllInstallments();
        const cm = currentMonthStr();
        const today = new Date().toISOString().split('T')[0];

        // Summary
        let totalCollected = 0, totalPending = 0, totalOutstanding = 0, interestEarned = 0, overdueCount = 0;

        loans.forEach(loan => {
            if (loan.status !== 'Active') return;
            const insts = allInsts.filter(i => i.loan_id === loan.id).sort((a, b) => a.month.localeCompare(b.month));
            const last = insts[insts.length - 1];
            totalOutstanding += parseFloat(last ? last.closing_principal : loan.original_amount) || 0;
        });

        allInsts.forEach(inst => {
            if (inst.status === 'Paid') {
                totalCollected += parseFloat(inst.emi_amount) || 0;
                const paidMonth = inst.paid_at ? inst.paid_at.substring(0, 7) : '';
                if (paidMonth === cm) interestEarned += parseFloat(inst.interest_amount) || 0;
            } else {
                totalPending += parseFloat(inst.emi_amount) || 0;
                if (inst.due_date && inst.due_date < today) overdueCount++;
            }
        });

        const el = id => document.getElementById(id);
        if (el('ln-collected')) el('ln-collected').textContent = fmt(totalCollected);
        if (el('ln-pending')) el('ln-pending').textContent = fmt(totalPending);
        if (el('ln-outstanding')) el('ln-outstanding').textContent = fmt(totalOutstanding);
        if (el('ln-interest')) el('ln-interest').textContent = fmt(interestEarned);
        if (el('ln-overdue')) el('ln-overdue').textContent = overdueCount;

        // Table — current month
        const currentInsts = allInsts.filter(i => i.month === cm);
        if (currentInsts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:36px;color:var(--text-secondary);font-size:0.9rem;">No installments for ${cm}. Click <strong>+ Add Loan</strong> to create one.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        currentInsts.forEach((inst, idx) => {
            const loan = loans.find(l => l.id === inst.loan_id) || {};
            const isPaid = inst.status === 'Paid';
            const name = inst.customer_name || loan.customer_name || '—';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding:12px 10px;text-align:center;font-weight:700;color:var(--text-secondary);">${idx + 1}</td>
                <td style="padding:12px 10px;">
                    <a href="#" class="ln-customer-link" data-loan-id="${inst.loan_id}" style="color:var(--primary);font-weight:700;text-decoration:none;">${name}</a>
                </td>
                <td style="padding:12px 10px;text-align:right;font-weight:700;">${fmt(loan.original_amount || 0)}</td>
                <td style="padding:12px 10px;text-align:right;color:var(--primary);font-weight:700;">${fmt(inst.interest_amount)}</td>
                <td style="padding:12px 10px;text-align:right;font-weight:800;font-size:1.05rem;">${fmt(inst.emi_amount)}</td>
                <td style="padding:12px 10px;text-align:center;font-size:0.78rem;color:var(--text-secondary);">${isPaid && inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('en-IN') : '—'}</td>
                <td style="padding:12px 10px;text-align:center;">
                    <button class="ln-toggle" data-id="${inst.id}" data-status="${inst.status}"
                        style="padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-weight:700;font-size:0.78rem;
                        background:${isPaid ? '#1a6e3c' : '#7a1515'};color:#fff;min-width:80px;">
                        ${isPaid ? '✓ Paid' : '⏳ Pending'}
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Bind toggle buttons
        document.querySelectorAll('.ln-toggle').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                const current = btn.getAttribute('data-status');
                const next = current === 'Paid' ? 'Pending' : 'Paid';
                btn.textContent = '...';
                btn.disabled = true;
                const ok = await updateInstallmentStatus(id, next);
                if (ok) renderDashboard();
                else { btn.textContent = current; btn.disabled = false; }
            });
        });

        // Bind customer name links → detail modal
        document.querySelectorAll('.ln-customer-link').forEach(link => {
            link.addEventListener('click', async e => {
                e.preventDefault();
                const loanId = link.getAttribute('data-loan-id');
                const allL = await getLoans();
                const allI = await getAllInstallments();
                openDetailModal(loanId, allL, allI);
            });
        });
    }

    // ─── ADD LOAN MODAL ──────────────────────────────────────────────────────────

    function openAddModal() {
        const form = document.getElementById('ln-add-form');
        if (form) form.reset();

        const modal = document.getElementById('ln-add-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const inner = modal.querySelector('.ln-modal-inner');
            if (inner) inner.style.transform = 'translateY(0) scale(1)';
        }));

        // Focus the customer name field
        setTimeout(() => {
            const nameInput = document.getElementById('ln-customer-name');
            if (nameInput) nameInput.focus();
        }, 300);
    }

    function closeAddModal() {
        const modal = document.getElementById('ln-add-modal');
        if (!modal) return;
        modal.style.opacity = '0';
        const inner = modal.querySelector('.ln-modal-inner');
        if (inner) inner.style.transform = 'translateY(40px) scale(0.97)';
        setTimeout(() => { modal.style.display = 'none'; }, 280);
    }

    // ─── DETAIL MODAL ────────────────────────────────────────────────────────────

    function openDetailModal(loanId, loans, allInsts) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        const insts = allInsts.filter(i => i.loan_id === loanId).sort((a, b) => a.month.localeCompare(b.month));
        const name = loan.customer_name || '—';

        const el = id => document.getElementById(id);
        if (el('ln-det-name')) el('ln-det-name').textContent = name;
        if (el('ln-det-info')) el('ln-det-info').textContent = `${fmt(loan.original_amount)} loan · ${loan.annual_interest_rate}%/yr · ${loan.payment_mode}`;

        let totalCol = 0, prinPaid = 0, intPaid = 0;
        const last = insts[insts.length - 1];
        const outstanding = last ? parseFloat(last.closing_principal) : parseFloat(loan.original_amount);

        const tbody = document.getElementById('ln-det-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            if (insts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--text-secondary);">No history yet.</td></tr>';
            } else {
                insts.forEach(inst => {
                    if (inst.status === 'Paid') {
                        totalCol += parseFloat(inst.emi_amount) || 0;
                        prinPaid += parseFloat(inst.principal_paid) || 0;
                        intPaid += parseFloat(inst.interest_amount) || 0;
                    }
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="padding:10px 8px;font-weight:600;color:var(--text-secondary);">${inst.month}</td>
                        <td style="padding:10px 8px;text-align:right;">${fmt(inst.opening_principal)}</td>
                        <td style="padding:10px 8px;text-align:right;color:var(--primary);">${fmt(inst.interest_amount)}</td>
                        <td style="padding:10px 8px;text-align:right;">${fmt(inst.principal_paid)}</td>
                        <td style="padding:10px 8px;text-align:right;font-weight:800;">${fmt(inst.emi_amount)}</td>
                        <td style="padding:10px 8px;text-align:center;font-size:0.75rem;">${inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('en-IN') : '—'}</td>
                        <td style="padding:10px 8px;text-align:right;">${fmt(inst.closing_principal)}</td>
                        <td style="padding:10px 8px;text-align:center;">
                            <span style="padding:3px 10px;border-radius:12px;font-size:0.75rem;font-weight:700;background:${inst.status === 'Paid' ? '#1a6e3c' : '#7a1515'};color:#fff;">${inst.status}</span>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        if (el('ln-det-collected')) el('ln-det-collected').textContent = fmt(totalCol);
        if (el('ln-det-outstanding')) el('ln-det-outstanding').textContent = fmt(outstanding);
        if (el('ln-det-prinpaid')) el('ln-det-prinpaid').textContent = fmt(prinPaid);
        if (el('ln-det-intpaid')) el('ln-det-intpaid').textContent = fmt(intPaid);

        const modal = document.getElementById('ln-detail-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const inner = modal.querySelector('.ln-modal-inner');
            if (inner) inner.style.transform = 'translateY(0) scale(1)';
        }));
    }

    function closeDetailModal() {
        const modal = document.getElementById('ln-detail-modal');
        if (!modal) return;
        modal.style.opacity = '0';
        const inner = modal.querySelector('.ln-modal-inner');
        if (inner) inner.style.transform = 'translateY(40px) scale(0.97)';
        setTimeout(() => { modal.style.display = 'none'; }, 280);
    }

    // ─── INIT ────────────────────────────────────────────────────────────────────

    function init() {
        const btnAdd = document.getElementById('ln-btn-add');
        if (btnAdd) btnAdd.addEventListener('click', openAddModal);

        const closeAdd = document.getElementById('ln-modal-close');
        if (closeAdd) closeAdd.addEventListener('click', closeAddModal);
        const cancelAdd = document.getElementById('ln-modal-cancel');
        if (cancelAdd) cancelAdd.addEventListener('click', closeAddModal);

        const closeDetail = document.getElementById('ln-det-close');
        if (closeDetail) closeDetail.addEventListener('click', closeDetailModal);

        // Backdrop click to close
        const addModal = document.getElementById('ln-add-modal');
        if (addModal) addModal.addEventListener('click', e => { if (e.target === addModal) closeAddModal(); });
        const detModal = document.getElementById('ln-detail-modal');
        if (detModal) detModal.addEventListener('click', e => { if (e.target === detModal) closeDetailModal(); });


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

        // Watch navigation to loan screen
        const observer = new MutationObserver(() => {
            if (document.body.getAttribute('data-app-state') === 'loan') renderDashboard();
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-app-state'] });

        if (document.body.getAttribute('data-app-state') === 'loan') renderDashboard();
    }

    return { init, renderDashboard };
})();

// Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LoanApp.init);
} else {
    LoanApp.init();
}
