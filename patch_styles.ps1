$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

# Name column
$content = $content -replace '<td style="padding: 10px 4px; color: #111827; font-weight: 800; font-size: 11\.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">\$\{member\.name\}</td>', '<td style="padding: 10px 4px; color: #000000; font-weight: 900; font-size: 12px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">${member.name}</td>'
$content = $content -replace '<td style="padding: 10px 4px; color: #111827; font-weight: 800; font-size: 11\.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">\$\{row\.name\}</td>', '<td style="padding: 10px 4px; color: #000000; font-weight: 900; font-size: 12px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">${row.name}</td>'

# Amount Columns
$content = $content -replace '<td style="padding: 10px 4px; text-align: right; color: \$\{rowDueColor\}; font-weight: 900; font-size: 11px; border: 1px solid #475569;">\$\{rowDueText\}</td>', '<td style="padding: 10px 4px; text-align: right; color: ${rowDueColor}; font-weight: 900; font-size: 13px; border: 1px solid #475569;">${rowDueText}</td>'
$content = $content -replace '<td style="padding: 10px 4px; text-align: right; color: \$\{rowPaidColor\}; font-weight: 900; font-size: 11px; border: 1px solid #475569; width: 65px;">\$\{rowPaidText\}</td>', '<td style="padding: 10px 4px; text-align: right; color: ${rowPaidColor}; font-weight: 900; font-size: 13px; border: 1px solid #475569; width: 65px;">${rowPaidText}</td>'

# Colors
$content = $content -replace "let rowDueColor = !isPaid \? '#dc2626' : 'transparent';", "let rowDueColor = !isPaid ? '#b91c1c' : 'transparent';"
$content = $content -replace "let rowPaidColor = isPaid \? '#15803d' : 'transparent';", "let rowPaidColor = isPaid ? '#14532d' : 'transparent';"

$content = $content -replace "let rowDueColor = row\.dueAmount > 0 \? '#dc2626' : 'transparent';", "let rowDueColor = row.dueAmount > 0 ? '#b91c1c' : 'transparent';"
$content = $content -replace "let rowPaidColor = row\.paidAmount > 0 \? '#15803d' : 'transparent';", "let rowPaidColor = row.paidAmount > 0 ? '#14532d' : 'transparent';"

# Page Numbers and Positions
$content = $content -replace "doc\.text\(\`Page \\\$\\{idx \+ 1\\} of \\\$\\{totalPagesExpected\\}\`, A4_WIDTH / 2, A4_HEIGHT - 10, \{ align: 'center' \}\);", "doc.setFont(undefined, 'bold');`r`n            doc.text(`${idx + 1}`, A4_WIDTH / 2, 7, { align: 'center' });"
$content = $content -replace "const maxPdfHeight = A4_HEIGHT - 25;", "const maxPdfHeight = A4_HEIGHT - 20;"
$content = $content -replace "doc\.addImage\(imgData, 'JPEG', xOffset, 5, pdfWidth, pdfHeight\);", "doc.addImage(imgData, 'JPEG', xOffset, 12, pdfWidth, pdfHeight);"

Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "PDF styles patched successfully"
