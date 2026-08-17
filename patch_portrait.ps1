$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath

# Change orientation
$content = $content -replace "orientation: 'landscape'", "orientation: 'portrait'"

# Change A4 bounds
$content = $content -replace "const A4_WIDTH = 297;", "const A4_WIDTH = 210;"
$content = $content -replace "const A4_HEIGHT = 210;", "const A4_HEIGHT = 297;"

# Change Wrapper Width to 1000px
$content = $content -replace "wrapper\.style\.width = '1400px';", "wrapper.style.width = '1000px';"

# Update Dynamic Height logic
$content = $content -replace "const pxPerMm = 3\.779527559 \* scaleFactor;", "const pxPerMm = (1000 / 190) * scaleFactor; // Using 1000px mapped to 190mm"
$content = $content -replace "const availableHeightMm = 210 - 25;", "const availableHeightMm = 297 - 25;"

# Font and spacing tweaks to fit portrait
$content = $content -replace "font-size: 13px;", "font-size: 11.5px;"
$content = $content -replace "font-size: 14px;", "font-size: 12px;"
$content = $content -replace "font-size: 12px;", "font-size: 11px;"
$content = $content -replace "padding: 12px 10px;", "padding: 10px 4px;"
$content = $content -replace "padding: 15px 10px;", "padding: 12px 4px;"
$content = $content -replace "text-transform: uppercase;", "text-transform: uppercase; word-break: break-word; white-space: normal;"

# Headers
$oldHeader = '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>'
$newHeader = '<th style="width: 4%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>'
$content = $content -replace [regex]::Escape($oldHeader), $newHeader

$oldName = '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>'
$newName = '<th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>'
$content = $content -replace [regex]::Escape($oldName), $newName

$oldGroup = '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>'
$newGroup = '<th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>'
$content = $content -replace [regex]::Escape($oldGroup), $newGroup

$oldScheme = '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>'
$newScheme = '<th style="width: 13%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>'
$content = $content -replace [regex]::Escape($oldScheme), $newScheme

$oldMonth = '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Month</th>'
$newMonth = '<th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Month</th>'
$content = $content -replace [regex]::Escape($oldMonth), $newMonth

$oldDue = '<th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>'
$newDue = '<th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>'
$content = $content -replace [regex]::Escape($oldDue), $newDue

$oldPaid = '<th style="padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount</th>'
$newPaid = '<th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount</th>'
$content = $content -replace [regex]::Escape($oldPaid), $newPaid

$oldDate = '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>'
$newDate = '<th style="width: 10%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>'
$content = $content -replace [regex]::Escape($oldDate), $newDate

$oldChit = '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>'
$newChit = '<th style="width: 8%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>'
$content = $content -replace [regex]::Escape($oldChit), $newChit

$oldEmpty = '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>'
$newEmpty = '<th style="width: 3%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>'
$content = $content -replace [regex]::Escape($oldEmpty), $newEmpty

# The month flex layout in global PDF
$content = $content -replace '<th style="padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">(\s*<div.*?Month\s*</div>\s*)</th>', '<th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">$1</th>'

Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "PDF patched successfully for A4 Portrait"
