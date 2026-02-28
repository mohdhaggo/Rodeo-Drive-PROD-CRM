$ErrorActionPreference = 'Stop'
$email='mohdhaggo@gmail.com'
$password='Password@123'
$name='Mohd Haggo'

$pools = aws cognito-idp list-user-pools --region ap-southeast-1 --max-results 60 | ConvertFrom-Json
foreach($pool in $pools.UserPools){
  if($pool.Name -notlike 'amplifyAuthUserPool*'){ continue }

  $poolId = $pool.Id
  Write-Output "POOL $poolId"

  aws cognito-idp admin-get-user --region ap-southeast-1 --user-pool-id $poolId --username $email 1>$null 2>$null
  if($LASTEXITCODE -ne 0){
    aws cognito-idp admin-create-user --region ap-southeast-1 --user-pool-id $poolId --username $email --user-attributes Name=email,Value=$email Name=email_verified,Value=true Name=name,Value="$name" --message-action SUPPRESS 1>$null
    Write-Output 'CREATED'
  } else {
    Write-Output 'EXISTS'
  }

  aws cognito-idp admin-set-user-password --region ap-southeast-1 --user-pool-id $poolId --username $email --password $password --permanent 1>$null
  Write-Output 'PASSWORD_SET'
}
