$ErrorActionPreference = 'Stop'
$secret = (Get-Content 'C:\TikTok_App\.env' | Where-Object { $_ -like 'APP_VIDEO_OPS_INTERNAL_API_SECRET=*' } | ForEach-Object { $_.Substring('APP_VIDEO_OPS_INTERNAL_API_SECRET='.Length) })
$ideaId = 20
$idea = Invoke-RestMethod -Method Get -Uri "http://localhost:8080/api/video-ops/internal/content-ideas/$ideaId" -Headers @{ 'X-Video-Ops-Internal-Secret'=$secret }
$query = if ([string]::IsNullOrWhiteSpace($idea.background_keyword)) { $idea.topic } else { $idea.background_keyword }
$pexelsReq = @{ query = $query; perPage = 5; orientation = 'portrait' } | ConvertTo-Json
$pexels = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/video-ops/internal/pexels/videos/search' -Headers @{ 'X-Video-Ops-Internal-Secret'=$secret; 'Content-Type'='application/json' } -Body $pexelsReq
$pick = $null
foreach ($video in $pexels.videos) {
  foreach ($file in $video.video_files) {
    if ($file.file_type -eq 'video/mp4' -and [int]$file.height -gt [int]$file.width) {
      $pick = $file.link
      break
    }
  }
  if ($pick) { break }
}
if (-not $pick) { throw 'No portrait Pexels video found' }
$clean = [regex]::Replace(([string]$idea.scripts), '[^\x20-\x7E]', ' ')
$clean = [regex]::Replace($clean, '\s+', ' ').Trim()
if ([string]::IsNullOrWhiteSpace($clean)) { $clean = [string]$idea.topic }
if ($clean.Length -gt 120) { $clean = $clean.Substring(0,120) }
$shotstackBody = @{
  timeline = @{
    background = '#0f0f0f'
    tracks = @(
      @{ clips = @(@{ asset = @{ type='video'; src=$pick }; start=0; length=15; fit='cover' }) },
      @{ clips = @(@{ asset = @{ type='title'; text=$clean; style='minimal'; color='#ffffff'; background='rgba(15,15,15,0.55)' }; start=0; length=3; position='center' }) }
    )
  }
  output = @{ format='mp4'; aspectRatio='9:16'; resolution='hd' }
} | ConvertTo-Json -Depth 20
$render = Invoke-RestMethod -Method Post -Uri 'http://localhost:8080/api/video-ops/internal/shotstack/render' -Headers @{ 'X-Video-Ops-Internal-Secret'=$secret; 'Content-Type'='application/json' } -Body $shotstackBody
$renderId = $render.response.id
$patch = @{ shotstack_render_id=$renderId; shotstack_status='queued'; final_video_status='processing'; pipeline_status='rendering_requested'; render_status='prepared'; render_payload=$shotstackBody } | ConvertTo-Json -Depth 20
Invoke-RestMethod -Method Patch -Uri "http://localhost:8080/api/video-ops/internal/content-ideas/$ideaId" -Headers @{ 'X-Video-Ops-Internal-Secret'=$secret; 'Content-Type'='application/json' } -Body $patch | ConvertTo-Json -Depth 10
