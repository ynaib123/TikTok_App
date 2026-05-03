$ErrorActionPreference = 'Stop'

function Get-EnvValue($key) {
  $line = Get-Content 'C:\TikTok_App\.env' | Where-Object { $_ -like "$key=*" } | Select-Object -First 1
  if (-not $line) { return $null }
  return $line.Substring($key.Length + 1)
}

$base = 'http://localhost:8080'
$adminPassword = Get-EnvValue 'APP_ADMIN_PASSWORD'
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$csrf = (Invoke-RestMethod -Uri "$base/api/admins/csrf-token" -WebSession $session).token
$login = Invoke-RestMethod -Method Post -Uri "$base/api/admins/login" -WebSession $session -Headers @{ 'X-XSRF-TOKEN' = $csrf } -ContentType 'application/json' -Body (@{ email = 'admin@tiktokapp.local'; motDePasse = $adminPassword } | ConvertTo-Json)
$jwt = $login.token
function New-Headers() {
  $csrfValue = (Invoke-RestMethod -Uri "$base/api/admins/csrf-token" -WebSession $session).token
  return @{ Authorization = "Bearer $jwt"; 'X-XSRF-TOKEN' = $csrfValue; 'Content-Type' = 'application/json' }
}
function New-ReadHeaders() {
  $csrfValue = (Invoke-RestMethod -Uri "$base/api/admins/csrf-token" -WebSession $session).token
  return @{ Authorization = "Bearer $jwt"; 'X-XSRF-TOKEN' = $csrfValue }
}

$accounts = Invoke-RestMethod -Uri "$base/api/video-ops/tiktok-accounts" -WebSession $session -Headers (New-ReadHeaders)
$openId = $accounts[0].openId
$category = 'codex-chain-' + [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

$main = Invoke-RestMethod -Method Post -Uri "$base/api/video-ops/workflows/main-pipeline" -WebSession $session -Headers (New-Headers) -Body (@{ source='codex-chain'; category=$category; ideaCount=1; tiktokAccountOpenId=$openId; force=$true } | ConvertTo-Json)
Start-Sleep -Seconds 4
$ideas = Invoke-RestMethod -Uri "$base/api/video-ops/content-ideas" -WebSession $session -Headers (New-ReadHeaders)
$idea = $ideas | Where-Object { $_.category -eq $category } | Sort-Object id -Descending | Select-Object -First 1
if (-not $idea) { throw 'Idea not created' }

$script = Invoke-RestMethod -Method Post -Uri "$base/api/video-ops/workflows/script-generation" -WebSession $session -Headers (New-Headers) -Body (@{ contentIdeaId=$idea.id; topic=$idea.topic; category=$idea.category; force=$true; source='codex-chain' } | ConvertTo-Json)
Start-Sleep -Seconds 5
$ideaStatus = Invoke-RestMethod -Uri "$base/api/video-ops/content-ideas/$($idea.id)/status" -WebSession $session -Headers (New-ReadHeaders)

$render = Invoke-RestMethod -Method Post -Uri "$base/api/video-ops/workflows/render-template" -WebSession $session -Headers (New-Headers) -Body (@{ contentIdeaId=$idea.id; topic=$idea.topic; script=$ideaStatus.script; caption=$ideaStatus.caption; keyword=$ideaStatus.backgroundKeyword; force=$true; source='codex-chain' } | ConvertTo-Json)
Start-Sleep -Seconds 5

$history = @()
for ($i = 0; $i -lt 12; $i++) {
  $statusNow = Invoke-RestMethod -Uri "$base/api/video-ops/content-ideas/$($idea.id)/status" -WebSession $session -Headers (New-ReadHeaders)
  $history += [pscustomobject]@{ step='poll'; iteration=$i; pipelineStage=$statusNow.pipelineStage; shotstackStatus=$statusNow.shotstackStatus; finalVideoStatus=$statusNow.finalVideoStatus; publishStatus=$statusNow.publishStatus; shotstackUrl=$statusNow.shotstackUrl }
  if ($statusNow.finalVideoStatus -eq 'ready' -or $statusNow.shotstackStatus -eq 'done') { break }
  $null = Invoke-RestMethod -Method Post -Uri "$base/api/video-ops/workflows/check-shotstack" -WebSession $session -Headers (New-Headers) -Body (@{ contentIdeaId=$idea.id; force=$true; source='codex-chain' } | ConvertTo-Json)
  Start-Sleep -Seconds 10
}

$finalStatus = Invoke-RestMethod -Uri "$base/api/video-ops/content-ideas/$($idea.id)/status" -WebSession $session -Headers (New-ReadHeaders)
$initResult = $null
$initError = $null
if ($finalStatus.finalVideoStatus -eq 'ready') {
  try {
    $initResult = Invoke-RestMethod -Method Post -Uri "$base/api/video-ops/workflows/init-publish" -WebSession $session -Headers (New-Headers) -Body (@{ contentIdeaId=$idea.id; force=$true; source='codex-chain' } | ConvertTo-Json)
  } catch {
    $initError = if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message } else { $_.Exception.Message }
  }
}

$result = [pscustomobject]@{
  category = $category
  openId = $openId
  ideaId = $idea.id
  mainRunId = $main.runId
  scriptRunId = $script.runId
  renderRunId = $render.runId
  finalStatus = $finalStatus
  pollHistory = $history
  initResult = $initResult
  initError = $initError
}
$result | ConvertTo-Json -Depth 8
