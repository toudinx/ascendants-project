# Test Harness — Fixtures (Apoio)

**Authority:** Apoio (para QA/dev; não é SoT de regra)  
**Status:** Ativo  
**Escopo:** Perfis de teste para validar combate e balance do MVP.  
**Projeto:** KAEZAN: AWAKENING  
**Última revisão:** 2025-12-17


## 1) Regra de ouro
- O SoT de regra é `10_COMBATE_REGRAS.md`.
- Este arquivo só define **fixtures** e **parâmetros de teste**.

---

## 2) Fixture: Kaelis “Velvet” (debug)
**Objetivo:** estressar/validar:
- ordem de eventos (hit → multi-hit → postura → quebra → DoT)
- crítico
- skill (cooldown + energia)
- aplicação/expiração de DoT

### Campos mínimos
- HP base, ATK base
- Crit Rate, Crit DMG
- Energia: Max, Atual, Regen/turno, Custo da Skill
- Cooldown da Skill (em turnos)
- Multi-hit: chance e quantidade (ou “1 extra”)
- DoT: chance, dano, duração (em turnos)

### Regras de comportamento (devem bater com o SoT)
- cada instância pode critar (hit/multi-hit/DoT)
- DoT resolve no fim do turno da fonte (aplicador)
- DoT é **stackável** (stacks somam no tick)

### Parâmetros **experimentais** (não promover sem decisão explícita)
- Penetração de Postura

---

## 3) Fixture: Inimigo Genérico (template)
**Objetivo:** validar:
- IA simples (auto / preparar forte / executar forte)
- postura (quebra/superquebra)
- DoT opcional
- skill opcional (se existir no código)

### Campos mínimos
- HP base, ATK base
- Postura: Max, Atual
- Crit Rate, Crit DMG (se usado)
- Multi-hit (opcional)
- DoT (opcional)
- Ataque forte: dano, tempo de preparo (em turnos)

### IA (MVP)
Ordem de decisão:
1. Se estiver quebrado → perde ação
2. Se estava preparando ataque forte → executa ataque forte
3. Se ataque forte disponível → prepara
4. Senão → autoataque
