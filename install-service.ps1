# Run from an elevated (Administrator) PowerShell in the repo root.
# Installs the app as a Windows service "AikidoDojos" using WinSW; auto-starts at boot and restarts on failure.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$dir = Join-Path $root 'service'
New-Item -ItemType Directory -Force $dir | Out-Null
$exe = Join-Path $dir 'AikidoDojos.exe'
if (-not (Test-Path $exe)) {
    Invoke-WebRequest 'https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe' -OutFile $exe
}
$java = (Get-Command java).Source
$jar = Join-Path $root 'backend\build\libs\backend-0.0.1-SNAPSHOT.jar'
$dist = ((Join-Path $root 'frontend\dist') -replace '\\', '/') + '/'
@"
<service>
  <id>AikidoDojos</id>
  <name>Aikido Dojos</name>
  <description>Aikido dojo tracker (Spring Boot)</description>
  <executable>$java</executable>
  <arguments>-jar "$jar"</arguments>
  <workingdirectory>$root</workingdirectory>
  <env name="FRONTEND_DIST" value="$dist"/>
  <startmode>Automatic</startmode>
  <onfailure action="restart" delay="10 sec"/>
  <log mode="roll"/>
</service>
"@ | Set-Content -Encoding UTF8 (Join-Path $dir 'AikidoDojos.xml')
Get-NetTCPConnection -LocalPort 8090 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
Unregister-ScheduledTask -TaskName AikidoDojos -Confirm:$false -ErrorAction SilentlyContinue
& $exe install
& $exe start
Write-Host 'Service AikidoDojos installed and started. Logs: service\AikidoDojos.out.log'
