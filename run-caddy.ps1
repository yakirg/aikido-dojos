if (-not $env:DUCKDNS_TOKEN) {
    $env:DUCKDNS_TOKEN = Read-Host "DuckDNS token (not stored)"
}
Set-Location $PSScriptRoot
& "$env:USERPROFILE\caddy-duckdns\caddy.exe" run --config Caddyfile
