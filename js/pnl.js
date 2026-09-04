// --- Profit and Loss (P&L) Implementation ---

function getActualCurrentMonthNum(group) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    
    const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
    const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
    
    const diffMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth);
    let actualMonthNum = diffMonths + 1;
    
    if (actualMonthNum < 1) actualMonthNum = 1;
    if (actualMonthNum > group.duration) actualMonthNum = group.duration;
    
    return actualMonthNum;
}

function calculateGroupPnL(group) {
    const activeMembers = State.members.filter(m => m.groupId === group.id && m.status === 'Active');
    const memberCount = activeMembers.length;
    const actualMonthNum = getActualCurrentMonthNum(group);
    let expectedCollection = 0;
    let expectedPayout = 0;
    
    let realizedCollection = 0;
    let realizedPayout = 0;
    
    let arrears = 0;

    for (let m = 1; m <= group.duration; m++) {
        const instAmount = group.installments && group.installments[m] !== undefined ? group.installments[m] : group.monthlyInstallment;
        const payoutAmount = group.payouts && group.payouts[m] !== undefined ? group.payouts[m] : 0;
        
        expectedCollection += (instAmount * memberCount);
        expectedPayout += payoutAmount;
        
        activeMembers.forEach(member => {
            const payment = member.payments && member.payments[m] ? member.payments[m] : null;
            
            // Collections
            if (payment) {
                if (payment.paid) {
                    realizedCollection += instAmount;
                } else {
                    const partial = payment.partialPaid || 0;
                    realizedCollection += partial;
                    if (m <= actualMonthNum) {
                        arrears += (instAmount - partial);
                    }
                }
            } else if (m <= actualMonthNum) {
                // Not paid, and month is past or current -> Arrears!
                arrears += instAmount;
            }
            
            // Payouts
            if (payment && payment.payoutClaimed) {
                realizedPayout += payoutAmount;
            }
        });
    }

    const netProfit = realizedCollection - realizedPayout;

    return {
        realizedCollection,
        realizedPayout,
        netProfit,
        arrears
    };
}

function renderPnLDashboard() {
    let globalCollected = 0;
    let globalPayout = 0;
    let globalNetProfit = 0;
    let globalArrears = 0;
    
    const tbody = document.getElementById('pnl-groups-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (State.groups.length === 0) {
        tbody.innerHTML = '<tr class="pnl-empty-row"><td colspan="7">No groups available yet. Create a chit group to see P&amp;L data.</td></tr>';
    } else {
        const activeGroupsWithMembers = State.groups.filter(g => {
            return State.members.some(m => m.groupId === g.id && m.status === 'Active');
        });

        if (activeGroupsWithMembers.length === 0) {
            tbody.innerHTML = '<tr class="pnl-empty-row"><td colspan="7">No active groups with members available yet.</td></tr>';
        } else {
            const sortedGroups = [...activeGroupsWithMembers].sort((a, b) => {
                const yearA = a.startYear !== undefined ? parseInt(a.startYear) : new Date(a.createdAt).getFullYear();
                const yearB = b.startYear !== undefined ? parseInt(b.startYear) : new Date(b.createdAt).getFullYear();
                if (yearA !== yearB) return yearA - yearB;
                const monthA = a.startMonth !== undefined ? parseInt(a.startMonth) : new Date(a.createdAt).getMonth();
                const monthB = b.startMonth !== undefined ? parseInt(b.startMonth) : new Date(b.createdAt).getMonth();
                return monthA - monthB;
            });

            let displayIndex = 1;
            sortedGroups.forEach((group) => {
                const index = displayIndex - 1;
                displayIndex++;
                const pnl = calculateGroupPnL(group);
            
            globalCollected += pnl.realizedCollection;
            globalPayout += pnl.realizedPayout;
            globalNetProfit += pnl.netProfit;
            globalArrears += pnl.arrears;
            
            const groupNameParts = group.name.split('-');
            let groupNameHtml = group.name;
            if (groupNameParts.length === 2) {
                const start = groupNameParts[0].trim();
                const end = groupNameParts[1].trim();
                groupNameHtml = `<span class="pnl-val-green">${start}</span> - <span class="pnl-val-red">${end}</span>`;
            }
            
            const netClass = pnl.netProfit >= 0 ? 'pnl-val-green' : 'pnl-val-red';
            const arrearsClass = pnl.arrears > 0 ? 'pnl-val-orange' : 'pnl-val-muted';
            
            let amt = group.chitAmount || group.amount;
            let schemeString = '';
            if (amt >= 100000 && amt % 100000 === 0) schemeString = (amt / 100000) + 'L';
            else if (amt >= 1000 && amt % 1000 === 0) schemeString = (amt / 1000) + 'K';
            else schemeString = '₹' + formatNumberIndian(amt);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="pnl-td-num" data-label="#">${index + 1}</td>
                <td class="pnl-td-name" data-label="Group Name">${groupNameHtml}</td>
                <td class="pnl-td-center" data-label="Duration">${group.duration}M / ${schemeString}</td>
                <td class="pnl-td-right pnl-val-green" data-label="Collected">₹${formatNumberIndian(pnl.realizedCollection)}</td>
                <td class="pnl-td-right pnl-val-purple" data-label="Payout">₹${formatNumberIndian(pnl.realizedPayout)}</td>
                <td class="pnl-td-right ${netClass}" data-label="Net">₹${formatNumberIndian(pnl.netProfit)}</td>
                <td class="pnl-td-right ${arrearsClass}" data-label="Arrears">₹${formatNumberIndian(pnl.arrears)}</td>
            `;
                        row.style.cursor = 'pointer';
            row.onclick = () => openPnLMonthDrawer(group.id);
            row.classList.add('pnl-row-hover');
            tbody.appendChild(row);
        });
        }
    }
    
    const elExpected = document.getElementById('pnl-global-expected');
    if (elExpected) elExpected.textContent = '₹' + formatNumberIndian(globalCollected);
    
    const elPayout = document.getElementById('pnl-global-payout');
    if (elPayout) elPayout.textContent = '₹' + formatNumberIndian(globalPayout);
    
    const elRealized = document.getElementById('pnl-global-realized');
    const elRealizedCard = document.getElementById('pnl-global-realized-card');
    const elTitle = document.getElementById('pnl-global-title');
    const elNetTrend = document.getElementById('pnl-net-trend');
    // Update icon inside Net card
    const elRealizedIcon = elRealizedCard ? elRealizedCard.querySelector('.pnl-card-v2-icon') : null;
    if (elRealized) {
        elRealized.textContent = '\u20b9' + formatNumberIndian(globalNetProfit);
        if (globalNetProfit < 0) {
            if (elTitle) elTitle.textContent = 'Net Loss';
            elRealized.style.color = '#dc2626';
            if (elRealizedIcon) { elRealizedIcon.className = 'pnl-card-v2-icon pnl-icon-red'; }
            if (elNetTrend) { elNetTrend.className = 'pnl-card-v2-trend pnl-trend-down'; }
        } else {
            if (elTitle) elTitle.textContent = 'Net Profit';
            elRealized.style.color = '#059669';
            if (elRealizedIcon) { elRealizedIcon.className = 'pnl-card-v2-icon pnl-icon-green'; }
            if (elNetTrend) { elNetTrend.className = 'pnl-card-v2-trend pnl-trend-up'; }
        }
    }
    
    const elPending = document.getElementById('pnl-global-pending');
    if (elPending) elPending.textContent = '₹' + formatNumberIndian(globalArrears);

    if (window.lucide) window.lucide.createIcons();
}

        // Desktop Rotate View Logic (Mobile & Forced Desktop)
    const btnToggleDesktopM = document.getElementById('btn-toggle-desktop-m');
    const btnToggleMobileDesktop = document.getElementById('btn-toggle-mobile-desktop');
    let isDesktopViewForced = false;
    
    function toggleDesktopView(e) {
        if (e) e.preventDefault();
        isDesktopViewForced = !isDesktopViewForced;
        const viewport = document.querySelector('meta[name="viewport"]');
        
        if (isDesktopViewForced) {
            document.body.classList.add('is-forced-desktop');
            if (viewport) viewport.setAttribute('content', 'width=1024, initial-scale=1.0');
        } else {
            document.body.classList.remove('is-forced-desktop');
            if (viewport) viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
    }

    if (btnToggleDesktopM) btnToggleDesktopM.addEventListener('click', toggleDesktopView);
    if (btnToggleMobileDesktop) btnToggleMobileDesktop.addEventListener('click', toggleDesktopView);


function openPnLMonthDrawer(groupId) {
    const group = State.groups.find(g => g.id === groupId);
    if (!group) return;

    // Remove any existing modal first
    const existing = document.getElementById('pnl-drawer-backdrop');
    if (existing) existing.remove();

    const activeMembers = State.members.filter(m => m.groupId === groupId && m.status === 'Active');
    const memberCount = activeMembers.length;
    const baseInstAmount = group.chitAmount / group.duration;

    let totalCollected = 0, totalPayout = 0, totalArrears = 0;
    let rowsHtml = '';
    const actualMonthNum = getActualCurrentMonthNum(group);

    for (let m = 1; m <= group.duration; m++) {
        let monthCollected = 0, monthPayout = 0, paidCount = 0;
        let monthArrears = 0;
        const isCurrentOrPast = m <= actualMonthNum;
        
        const instAmountVal = (group.installments && group.installments[m] !== undefined) ? group.installments[m] : (group.monthlyInstallment || baseInstAmount);
        const payoutVal = (group.payouts && group.payouts[m] !== undefined) ? group.payouts[m] : group.chitAmount;

        activeMembers.forEach(member => {
            const payment = member.payments && member.payments[m] ? member.payments[m] : null;
            if (payment) {
                if (payment.paid) { 
                    monthCollected += instAmountVal; 
                    paidCount++; 
                } else {
                    const partial = payment.partialPaid || 0;
                    monthCollected += partial;
                    if (isCurrentOrPast) {
                        monthArrears += (instAmountVal - partial);
                    }
                }
                if (payment.payoutClaimed) { monthPayout += payoutVal; }
            } else if (isCurrentOrPast) {
                monthArrears += instAmountVal;
            }
        });

        if (isCurrentOrPast) {
            totalArrears += monthArrears;
        }
        
        totalCollected += monthCollected;
        totalPayout += monthPayout;

        const isFuture = !isCurrentOrPast && paidCount === 0 && monthPayout === 0;
        const rowOpacity = isFuture ? '0.4' : '1';
        const monthColor = isFuture ? '#888' : (paidCount === memberCount ? '#10b981' : (paidCount > 0 ? '#f59e0b' : '#ef4444'));
        rowsHtml += '<tr style="border-bottom:1px solid rgba(128,128,128,0.15);opacity:' + rowOpacity + ';">' +
            '<td style="padding:12px 16px;text-align:left;font-weight:700;color:' + monthColor + ';white-space:nowrap;">Month ' + m + '</td>' +
            '<td style="padding:12px 16px;text-align:right;white-space:nowrap;">&#8377;' + formatNumberIndian(instAmountVal) + '</td>' +
            '<td style="padding:12px 16px;text-align:right;white-space:nowrap;">' + paidCount + '/' + memberCount + '</td>' +
            '<td style="padding:12px 16px;text-align:right;color:#10b981;white-space:nowrap;">&#8377;' + formatNumberIndian(monthCollected) + '</td>' +
            '<td style="padding:12px 16px;text-align:right;color:#9333ea;white-space:nowrap;">' + (monthPayout > 0 ? '&#8377;' + formatNumberIndian(monthPayout) : '&mdash;') + '</td>' +
            '<td style="padding:12px 16px;text-align:right;color:#ea580c;white-space:nowrap;">' + (monthArrears > 0 ? '&#8377;' + formatNumberIndian(monthArrears) : '&mdash;') + '</td>' +
            '</tr>';
    }

    const goldGradient = 'linear-gradient(135deg, #FFD700 0%, #D4AF37 50%, #B8860B 100%)';
    rowsHtml += '<tr style="background:' + goldGradient + '; color: #1a1400;">' +
        '<td colspan="3" style="padding:14px 16px;font-weight:900;text-align:left;font-size:0.9rem;letter-spacing:0.05em;border-top:2px solid #a07a00;border-bottom-left-radius:18px;">TOTAL</td>' +
        '<td style="padding:14px 16px;text-align:right;font-weight:900;color:#064e3b;border-top:2px solid #a07a00;">&#8377;' + formatNumberIndian(totalCollected) + '</td>' +
        '<td style="padding:14px 16px;text-align:right;font-weight:900;color:#4c1d95;border-top:2px solid #a07a00;">&#8377;' + formatNumberIndian(totalPayout) + '</td>' +
        '<td style="padding:14px 16px;text-align:right;font-weight:900;color:#9a3412;border-top:2px solid #a07a00;border-bottom-right-radius:18px;">' + (totalArrears > 0 ? '&#8377;' + formatNumberIndian(totalArrears) : '&mdash;') + '</td>' +
        '</tr>';

    const isDark = document.body.getAttribute('data-theme') !== 'light';
    const surfaceBg = isDark ? '#111111' : '#FAFAFA';
    const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
    const textMain = isDark ? '#f0f0f0' : '#111111';
    const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const thBg = isDark ? '#1c170d' : '#f8f4ec';

    const backdropEl = document.createElement('div');
    backdropEl.id = 'pnl-drawer-backdrop';
    backdropEl.setAttribute('style',
        'position:fixed!important;top:0!important;left:0!important;' +
        'width:100vw!important;height:100vh!important;' +
        'background:rgba(0,0,0,0.75)!important;' +
        'backdrop-filter:blur(12px)!important;' +
        '-webkit-backdrop-filter:blur(12px)!important;' +
        'z-index:2147483647!important;' +
        'display:flex!important;' +
        'align-items:center!important;' +
        'justify-content:center!important;' +
        'opacity:0;transition:opacity 0.25s ease;');

    backdropEl.addEventListener('click', closePnLMonthDrawer);

    const drawerEl = document.createElement('div');
    drawerEl.id = 'pnl-month-drawer';
    drawerEl.setAttribute('style',
        'background:' + surfaceBg + ';' +
        'border:1px solid ' + borderColor + ';' +
        'border-radius:18px;' +
        'width:92%;max-width:740px;max-height:80vh;' +
        'display:flex;flex-direction:column;' +
        'box-shadow:0 25px 70px rgba(0,0,0,0.8);' +
        'transform:scale(0.88) translateY(40px);' +
        'transition:transform 0.32s cubic-bezier(0.34,1.56,0.64,1);' +
        'overflow:hidden;');
    drawerEl.addEventListener('click', function(e) { e.stopPropagation(); });

    let amt = group.chitAmount || group.amount;
    let schemeString = '';
    if (amt >= 100000 && amt % 100000 === 0) schemeString = (amt / 100000) + 'L';
    else if (amt >= 1000 && amt % 1000 === 0) schemeString = (amt / 1000) + 'K';
    else schemeString = '₹' + formatNumberIndian(amt);

    drawerEl.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:18px 22px;border-bottom:1px solid ' + borderColor + ';flex-shrink:0;">' +
            '<h3 style="margin:0;font-size:1.15rem;font-weight:700;color:' + textMain + ';font-family:inherit;">' + group.name + ' <span style="font-size:0.75rem;font-weight:800;color:#b45309;background-color:#fef3c7;border:1px solid #fcd34d;padding:2px 6px;border-radius:4px;margin-left:8px;vertical-align:middle;letter-spacing:0.05em;">' + group.duration + 'M / ' + schemeString + '</span></h3>' +
            '<button id="pnl-drawer-close-x" style="width:34px;height:34px;border-radius:50%;background:rgba(128,128,128,0.15);border:1px solid ' + borderColor + ';cursor:pointer;color:' + textMain + ';display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;font-family:sans-serif;" title="Close">&#215;</button>' +
        '</div>' +
        '<div style="overflow-y:auto;overflow-x:auto;flex:1;">' +
            '<table style="width:100%;border-collapse:collapse;min-width:500px;color:' + textMain + ';">' +
                '<thead>' +
                    '<tr style="background:' + goldGradient + ';">' +
                        '<th style="padding:12px 16px;text-align:left;font-size:0.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#1a1400;border-bottom:2px solid #a07a00;white-space:nowrap;position:sticky;top:0;background:' + goldGradient + ';z-index:10;">Month</th>' +
                        '<th style="padding:12px 16px;text-align:right;font-size:0.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#1a1400;border-bottom:2px solid #a07a00;white-space:nowrap;position:sticky;top:0;background:' + goldGradient + ';z-index:10;">Inst.</th>' +
                        '<th style="padding:12px 16px;text-align:right;font-size:0.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#1a1400;border-bottom:2px solid #a07a00;white-space:nowrap;position:sticky;top:0;background:' + goldGradient + ';z-index:10;">Paid</th>' +
                        '<th style="padding:12px 16px;text-align:right;font-size:0.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#1a1400;border-bottom:2px solid #a07a00;white-space:nowrap;position:sticky;top:0;background:' + goldGradient + ';z-index:10;">Collected</th>' +
                        '<th style="padding:12px 16px;text-align:right;font-size:0.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#1a1400;border-bottom:2px solid #a07a00;white-space:nowrap;position:sticky;top:0;background:' + goldGradient + ';z-index:10;">Payout</th>' +
                        '<th style="padding:12px 16px;text-align:right;font-size:0.78rem;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#1a1400;border-bottom:2px solid #a07a00;white-space:nowrap;position:sticky;top:0;background:' + goldGradient + ';z-index:10;">Arrears</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' + rowsHtml + '</tbody>' +
            '</table>' +
        '</div>';

    backdropEl.appendChild(drawerEl);
    document.body.appendChild(backdropEl);

    // Wire close button
    document.getElementById('pnl-drawer-close-x').addEventListener('click', closePnLMonthDrawer);

    // Animate in (double rAF to ensure paint)
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            backdropEl.style.opacity = '1';
            drawerEl.style.transform = 'scale(1) translateY(0)';
        });
    });
}

function closePnLMonthDrawer() {
    const backdrop = document.getElementById('pnl-drawer-backdrop');
    if (!backdrop) return;
    backdrop.style.opacity = '0';
    const drawer = document.getElementById('pnl-month-drawer');
    if (drawer) drawer.style.transform = 'scale(0.88) translateY(40px)';
    setTimeout(function() { const el = document.getElementById('pnl-drawer-backdrop'); if (el) el.remove(); }, 320);
}
// Ripple Effect for Buttons
