$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

# Update generateGlobalPdfReport
$content = $content -replace "async function generateGlobalPdfReport\(mode = 'download'\) \{", "async function generateGlobalPdfReport(mode = 'download', paperSize = 'a4') {"

# Replace ROWS_PER_PAGE for global
$content = $content -replace 'const ROWS_PER_PAGE = 25;\r?\n\s+let chunkPagesHtml = \[\];\r?\n\s+allMembersFlattened\.sort', "const ROWS_PER_PAGE = paperSize === 'custom' ? 12 : 25;`n    let chunkPagesHtml = [];`n    `n    allMembersFlattened.sort"

# Replace jsPDF init for global
$oldGlobalInit = "        const \{ jsPDF \} = window\.jspdf;
        const doc = new jsPDF\(\{ unit: 'mm', format: 'a4', orientation: 'portrait' \}\);
        const A4_WIDTH = 210;
        const A4_HEIGHT = 297;"
        
$newGlobalInit = "        const { jsPDF } = window.jspdf;
        
        let pdfFormat = 'a4';
        let PAGE_WIDTH = 210;
        let PAGE_HEIGHT = 297;
        
        if (paperSize === 'custom') {
            pdfFormat = [190, 155];
            PAGE_WIDTH = 190;
            PAGE_HEIGHT = 155;
        }
        
        const doc = new jsPDF({ unit: 'mm', format: pdfFormat, orientation: 'portrait' });"
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldGlobalInit, $newGlobalInit)

# Replace A4_WIDTH and A4_HEIGHT references in the global report's rendering loop
# We'll use regex to target the block starting after imgProps.width for global report
# The global report block starts around line 590
$oldGlobalWidthLogic = "            let pdfWidth = A4_WIDTH - 20; // 10mm margins
            let pdfHeight = \(imgProps\.height \* pdfWidth\) / imgProps\.width;
            
            // Constrain height to reserve 25mm for footer
            const maxPdfHeight = A4_HEIGHT - 20;
            // Removed shrinking logic so width is always exactly A4_WIDTH - 20
            const xOffset = \(A4_WIDTH - pdfWidth\) / 2;
            
            if \(idx > 0\) doc\.addPage\(\);
            
            doc\.addImage\(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight\);
            
            doc\.setFontSize\(14\);
            doc\.setFont\(undefined, 'bold'\);
            doc\.setTextColor\(150\);
            doc\.text\(\`\$\{idx \+ 1\}\`, A4_WIDTH / 2, 24, \{ align: 'center' \}\);"

$newGlobalWidthLogic = "            let pdfWidth = PAGE_WIDTH - 20; // 10mm margins
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
            doc.text(`${idx + 1}`, PAGE_WIDTH / 2, 24, { align: 'center' });"

# The issue is there are TWO blocks like this (one in generatePdfReport, one in generateGlobalPdfReport).
# We want to replace it only for the global one.
# Wait, why not just change A4_WIDTH to PAGE_WIDTH for both, since they both have the same logic?
# Let's change the generatePdfReport signature and init as well!

$content = $content -replace "async function generatePdfReport\(\) \{", "async function generatePdfReport(paperSize = 'a4') {"
$content = $content -replace 'const ROWS_PER_PAGE = 25;\r?\n\s+let chunkPagesHtml = \[\];\r?\n\s+for \(let i = 0', "const ROWS_PER_PAGE = paperSize === 'custom' ? 12 : 25;`n    let chunkPagesHtml = [];`n    `n    for (let i = 0"

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldGlobalInit, $newGlobalInit)
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldGlobalWidthLogic, $newGlobalWidthLogic)

Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "Patched pdf.js completely"
