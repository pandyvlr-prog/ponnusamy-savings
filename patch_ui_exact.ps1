$indexPath = "index.html"
$content = Get-Content -Raw $indexPath -Encoding UTF8

$oldHTML = @"
                                    <button class="btn btn-text-link" id="btn-quick-report-download" style="width: 100%; text-align: left; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px;">
                                        <i data-lucide="download" style="width: 16px; height: 16px; color: var(--primary);"></i> Download PDF
                                    </button>
                                    <button class="btn btn-text-link" id="btn-quick-report-share" style="width: 100%; text-align: left; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px; margin-top: 2px;">
                                        <i data-lucide="share-2" style="width: 16px; height: 16px; color: var(--primary);"></i> Share PDF
                                    </button>
"@

$newHTML = @"
                                    <button class="btn btn-text-link" id="btn-quick-report-download" style="width: 100%; text-align: left; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px;">
                                        <i data-lucide="download" style="width: 16px; height: 16px; color: var(--primary);"></i> Download (A4)
                                    </button>
                                    <button class="btn btn-text-link" id="btn-quick-report-download-custom" style="width: 100%; text-align: left; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px; margin-top: 2px;">
                                        <i data-lucide="download" style="width: 16px; height: 16px; color: var(--primary);"></i> Download (19x15.5)
                                    </button>
                                    <div style="height: 1px; background-color: var(--border); margin: 4px 0;"></div>
                                    <button class="btn btn-text-link" id="btn-quick-report-share" style="width: 100%; text-align: left; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px;">
                                        <i data-lucide="share-2" style="width: 16px; height: 16px; color: var(--primary);"></i> Share (A4)
                                    </button>
                                    <button class="btn btn-text-link" id="btn-quick-report-share-custom" style="width: 100%; text-align: left; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px; margin-top: 2px;">
                                        <i data-lucide="share-2" style="width: 16px; height: 16px; color: var(--primary);"></i> Share (19x15.5)
                                    </button>
"@

$content = $content.Replace($oldHTML, $newHTML)

$content = $content.Replace("min-width: 150px;", "min-width: 180px;")

Set-Content -Path $indexPath -Value $content -Encoding UTF8
Write-Output "Patched UI via strings"
