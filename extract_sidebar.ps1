$html = Get-Content 'index.html.messedup' -Raw
# Find the second occurrence of desktop-sidebar
$first = $html.IndexOf('<aside id="desktop-sidebar"')
$second = $html.IndexOf('<aside id="desktop-sidebar"', $first + 1)

$start = $second
$endStr = '<main class="app-container">'
$end = $html.IndexOf($endStr, $start)
$contentToInsert = $html.Substring($start, $end - $start)

Set-Content 'sidebar_extract.html' -Value $contentToInsert -NoNewline
