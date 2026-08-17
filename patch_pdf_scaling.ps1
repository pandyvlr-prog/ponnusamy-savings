$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

# 1. Fix dynamic row calculation to be more conservative (so it never overflows)
$content = $content -replace "return maxRows > 0 \? maxRows : 1;", "return maxRows > 2 ? maxRows - 2 : 1;"

# 2. Remove the width-shrinking logic in generatePdfReport
$oldShrinkLogic1 = '            const maxPdfHeight = A4_HEIGHT - 20;
            if \(pdfHeight > maxPdfHeight\) \{
                pdfWidth = \(maxPdfHeight \* pdfWidth\) / pdfHeight;
                pdfHeight = maxPdfHeight;
            \}
            const xOffset = \(A4_WIDTH - pdfWidth\) / 2;'
            
$newShrinkLogic1 = '            const xOffset = (A4_WIDTH - pdfWidth) / 2;'
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldShrinkLogic1, $newShrinkLogic1)

# Do the same for generateGlobalPdfReport
$oldShrinkLogic2 = '            const maxPdfHeight = A4_HEIGHT - 20;
            if \(pdfHeight > maxPdfHeight\) \{
                pdfWidth = \(maxPdfHeight \* pdfWidth\) / pdfHeight;
                pdfHeight = maxPdfHeight;
            \}
            const xOffset = \(A4_WIDTH - pdfWidth\) / 2;'
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldShrinkLogic2, $newShrinkLogic1)

Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "Patched width-shrinking issue"
