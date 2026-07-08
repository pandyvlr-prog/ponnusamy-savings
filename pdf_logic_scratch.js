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
    container.style.display = 'block';

    const opt = {
        margin:       [10, 5],
        filename:     `Yearly_Report_${selYear}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        container.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if(typeof showNotification === 'function') showNotification('Yearly Report Downloaded!', 'success');
    }).catch(err => {
        console.error(err);
        container.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if(typeof showNotification === 'function') showNotification('Error generating PDF', 'error');
    });
}

function generateChitTakenPdfReport() {
    const selMonthKey = document.getElementById('chit-pdf-export-month-select').value;
    if (!selMonthKey) {
        if(typeof showNotification === 'function') showNotification('Please select a month', 'error');
        return;
    }
    
    const [selYear, selMonth] = selMonthKey.split('-');
    
    document.getElementById('global-pdf-export-modal-backdrop').classList.remove('active');

    let takenMembers = [];
    let totalPayoutAmount = 0;

    State.groups.forEach(group => {
        let members = group.members || [];
        const groupStartMonth = group.startMonth !== undefined ? parseInt(group.startMonth) : new Date(group.createdAt).getMonth();
        const groupStartYear = group.startYear !== undefined ? parseInt(group.startYear) : new Date(group.createdAt).getFullYear();
        
        members.forEach(member => {
            const hasTaken = typeof member.chitTakenStatus === 'boolean' ? member.chitTakenStatus : (member.chitTakenStatus === 'true');
            if(hasTaken && member.chitTakenDate) {
                // Check if they took it in the selected month/year
                const td = new Date(member.chitTakenDate);
                if(td.getFullYear() == selYear && (td.getMonth() + 1) == selMonth) {
                    takenMembers.push({
                        name: member.name,
                        groupName: group.name,
                        scheme: group.chitAmount >= 100000 ? `${group.chitAmount/100000} Lakh / ${group.duration}M` : `₹${group.chitAmount} / ${group.duration}M`,
                        takenDate: td.toLocaleDateString(),
                        amount: group.chitAmount
                    });
                    totalPayoutAmount += group.chitAmount;
                }
            }
        });
    });

    let tableRowsHtml = '';
    takenMembers.forEach((row, index) => {
        const rowBg = index % 2 === 0 ? '#f8fafc' : '#ffffff';
        tableRowsHtml += `
            <tr style="background-color: ${rowBg};">
                <td style="padding: 12px 10px; color: #334155; font-size: 13px; font-weight: 700; text-align: center; border: 1px solid #d1d5db;">${index + 1}</td>
                <td style="padding: 12px 10px; color: #0f172a; font-weight: 800; font-size: 13px; text-transform: uppercase; border: 1px solid #d1d5db;">${row.name}</td>
                <td style="padding: 12px 10px; color: #64748b; font-size: 13px; font-weight: 600; border: 1px solid #d1d5db;">${row.groupName}</td>
                <td style="padding: 12px 10px; text-align: center; border: 1px solid #d1d5db;">
                    <span style="border: 1px solid #e2e8f0; background: #ffffff; padding: 4px 8px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #1e293b;">${row.scheme}</span>
                </td>
                <td style="padding: 12px 10px; color: #d97706; font-size: 13px; font-weight: 700; text-align: center; border: 1px solid #d1d5db;">${row.takenDate}</td>
                <td style="padding: 12px 10px; text-align: right; color: #16a34a; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">₹${formatNumberIndian(row.amount)}</td>
            </tr>
        `;
    });

    if(tableRowsHtml === '') {
        tableRowsHtml = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #64748b;">No members took chit in this month</td></tr>';
    }

    document.getElementById('chit-pdf-table-container').innerHTML = `
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #d1d5db; background: white;">
            <thead>
                <tr style="background-color: #111827;">
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">S.No</th>
                    <th style="padding: 15px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Name</th>
                    <th style="padding: 15px 10px; text-align: left; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Chit Group</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Scheme</th>
                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Taken Date</th>
                    <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #d1d5db;">Payout Amount</th>
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
    document.getElementById('chit-pdf-gen-date').textContent = `Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    
    document.getElementById('chit-pdf-total-members').textContent = takenMembers.length;
    document.getElementById('chit-pdf-total-amount').textContent = `₹${formatNumberIndian(totalPayoutAmount)}`;

    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    const container = document.getElementById('chit-taken-pdf-template-container');
    container.style.display = 'block';

    const opt = {
        margin:       [10, 5],
        filename:     `Chit_Taken_Report_${monthName}_${selYear}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        container.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if(typeof showNotification === 'function') showNotification('Chit Taken Report Downloaded!', 'success');
    }).catch(err => {
        console.error(err);
        container.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        if(typeof showNotification === 'function') showNotification('Error generating PDF', 'error');
    });
}
