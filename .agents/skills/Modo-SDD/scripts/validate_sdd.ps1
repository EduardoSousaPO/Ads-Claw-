<#
.SYNOPSIS
Valida se os arquivos principais de base para o Spec-Driven Development (SDD) foram criados no diretório de projeto informado.
#>

param (
    [string]$Path = "."
)

$sddArtifacts = @("PRD.md", "SPEC.md", "PLAN.md", "TASKS.md")
$missingCount = 0

Write-Host "Iniciando verificação de arquivos estruturais SDD no diretório: $Path" -ForegroundColor Cyan
Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan

foreach ($file in $sddArtifacts) {
    $targetPath = Join-Path -Path $Path -ChildPath $file
    
    if (Test-Path $targetPath) {
        Write-Host "✅ Encontrado: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Ausente: $file" -ForegroundColor Red
        $missingCount++
    }
}

Write-Host "------------------------------------------------------------------" -ForegroundColor Cyan
if ($missingCount -eq 0) {
    Write-Host "SUCESSO: O ambiente está compatível com as premissas estruturais completas do SDD." -ForegroundColor Green
} else {
    Write-Host "AVISO: Estão faltando $missingCount documento(s) essencial(is) do processo de SDD. Siga as orientações da Skill para gerá-los." -ForegroundColor Yellow
}
