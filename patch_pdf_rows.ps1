$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

# 1. Hardcode ROWS_PER_PAGE to 25
$content = $content -replace "const ROWS_PER_PAGE = await calculateDynamicRowsPerPage\(monthTitle\);", "const ROWS_PER_PAGE = 25;"
# Also in generatePdfReport, wait, it's:
# const ROWS_PER_PAGE = await calculateDynamicRowsPerPage(monthTitle);
# The regex above will replace all occurrences.

# 2. Increase checkbox size
$content = $content -replace '<div style="width: 24px; height: 24px; border: 2\.5px solid #64748b; border-radius: 6px; margin: 0 auto;"></div>', '<div style="width: 28px; height: 28px; border: 2.5px solid #64748b; border-radius: 6px; margin: 0 auto;"></div>'

# 3. Remove pill styling from Paid Date (single report)
$oldDateBoxSingle = '<div style="border: 1px solid #3b82f6; color: #2563eb; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 11px; font-weight: 700;">\$\{datePaidText\}</div>'
$newDateBoxSingle = '<span style="color: #2563eb; font-size: 13px; font-weight: 900;">${datePaidText}</span>'
$content = $content -replace $oldDateBoxSingle, $newDateBoxSingle

# 4. Remove pill styling from Paid Date (global report)
$oldDateBoxGlobal = '<div style="border: 1px solid #3b82f6; color: #2563eb; padding: 2px 6px; border-radius: 4px; display: inline-block; font-size: 11px; font-weight: 700;">\$\{row\.paidDate\}</div>'
$newDateBoxGlobal = '<span style="color: #2563eb; font-size: 13px; font-weight: 900;">${row.paidDate}</span>'
$content = $content -replace $oldDateBoxGlobal, $newDateBoxGlobal

Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "Patched ROWS_PER_PAGE, checkbox, and Date styling"
