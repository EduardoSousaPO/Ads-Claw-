# T-104 — Revisão de Segurança

> Data: 2026-03-31
> Status: Aprovado com observações

## Checklist RULES §2 (Segurança)

| Regra | Implementado? | Onde | Notas |
|-------|:---:|------|-------|
| Credenciais nunca em código | ✅ | .env + env.ts validation | .gitignore exclui .env |
| Credenciais nunca em logs | ✅ | Nenhum console.log expõe tokens | |
| SUPABASE_SERVICE_KEY server-only | ✅ | agent/src/lib/supabase.ts | Cockpit usa ANON_KEY |
| RLS habilitado em todas as tabelas | ✅ | Migrations + Cursor confirmou | |
| clientId nunca do LLM | ✅ | ToolExecutionContext injeta do controller | |
| Whitelist Telegram | ✅ | TelegramHandler.ts middleware | TELEGRAM_ALLOWED_USER_IDS |
| Criptografia de credenciais | ✅ | crypto.ts AES-256-GCM | CREDENTIALS_ENCRYPTION_KEY |
| .gitignore completo | ✅ | .env, node_modules, dist, .claude, logs | |

## Checklist OWASP Top 10

| Vulnerabilidade | Status | Análise |
|----------------|:---:|---------|
| A01: Broken Access Control | ✅ | RLS + whitelist + clientId do context |
| A02: Cryptographic Failures | ✅ | AES-256-GCM, tokens em env vars |
| A03: Injection | ✅ | Supabase SDK (parameterized), Zod validation nos MCP |
| A04: Insecure Design | ✅ | Multi-tenant by design, approval flow |
| A05: Security Misconfiguration | ⚠️ | CORS aberto (ok para dev, fechar em prod com origin) |
| A06: Vulnerable Components | ⚠️ | npm audit pendente (correr antes do deploy) |
| A07: Auth Failures | ✅ | Sem auth no cockpit (rede interna), Telegram whitelist |
| A08: Software/Data Integrity | ✅ | CI com typecheck + build, env validation no startup |
| A09: Logging & Monitoring | ⚠️ | Console.log apenas, sem logging estruturado (ok para MVP) |
| A10: SSRF | ✅ | MCP servers chamam APIs fixas (Meta Graph, Google Ads) |

## Observações

### Ações antes do deploy em produção:
1. **CORS**: Restringir `origin` no Express para `COCKPIT_URL` apenas
2. **npm audit fix**: Correr em todos os 4 packages
3. **Auth cockpit**: Adicionar Supabase Auth ou basic auth no nginx
4. **Rate limiting**: Adicionar express-rate-limit no HttpServer
5. **Logging**: Considerar winston ou pino para logs estruturados
6. **HTTPS**: Configurar SSL via certbot/nginx no VPS

### Não-bloqueantes para MVP:
- Console.log é adequado para debugging inicial
- CORS aberto é ok enquanto cockpit e agent estão no mesmo host
