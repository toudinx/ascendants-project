# Modo de Run — Ecos da Ruína (SoT do modo)

**Authority:** Source of Truth (fluxo da run + Trilhas A/B/C + regras do modo)  
**Status:** Ativo  
**Escopo:** Somente o modo Ecos da Ruína (MVP implementado).  
**Projeto:** KAEZAN: AWAKENING  
**Última revisão:** 2025-12-17


## 0) Termos (anti-confusão)
- **Rota (Tipo):** Sentinela/Ruína/etc (tipagem do Kaelis) — ver `12_ROTAS_TIPOS.md`.
- **Trilhas A/B/C:** escolhas durante a run para dar dinâmica de build (NÃO são rotas oficiais).

## 1) Estrutura da run (MVP)
- **7 salas** (MVP).
- Recompensas e escolhas acontecem entre salas.

## 2) Trilhas A/B/C (MVP)
A cada escolha relevante, o jogador acumula pontos em uma trilha:

- **Trilha A — Crítico (+1)**
- **Trilha B — Espiritual (+1)**
- **Trilha C — Impacto (+1)**

### “Trilha dominante”
- Trilha com maior pontuação.
- Empate: **desempate aleatório** (registrar no log de run).

## 3) Loop da run (MVP)
- Início → salas 1–7 → boss final (se aplicável no código) → recompensa final → volta ao home.

## 4) Itens (MVP)
- **Poção Restauradora**
  - Drop: 10% por sala (conforme doc numérico)
  - Limite: 2 carregadas
  - Uso: entre salas

### Edge case obrigatório (não deixar solto)
- Drop com inventário cheio → documentar exatamente o comportamento do código (descarta / converte / impede drop).

## 5) FUTURO (explicitamente fora do MVP)
- runs de 10/14 salas
- “Ascendentes” (modo infinito)
- pools grandes extras fora do que já está no código
