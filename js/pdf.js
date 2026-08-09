// --- PDF Generation Logic ---
let isHtml2PdfLoaded = false;

async function loadHtml2Pdf() {
    if (isHtml2PdfLoaded || (window.jspdf && window.html2canvas)) return true;
    return new Promise((resolve, reject) => {
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script2.onload = () => {
                isHtml2PdfLoaded = true;
                resolve(true);
            };
            script2.onerror = () => reject(new Error('Failed to load jsPDF'));
            document.body.appendChild(script2);
        };
        script1.onerror = () => reject(new Error('Failed to load html2canvas'));
        document.body.appendChild(script1);
    });
}

async function calculateDynamicRowsPerPage(monthTitle) {
    const testHtml = `
        <div id="pdf-dynamic-container" style="background: #ffffff; color: black; padding: 0; font-family: 'Inter', sans-serif;">
            <div style="padding: 20px 30px 10px 30px; display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <img src="logo-light.jpg" alt="Logo" style="width: 70px; height: 70px; border-radius: 12px; object-fit: cover;">
                    <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #111827; letter-spacing: -0.5px;">PMS</h1>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 26px; font-weight: 800; margin: 0; color: #d97706;">${monthTitle}</h2>
                </div>
            </div>
            <div style="height: 2px; background-color: #d97706; margin: 0 30px 10px 30px;"></div>
            <div style="padding: 0 30px 20px 30px; background: white;">
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; border: 1px solid #111827;">
                    <thead>
                        <tr style="background-color: #111827;">
                            <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Test</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr id="pdf-dynamic-row" style="background-color: #ffffff;">
                            <td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">Test Row Data</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.style.width = '1000px';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.innerHTML = testHtml;
    document.body.appendChild(wrapper);

    await new Promise(r => setTimeout(r, 50));

    const container = document.getElementById('pdf-dynamic-container');
    const row = document.getElementById('pdf-dynamic-row');
    
    if (!container || !row) {
        document.body.removeChild(wrapper);
        return 15; // fallback
    }

    const totalHeight = container.offsetHeight;
    const rowHeight = row.offsetHeight || 45; // fallback 45px
    
    // Static height is total minus one row
    const staticHeightPx = totalHeight - rowHeight;
    document.body.removeChild(wrapper);

    // html2canvas uses scale: 2 for high-res output
    const scaleFactor = 2;
    
    // Convert A4 height to pixels matching the scaled canvas output
    // Assuming 96 DPI: 1 mm = 3.779527559px
    const pxPerMm = (1000 / 190) * scaleFactor; // Using 1000px mapped to 190mm
    
    // Available height in mm (A4 height 210mm - 25mm footer reserved)
    const availableHeightMm = 297 - 25; 
    const availableHeightPx = availableHeightMm * pxPerMm;
    
    // Measure DOM elements and scale up to match canvas output
    const scaledStaticHeightPx = staticHeightPx * scaleFactor;
    const scaledRowHeightPx = rowHeight * scaleFactor;
    
    const maxContentPx = availableHeightPx - scaledStaticHeightPx;
    const maxRows = Math.floor(maxContentPx / scaledRowHeightPx);
    
    return maxRows > 0 ? maxRows : 1;
}
async function generatePdfReport() {
    const group = State.groups.find(g => g.id === State.selectedGroupId);
    if (!group) return;
    
    const monthNum = parseInt(document.getElementById('pdf-export-month-select').value);
    if (isNaN(monthNum)) return;
    
    // Close modal
    document.getElementById('pdf-export-modal-backdrop').classList.remove('active');
    
    // Prepare Data
    const members = State.members.filter(m => m.groupId === group.id).sort((a, b) => a.name.localeCompare(b.name));
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
        let chitAmountStr = '';
        let chitModeStr = '';
        for (let m = 1; m <= group.duration; m++) {
            if (member.payments[m] && member.payments[m].payoutClaimed) {
                hasTakenChit = true;
                const pVal = group.payouts && group.payouts[m] !== undefined ? group.payouts[m] : 0;
                chitAmountStr = `₹${formatNumberIndian(pVal)}`;
                chitModeStr = member.payments[m].paymentMode ? member.payments[m].paymentMode.substring(0,1).toUpperCase() : 'C';
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
        
    });
        
    const dateObj = new Date();
    const monthNameDisplay = dateObj.toLocaleString('default', { month: 'long' });
    const monthTitle = `${monthNameDisplay} ${dateObj.getFullYear()}`;
    
    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    
    // Dynamically calculate optimal rows per page based on current CSS/DOM
    const ROWS_PER_PAGE = await calculateDynamicRowsPerPage(monthTitle);
    let chunkPagesHtml = [];
    
    for (let i = 0; i < members.length; i += ROWS_PER_PAGE) {
        const chunk = members.slice(i, i + ROWS_PER_PAGE);
        let chunkRowsHtml = '';
        
        chunk.forEach((member, idx) => {
            const index = i + idx;
            const payment = member.payments[monthNum];
            const isPaid = payment && payment.paid;
            
            let datePaidText = '--';
            if (isPaid) {
                if (payment.customDate) {
                    const parts = payment.customDate.split('-');
                    if(parts.length === 3) {
                        datePaidText = `${parts[2]}/${parts[1]}/${parts[0]}`;
                    } else {
                        const dayNumber = parseInt(payment.customDate, 10);
                        const dDate = new Date();
                        datePaidText = `${String(dayNumber).padStart(2, '0')}/${String(dDate.getMonth()+1).padStart(2, '0')}/${dDate.getFullYear()}`;
                    }
                } else if (payment.paidAt) {
                    const d = new Date(payment.paidAt);
                    datePaidText = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                }
            }

            let memberHasTakenChit = false;
            let chitAmountStr = '';
            let chitModeStr = '';
            for (let j = 1; j <= group.duration; j++) {
                if (member.payments[j] && member.payments[j].payoutClaimed) {
                    memberHasTakenChit = true;
                    const payoutVal = group.payouts && group.payouts[j] !== undefined ? group.payouts[j] : 0;
                    chitAmountStr = `₹${formatNumberIndian(payoutVal)}`;
                    chitModeStr = member.payments[j].paymentMode ? member.payments[j].paymentMode.substring(0,1).toUpperCase() : 'C';
                    break;
                }
            }

            const schemeName = `${(group.chitAmount >= 100000 ? group.chitAmount/100000 + ' Lakh' : group.chitAmount/1000 + 'K')} / ${group.duration}M`;
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            let rowDueColor = !isPaid ? '#b91c1c' : 'transparent';
            let rowPaidColor = isPaid ? '#14532d' : 'transparent';
            let rowDueText = isPaid ? '' : `₹${formatNumberIndian(installmentVal)}`;
            let rowPaidText = !isPaid ? '' : `₹${formatNumberIndian(installmentVal)}`;
            
            const dateBox = datePaidText !== '--' 
                ? `<div style="border: 1px solid #3b82f6; color: #2563eb; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 11px; font-weight: 700;">${datePaidText}</div>`
                : ``;
                
            const chitPill = memberHasTakenChit
                ? `<span style="background-color: #f3e8ff; color: #6b21a8; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800;">${chitAmountStr} / ${chitModeStr}</span>`
                : ``;

            chunkRowsHtml += `
                <tr style="background-color: ${rowBg};">
                    <td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">${index + 1}</td>
                    <td style="padding: 10px 4px; color: #000000; font-weight: 900; font-size: 12px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">${member.name}</td>
                    <td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 800; text-align: left; border: 1px solid #475569;">${group.name}</td>
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">
                        <span style="border: 1px solid #94a3b8; background: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #111827;">${schemeName}</span>
                    </td>
                    <td style="padding: 10px 4px; color: #9a3412; font-size: 13px; font-weight: 900; text-align: center; border: 1px solid #475569;">${monthNum}</td>
                    <td style="padding: 10px 4px; text-align: right; color: ${rowDueColor}; font-weight: 900; font-size: 13px; border: 1px solid #475569;">${rowDueText}</td>
                    
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">${dateBox}</td>
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">${chitPill}</td>
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">
                        <div style="width: 24px; height: 24px; border: 2.5px solid #64748b; border-radius: 6px; margin: 0 auto;"></div>
                    </td>
                </tr>
            `;
        });
        
        let chunkPageHtml = `
                <div style="background: #ffffff; color: black; padding: 0; font-family: 'Inter', sans-serif;">
                    <div style="padding: 20px 30px 10px 30px; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <img src="logo-light.jpg" alt="Logo" style="width: 70px; height: 70px; border-radius: 12px; object-fit: cover;">
                            <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #111827; letter-spacing: -0.5px;">PMS</h1>
                        </div>
                        <div style="text-align: right;">
                            <h2 style="font-size: 26px; font-weight: 800; margin: 0; color: #d97706;">${monthTitle}</h2>
                        </div>
                    </div>
                    <div style="height: 2px; background-color: #d97706; margin: 0 30px 10px 30px;"></div>
                    <div style="padding: 0 30px 20px 30px; background: white;">
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; border: 1px solid #111827;">
                            <thead>
                                <tr style="background-color: #111827;">
                                    <th style="width: 4%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>
                                    <th style="width: 22%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>
                                    <th style="width: 23%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>
                                    <th style="width: 13%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>
                                    <th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Month</th>
                                    <th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>
                                    <th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount</th>
                                    <th style="width: 10%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>
                                    <th style="width: 8%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>
                                    <th style="width: 2%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${chunkRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            
            chunkPagesHtml.push(chunkPageHtml);
        }


    
    try {
        await loadHtml2Pdf();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const A4_WIDTH = 210;
        const A4_HEIGHT = 297;
        const totalPagesExpected = chunkPagesHtml.length || 1;

        for (let idx = 0; idx < chunkPagesHtml.length; idx++) {
            const wrapper = document.createElement('div');
            wrapper.style.width = '1000px';
            wrapper.style.position = 'absolute';
            wrapper.style.left = '-9999px';
            wrapper.style.top = '0';
            wrapper.innerHTML = chunkPagesHtml[idx];
            document.body.appendChild(wrapper);
            
            const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, logging: false });
            document.body.removeChild(wrapper);
            
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const imgProps = doc.getImageProperties(imgData);
            
            let pdfWidth = A4_WIDTH - 20; // 10mm margins
            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Constrain height to reserve 25mm for footer
            const maxPdfHeight = A4_HEIGHT - 20;
            if (pdfHeight > maxPdfHeight) {
                pdfWidth = (maxPdfHeight * pdfWidth) / pdfHeight;
                pdfHeight = maxPdfHeight;
            }
            const xOffset = (A4_WIDTH - pdfWidth) / 2;
            
            if (idx > 0) doc.addPage();
            
            doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(150);
            doc.text(`${idx + 1}`, A4_WIDTH / 2, 7, { align: 'center' });
        }
        
        doc.save(`${group.name.replace(/\s+/g, '_')}_Month_${monthNum}_Report.pdf`);
        
        if (overlay) overlay.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('PDF Report Generated Successfully!', 'success');
    } catch (error) {
        console.error(error);
        if (overlay) overlay.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('Error: ' + (error.message || error), 'error');
        throw error;
    }
}

async function generateGlobalPdfReport(mode = 'download') {
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
        const members = State.members.filter(m => m.groupId === group.id).sort((a, b) => a.name.localeCompare(b.name));
        
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

    const dateObj = new Date(selYear, selMonth - 1, 1);
    const monthName = dateObj.toLocaleString('default', { month: 'long' });
    const monthTitle = `${monthName} ${selYear}`;

    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    
    const ROWS_PER_PAGE = await calculateDynamicRowsPerPage(monthTitle);
    let chunkPagesHtml = [];
    
    for (let i = 0; i < allMembersFlattened.length; i += ROWS_PER_PAGE) {
        const chunk = allMembersFlattened.slice(i, i + ROWS_PER_PAGE);
        let chunkRowsHtml = '';
        
        chunk.forEach((row, idx) => {
            const index = i + idx;
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            let rowDueColor = row.dueAmount > 0 ? '#b91c1c' : 'transparent';
            let rowPaidColor = row.paidAmount > 0 ? '#14532d' : 'transparent';
            let rowDueText = row.dueAmount === 0 ? '' : `₹${formatNumberIndian(row.dueAmount)}`;
            let rowPaidText = row.paidAmount === 0 ? '' : `₹${formatNumberIndian(row.paidAmount)}`;
            
            const dateBox = row.paidDate !== '--' 
                ? `<div style="border: 1px solid #3b82f6; color: #2563eb; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 11px; font-weight: 700;">${row.paidDate}</div>`
                : ``;
                
            const chitPill = row.hasTakenChit
                ? `<span style="background-color: #f3e8ff; color: #6b21a8; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800;">${row.chitTakenDisplay}</span>`
                : ``;

            chunkRowsHtml += `
                <tr style="background-color: ${rowBg};">
                    <td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">${index + 1}</td>
                    <td style="padding: 10px 4px; color: #000000; font-weight: 900; font-size: 12px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">${row.name}</td>
                    <td style="padding: 10px 4px; color: #111827; font-size: 11.5px; font-weight: 800; text-align: left; border: 1px solid #475569;">${row.groupName}</td>
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">
                        <span style="border: 1px solid #94a3b8; background: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #111827;">${row.scheme}</span>
                    </td>
                    <td style="padding: 10px 4px; color: #9a3412; font-size: 13px; font-weight: 900; text-align: center; border: 1px solid #475569;">${row.monthNo}</td>
                    <td style="padding: 10px 4px; text-align: right; color: ${rowDueColor}; font-weight: 900; font-size: 13px; border: 1px solid #475569;">${rowDueText}</td>
                    
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">${dateBox}</td>
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">${chitPill}</td>
                    <td style="padding: 10px 4px; text-align: center; border: 1px solid #475569;">
                        <div style="width: 24px; height: 24px; border: 2.5px solid #64748b; border-radius: 6px; margin: 0 auto;"></div>
                    </td>
                </tr>
            `;
        });
        
        let chunkPageHtml = `
                <div style="background: #ffffff; color: black; padding: 0; font-family: 'Inter', sans-serif;">
                    <div style="padding: 20px 30px 10px 30px; display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <img src="logo-light.jpg" alt="Logo" style="width: 70px; height: 70px; border-radius: 12px; object-fit: cover;">
                            <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #111827; letter-spacing: -0.5px;">PMS</h1>
                        </div>
                        <div style="text-align: right;">
                            <h2 style="font-size: 26px; font-weight: 800; margin: 0; color: #d97706;">${monthTitle}</h2>
                        </div>
                    </div>
                    <div style="height: 2px; background-color: #d97706; margin: 0 30px 10px 30px;"></div>
                    <div style="padding: 0 30px 20px 30px; background: white;">
                        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11.5px; border: 1px solid #111827;">
                            <thead>
                                <tr style="background-color: #111827;">
                                    <th style="width: 4%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>
                                    <th style="width: 22%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>
                                    <th style="width: 23%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>
                                    <th style="width: 13%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>
                                    <th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                            Month
                                        </div>
                                    </th>
                                    <th style="width: 12%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>
                                    <th style="width: 10%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>
                                    <th style="width: 8%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>
                                    <th style="width: 2%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${chunkRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
            chunkPagesHtml.push(chunkPageHtml);
        }


    
    try {
        await loadHtml2Pdf();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const A4_WIDTH = 210;
        const A4_HEIGHT = 297;
        const totalPagesExpected = chunkPagesHtml.length || 1;
        const filename = `Global_Report_${monthName}_${selYear}.pdf`;

        for (let idx = 0; idx < chunkPagesHtml.length; idx++) {
            const wrapper = document.createElement('div');
            wrapper.style.width = '1000px';
            wrapper.style.position = 'absolute';
            wrapper.style.left = '-9999px';
            wrapper.style.top = '0';
            wrapper.innerHTML = chunkPagesHtml[idx];
            document.body.appendChild(wrapper);
            
            const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, logging: false });
            document.body.removeChild(wrapper);
            
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const imgProps = doc.getImageProperties(imgData);
            
            let pdfWidth = A4_WIDTH - 20; // 10mm margins
            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Constrain height to reserve 25mm for footer
            const maxPdfHeight = A4_HEIGHT - 20;
            if (pdfHeight > maxPdfHeight) {
                pdfWidth = (maxPdfHeight * pdfWidth) / pdfHeight;
                pdfHeight = maxPdfHeight;
            }
            const xOffset = (A4_WIDTH - pdfWidth) / 2;
            
            if (idx > 0) doc.addPage();
            
            doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(150);
            doc.text(`${idx + 1}`, A4_WIDTH / 2, 7, { align: 'center' });
        }
        
        if (mode === 'download') {
            doc.save(filename);
        } else if (mode === 'share') {
            const blob = doc.output('blob');
            const file = new File([blob], filename, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: filename,
                        text: 'Here is the Global Dashboard Report',
                        files: [file]
                    });
                } catch (error) {
                    if (error.name !== 'AbortError') throw error;
                }
            } else {
                if (typeof showNotification === 'function') showNotification('Web Share not supported on this device/browser', 'error');
                doc.save(filename);
            }
        }
        
        if (overlay) overlay.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('PDF Report Processed Successfully!', 'success');
    } catch (error) {
        console.error(error);
        if (overlay) overlay.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('Error: ' + (error.message || error), 'error');
        throw error;
    }
}



/* --- PWA Install Logic --- */
let deferredPrompt;

// Register Service Worker with automatic update check & cache flush
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            reg.update();
        }).catch(err => {
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
                <td style="padding: 10px 4px; color: #334155; font-size: 11.5px; font-weight: 700; text-align: center; border: 1px solid #d1d5db;">${i}</td>
                <td style="padding: 10px 4px; color: #0f172a; font-weight: 800; font-size: 11.5px; border: 1px solid #d1d5db;">${monthNames[i-1]}</td>
                <td style="padding: 10px 4px; text-align: right; color: #334155; font-weight: 800; font-size: 11.5px; border: 1px solid #d1d5db;">₹${formatNumberIndian(d.target)}</td>
                <td style="padding: 10px 4px; text-align: right; color: #16a34a; font-weight: 800; font-size: 11.5px; border: 1px solid #d1d5db;">₹${formatNumberIndian(d.collected)}</td>
                <td style="padding: 10px 4px; text-align: right; color: #dc2626; font-weight: 800; font-size: 11.5px; border: 1px solid #d1d5db;">₹${formatNumberIndian(d.pending)}</td>
                <td style="padding: 10px 4px; text-align: center; color: #d97706; font-weight: 800; font-size: 11.5px; border: 1px solid #d1d5db;">${colRate}%</td>
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
                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Month No.</th>
                    <th style="padding: 12px 4px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Month Name</th>
                    <th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Target Amount</th>
                    <th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Collected Amount</th>
                    <th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Pending Amount</th>
                    <th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #d1d5db;">Collection %</th>
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
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
            markHtml = `<span style="background: #ecfdf5; color: #10b981; border: 1px solid #10b981; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">âœ“ PAID${methodSuffix}</span>`;
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
                <td style="padding: 12px 6px; color: #334155; font-size: 11px; font-weight: 700; text-align: center; border-right: 1px solid #e2e8f0;">${index + 1}</td>
                <td style="padding: 12px 6px; color: #0f172a; font-weight: 800; font-size: 11px; text-transform: uppercase; word-break: break-word; white-space: normal; border-right: 1px solid #e2e8f0;">${item.name}${newCustomerBadgeHtml}</td>
                <td style="padding: 12px 6px; color: #64748b; font-size: 11px; font-weight: 600; text-align: center; border-right: 1px solid #e2e8f0;">${groupNameHtml}</td>
                <td style="padding: 12px 6px; text-align: center; border-right: 1px solid #e2e8f0;">
                    <span style="border: 1px solid #e2e8f0; background: #ffffff; padding: 3px 6px; border-radius: 4px; font-size: 11px; font-weight: 700; color: #1e293b;">${schemeText}</span>
                </td>
                <td style="padding: 12px 6px; text-align: center; font-weight: 800; font-size: 11px; color: #d9b327; border-right: 1px solid #e2e8f0;">${item.relativeMonthNum}</td>
                <td style="padding: 12px 6px; text-align: left; color: ${dueColor}; font-weight: 800; font-size: 11.5px; border-right: 1px solid #e2e8f0;">${dueAmountText}</td>
                <td style="padding: 12px 6px; text-align: left; color: ${paidColor}; font-weight: 800; font-size: 11.5px; border-right: 1px solid #e2e8f0;">${paidAmountText}</td>
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
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">S.No</th>
                    <th style="padding: 12px 6px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">Name</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">Chit Group</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">Scheme</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">ðŸ“…</th>
                    <th style="padding: 12px 6px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">Due Amount</th>
                    <th style="padding: 12px 6px; text-align: left; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">Paid Amount</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">Paid Date</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border-right: 1px solid #b7951d; text-transform: uppercase; word-break: break-word; white-space: normal;">Mark</th>
                    <th style="padding: 12px 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; text-transform: uppercase; word-break: break-word; white-space: normal;">Chit Taken</th>
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
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
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
                    labelEl.textContent = `${fmtDate(State.dashboardDateRangeFrom)} â€“ ${fmtDate(State.dashboardDateRangeTo)}`;
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
                        if(action === 'multiply') opSymbol = 'Ã—';
                        if(action === 'divide') opSymbol = 'Ã·';
                        
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

    // Load initial notes â€” localStorage is PRIMARY source of truth.
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
                    return; // done â€” localStorage wins
                }
            } catch (e) {
                console.warn('notepad localStorage parse error, falling back to cloud', e);
            }
        }

        // Only reach here if localStorage is empty/corrupt â€” try cloud as one-time seed
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

        // IMMEDIATELY persist to localStorage â€” this is the source of truth
        localStorage.setItem('pms_workspace_notepad', payload);

        // Show saving indicator (debounced â€” purely cosmetic)
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            notepadStatus.textContent = 'Saving...';
            setTimeout(() => {
                notepadStatus.textContent = 'âœ“ Saved';
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

    // Rich Text / Format Toolbar â€” supports both old .rt-btn and new .fmt-btn
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
                    showNotification('Note is empty â€” nothing to share!', 'error');
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




