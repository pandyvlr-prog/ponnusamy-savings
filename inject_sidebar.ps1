$html = Get-Content 'index.html' -Raw
$sidebar = Get-Content 'sidebar_extract.html' -Raw
$searchStr = '<main class="app-container hide-global-header">'
$replaceStr = $sidebar + "
        " + $searchStr
$html = $html.Replace($searchStr, $replaceStr)
Set-Content 'index.html' -Value $html -NoNewline
