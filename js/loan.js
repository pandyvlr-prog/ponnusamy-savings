/**
 * LOAN MODULE - Complete Fresh Rewrite (v2.1)
 * Enhanced with Image 2 typography, unique column colors,
 * Edit & Delete client actions, DD/MM/YYYY date formatting,
 * and minimal gold modal UI.
 */

const LoanApp = (() => {

    let activeLoanId = null;

    // ─── SUPABASE HELPERS ───────────────────────────────────────────────────────

    function getClient() { return window.supabaseClient; }

    // ─── FINANCIAL CALCULATIONS & FORMATTING ────────────────────────────────────

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
    function fmtDate(dStr) {
        if (!dStr) return '—';
        if (typeof dStr === 'string') {
            // Check for YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}/.test(dStr)) {
                const parts = dStr.split('T')[0].split('-');
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            // Check for YYYY-MM
            if (/^\d{4}-\d{2}$/.test(dStr)) {
                const parts = dStr.split('-');
                return `01/${parts[1]}/${parts[0]}`;
            }
        }
        try {
            const dt = new Date(dStr);
            if (!isNaN(dt.getTime())) {
                const d = String(dt.getDate()).padStart(2, '0');
                const m = String(dt.getMonth() + 1).padStart(2, '0');
                const y = dt.getFullYear();
                return `${d}/${m}/${y}`;
            }
        } catch (e) {}
        return dStr;
    }

    // ─── DATA ACCESS ────────────────────────────────────────────────────────────

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

    async function createLoan(customerName, amount, rate, mode, startDate, principalPayment, fixedEmiPayment) {
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

        const startMonth = startDate ? startDate.substring(0, 7) : currentMonthStr();
        const dayOfMonth = startDate && startDate.split('-')[2] ? startDate.split('-')[2] : '05';
        const currentMonth = currentMonthStr();
        const monthsToGenerate = startMonth ? getMonthsBetween(startMonth, currentMonth) : [currentMonth];
        
        let currentOutstanding = amount;
        const installments = [];

        for (const monthStr of monthsToGenerate) {
            if (currentOutstanding <= 0) break; // Loan fully paid

            const interest = calcInterest(currentOutstanding, rate);
            let prinPaid = 0;
            let emi = 0;
            
            if (mode === 'Interest + Principal') {
                prinPaid = Math.min(principalPayment, currentOutstanding);
                emi = calcEMI(interest, prinPaid);
            } else if (mode === 'Fixed EMI') {
                // Fixed EMI calculation:
                // Fixed EMI amount minus interest goes to principal.
                const rawPrin = (fixedEmiPayment || 0) - interest;
                if (rawPrin <= 0) {
                    prinPaid = 0;
                    emi = interest;
                } else if (rawPrin >= currentOutstanding) {
                    // Final installment settles remaining loan balance
                    prinPaid = currentOutstanding;
                    emi = Math.round((interest + prinPaid) * 100) / 100;
                } else {
                    prinPaid = Math.round(rawPrin * 100) / 100;
                    emi = Math.round((interest + prinPaid) * 100) / 100;
                }
            } else {
                // Interest Only
                prinPaid = 0;
                emi = interest;
            }

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
                status: monthStr === currentMonth ? 'Pending' : 'Paid',
                due_date: `${monthStr}-${dayOfMonth}`,
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

    async function updateLoan(loanId, customerName, amount, rate) {
        const client = getClient();
        if (!client) return false;

        const { error: loanErr } = await client.from('loans').update({
            customer_name: customerName,
            original_amount: amount,
            annual_interest_rate: rate
        }).eq('id', loanId);

        if (loanErr) {
            console.error('updateLoan error:', loanErr);
            alert('Error updating loan: ' + loanErr.message);
            return false;
        }

        // Sync customer name in loan installments
        await client.from('loan_installments').update({
            customer_name: customerName
        }).eq('loan_id', loanId);

        return true;
    }

    async function deleteLoan(loanId) {
        const client = getClient();
        if (!client) return false;

        const { error: instErr } = await client.from('loan_installments').delete().eq('loan_id', loanId);
        if (instErr) {
            console.error('Delete installments error:', instErr);
        }

        const { error: loanErr } = await client.from('loans').delete().eq('id', loanId);
        if (loanErr) {
            console.error('Delete loan error:', loanErr);
            alert('Error deleting loan: ' + loanErr.message);
            return false;
        }

        return true;
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
        tbody.innerHTML = `
            <tr class="loan-skeleton-tr">
                <td colspan="7" style="padding: 10px 12px; border: none;">
                    <div class="loan-skeleton-row" style="height: 48px; border-radius: 8px; margin: 0;"></div>
                </td>
            </tr>
            <tr class="loan-skeleton-tr">
                <td colspan="7" style="padding: 10px 12px; border: none;">
                    <div class="loan-skeleton-row" style="height: 48px; border-radius: 8px; margin: 0; animation-delay: 0.15s;"></div>
                </td>
            </tr>
            <tr class="loan-skeleton-tr">
                <td colspan="7" style="padding: 10px 12px; border: none;">
                    <div class="loan-skeleton-row" style="height: 48px; border-radius: 8px; margin: 0; animation-delay: 0.3s;"></div>
                </td>
            </tr>
            <tr class="loan-skeleton-tr">
                <td colspan="7" style="padding: 10px 12px; border: none;">
                    <div class="loan-skeleton-row" style="height: 48px; border-radius: 8px; margin: 0; animation-delay: 0.45s;"></div>
                </td>
            </tr>
        `;

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
        
        // Update total badge count
        const badgeEl = document.getElementById('loan-total-badge');
        if (badgeEl) badgeEl.textContent = `${currentInsts.length} Installments`;

        const mobileContainer = document.getElementById('loan-mobile-cards-container');

        if (currentInsts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:36px;color:var(--text-secondary);font-size:0.9rem;border-right:none;border-bottom:none;">No installments for ${cm}. Click <strong>+ Add Loan</strong> to create one.</td></tr>`;
            if (mobileContainer) {
                mobileContainer.innerHTML = `<div style="text-align:center;padding:36px 16px;color:var(--text-secondary);font-size:0.9rem;background:var(--bg-surface);border-radius:14px;border:1px dashed var(--border);">No installments for ${cm}. Click <strong>+ Add Loan</strong> to create one.</div>`;
            }
            return;
        }

        // Sort alphabetically by customer name
        currentInsts.sort((a, b) => {
            const loanA = loans.find(l => l.id === a.loan_id) || {};
            const loanB = loans.find(l => l.id === b.loan_id) || {};
            const nameA = (a.customer_name || loanA.customer_name || '').trim().toLowerCase();
            const nameB = (b.customer_name || loanB.customer_name || '').trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });

        tbody.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';

        currentInsts.forEach((inst, idx) => {
            const loan = loans.find(l => l.id === inst.loan_id) || {};
            const isPaid = inst.status === 'Paid';
            const name = (inst.customer_name || loan.customer_name || '—').trim();
            const tr = document.createElement('tr');
            tr.style.transition = 'background-color 0.15s ease';
            tr.onmouseover = () => { tr.style.backgroundColor = 'rgba(212,175,55,0.06)'; };
            tr.onmouseout = () => { tr.style.backgroundColor = 'transparent'; };
            
            // Paid date badge pill matching Image 2
            const paidDateHtml = isPaid && inst.paid_at 
                ? `<span style="display:inline-block; padding:4px 10px; border-radius:4px; background-color:#dbeafe; color:#1e3a8a; font-weight:800; font-size:0.8rem; text-align:center; border:1px solid #bfdbfe; font-family:var(--font-number);">${fmtDate(inst.paid_at)}</span>`
                : `<span style="color:var(--text-muted); font-weight:600; font-size:0.85rem;">--</span>`;

            // Status button pill matching Image 2
            const statusHtml = isPaid
                ? `<button class="ln-toggle" data-id="${inst.id}" data-status="${inst.status}"
                    style="display:inline-flex; align-items:center; justify-content:center; gap:4px; padding:5px 14px; border-radius:20px; border:1px solid #86efac; background:#dcfce7; color:#15803d; font-weight:800; font-size:0.75rem; cursor:pointer; min-width:85px; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:all 0.15s ease;">
                    <i data-lucide="check" style="width:12px;height:12px;"></i> PAID
                  </button>`
                : `<button class="ln-toggle" data-id="${inst.id}" data-status="${inst.status}"
                    style="display:inline-flex; align-items:center; justify-content:center; gap:4px; padding:5px 14px; border-radius:20px; border:1px solid #fca5a5; background:#fee2e2; color:#b91c1c; font-weight:800; font-size:0.75rem; cursor:pointer; min-width:85px; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:all 0.15s ease;">
                    <i data-lucide="clock" style="width:12px;height:12px;"></i> DUE
                  </button>`;

            // EMI color: Green if Paid, Red if Due (not paid)
            const emiColor = isPaid ? '#15803d' : '#dc2626';

            tr.innerHTML = `
                <td style="text-align:center; font-weight:800; color:#111827; font-size:0.95rem; padding:14px 8px; border-bottom:1px solid var(--border-table);">${idx + 1}</td>
                <td style="text-align:left; padding:14px 14px; border-bottom:1px solid var(--border-table);">
                    <a href="#" class="ln-customer-link" data-loan-id="${inst.loan_id}" style="color:#000000; font-weight:900; font-size:0.95rem; text-transform:uppercase; text-decoration:none; display:inline-block; font-family:var(--font-heading); transition:color 0.15s ease;" onmouseover="this.style.color='#b8860b'" onmouseout="this.style.color='#000000'">${name}</a>
                </td>
                <td style="text-align:right; font-weight:800; font-size:1.15rem; font-family:var(--font-number); color:#4338ca; padding:14px 14px; border-bottom:1px solid var(--border-table);">${fmt(loan.original_amount || 0)}</td>
                <td style="text-align:right; font-weight:800; font-size:1.15rem; font-family:var(--font-number); color:#b45309; padding:14px 14px; border-bottom:1px solid var(--border-table);">${fmt(inst.interest_amount)}</td>
                <td style="text-align:right; font-weight:900; font-size:1.15rem; font-family:var(--font-number); color:${emiColor}; padding:14px 14px; border-bottom:1px solid var(--border-table);">${fmt(inst.emi_amount)}</td>
                <td style="text-align:center; padding:14px 8px; border-bottom:1px solid var(--border-table);">${paidDateHtml}</td>
                <td style="text-align:center; padding:14px 8px; border-bottom:1px solid var(--border-table);">${statusHtml}</td>
            `;
            tbody.appendChild(tr);

            // Render Mobile Loan Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'loan-mobile-card';
                card.innerHTML = `
                    <div class="loan-mobile-card-header">
                        <div class="loan-mobile-card-title-group">
                            <div class="loan-sno-bubble">${idx + 1}</div>
                            <a href="#" class="loan-customer-name-m ln-customer-link" data-loan-id="${inst.loan_id}">${name}</a>
                        </div>
                        <div>${statusHtml}</div>
                    </div>
                    <div class="loan-mobile-card-amount-row">
                        <span class="loan-emi-label">EMI Amount</span>
                        <span class="loan-emi-value" style="color:${emiColor};">${fmt(inst.emi_amount)}</span>
                    </div>
                    <div class="loan-mobile-chips-row">
                        <div class="loan-mobile-chip">
                            <span class="loan-chip-lbl">Loan Amt</span>
                            <span class="loan-chip-val" style="color:#4338ca;">${fmt(loan.original_amount || 0)}</span>
                        </div>
                        <div class="loan-mobile-chip">
                            <span class="loan-chip-lbl">Interest</span>
                            <span class="loan-chip-val" style="color:#b45309;">${fmt(inst.interest_amount)}</span>
                        </div>
                        <div class="loan-mobile-chip">
                            <span class="loan-chip-lbl">Paid Date</span>
                            <span class="loan-chip-val" style="font-size:0.75rem;">${isPaid && inst.paid_at ? fmtDate(inst.paid_at) : '--'}</span>
                        </div>
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });

        if (window.lucide) window.lucide.createIcons();

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

        // Set start date default to today (YYYY-MM-DD)
        const startDateInput = document.getElementById('ln-start-date');
        if (startDateInput) {
            startDateInput.value = new Date().toISOString().split('T')[0];
        }

        // Hide principal and fixed emi fields (reset to default)
        const prinField = document.getElementById('ln-principal-field');
        if (prinField) prinField.style.display = 'none';
        const fixedEmiField = document.getElementById('ln-fixed-emi-field');
        if (fixedEmiField) fixedEmiField.style.display = 'none';

        const modal = document.getElementById('ln-add-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const inner = modal.querySelector('.ln-modal-inner');
            if (inner) inner.style.transform = 'translateY(0) scale(1)';
        }));

        if (window.lucide) window.lucide.createIcons();

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

    // ─── EDIT LOAN MODAL ─────────────────────────────────────────────────────────

    function openEditModal(loan) {
        if (!loan) return;
        const el = id => document.getElementById(id);
        if (el('ln-edit-loan-id')) el('ln-edit-loan-id').value = loan.id;
        if (el('ln-edit-customer-name')) el('ln-edit-customer-name').value = loan.customer_name || '';
        if (el('ln-edit-amount')) el('ln-edit-amount').value = loan.original_amount || '';
        if (el('ln-edit-rate')) el('ln-edit-rate').value = loan.annual_interest_rate || '';

        const modal = document.getElementById('ln-edit-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const inner = modal.querySelector('.ln-modal-inner');
            if (inner) inner.style.transform = 'translateY(0) scale(1)';
        }));

        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
            if (el('ln-edit-customer-name')) el('ln-edit-customer-name').focus();
        }, 300);
    }

    function closeEditModal() {
        const modal = document.getElementById('ln-edit-modal');
        if (!modal) return;
        modal.style.opacity = '0';
        const inner = modal.querySelector('.ln-modal-inner');
        if (inner) inner.style.transform = 'translateY(40px) scale(0.97)';
        setTimeout(() => { modal.style.display = 'none'; }, 280);
    }

    // ─── DETAIL MODAL (Passbook) ─────────────────────────────────────────────────

    function openDetailModal(loanId, loans, allInsts) {
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;
        activeLoanId = loanId;

        const insts = allInsts.filter(i => i.loan_id === loanId).sort((a, b) => a.month.localeCompare(b.month));
        const name = loan.customer_name || '—';

        const el = id => document.getElementById(id);
        // Customer Name: large, bold, dark black
        if (el('ln-det-name')) el('ln-det-name').textContent = name;
        if (el('ln-det-info')) el('ln-det-info').textContent = `${fmt(loan.original_amount)} loan · ${loan.annual_interest_rate}%/yr · ${loan.payment_mode}`;

        let totalCol = 0, prinPaid = 0, intPaid = 0;
        const last = insts[insts.length - 1];
        const outstanding = last ? parseFloat(last.closing_principal) : parseFloat(loan.original_amount);

        const tbody = document.getElementById('ln-det-tbody');
        if (tbody) {
            tbody.innerHTML = '';
            if (insts.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-secondary);font-size:0.9rem;">No history yet.</td></tr>';
            } else {
                insts.forEach(inst => {
                    const isPaid = inst.status === 'Paid';
                    if (isPaid) {
                        totalCol += parseFloat(inst.emi_amount) || 0;
                        prinPaid += parseFloat(inst.principal_paid) || 0;
                        intPaid += parseFloat(inst.interest_amount) || 0;
                    }

                    // Format date as DD/MM/YYYY
                    const dateDisplay = fmtDate(inst.due_date || inst.month);
                    const detEmiColor = isPaid ? '#15803d' : '#dc2626';

                    // Paid date pill badge
                    const detPaidDateHtml = isPaid && inst.paid_at
                        ? `<span style="display:inline-block; padding:3px 8px; border-radius:4px; background-color:#dbeafe; color:#1e3a8a; font-weight:800; font-size:0.75rem; text-align:center; border:1px solid #bfdbfe; font-family:var(--font-number);">${fmtDate(inst.paid_at)}</span>`
                        : `<span style="color:var(--text-muted); font-weight:600; font-size:0.85rem;">--</span>`;

                    // Status badge pill matching Image 2
                    const detStatusHtml = isPaid
                        ? `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; border:1px solid #86efac; background:#dcfce7; color:#15803d; font-weight:800; font-size:0.72rem;">✓ PAID</span>`
                        : `<span style="display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px; border:1px solid #fca5a5; background:#fee2e2; color:#b91c1c; font-weight:800; font-size:0.72rem;">⏱ DUE</span>`;

                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--border-table)';
                    tr.style.transition = 'background-color 0.15s ease';
                    tr.onmouseover = () => { tr.style.backgroundColor = 'rgba(212,175,55,0.05)'; };
                    tr.onmouseout = () => { tr.style.backgroundColor = 'transparent'; };

                    tr.innerHTML = `
                        <td style="padding:12px 10px; text-align:center; font-weight:800; font-family:var(--font-number); color:#1e293b; font-size:0.9rem; border-right:1px solid var(--border-table);">${dateDisplay}</td>
                        <td style="padding:12px 10px; text-align:right; font-weight:800; font-family:var(--font-number); color:#4338ca; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.opening_principal)}</td>
                        <td style="padding:12px 10px; text-align:right; font-weight:800; font-family:var(--font-number); color:#b45309; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.interest_amount)}</td>
                        <td style="padding:12px 10px; text-align:right; font-weight:800; font-family:var(--font-number); color:#6b21a8; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.principal_paid)}</td>
                        <td style="padding:12px 10px; text-align:right; font-weight:900; font-family:var(--font-number); color:${detEmiColor}; font-size:1.15rem; border-right:1px solid var(--border-table);">${fmt(inst.emi_amount)}</td>
                        <td style="padding:12px 8px; text-align:center; border-right:1px solid var(--border-table);">${detPaidDateHtml}</td>
                        <td style="padding:12px 10px; text-align:right; font-weight:800; font-family:var(--font-number); color:#475569; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.closing_principal)}</td>
                        <td style="padding:12px 8px; text-align:center;">${detStatusHtml}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }

        // Summary Metric Cards
        if (el('ln-det-collected')) el('ln-det-collected').textContent = fmt(totalCol);
        if (el('ln-det-outstanding')) el('ln-det-outstanding').textContent = fmt(outstanding);
        if (el('ln-det-prinpaid')) el('ln-det-prinpaid').textContent = fmt(prinPaid);
        if (el('ln-det-intpaid')) el('ln-det-intpaid').textContent = fmt(intPaid);

        // Edit Button Handler
        const editBtn = document.getElementById('ln-det-btn-edit');
        if (editBtn) {
            editBtn.onclick = () => {
                openEditModal(loan);
            };
        }

        // Delete Button Handler
        const deleteBtn = document.getElementById('ln-det-btn-delete');
        if (deleteBtn) {
            deleteBtn.onclick = async () => {
                const confirmed = confirm(`Are you sure you want to delete the loan for "${name}"?\nThis action will delete all installment records.`);
                if (!confirmed) return;

                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Deleting...';

                const ok = await deleteLoan(loan.id);
                if (ok) {
                    closeDetailModal();
                    await renderDashboard();
                    if (typeof showNotification === 'function') {
                        showNotification(`Loan for "${name}" deleted successfully!`, 'success');
                    }
                } else {
                    deleteBtn.disabled = false;
                    deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width:14px;height:14px;"></i> Delete';
                    if (window.lucide) window.lucide.createIcons();
                }
            };
        }

        const modal = document.getElementById('ln-detail-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const inner = modal.querySelector('.ln-modal-inner');
            if (inner) inner.style.transform = 'translateY(0) scale(1)';
        }));

        if (window.lucide) window.lucide.createIcons();
    }

    function closeDetailModal() {
        const modal = document.getElementById('ln-detail-modal');
        if (!modal) return;
        modal.style.opacity = '0';
        const inner = modal.querySelector('.ln-modal-inner');
        if (inner) inner.style.transform = 'translateY(40px) scale(0.97)';
        setTimeout(() => { modal.style.display = 'none'; activeLoanId = null; }, 280);
    }

    // ─── INIT ────────────────────────────────────────────────────────────────────

    function init() {
        // Modal close buttons
        const closeAdd = document.getElementById('ln-modal-close');
        if (closeAdd) closeAdd.addEventListener('click', closeAddModal);
        const cancelAdd = document.getElementById('ln-modal-cancel');
        if (cancelAdd) cancelAdd.addEventListener('click', closeAddModal);

        const closeDetail = document.getElementById('ln-det-close');
        if (closeDetail) closeDetail.addEventListener('click', closeDetailModal);

        const closeEdit = document.getElementById('ln-edit-modal-close');
        if (closeEdit) closeEdit.addEventListener('click', closeEditModal);
        const cancelEdit = document.getElementById('ln-edit-modal-cancel');
        if (cancelEdit) cancelEdit.addEventListener('click', closeEditModal);

        // Backdrop click to close
        const addModal = document.getElementById('ln-add-modal');
        if (addModal) addModal.addEventListener('click', e => { if (e.target === addModal) closeAddModal(); });
        const detModal = document.getElementById('ln-detail-modal');
        if (detModal) detModal.addEventListener('click', e => { if (e.target === detModal) closeDetailModal(); });
        const editModal = document.getElementById('ln-edit-modal');
        if (editModal) editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

        // Save loan (Create)
        const btnSave = document.getElementById('ln-btn-save');
        if (btnSave) {
            btnSave.addEventListener('click', async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('ln-customer-name');
                const amtInput = document.getElementById('ln-amount');
                const rateInput = document.getElementById('ln-rate');
                const startDateInput = document.getElementById('ln-start-date');
                const prinInput = document.getElementById('ln-principal-amount');
                const modeInput = document.querySelector('input[name="ln-mode"]:checked');

                const name = (nameInput && nameInput.value.trim()) || '';
                const amt = parseFloat(amtInput && amtInput.value);
                const rate = parseFloat(rateInput && rateInput.value);
                const startDate = (startDateInput && startDateInput.value) || new Date().toISOString().split('T')[0];
                const mode = modeInput ? modeInput.value : 'Interest Only';
                
                let principalPayment = 0;
                let fixedEmiPayment = 0;
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
                } else if (mode === 'Fixed EMI') {
                    const fixedEmiInput = document.getElementById('ln-fixed-emi-amount');
                    fixedEmiPayment = parseFloat(fixedEmiInput && fixedEmiInput.value);
                    if (!fixedEmiPayment || fixedEmiPayment <= 0) {
                        alert('Please enter a valid Fixed Monthly EMI amount.');
                        fixedEmiInput && fixedEmiInput.focus();
                        return;
                    }
                    const firstMonthInt = calcInterest(amt, rate);
                    if (fixedEmiPayment <= firstMonthInt) {
                        alert(`Fixed Monthly EMI (₹${fixedEmiPayment}) must be greater than the first month interest (₹${firstMonthInt}) to reduce the principal balance.`);
                        fixedEmiInput && fixedEmiInput.focus();
                        return;
                    }
                }

                if (!name) { alert('Please enter the customer name.'); nameInput && nameInput.focus(); return; }
                if (!amt || amt <= 0) { alert('Please enter a valid loan amount.'); amtInput && amtInput.focus(); return; }
                if (!rate || rate <= 0) { alert('Please enter a valid interest rate.'); rateInput && rateInput.focus(); return; }

                const originalText = btnSave.textContent;
                btnSave.textContent = 'Creating...';
                btnSave.disabled = true;

                const loan = await createLoan(name, amt, rate, mode, startDate, principalPayment, fixedEmiPayment);

                btnSave.textContent = originalText;
                btnSave.disabled = false;

                if (loan) {
                    closeAddModal();
                    renderDashboard();
                    if (typeof showNotification === 'function') showNotification('Loan created successfully!', 'success');
                }
            });
        }

        // Save Edit Loan
        const btnEditSave = document.getElementById('ln-btn-edit-save');
        if (btnEditSave) {
            btnEditSave.addEventListener('click', async (e) => {
                e.preventDefault();
                const idInput = document.getElementById('ln-edit-loan-id');
                const nameInput = document.getElementById('ln-edit-customer-name');
                const amtInput = document.getElementById('ln-edit-amount');
                const rateInput = document.getElementById('ln-edit-rate');

                const loanId = idInput && idInput.value;
                const name = (nameInput && nameInput.value.trim()) || '';
                const amt = parseFloat(amtInput && amtInput.value);
                const rate = parseFloat(rateInput && rateInput.value);

                if (!name) { alert('Please enter customer name.'); nameInput && nameInput.focus(); return; }
                if (!amt || amt <= 0) { alert('Please enter valid amount.'); amtInput && amtInput.focus(); return; }
                if (!rate || rate <= 0) { alert('Please enter valid interest rate.'); rateInput && rateInput.focus(); return; }

                btnEditSave.textContent = 'Saving...';
                btnEditSave.disabled = true;

                const ok = await updateLoan(loanId, name, amt, rate);

                btnEditSave.textContent = 'Save Changes';
                btnEditSave.disabled = false;

                if (ok) {
                    closeEditModal();
                    await renderDashboard();
                    const allL = await getLoans();
                    const allI = await getAllInstallments();
                    openDetailModal(loanId, allL, allI);
                    if (typeof showNotification === 'function') showNotification('Loan details updated!', 'success');
                }
            });
        }
        
        // Handle Payment Mode change in Add Modal
        const modeRadios = document.querySelectorAll('input[name="ln-mode"]');
        const prinField = document.getElementById('ln-principal-field');
        const prinInput = document.getElementById('ln-principal-amount');
        const fixedEmiField = document.getElementById('ln-fixed-emi-field');
        const fixedEmiInput = document.getElementById('ln-fixed-emi-amount');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'Interest + Principal') {
                    if (prinField) prinField.style.display = 'flex';
                    if (prinInput) prinInput.setAttribute('required', 'true');
                    if (fixedEmiField) fixedEmiField.style.display = 'none';
                    if (fixedEmiInput) fixedEmiInput.removeAttribute('required');
                } else if (e.target.value === 'Fixed EMI') {
                    if (prinField) prinField.style.display = 'none';
                    if (prinInput) prinInput.removeAttribute('required');
                    if (fixedEmiField) fixedEmiField.style.display = 'flex';
                    if (fixedEmiInput) fixedEmiInput.setAttribute('required', 'true');
                } else {
                    if (prinField) prinField.style.display = 'none';
                    if (prinInput) prinInput.removeAttribute('required');
                    if (fixedEmiField) fixedEmiField.style.display = 'none';
                    if (fixedEmiInput) fixedEmiInput.removeAttribute('required');
                }
            });
        });

        // Add Loan button
        const btnAdd = document.getElementById('ln-btn-add');
        if (btnAdd) {
            btnAdd.addEventListener('click', openAddModal);
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
