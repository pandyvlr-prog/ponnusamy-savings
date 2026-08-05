$url = "https://ypkmtmmmsjcdmnarkmhf.supabase.co"
$apikey = "sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU"

$headers = @{
    "apikey" = $apikey
    "Authorization" = "Bearer $apikey"
}

$columnsToTest = @(
    "members_data",
    "templates_data"
)

foreach ($col in $columnsToTest) {
    try {
        $uri = "$url/rest/v1/user_data?select=$col&limit=1"
        $res = Invoke-WebRequest -Uri $uri -Headers $headers -Method Get -ErrorAction Stop
        Write-Host "Column '$col': EXISTS (Status 200)"
    } catch {
        $res = $_.Exception.Response
        if ($res) {
            $stream = $res.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $body = $reader.ReadToEnd()
            Write-Host "Column '$col': Error - Status $($res.StatusCode), Body: $body"
        } else {
            Write-Host "Column '$col': Error - $($_.Exception.Message)"
        }
    }
}
