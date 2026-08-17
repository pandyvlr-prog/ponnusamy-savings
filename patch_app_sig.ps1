$appPath = "app.js"
$content = Get-Content -Raw $appPath -Encoding UTF8

$content = $content.Replace("async function handleQuickReport(mode, btnElement) {", "async function handleQuickReport(mode, btnElement, paperSize = 'a4') {")

Set-Content -Path $appPath -Value $content -Encoding UTF8
Write-Output "Patched handleQuickReport signature"
