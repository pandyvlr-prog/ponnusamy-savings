$appPath = "app.js"
$content = Get-Content -Raw $appPath -Encoding UTF8

# 1. Elements
$oldElements = 'const btnQuickReportDownload = document.getElementById\(''btn-quick-report-download''\);\s*const btnQuickReportShare = document.getElementById\(''btn-quick-report-share''\);'
$newElements = "const btnQuickReportDownload = document.getElementById('btn-quick-report-download');`n    const btnQuickReportDownloadCustom = document.getElementById('btn-quick-report-download-custom');`n    const btnQuickReportShare = document.getElementById('btn-quick-report-share');`n    const btnQuickReportShareCustom = document.getElementById('btn-quick-report-share-custom');"
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldElements, $newElements)

# 2. handleQuickReport signature
$content = [System.Text.RegularExpressions.Regex]::Replace($content, "async function handleQuickReport\(mode,\s*btnElement\)\s*\{", "async function handleQuickReport(mode, btnElement, paperSize = 'a4') {")

# 3. generateGlobalPdfReport call
$oldCall = 'if\s*\(activeFilter\s*===\s*''chit_taken''\)\s*\{\s*await\s*generateChitTakenPdfReport\(monthKey,\s*mode\);\s*\}\s*else\s*\{\s*await\s*generateGlobalPdfReport\(mode\);\s*\}'
$newCall = "if (activeFilter === 'chit_taken') {`n                    await generateChitTakenPdfReport(monthKey, mode);`n                } else {`n                    await generateGlobalPdfReport(mode, paperSize);`n                }"
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldCall, $newCall)

# 4. Event Listeners
$oldEvents = 'if\s*\(btnQuickReportDownload\)\s*\{\s*btnQuickReportDownload\.addEventListener\(''click'',\s*function\(\)\s*\{\s*handleQuickReport\(''download'',\s*this\);\s*\}\);\s*\}\s*if\s*\(btnQuickReportShare\)\s*\{\s*btnQuickReportShare\.addEventListener\(''click'',\s*function\(\)\s*\{\s*handleQuickReport\(''share'',\s*this\);\s*\}\);\s*\}'

$newEvents = "if (btnQuickReportDownload) {`n            btnQuickReportDownload.addEventListener('click', function() { handleQuickReport('download', this, 'a4'); });`n        }`n        if (btnQuickReportDownloadCustom) {`n            btnQuickReportDownloadCustom.addEventListener('click', function() { handleQuickReport('download', this, 'custom'); });`n        }`n        if (btnQuickReportShare) {`n            btnQuickReportShare.addEventListener('click', function() { handleQuickReport('share', this, 'a4'); });`n        }`n        if (btnQuickReportShareCustom) {`n            btnQuickReportShareCustom.addEventListener('click', function() { handleQuickReport('share', this, 'custom'); });`n        }"

$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldEvents, $newEvents)

Set-Content -Path $appPath -Value $content -Encoding UTF8
Write-Output "Patched app.js via Regex"
