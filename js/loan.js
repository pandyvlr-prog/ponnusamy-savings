/**
 * LOAN MODULE - Complete Fresh Rewrite (v2.1)
 * Enhanced with Image 2 typography, unique column colors,
 * Edit & Delete client actions, DD/MM/YYYY date formatting,
 * and minimal gold modal UI.
 */

const LoanApp = (() => {

    let activeLoanId = null;
    let cachedLoans = null;
    let cachedInstallments = null;
    let selectedMonth = currentMonthStr();
    let selectedStatusFilter = 'all'; // 'all' | 'due' | 'paid'
    let searchQuery = '';

    const MONTH_NAMES = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    function formatMonthTitle(monthStr) {
        if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return monthStr || '—';
        const [y, m] = monthStr.split('-').map(Number);
        return `${MONTH_NAMES[m - 1]} ${y}`;
    }

    function changeMonth(delta) {
        if (!selectedMonth || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
            selectedMonth = currentMonthStr();
        }
        let [y, m] = selectedMonth.split('-').map(Number);
        m += delta;
        if (m > 12) {
            m = 1;
            y += 1;
        } else if (m < 1) {
            m = 12;
            y -= 1;
        }
        selectedMonth = `${y}-${String(m).padStart(2, '0')}`;
        renderDashboard();
    }

    function setMonth(monthStr) {
        if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return;
        selectedMonth = monthStr;
        renderDashboard();
    }

    function invalidateCache() {
        cachedLoans = null;
        cachedInstallments = null;
        if (window.State && State.isDirty) {
            State.isDirty.loan = true;
        }
    }

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

    async function getLoans(forceRefresh = false) {
        if (!forceRefresh && cachedLoans) return cachedLoans;
        const client = getClient();
        if (!client) return cachedLoans || [];
        const { data, error } = await client.from('loans').select('*').order('created_at', { ascending: false });
        if (error) { console.error('getLoans error:', error); return cachedLoans || []; }
        cachedLoans = data || [];
        return cachedLoans;
    }

    async function getAllInstallments(forceRefresh = false) {
        if (!forceRefresh && cachedInstallments) return cachedInstallments;
        const client = getClient();
        if (!client) return cachedInstallments || [];
        const { data, error } = await client.from('loan_installments').select('*');
        if (error) { console.error('getAllInstallments error:', error); return cachedInstallments || []; }
        cachedInstallments = data || [];
        return cachedInstallments;
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

    // ─── Phase 2: Loan Metadata & Directory Helpers ───
    function getLoanMeta(loanId) {
        if (!loanId) return {};
        try {
            const raw = localStorage.getItem(`pms_loan_meta_${loanId}`);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveLoanMeta(loanId, meta) {
        if (!loanId || !meta) return;
        try {
            const existing = getLoanMeta(loanId);
            const updated = { ...existing, ...meta, updatedAt: new Date().toISOString() };
            localStorage.setItem(`pms_loan_meta_${loanId}`, JSON.stringify(updated));

            // Keep phone directory updated
            if (meta.customerPhone && meta.customerName) {
                const dir = JSON.parse(localStorage.getItem('pms_loan_customer_phones') || '{}');
                dir[meta.customerName.trim().toLowerCase()] = meta.customerPhone.trim();
                localStorage.setItem('pms_loan_customer_phones', JSON.stringify(dir));
            }
        } catch (e) {
            console.warn('Failed to save loan metadata:', e);
        }
    }

    function populateCustomerDatalist() {
        const datalist = document.getElementById('ln-members-datalist');
        const membersMap = new Map(); // name.toLowerCase() -> { name, phone }

        // 1. Chit members from global State
        if (window.State && Array.isArray(window.State.members)) {
            window.State.members.forEach(m => {
                if (m && m.name) {
                    const cleanName = m.name.trim();
                    const key = cleanName.toLowerCase();
                    const phone = m.phone || m.mobile || '';
                    if (!membersMap.has(key)) {
                        membersMap.set(key, { name: cleanName, phone: phone });
                    } else if (!membersMap.get(key).phone && phone) {
                        membersMap.get(key).phone = phone;
                    }
                }
            });
        }

        // 2. Past loans and stored loan metadata
        if (cachedLoans && Array.isArray(cachedLoans)) {
            cachedLoans.forEach(l => {
                if (l && l.customer_name) {
                    const cleanName = l.customer_name.trim();
                    const key = cleanName.toLowerCase();
                    const meta = getLoanMeta(l.id);
                    const phone = (meta && meta.customerPhone) || '';
                    if (!membersMap.has(key)) {
                        membersMap.set(key, { name: cleanName, phone: phone });
                    } else if (!membersMap.get(key).phone && phone) {
                        membersMap.get(key).phone = phone;
                    }
                }
            });
        }

        // 3. Stored customer phone directory
        try {
            const dir = JSON.parse(localStorage.getItem('pms_loan_customer_phones') || '{}');
            Object.keys(dir).forEach(k => {
                if (membersMap.has(k) && !membersMap.get(k).phone) {
                    membersMap.get(k).phone = dir[k];
                }
            });
        } catch (e) {}

        if (datalist) {
            datalist.innerHTML = '';
            Array.from(membersMap.values())
                .sort((a, b) => a.name.localeCompare(b.name))
                .forEach(item => {
                    const opt = document.createElement('option');
                    opt.value = item.name;
                    if (item.phone) {
                        opt.label = `${item.name} (${item.phone})`;
                    }
                    datalist.appendChild(opt);
                });
        }

        return membersMap;
    }

    // ─── Phase 3: Communication & Statement Helpers ───
    function getCustomerPhone(loanId, customerName) {
        if (loanId) {
            const meta = getLoanMeta(loanId);
            if (meta && meta.customerPhone) return meta.customerPhone.trim();
        }
        const cleanName = (customerName || '').trim().toLowerCase();
        if (cleanName) {
            try {
                const dir = JSON.parse(localStorage.getItem('pms_loan_customer_phones') || '{}');
                if (dir[cleanName]) return dir[cleanName].trim();
            } catch (e) {}
        }
        if (window.State && Array.isArray(window.State.members) && cleanName) {
            const member = window.State.members.find(m => m && m.name && m.name.trim().toLowerCase() === cleanName);
            if (member) {
                const p = member.phone || member.mobile || member.mobileNo;
                if (p) return p.trim();
            }
        }
        return '';
    }

    function promptAndSavePhone(loanId, customerName) {
        let phone = getCustomerPhone(loanId, customerName);
        if (!phone) {
            const entered = prompt(`Please enter the mobile number for "${customerName}" to send WhatsApp message:`);
            if (!entered || !entered.trim()) return null;
            phone = entered.trim();
            saveLoanMeta(loanId, { customerName, customerPhone: phone });
            // Refresh dashboard so call and WhatsApp buttons reflect the new phone
            renderDashboard();
        }
        return phone;
    }

    function sendLoanWhatsAppReminder(loanId, installmentId) {
        if (!cachedLoans || !cachedInstallments) return;
        const loan = cachedLoans.find(l => l.id === loanId);
        const inst = cachedInstallments.find(i => i.id === installmentId);
        if (!loan || !inst) return;

        const customerName = inst.customer_name || loan.customer_name || 'Customer';
        const phone = promptAndSavePhone(loanId, customerName);
        if (!phone) return;

        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        const monthTitle = formatMonthTitle(inst.month);
        const dueDateDisplay = fmtDate(inst.due_date || inst.month);
        const emiDisplay = fmt(inst.emi_amount);
        const outstandingDisplay = fmt(inst.closing_principal || inst.opening_principal);

        const message = 
`*PONNUSAMY SAVINGS & LOANS*
---------------------------------------
Dear *${customerName}*,

Kindly note that your loan installment is due for *${monthTitle}*:

• *EMI Amount:* ${emiDisplay}
• *Due Date:* ${dueDateDisplay}
• *Current Outstanding:* ${outstandingDisplay}
• *Status:* ${inst.status}

Please clear the payment on or before the due date.
Thank you for your cooperation!

_Ponnusamy Savings & Chit Management_`;

        const waUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    }

    function sendLoanPassbookWhatsApp(loanId) {
        if (!cachedLoans || !cachedInstallments) return;
        const loan = cachedLoans.find(l => l.id === loanId);
        if (!loan) return;

        const insts = cachedInstallments.filter(i => i.loan_id === loanId).sort((a, b) => a.month.localeCompare(b.month));
        const customerName = loan.customer_name || 'Customer';
        const phone = promptAndSavePhone(loanId, customerName);
        if (!phone) return;

        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        let totalCol = 0, prinPaid = 0, intPaid = 0;
        const last = insts[insts.length - 1];
        const outstanding = last ? parseFloat(last.closing_principal) : parseFloat(loan.original_amount);

        insts.forEach(i => {
            if (i.status === 'Paid') {
                totalCol += parseFloat(i.emi_amount) || 0;
                prinPaid += parseFloat(i.principal_paid) || 0;
                intPaid += parseFloat(i.interest_amount) || 0;
            }
        });

        const origAmt = parseFloat(loan.original_amount) || 0;
        const pct = origAmt > 0 ? Math.min(100, Math.round((prinPaid / origAmt) * 100)) : 0;

        const recentInsts = insts.slice(-6).map(i => {
            const icon = i.status === 'Paid' ? '✅' : '⏳';
            return `${icon} *${formatMonthTitle(i.month)}*: ${fmt(i.emi_amount)} (${i.status})`;
        }).join('\n');

        const message =
`*PONNUSAMY SAVINGS & LOANS*
*LOAN PASSBOOK STATEMENT*
---------------------------------------
Customer: *${customerName}*
Sanctioned Amount: *${fmt(loan.original_amount)}*
Interest Rate: *${loan.annual_interest_rate}% / year*
Payment Mode: *${loan.payment_mode}*

*Repayment Summary:*
• Principal Repaid: *${fmt(prinPaid)} (${pct}%)*
• Interest Paid: *${fmt(intPaid)}*
• Total Collected: *${fmt(totalCol)}*
• Balance Outstanding: *${fmt(outstanding)}*

*Recent Installments:*
${recentInsts}

Thank you for banking with Ponnusamy Savings!
_Official Loan Statement Record_`;

        const waUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    }

    function exportLoanPassbookPdf(loanId) {
        if (!cachedLoans || !cachedInstallments) return;
        const loan = cachedLoans.find(l => l.id === loanId);
        if (!loan) return;

        const insts = cachedInstallments.filter(i => i.loan_id === loanId).sort((a, b) => a.month.localeCompare(b.month));
        const customerName = loan.customer_name || 'Customer';
        const meta = getLoanMeta(loanId);
        const phone = getCustomerPhone(loanId, customerName);

        let totalCol = 0, prinPaid = 0, intPaid = 0;
        const last = insts[insts.length - 1];
        const outstanding = last ? parseFloat(last.closing_principal) : parseFloat(loan.original_amount);

        insts.forEach(i => {
            if (i.status === 'Paid') {
                totalCol += parseFloat(i.emi_amount) || 0;
                prinPaid += parseFloat(i.principal_paid) || 0;
                intPaid += parseFloat(i.interest_amount) || 0;
            }
        });

        const origAmt = parseFloat(loan.original_amount) || 0;
        const pct = origAmt > 0 ? Math.min(100, Math.round((prinPaid / origAmt) * 100)) : 0;

        const rowsHtml = insts.map((inst, idx) => {
            const isPaid = inst.status === 'Paid';
            const stBadge = isPaid 
                ? '<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:20px;border:1px solid #86efac;background:#dcfce7;color:#15803d;font-weight:800;font-size:10px;">✓ PAID</span>'
                : '<span style="display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:20px;border:1px solid #fca5a5;background:#fee2e2;color:#b91c1c;font-weight:800;font-size:10px;">⏱ DUE</span>';
            const paidDt = isPaid && inst.paid_at ? `<span style="display:inline-block;padding:2px 7px;border-radius:3px;background:#dbeafe;color:#1e3a8a;border:1px solid #bfdbfe;font-weight:800;font-size:10px;">${fmtDate(inst.paid_at)}</span>` : '--';
            return `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
                    <td style="padding: 8px 6px; text-align: center; font-weight: 800; font-family: 'Inter', sans-serif;">${fmtDate(inst.due_date || inst.month)}</td>
                    <td style="padding: 8px 6px; text-align: right; font-family: 'Inter', sans-serif; font-weight: 800; color: #4338ca;">${fmt(inst.opening_principal)}</td>
                    <td style="padding: 8px 6px; text-align: right; font-family: 'Inter', sans-serif; font-weight: 800; color:#b45309;">${fmt(inst.interest_amount)}</td>
                    <td style="padding: 8px 6px; text-align: right; font-family: 'Inter', sans-serif; font-weight: 800; color:#6b21a8;">${fmt(inst.principal_paid)}</td>
                    <td style="padding: 8px 6px; text-align: right; font-family: 'Inter', sans-serif; font-weight: 800; color:${isPaid ? '#15803d' : '#dc2626'};">${fmt(inst.emi_amount)}</td>
                    <td style="padding: 8px 6px; text-align: center;">${paidDt}</td>
                    <td style="padding: 8px 6px; text-align: right; font-family: 'Inter', sans-serif; font-weight: 800; color: #475569;">${fmt(inst.closing_principal)}</td>
                    <td style="padding: 8px 6px; text-align: center;">${stBadge}</td>
                </tr>
            `;
        }).join('');

        const printHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Loan Passbook - ${customerName}</title>
                <meta charset="utf-8">
                <style>
                    @page { size: A4; margin: 15mm; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        color: #0f172a;
                        margin: 0;
                        padding: 0;
                        background: #fff;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .header-box {
                        border-bottom: 3px solid #D4AF37;
                        padding-bottom: 14px;
                        margin-bottom: 18px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .brand-title {
                        font-size: 22px;
                        font-weight: 900;
                        color: #111827;
                        letter-spacing: 0.5px;
                    }
                    .brand-sub {
                        font-size: 11px;
                        color: #b45309;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.1em;
                        margin-top: 2px;
                    }
                    .doc-badge {
                        background: #fef3c7;
                        border: 1px solid #fde68a;
                        color: #92400e;
                        padding: 6px 12px;
                        border-radius: 8px;
                        font-size: 11px;
                        font-weight: 800;
                        text-align: right;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1.5fr 1fr;
                        gap: 12px;
                        margin-bottom: 16px;
                        background: #f8fafc;
                        padding: 14px 18px;
                        border-radius: 10px;
                        border: 1px solid #e2e8f0;
                        font-size: 12px;
                    }
                    .stat-grid {
                        display: grid;
                        grid-template-columns: repeat(4, 1fr);
                        gap: 10px;
                        margin-bottom: 18px;
                    }
                    .stat-card {
                        padding: 10px 12px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                        background: #fff;
                    }
                    .stat-lbl {
                        font-size: 9px;
                        text-transform: uppercase;
                        font-weight: 800;
                        color: #64748b;
                        letter-spacing: 0.05em;
                    }
                    .stat-val {
                        font-size: 16px;
                        font-weight: 900;
                        margin-top: 4px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th {
                        background: #111827;
                        color: #ffffff;
                        padding: 8px 6px;
                        font-size: 10px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .progress-outer {
                        height: 8px;
                        background: #e2e8f0;
                        border-radius: 4px;
                        overflow: hidden;
                        margin-top: 6px;
                    }
                    .progress-inner {
                        height: 100%;
                        width: ${pct}%;
                        background: #16a34a;
                    }
                    .footer {
                        margin-top: 24px;
                        border-top: 1px dashed #cbd5e1;
                        padding-top: 10px;
                        display: flex;
                        justify-content: space-between;
                        font-size: 10px;
                        color: #64748b;
                    }
                </style>
            </head>
            <body>
                <div class="header-box">
                    <div>
                        <div class="brand-title">PONNUSAMY SAVINGS & LOANS</div>
                        <div class="brand-sub">Official Loan Passbook & Repayment Statement</div>
                    </div>
                    <div class="doc-badge">
                        <div>STATEMENT DATE</div>
                        <div style="font-size:13px;color:#111827;margin-top:2px;">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    </div>
                </div>

                <div class="info-grid">
                    <div>
                        <div style="font-size:15px;font-weight:900;color:#0f172a;text-transform:uppercase;">${customerName}</div>
                        <div style="color:#64748b;margin-top:4px;">${phone ? `📞 ${phone}` : 'No phone recorded'} ${meta.notes ? ` · 📝 Notes: ${meta.notes}` : ''}</div>
                    </div>
                    <div style="text-align:right;">
                        <div><strong>Sanctioned:</strong> ${fmt(loan.original_amount)} · <strong>Rate:</strong> ${loan.annual_interest_rate}%/yr</div>
                        <div style="color:#64748b;margin-top:4px;"><strong>Mode:</strong> ${loan.payment_mode}</div>
                    </div>
                </div>

                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-lbl">Principal Repaid</div>
                        <div class="stat-val" style="color:#15803d;">${fmt(prinPaid)} <span style="font-size:11px;font-weight:700;">(${pct}%)</span></div>
                        <div class="progress-outer"><div class="progress-inner"></div></div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-lbl">Interest Paid</div>
                        <div class="stat-val" style="color:#b45309;">${fmt(intPaid)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-lbl">Total Collected</div>
                        <div class="stat-val" style="color:#4338ca;">${fmt(totalCol)}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-lbl">Balance Outstanding</div>
                        <div class="stat-val" style="color:#dc2626;">${fmt(outstanding)}</div>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th style="text-align:right;">Opening</th>
                            <th style="text-align:right;">Interest</th>
                            <th style="text-align:right;">Principal</th>
                            <th style="text-align:right;">EMI</th>
                            <th>Paid Date</th>
                            <th style="text-align:right;">Closing</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="footer">
                    <div>Computer-generated official statement · Ponnusamy Savings & Chit Fund Management</div>
                    <div>Page 1 of 1</div>
                </div>

                <script>
                    window.onload = function() {
                        window.focus();
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        const printWin = window.open('', '_blank');
        if (printWin) {
            printWin.document.open();
            printWin.document.write(printHtml);
            printWin.document.close();
        } else {
            alert('Please allow popups to download/print the Loan Statement PDF.');
        }
    }

    // ─── Phase 4: Loan Foreclosure & Early Settlement Helpers ───
    async function openForecloseModal(loanId) {
        const loans = cachedLoans || (await getLoans());
        const allInsts = cachedInstallments || (await getAllInstallments());
        if (!loans || !allInsts) return;
        const loan = loans.find(l => l.id === loanId);
        if (!loan) return;

        const insts = allInsts.filter(i => i.loan_id === loanId).sort((a, b) => a.month.localeCompare(b.month));
        const last = insts[insts.length - 1];
        const outstanding = last ? (parseFloat(last.closing_principal) || parseFloat(loan.original_amount)) : parseFloat(loan.original_amount);
        const name = loan.customer_name || 'Customer';

        // Calculate accrued interest for current month
        const monthlyRate = (parseFloat(loan.annual_interest_rate) || 0) / 100 / 12;
        const accruedInterest = Math.round(outstanding * monthlyRate * 100) / 100;

        const el = id => document.getElementById(id);
        if (el('ln-fc-loan-id')) el('ln-fc-loan-id').value = loanId;
        if (el('ln-fc-customer-name')) el('ln-fc-customer-name').textContent = name;
        if (el('ln-fc-outstanding-disp')) {
            el('ln-fc-outstanding-disp').textContent = fmt(outstanding);
            el('ln-fc-outstanding-disp').setAttribute('data-val', outstanding);
        }
        if (el('ln-fc-date')) el('ln-fc-date').value = new Date().toISOString().split('T')[0];
        if (el('ln-fc-accrued-int')) el('ln-fc-accrued-int').value = Math.round(accruedInterest);
        if (el('ln-fc-waiver')) el('ln-fc-waiver').value = 0;
        if (el('ln-fc-charges')) el('ln-fc-charges').value = 0;
        if (el('ln-fc-notes')) el('ln-fc-notes').value = '';
        if (el('ln-fc-mode')) el('ln-fc-mode').value = 'Cash';

        updateForecloseCalc();

        const modal = document.getElementById('ln-foreclose-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        requestAnimationFrame(() => requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const inner = modal.querySelector('.ln-modal-inner');
            if (inner) inner.style.transform = 'translateY(0) scale(1)';
        }));

        if (window.lucide) window.lucide.createIcons();
    }

    function closeForecloseModal() {
        const modal = document.getElementById('ln-foreclose-modal');
        if (!modal) return;
        modal.style.opacity = '0';
        const inner = modal.querySelector('.ln-modal-inner');
        if (inner) inner.style.transform = 'translateY(40px) scale(0.97)';
        setTimeout(() => { modal.style.display = 'none'; }, 280);
    }

    function updateForecloseCalc() {
        const outDisp = document.getElementById('ln-fc-outstanding-disp');
        const outstanding = parseFloat(outDisp ? outDisp.getAttribute('data-val') : 0) || 0;
        const accrued = parseFloat(document.getElementById('ln-fc-accrued-int')?.value) || 0;
        const waiver = parseFloat(document.getElementById('ln-fc-waiver')?.value) || 0;
        const charges = parseFloat(document.getElementById('ln-fc-charges')?.value) || 0;

        const net = Math.max(0, Math.round((outstanding + accrued - waiver + charges) * 100) / 100);
        const netEl = document.getElementById('ln-fc-net-payoff');
        if (netEl) netEl.textContent = fmt(net);
        return net;
    }

    async function settleLoan() {
        const idInput = document.getElementById('ln-fc-loan-id');
        const loanId = idInput && idInput.value;
        if (!loanId) return;

        const loan = cachedLoans ? cachedLoans.find(l => l.id === loanId) : null;
        if (!loan) { alert('Loan not found.'); return; }

        const customerName = loan.customer_name || 'Customer';
        const client = getClient();
        if (!client) { alert('Database not connected.'); return; }

        const dateInput = document.getElementById('ln-fc-date');
        const accruedInput = document.getElementById('ln-fc-accrued-int');
        const waiverInput = document.getElementById('ln-fc-waiver');
        const chargesInput = document.getElementById('ln-fc-charges');
        const modeInput = document.getElementById('ln-fc-mode');
        const notesInput = document.getElementById('ln-fc-notes');

        const settleDate = (dateInput && dateInput.value) || new Date().toISOString().split('T')[0];
        const accruedInt = parseFloat(accruedInput && accruedInput.value) || 0;
        const waiver = parseFloat(waiverInput && waiverInput.value) || 0;
        const charges = parseFloat(chargesInput && chargesInput.value) || 0;
        const settleMode = (modeInput && modeInput.value) || 'Cash';
        const settleNotes = (notesInput && notesInput.value.trim()) || '';

        const insts = cachedInstallments ? cachedInstallments.filter(i => i.loan_id === loanId).sort((a, b) => a.month.localeCompare(b.month)) : [];
        const last = insts[insts.length - 1];
        const outstandingPrincipal = last ? (parseFloat(last.closing_principal) || parseFloat(loan.original_amount)) : parseFloat(loan.original_amount);
        const netPayoff = Math.max(0, Math.round((outstandingPrincipal + accruedInt - waiver + charges) * 100) / 100);

        const confirmed = confirm(
            `CONFIRM LOAN FORECLOSURE & SETTLEMENT\n\n` +
            `Customer: ${customerName}\n` +
            `Outstanding Principal: ₹${outstandingPrincipal.toLocaleString('en-IN')}\n` +
            `Accrued Interest: ₹${accruedInt.toLocaleString('en-IN')}\n` +
            `Waiver / Rebate: -₹${waiver.toLocaleString('en-IN')}\n` +
            `Foreclosure Charges: +₹${charges.toLocaleString('en-IN')}\n` +
            `----------------------------------------\n` +
            `FINAL AMOUNT TO COLLECT: ₹${netPayoff.toLocaleString('en-IN')}\n\n` +
            `Payment Mode: ${settleMode}\n\n` +
            `Do you want to proceed and permanently close this loan?`
        );
        if (!confirmed) return;

        const confirmBtn = document.getElementById('ln-fc-btn-confirm');
        const origBtnText = confirmBtn ? confirmBtn.innerHTML : 'Confirm Settlement';
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Settling...';
        }

        // 1. Update loan in database to 'Settled'
        const { error: loanErr } = await client
            .from('loans')
            .update({ status: 'Settled', updated_at: new Date().toISOString() })
            .eq('id', loanId);

        if (loanErr) {
            console.error('Settlement loan update error:', loanErr);
            alert('Failed to update loan status: ' + loanErr.message);
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.innerHTML = origBtnText; }
            return;
        }

        const currentMonth = currentMonthStr();
        // 2. Find or create current month installment to record settlement
        let currentInst = insts.find(i => i.month === currentMonth);
        if (currentInst) {
            await client.from('loan_installments').update({
                opening_principal: outstandingPrincipal,
                principal_paid: outstandingPrincipal,
                interest_amount: Math.max(0, accruedInt - waiver),
                emi_amount: netPayoff,
                closing_principal: 0,
                status: 'Paid',
                paid_at: new Date().toISOString()
            }).eq('id', currentInst.id);
        } else {
            // If no installment for current month (e.g. historical loan), create settlement record
            await client.from('loan_installments').insert([{
                loan_id: loanId,
                customer_name: customerName,
                month: currentMonth,
                opening_principal: outstandingPrincipal,
                annual_interest_rate: loan.annual_interest_rate,
                interest_amount: Math.max(0, accruedInt - waiver),
                principal_paid: outstandingPrincipal,
                emi_amount: netPayoff,
                closing_principal: 0,
                status: 'Paid',
                due_date: settleDate,
                paid_at: new Date().toISOString()
            }]);
        }

        // 3. Remove any future scheduled installments so they never appear as due
        await client.from('loan_installments').delete().eq('loan_id', loanId).gt('month', currentMonth);

        // 4. Save settlement metadata
        const phone = getCustomerPhone(loanId, customerName);
        saveLoanMeta(loanId, {
            settled: true,
            settledAt: new Date().toISOString(),
            settlementDate: settleDate,
            outstandingAtSettlement: outstandingPrincipal,
            netAmount: netPayoff,
            accruedInterest: accruedInt,
            waiver: waiver,
            charges: charges,
            settleMode: settleMode,
            settleNotes: settleNotes,
            customerName: customerName,
            customerPhone: phone
        });

        invalidateCache();
        closeForecloseModal();
        await renderDashboard();

        // Refresh Detail Modal
        const allL = await getLoans();
        const allI = await getAllInstallments();
        openDetailModal(loanId, allL, allI);

        if (typeof showNotification === 'function') {
            showNotification(`Loan for "${customerName}" settled and closed successfully!`, 'success');
        }
    }

    function sendNoDueWhatsApp(loanId) {
        if (!cachedLoans) return;
        const loan = cachedLoans.find(l => l.id === loanId);
        if (!loan) return;

        const customerName = loan.customer_name || 'Customer';
        const phone = promptAndSavePhone(loanId, customerName);
        if (!phone) return;

        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;

        const meta = getLoanMeta(loanId);
        const settleDateStr = meta.settlementDate ? fmtDate(meta.settlementDate) : fmtDate(new Date().toISOString().split('T')[0]);
        const netAmtStr = meta.netAmount ? fmt(meta.netAmount) : fmt(loan.original_amount);
        const settleModeStr = meta.settleMode || 'Cash / Online';
        const notesStr = meta.settleNotes ? `\n• *Remarks / NOC:* ${meta.settleNotes}` : '';

        const message =
`*PONNUSAMY SAVINGS & LOANS*
*NO-DUE & FULL LOAN CLEARANCE CERTIFICATE*
---------------------------------------
Certificate Date: *${settleDateStr}*
Account Ref: *#LN-${loanId.substring(0, 8).toUpperCase()}*

Dear *${customerName}*,

This is an official certificate from *Ponnusamy Savings & Chit Management* confirming that your loan facility of *${fmt(loan.original_amount)}* has been *FULLY SETTLED AND CLOSED*.

*Settlement Summary:*
• Final Settled Amount: *${netAmtStr}*
• Payment Mode: *${settleModeStr}*
• Account Status: *CLOSED / ZERO BALANCE*${notesStr}

There are NO further installments, interest, or liabilities due against this loan account.

Thank you for your valued relationship!
_Authorized Signatory - Ponnusamy Savings_`;

        const waUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    }

    function getMonthsForTenure(startYYYYMM, tenureCount) {
        if (!tenureCount || tenureCount <= 0) {
            // Ongoing: generate up to current month (or at least 1 month)
            const currentMonth = currentMonthStr();
            if (startYYYYMM <= currentMonth) {
                return getMonthsBetween(startYYYYMM, currentMonth);
            }
            return [startYYYYMM];
        }
        const months = [];
        let curr = startYYYYMM;
        for (let i = 0; i < tenureCount; i++) {
            months.push(curr);
            let [y, m] = curr.split('-').map(Number);
            m++;
            if (m > 12) { m = 1; y++; }
            curr = `${y}-${String(m).padStart(2, '0')}`;
        }
        return months;
    }

    // ─── Phase 2: Live EMI Preview Calculator ───
    function updateLiveEmiPreview() {
        const amtInput = document.getElementById('ln-amount');
        const rateInput = document.getElementById('ln-rate');
        const startDateInput = document.getElementById('ln-start-date');
        const dueDayInput = document.getElementById('ln-due-day');
        const tenureInput = document.getElementById('ln-tenure-months');
        const modeInput = document.querySelector('input[name="ln-mode"]:checked');
        const prinInput = document.getElementById('ln-principal-amount');
        const fixedEmiInput = document.getElementById('ln-fixed-emi-amount');

        const amount = parseFloat(amtInput && amtInput.value) || 0;
        const rate = parseFloat(rateInput && rateInput.value) || 0;
        const startDate = (startDateInput && startDateInput.value) || new Date().toISOString().split('T')[0];
        const dueDay = (dueDayInput && dueDayInput.value) || '05';
        const tenureMonths = parseInt(tenureInput && tenureInput.value, 10);
        const tenure = isNaN(tenureMonths) ? 12 : tenureMonths;
        const mode = modeInput ? modeInput.value : 'Interest Only';
        const principalPayment = parseFloat(prinInput && prinInput.value) || 0;
        const fixedEmiPayment = parseFloat(fixedEmiInput && fixedEmiInput.value) || 0;

        // Update tenure labels
        const tenureBadge = document.getElementById('ln-prev-tenure-badge');
        const tenureDisplay = document.getElementById('ln-tenure-display');
        const tenureText = tenure > 0 ? `${tenure} Months` : 'Ongoing';
        if (tenureBadge) tenureBadge.textContent = tenureText;
        if (tenureDisplay) tenureDisplay.textContent = tenureText;

        if (amount <= 0 || rate <= 0) {
            if (document.getElementById('ln-prev-interest')) document.getElementById('ln-prev-interest').textContent = '₹0';
            if (document.getElementById('ln-prev-emi')) document.getElementById('ln-prev-emi').textContent = '₹0';
            if (document.getElementById('ln-prev-total-int')) document.getElementById('ln-prev-total-int').textContent = '₹0';
            if (document.getElementById('ln-prev-maturity')) document.getElementById('ln-prev-maturity').textContent = '—';
            return;
        }

        const firstMonthInterest = calcInterest(amount, rate);
        let monthlyEmi = 0;
        let totalInterest = 0;
        let maturityMonths = tenure > 0 ? tenure : 12;

        if (mode === 'Interest Only') {
            monthlyEmi = firstMonthInterest;
            totalInterest = firstMonthInterest * (tenure > 0 ? tenure : 12);
        } else if (mode === 'Interest + Principal') {
            monthlyEmi = firstMonthInterest + principalPayment;
            let bal = amount;
            let count = 0;
            const maxM = tenure > 0 ? tenure : 120;
            while (bal > 0 && count < maxM) {
                const int = calcInterest(bal, rate);
                totalInterest += int;
                const prin = Math.min(principalPayment > 0 ? principalPayment : (amount / (tenure || 12)), bal);
                bal = calcClosing(bal, prin);
                count++;
            }
            maturityMonths = count;
        } else if (mode === 'Fixed EMI') {
            monthlyEmi = fixedEmiPayment > 0 ? fixedEmiPayment : firstMonthInterest;
            if (fixedEmiPayment > firstMonthInterest) {
                let bal = amount;
                let count = 0;
                const maxM = tenure > 0 ? tenure : 120;
                while (bal > 0 && count < maxM) {
                    const int = calcInterest(bal, rate);
                    totalInterest += int;
                    const rawPrin = fixedEmiPayment - int;
                    const prin = Math.min(rawPrin, bal);
                    bal = calcClosing(bal, prin);
                    count++;
                }
                maturityMonths = count;
            } else {
                totalInterest = firstMonthInterest * (tenure > 0 ? tenure : 12);
            }
        }

        // Maturity Date Calculation
        let maturityStr = '—';
        if (tenure === 0 && mode === 'Interest Only') {
            maturityStr = 'Ongoing (Open)';
        } else {
            const startParts = startDate.split('-').map(Number);
            if (startParts.length === 3) {
                const [sYear, sMonth] = startParts;
                const matDate = new Date(sYear, (sMonth - 1) + (maturityMonths - 1), parseInt(dueDay, 10));
                const dd = String(matDate.getDate()).padStart(2, '0');
                const mm = String(matDate.getMonth() + 1).padStart(2, '0');
                const yyyy = matDate.getFullYear();
                maturityStr = `${dd}/${mm}/${yyyy}`;
            }
        }

        if (document.getElementById('ln-prev-interest')) {
            document.getElementById('ln-prev-interest').textContent = fmt(firstMonthInterest);
        }
        if (document.getElementById('ln-prev-emi')) {
            document.getElementById('ln-prev-emi').textContent = fmt(monthlyEmi);
        }
        if (document.getElementById('ln-prev-total-int')) {
            document.getElementById('ln-prev-total-int').textContent = fmt(totalInterest);
        }
        if (document.getElementById('ln-prev-maturity')) {
            document.getElementById('ln-prev-maturity').textContent = maturityStr;
        }
    }

    async function createLoan(customerName, amount, rate, mode, startDate, principalPayment, fixedEmiPayment, tenureMonths = 12, dueDay = '05', customerPhone = '', notes = '') {
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

        // Save local metadata (phone, tenure, dueDay, notes)
        saveLoanMeta(loan.id, {
            customerName,
            customerPhone,
            tenureMonths,
            dueDay,
            notes,
            startDate
        });

        const startMonth = startDate ? startDate.substring(0, 7) : currentMonthStr();
        const dayOfMonth = dueDay || (startDate && startDate.split('-')[2] ? startDate.split('-')[2] : '05');
        const currentMonth = currentMonthStr();
        const monthsToGenerate = getMonthsForTenure(startMonth, tenureMonths);
        
        let currentOutstanding = amount;
        const installments = [];

        for (const monthStr of monthsToGenerate) {
            if (currentOutstanding <= 0) break; // Loan fully settled

            const interest = calcInterest(currentOutstanding, rate);
            let prinPaid = 0;
            let emi = 0;
            
            if (mode === 'Interest + Principal') {
                prinPaid = Math.min(principalPayment, currentOutstanding);
                emi = calcEMI(interest, prinPaid);
            } else if (mode === 'Fixed EMI') {
                const rawPrin = (fixedEmiPayment || 0) - interest;
                if (rawPrin <= 0) {
                    prinPaid = 0;
                    emi = interest;
                } else if (rawPrin >= currentOutstanding) {
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
            const isPast = monthStr < currentMonth;

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
                status: isPast ? 'Paid' : 'Pending',
                due_date: `${monthStr}-${dayOfMonth}`,
                paid_at: isPast ? new Date().toISOString() : null
            });

            currentOutstanding = closing;
        }

        if (installments.length > 0) {
            const { error: instErr } = await client.from('loan_installments').insert(installments);
            if (instErr) {
                console.error('Create installment error:', instErr);
            }
        }

        invalidateCache();
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

        invalidateCache();
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

        invalidateCache();
        return true;
    }

    async function updateInstallmentStatus(id, newStatus) {
        const client = getClient();
        if (!client) return false;
        const update = { status: newStatus, paid_at: newStatus === 'Paid' ? new Date().toISOString() : null };
        const { error } = await client.from('loan_installments').update(update).eq('id', id);
        if (error) { console.error('Status update error:', error); return false; }
        
        // Instant in-memory cache update
        if (cachedInstallments) {
            const inst = cachedInstallments.find(i => i.id === id);
            if (inst) {
                inst.status = newStatus;
                inst.paid_at = update.paid_at;
            }
        }
        if (window.State && State.isDirty) {
            State.isDirty.loan = true;
        }
        return true;
    }

    // ─── RENDER DASHBOARD ────────────────────────────────────────────────────────

    async function renderDashboard(forceRefresh = false) {
        const tbody = document.getElementById('loan-tbody');
        if (!tbody) return;

        const hasExistingContent = tbody.children.length > 0 && !tbody.querySelector('.loan-skeleton-tr');

        // Only show skeleton placeholders if there is no content on screen yet and cache is empty
        if (!hasExistingContent && (!cachedLoans || !cachedInstallments)) {
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
        }

        const loans = await getLoans(forceRefresh);
        const allInsts = await getAllInstallments(forceRefresh);
        const cm = currentMonthStr();
        if (!selectedMonth) selectedMonth = cm;
        const today = new Date().toISOString().split('T')[0];

        // Overall summary metrics across all active loans
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

        // Month Toolbar UI Updates
        const monthTitleEl = el('ln-month-title');
        if (monthTitleEl) monthTitleEl.textContent = formatMonthTitle(selectedMonth);
        const monthPickerEl = el('ln-month-picker');
        if (monthPickerEl) monthPickerEl.value = selectedMonth;

        const sectionTitleEl = el('loan-section-title');
        if (sectionTitleEl) sectionTitleEl.textContent = `${formatMonthTitle(selectedMonth)} Installments`;

        const activeMonthSubEl = el('loan-active-month-sub');
        if (activeMonthSubEl) {
            activeMonthSubEl.textContent = selectedMonth === cm ? '(Current Month)' : '';
        }

        // Installments for the selected month
        const monthInsts = allInsts.filter(i => i.month === selectedMonth);

        // Counts for the selected month
        const monthTotal = monthInsts.length;
        const dueCount = monthInsts.filter(i => i.status !== 'Paid').length;
        const paidCount = monthInsts.filter(i => i.status === 'Paid').length;

        if (el('ln-count-all')) el('ln-count-all').textContent = monthTotal;
        if (el('ln-count-due')) el('ln-count-due').textContent = dueCount;
        if (el('ln-count-paid')) el('ln-count-paid').textContent = paidCount;
        if (el('loan-total-badge')) el('loan-total-badge').textContent = `${monthTotal} Installments`;
        if (el('ln-month-total-count')) el('ln-month-total-count').textContent = monthTotal;

        // Apply Status Filter and Search Query
        let filteredInsts = monthInsts.filter(inst => {
            // Status filter
            if (selectedStatusFilter === 'due' && inst.status === 'Paid') return false;
            if (selectedStatusFilter === 'paid' && inst.status !== 'Paid') return false;

            // Search query filter
            if (searchQuery) {
                const loan = loans.find(l => l.id === inst.loan_id) || {};
                const name = (inst.customer_name || loan.customer_name || '').toLowerCase();
                if (!name.includes(searchQuery)) return false;
            }
            return true;
        });

        if (el('ln-visible-count')) el('ln-visible-count').textContent = filteredInsts.length;

        // Sort alphabetically by customer name
        filteredInsts.sort((a, b) => {
            const loanA = loans.find(l => l.id === a.loan_id) || {};
            const loanB = loans.find(l => l.id === b.loan_id) || {};
            const nameA = (a.customer_name || loanA.customer_name || '').trim().toLowerCase();
            const nameB = (b.customer_name || loanB.customer_name || '').trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });

        const tfoot = document.getElementById('loan-tfoot');
        const mobileContainer = document.getElementById('loan-mobile-cards-container');

        if (filteredInsts.length === 0) {
            let emptyMsg = `No installments for ${formatMonthTitle(selectedMonth)}. Click <strong>+ Add Loan</strong> to create one.`;
            if (monthTotal > 0) {
                const filterLabel = selectedStatusFilter === 'due' ? 'Due' : (selectedStatusFilter === 'paid' ? 'Paid' : 'All');
                emptyMsg = `No installments matching filter <strong>"${filterLabel}"</strong>${searchQuery ? ` and search <strong>"${searchQuery}"</strong>` : ''}.`;
            }
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:36px;color:var(--text-secondary);font-size:0.9rem;border-right:none;border-bottom:none;">${emptyMsg}</td></tr>`;
            if (tfoot) tfoot.style.display = 'none';
            if (mobileContainer) {
                mobileContainer.innerHTML = `<div style="text-align:center;padding:36px 16px;color:var(--text-secondary);font-size:0.9rem;background:var(--bg-surface);border-radius:14px;border:1px dashed var(--border);">${emptyMsg}</div>`;
            }
            return;
        }

        // Totals Calculation for filtered view
        let sumLoanAmt = 0;
        let sumInterest = 0;
        let sumEmi = 0;
        let filterPaidCount = 0;

        filteredInsts.forEach(inst => {
            const loan = loans.find(l => l.id === inst.loan_id) || {};
            sumLoanAmt += parseFloat(loan.original_amount) || 0;
            sumInterest += parseFloat(inst.interest_amount) || 0;
            sumEmi += parseFloat(inst.emi_amount) || 0;
            if (inst.status === 'Paid') filterPaidCount++;
        });

        tbody.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';

        filteredInsts.forEach((inst, idx) => {
            const loan = loans.find(l => l.id === inst.loan_id) || {};
            const isPaid = inst.status === 'Paid';
            const name = (inst.customer_name || loan.customer_name || '—').trim();
            const tr = document.createElement('tr');
            tr.style.transition = 'background-color 0.15s ease';
            tr.onmouseover = () => { tr.style.backgroundColor = 'rgba(212,175,55,0.06)'; };
            tr.onmouseout = () => { tr.style.backgroundColor = 'transparent'; };
            
            // Paid date badge pill matching reference image style
            const paidDateHtml = isPaid && inst.paid_at 
                ? `<span class="app-date-pill">${fmtDate(inst.paid_at)}</span>`
                : `<span style="color:var(--text-muted); font-weight:600; font-size:0.85rem;">--</span>`;

            const isLoanSettled = loan.status === 'Settled';
            // Status button pill matching Image 2
            let statusHtml;
            if (isLoanSettled) {
                statusHtml = `<span class="app-status-paid"><i data-lucide="shield-check" style="width:12px;height:12px;"></i> SETTLED</span>`;
            } else if (isPaid) {
                statusHtml = `<button class="ln-toggle" data-id="${inst.id}" data-status="${inst.status}"
                    class="app-status-paid" style="cursor:pointer; border:1px solid #86efac; background:#dcfce7; color:#15803d; font-weight:800; font-size:0.75rem; padding:4px 14px; border-radius:20px; min-width:85px; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:all 0.15s ease; display:inline-flex; align-items:center; justify-content:center; gap:4px;">
                    <i data-lucide="check" style="width:12px;height:12px;"></i> PAID
                  </button>`;
            } else {
                statusHtml = `<button class="ln-toggle" data-id="${inst.id}" data-status="${inst.status}"
                    class="app-status-due" style="cursor:pointer; border:1px solid #fca5a5; background:#fee2e2; color:#b91c1c; font-weight:800; font-size:0.75rem; padding:4px 14px; border-radius:20px; min-width:85px; box-shadow:0 1px 3px rgba(0,0,0,0.05); transition:all 0.15s ease; display:inline-flex; align-items:center; justify-content:center; gap:4px;">
                    <i data-lucide="clock" style="width:12px;height:12px;"></i> DUE
                  </button>`;
            }

            // EMI color: Green if Paid, Red if Due (not paid)
            const emiColor = isPaid ? '#15803d' : '#dc2626';
            const phone = getCustomerPhone(inst.loan_id, name);

            tr.innerHTML = `
                <td style="text-align:center; font-weight:700; color:var(--text-secondary); font-size:0.85rem; padding:14px 8px; border-bottom:1px solid var(--border-table);">${idx + 1}</td>
                <td style="text-align:left; padding:12px 14px; border-bottom:1px solid var(--border-table);">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
                        <div style="display:flex;flex-direction:column;gap:2px;">
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                <a href="#" class="ln-customer-link" data-loan-id="${inst.loan_id}" style="font-family:var(--font-body);font-size:0.95rem;font-weight:800;text-transform:uppercase;color:var(--text-main);text-decoration:none;letter-spacing:0.3px;">${name.toUpperCase()}</a>
                                ${isLoanSettled ? `<span style="font-size:0.65rem; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; border-radius:4px; padding:1px 5px; font-weight:800;">SETTLED</span>` : ''}
                            </div>
                            ${phone ? `<span style="font-size:0.75rem;color:var(--text-secondary);display:inline-flex;align-items:center;gap:3px;"><i data-lucide="phone" style="width:10px;height:10px;"></i> ${phone}</span>` : ''}
                        </div>
                        <div style="display:inline-flex;align-items:center;gap:6px;">
                            <button class="ln-row-wa-btn" data-loan-id="${inst.loan_id}" data-inst-id="${inst.id}" title="Send WhatsApp Reminder">
                                <i data-lucide="message-circle" style="width:14px;height:14px;"></i>
                            </button>
                            ${phone ? `
                            <a href="tel:${phone}" class="ln-row-call-btn" title="Call Customer">
                                <i data-lucide="phone" style="width:13px;height:13px;"></i>
                            </a>` : ''}
                        </div>
                    </div>
                </td>
                <td style="text-align:left; font-family:var(--font-body); font-variant-numeric:tabular-nums; font-weight:800; font-size:1.05rem; color:#4338ca; padding:14px 14px; border-bottom:1px solid var(--border-table);">${fmt(loan.original_amount || 0)}</td>
                <td style="text-align:left; font-family:var(--font-body); font-variant-numeric:tabular-nums; font-weight:800; font-size:1.05rem; color:#b45309; padding:14px 14px; border-bottom:1px solid var(--border-table);">${fmt(inst.interest_amount)}</td>
                <td style="text-align:left; font-family:var(--font-body); font-variant-numeric:tabular-nums; font-weight:800; font-size:1.05rem; color:${emiColor}; padding:14px 14px; border-bottom:1px solid var(--border-table);">${fmt(inst.emi_amount)}</td>
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
                            <div>
                                <div style="display:flex;align-items:center;gap:4px;">
                                    <a href="#" class="loan-customer-name-m ln-customer-link" data-loan-id="${inst.loan_id}">${name}</a>
                                    ${isLoanSettled ? `<span style="font-size:0.65rem; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; border-radius:4px; padding:1px 5px; font-weight:800;">SETTLED</span>` : ''}
                                </div>
                                ${phone ? `<div style="font-size:0.72rem;color:var(--text-secondary);margin-top:2px;">📞 ${phone}</div>` : ''}
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <button class="ln-row-wa-btn" data-loan-id="${inst.loan_id}" data-inst-id="${inst.id}" title="Send WhatsApp Reminder">
                                <i data-lucide="message-circle" style="width:14px;height:14px;"></i>
                            </button>
                            ${phone ? `
                            <a href="tel:${phone}" class="ln-row-call-btn" title="Call Customer">
                                <i data-lucide="phone" style="width:13px;height:13px;"></i>
                            </a>` : ''}
                            <div>${statusHtml}</div>
                        </div>
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

        // Update Desktop Table Totals Footer
        if (tfoot) {
            tfoot.style.display = 'table-footer-group';
            if (el('ln-foot-summary')) el('ln-foot-summary').textContent = `${filteredInsts.length} Loan${filteredInsts.length !== 1 ? 's' : ''}`;
            if (el('ln-foot-total-loan')) el('ln-foot-total-loan').textContent = fmt(sumLoanAmt);
            if (el('ln-foot-total-interest')) el('ln-foot-total-interest').textContent = fmt(sumInterest);
            if (el('ln-foot-total-emi')) el('ln-foot-total-emi').textContent = fmt(sumEmi);
            if (el('ln-foot-paid-count')) el('ln-foot-paid-count').textContent = `${filterPaidCount} / ${filteredInsts.length} Paid`;
            
            const pct = filteredInsts.length > 0 ? Math.round((filterPaidCount / filteredInsts.length) * 100) : 0;
            const badgeBg = pct === 100 ? '#dcfce7' : (pct > 0 ? '#fef3c7' : '#f1f5f9');
            const badgeColor = pct === 100 ? '#15803d' : (pct > 0 ? '#b45309' : '#64748b');
            const badgeBorder = pct === 100 ? '#86efac' : (pct > 0 ? '#fde68a' : '#cbd5e1');

            if (el('ln-foot-completion-badge')) {
                el('ln-foot-completion-badge').innerHTML = `
                    <span style="display:inline-block; padding:4px 10px; border-radius:12px; background:${badgeBg}; color:${badgeColor}; font-weight:800; font-size:0.75rem; border:1px solid ${badgeBorder}; font-family:var(--font-number);">
                        ${pct}% Paid
                    </span>
                `;
            }
        }

        // Add Mobile Summary Card at top of mobileContainer
        if (mobileContainer && filteredInsts.length > 0) {
            const pct = Math.round((filterPaidCount / filteredInsts.length) * 100);
            const mobileSummary = document.createElement('div');
            mobileSummary.className = 'loan-mobile-summary-card';
            mobileSummary.innerHTML = `
                <div class="loan-mobile-summary-header">
                    <span class="loan-mobile-summary-title">${formatMonthTitle(selectedMonth)} Summary</span>
                    <span class="loan-mobile-summary-badge">${filterPaidCount}/${filteredInsts.length} Paid (${pct}%)</span>
                </div>
                <div class="loan-mobile-summary-grid">
                    <div class="loan-mobile-summary-item">
                        <span class="loan-mobile-summary-lbl">Loan Amt</span>
                        <span class="loan-mobile-summary-val" style="color:#818cf8;">${fmt(sumLoanAmt)}</span>
                    </div>
                    <div class="loan-mobile-summary-item">
                        <span class="loan-mobile-summary-lbl">Interest</span>
                        <span class="loan-mobile-summary-val" style="color:#fbbf24;">${fmt(sumInterest)}</span>
                    </div>
                    <div class="loan-mobile-summary-item">
                        <span class="loan-mobile-summary-lbl">Total EMI</span>
                        <span class="loan-mobile-summary-val" style="color:#4ade80;">${fmt(sumEmi)}</span>
                    </div>
                </div>
            `;
            mobileContainer.insertBefore(mobileSummary, mobileContainer.firstChild);
        }

        if (window.lucide) window.lucide.createIcons();

        // Bind WhatsApp Reminder buttons
        document.querySelectorAll('.ln-row-wa-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const loanId = btn.getAttribute('data-loan-id');
                const instId = btn.getAttribute('data-inst-id');
                sendLoanWhatsAppReminder(loanId, instId);
            });
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

        // Clean up dirty state now that render is complete
        if (window.State && State.isDirty) {
            State.isDirty.loan = false;
        }
    }

    // ─── ADD LOAN MODAL ──────────────────────────────────────────────────────────

    function openAddModal() {
        const form = document.getElementById('ln-add-form');
        if (form) form.reset();

        // Populate customer autocomplete datalist from chit members & past loans
        populateCustomerDatalist();

        // Set start date default to today (YYYY-MM-DD)
        const startDateInput = document.getElementById('ln-start-date');
        if (startDateInput) {
            startDateInput.value = new Date().toISOString().split('T')[0];
        }

        // Set due day default to 05
        const dueDayInput = document.getElementById('ln-due-day');
        if (dueDayInput) dueDayInput.value = '05';

        // Reset tenure selection to 12 Months
        const tenureInput = document.getElementById('ln-tenure-months');
        if (tenureInput) tenureInput.value = '12';
        document.querySelectorAll('.ln-tenure-btn').forEach(btn => {
            if (btn.getAttribute('data-months') === '12') {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Reset phone, notes, mode
        const phoneInput = document.getElementById('ln-customer-phone');
        if (phoneInput) {
            phoneInput.value = '';
            delete phoneInput.dataset.autofilled;
        }
        const notesInput = document.getElementById('ln-notes');
        if (notesInput) notesInput.value = '';

        // Hide principal and fixed emi fields (reset to default)
        const prinField = document.getElementById('ln-principal-field');
        if (prinField) prinField.style.display = 'none';
        const fixedEmiField = document.getElementById('ln-fixed-emi-field');
        if (fixedEmiField) fixedEmiField.style.display = 'none';

        // Update live EMI preview with reset values
        updateLiveEmiPreview();

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
        const meta = getLoanMeta(loanId);

        const el = id => document.getElementById(id);
        // Customer Name: large, bold, dark black
        if (el('ln-det-name')) el('ln-det-name').textContent = name;
        
        let infoText = `${fmt(loan.original_amount)} loan · ${loan.annual_interest_rate}%/yr · ${loan.payment_mode}`;
        if (meta.customerPhone) {
            infoText += ` · 📞 ${meta.customerPhone}`;
        }
        if (meta.notes) {
            infoText += ` · 📝 ${meta.notes}`;
        }
        if (el('ln-det-info')) el('ln-det-info').textContent = infoText;

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
                        ? `<span class="app-date-pill">${fmtDate(inst.paid_at)}</span>`
                        : `<span style="color:var(--text-muted); font-weight:600; font-size:0.85rem;">--</span>`;

                    // Status badge pill
                    const detStatusHtml = isPaid
                        ? `<span class="app-status-paid">✓ PAID</span>`
                        : `<span class="app-status-due">⏱ DUE</span>`;

                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid var(--border-table)';
                    tr.style.transition = 'background-color 0.15s ease';
                    tr.onmouseover = () => { tr.style.backgroundColor = 'rgba(212,175,55,0.05)'; };
                    tr.onmouseout = () => { tr.style.backgroundColor = 'transparent'; };

                    tr.innerHTML = `
                        <td style="padding:12px 10px; text-align:center; font-family:var(--font-body); font-weight:800; color:#1e293b; font-size:0.9rem; border-right:1px solid var(--border-table);"><span class="app-date-pill" style="background:#f1f5f9;color:#1e293b;border-color:#e2e8f0;">${dateDisplay}</span></td>
                        <td style="padding:12px 10px; text-align:left; font-family:var(--font-body); font-variant-numeric:tabular-nums; font-weight:800; color:#4338ca; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.opening_principal)}</td>
                        <td style="padding:12px 10px; text-align:left; font-family:var(--font-body); font-variant-numeric:tabular-nums; font-weight:800; color:#b45309; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.interest_amount)}</td>
                        <td style="padding:12px 10px; text-align:left; font-family:var(--font-body); font-variant-numeric:tabular-nums; font-weight:800; color:#6b21a8; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.principal_paid)}</td>
                        <td style="padding:12px 10px; text-align:left; font-family:var(--font-body); font-variant-numeric:tabular-nums; font-weight:800; color:${detEmiColor}; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.emi_amount)}</td>
                        <td style="padding:12px 8px; text-align:center; border-right:1px solid var(--border-table);">${detPaidDateHtml}</td>
                        <td style="padding:12px 10px; text-align:left; font-family:var(--font-body); font-variant-numeric:tabular-nums; font-weight:800; color:#475569; font-size:1.05rem; border-right:1px solid var(--border-table);">${fmt(inst.closing_principal)}</td>
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

        // Phase 4: Settle / Foreclosure button and Settled Banner
        const isSettled = loan.status === 'Settled' || (meta && meta.settled);
        const settledBanner = document.getElementById('ln-det-settled-banner');
        const settledSub = document.getElementById('ln-det-settled-sub');
        const forecloseBtn = document.getElementById('ln-det-btn-foreclose');
        const noDueWaBtn = document.getElementById('ln-det-btn-nodue-wa');

        // Repayment Progress Bar
        const origAmt = parseFloat(loan.original_amount) || 0;
        const pct = origAmt > 0 ? Math.min(100, Math.round((prinPaid / origAmt) * 100)) : 0;
        const progBar = document.getElementById('ln-det-progress-bar');
        const progText = document.getElementById('ln-det-progress-text');

        if (isSettled) {
            if (settledBanner) settledBanner.style.display = 'flex';
            if (settledSub) {
                const sDate = meta.settlementDate ? fmtDate(meta.settlementDate) : (meta.settledAt ? fmtDate(meta.settledAt) : 'Recently');
                const sNet = meta.netAmount ? fmt(meta.netAmount) : fmt(loan.original_amount);
                const sMode = meta.settleMode || 'Cash';
                settledSub.textContent = `Closed on ${sDate} · Final Settled Amount: ${sNet} (${sMode}) · No further dues`;
            }
            if (progBar) {
                progBar.style.width = '100%';
                progBar.style.background = 'linear-gradient(90deg, #10b981 0%, #059669 100%)';
            }
            if (progText) {
                progText.textContent = `Account Fully Settled & Closed (100%)`;
            }
            if (forecloseBtn) forecloseBtn.style.display = 'none';
            if (noDueWaBtn) {
                noDueWaBtn.style.display = 'inline-flex';
                noDueWaBtn.onclick = () => sendNoDueWhatsApp(loanId);
            }
        } else {
            if (settledBanner) settledBanner.style.display = 'none';
            if (progBar) {
                progBar.style.background = 'linear-gradient(90deg, #d4af37 0%, #10b981 100%)';
                progBar.style.width = '0%';
                requestAnimationFrame(() => {
                    progBar.style.width = `${pct}%`;
                });
            }
            if (progText) {
                progText.textContent = `${fmt(prinPaid)} / ${fmt(origAmt)} (${pct}% Repaid)`;
            }
            if (forecloseBtn) {
                forecloseBtn.style.display = 'inline-flex';
                forecloseBtn.onclick = () => openForecloseModal(loanId);
            }
            if (noDueWaBtn) noDueWaBtn.style.display = 'none';
        }

        // WhatsApp Statement Button Handler
        const waStmtBtn = document.getElementById('ln-det-btn-wa');
        if (waStmtBtn) {
            waStmtBtn.onclick = () => {
                sendLoanPassbookWhatsApp(loanId);
            };
        }

        // Download Statement PDF Button Handler
        const pdfBtn = document.getElementById('ln-det-btn-pdf');
        if (pdfBtn) {
            pdfBtn.onclick = () => {
                exportLoanPassbookPdf(loanId);
            };
        }

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

        // Phase 4: Foreclose Modal close buttons
        const closeFc = document.getElementById('ln-fc-modal-close');
        if (closeFc) closeFc.addEventListener('click', closeForecloseModal);
        const cancelFc = document.getElementById('ln-fc-btn-cancel');
        if (cancelFc) cancelFc.addEventListener('click', closeForecloseModal);

        // Backdrop click to close
        const addModal = document.getElementById('ln-add-modal');
        if (addModal) addModal.addEventListener('click', e => { if (e.target === addModal) closeAddModal(); });
        const detModal = document.getElementById('ln-detail-modal');
        if (detModal) detModal.addEventListener('click', e => { if (e.target === detModal) closeDetailModal(); });
        const editModal = document.getElementById('ln-edit-modal');
        if (editModal) editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });
        const fcModal = document.getElementById('ln-foreclose-modal');
        if (fcModal) fcModal.addEventListener('click', e => { if (e.target === fcModal) closeForecloseModal(); });

        // Phase 4: Foreclose dynamic calculation inputs & confirm
        ['ln-fc-accrued-int', 'ln-fc-waiver', 'ln-fc-charges'].forEach(id => {
            const inputEl = document.getElementById(id);
            if (inputEl) inputEl.addEventListener('input', updateForecloseCalc);
        });

        const btnSettleConfirm = document.getElementById('ln-fc-btn-confirm');
        if (btnSettleConfirm) {
            btnSettleConfirm.addEventListener('click', (e) => {
                e.preventDefault();
                settleLoan();
            });
        }

        // Save loan (Create)
        const btnSave = document.getElementById('ln-btn-save');
        if (btnSave) {
            btnSave.addEventListener('click', async (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('ln-customer-name');
                const phoneInput = document.getElementById('ln-customer-phone');
                const amtInput = document.getElementById('ln-amount');
                const rateInput = document.getElementById('ln-rate');
                const startDateInput = document.getElementById('ln-start-date');
                const dueDayInput = document.getElementById('ln-due-day');
                const tenureInput = document.getElementById('ln-tenure-months');
                const notesInput = document.getElementById('ln-notes');
                const prinInput = document.getElementById('ln-principal-amount');
                const modeInput = document.querySelector('input[name="ln-mode"]:checked');

                const name = (nameInput && nameInput.value.trim()) || '';
                const customerPhone = (phoneInput && phoneInput.value.trim()) || '';
                const amt = parseFloat(amtInput && amtInput.value);
                const rate = parseFloat(rateInput && rateInput.value);
                const startDate = (startDateInput && startDateInput.value) || new Date().toISOString().split('T')[0];
                const dueDay = (dueDayInput && dueDayInput.value) || '05';
                const tenureMonths = parseInt(tenureInput && tenureInput.value, 10);
                const tenure = isNaN(tenureMonths) ? 12 : tenureMonths;
                const notes = (notesInput && notesInput.value.trim()) || '';
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

                const loan = await createLoan(name, amt, rate, mode, startDate, principalPayment, fixedEmiPayment, tenure, dueDay, customerPhone, notes);

                btnSave.textContent = originalText;
                btnSave.disabled = false;

                if (loan) {
                    closeAddModal();
                    renderDashboard();
                    if (typeof showNotification === 'function') showNotification('Loan created successfully!', 'success');
                }
            });
        }

        // ─── Phase 2: Customer Autocomplete & Phone Auto-fill ───
        const custNameInput = document.getElementById('ln-customer-name');
        const custPhoneInput = document.getElementById('ln-customer-phone');
        if (custNameInput) {
            const handleCustomerAutoFill = () => {
                const val = custNameInput.value.trim().toLowerCase();
                if (!val) return;
                const membersMap = populateCustomerDatalist();
                if (membersMap && membersMap.has(val)) {
                    const match = membersMap.get(val);
                    if (match && match.phone && custPhoneInput) {
                        if (!custPhoneInput.value || custPhoneInput.dataset.autofilled === 'true') {
                            custPhoneInput.value = match.phone;
                            custPhoneInput.dataset.autofilled = 'true';
                        }
                    }
                }
            };
            custNameInput.addEventListener('input', handleCustomerAutoFill);
            custNameInput.addEventListener('change', handleCustomerAutoFill);
            if (custPhoneInput) {
                custPhoneInput.addEventListener('input', () => {
                    delete custPhoneInput.dataset.autofilled;
                });
            }
        }

        // ─── Phase 2: Tenure Selector Buttons ───
        const tenureBtns = document.querySelectorAll('.ln-tenure-btn');
        tenureBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tenureBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const months = btn.getAttribute('data-months');
                const tenureInput = document.getElementById('ln-tenure-months');
                if (tenureInput) tenureInput.value = months;
                updateLiveEmiPreview();
            });
        });

        // ─── Phase 2: Live EMI Preview Calculation Listeners ───
        ['ln-amount', 'ln-rate', 'ln-start-date', 'ln-due-day', 'ln-principal-amount', 'ln-fixed-emi-amount'].forEach(id => {
            const elInput = document.getElementById(id);
            if (elInput) {
                elInput.addEventListener('input', updateLiveEmiPreview);
                elInput.addEventListener('change', updateLiveEmiPreview);
            }
        });

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
                updateLiveEmiPreview();
            });
        });

        // Add Loan button
        const btnAdd = document.getElementById('ln-btn-add');
        if (btnAdd) {
            btnAdd.addEventListener('click', openAddModal);
        }

        // ─── Phase 1: Month Navigation Listeners ───
        const btnPrevMonth = document.getElementById('ln-btn-prev-month');
        if (btnPrevMonth) btnPrevMonth.addEventListener('click', () => changeMonth(-1));

        const btnNextMonth = document.getElementById('ln-btn-next-month');
        if (btnNextMonth) btnNextMonth.addEventListener('click', () => changeMonth(1));

        const btnToday = document.getElementById('ln-btn-today');
        if (btnToday) btnToday.addEventListener('click', () => setMonth(currentMonthStr()));

        const monthPicker = document.getElementById('ln-month-picker');
        if (monthPicker) {
            monthPicker.addEventListener('change', (e) => {
                if (e.target.value) setMonth(e.target.value);
            });
        }

        // ─── Phase 1: Search Box Listeners ───
        const searchInput = document.getElementById('ln-search-input');
        const searchClear = document.getElementById('ln-search-clear');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                searchQuery = e.target.value.trim().toLowerCase();
                if (searchClear) {
                    searchClear.style.display = searchQuery ? 'flex' : 'none';
                }
                renderDashboard();
            });
        }
        if (searchClear) {
            searchClear.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                searchQuery = '';
                searchClear.style.display = 'none';
                if (searchInput) searchInput.focus();
                renderDashboard();
            });
        }

        // ─── Phase 1: Status Filter Pills Listeners ───
        const filterPills = document.querySelectorAll('.loan-filter-pill');
        filterPills.forEach(pill => {
            pill.addEventListener('click', () => {
                filterPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                selectedStatusFilter = pill.getAttribute('data-filter') || 'all';
                renderDashboard();
            });
        });

        // Preload loan data in background so the first visit is instant
        setTimeout(() => {
            renderDashboard();
        }, 150);
    }

    return { init, renderDashboard, invalidateCache };
})();

// Explicitly bind to window for global access
window.LoanApp = LoanApp;

// Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LoanApp.init);
} else {
    LoanApp.init();
}
