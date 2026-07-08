$content = Get-Content 'style.css' -Raw
$idx = $content.IndexOf('/* Dark theme: invert colors to turn white bg into black, then screen to drop black */')
if ($idx -ge 0) {
    $endIdx = $content.IndexOf('}', $idx) + 1
    $clean = $content.Substring(0, $endIdx) + "`r`n`r`n"
    Set-Content -Path 'style.css' -Value $clean -Encoding utf8
}
