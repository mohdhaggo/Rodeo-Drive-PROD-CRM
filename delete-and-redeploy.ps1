# Delete failed CloudFormation stack and trigger fresh deployment

$stackName = "amplify-d2twgrdrz02e5i-main-branch-74768dea37"
$region = "ap-southeast-1"

Write-Host "⚠️  WARNING: This will DELETE the entire stack!" -ForegroundColor Red
Write-Host "Press Ctrl+C now to cancel, or" -ForegroundColor Yellow
Write-Host "Press Enter to continue with deletion..." -ForegroundColor Yellow
Read-Host

Write-Host "`n🗑️  Step 1: Deleting failed CloudFormation stack..." -ForegroundColor Yellow
aws cloudformation delete-stack `
    --stack-name $stackName `
    --region $region

Write-Host "`nWaiting for stack deletion to complete (this may take 10-15 minutes)..." -ForegroundColor Cyan

# Monitor deletion
$maxAttempts = 60
for ($i = 1; $i -le $maxAttempts; $i++) {
    Start-Sleep -Seconds 15
    
    $status = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --region $region `
        --query "Stacks[0].StackStatus" `
        --output text 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✓ Stack deleted successfully!" -ForegroundColor Green
        break
    }
    
    Write-Host "[$i/$maxAttempts] Current Status: $status" -ForegroundColor Cyan
    
    if ($status -eq "DELETE_COMPLETE") {
        Write-Host "✓ Stack deletion completed!" -ForegroundColor Green
        break
    }
    
    if ($status -eq "DELETE_FAILED") {
        Write-Host "❌ Stack deletion failed. Check AWS Console." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n✓ Stack deletion complete!" -ForegroundColor Green
Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to AWS Amplify Console"
Write-Host "2. Find your app: Rodeo-Drive-PROD-CRM"
Write-Host "3. Trigger a new deployment on the 'main' branch"
Write-Host "4. Wait for it to complete (15-20 minutes)"
Write-Host "`nThe deployment will recreate all resources fresh."
