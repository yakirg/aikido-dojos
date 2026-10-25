$token = Read-Host "DuckDNS token (not stored)"
$env:DUCKDNS_TOKEN = $token
Set-Location $PSScriptRoot
& "$env:USERPROFILE\caddy-duckdns\caddy.exe" run --config Caddyfile
