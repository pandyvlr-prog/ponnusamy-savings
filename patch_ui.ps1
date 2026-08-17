$indexPath = "index.html"
$content = Get-Content -Raw $indexPath -Encoding UTF8

$oldDropdown = '<div id="quick-report-dropdown-menu" class="dropdown-menu" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 6px; background-color: var(--bg-surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 1000; min-width: 150px; padding: 6px; backdrop-filter: blur\(12px\); -webkit-backdrop-filter: blur\(12px\);">
                                    <button class="btn btn-text-link" id="btn-quick-report-download" style="width: 100%; text-align: left; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px;">
                                        <i data-lucide="download" style="width: 16px; height: 16px; color: var(--primary);"></i> Download PDF
                                    </button>
                                    <button class="btn btn-text-link" id="btn-quick-report-share" style="width: 100%; text-align: left; padding: 8px 12px; font-size: 0.85rem; font-weight: 600; color: var(--text-main); display: flex; align-items: center; gap: 8px; border: none; background: transparent; cursor: pointer; border-radius: 4px; margin-top: 2px;">
                                        <i data-lucide="share-2" style="width: 16px; height: 16px; color: var(--primary);"></i> Share PDF
                                    </button>
                                </div>'

$newDropdown = '<div id="quick-report-dropdown-menu" class="dropdown-menu" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 6px; background-color: var(--bg-surface-elevated); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); z-index: 1000; min-width: 180px; padding: 6px; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);">
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
                                </div>'

# Note: Regex replace used for safe multiline replacement
$content = [System.Text.RegularExpressions.Regex]::Replace($content, $oldDropdown, $newDropdown)

Set-Content -Path $indexPath -Value $content -Encoding UTF8
Write-Output "Patched index.html"
