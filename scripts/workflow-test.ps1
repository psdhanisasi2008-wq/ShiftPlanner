$base = 'http://localhost:8080/api'
$script:pass = 0
$script:fail = 0

function Call([string]$Method, [string]$Path, $Body = $null) {
    $p = @{ Uri = "$base$Path"; Method = $Method; UseBasicParsing = $true }
    if ($null -ne $Body) { $p.Body = ($Body | ConvertTo-Json); $p.ContentType = 'application/json' }
    try {
        $r = Invoke-WebRequest @p
        $data = $null
        if ($r.Content) { $data = $r.Content | ConvertFrom-Json }
        return [pscustomobject]@{ Status = [int]$r.StatusCode; Data = $data }
    } catch {
        $status = 0
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        $data = $null
        $body = $null
        if ($_.ErrorDetails.Message) { $body = $_.ErrorDetails.Message }
        elseif ($_.Exception.Response) {
            try { $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream()); $body = $sr.ReadToEnd() } catch { }
        }
        if ($body) { try { $data = $body | ConvertFrom-Json } catch { } }
        return [pscustomobject]@{ Status = $status; Data = $data }
    }
}

function Check([string]$Name, [bool]$Ok) {
    if ($Ok) { $script:pass++; Write-Host "PASS  $Name" -ForegroundColor Green }
    else { $script:fail++; Write-Host "FAIL  $Name" -ForegroundColor Red }
}

function GetRoster($id) { (Call 'GET' "/rosters/$id").Data }
function GetSwap($id) { (Call 'GET' "/swaps/$id").Data }

$probe = Call 'GET' '/swaps'
if ($probe.Status -ne 200) { Write-Host 'App is not reachable on http://localhost:8080. Start it first.' -ForegroundColor Red; exit 1 }

$sfx = Get-Date -Format 'HHmmss'

# ---- Setup ----
$morning = (Call 'POST' '/shifts' @{ shiftName = "T-Morning-$sfx"; startTime = '06:00'; endTime = '14:00' }).Data.id
$midday  = (Call 'POST' '/shifts' @{ shiftName = "T-Midday-$sfx"; startTime = '10:00'; endTime = '18:00' }).Data.id
$empA = (Call 'POST' '/employees' @{ employeeCode = "TA$sfx"; name = "Test A $sfx"; email = "ta$sfx@test.local"; role = 'EMPLOYEE' }).Data.id
$empB = (Call 'POST' '/employees' @{ employeeCode = "TB$sfx"; name = "Test B $sfx"; email = "tb$sfx@test.local"; role = 'EMPLOYEE' }).Data.id
Check 'Setup: shifts and employees created' ($morning -and $midday -and $empA -and $empB)
if (-not ($morning -and $midday -and $empA -and $empB)) { exit 1 }

$d1 = '2030-03-04'; $d2 = '2030-03-05'; $d3 = '2030-03-06'
$r1 = (Call 'POST' '/rosters' @{ employeeId = $empA; shiftId = $morning; workDate = $d1 }).Data.id
$r2 = (Call 'POST' '/rosters' @{ employeeId = $empA; shiftId = $morning; workDate = $d2 }).Data.id
$r3 = (Call 'POST' '/rosters' @{ employeeId = $empA; shiftId = $morning; workDate = $d3 }).Data.id
$r4 = (Call 'POST' '/rosters' @{ employeeId = $empB; shiftId = $midday;  workDate = $d3 }).Data.id
Check 'Setup: four roster entries created' ($r1 -and $r2 -and $r3 -and $r4)

# ---- Validation and roster rules ----
$x = Call 'POST' '/employees' @{ employeeCode = ''; name = ''; email = 'bad'; role = 'EMPLOYEE' }
Check 'Invalid employee returns 400' ($x.Status -eq 400)

$x = Call 'POST' '/rosters' @{ employeeId = $empA; shiftId = $midday; workDate = $d1 }
Check 'Overlapping shift for the same employee returns 409' ($x.Status -eq 409)

$x = Call 'POST' '/rosters' @{ employeeId = 999999; shiftId = $morning; workDate = $d1 }
Check 'Unknown employee returns 404' ($x.Status -eq 404)

# ---- Swap creation rules ----
$x = Call 'POST' '/swaps' @{ rosterId = $r1; requesterId = $empA; colleagueId = $empA }
Check 'Self-swap returns 400' ($x.Status -eq 400)

$x = Call 'POST' '/swaps' @{ rosterId = $r1; requesterId = $empB; colleagueId = $empA }
Check 'Requester not assigned to the roster returns 409' ($x.Status -eq 409)

# ---- Happy path: swap applied only after BOTH approvals ----
$s1 = (Call 'POST' '/swaps' @{ rosterId = $r1; requesterId = $empA; colleagueId = $empB; reason = 'Test swap' }).Data
Check 'Swap created as PENDING_COLLEAGUE' ($s1.status -eq 'PENDING_COLLEAGUE' -and -not $s1.colleagueApproved -and -not $s1.managerApproved)

$dup = Call 'POST' '/swaps' @{ rosterId = $r1; requesterId = $empA; colleagueId = $empB }
Check 'Second active swap for the same roster returns 409' ($dup.Status -eq 409)

$x = Call 'PUT' "/swaps/$($s1.id)/manager/approve"
Check 'Manager approval before colleague acceptance returns 409' ($x.Status -eq 409)
Check 'Early approval message is exact' ($x.Data.message -eq 'Manager approval cannot be given until the colleague accepts the swap request.')
Check 'Roster unchanged after early approval' ((GetRoster $r1).employeeId -eq $empA)

$x = Call 'PUT' "/swaps/$($s1.id)/accept"
Check 'Colleague accepts: status COLLEAGUE_ACCEPTED' ($x.Status -eq 200 -and $x.Data.status -eq 'COLLEAGUE_ACCEPTED')
$ro = GetRoster $r1
Check 'Swap NOT applied after colleague approval only' ($ro.employeeId -eq $empA -and $ro.status -eq 'ASSIGNED')

$x = Call 'PUT' "/swaps/$($s1.id)/manager/approve"
Check 'Manager approves: status COMPLETED' ($x.Status -eq 200 -and $x.Data.status -eq 'COMPLETED' -and $x.Data.managerApproved)
$ro = GetRoster $r1
Check 'Swap applied after BOTH approvals (roster now employee B, SWAPPED)' ($ro.employeeId -eq $empB -and $ro.status -eq 'SWAPPED')

$x = Call 'PUT' "/swaps/$($s1.id)/manager/approve"
Check 'Approving a completed swap again returns 409' ($x.Status -eq 409)

# ---- Decline path ----
$s2 = (Call 'POST' '/swaps' @{ rosterId = $r2; requesterId = $empA; colleagueId = $empB }).Data
$x = Call 'PUT' "/swaps/$($s2.id)/decline"
Check 'Colleague declines: status COLLEAGUE_DECLINED' ($x.Status -eq 200 -and $x.Data.status -eq 'COLLEAGUE_DECLINED')
$x = Call 'PUT' "/swaps/$($s2.id)/manager/approve"
Check 'Manager cannot approve a declined swap (409)' ($x.Status -eq 409)
Check 'Roster unchanged after decline' ((GetRoster $r2).employeeId -eq $empA)

# ---- Manager reject path ----
$s3 = (Call 'POST' '/swaps' @{ rosterId = $r2; requesterId = $empA; colleagueId = $empB }).Data
Check 'New swap allowed after a declined one' ($s3.status -eq 'PENDING_COLLEAGUE')
$x = Call 'PUT' "/swaps/$($s3.id)/manager/reject"
Check 'Manager cannot reject before colleague accepts (409)' ($x.Status -eq 409)
Call 'PUT' "/swaps/$($s3.id)/accept" | Out-Null
$x = Call 'PUT' "/swaps/$($s3.id)/manager/reject"
Check 'Manager rejects: status MANAGER_REJECTED' ($x.Status -eq 200 -and $x.Data.status -eq 'MANAGER_REJECTED')
Check 'Roster unchanged after manager rejection' ((GetRoster $r2).employeeId -eq $empA)

# ---- Final validation at approval: colleague has an overlapping shift ----
$s4 = (Call 'POST' '/swaps' @{ rosterId = $r3; requesterId = $empA; colleagueId = $empB }).Data
Call 'PUT' "/swaps/$($s4.id)/accept" | Out-Null
$x = Call 'PUT' "/swaps/$($s4.id)/manager/approve"
Check 'Approval blocked when colleague has an overlapping shift (409)' ($x.Status -eq 409)
$ro = GetRoster $r3
Check 'Failed validation leaves roster unchanged' ($ro.employeeId -eq $empA -and $ro.status -eq 'ASSIGNED')
$sw = GetSwap $s4.id
Check 'Failed validation leaves swap COLLEAGUE_ACCEPTED' ($sw.status -eq 'COLLEAGUE_ACCEPTED' -and -not $sw.managerApproved)
$x = Call 'PUT' "/swaps/$($s4.id)/manager/reject"
Check 'Manager can still reject after a failed approval' ($x.Status -eq 200 -and $x.Data.status -eq 'MANAGER_REJECTED')

# ---- Routing errors ----
$x = Call 'GET' '/rosters/date/abc'
Check 'Bad date returns 400' ($x.Status -eq 400)

Write-Host ''
Write-Host "Passed: $script:pass   Failed: $script:fail"
if ($script:fail -gt 0) { exit 1 }