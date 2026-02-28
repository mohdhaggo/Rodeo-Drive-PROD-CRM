$ErrorActionPreference = 'Stop'
$root = "C:\Users\M.Haggo\Desktop\Rode-Drive-PROD-CRM\Rodeo-Drive-PROD-CRM"
$outputs = Get-Content "$root\amplify_outputs.json" -Raw | ConvertFrom-Json
$url = $outputs.data.url
$apiKey = $outputs.data.api_key
$headers = @{ 'x-api-key' = $apiKey; 'Content-Type' = 'application/json' }

$createDeptQuery = @'
mutation CreateDept(
  $name: String!,
  $description: String
) {
  createDepartment(input: { name: $name, description: $description }) {
    id
    name
  }
}
'@

$deptBody = @{
  query = $createDeptQuery
  variables = @{
    name = 'Default Department'
    description = 'Auto-seeded for system user'
  }
} | ConvertTo-Json -Depth 10

$deptResp = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $deptBody
$deptId = $deptResp.data.createDepartment.id

$createRoleQuery = @'
mutation CreateRole(
  $name: String!,
  $description: String,
  $departmentId: ID!
) {
  createRole(input: { name: $name, description: $description, departmentId: $departmentId }) {
    id
    name
    departmentId
  }
}
'@

$roleBody = @{
  query = $createRoleQuery
  variables = @{
    name = 'System Admin'
    description = 'Auto-seeded role'
    departmentId = $deptId
  }
} | ConvertTo-Json -Depth 10

$roleResp = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $roleBody
$roleId = $roleResp.data.createRole.id

$createUserQuery = @'
mutation CreateSystemUser(
  $employeeId: String!,
  $name: String!,
  $email: String!,
  $mobile: String!,
  $departmentId: ID!,
  $roleId: ID!,
  $status: SystemUserStatus,
  $dashboardAccess: SystemUserDashboardAccess,
  $createdDate: String!
) {
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
  }) {
    id
    employeeId
    name
    email
    mobile
    departmentId
    roleId
    status
    dashboardAccess
    createdDate
  }
}
'@

$userBody = @{
  query = $createUserQuery
  variables = @{
    employeeId = 'EMP-0001'
    name = 'Mohd Haggo'
    email = 'mohdhaggo@gmail.com'
    mobile = '0000000000'
    departmentId = $deptId
    roleId = $roleId
    status = 'active'
    dashboardAccess = 'allowed'
    createdDate = (Get-Date).ToString('yyyy-MM-dd')
  }
} | ConvertTo-Json -Depth 12

$userResp = Invoke-RestMethod -Method Post -Uri $url -Headers $headers -Body $userBody

$result = @{
  department = $deptResp.data.createDepartment
  role = $roleResp.data.createRole
  systemUser = $userResp.data.createSystemUser
  errors = $userResp.errors
}

$result | ConvertTo-Json -Depth 12
