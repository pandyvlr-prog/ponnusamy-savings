import re

with open('js/pdf.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Global Report jsPDF Init
old_init_pattern = r"const \{\s*jsPDF\s*\} = window\.jspdf;\s*const doc = new jsPDF\(\{ unit: 'mm', format: 'a4', orientation: 'portrait' \}\);\s*const A4_WIDTH = 210;\s*const A4_HEIGHT = 297;"
new_init = """        const { jsPDF } = window.jspdf;
        
        let pdfFormat = 'a4';
        let PAGE_WIDTH = 210;
        let PAGE_HEIGHT = 297;
        
        if (paperSize === 'custom') {
            pdfFormat = [190, 155];
            PAGE_WIDTH = 190;
            PAGE_HEIGHT = 155;
        }
        
        const doc = new jsPDF({ unit: 'mm', format: pdfFormat, orientation: 'portrait' });"""

# Global Report Logic
old_logic_pattern = r"let pdfWidth = A4_WIDTH - 20;.*?doc\.text\(`\$\{idx \+ 1\}`,\s*A4_WIDTH \/ 2,\s*(24|7),\s*\{\s*align:\s*'center'\s*\}\);"

new_logic = """let pdfWidth = PAGE_WIDTH - 20; // 10mm margins
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
            doc.text(`${idx + 1}`, PAGE_WIDTH / 2, 24, { align: 'center' });"""

# Replace
content = re.sub(old_init_pattern, new_init, content)
content = re.sub(old_logic_pattern, new_logic, content, flags=re.DOTALL)

with open('js/pdf.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched successfully")
