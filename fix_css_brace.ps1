$content = [System.IO.File]::ReadAllText("style.css", [System.Text.Encoding]::UTF8)
$content = $content.Replace("    gap: 4px;`r`n}`r`n}", "    gap: 4px;`r`n}")
$content = $content.Replace("    gap: 4px;`n}`n}", "    gap: 4px;`n}")
[System.IO.File]::WriteAllText("style.css", $content, [System.Text.Encoding]::UTF8)
Write-Host "Done"
