$url = "https://ypkmtmmmsjcdmnarkmhf.supabase.co"
$apikey = "sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU"

$headers = @{
    "apikey" = $apikey
    "Authorization" = "Bearer $apikey"
    "Content-Type" = "application/json"
}

Write-Host "=== CHECKING ALL ROWS IN user_data TABLE ==="

try {
    $res = Invoke-WebRequest -Uri "$url/rest/v1/user_data?select=user_id,updated_at,workspace_notepad" -Headers $headers -Method Get -ErrorAction Stop
    $body = $res.Content
    Write-Host "Status: $($res.StatusCode)"
    Write-Host "Raw response length: $($body.Length)"
    
    $data = $body | ConvertFrom-Json
    if ($data.Count -eq 0) {
        Write-Host ">>> TABLE IS EMPTY - No rows found! No data has been saved to Supabase."
    } else {
        Write-Host "Found $($data.Count) rows."
        foreach ($row in $data) {
            Write-Host ""
            Write-Host "--- user_id: $($row.user_id) ---"
            Write-Host "updated_at: $($row.updated_at)"
            if ($row.workspace_notepad -ne $null) {
                $wp = $row.workspace_notepad
                $wpStr = $wp | ConvertTo-Json -Depth 2 -Compress
                Write-Host "workspace_notepad keys: $($wpStr.Substring(0, [Math]::Min(500, $wpStr.Length)))"
                # Check if it has installment_cards
                if ($wp.PSObject.Properties.Name -contains "installment_cards") {
                    $cards = $wp.installment_cards
                    Write-Host "  installment_cards type: $($cards.GetType().Name)"
                    if ($cards -is [System.Management.Automation.PSCustomObject]) {
                        Write-Host "  installment_cards keys: $($cards.PSObject.Properties.Name -join ', ')"
                        Write-Host "  Total card count: $($cards.PSObject.Properties.Count)"
                    }
                } else {
                    Write-Host "  >>> NO installment_cards key in workspace_notepad <<<"
                }
                if ($wp.PSObject.Properties.Name -contains "notes") {
                    Write-Host "  notes count: $($wp.notes.Count)"
                } 
            } else {
                Write-Host "workspace_notepad: NULL"
            }
        }
    }
} catch {
    $res = $_.Exception.Response
    if ($res) {
        $stream = $res.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Error - Status: $($res.StatusCode)"
        Write-Host "Body: $body"
    } else {
        Write-Host "Exception: $($_.Exception.Message)"
    }
}
