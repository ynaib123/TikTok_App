param(
    [string]$ContainerName = "tiktok-app-n8n",
    [string]$WorkflowsDir = "$PSScriptRoot/n8n-workflows",
    [switch]$Export
)

$ErrorActionPreference = "Stop"

$workflows = @(
    @{ Id = "q8OpzbRoQe8W8TzY"; File = "idea-script-fused.json" },
    @{ Id = "SAn6Iepn4rCpkHJg"; File = "render-template-video.json" },
    @{ Id = "renderRemotion01"; File = "render-template-video-remotion.json" },
    @{ Id = "FVCRU7rTMuMCR1J3"; File = "check-shotstack.json" },
    @{ Id = "ql0Tg97q1cZ12aee"; File = "init-publish-tiktok.json" }
)

if ($Export) {
    Write-Host "Exporting workflows from $ContainerName into $WorkflowsDir"
    docker exec $ContainerName sh -c "mkdir -p /tmp/wf-export"
    foreach ($wf in $workflows) {
        Write-Host "Exporting $($wf.Id) -> $($wf.File)"
        docker exec $ContainerName n8n export:workflow --id=$($wf.Id) --output="/tmp/wf-export/$($wf.File)"
        docker cp "$($ContainerName):/tmp/wf-export/$($wf.File)" "$WorkflowsDir/$($wf.File)"
    }
    Write-Host "Export complete."
    return
}

Write-Host "Publishing workflows from $WorkflowsDir into $ContainerName"
docker exec $ContainerName sh -c "mkdir -p /tmp/wf-import"
foreach ($wf in $workflows) {
    $localPath = Join-Path $WorkflowsDir $wf.File
    if (-not (Test-Path $localPath)) {
        throw "Missing workflow file: $localPath"
    }
    Write-Host "Importing $($wf.File)"
    docker cp $localPath "$($ContainerName):/tmp/wf-import/$($wf.File)"
    docker exec $ContainerName n8n import:workflow --input="/tmp/wf-import/$($wf.File)"
    Write-Host "Activating $($wf.Id)"
    docker exec $ContainerName n8n update:workflow --id=$($wf.Id) --active=true
}

Write-Host "Done. Restart the n8n container if webhook routing is stale: docker restart $ContainerName"
