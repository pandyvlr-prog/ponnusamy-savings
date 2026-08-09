const fs = require('fs');

const file = 'c:/Users/ARAVIND/OneDrive/Desktop/ponnusamy savings/js/pdf.js';
let content = fs.readFileSync(file, 'utf8');

// Patch generatePdfReport
const groupReportStart = content.indexOf(`    const tbody = document.getElementById('pdf-table-body');`);
const groupReportEnd = content.indexOf(`    const opt = {`, groupReportStart);

let newGroupLogic = `
    const dateObj = new Date();
    const monthNameDisplay = dateObj.toLocaleString('default', { month: 'long' });
    const monthTitle = \`\${monthNameDisplay} \${dateObj.getFullYear()}\`;
    
    // We will chunk members to avoid page break issues
    const ROWS_PER_PAGE = 12;
    let pagesHtml = '';
    
    for (let i = 0; i < members.length; i += ROWS_PER_PAGE) {
        const chunk = members.slice(i, i + ROWS_PER_PAGE);
        let chunkRowsHtml = '';
        
        chunk.forEach((member, idx) => {
            const index = i + idx;
            // -- Extracted logic from original loop --
            const payment = member.payments[relMonthNum];
            const isPaid = payment && payment.paid;
            let datePaidText = '--';
            if (isPaid) {
                if (payment.customDate) {
                    const parts = payment.customDate.split('-');
                    if(parts.length === 3) {
                        datePaidText = \`\${parts[2]}/\${parts[1]}/\${parts[0]}\`;
                    } else {
                        const dayNumber = parseInt(payment.customDate, 10);
                        const dDate = new Date();
                        datePaidText = \`\${String(dayNumber).padStart(2, '0')}/\${String(dDate.getMonth()+1).padStart(2, '0')}/\${dDate.getFullYear()}\`;
                    }
                } else if (payment.paidAt) {
                    const d = new Date(payment.paidAt);
                    datePaidText = \`\${String(d.getDate()).padStart(2, '0')}/\${String(d.getMonth() + 1).padStart(2, '0')}/\${d.getFullYear()}\`;
                }
            }

            let hasTakenChit = false;
            let chitAmountStr = '';
            let chitModeStr = '';
            for (let j = 1; j <= group.duration; j++) {
                if (member.payments[j] && member.payments[j].payoutClaimed) {
                    hasTakenChit = true;
                    const payoutVal = group.payouts && group.payouts[j] !== undefined ? group.payouts[j] : 0;
                    chitAmountStr = \`₹\${formatNumberIndian(payoutVal)}\`;
                    chitModeStr = member.payments[j].paymentMode ? member.payments[j].paymentMode.substring(0,1).toUpperCase() : 'C';
                    break;
                }
            }

            const schemeName = \`\${(group.chitAmount >= 100000 ? group.chitAmount/100000 + ' Lakh' : group.chitAmount/1000 + 'K')} / \${group.duration}M\`;
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            let rowDueColor = !isPaid ? '#dc2626' : 'transparent';
            let rowPaidColor = isPaid ? '#15803d' : 'transparent';
            let rowDueText = isPaid ? '' : \`₹\${formatNumberIndian(installmentVal)}\`;
            let rowPaidText = !isPaid ? '' : \`₹\${formatNumberIndian(installmentVal)}\`;
            
            const dateBox = datePaidText !== '--' 
                ? \`<div style="border: 1px solid #3b82f6; color: #2563eb; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 11px; font-weight: 700;">\${datePaidText}</div>\`
                : \`\`;
                
            const chitPill = hasTakenChit
                ? \`<span style="background-color: #f3e8ff; color: #6b21a8; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800;">\${chitAmountStr} / \${chitModeStr}</span>\`
                : \`\`;

            chunkRowsHtml += \`
                <tr style="background-color: \${rowBg};">
                    <td style="padding: 16px 10px; color: #111827; font-size: 13px; font-weight: 700; text-align: center; border: 1px solid #475569;">\${index + 1}</td>
                    <td style="padding: 16px 10px; color: #111827; font-weight: 800; font-size: 13px; text-align: left; text-transform: uppercase; border: 1px solid #475569;">\${member.name}</td>
                    <td style="padding: 16px 10px; color: #111827; font-size: 13px; font-weight: 800; text-align: left; border: 1px solid #475569;">\${group.name}</td>
                    <td style="padding: 16px 10px; text-align: center; border: 1px solid #475569;">
                        <span style="border: 1px solid #94a3b8; background: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #111827;">\${schemeName}</span>
                    </td>
                    <td style="padding: 16px 10px; color: #d97706; font-size: 14px; font-weight: 800; text-align: center; border: 1px solid #475569;">\${monthNum}</td>
                    <td style="padding: 16px 10px; text-align: right; color: \${rowDueColor}; font-weight: 900; font-size: 14px; border: 1px solid #475569;">\${rowDueText}</td>
                    <td style="padding: 16px 10px; text-align: right; color: \${rowPaidColor}; font-weight: 900; font-size: 14px; border: 1px solid #475569; width: 65px;">\${rowPaidText}</td>
                    <td style="padding: 16px 10px; text-align: center; border: 1px solid #475569;">\${dateBox}</td>
                    <td style="padding: 16px 10px; text-align: center; border: 1px solid #475569;">\${chitPill}</td>
                    <td style="padding: 16px 10px; text-align: center; border: 1px solid #475569;">
                        <div style="width: 24px; height: 24px; border: 2.5px solid #64748b; border-radius: 6px; margin: 0 auto;"></div>
                    </td>
                </tr>
            \`;
        });
        
        const pageBreak = i > 0 ? \`<div class="html2pdf__page-break"></div>\` : '';
        pagesHtml += \`
            \${pageBreak}
            <div style="background: #ffffff; color: black; padding: 0; font-family: 'Inter', sans-serif;">
                <div style="padding: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <img src="logo-light.jpg" alt="Logo" style="width: 70px; height: 70px; border-radius: 12px; object-fit: cover;">
                        <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #111827; letter-spacing: -0.5px;">PMS</h1>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="font-size: 26px; font-weight: 800; margin: 0; color: #d97706;">\${monthTitle}</h2>
                    </div>
                </div>
                <div style="height: 2px; background-color: #d97706; margin: 0 30px 20px 30px;"></div>
                <div style="padding: 0 30px 30px 30px; background: white;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 13px; border: 1px solid #111827;">
                        <thead>
                            <tr style="background-color: #111827;">
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">S.No</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Name</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Chit Group</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Scheme</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Month</th>
                                <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Due Amount</th>
                                <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Paid Amount</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Paid Date</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Chit Taken</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            \${chunkRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        \`;
    }

    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    
    const wrapper = document.createElement('div');
    wrapper.style.width = '1100px';
    wrapper.innerHTML = pagesHtml;
    const htmlContent = wrapper.outerHTML;

`;
content = content.substring(0, groupReportStart) + newGroupLogic + content.substring(groupReportEnd);

// Patch generateGlobalPdfReport
const globalReportStart = content.indexOf(`    let tableRowsHtml = '';`);
const globalReportEnd = content.indexOf(`    const opt = {`, globalReportStart);

let newGlobalLogic = `
    const dateObj = new Date(selYear, selMonth - 1, 1);
    const monthTitle = \`\${dateObj.toLocaleString('default', { month: 'long' })} \${selYear}\`;

    const ROWS_PER_PAGE = 12;
    let pagesHtml = '';
    
    for (let i = 0; i < allMembersFlattened.length; i += ROWS_PER_PAGE) {
        const chunk = allMembersFlattened.slice(i, i + ROWS_PER_PAGE);
        let chunkRowsHtml = '';
        
        chunk.forEach((row, idx) => {
            const index = i + idx;
            const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
            let rowDueColor = row.dueAmount > 0 ? '#dc2626' : 'transparent';
            let rowPaidColor = row.paidAmount > 0 ? '#15803d' : 'transparent';
            let rowDueText = row.dueAmount === 0 ? '' : \`₹\${formatNumberIndian(row.dueAmount)}\`;
            let rowPaidText = row.paidAmount === 0 ? '' : \`₹\${formatNumberIndian(row.paidAmount)}\`;
            
            const dateBox = row.paidDate !== '--' 
                ? \`<div style="border: 1px solid #3b82f6; color: #2563eb; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 11px; font-weight: 700;">\${row.paidDate}</div>\`
                : \`\`;
                
            const chitPill = row.hasTakenChit
                ? \`<span style="background-color: #f3e8ff; color: #6b21a8; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800;">\${row.chitTakenDisplay}</span>\`
                : \`\`;

            chunkRowsHtml += \`
                <tr style="background-color: \${rowBg};">
                    <td style="padding: 16px 10px; color: #111827; font-size: 13px; font-weight: 700; text-align: center; border: 1px solid #475569;">\${index + 1}</td>
                    <td style="padding: 16px 10px; color: #111827; font-weight: 800; font-size: 13px; text-align: left; text-transform: uppercase; border: 1px solid #475569;">\${row.name}</td>
                    <td style="padding: 16px 10px; color: #111827; font-size: 13px; font-weight: 800; text-align: left; border: 1px solid #475569;">\${row.groupName}</td>
                    <td style="padding: 16px 10px; text-align: center; border: 1px solid #475569;">
                        <span style="border: 1px solid #94a3b8; background: #ffffff; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #111827;">\${row.scheme}</span>
                    </td>
                    <td style="padding: 16px 10px; color: #d97706; font-size: 14px; font-weight: 800; text-align: center; border: 1px solid #475569;">\${row.monthNo}</td>
                    <td style="padding: 16px 10px; text-align: right; color: \${rowDueColor}; font-weight: 900; font-size: 14px; border: 1px solid #475569;">\${rowDueText}</td>
                    <td style="padding: 16px 10px; text-align: right; color: \${rowPaidColor}; font-weight: 900; font-size: 14px; border: 1px solid #475569; width: 65px;">\${rowPaidText}</td>
                    <td style="padding: 16px 10px; text-align: center; border: 1px solid #475569;">\${dateBox}</td>
                    <td style="padding: 16px 10px; text-align: center; border: 1px solid #475569;">\${chitPill}</td>
                    <td style="padding: 16px 10px; text-align: center; border: 1px solid #475569;">
                        <div style="width: 24px; height: 24px; border: 2.5px solid #64748b; border-radius: 6px; margin: 0 auto;"></div>
                    </td>
                </tr>
            \`;
        });
        
        const pageBreak = i > 0 ? \`<div class="html2pdf__page-break"></div>\` : '';
        pagesHtml += \`
            \${pageBreak}
            <div style="background: #ffffff; color: black; padding: 0; font-family: 'Inter', sans-serif;">
                <div style="padding: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <img src="logo-light.jpg" alt="Logo" style="width: 70px; height: 70px; border-radius: 12px; object-fit: cover;">
                        <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #111827; letter-spacing: -0.5px;">PMS</h1>
                    </div>
                    <div style="text-align: right;">
                        <h2 style="font-size: 26px; font-weight: 800; margin: 0; color: #d97706;">\${monthTitle}</h2>
                    </div>
                </div>
                <div style="height: 2px; background-color: #d97706; margin: 0 30px 20px 30px;"></div>
                <div style="padding: 0 30px 30px 30px; background: white;">
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 13px; border: 1px solid #111827;">
                        <thead>
                            <tr style="background-color: #111827;">
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">S.No</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Name</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Chit Group</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Scheme</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Month</th>
                                <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Due Amount</th>
                                <th style="padding: 15px 10px; text-align: right; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Paid Amount</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Paid Date</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">Chit Taken</th>
                                <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            \${chunkRowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        \`;
    }

    const overlay = document.getElementById('pdf-loading-overlay');
    if (overlay) overlay.style.display = 'flex';

    const wrapper = document.createElement('div');
    wrapper.style.width = '1100px';
    wrapper.innerHTML = pagesHtml;
    const htmlContent = wrapper.outerHTML;

`;
content = content.substring(0, globalReportStart) + newGlobalLogic + content.substring(globalReportEnd);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched pdf.js');
