$html = Get-Content 'index.html' -Raw
$extract = Get-Content 'calc_extract.html' -Raw

# 1. Replace screen-calc to screen-notes with calc_extract.html
$start = $html.IndexOf('<section id="screen-calc"')
$notesStart = $html.IndexOf('<section id="screen-notes"', $start)
$notesEnd = $html.IndexOf('</section>', $notesStart) + '</section>'.Length

$html = $html.Substring(0, $start) + $extract + "
            </section>
" + $html.Substring($notesEnd)

# 2. Add calculator button to header-action-chips
$searchStr = '<div class="header-action-chips" id="header-action-chips">'
$replaceStr = $searchStr + "
                                <button class=""header-chip"" id=""btn-global-calc"" title=""Calculator"">
                                    <i data-lucide=""calculator""></i>
                                </button>"
$html = $html.Replace($searchStr, $replaceStr)

# 3. Remove sidebar link for calculator
$sidebarLinkStart = $html.IndexOf('<a href="#" class="sidebar-link" data-target="screen-calc">')
if ($sidebarLinkStart -ge 0) {
    $sidebarLinkEnd = $html.IndexOf('</a>', $sidebarLinkStart) + '</a>'.Length
    $html = $html.Substring(0, $sidebarLinkStart) + $html.Substring($sidebarLinkEnd).TrimStart()
}

Set-Content 'index.html' -Value $html -NoNewline
