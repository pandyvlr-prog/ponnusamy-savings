$content = [System.IO.File]::ReadAllText("app.js")
$content = $content.Replace("const chk = row.querySelector('.chk-status-btn');", "const chk = row.querySelector('.chk-status-btn, .status-badge-pill.paid, .status-badge-pill.partial, .status-badge-pill.pending');")
[System.IO.File]::WriteAllText("app.js", $content)
Write-Host "Done"
