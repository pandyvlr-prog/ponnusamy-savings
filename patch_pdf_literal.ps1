$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

# 1. Update Signatures
$content = $content.Replace("async function generatePdfReport() {", "async function generatePdfReport(paperSize = 'a4') {")
$content = $content.Replace("async function generateGlobalPdfReport(mode = 'download') {", "async function generateGlobalPdfReport(mode = 'download', paperSize = 'a4') {")

# 2. Update ROWS_PER_PAGE
$content = $content.Replace("const ROWS_PER_PAGE = 25;", "const ROWS_PER_PAGE = paperSize === 'custom' ? 12 : 25;")

# 3. Update Init (Since there are two identical ones, .Replace will hit both, which is perfect)
$oldInit = "        const { jsPDF } = window.jspdf;`r`n        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });`r`n        const A4_WIDTH = 210;`r`n        const A4_HEIGHT = 297;"
$newInit = "        const { jsPDF } = window.jspdf;`r`n        let pdfFormat = 'a4';`r`n        let PAGE_WIDTH = 210;`r`n        let PAGE_HEIGHT = 297;`r`n        if (paperSize === 'custom') {`r`n            pdfFormat = [190, 155];`r`n            PAGE_WIDTH = 190;`r`n            PAGE_HEIGHT = 155;`r`n        }`r`n        const doc = new jsPDF({ unit: 'mm', format: pdfFormat, orientation: 'portrait' });"
$content = $content.Replace($oldInit, $newInit)

# Try with \n instead if \r\n didn't work
$oldInit2 = "        const { jsPDF } = window.jspdf;`n        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });`n        const A4_WIDTH = 210;`n        const A4_HEIGHT = 297;"
$newInit2 = "        const { jsPDF } = window.jspdf;`n        let pdfFormat = 'a4';`n        let PAGE_WIDTH = 210;`n        let PAGE_HEIGHT = 297;`n        if (paperSize === 'custom') {`n            pdfFormat = [190, 155];`n            PAGE_WIDTH = 190;`n            PAGE_HEIGHT = 155;`n        }`n        const doc = new jsPDF({ unit: 'mm', format: pdfFormat, orientation: 'portrait' });"
$content = $content.Replace($oldInit2, $newInit2)

# 4. Update width logic block (both have A4_WIDTH / 2, 7 in the end)
$oldLogic = "            let pdfWidth = A4_WIDTH - 20; // 10mm margins`r`n            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;`r`n            `r`n            // Constrain height to reserve 25mm for footer`r`n            const maxPdfHeight = A4_HEIGHT - 20;`r`n            // Removed shrinking logic so width is always exactly A4_WIDTH - 20`r`n            const xOffset = (A4_WIDTH - pdfWidth) / 2;`r`n            `r`n            if (idx > 0) doc.addPage();`r`n            `r`n            doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);`r`n            doc.setFontSize(14);`r`n            doc.setFont(undefined, 'bold');`r`n            doc.setTextColor(150);`r`n            doc.text(`${idx + 1}`, A4_WIDTH / 2, 7, { align: 'center' });"
$newLogic = "            let pdfWidth = PAGE_WIDTH - 20; // 10mm margins`r`n            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;`r`n            `r`n            // Constrain height to reserve 25mm for footer`r`n            const maxPdfHeight = PAGE_HEIGHT - 20;`r`n            // Removed shrinking logic so width is always exactly PAGE_WIDTH - 20`r`n            const xOffset = (PAGE_WIDTH - pdfWidth) / 2;`r`n            `r`n            if (idx > 0) doc.addPage();`r`n            `r`n            doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);`r`n            doc.setFontSize(14);`r`n            doc.setFont(undefined, 'bold');`r`n            doc.setTextColor(150);`r`n            doc.text(`${idx + 1}`, PAGE_WIDTH / 2, 7, { align: 'center' });"
$content = $content.Replace($oldLogic, $newLogic)

# Try with \n instead if \r\n didn't work
$oldLogic2 = "            let pdfWidth = A4_WIDTH - 20; // 10mm margins`n            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;`n            `n            // Constrain height to reserve 25mm for footer`n            const maxPdfHeight = A4_HEIGHT - 20;`n            // Removed shrinking logic so width is always exactly A4_WIDTH - 20`n            const xOffset = (A4_WIDTH - pdfWidth) / 2;`n            `n            if (idx > 0) doc.addPage();`n            `n            doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);`n            doc.setFontSize(14);`n            doc.setFont(undefined, 'bold');`n            doc.setTextColor(150);`n            doc.text(`${idx + 1}`, A4_WIDTH / 2, 7, { align: 'center' });"
$newLogic2 = "            let pdfWidth = PAGE_WIDTH - 20; // 10mm margins`n            let pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;`n            `n            // Constrain height to reserve 25mm for footer`n            const maxPdfHeight = PAGE_HEIGHT - 20;`n            // Removed shrinking logic so width is always exactly PAGE_WIDTH - 20`n            const xOffset = (PAGE_WIDTH - pdfWidth) / 2;`n            `n            if (idx > 0) doc.addPage();`n            `n            doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);`n            doc.setFontSize(14);`n            doc.setFont(undefined, 'bold');`n            doc.setTextColor(150);`n            doc.text(`${idx + 1}`, PAGE_WIDTH / 2, 7, { align: 'center' });"
$content = $content.Replace($oldLogic2, $newLogic2)

Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "Literal replace complete"
