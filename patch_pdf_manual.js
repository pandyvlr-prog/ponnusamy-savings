const fs = require('fs');

let content = fs.readFileSync('js/pdf.js', 'utf8');

// Global Report jsPDF Init
const oldGlobalInit = `        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
        const A4_WIDTH = 210;
        const A4_HEIGHT = 297;`;

const newGlobalInit = `        const { jsPDF } = window.jspdf;
        let pdfFormat = 'a4';
        let PAGE_WIDTH = 210;
        let PAGE_HEIGHT = 297;
        
        if (paperSize === 'custom') {
            pdfFormat = [190, 155];
            PAGE_WIDTH = 190;
            PAGE_HEIGHT = 155;
        }
        const doc = new jsPDF({ unit: 'mm', format: pdfFormat, orientation: 'portrait' });`;

// Global Report Logic
const oldGlobalLogic = `            let pdfWidth = A4_WIDTH - 20; // 10mm margins
            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Constrain height to reserve 25mm for footer
            const maxPdfHeight = A4_HEIGHT - 20;
            // Removed shrinking logic so width is always exactly A4_WIDTH - 20
            const xOffset = (A4_WIDTH - pdfWidth) / 2;
            
            if (idx > 0) doc.addPage();
            
            doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(150);
            doc.text(\`\${idx + 1}\`, A4_WIDTH / 2, 24, { align: 'center' });`;

const newGlobalLogic = `            let pdfWidth = PAGE_WIDTH - 20; // 10mm margins
            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            // Constrain height to reserve 25mm for footer
            const maxPdfHeight = PAGE_HEIGHT - 20;
            // Removed shrinking logic so width is always exactly PAGE_WIDTH - 20
            const xOffset = (PAGE_WIDTH - pdfWidth) / 2;
            
            if (idx > 0) doc.addPage();
            
            doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);
            
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(150);
            doc.text(\`\${idx + 1}\`, PAGE_WIDTH / 2, 24, { align: 'center' });`;


content = content.replaceAll(oldGlobalInit, newGlobalInit);
content = content.replaceAll(oldGlobalLogic, newGlobalLogic);

// Ensure the replace actually changed things
if (content.indexOf("if (paperSize === 'custom')") === -1) {
    console.log("Failed to inject PAGE_WIDTH / custom paper format!");
    
    // Fallback manual replace by looking for the strings without exact indentation
    const regex1 = /const \{ jsPDF \} = window\.jspdf;\s*const doc = new jsPDF\(\{ unit: 'mm', format: 'a4', orientation: 'portrait' \}\);\s*const A4_WIDTH = 210;\s*const A4_HEIGHT = 297;/g;
    content = content.replace(regex1, newGlobalInit);

    const regex2 = /let pdfWidth = A4_WIDTH - 20;.*?doc\.text\(`\$\{idx \+ 1\}`,\s*A4_WIDTH \/ 2,\s*(24|7),\s*\{ align: 'center' \}\);/gs;
    content = content.replace(regex2, newGlobalLogic);
}

fs.writeFileSync('js/pdf.js', content, 'utf8');
console.log('Successfully patched js/pdf.js');
