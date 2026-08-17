const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'js', 'pdf.js');
let content = fs.readFileSync(pdfPath, 'utf8');

// 1. Replace loadHtml2Pdf
const newLoadHtml2Pdf = `
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
`;
content = content.replace(/let isHtml2PdfLoaded = false;[\s\S]*?async function loadHtml2Pdf\(\) \{[\s\S]*?\n\}/, newLoadHtml2Pdf.trim());


// 2. Replace the rendering block in generatePdfReport
const newPdfReportRender = `
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const A4_WIDTH = 297;
    const A4_HEIGHT = 210;
    
    // We chunk members to completely avoid page break issues
    const ROWS_PER_PAGE = 20;
    const totalPagesExpected = Math.ceil(members.length / ROWS_PER_PAGE) || 1;

    try {
        await loadHtml2Pdf();
        
        let chunkIndex = 0;
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
                        const day = payment.customDate;
                        datePaidText = \`\${String(day).padStart(2, '0')}/\${String(monthNum).padStart(2, '0')}/\${selYear}\`;
                    } else if (payment.paidAt) {
                        const d = new Date(payment.paidAt);
                        datePaidText = \`\${String(d.getDate()).padStart(2, '0')}/\${String(d.getMonth() + 1).padStart(2, '0')}/\${d.getFullYear()}\`;
                    }
                }
    
                let memberHasTakenChit = false;
                let chitAmountStr = '';
                let chitModeStr = '';
                for (let m = 1; m <= group.duration; m++) {
                    if (member.payments[m] && member.payments[m].payoutClaimed) {
                        memberHasTakenChit = true;
                        const payoutVal = group.payouts && group.payouts[m] !== undefined ? group.payouts[m] : 0;
                        chitAmountStr = \`₹\${formatNumberIndian(payoutVal)}\`;
                        chitModeStr = member.payments[m].paymentMode ? member.payments[m].paymentMode.substring(0,1).toUpperCase() : 'C';
                        break;
                    }
                }
    
                const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                const installmentVal = member.customAmount ? member.customAmount : (group.installment || 0);
                
                let rowDueText = isPaid ? '' : \`₹\${formatNumberIndian(installmentVal)}\`;
                if (!isPaid && payment && payment.paidAmount > 0) {
                    rowDueText = \`₹\${formatNumberIndian(installmentVal - payment.paidAmount)}\`;
                }
                
                let markHtml = isPaid ? \`<span style="background: #ecfdf5; color: #059669; border: 1px solid #059669; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">✓ PAID</span>\` 
                                      : \`<span style="background: #fef2f2; color: #dc2626; border: 1px solid #dc2626; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">◷ DUE</span>\`;
                                      
                if (payment && payment.paidAmount > 0 && !isPaid) {
                    markHtml = \`<span style="background: #fffbeb; color: #d97706; border: 1px solid #d97706; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">PARTIAL</span>\`;
                } else if (isPaid && payment && payment.paymentMode === 'gpay') {
                    markHtml = \`<span style="background: #ecfdf5; color: #059669; border: 1px solid #059669; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">✓ PAID / G</span>\`;
                } else if (isPaid && payment && payment.paymentMode === 'cash') {
                    markHtml = \`<span style="background: #ecfdf5; color: #059669; border: 1px solid #059669; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">✓ PAID / C</span>\`;
                }
    
                let badgeName = member.name;
                if (member.joinedMonth === monthNum) {
                     badgeName += \` <span style="background: #d97706; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; margin-left: 6px;">NEW</span>\`;
                }
                if (member.isReplacement) {
                     badgeName += \` <span style="background: #6366f1; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; margin-left: 6px;">REP</span>\`;
                }
    
                const chitTakenDisplay = memberHasTakenChit ? \`\${chitAmountStr} / \${chitModeStr}\` : '--';
    
                chunkRowsHtml += \`
                    <tr style="background-color: \${rowBg};">
                        <td style="padding: 16px 10px; text-align: center; color: #0f172a; font-weight: 700; font-size: 12px; border: 1px solid #d1d5db;">\${index + 1}</td>
                        <td style="padding: 16px 10px; color: #0f172a; font-weight: 800; font-size: 14px; text-transform: uppercase; border: 1px solid #d1d5db;">\${badgeName}</td>
                        <td style="padding: 16px 10px; text-align: center; color: #059669; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">\${group.name}</td>
                        <td style="padding: 16px 10px; text-align: center; border: 1px solid #d1d5db;">
                            <span style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #334155; display: inline-block; white-space: nowrap;">\${schemeName}</span>
                        </td>
                        <td style="padding: 16px 10px; text-align: center; color: #d97706; font-weight: 800; font-size: 14px; border: 1px solid #d1d5db;">\${monthNum}</td>
                        <td style="padding: 16px 10px; text-align: right; color: #dc2626; font-weight: 800; font-size: 14px; border: 1px solid #d1d5db;">\${rowDueText}</td>
                        <td style="padding: 16px 10px; text-align: right; color: #059669; font-weight: 800; font-size: 14px; border: 1px solid #d1d5db;">\${isPaid || (payment && payment.paidAmount > 0) ? '₹' + formatNumberIndian(payment.paidAmount) : '--'}</td>
                        <td style="padding: 16px 10px; text-align: center; color: #475569; font-weight: 600; font-size: 12px; border: 1px solid #d1d5db;">\${datePaidText}</td>
                        <td style="padding: 16px 10px; text-align: center; border: 1px solid #d1d5db;">\${markHtml}</td>
                        <td style="padding: 16px 10px; text-align: center; color: #6366f1; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">\${chitTakenDisplay}</td>
                    </tr>
                \`;
            });
            
            let chunkPageHtml = \`
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
                                <tr style="background-color: #eab308;">
                                    <th style="padding: 15px 10px; text-align: center; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">S.No</th>
                                    <th style="padding: 15px 10px; text-align: center; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">NAME</th>
                                    <th style="padding: 15px 10px; text-align: center; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">CHIT GROUP</th>
                                    <th style="padding: 15px 10px; text-align: center; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">SCHEME</th>
                                    <th style="padding: 15px 10px; text-align: center; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        </div>
                                    </th>
                                    <th style="padding: 15px 10px; text-align: left; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">DUE AMOUNT</th>
                                    <th style="padding: 15px 10px; text-align: left; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">PAID AMOUNT</th>
                                    <th style="padding: 15px 10px; text-align: center; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">PAID DATE</th>
                                    <th style="padding: 15px 10px; text-align: center; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">MARK</th>
                                    <th style="padding: 15px 10px; text-align: center; color: #111827; font-weight: 800; font-size: 12px; border: 1px solid #a16207;">CHIT TAKEN</th>
                                </tr>
                            </thead>
                            <tbody>
                                \${chunkRowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            \`;
            
            const wrapper = document.createElement('div');
            wrapper.style.width = '1400px';
            wrapper.style.position = 'absolute';
            wrapper.style.left = '-9999px';
            wrapper.style.top = '0';
            wrapper.innerHTML = chunkPageHtml;
            document.body.appendChild(wrapper);
            
            const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, logging: false });
            document.body.removeChild(wrapper);
            
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const imgProps = doc.getImageProperties(imgData);
            
            const pdfWidth = A4_WIDTH - 20; // 10mm margins
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            if (chunkIndex > 0) doc.addPage();
            
            doc.addImage(imgData, 'JPEG', 10, 10, pdfWidth, pdfHeight);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(\`Page \${chunkIndex + 1} of \${totalPagesExpected}\`, A4_WIDTH / 2, A4_HEIGHT - 10, { align: 'center' });
            
            chunkIndex++;
        }
        
        doc.save(\`\${group.name.replace(/\\s+/g, '_')}_Month_\${monthNum}_Report.pdf\`);
        
        if (overlay) overlay.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('PDF Report Generated Successfully!', 'success');
    } catch (error) {
        console.error(error);
        if (overlay) overlay.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('Error: ' + (error.message || error), 'error');
        throw error;
    }
`;

const startMarker1 = "    // We will chunk members to avoid page break issues";
const endMarker1 = "if (overlay) overlay.style.display = 'none';\n        if (typeof showNotification === 'function') showNotification('PDF Report Generated Successfully!', 'success');\n    } catch (error) {\n        console.error(error);\n        if (overlay) overlay.style.display = 'none';\n        if (typeof showNotification === 'function') showNotification('Error: ' + (error.message || error), 'error');\n        throw error;\n    }";

const parts1 = content.split(startMarker1);
const innerParts1 = parts1[1].split(endMarker1);
const toReplace1 = startMarker1 + innerParts1[0] + endMarker1;

content = content.replace(toReplace1, newPdfReportRender.trim());

// Do the same for Global Pdf Report
const newGlobalPdfReportRender = `
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    const A4_WIDTH = 297;
    const A4_HEIGHT = 210;
    
    const ROWS_PER_PAGE = 20;
    const totalPagesExpected = Math.ceil(allMembersFlattened.length / ROWS_PER_PAGE) || 1;

    try {
        await loadHtml2Pdf();
        
        let chunkIndex = 0;
        for (let i = 0; i < allMembersFlattened.length; i += ROWS_PER_PAGE) {
            const chunk = allMembersFlattened.slice(i, i + ROWS_PER_PAGE);
            let chunkRowsHtml = '';
            
            chunk.forEach((item, idx) => {
                const index = i + idx;
                const rowBg = index % 2 === 0 ? '#ffffff' : '#f8fafc';
                
                let markHtml = item.isPaid ? \`<span style="background: #ecfdf5; color: #059669; border: 1px solid #059669; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">✓ PAID</span>\` 
                                      : \`<span style="background: #fef2f2; color: #dc2626; border: 1px solid #dc2626; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">◷ DUE</span>\`;
                if (!item.isPaid && item.paidAmount > 0) {
                    markHtml = \`<span style="background: #fffbeb; color: #d97706; border: 1px solid #d97706; padding: 4px 8px; border-radius: 99px; font-size: 10px; font-weight: 800; display: inline-block;">PARTIAL</span>\`;
                }

                chunkRowsHtml += \`
                    <tr style="background-color: \${rowBg};">
                        <td style="padding: 16px 10px; text-align: center; color: #0f172a; font-weight: 700; font-size: 12px; border: 1px solid #d1d5db;">\${index + 1}</td>
                        <td style="padding: 16px 10px; color: #0f172a; font-weight: 800; font-size: 14px; text-transform: uppercase; border: 1px solid #d1d5db;">\${item.name}</td>
                        <td style="padding: 16px 10px; text-align: center; color: #059669; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">\${item.groupName}</td>
                        <td style="padding: 16px 10px; text-align: center; border: 1px solid #d1d5db;">
                            <span style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; color: #334155; display: inline-block; white-space: nowrap;">\${item.scheme}</span>
                        </td>
                        <td style="padding: 16px 10px; text-align: center; color: #d97706; font-weight: 800; font-size: 14px; border: 1px solid #d1d5db;">\${item.monthNo}</td>
                        <td style="padding: 16px 10px; text-align: right; color: #dc2626; font-weight: 800; font-size: 14px; border: 1px solid #d1d5db;">\${item.dueAmount > 0 ? '₹' + formatNumberIndian(item.dueAmount) : '--'}</td>
                        <td style="padding: 16px 10px; text-align: right; color: #059669; font-weight: 800; font-size: 14px; border: 1px solid #d1d5db;">\${item.paidAmount > 0 ? '₹' + formatNumberIndian(item.paidAmount) : '--'}</td>
                        <td style="padding: 16px 10px; text-align: center; color: #475569; font-weight: 600; font-size: 12px; border: 1px solid #d1d5db;">\${item.paidDate}</td>
                        <td style="padding: 16px 10px; text-align: center; border: 1px solid #d1d5db;">\${markHtml}</td>
                        <td style="padding: 16px 10px; text-align: center; color: #6366f1; font-weight: 800; font-size: 13px; border: 1px solid #d1d5db;">\${item.chitTakenDisplay}</td>
                    </tr>
                \`;
            });
            
            let chunkPageHtml = \`
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
                                    <th style="padding: 15px 10px; text-align: center; color: #ffffff; font-weight: 800; font-size: 12px; border: 1px solid #334155;">
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                            Month
                                        </div>
                                    </th>
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
            
            const wrapper = document.createElement('div');
            wrapper.style.width = '1400px';
            wrapper.style.position = 'absolute';
            wrapper.style.left = '-9999px';
            wrapper.style.top = '0';
            wrapper.innerHTML = chunkPageHtml;
            document.body.appendChild(wrapper);
            
            const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, logging: false });
            document.body.removeChild(wrapper);
            
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const imgProps = doc.getImageProperties(imgData);
            
            const pdfWidth = A4_WIDTH - 20; // 10mm margins
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            if (chunkIndex > 0) doc.addPage();
            
            doc.addImage(imgData, 'JPEG', 10, 10, pdfWidth, pdfHeight);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(\`Page \${chunkIndex + 1} of \${totalPagesExpected}\`, A4_WIDTH / 2, A4_HEIGHT - 10, { align: 'center' });
            
            chunkIndex++;
        }
        
        doc.save(\`Global_Report_\${monthName}_\${selYear}.pdf\`);
        
        if (overlay) overlay.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('PDF Report Generated Successfully!', 'success');
    } catch (error) {
        console.error(error);
        if (overlay) overlay.style.display = 'none';
        if (typeof showNotification === 'function') showNotification('Error: ' + (error.message || error), 'error');
        throw error;
    }
`;

const startMarker2 = "    const ROWS_PER_PAGE = 20;\n    let pagesHtml = '';";
const endMarker2 = "if (overlay) overlay.style.display = 'none';\n        if (typeof showNotification === 'function') showNotification('PDF Report Generated Successfully!', 'success');\n    } catch (error) {\n        console.error(error);\n        if (overlay) overlay.style.display = 'none';\n        if (typeof showNotification === 'function') showNotification('Error: ' + (error.message || error), 'error');\n        throw error;\n    }";

const parts2 = content.split(startMarker2);
const innerParts2 = parts2[1].split(endMarker2);
const toReplace2 = startMarker2 + innerParts2[0] + endMarker2;

content = content.replace(toReplace2, newGlobalPdfReportRender.trim());

fs.writeFileSync(pdfPath, content, 'utf8');
console.log('PDF logic patched successfully for manual chunking.');
