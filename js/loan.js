/**
 * LOAN MODULE - Complete Fresh Rewrite
 * Self-contained, fully working loan management for PMS
 */

const LoanApp = (() => {

    // ─── SUPABASE HELPERS ───────────────────────────────────────────────────────

    function getClient() { return window.supabaseClient; }

    async function dbFetch(table, filters = {}) {
        const client = getClient();
        if (!client) return [];
        let q = client.from(table).select('*');
        for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
        const { data, error } = await q;
        if (error) { console.error('dbFetch error', error); return []; }
        return data || [];
    }

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

    async function getLoans() { return dbFetch('loans'); }
    async function getInstallments(loanId) { return dbFetch('loan_installments', { loan_id: loanId }); }
    async function getAllInstallments() {
        const client = getClient();
        if (!client) return [];
        const { data } = await client.from('loan_installments').select('*');
        return data || [];
    }

    function getMemberName(customerId) {
        if (window.State && window.State.members) {
            const m = window.State.members.find(x => x.id === customerId || String(x.id) === String(customerId));
            if (m) return m.name || m.full_name || 'Unknown';
        }
        return 'Unknown';
    }

    async function createLoan(loanData) {
        const client = getClient();
        if (!client) return false;

        // Insert loan
        const { data: loan, error: loanErr } = await client.from('loans').insert([loanData]).select().single();
        if (loanErr) { console.error('Loan insert error', loanErr); return false; }

        // Create first installment for current month
        const interest = calcInterest(loan.original_amount, loan.annual_interest_rate);
        const principalPaid = loan.payment_mode === 'Interest Only' ? 0 : (loanData.initial_principal_payment || 0);
        const emi = calcEMI(interest, principalPaid);
        const closing = calcClosing(loan.original_amount, principalPaid);

        const installment = {
            loan_id: loan.id,
            customer_id: loan.customer_id,
            month: currentMonthStr(),
            opening_principal: loan.original_amount,
            annual_interest_rate: loan.annual_interest_rate,
            interest_amount: interest,
            principal_paid: principalPaid,
            emi_amount: emi,
            closing_principal: closing,
            status: 'Pending',
            due_date: new Date().toISOString().split('T')[0],
            paid_at: null
        };

        const { error: instErr } = await client.from('loan_installments').insert([installment]);
        if (instErr) { console.error('Installment insert error', instErr); }

        return loan;
    }

    async function updateInstallmentStatus(id, newStatus) {
        const client = getClient();
        if (!client) return false;
        const update = { status: newStatus, paid_at: newStatus === 'Paid' ? new Date().toISOString() : null };
        const { error } = await client.from('loan_installments').update(update).eq('id', id);
        if (error) { console.error('Status update error', error); return false; }
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

        // Summary calculations
        let totalCollected = 0, totalPending = 0, totalOutstanding = 0, interestEarned = 0, overdueCount = 0;
        const today = new Date().toISOString().split('T')[0];

        loans.forEach(loan => {
            const insts = allInsts.filter(i => i.loan_id === loan.id);
            const sorted = insts.sort((a, b) => a.month.localeCompare(b.month));
            const last = sorted[sorted.length - 1];
            const outstanding = last ? parseFloat(last.closing_principal) : parseFloat(loan.original_amount);
            if (loan.status === 'Active') totalOutstanding += outstanding;
        });

        allInsts.forEach(inst => {
            if (inst.status === 'Paid') {
                totalCollected += parseFloat(inst.emi_amount) || 0;
                if (inst.paid_at && inst.paid_at.startsWith(cm.replace('-', '-').substring(0, 7))) {
                    interestEarned += parseFloat(inst.interest_amount) || 0;
                }
            } else {
                totalPending += parseFloat(inst.emi_amount) || 0;
                if (inst.due_date && inst.due_date < today) overdueCount++;
            }
        });

        // Update summary cards
        const el = (id) => document.getElementById(id);
        if (el('ln-collected')) el('ln-collected').textContent = fmt(totalCollected);
        if (el('ln-pending')) el('ln-pending').textContent = fmt(totalPending);
        if (el('ln-outstanding')) el('ln-outstanding').textContent = fmt(totalOutstanding);
        if (el('ln-interest')) el('ln-interest').textContent = fmt(interestEarned);
        if (el('ln-overdue')) el('ln-overdue').textContent = overdueCount;

        // Table - current month installments
        const currentInsts = allInsts.filter(i => i.month === cm);
        if (currentInsts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-secondary);font-size:0.9rem;">No installments for ${cm}. Add a loan to get started.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        currentInsts.forEach((inst, idx) => {
            const loan = loans.find(l => l.id === inst.loan_id) || {};
            const isPaid = inst.status === 'Paid';
            const tr = document.createElement('tr');
            tr.style.cssText = 'border-bottom: 1px solid var(--border); transition: background 0.15s;';
            tr.innerHTML = `
                <td style="padding:12px 10px;text-align:center;font-weight:700;color:var(--text-secondary);">${idx + 1}</td>
                <td style="padding:12px 10px;">
                    <a href="#" class="ln-customer-link" data-loan-id="${inst.loan_id}" style="color:var(--primary);font-weight:700;text-decoration:none;">${getMemberName(inst.customer_id)}</a>
                </td>
                <td style="padding:12px 10px;text-align:right;font-weight:700;">${fmt(loan.original_amount || 0)}</td>
                <td style="padding:12px 10px;text-align:right;color:var(--primary);font-weight:700;">${fmt(inst.interest_amount)}</td>
                <td style="padding:12px 10px;text-align:right;font-weight:800;font-size:1.05rem;">${fmt(inst.emi_amount)}</td>
                <td style="padding:12px 10px;text-align:center;font-size:0.78rem;color:var(--text-secondary);">${isPaid && inst.paid_at ? new Date(inst.paid_at).toLocaleDateString('en-IN') : '—'}</td>
                <td style="padding:12px 10px;text-align:center;">
                    <button class="ln-toggle" data-id="${inst.id}" data-status="${inst.status}"
                        style="padding:5px 14px;border-radius:20px;border:none;cursor:pointer;font-weight:700;font-size:0.78rem;
                        background:${isPaid ? '#1a6e3c' : '#7a1515'};color:#fff;transition:all 0.2s;">
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
                btn.textContent = 'Saving...';
                btn.disabled = true;
                const ok = await updateInstallmentStatus(id, next);
                if (ok) {
                    renderDashboard();
                } else {
                    btn.textContent = current;
                    btn.disabled = false;
                }
            });
        });

        // Bind customer links
        document.querySelectorAll('.ln-customer-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const loanId = link.getAttribute('data-loan-id');
                openDetailModal(loanId, loans, allInsts);
            });
        });
    }

    // ─── ADD LOAN MODAL ──────────────────────────────────────────────────────────

    function openAddModal() {
        // Populate member select
        const sel = document.getElementById('ln-member-select');
        if (sel) {
            sel.innerHTML = '<option value="">— Select customer —</option>';
            const members = (window.State && window.State.members) ? window.State.members : [];
            members.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.id;
                opt.textContent = m.name || m.full_name;
                sel.appendChild(opt);
            });
        }
        const form = document.getElementById('ln-add-form');
        if (form) form.reset();

        const modal = document.getElementById('ln-add-modal');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.style.opacity = '1';
                    const inner = modal.querySelector('.ln-modal-inner');
                    if (inner) inner.style.transform = 'translateY(0) scale(1)';
                });
            });
        }
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
        const name = getMemberName(loan.customer_id);

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
                    tr.style.borderBottom = '1px solid var(--border)';
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
        if (modal) {
            modal.style.opacity = '0';
            modal.style.display = 'flex';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    modal.style.opacity = '1';
                    const inner = modal.querySelector('.ln-modal-inner');
                    if (inner) inner.style.transform = 'translateY(0) scale(1)';
                });
            });
        }
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
        // Add Loan button
        const btnAdd = document.getElementById('ln-btn-add');
        if (btnAdd) btnAdd.addEventListener('click', openAddModal);

        // Close modals
        const closeAdd = document.getElementById('ln-modal-close');
        if (closeAdd) closeAdd.addEventListener('click', closeAddModal);
        const cancelAdd = document.getElementById('ln-modal-cancel');
        if (cancelAdd) cancelAdd.addEventListener('click', closeAddModal);

        const closeDetail = document.getElementById('ln-det-close');
        if (closeDetail) closeDetail.addEventListener('click', closeDetailModal);

        // Close modal on backdrop click
        const addModal = document.getElementById('ln-add-modal');
        if (addModal) addModal.addEventListener('click', e => { if (e.target === addModal) closeAddModal(); });
        const detModal = document.getElementById('ln-detail-modal');
        if (detModal) detModal.addEventListener('click', e => { if (e.target === detModal) closeDetailModal(); });

        // Save loan form
        const btnSave = document.getElementById('ln-btn-save');
        if (btnSave) {
            btnSave.addEventListener('click', async (e) => {
                e.preventDefault();
                const custId = document.getElementById('ln-member-select').value;
                const amt = parseFloat(document.getElementById('ln-amount').value);
                const rate = parseFloat(document.getElementById('ln-rate').value);
                const mode = document.querySelector('input[name="ln-mode"]:checked')?.value || 'Interest Only';

                if (!custId) { alert('Please select a customer.'); return; }
                if (!amt || amt <= 0) { alert('Please enter a valid loan amount.'); return; }
                if (!rate || rate <= 0) { alert('Please enter a valid interest rate.'); return; }

                btnSave.textContent = 'Creating...';
                btnSave.disabled = true;

                const loan = await createLoan({
                    customer_id: custId,
                    original_amount: amt,
                    annual_interest_rate: rate,
                    payment_mode: mode,
                    status: 'Active'
                });

                btnSave.textContent = 'Create Loan';
                btnSave.disabled = false;

                if (loan) {
                    closeAddModal();
                    renderDashboard();
                    if (typeof showNotification === 'function') showNotification('Loan created!', 'success');
                } else {
                    alert('Failed to create loan. Please check the console for details.');
                }
            });
        }

        // Watch for navigation to loan screen
        const observer = new MutationObserver(() => {
            if (document.body.getAttribute('data-app-state') === 'loan') {
                renderDashboard();
            }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-app-state'] });

        // If already on loan screen, render
        if (document.body.getAttribute('data-app-state') === 'loan') {
            renderDashboard();
        }
    }

    return { init, renderDashboard };
})();

// Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LoanApp.init);
} else {
    LoanApp.init();
}
