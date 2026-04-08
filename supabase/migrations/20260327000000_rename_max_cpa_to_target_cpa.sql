-- ============================================================
-- Migration 3: Renomear max_cpa → target_cpa em client_rules
-- Data: 2026-03-27
-- Motivo: Schema drift identificado — código existente usava max_cpa
--         mas SDD (PLAN.md §3, CONTRACTS.md §3) define target_cpa.
--         Migration 2 adicionou target_cpa copiando de max_cpa.
--         Esta migration finaliza a transição removendo max_cpa.
-- Referência: references/TASKS.md — Log de Decisões [DRIFT]
-- ============================================================

-- Passo 1: Garantir que target_cpa está preenchido com os valores de max_cpa
-- (executado na migration 2, mas garantir idempotência)
UPDATE public.client_rules
SET target_cpa = max_cpa
WHERE target_cpa IS NULL AND max_cpa IS NOT NULL;

-- Passo 2: Remover coluna max_cpa (agora redundante)
ALTER TABLE public.client_rules
  DROP COLUMN IF EXISTS max_cpa;

-- Passo 3: Garantir NOT NULL em target_cpa (como era max_cpa)
ALTER TABLE public.client_rules
  ALTER COLUMN target_cpa SET NOT NULL;

-- Verificação final (para confirmar no MCP):
-- SELECT column_name, is_nullable FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'client_rules'
-- AND column_name IN ('max_cpa', 'target_cpa');
-- Esperado: apenas target_cpa, is_nullable = NO
