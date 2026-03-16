# ============================================================
# DEPLOY ADSCLAW BACKEND - VPS HOSTINGER
# Execute este script no PowerShell do seu computador
# Pré-requisito: ter o SSH instalado (já vem no Windows 10/11)
# ============================================================
#
# USO:
#   1. Abra o PowerShell como Administrador
#   2. Execute: .\deploy_vps.ps1 -SenhRoot "SUA_SENHA_ROOT"
#
# OU copie e cole os comandos manuais abaixo diretamente
# ============================================================

param(
    [string]$VpsIp = "212.85.22.148",
    [string]$SenhaRoot = ""
)

if (-not $SenhaRoot) {
    $SenhaRoot = Read-Host -Prompt "Digite a senha root da VPS Hostinger"
}

Write-Host "==> Conectando na VPS $VpsIp e iniciando deploy..." -ForegroundColor Cyan

# Script que será executado remotamente na VPS
$remoteScript = @'
#!/bin/bash
set -e
echo "=== [1/8] Instalando Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt install -y nodejs > /dev/null 2>&1
echo "Node: $(node -v) | NPM: $(npm -v)"

echo "=== [2/8] Instalando PM2 ==="
npm install -g pm2 > /dev/null 2>&1
echo "PM2: $(pm2 -v)"

echo "=== [3/8] Clonando repositório ==="
rm -rf /opt/adsclaw
git clone --depth 1 https://github.com/EduardoSousaPO/Ads-Claw-.git /opt/adsclaw
echo "Clone OK"

echo "=== [4/8] Build Meta Ads MCP ==="
cd /opt/adsclaw/mcp-servers/meta-ads
npm install --silent && npm run build
echo "Meta MCP OK"

echo "=== [5/8] Build Google Ads MCP ==="
cd /opt/adsclaw/mcp-servers/google-ads
npm install --silent && npm run build
echo "Google MCP OK"

echo "=== [6/8] Build do Agente ==="
cd /opt/adsclaw/agent
npm install --silent && npm run build
echo "Agent Build OK"

echo "=== [7/8] Criando .env do Agente ==="
cat > /opt/adsclaw/agent/.env << 'ENVEOF'
SUPABASE_URL=https://gbzepjbevvimijemnhcj.supabase.co
SUPABASE_ANON_KEY=sb_publishable_N7mMVEYMuWjSe4F_fNhPNA_znmwX7gl
TELEGRAM_BOT_TOKEN=PREENCHA_AQUI
GEMINI_API_KEY=PREENCHA_AQUI
APIFY_TOKEN=PREENCHA_AQUI
HTTP_PORT=3001
ENVEOF
echo ".env criado (lembre-se de preencher os tokens!)"

echo "=== [8/8] Iniciando com PM2 ==="
cd /opt/adsclaw/agent
pm2 delete adsclaw-agent 2>/dev/null || true
pm2 start dist/index.js --name adsclaw-agent
pm2 save
pm2 startup | tail -1

echo ""
echo "=== Liberando porta 3001 no firewall ==="
ufw allow 3001/tcp > /dev/null 2>&1

echo ""
echo "=========================================="
echo "  DEPLOY CONCLUÍDO! Status do Agente:"
echo "=========================================="
pm2 status
echo ""
echo "IP da VPS: 212.85.22.148"
echo "Chat API: http://212.85.22.148:3001/api/chat"
echo "Health:   http://212.85.22.148:3001/api/health"
echo ""
echo "PROXIMO PASSO: Edite o .env com os tokens reais:"
echo "  nano /opt/adsclaw/agent/.env"
'@

# Escrever o script em um arquivo temporário
$scriptPath = "$env:TEMP\adsclaw_deploy.sh"
$remoteScript | Out-File -FilePath $scriptPath -Encoding utf8 -NoNewline

Write-Host "==> Enviando e executando script na VPS (pode levar 3-5 minutos)..." -ForegroundColor Yellow
Write-Host "==> Quando solicitado, confirme a conexão SSH digitando 'yes'" -ForegroundColor Yellow

# Enviar e executar
$sshCommand = "ssh -o StrictHostKeyChecking=accept-new root@$VpsIp 'bash -s'"
Get-Content $scriptPath | ssh -o StrictHostKeyChecking=accept-new "root@$VpsIp" "bash -s"

Write-Host ""
Write-Host "==> Deploy finalizado!" -ForegroundColor Green
Write-Host "==> Agora edite os tokens em: ssh root@$VpsIp" -ForegroundColor Cyan
Write-Host "    Comando: nano /opt/adsclaw/agent/.env" -ForegroundColor Cyan
