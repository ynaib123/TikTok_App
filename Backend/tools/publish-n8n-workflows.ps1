param(
    [string]$ContainerName = "tiktok-app-n8n",
    [string]$InputFile = "/home/node/.n8n/all-workflows-export.json"
)

$workflowIds = @(
    "q8OpzbRoQe8W8TzY", # idea-script-generation-fused
    "4bkv7WDZfakybrD3", # script-generation-maintainable
    "FVCRU7rTMuMCR1J3", # check-shotstack-fixed
    "SAn6Iepn4rCpkHJg", # render-professional-quality
    "ql0Tg97q1cZ12aee"  # init-publish-tiktok-fixed
)

Write-Host "Importing workflows from $InputFile into $ContainerName"
docker exec $ContainerName n8n import:workflow --input=$InputFile

foreach ($id in $workflowIds) {
    Write-Host "Publishing workflow $id"
    docker exec $ContainerName n8n publish:workflow --id=$id
    Write-Host "Activating workflow $id"
    docker exec $ContainerName n8n update:workflow --id=$id --active=true
}

Write-Host "Restarting $ContainerName"
docker restart $ContainerName
