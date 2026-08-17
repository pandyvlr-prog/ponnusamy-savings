$appPath = "app.js"
$content = Get-Content -Raw $appPath -Encoding UTF8

# 1. Add new button elements
$oldElements = "    const btnQuickReportDownload = document.getElementById\('btn-quick-report-download'\);
    const btnQuickReportShare = document.getElementById\('btn-quick-report-share'\);"
$newElements = "    const btnQuickReportDownload = document.getElementById('btn-quick-report-download');
    const btnQuickReportDownloadCustom = document.getElementById('btn-quick-report-download-custom');
    const btnQuickReportShare = document.getElementById('btn-quick-report-share');
    const btnQuickReportShareCustom = document.getElementById('btn-quick-report-share-custom');"
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldElements, $newElements)

# 2. Update handleQuickReport signature and call
$content = $content -replace "async function handleQuickReport\(mode, btnElement\) \{", "async function handleQuickReport(mode, btnElement, paperSize = 'a4') {"

# 3. Update generateGlobalPdfReport call inside handleQuickReport
$oldCall = "                if \(activeFilter === 'chit_taken'\) \{
                    await generateChitTakenPdfReport\(monthKey, mode\);
                \} else \{
                    await generateGlobalPdfReport\(mode\);
                \}"
$newCall = "                if (activeFilter === 'chit_taken') {
                    await generateChitTakenPdfReport(monthKey, mode);
                } else {
                    await generateGlobalPdfReport(mode, paperSize);
                }"
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldCall, $newCall)

# 4. Add event listeners
$oldEvents = "        if \(btnQuickReportDownload\) \{
            btnQuickReportDownload.addEventListener\('click', function\(\) \{ handleQuickReport\('download', this\); \}\);
        \}
        if \(btnQuickReportShare\) \{
            btnQuickReportShare.addEventListener\('click', function\(\) \{ handleQuickReport\('share', this\); \}\);
        \}"

$newEvents = "        if (btnQuickReportDownload) {
            btnQuickReportDownload.addEventListener('click', function() { handleQuickReport('download', this, 'a4'); });
        }
        if (btnQuickReportDownloadCustom) {
            btnQuickReportDownloadCustom.addEventListener('click', function() { handleQuickReport('download', this, 'custom'); });
        }
        if (btnQuickReportShare) {
            btnQuickReportShare.addEventListener('click', function() { handleQuickReport('share', this, 'a4'); });
        }
        if (btnQuickReportShareCustom) {
            btnQuickReportShareCustom.addEventListener('click', function() { handleQuickReport('share', this, 'custom'); });
        }"
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldEvents, $newEvents)

Set-Content -Path $appPath -Value $content -Encoding UTF8
Write-Output "Patched app.js"
