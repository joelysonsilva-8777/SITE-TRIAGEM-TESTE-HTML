$ErrorActionPreference = 'Stop'
# Shared SVG source keeps mobile and Windows icons consistent.
$scriptPath = Join-Path $PSScriptRoot '..\..\scripts\build-brand.cjs'
& node $scriptPath
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível gerar os ícones MedFast.' }
