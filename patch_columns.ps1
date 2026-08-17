$pdfPath = "js/pdf.js"
$content = Get-Content -Raw $pdfPath -Encoding UTF8

# 1. Fix the encoding bug in Chit Taken amounts
$content = $content -replace "â‚¹", "₹"
$content = $content -replace "â,¹", "₹"

# 2. Update Month column color and boldness
$oldMonthCell1 = '<td style="padding: 10px 4px; color: #d97706; font-size: 11px; font-weight: 800; text-align: center; border: 1px solid #475569;">\$\{monthNum\}</td>'
$newMonthCell1 = '<td style="padding: 10px 4px; color: #9a3412; font-size: 13px; font-weight: 900; text-align: center; border: 1px solid #475569;">${monthNum}</td>'
$content = $content -replace $oldMonthCell1, $newMonthCell1

$oldMonthCell2 = '<td style="padding: 10px 4px; color: #d97706; font-size: 11px; font-weight: 800; text-align: center; border: 1px solid #475569;">\$\{row\.monthNum\}</td>'
$newMonthCell2 = '<td style="padding: 10px 4px; color: #9a3412; font-size: 13px; font-weight: 900; text-align: center; border: 1px solid #475569;">${row.monthNum}</td>'
$content = $content -replace $oldMonthCell2, $newMonthCell2

# 3. Remove Paid Amount Column Data
$oldPaidData1 = '<td style="padding: 10px 4px; text-align: right; color: \$\{rowPaidColor\}; font-weight: 900; font-size: 13px; border: 1px solid #475569; width: 65px;">\$\{rowPaidText\}</td>'
$content = $content -replace $oldPaidData1, ''

$oldPaidData2 = '<td style="padding: 10px 4px; text-align: right; color: \$\{rowPaidColor\}; font-weight: 900; font-size: 13px; border: 1px solid #475569; width: 65px;">\$\{rowPaidText\}</td>'
$content = $content -replace $oldPaidData2, ''

# 4. Redistribute Header Widths and Remove Paid Amount Header
# Replace entire thead blocks globally
$oldThead = '<tr style="background-color: #111827;">
                                    <th style="width: 4%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">S.No</th>
                                    <th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>
                                    <th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>
                                    <th style="width: 13%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Scheme</th>
                                    <th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Month</th>
                                    <th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>
                                    <th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount</th>
                                    <th style="width: 10%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Date</th>
                                    <th style="width: 8%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Taken</th>
                                    <th style="width: 3%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>
                                </tr>'

$newThead = '<tr style="background-color: #111827;">
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

$content = $content.Replace($oldThead, $newThead)

# For Global PDF the Month column has a div, so the replace above won't catch it. 
# Let's fix global PDF separately by regex targeting the exact table headers block
$globalRegex = '<th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">\s*<div.*?Month\s*</div>\s*</th>\s*<th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>\s*<th style="width: 11%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Paid Amount</th>'
$globalReplacement = '<th style="width: 6%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">
                                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                            Month
                                        </div>
                                    </th>
                                    <th style="width: 12%; padding: 12px 4px; text-align: right; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Due Amount</th>'

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $globalRegex, $globalReplacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)

# Also fix the global widths for Name and Chit Group and empty
$content = $content -replace '<th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>', '<th style="width: 22%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Name</th>'
$content = $content -replace '<th style="width: 17%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>', '<th style="width: 23%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;">Chit Group</th>'
$content = $content -replace '<th style="width: 3%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>', '<th style="width: 2%; padding: 12px 4px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; border: 1px solid #334155;"></th>'


Set-Content -Path $pdfPath -Value $content -Encoding UTF8
Write-Output "Done"
