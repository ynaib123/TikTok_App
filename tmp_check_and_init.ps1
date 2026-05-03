$ErrorActionPreference = 'Stop'
$base='http://localhost:8080'
$ideaId=20
$pwd=(Get-Content 'C:\TikTok_App\.env' | Where-Object { $_ -like 'APP_ADMIN_PASSWORD=*' } | ForEach-Object { $_.Substring('APP_ADMIN_PASSWORD='.Length) })
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrf=(Invoke-RestMethod -Uri "$base/api/admins/csrf-token" -WebSession $session).token
$login=Invoke-RestMethod -Method Post -Uri "$base/api/admins/login" -WebSession $session -Headers @{ 'X-XSRF-TOKEN'=$csrf } -ContentType 'application/json' -Body (@{ email='admin@tiktokapp.local'; motDePasse=$pwd } | ConvertTo-Json)
$jwt=$login.token
function HRead(){ @{ Authorization="Bearer $jwt"; 'X-XSRF-TOKEN'=(Invoke-RestMethod -Uri "$base/api/admins/csrf-token" -WebSession $session).token } }
function HWrite(){ @{ Authorization="Bearer $jwt"; 'X-XSRF-TOKEN'=(Invoke-RestMethod -Uri "$base/api/admins/csrf-token" -WebSession $session).token; 'Content-Type'='application/json' } }
$poll=@()
for($i=0;$i -lt 18;$i++){
  $st=Invoke-RestMethod -Uri "$base/api/video-ops/content-ideas/$ideaId/status" -WebSession $session -Headers (HRead)
  $poll += [pscustomobject]@{i=$i; stage=$st.pipelineStage; shotstack=$st.shotstackStatus; final=$st.finalVideoStatus; url=$st.shotstackUrl}
  if($st.finalVideoStatus -eq 'ready' -or $st.shotstackStatus -eq 'done'){ break }
  try {
    $null=Invoke-RestMethod -Method Post -Uri "$base/api/video-ops/workflows/check-shotstack" -WebSession $session -Headers (HWrite) -Body (@{ contentIdeaId=$ideaId; force=$true; source='codex-chain' } | ConvertTo-Json)
  } catch {
    $poll += [pscustomobject]@{i=$i; error=(if($_.ErrorDetails.Message){$_.ErrorDetails.Message}else{$_.Exception.Message})}
  }
  Start-Sleep -Seconds 10
}
$final=Invoke-RestMethod -Uri "$base/api/video-ops/content-ideas/$ideaId/status" -WebSession $session -Headers (HRead)
$init=$null
$initErr=$null
if($final.finalVideoStatus -eq 'ready'){
  try{
    $init=Invoke-RestMethod -Method Post -Uri "$base/api/video-ops/workflows/init-publish" -WebSession $session -Headers (HWrite) -Body (@{ contentIdeaId=$ideaId; force=$true; source='codex-chain' } | ConvertTo-Json)
  } catch {
    $initErr = if($_.ErrorDetails.Message){$_.ErrorDetails.Message}else{$_.Exception.Message}
  }
}
[pscustomobject]@{ poll=$poll; final=$final; init=$init; initError=$initErr } | ConvertTo-Json -Depth 8
