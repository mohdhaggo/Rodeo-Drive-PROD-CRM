# Fix Amplify CloudFormation Stack in UPDATE_ROLLBACK_FAILED state

$stackName = "amplify-d2twgrdrz02e5i-main-branch-74768dea37"
$region = "ap-southeast-1"

Write-Host "Step 1: Continuing rollback for main stack..." -ForegroundColor Yellow
aws cloudformation continue-update-rollback `
    --stack-name $stackName `
    --region $region `
    --resources-to-skip "auth179371D7"

Write-Host "`nWaiting 30 seconds for operation to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 30

Write-Host "`nStep 2: Checking stack status..." -ForegroundColor Yellow
aws cloudformation describe-stacks `
    --stack-name $stackName `
    --region $region `
    --query "Stacks[0].StackStatus" `
    --output text

Write-Host "`nStep 3: Attempting to continue rollback for nested auth stack..." -ForegroundColor Yellow
$nestedStackName = "amplify-d2twgrdrz02e5i-main-branch-74768dea37-auth179371D7-IC8G60MYUF6T"
aws cloudformation continue-update-rollback `
    --stack-name $nestedStackName `
    --region $region `
    --resources-to-skip "amplifyAuthUserPool4BA7F805" 2>$null

Write-Host "`n=== Next Steps ===" -ForegroundColor Green
Write-Host "1. Wait for rollback to complete (may take 5-10 minutes)"
Write-Host "2. Check stack status: aws cloudformation describe-stacks --stack-name $stackName --region $region --query 'Stacks[0].StackStatus'"
Write-Host "3. Once status is ROLLBACK_COMPLETE or UPDATE_ROLLBACK_COMPLETE, redeploy via Amplify console"
Write-Host "`n4. If this fails, you may need to delete and recreate the stack (see Option 2 in comments)"
