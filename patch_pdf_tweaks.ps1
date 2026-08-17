$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

# 1. Page Number Position (Center with Logo)
$content = $content -replace "doc.text\(\`\$\{idx \+ 1\}\`, A4_WIDTH / 2, 7, \{ align: 'center' \}\);", "doc.text(`${idx + 1}`, A4_WIDTH / 2, 24, { align: 'center' });"

# 2. Name column styling (Black, Bold, Larger)
# Single group
$content = $content -replace '<td style="padding: 10px 4px; color: #1e3a8a; font-weight: 900; font-size: 13.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">\$\{member.name\}</td>', '<td style="padding: 10px 4px; color: #000000; font-weight: 900; font-size: 14.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">${member.name}</td>'
# Global group
$content = $content -replace '<td style="padding: 10px 4px; color: #1e3a8a; font-weight: 900; font-size: 13.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">\$\{row.name\}</td>', '<td style="padding: 10px 4px; color: #000000; font-weight: 900; font-size: 14.5px; text-align: left; text-transform: uppercase; word-break: break-word; white-space: normal; border: 1px solid #475569;">${row.name}</td>'

# 3. Chit Group size reduction
$content = $content -replace '<td style="padding: 10px 4px; color: #111827; font-size: 12px; font-weight: 900; text-align: center; border: 1px solid #475569;">\$\{group.name\}</td>', '<td style="padding: 10px 4px; color: #334155; font-size: 10.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">${group.name}</td>'
$content = $content -replace '<td style="padding: 10px 4px; color: #111827; font-size: 12px; font-weight: 900; text-align: center; border: 1px solid #475569;">\$\{row.groupName\}</td>', '<td style="padding: 10px 4px; color: #334155; font-size: 10.5px; font-weight: 700; text-align: center; border: 1px solid #475569;">${row.groupName}</td>'

# 4. Increase Due Amount and Chit Taken text
$content = $content -replace '<td style="padding: 10px 4px; text-align: right; color: \$\{rowDueColor\}; font-weight: 900; font-size: 15px; border: 1px solid #475569;">\$\{rowDueText\}</td>', '<td style="padding: 10px 4px; text-align: right; color: ${rowDueColor}; font-weight: 900; font-size: 16.5px; border: 1px solid #475569;">${rowDueText}</td>'

$content = $content -replace '<span style="background-color: #f3e8ff; color: #581c87; padding: 4px 10px; border-radius: 99px; font-size: 13px; font-weight: 900;">\$\{chitAmountStr\} / \$\{chitModeStr\}</span>', '<span style="background-color: #f3e8ff; color: #4c1d95; padding: 4px 10px; border-radius: 99px; font-size: 14.5px; font-weight: 900;">${chitAmountStr} / ${chitModeStr}</span>'
$content = $content -replace '<span style="background-color: #f3e8ff; color: #581c87; padding: 4px 10px; border-radius: 99px; font-size: 13px; font-weight: 900;">\$\{row.chitTakenDisplay\}</span>', '<span style="background-color: #f3e8ff; color: #4c1d95; padding: 4px 10px; border-radius: 99px; font-size: 14.5px; font-weight: 900;">${row.chitTakenDisplay}</span>'

# Make the Due Amount color darker red for contrast
$content = $content -replace "let rowDueColor = !isPaid \? '#b91c1c' : 'transparent';", "let rowDueColor = !isPaid ? '#991b1b' : 'transparent';"

# 5. Adjust Header Widths to reduce Name and Group empty space
# Previous Header: Name 22%, Chit Group 23%, Scheme 13%, Month 6%, Due Amount 12%, Date 10%, Chit Taken 8%, empty 2%
# New Header: Name 18%, Chit Group 18%, Scheme 13%, Month 6%, Due Amount 15%, Date 13%, Chit Taken 11%, empty 6% 
$oldThead = '<tr style="background-color: #111827;">
                                    <th style="width: 4%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>
                                    <th style="width: 22%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>
                                    <th style="width: 23%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>
                                    <th style="width: 13%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>
                                    <th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Month</th>
                                    <th style="width: 12%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>
                                    <th style="width: 10%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>
                                    <th style="width: 8%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>
                                    <th style="width: 2%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>
                                </tr>'

$newThead = '<tr style="background-color: #111827;">
                                    <th style="width: 4%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>
                                    <th style="width: 18%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>
                                    <th style="width: 18%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>
                                    <th style="width: 13%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>
                                    <th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Month</th>
                                    <th style="width: 15%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>
                                    <th style="width: 12%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>
                                    <th style="width: 11%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>
                                    <th style="width: 3%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>
                                </tr>'

$content = $content.Replace($oldThead, $newThead)

# The global report has a custom Month header with SVG, so we need to manually adjust widths there too
$content = $content -replace '<th style="width: 22%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>', '<th style="width: 18%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>'
$content = $content -replace '<th style="width: 23%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>', '<th style="width: 18%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>'
$content = $content -replace '<th style="width: 12%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>', '<th style="width: 15%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>'
$content = $content -replace '<th style="width: 10%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>', '<th style="width: 12%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>'
$content = $content -replace '<th style="width: 8%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>', '<th style="width: 11%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>'
$content = $content -replace '<th style="width: 2%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>', '<th style="width: 3%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>'


Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "Patched specific layout changes"
