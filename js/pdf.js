// --- PDF Generation Logic ---
function generatePdfReport() {
    const group = State.groups.find(g => g.id === State.selectedGroupId);
    if (!group) return;
    
    const monthNum = parseInt(document.getElementById('pdf-export-month-select').value);
    if (isNaN(monthNum)) return;
    
    // Close modal
    document.getElementById('pdf-export-modal-backdrop').classList.remove('active');
    
    // Prepare Data
    const members = State.members.filter(m => m.groupId === group.id);
    let collected = 0;
    let pending = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let takenChitCount = 0;
    
    const installmentVal = group.installments && group.installments[monthNum] !== undefined 
        ? group.installments[monthNum] 
        : group.monthlyInstallment;
        
    const payoutVal = group.payouts && group.payouts[monthNum] !== undefined
        ? group.payouts[monthNum]
        : 0;

    const targetCollection = members.length * installmentVal;

    const tbody = document.getElementById('pdf-table-body');
    const defaultersBody = document.getElementById('pdf-defaulters-body');
    
    tbody.innerHTML = '';
    defaultersBody.innerHTML = '';
    
    let pendingMembers = [];

    members.forEach((member, index) => {
        const payment = member.payments[monthNum];
        const isPaid = payment && payment.paid;
        
        let hasTakenChit = false;
        for (let m = 1; m <= group.duration; m++) {
            if (member.payments[m] && member.payments[m].payoutClaimed) {
                hasTakenChit = true;
                break;
            }
        }

        if (hasTakenChit) takenChitCount++;
        
        if (isPaid) {
            collected += installmentVal;
            paidCount++;
        } else {
            pending += installmentVal;
            pendingCount++;
            pendingMembers.push(member);
        }
        
        const tr = document.createElement('tr');
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        tr.style.backgroundColor = rowBg;
        
        const statusColor = isPaid ? '#065f46' : '#991b1b';
        const statusBg = isPaid ? '#d1fae5' : '#fee2e2';
        const statusText = isPaid ? 'PAID' : 'PENDING';
        
        const chitStatusText = hasTakenChit ? '<span style="color: #4338ca; font-weight: 700;">Taken</span>' : '<span style="color: #64748b;">Not Taken</span>';
        
        let datePaidText = '--';
        if (isPaid) {
            if (payment.customDate) {
                datePaidText = new Date(payment.customDate).toLocaleDateString();
            } else if (payment.paidAt) {
                datePaidText = new Date(payment.paidAt).toLocaleDateString();
            } else {
                datePaidText = 'Paid';
            }
        }

        tr.innerHTML = `
            <td style="padding: 12px; color: #334155; border: 1px solid #d1d5db; text-align: center;">${index + 1}</td>
            <td style="padding: 12px; color: #0f172a; font-weight: 700; border: 1px solid #d1d5db;">${member.name}</td>
            <td style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">${chitStatusText}</td>
            <td style="padding: 12px; color: #475569; font-size: 11px; border: 1px solid #d1d5db;">${datePaidText}</td>
            <td style="padding: 12px; text-align: right; color: #0f172a; font-weight: 600; border: 1px solid #d1d5db;">₹${formatNumberIndian(installmentVal)}</td>
            <td style="padding: 12px; text-align: center; border: 1px solid #d1d5db;">
                <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 800;">${statusText}</span>
            </td>
        `;
        tbody.appendChild(tr);
    });

    pendingMembers.forEach((member) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #fecaca';
        tr.innerHTML = `
            <td style="padding: 8px; color: #991b1b; font-weight: 700;">${member.name}</td>
            <td style="padding: 8px; color: #991b1b;">${member.mobileNo || '--'}</td>
            <td style="padding: 8px; text-align: right; color: #991b1b; font-weight: 800;">₹${formatNumberIndian(installmentVal)}</td>
        `;
        defaultersBody.appendChild(tr);
    });
    
    if (pendingMembers.length === 0) {
        defaultersBody.innerHTML = `<tr><td colspan="3" style="padding: 8px; text-align: center; color: #059669; font-weight: 700;">No pending dues this month! All collected.</td></tr>`;
    }

    // Populate Headers and Summary
    document.getElementById('pdf-group-name').textContent = group.name;
    document.getElementById('pdf-month-name').textContent = `Month ${monthNum} / ${group.duration}`;
    
    const now = new Date();
    document.getElementById('pdf-gen-date').textContent = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    document.getElementById('pdf-target-collection').textContent = `₹${formatNumberIndian(targetCollection)}`;
    document.getElementById('pdf-total-collected').textContent = `₹${formatNumberIndian(collected)}`;
    document.getElementById('pdf-total-pending').textContent = `₹${formatNumberIndian(pending)}`;

    const percentage = targetCollection > 0 ? ((collected / targetCollection) * 100).toFixed(1) : 0;
    document.getElementById('pdf-collection-percentage').textContent = `${percentage}%`;

    document.getElementById('pdf-total-members').textContent = members.length;
    document.getElementById('pdf-members-paid').textContent = paidCount;
    document.getElementById('pdf-members-pending').textContent = pendingCount;
    document.getElementById('pdf-members-taken').textContent = takenChitCount;

    // Show temporary container, generate, hide
    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    
    const container = document.getElementById('pdf-template-container');
    const htmlContent = container.outerHTML.replace('display: none;', 'display: block;');

    const opt = {
        margin:       [10, 5],
        filename:     `${group.name.replace(/\s+/g, '_')}_Month_${monthNum}_Report.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(htmlContent).save().then(() => {
        if (overlay) overlay.style.display = 'none';
        showNotification('PDF Report Generated Successfully!', 'success');
    }).catch(err => {
        console.error(err);
        if (overlay) overlay.style.display = 'none';
        showNotification('Error generating PDF', 'error');
    });
}

function generateGlobalPdfReport(mode = 'download') {
    const selectedMonthKey = document.getElementById('global-pdf-export-month-select').value;
    const selectedDayValue = document.getElementById('global-pdf-export-day-select') ? document.getElementById('global-pdf-export-day-select').value : 'all';
    if (!selectedMonthKey) return;
    
    document.getElementById('global-pdf-export-modal-backdrop').classList.remove('active');
    
    const [selYearStr, selMonthStr] = selectedMonthKey.split('-');
    const selYear = parseInt(selYearStr);
    const selMonth = parseInt(selMonthStr);
    
    let globalTarget = 0;
    let globalCollected = 0;
    let globalPending = 0;
    
    const groupsContainer = document.getElementById('global-pdf-unified-table-container');
    if (!groupsContainer) return; // safety
    groupsContainer.innerHTML = '';
    
    // Find all groups active in this calendar month
    let activeGroupsForMonth = [];
    
    State.groups.forEach(group => {
        const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
        const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
        
        let gDate = new Date(startYear, startMonth, 1);
        
        for (let m = 1; m <= group.duration; m++) {
            if (gDate.getFullYear() === selYear && (gDate.getMonth() + 1) === selMonth) {
                // This group's "Month M" falls in the selected Calendar Month
                activeGroupsForMonth.push({ group, relMonthNum: m });
                break;
            }
            gDate.setMonth(gDate.getMonth() + 1);
        }
    });
    
    if (activeGroupsForMonth.length === 0) {
        showNotification("No data to export for this month.", "error");
        return;
    }
    
    let allMembersFlattened = [];

    activeGroupsForMonth.forEach(item => {
        const { group, relMonthNum } = item;
        const members = State.members.filter(m => m.groupId === group.id);
        
        const installmentVal = group.installments && group.installments[relMonthNum] !== undefined 
            ? group.installments[relMonthNum] 
            : group.monthlyInstallment;
            
        let groupTarget = members.length * installmentVal;
        let groupCollected = 0;
        let groupPending = 0;
        
        const schemeName = `${(group.chitAmount >= 100000 ? group.chitAmount/100000 + ' Lakh' : group.chitAmount/1000 + 'K')} / ${group.duration}M`;

        members.forEach((member) => {
            const payment = member.payments[relMonthNum];
            const isPaid = payment && payment.paid;
            
            let dayNumber = null;
            let dateText = '--';
            
            if (isPaid) {
                if (payment.customDate) {
                    dayNumber = parseInt(payment.customDate, 10);
                    dateText = `${String(dayNumber).padStart(2, '0')}/${String(selMonth).padStart(2, '0')}/${selYear}`;
                } else if (payment.paidAt) {
                    const d = new Date(payment.paidAt);
                    dayNumber = d.getDate();
                    dateText = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                }
            }

            // Filter by selected day
            if (selectedDayValue !== 'all') {
                const targetDay = parseInt(selectedDayValue, 10);
                if (dayNumber !== targetDay) {
                    return; // Skip this member
                }
            }
            
            let hasTakenChit = false;
            let chitAmountStr = '';
            let chitModeStr = '';
            for (let i = 1; i <= group.duration; i++) {
                if (member.payments[i] && member.payments[i].payoutClaimed) {
                    hasTakenChit = true;
                    const payoutVal = group.payouts && group.payouts[i] !== undefined ? group.payouts[i] : 0;
                    chitAmountStr = `₹${formatNumberIndian(payoutVal)}`;
                    chitModeStr = member.payments[i].paymentMode ? member.payments[i].paymentMode.substring(0,1).toUpperCase() : 'C'; // e.g., 'G' for Gpay
                    break;
                }
            }
            
            if (isPaid) {
                groupCollected += installmentVal;
            } else {
                groupPending += installmentVal;
            }
            
            allMembersFlattened.push({
                name: member.name,
                groupName: group.name,
                scheme: schemeName,
                monthNo: relMonthNum,
                dueAmount: isPaid ? 0 : installmentVal,
                paidAmount: isPaid ? installmentVal : 0,
                paidDate: dateText,
                isPaid: isPaid,
                hasTakenChit: hasTakenChit,
                chitTakenDisplay: hasTakenChit ? `${chitAmountStr} / ${chitModeStr}` : '--'
            });
        });
        
        globalTarget += groupTarget;
        globalCollected += groupCollected;
        globalPending += groupPending;
    });

    let tableRowsHtml = '';
    allMembersFlattened.forEach((row, index) => {
        
        const markPill = row.isPaid 
            ? `<span style="background-color: #dcfce7; color: #166534; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; border: 1px solid #bbf7d0;"><i class="fa-solid fa-check" style="margin-right: 4px;"></i> PAID</span>`
            : `<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; border: 1px solid #fecaca;"><i class="fa-solid fa-circle-exclamation" style="margin-right: 4px;"></i> DUE</span>`;
            
        const chitPill = row.hasTakenChit
            ? `<span style="background-color: #f3e8ff; color: #6b21a8; padding: 4px 10px; border-radius: 99px; font-size: 10px; font-weight: 800; border: 1px solid #e9d5ff;"><i class="fa-solid fa-circle-check" style="margin-right: 4px;"></i> ${row.chitTakenDisplay}</span>`
            : `<span style="color: #94a3b8; font-weight: 600;">--</span>`;

        const rowBg = index % 2 === 0 ? '#ffffff' : '#f9fafb';
        let rowDueColor = row.dueAmount > 0 ? '#ef4444' : '#94a3b8';
        let rowPaidColor = row.paidAmount > 0 ? '#10b981' : '#94a3b8';
        let rowDateColor = row.paidDate !== '--' ? '#0ea5e9' : '#94a3b8';
        if (row.paidAmount > 0 && row.dueAmount > 0 && row.paidDate !== '--') {
            rowDateColor = '#d97706';
        }
        let rowDueText = row.dueAmount === 0 ? '--' : `₹${formatNumberIndian(row.dueAmount)}`;
        let rowPaidText = row.paidAmount === 0 ? '--' : `₹${formatNumberIndian(row.paidAmount)}`;

        tableRowsHtml += `
            <tr style="background-color: ${rowBg};">
                <td style="padding: 12px 10px; color: #334155; font-size: 12px; font-weight: 700; text-align: center; border: 1px solid #d1d5db;">${index + 1}</td>
                <td style="padding: 12px 10px; color: #0f172a; font-weight: 800; font-size: 12px; text-transform: uppercase; border: 1px solid #d1d5db;">${row.name}</td>
                <td style="padding: 12px 10px; color: #64748b; font-size: 12px; font-weight: 600; border: 1px solid #d1d5db;">${row.groupName}</td>
                <td style="padding: 12px 10px; text-align: center; border: 1px solid #d1d5db;">
                    <span style="border: 1px solid #e2e8f0; background: #ffffff; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; color: #1e293b;">${row.scheme}</span>
                </td>
                <td style="padding: 12px 10px; color: #d97706; font-size: 12px; font-weight: 800; text-align: center; border: 1px solid #d1d5db;">${row.monthNo}</td>
                <td style="padding: 12px 10px; text-align: right; color: ${rowDueColor}; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">${rowDueText}</td>
                <td style="padding: 12px 10px; text-align: right; color: ${rowPaidColor}; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">${rowPaidText}</td>
                <td style="padding: 12px 10px; color: ${rowDateColor}; font-size: 12px; font-weight: 700; text-align: center; border: 1px solid #d1d5db;">${row.paidDate}</td>
                <td style="padding: 12px 10px; text-align: center; border: 1px solid #d1d5db;">${markPill}</td>
                <td style="padding: 12px 10px; text-align: center; border: 1px solid #d1d5db;">${chitPill}</td>
            </tr>
        `;
    });

    groupsContainer.innerHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; background: white;">
            <thead>
                <tr style="background-color: #111827;">
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">S.No</th>
                    <th style="padding: 15px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Name</th>
                    <th style="padding: 15px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Chit Group</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Scheme</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Month No.</th>
                    <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Due Amount</th>
                    <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Paid Amount</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Paid Date</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Mark</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Chit Taken</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>
    `;

    const dateObj = new Date(selYear, selMonth - 1, 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    
    document.getElementById('global-pdf-month-name').textContent = `${monthName} ${selYear}`;
    
    const now = new Date();
    document.getElementById('global-pdf-gen-date').textContent = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    document.getElementById('global-pdf-target').textContent = `₹${formatNumberIndian(globalTarget)}`;
    document.getElementById('global-pdf-collected').textContent = `₹${formatNumberIndian(globalCollected)}`;
    document.getElementById('global-pdf-pending').textContent = `₹${formatNumberIndian(globalPending)}`;

    const globalPercentage = globalTarget > 0 ? ((globalCollected / globalTarget) * 100).toFixed(1) : 0;
    document.getElementById('global-pdf-percentage').textContent = `${globalPercentage}%`;

    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    const container = document.getElementById('global-pdf-template-container');
    const htmlContent = container.outerHTML.replace('display: none;', 'display: block;');

    const opt = {
        margin:       [10, 5],
        filename:     `Global_Report_${monthName}_${selYear}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    if (mode === 'download') {
        html2pdf().set(opt).from(htmlContent).save().then(() => {
            if (overlay) overlay.style.display = 'none';
            showNotification('Global PDF Report Downloaded!', 'success');
        }).catch(err => {
            console.error(err);
            if (overlay) overlay.style.display = 'none';
            showNotification('Error generating PDF', 'error');
        });
    } else if (mode === 'share') {
        html2pdf().set(opt).from(htmlContent).outputPdf('blob').then(async (blob) => {
            if (overlay) overlay.style.display = 'none';
            
            const file = new File([blob], opt.filename, { type: 'application/pdf' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: opt.filename,
                        text: 'Here is the Global Dashboard Report',
                        files: [file]
                    });
                    showNotification('Report shared successfully!', 'success');
                } catch (error) {
                    console.error('Error sharing', error);
                    // AbortError is thrown when user cancels the share sheet
                    if (error.name !== 'AbortError') {
                        showNotification('Error sharing report.', 'error');
                    }
                }
            } else {
                showNotification('Web Share not supported on this device/browser', 'error');
                // Fallback to download
                html2pdf().set(opt).from(htmlContent).save();
            }
        }).catch(err => {
            console.error(err);
            if (overlay) overlay.style.display = 'none';
            showNotification('Error generating PDF', 'error');
        });
    }
}



/* --- PWA Install Logic --- */
let deferredPrompt;

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('SW registration failed: ', err);
        });
    });
    
    // Auto-reload to immediately apply updates when a new SW activates
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
            refreshing = true;
            window.location.reload();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const pwaPopup = document.getElementById('pwa-install-prompt');
    const btnPwaInstall = document.getElementById('pwa-install-btn');
    const btnPwaLater = document.getElementById('pwa-later-btn');
    const btnPwaClose = document.getElementById('pwa-close-btn');
    const btnManualInstall = document.getElementById('btn-manual-install');

    function hidePwaPopup(decline = false) {
        if (pwaPopup) {
            pwaPopup.classList.remove('show');
            setTimeout(() => {
                pwaPopup.style.display = 'none';
            }, 500); // match transition duration
        }
        if (decline) {
            localStorage.setItem('pwaPromptDeclined', 'true');
        }
    }

    if (btnPwaClose) btnPwaClose.addEventListener('click', () => hidePwaPopup(false));
    if (btnPwaLater) btnPwaLater.addEventListener('click', () => hidePwaPopup(true));

    if (btnManualInstall) {
        btnManualInstall.addEventListener('click', (e) => {
            e.preventDefault();
            // Close dropdown safely
            const profileMenu = document.getElementById('profile-dropdown-menu');
            if (profileMenu) profileMenu.classList.remove('active');
            
            // Show PWA popup
            if (pwaPopup) {
                pwaPopup.style.display = 'flex';
                setTimeout(() => pwaPopup.classList.add('show'), 50);
            }
        });
    }

    if (btnPwaInstall) {
        btnPwaInstall.addEventListener('click', async () => {
            hidePwaPopup();
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                console.log('User response to the install prompt: ' + outcome);
                deferredPrompt = null;
            } else {
                alert("Your browser doesn't support automatic installation. Please click the 'Share' or 'Menu' button in your browser and select 'Add to Home Screen' or 'Install App'.");
            }
        });
    }

    // Handle Install Prompt globally
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (pwaPopup) {
            localStorage.removeItem('pwaPromptDeclined');
            pwaPopup.style.display = 'flex';
            setTimeout(() => pwaPopup.classList.add('show'), 50);
        }
    });

    window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        hidePwaPopup();
        console.log('PWA was installed');
    });

    // Close contact action menus when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.contact-action-wrapper')) {
            document.querySelectorAll('.contact-action-menu').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
});














function initAppearanceSettings() {
    const savedFont = localStorage.getItem('pms_font_family') || "'Montserrat', sans-serif";
    const savedSize = localStorage.getItem('pms_font_size') || "16";

    document.documentElement.style.setProperty('--font-body', savedFont);
    document.documentElement.style.setProperty('--font-heading', savedFont);
    document.documentElement.style.fontSize = savedSize + "px";

    const fontSelect = document.getElementById('settings-font-family');
    const sizeSlider = document.getElementById('settings-font-size');
    const sizeLabel = document.getElementById('settings-font-size-label');

    if (fontSelect) fontSelect.value = savedFont;
    if (sizeSlider) {
        sizeSlider.value = savedSize;
        if(sizeLabel) sizeLabel.textContent = savedSize + "px";
    }

    if (fontSelect) {
        fontSelect.addEventListener('change', (e) => {
            const font = e.target.value;
            localStorage.setItem('pms_font_family', font);
            document.documentElement.style.setProperty('--font-body', font);
            document.documentElement.style.setProperty('--font-heading', font);
        });
    }

    if (sizeSlider) {
        sizeSlider.addEventListener('input', (e) => {
            const size = e.target.value;
            if(sizeLabel) sizeLabel.textContent = size + "px";
            localStorage.setItem('pms_font_size', size);
            document.documentElement.style.fontSize = size + "px";
        });
    }
}

function generateYearlyPdfReport() {
    const selYear = document.getElementById('yearly-pdf-export-year-select').value;
    if (!selYear) {
        if(typeof showNotification === 'function') showNotification('Please select a year', 'error');
        return;
    }
    
    document.getElementById('global-pdf-export-modal-backdrop').classList.remove('active');

    let totalTarget = 0;
    let totalCollected = 0;
    let totalPending = 0;

    let monthlyData = {};
    for (let i = 1; i <= 12; i++) {
        monthlyData[i] = {
            target: 0,
            collected: 0,
            pending: 0,
            monthNo: i
        };
    }

    State.groups.forEach(group => {
        let members = group.members || [];
        const monthlyDue = group.chitAmount / group.duration;

        members.forEach(member => {
            if (!member.payments) return;

            Object.keys(member.payments).forEach(monthIdx => {
                const p = member.payments[monthIdx];
                
                // Calculate the real-world date for this relative month index
                const groupStartMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
                const groupStartYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
                
                const pDate = new Date(groupStartYear, groupStartMonth + parseInt(monthIdx), 1);
                
                if (pDate.getFullYear() == selYear) {
                    const realMonth = pDate.getMonth() + 1; // 1 to 12
                    
                    totalTarget += monthlyDue;
                    monthlyData[realMonth].target += monthlyDue;
                    
                    if (p.paid) {
                        totalCollected += monthlyDue;
                        monthlyData[realMonth].collected += monthlyDue;
                    } else {
                        totalPending += monthlyDue;
                        monthlyData[realMonth].pending += monthlyDue;
                    }
                }
            });
        });
    });

    // Generate HTML for the table
    let tableRowsHtml = '';
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    for (let i = 1; i <= 12; i++) {
        const d = monthlyData[i];
        if (d.target === 0) continue; // Skip months with no active chit data
        
        const rowBg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        const colRate = d.target > 0 ? ((d.collected / d.target) * 100).toFixed(1) : 0;
        
        tableRowsHtml += `
            <tr style="background-color: ${rowBg};">
                <td style="padding: 12px 10px; color: #334155; font-size: 13px; font-weight: 700; text-align: center; border: 1px solid #d1d5db;">${i}</td>
                <td style="padding: 12px 10px; color: #0f172a; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">${monthNames[i-1]}</td>
                <td style="padding: 12px 10px; text-align: right; color: #334155; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">₹${formatNumberIndian(d.target)}</td>
                <td style="padding: 12px 10px; text-align: right; color: #16a34a; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">₹${formatNumberIndian(d.collected)}</td>
                <td style="padding: 12px 10px; text-align: right; color: #dc2626; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">₹${formatNumberIndian(d.pending)}</td>
                <td style="padding: 12px 10px; text-align: center; color: #d97706; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">${colRate}%</td>
            </tr>
        `;
    }

    if(tableRowsHtml === '') {
        tableRowsHtml = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b;">No data found for this year</td></tr>';
    }

    document.getElementById('yearly-pdf-table-container').innerHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; background: white;">
            <thead>
                <tr style="background-color: #111827;">
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Month No.</th>
                    <th style="padding: 15px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Month Name</th>
                    <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Target Amount</th>
                    <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Collected Amount</th>
                    <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Pending Amount</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Collection %</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHtml}
            </tbody>
        </table>
    `;

    document.getElementById('yearly-pdf-year-name').textContent = `Year ${selYear}`;
    const now = new Date();
    document.getElementById('yearly-pdf-gen-date').textContent = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    document.getElementById('yearly-pdf-target').textContent = `₹${formatNumberIndian(totalTarget)}`;
    document.getElementById('yearly-pdf-collected').textContent = `₹${formatNumberIndian(totalCollected)}`;
    document.getElementById('yearly-pdf-pending').textContent = `₹${formatNumberIndian(totalPending)}`;

    const percentage = totalTarget > 0 ? ((totalCollected / totalTarget) * 100).toFixed(1) : 0;
    document.getElementById('yearly-pdf-percentage').textContent = `${percentage}%`;

    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    const container = document.getElementById('yearly-pdf-template-container');
    const htmlContent = container.outerHTML.replace('display: none;', 'display: block;');

    const opt = {
        margin:       [10, 5],
        filename:     `Yearly_Report_${selYear}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(htmlContent).save().then(() => {
        if (overlay) overlay.style.display = 'none';
        if(typeof showNotification === 'function') showNotification('Yearly Report Downloaded!', 'success');
    }).catch(err => {
        console.error(err);
        if (overlay) overlay.style.display = 'none';
        if(typeof showNotification === 'function') showNotification('Error generating PDF', 'error');
    });
}

function generateChitTakenPdfReport(monthKeyOverride = null, mode = 'download') {
    const selMonthKey = monthKeyOverride || document.getElementById('chit-pdf-export-month-select')?.value;
    if (!selMonthKey) {
        if(typeof showNotification === 'function') showNotification('Please select a month', 'error');
        return;
    }
    
    const [selYear, selMonth] = selMonthKey.split('-');
    const targetYear = parseInt(selYear);
    const targetMonth = parseInt(selMonth) - 1; // 0-indexed to match getRelativeMonthForGroup
    
    document.getElementById('global-pdf-export-modal-backdrop')?.classList.remove('active');

    let takenMembers = [];
    let totalPayoutAmount = 0;

    State.groups.forEach(group => {
        const members = State.members.filter(m => m.groupId === group.id);
        const relativeMonthNum = getRelativeMonthForGroup(group, targetYear, targetMonth);
        
        // Only applicable if the selected month falls within the group's duration
        if (relativeMonthNum < 1 || relativeMonthNum > group.duration) return;
        
        members.forEach(member => {
            // Check if member has taken the payout AT ALL (to match dashboard filter)
            let hasTakenPayout = false;
            let payoutVal = 0;
            let payoutMethod = null;
            let payoutDate = null;
            
            if (member.payments) {
                for (let m = 1; m <= group.duration; m++) {
                    if (member.payments[m] && member.payments[m].payoutClaimed) {
                        hasTakenPayout = true;
                        payoutVal = group.chitAmount;
                        if (group.payouts && group.payouts[m] !== undefined) {
                            payoutVal = group.payouts[m];
                        } else {
                            const matchedTemplate = State.schemeTemplates && State.schemeTemplates.find(t => t.chitAmount === group.chitAmount && t.duration === group.duration);
                            if (matchedTemplate && matchedTemplate.payouts && matchedTemplate.payouts[m] !== undefined) {
                                payoutVal = matchedTemplate.payouts[m];
                            }
                        }
                        payoutMethod = member.payments[m].payoutMethod;
                        payoutDate = member.payments[m].payoutDate;
                        break;
                    }
                }
            }
            let takenThisSelectedMonth = false;
            if (hasTakenPayout && payoutDate) {
                const parts = payoutDate.split('-');
                if (parts.length === 3) {
                    const pYear = parseInt(parts[0]);
                    const pMonth = parseInt(parts[1]) - 1;
                    if (pYear === targetYear && pMonth === targetMonth) {
                        takenThisSelectedMonth = true;
                    }
                }
            } else if (hasTakenPayout && !payoutDate) {
                takenThisSelectedMonth = true; // Fallback for older entries without specific dates
            }

            // Only include members who have taken the chit IN THIS SELECTED MONTH
            if (takenThisSelectedMonth) {
                // Calculate due/paid for the selected month
                let dueAmount = 0;
                let paidAmount = 0;
                let currentMonthPaid = false;
                let displayPaidDate = '--';
                
                const payment = member.payments[relativeMonthNum];
                const instVal = group.installments && group.installments[relativeMonthNum] !== undefined 
                    ? group.installments[relativeMonthNum] 
                    : group.monthlyInstallment;
                
                if (payment) {
                    currentMonthPaid = payment.paid;
                    if (payment.paid) {
                        paidAmount = instVal;
                        dueAmount = 0;
                    } else {
                        const partial = payment.partialPaid || 0;
                        paidAmount = partial;
                        dueAmount = instVal - partial;
                    }
                } else {
                    dueAmount = instVal;
                    paidAmount = 0;
                    currentMonthPaid = false;
                }
                
                const startMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
                const startYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
                const dateObj = new Date(startYear, startMonth + relativeMonthNum - 1, 1);
                const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                const yyyy = dateObj.getFullYear();
                
                const customDateDay = payment && payment.customDate ? String(payment.customDate).padStart(2, '0') : '';
                const partialPaid = payment ? (payment.partialPaid || 0) : 0;
                if (currentMonthPaid) {
                    displayPaidDate = customDateDay ? `${customDateDay}/${mm}/${yyyy}` : `Checked`;
                } else if (partialPaid > 0) {
                    displayPaidDate = customDateDay ? `${customDateDay}/${mm}/${yyyy}` : String(new Date().getDate()).padStart(2, '0') + `/${mm}/${yyyy}`;
                } else {
                    displayPaidDate = '--';
                }
                
                takenMembers.push({
                    name: member.name,
                    groupName: group.name,
                    chitAmount: group.chitAmount,
                    duration: group.duration,
                    customerType: member.customerType,
                    relativeMonthNum,
                    dueAmount,
                    paidAmount,
                    currentMonthPaid,
                    displayPaidDate,
                    hasTakenPayout,
                    payoutVal,
                    payoutMethod,
                    payoutDate,
                    paymentMethodThisMonth: payment && payment.paid ? payment.method : null
                });
                
                totalPayoutAmount += payoutVal;
            }
        });
    });

    if (takenMembers.length === 0) {
        const overlay = document.getElementById('pdf-loading-overlay');
        if (overlay) overlay.style.display = 'none';
        
        const dispMonthObj = new Date(selYear, selMonth - 1, 1);
        const dispMonthName = dispMonthObj.toLocaleString('default', { month: 'long' });
        
        if (typeof showNotification === 'function') {
            showNotification(`No members have taken a chit in ${dispMonthName} ${selYear}`, 'warning');
        }
        return;
    }

    let tableRowsHtml = '';
    takenMembers.forEach((item, index) => {
        const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
        
        let dueAmountText = item.dueAmount > 0 ? `₹${item.dueAmount.toLocaleString('en-IN')}` : '--';
        let paidAmountText = item.paidAmount > 0 ? `₹${item.paidAmount.toLocaleString('en-IN')}` : '--';
        let dueColor = item.dueAmount > 0 ? '#ef4444' : '#1e293b';
        let paidColor = item.paidAmount > 0 ? '#10b981' : '#1e293b';
        
        let paidDateHtml = '--';
        if (item.displayPaidDate !== '--') {
            paidDateHtml = `<span style="background: #eff6ff; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 11px; border: 1px solid #bfdbfe;">${item.displayPaidDate}</span>`;
        }
        
        let markHtml = '';
        if (item.currentMonthPaid) {
            let methodSuffix = '';
            if (item.paymentMethodThisMonth === 'gpay') {
                methodSuffix = ` <span style="color: #60a5fa; font-weight: 800; font-size: 10px;">/ G</span>`;
            } else if (item.paymentMethodThisMonth === 'cash') {
                methodSuffix = ` <span style="color: #fca5a5; font-weight: 800; font-size: 10px;">/ C</span>`;
            }
            markHtml = `<span style="background: #ecfdf5; color: #10b981; border: 1px solid #10b981; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">✓ PAID${methodSuffix}</span>`;
        } else if (item.paidAmount > 0) {
            markHtml = `<span style="background: #fffbeb; color: #d97706; border: 1px solid #d97706; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">PARTIAL</span>`;
        } else {
            markHtml = `<span style="background: #fef2f2; color: #ef4444; border: 1px solid #ef4444; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">! DUE</span>`;
        }
        
        let methodLetterHtml = '';
        if (item.payoutMethod === 'cash') {
            methodLetterHtml = ` <span style="color: #d8b4fe; font-weight: 800;">/ C</span>`;
        } else if (item.payoutMethod === 'gpay') {
            methodLetterHtml = ` <span style="color: #93c5fd; font-weight: 800;">/ G</span>`;
        }
        let chitTakenHtml = `<span style="background: linear-gradient(135deg, #a855f7, #7e22ce); color: #fff; font-weight: 800; font-size: 11px; padding: 4px 8px; border-radius: 99px; display: inline-block;">₹${item.payoutVal.toLocaleString('en-IN')}${methodLetterHtml}</span>`;
        
        let schemeAmountStr = '';
        if (item.chitAmount >= 100000) {
            let lakhs = item.chitAmount / 100000;
            schemeAmountStr = (lakhs % 1 === 0 ? lakhs : lakhs.toFixed(1)) + ' Lakh';
        } else if (item.chitAmount >= 1000) {
            let k = item.chitAmount / 1000;
            schemeAmountStr = (k % 1 === 0 ? k : k.toFixed(1)) + 'K';
        } else {
            schemeAmountStr = item.chitAmount.toString();
        }
        const schemeText = `${schemeAmountStr} / ${item.duration}M`;
        
        let newCustomerBadgeHtml = '';
        if (item.customerType === 'New') {
            newCustomerBadgeHtml = `<span style="background-color: #d9b327; color: #fff; font-size: 9px; padding: 2px 4px; border-radius: 4px; margin-left: 6px; font-weight: 800;">NEW</span>`;
        }
        
        const groupNameParts = item.groupName.split('-');
        let groupNameHtml = item.groupName;
        if (groupNameParts.length === 2) {
            const start = groupNameParts[0].trim();
            const end = groupNameParts[1].trim();
            groupNameHtml = `<span style="color: var(--green-dark); font-weight: 800;">${start}</span>-<span style="color: var(--red-dark); font-weight: 800;">${end}</span>`;
        }
        
        tableRowsHtml += `
            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 6px; color: #334155; font-size: 12px; font-weight: 700; text-align: center; border-right: 1px solid #e2e8f0;">${index + 1}</td>
                <td style="padding: 12px 6px; color: #0f172a; font-weight: 800; font-size: 12px; text-transform: uppercase; border-right: 1px solid #e2e8f0;">${item.name}${newCustomerBadgeHtml}</td>
                <td style="padding: 12px 6px; color: #64748b; font-size: 11px; font-weight: 600; text-align: center; border-right: 1px solid #e2e8f0;">${groupNameHtml}</td>
                <td style="padding: 12px 6px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <span style="border: 1px solid #e2e8f0; background: #ffffff; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #1e293b;">${schemeText}</span>
                </td>
                <td style="padding: 12px 6px; text-align: center; font-weight: 800; font-size: 14px; color: #d9b327; border-right: 1px solid #e2e8f0;">${item.relativeMonthNum}</td>
                <td style="padding: 12px 6px; text-align: left; color: ${dueColor}; font-weight: 800; font-size: 13px; border-right: 1px solid #e2e8f0;">${dueAmountText}</td>
                <td style="padding: 12px 6px; text-align: left; color: ${paidColor}; font-weight: 800; font-size: 13px; border-right: 1px solid #e2e8f0;">${paidAmountText}</td>
                <td style="padding: 12px 6px; text-align: center; border-right: 1px solid #e2e8f0;">${paidDateHtml}</td>
                <td style="padding: 12px 6px; text-align: center; border-right: 1px solid #e2e8f0;">${markHtml}</td>
                <td style="padding: 12px 6px; text-align: center;">${chitTakenHtml}</td>
            </tr>
        `;
    });

    if(tableRowsHtml === '') {
        tableRowsHtml = '<tr><td colspan="10" style="padding: 30px; text-align: center; color: #64748b; font-weight: 600;">No members have taken chit in the applicable groups</td></tr>';
    }

    document.getElementById('chit-pdf-table-container').innerHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 2px solid #111827; background: white; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <thead>
                <tr style="background-color: #d9b327;">
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">S.No</th>
                    <th style="padding: 12px 6px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">Name</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">Chit Group</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">Scheme</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">📅</th>
                    <th style="padding: 12px 6px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">Due Amount</th>
                    <th style="padding: 12px 6px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">Paid Amount</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">Paid Date</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase;">Mark</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase;">Chit Taken</th>
                </tr>
            </thead>
            <tbody>

                ${tableRowsHtml}
            </tbody>
        </table>
    `;

    const dateObj = new Date(selYear, selMonth - 1, 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    
    document.getElementById('chit-pdf-month-name').textContent = `${monthName} ${selYear}`;
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mmGen = String(now.getMonth() + 1).padStart(2, '0');
    const yyyyGen = now.getFullYear();
    document.getElementById('chit-pdf-gen-date').textContent = `Generated: ${dd}/${mmGen}/${yyyyGen} ${now.toLocaleTimeString()}`;
    
    document.getElementById('chit-pdf-total-members').textContent = takenMembers.length;
    document.getElementById('chit-pdf-total-amount').textContent = `₹${formatNumberIndian(totalPayoutAmount)}`;

    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    const opt = {
        margin:       [10, 5],
        filename:     `Chit_Taken_Report_${monthName}_${selYear}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    const container = document.getElementById('chit-taken-pdf-template-container');
    const htmlContent = container.outerHTML.replace('display: none;', 'display: block;');

    if (mode === 'download') {
        html2pdf().set(opt).from(htmlContent).save().then(() => {
            if (overlay) overlay.style.display = 'none';
            if(typeof showNotification === 'function') showNotification('Chit Taken Report Downloaded!', 'success');
        }).catch(err => {
            console.error(err);
            if (overlay) overlay.style.display = 'none';
            if(typeof showNotification === 'function') showNotification('Error generating PDF', 'error');
        });
    } else if (mode === 'share') {
        html2pdf().set(opt).from(htmlContent).outputPdf('blob').then(async (blob) => {
            if (overlay) overlay.style.display = 'none';
            
            const file = new File([blob], opt.filename, { type: 'application/pdf' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: opt.filename,
                        text: 'Here is the Chit Taken Report',
                        files: [file]
                    });
                    if(typeof showNotification === 'function') showNotification('Report shared successfully!', 'success');
                } catch (error) {
                    console.log('Error sharing', error);
                }
            } else {
                if(typeof showNotification === 'function') showNotification('Web Share API not supported in this browser', 'error');
            }
        }).catch(err => {
            console.error(err);
            if (overlay) overlay.style.display = 'none';
            if(typeof showNotification === 'function') showNotification('Error generating PDF', 'error');
        });
    }
}

// ==========================================
// SIDEBAR, CALCULATOR & NOTEPAD
// ==========================================
function initSidebar() {
    const btnToggle = document.getElementById('btn-sidebar-toggle');
    const btnClose = document.getElementById('btn-sidebar-close');
    const menu = document.getElementById('sidebar-menu');
    const overlay = document.getElementById('sidebar-overlay');
    
    function openSidebar() {
        if(menu) menu.classList.add('show');
        if(overlay) overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
        if(menu) menu.classList.remove('show');
        if(overlay) overlay.classList.remove('show');
        document.body.style.overflow = '';
    }

    if(btnToggle) btnToggle.addEventListener('click', openSidebar);
    if(btnClose) btnClose.addEventListener('click', closeSidebar);
    if(overlay) overlay.addEventListener('click', closeSidebar);

    // Sidebar Navigation Links
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.dataset.target;
            
            // Highlight active link
            sidebarLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Switch screen
            switchView(target);
            
            // Close sidebar
            closeSidebar();
        });
    });

    // Bottom Navigation & Desktop Sidebar Links
    const allNavItems = document.querySelectorAll('.bottom-nav-item, .sidebar-nav-item');
    allNavItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            if (target) {
                switchView(target);
            }
        });
    });


    // Calculator Modal Logic
    const btnGlobalCalc = document.getElementById('btn-global-calc');
    const btnBottomCalc = document.getElementById('btn-bottom-calc');
    const calcModalOverlay = document.getElementById('calc-modal-overlay');
    const btnCloseCalcModal = document.getElementById('btn-close-calc-modal');

    // Dedicated Date Range Button
    const btnOpenDateRange = document.getElementById('btn-open-date-range');
    if (btnOpenDateRange) {
        btnOpenDateRange.addEventListener('click', () => {
            const modal = document.getElementById('custom-date-range-modal');
            if (modal) {
                modal.style.display = 'flex';
                if (window.lucide) window.lucide.createIcons();
                const fromInput = document.getElementById('date-range-from');
                const toInput = document.getElementById('date-range-to');
                if (fromInput && State.dashboardDateRangeFrom) fromInput.value = State.dashboardDateRangeFrom;
                if (toInput && State.dashboardDateRangeTo) toInput.value = State.dashboardDateRangeTo;
            }
        });
        // Sync button label and highlight state
        const syncDateRangeBtn = () => {
            const labelEl = document.getElementById('btn-date-range-label');
            if (labelEl) {
                if (State.dashboardDateRangeFrom && State.dashboardDateRangeTo) {
                    const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {day:'2-digit', month:'short'});
                    labelEl.textContent = `${fmtDate(State.dashboardDateRangeFrom)} – ${fmtDate(State.dashboardDateRangeTo)}`;
                    btnOpenDateRange.style.backgroundColor = 'var(--primary-glow)';
                    btnOpenDateRange.style.color = 'var(--primary)';
                    btnOpenDateRange.style.borderColor = 'var(--primary)';
                } else {
                    labelEl.textContent = 'Date Range';
                    btnOpenDateRange.style.backgroundColor = 'var(--bg-surface)';
                    btnOpenDateRange.style.color = 'var(--text-secondary)';
                    btnOpenDateRange.style.borderColor = 'var(--border)';
                }
            }
        };
        syncDateRangeBtn();
        window._syncDateRangeBtn = syncDateRangeBtn;
    }

    if (btnGlobalCalc) {
        btnGlobalCalc.addEventListener('click', () => {
            if (calcModalOverlay) calcModalOverlay.classList.add('show');
        });
    }
    
    if (btnBottomCalc) {
        btnBottomCalc.addEventListener('click', (e) => {
            e.preventDefault();
            if (calcModalOverlay) calcModalOverlay.classList.add('show');
        });
    }

    if (btnCloseCalcModal) {
        btnCloseCalcModal.addEventListener('click', () => {
            if (calcModalOverlay) calcModalOverlay.classList.remove('show');
        });
    }

    // Custom Date Range Modal Logic
    const dateRangeModal = document.getElementById('custom-date-range-modal');
    const btnCloseDateRange = document.getElementById('btn-close-date-range-modal');
    const btnApplyDateRange = document.getElementById('btn-apply-date-range');
    const btnClearDateRange = document.getElementById('btn-clear-date-range');
    const fromInput = document.getElementById('date-range-from');
    const toInput = document.getElementById('date-range-to');

    const closeDateRangeModal = () => {
        if (dateRangeModal) dateRangeModal.style.display = 'none';
    };

    if (btnCloseDateRange) btnCloseDateRange.addEventListener('click', closeDateRangeModal);
    if (dateRangeModal) {
        dateRangeModal.addEventListener('click', (e) => {
            if (e.target === dateRangeModal) closeDateRangeModal();
        });
    }

    if (btnApplyDateRange) {
        btnApplyDateRange.addEventListener('click', () => {
            const from = fromInput ? fromInput.value : '';
            const to = toInput ? toInput.value : '';
            if (!from || !to) {
                if (typeof showNotification === 'function') showNotification('Please select both From and To dates', 'error');
                return;
            }
            if (new Date(from) > new Date(to)) {
                if (typeof showNotification === 'function') showNotification('From date must be before To date', 'error');
                return;
            }
            State.dashboardDateRangeFrom = from;
            State.dashboardDateRangeTo = to;
            // Update the month dropdown button label
            const customMonthText = document.getElementById('custom-month-dropdown-text');
            if (customMonthText) {
                const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', {day:'2-digit', month:'short', year:'numeric'});
                customMonthText.textContent = `${fmtDate(from)} - ${fmtDate(to)}`;
            }
            closeDateRangeModal();
            populateDashboardMonthDropdown();
            if (window._syncDateRangeBtn) window._syncDateRangeBtn();
            const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
            renderDashboardMembersList(searchVal);
        });
    }

    if (btnClearDateRange) {
        btnClearDateRange.addEventListener('click', () => {
            State.dashboardDateRangeFrom = '';
            State.dashboardDateRangeTo = '';
            if (fromInput) fromInput.value = '';
            if (toInput) toInput.value = '';
            const customMonthText = document.getElementById('custom-month-dropdown-text');
            if (customMonthText) customMonthText.textContent = 'Current Month';
            closeDateRangeModal();
            populateDashboardMonthDropdown();
            if (window._syncDateRangeBtn) window._syncDateRangeBtn();
            const searchVal = document.getElementById('dashboard-member-search')?.value.toLowerCase().trim() || '';
            renderDashboardMembersList(searchVal);
        });
    }

    const btnResetDash = document.getElementById('btn-reset-dashboard-filters');
    if (btnResetDash) {
        btnResetDash.addEventListener('click', () => {
            const icon = btnResetDash.querySelector('i');
            if (icon) {
                icon.style.transform = 'rotate(-180deg)';
                setTimeout(() => icon.style.transform = 'rotate(0deg)', 300);
            }
            const searchInput = document.getElementById('dashboard-member-search');
            if (searchInput) searchInput.value = '';
            State.dashboardFilter = 'all';
            const tagSelect = document.getElementById('dashboard-tag-filter');
            if (tagSelect) tagSelect.value = 'all';
            const selectedTextEl = document.getElementById('filter-dropdown-selected-text');
            if (selectedTextEl) selectedTextEl.textContent = 'All';
            State.dashboardFilterDate = '';
            const dSelect = document.getElementById('dashboard-date-filter');
            if (dSelect) dSelect.value = '';
            State.dashboardDateRangeFrom = '';
            State.dashboardDateRangeTo = '';
            if (window._syncDateRangeBtn) window._syncDateRangeBtn();
            State.dashboardSelectedMonth = 'current';
            const monthSelect = document.getElementById('dashboard-month-select');
            if (monthSelect) monthSelect.value = 'current';
            const customMonthText = document.getElementById('custom-month-dropdown-text');
            if (customMonthText) customMonthText.textContent = 'Current Month';
            populateDashboardMonthDropdown();
            renderDashboardMembersList();
        });
    }

    // Calculator Logic
    const calcDisplay = document.getElementById('calc-display');
    const calcHistory = document.getElementById('calc-history');
    const calcBtns = document.querySelectorAll('.calc-btn-prm');
    
    let currentInput = '0';
    let previousInput = '';
    let operation = null;
    let shouldResetDisplay = false;

    function updateCalcDisplay() {
        calcDisplay.value = currentInput;
    }

    function handleNum(numStr) {
        if (currentInput === '0' || shouldResetDisplay) {
            currentInput = numStr;
            shouldResetDisplay = false;
        } else {
            currentInput += numStr;
        }
        updateCalcDisplay();
    }

    function calculate() {
        if (operation === null || shouldResetDisplay) return;
        const prev = parseFloat(previousInput);
        const current = parseFloat(currentInput);
        if (isNaN(prev) || isNaN(current)) return;

        let result;
        switch (operation) {
            case 'add': result = prev + current; break;
            case 'subtract': result = prev - current; break;
            case 'multiply': result = prev * current; break;
            case 'divide': result = prev / current; break;
            default: return;
        }
        
        // Remove trailing zeroes
        currentInput = parseFloat(result.toFixed(8)).toString();
        operation = null;
        previousInput = '';
        calcHistory.textContent = '';
        shouldResetDisplay = true;
        updateCalcDisplay();
    }

    calcBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const num = btn.dataset.num;
            const action = btn.dataset.action;

            if (num !== undefined) {
                if (num === '.' && currentInput.includes('.')) return;
                handleNum(num);
            } else if (action !== undefined) {
                switch (action) {
                    case 'clear':
                        currentInput = '0';
                        previousInput = '';
                        operation = null;
                        calcHistory.textContent = '';
                        updateCalcDisplay();
                        break;
                    case 'backspace':
                        if (currentInput.length === 1 || (currentInput.length === 2 && currentInput.startsWith('-'))) {
                            currentInput = '0';
                        } else {
                            currentInput = currentInput.slice(0, -1);
                        }
                        updateCalcDisplay();
                        break;
                    case 'percent':
                        currentInput = (parseFloat(currentInput) / 100).toString();
                        updateCalcDisplay();
                        break;
                    case 'calculate':
                        calculate();
                        break;
                    default:
                        // Operators
                        if (operation !== null && !shouldResetDisplay) calculate();
                        operation = action;
                        previousInput = currentInput;
                        shouldResetDisplay = true;
                        
                        let opSymbol = '';
                        if(action === 'add') opSymbol = '+';
                        if(action === 'subtract') opSymbol = '-';
                        if(action === 'multiply') opSymbol = '×';
                        if(action === 'divide') opSymbol = '÷';
                        
                        calcHistory.textContent = `${previousInput} ${opSymbol}`;
                        break;
                }
            }
        });
    });

    // --- Notepad Logic ---
    const notesListView = document.getElementById('notes-list-view');
    const noteEditorView = document.getElementById('note-editor-view');
    const btnAddNote = document.getElementById('btn-notepad-add');
    const btnBackNotes = document.getElementById('btn-back-notes');
    const notesGrid = document.getElementById('notes-grid');
    const btnDeleteNote = document.getElementById('btn-notepad-delete');
    const notepadTitle = document.getElementById('notepad-title');
    const notepadTextarea = document.getElementById('notepad-textarea');
    const notepadStatus = document.getElementById('notepad-status');
    const notepadDateDisplay = document.getElementById('notepad-date-display');
    const notepadColorPicker = document.getElementById('notepad-color-picker');

    let currentNotes = [];
    let activeNoteId = null;
    let saveTimeout = null;

    // Load initial notes — localStorage is PRIMARY source of truth.
    // Cloud data is only used as a one-time seed when localStorage has nothing.
    function loadNotes() {
        // Always try localStorage first
        const localRaw = localStorage.getItem('pms_workspace_notepad');

        if (localRaw) {
            try {
                const parsed = JSON.parse(localRaw);
                if (Array.isArray(parsed)) {
                    currentNotes = parsed;
                    renderNotesList();
                    return; // done — localStorage wins
                }
            } catch (e) {
                console.warn('notepad localStorage parse error, falling back to cloud', e);
            }
        }

        // Only reach here if localStorage is empty/corrupt — try cloud as one-time seed
        const cloudRaw = window.AuthState?.currentUser?.user_metadata?.notepad_content;
        if (cloudRaw) {
            try {
                const parsed = JSON.parse(cloudRaw);
                if (Array.isArray(parsed)) {
                    currentNotes = parsed;
                    // Immediately persist cloud seed into localStorage so future loads are fast
                    localStorage.setItem('pms_workspace_notepad', cloudRaw);
                }
            } catch (e) {
                console.warn('notepad cloud parse error', e);
            }
        }

        renderNotesList();
    }

    // Vivid palette for auto-assigned note colours
    const NOTE_PALETTE = [
        '#4f46e5', // indigo
        '#0891b2', // cyan
        '#059669', // emerald
        '#d97706', // amber
        '#dc2626', // red
        '#7c3aed', // violet
        '#db2777', // pink
        '#0284c7', // sky
        '#16a34a', // green
        '#ea580c', // orange
    ];

    let searchQuery = '';

    function renderNotesList() {
        notesGrid.innerHTML = '';
        const countLabel = document.getElementById('notes-count-label');
        const emptyState = document.getElementById('notes-empty-state');

        const filtered = searchQuery
            ? currentNotes.filter(n =>
                (n.title || '').toLowerCase().includes(searchQuery) ||
                (n.content || '').toLowerCase().includes(searchQuery)
            )
            : currentNotes;

        if (countLabel) countLabel.textContent = `${currentNotes.length} note${currentNotes.length !== 1 ? 's' : ''}`;

        if (emptyState) emptyState.style.display = filtered.length === 0 ? 'flex' : 'none';

        filtered.forEach((note, idx) => {
            const card = document.createElement('div');
            card.className = 'note-card-prm';

            // Use saved color or auto-assign from palette
            const bgColor = note.color && note.color !== '#ffffff' && note.color !== '#1e1e2e'
                ? note.color
                : NOTE_PALETTE[idx % NOTE_PALETTE.length];
            card.style.setProperty('--note-color', bgColor);

            const titleEl = document.createElement('h4');
            titleEl.className = 'note-card-title';
            titleEl.textContent = note.title || 'Untitled Note';

            const snippetEl = document.createElement('p');
            snippetEl.className = 'note-card-preview';
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = note.content || '';
            snippetEl.textContent = tempDiv.textContent || 'No content yet...';
            
            const footerEl = document.createElement('div');
            footerEl.className = 'note-card-footer';

            const dateEl = document.createElement('span');
            dateEl.className = 'note-card-date';
            const d = new Date(note.date);
            dateEl.textContent = d.toLocaleDateString('en-IN', {day:'2-digit', month:'short'});
            
            footerEl.appendChild(dateEl);

            card.appendChild(titleEl);
            card.appendChild(snippetEl);
            card.appendChild(footerEl);

            card.addEventListener('click', () => openNoteEditor(note.id));
            notesGrid.appendChild(card);
        });

        // Re-init Lucide icons inside new cards
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function openNoteEditor(id) {
        activeNoteId = id;
        const note = currentNotes.find(n => n.id === id);

        if (note) {
            notepadTitle.value = note.title || '';
            notepadTextarea.innerHTML = note.content || '';
            notepadColorPicker.value = note.color || '#1e1e2e';

            const editorBg = (note.color && note.color !== '#ffffff') ? note.color : null;
            if (editorBg) {
                noteEditorView.style.setProperty('--note-editor-accent', editorBg);
            }

            const d = new Date(note.date);
            notepadDateDisplay.textContent = `Edited ${d.toLocaleDateString('en-IN', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}`;
        }

        notepadStatus.textContent = '';
        notesListView.style.display = 'none';
        noteEditorView.style.display = 'flex';
        // Focus at end of content
        setTimeout(() => { notepadTitle.focus(); }, 100);
    }

    function closeNoteEditor() {
        activeNoteId = null;
        noteEditorView.style.display = 'none';
        notesListView.style.display = 'flex';
        
        // Sort and re-render
        currentNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderNotesList();
    }

    function saveNotesState() {
        const payload = JSON.stringify(currentNotes);

        // IMMEDIATELY persist to localStorage — this is the source of truth
        localStorage.setItem('pms_workspace_notepad', payload);

        // Show saving indicator (debounced — purely cosmetic)
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            notepadStatus.textContent = 'Saving...';
            setTimeout(() => {
                notepadStatus.textContent = '✓ Saved';
                setTimeout(() => {
                    if (notepadStatus.textContent.includes('Saved')) {
                        notepadStatus.textContent = '';
                    }
                }, 2000);
            }, 600);
        }, 300);

        // Background cloud sync 
        if (typeof saveState === 'function') {
            saveState().catch(err => console.warn('Cloud note sync failed:', err));
        }
    }

    function handleEditorInput() {
        if (!activeNoteId) return;
        const noteIndex = currentNotes.findIndex(n => n.id === activeNoteId);
        if (noteIndex > -1) {
            currentNotes[noteIndex].title = notepadTitle.value;
            currentNotes[noteIndex].content = notepadTextarea.innerHTML;
            currentNotes[noteIndex].color = notepadColorPicker.value;
            currentNotes[noteIndex].date = new Date().toISOString();
            
            const d = new Date();
            notepadDateDisplay.textContent = `Last edited: ${d.toLocaleDateString()} ${d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
            
            saveNotesState();
        }
    }

    // Event Listeners
    btnAddNote.addEventListener('click', () => {
        const palette = ['#4f46e5','#0891b2','#059669','#d97706','#7c3aed','#db2777','#dc2626','#0284c7'];
        const newNote = {
            id: 'note_' + Date.now() + '_' + Math.floor(Math.random()*1000),
            title: '',
            content: '',
            color: palette[Math.floor(Math.random() * palette.length)],
            date: new Date().toISOString()
        };
        currentNotes.push(newNote);
        saveNotesState();
        openNoteEditor(newNote.id);
    });

    btnBackNotes.addEventListener('click', closeNoteEditor);

    btnDeleteNote.addEventListener('click', () => {
        if (!activeNoteId) return;
        currentNotes = currentNotes.filter(n => n.id !== activeNoteId);
        saveNotesState();
        closeNoteEditor();
        if (typeof showToast === 'function') {
            showToast('Note deleted successfully', 'success');
        }
    });

    // Initialize Dashboard Filters (Groups List modal filters)
    const dashboardFilterBtns = document.querySelectorAll('.filter-pill');
    dashboardFilterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            dashboardFilterBtns.forEach(b => b.classList.remove('active'));
            const clicked = e.currentTarget;
            clicked.classList.add('active');
            State.dashboardFilter = clicked.getAttribute('data-filter');
            // Re-render dashboard list with current filter
            renderDashboardGroupsList();
        });
    });

    // Binding Sidebar Navigation
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetScreenId = e.currentTarget.getAttribute('data-target');
            if (targetScreenId) {
                switchView(targetScreenId);
                
                // If opening P&L screen, trigger render
                if (targetScreenId === 'screen-pnl') {
                    renderPnLDashboard();
                }
            }
        });
    });

    // Rich Text / Format Toolbar — supports both old .rt-btn and new .fmt-btn
    document.querySelectorAll('.rt-btn, .fmt-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const cmd = btn.getAttribute('data-cmd');
            document.execCommand(cmd, false, null);
            notepadTextarea.focus();
            handleEditorInput();
        });
    });

    // Search
    const searchInput = document.getElementById('notes-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value.toLowerCase().trim();
            renderNotesList();
        });
    }

    notepadTitle.addEventListener('input', handleEditorInput);
    notepadTextarea.addEventListener('input', handleEditorInput);
    if(notepadColorPicker) {
        notepadColorPicker.addEventListener('input', handleEditorInput);
    }

    // WhatsApp Share
    const btnShareWA = document.getElementById('btn-share-whatsapp');
    if (btnShareWA) {
        btnShareWA.addEventListener('click', () => {
            const title = notepadTitle.value.trim();
            // Get plain text from contenteditable
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = notepadTextarea.innerHTML;
            const body = tempDiv.innerText || tempDiv.textContent || '';

            if (!title && !body.trim()) {
                if (typeof showNotification === 'function') {
                    showNotification('Note is empty — nothing to share!', 'error');
                }
                return;
            }

            const message = title
                ? `*${title}*\n\n${body.trim()}`
                : body.trim();

            const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
            window.open(waUrl, '_blank');
        });
    }

    // Initial Load
    setTimeout(loadNotes, 500);
}

// Initialize on script load (delay to ensure DOM and auth are ready)
setTimeout(initSidebar, 1000);

