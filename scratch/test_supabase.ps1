try {
    $headers = @{
        'apikey' = 'sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU'
        'Authorization' = 'Bearer sb_publishable_qtUyeCpKdqAYYQsIDKiStQ_8ZM39iIU'
    }
    $response = Invoke-WebRequest -Uri 'https://ypkmtmmmsjcdmnarkmhf.supabase.co/rest/v1/user_data?select=workspace_notepad&limit=1' -Headers $headers -Method Get
    Write-Host "Success! Status code: $($response.StatusCode)"
    Write-Host "Body: $($response.Content)"
} catch {
    Write-Host "Error!"
    $res = $_.Exception.Response
    if ($res) {
        $stream = $res.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Status: $($res.StatusCode)"
        Write-Host "Response Body: $body"
    } else {
        Write-Host "Exception: $($_.Exception.Message)"
    }
}
