$ErrorActionPreference = 'Stop'
$root = "C:\Users\M.Haggo\Desktop\Rode-Drive-PROD-CRM\Rodeo-Drive-PROD-CRM"
$outputs = Get-Content "$root\amplify_outputs.json" -Raw | ConvertFrom-Json
$url = $outputs.data.url
$apiKey = $outputs.data.api_key
$headers = @{ 'x-api-key' = $apiKey; 'Content-Type' = 'application/json' }

$oldPoolId = 'ap-southeast-1_KpgCf5P7L'
$usersJson = aws cognito-idp list-users --region ap-southeast-1 --user-pool-id $oldPoolId --query "Users[].{Email:Attributes[?Name=='email'].Value|[0],Name:Attributes[?Name=='name'].Value|[0],Status:UserStatus}"
$oldUsers = $usersJson | ConvertFrom-Json

$lookupQuery = @'
query Lookup {
  listDepartments { items { id name } }
  listRoles { items { id name departmentId } }
  listSystemUsers { items { id email employeeId name } }
}
'@
$lookupBody = @{ query = $lookupQuery } | ConvertTo-Json -Depth 10
$lookupResp = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $lookupBody

$departmentId = $lookupResp.data.listDepartments.items[0].id
$roleId = $lookupResp.data.listRoles.items[0].id

if (-not $departmentId -or -not $roleId) {
  throw 'Missing Department/Role records in current table.'
}

$existingEmails = @{}
foreach ($u in $lookupResp.data.listSystemUsers.items) {
  if ($u.email) { $existingEmails[$u.email.ToLower()] = $true }
}

$createUserQuery = @'
mutation CreateSystemUser($employeeId: String!, $name: String!, $email: String!, $mobile: String!, $departmentId: ID!, $roleId: ID!, $status: SystemUserStatus, $dashboardAccess: SystemUserDashboardAccess, $createdDate: String!) {
  createSystemUser(input: {
    employeeId: $employeeId,
    name: $name,
    email: $email,
    mobile: $mobile,
    departmentId: $departmentId,
    roleId: $roleId,
    status: $status,
    dashboardAccess: $dashboardAccess,
    createdDate: $createdDate
  }) { id email employeeId name }
}
'@

$inserted = @()
$skipped = @()
$counter = 2

foreach ($oldUser in $oldUsers) {
  if (-not $oldUser.Email) { continue }
  $emailKey = $oldUser.Email.ToLower()

  if ($existingEmails.ContainsKey($emailKey)) {
    $skipped += $oldUser.Email
    continue
  }

  $employeeId = "EMP-" + $counter.ToString('0000')
  $counter++

  $name = if ($oldUser.Name) { $oldUser.Name } else { ($oldUser.Email -split '@')[0] }

  $vars = @{
    employeeId = $employeeId
    name = $name
    email = $oldUser.Email
    mobile = '0000000000'
    departmentId = $departmentId
    roleId = $roleId
    status = 'active'
    dashboardAccess = 'allowed'
    createdDate = (Get-Date).ToString('yyyy-MM-dd')
  }

  $body = @{ query = $createUserQuery; variables = $vars } | ConvertTo-Json -Depth 12
  $resp = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $body

  if ($resp.errors) {
    throw ("Failed to insert " + $oldUser.Email + ": " + ($resp.errors | ConvertTo-Json -Depth 10))
  }

  $inserted += $resp.data.createSystemUser
  $existingEmails[$emailKey] = $true
}

@{
  inserted = $inserted
  skipped = $skipped
} | ConvertTo-Json -Depth 12
