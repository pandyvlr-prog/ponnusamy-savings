const fs = require('fs');
const path = require('path');

const pdfPath = path.join(__dirname, '..', 'js', 'pdf.js');
let content = fs.readFileSync(pdfPath, 'utf8');

// 1. Replace padding: 16px 10px with padding: 12px 10px for the rows
content = content.replace(/padding: 16px 10px;/g, 'padding: 12px 10px;');

// 2. Adjust top header spacing
// The header wrapper: <div style="padding: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
content = content.replace(/<div style="padding: 30px; display: flex; justify-content: space-between; align-items: flex-start;">/g, '<div style="padding: 20px 30px 10px 30px; display: flex; justify-content: space-between; align-items: flex-start;">');

// The divider line margin: <div style="height: 2px; background-color: #d97706; margin: 0 30px 20px 30px;"></div>
content = content.replace(/<div style="height: 2px; background-color: #d97706; margin: 0 30px 20px 30px;"><\/div>/g, '<div style="height: 2px; background-color: #d97706; margin: 0 30px 10px 30px;"></div>');

// The table wrapper padding: <div style="padding: 0 30px 30px 30px; background: white;">
content = content.replace(/<div style="padding: 0 30px 30px 30px; background: white;">/g, '<div style="padding: 0 30px 20px 30px; background: white;">');

// The table bottom margin: <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 13px; border: 1px solid #111827;">
content = content.replace(/<table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 13px; border: 1px solid #111827;">/g, '<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; border: 1px solid #111827;">');

// 3. Fix the pdf scaling logic for generatePdfReport
const oldScaleLogic1 = `            const pdfWidth = A4_WIDTH - 20; // 10mm margins
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            if (idx > 0) doc.addPage();
            
            doc.addImage(imgData, 'JPEG', 10, 5, pdfWidth, pdfHeight);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(\`Page \${idx + 1} of \${totalPagesExpected}\`, A4_WIDTH / 2, A4_HEIGHT - 10, { align: 'center' });`;

const newScaleLogic1 = `            let pdfWidth = A4_WIDTH - 20; // 10mm margins on sides
            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Constrain height to reserve 25mm for footer
            const maxPdfHeight = A4_HEIGHT - 25;
            if (pdfHeight > maxPdfHeight) {
                pdfWidth = (maxPdfHeight * pdfWidth) / pdfHeight;
                pdfHeight = maxPdfHeight;
            }
            
            const xOffset = (A4_WIDTH - pdfWidth) / 2;
            
            if (idx > 0) doc.addPage();
            
            doc.addImage(imgData, 'JPEG', xOffset, 5, pdfWidth, pdfHeight);
            
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(\`Page \${idx + 1} of \${totalPagesExpected}\`, A4_WIDTH / 2, A4_HEIGHT - 10, { align: 'center' });`;

content = content.replace(oldScaleLogic1, newScaleLogic1);

// Need to replace it twice, once for generatePdfReport and once for generateGlobalPdfReport
content = content.replace(oldScaleLogic1, newScaleLogic1);

fs.writeFileSync(pdfPath, content, 'utf8');
console.log('PDF logic patched successfully for margins.');
