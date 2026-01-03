# Documentação — KAEZAN: AWAKENING (MVP)

**Authority:** Índice + regras de documentação (SoT do *processo* documental)  
**Status:** Ativo  
**Escopo:** Como ler/organizar os docs. Convenções para crescimento sem retrabalho.  
**Projeto:** KAEZAN: AWAKENING  
**Última revisão:** 2025-12-17


## 1) Como ler (ordem recomendada)
1. `00_CANON_KAEZAN.md` (termos e nomes)
2. `01_DIRETRIZES.md` (filosofia/escopo)
3. `10_COMBATE_REGRAS.md` (comportamento)
4. `11_COMBATE_NUMEROS_MVP.md` (números)
5. `20_MODO_ECOS_DA_RUINA.md` (modo implementado)
6. `12_ROTAS_TIPOS.md` (6 rotas oficiais)
7. `30_EQUIP_SIGILS.md` (equipamento)
8. `40_TEST_FIXTURES.md` (apenas apoio p/ testes)
9. `90_UI_ROADMAP_CENA_BATALHA.md` (roadmap de UI)

## 2) Vocabulário canônico (anti-confusão)
- **Kaelis:** personagem jogável (termo de UI/projeto).
- **Rota (Tipo):** Sentinela/Ruína/Ressonância/Fortuna/Colosso/Ira (tipagem do Kaelis).
- **Trilhas A/B/C:** contadores/decisões do modo *Ecos da Ruína* (NÃO são rotas oficiais).
- **Tick:** resolução temporal/feedback (animação + steps).
- **Turno:** janela lógica de ação de um ator.
- **Rodada:** turno do player + turno do inimigo.

## 3) Convenções obrigatórias para novos docs
- Toda regra deve ter **um único SoT**. Se aparecer em outro arquivo, deve ser **link/resumo**, não “segunda versão”.
- Sempre marcar uma seção como:
  - **MVP** (no código agora)
  - **FUTURO** (explicitamente fora do MVP)
  - **TBD** (comportamento depende do código/decisão pendente)
- Evitar termos ambíguos (“rota”, “turno”, “tick”) sem definição local ou link.

## 4) Contradições principais corrigidas nesta revisão
- **“Rota A/B/C”** renomeada para **Trilhas A/B/C** no modo para não colidir com as **6 rotas oficiais**.
- **Crítico** e **Skill (CD em turnos)** promovidos para o doc de combate (já existem nos números/testes).
- **Tick vs Turno** normalizado em todos os SoT.
- Conteúdos “10/14 salas” e “Ascendentes infinito” no doc do modo marcados como **FUTURO**; MVP = **7 salas**.

## 5) Mapeamento (redução de arquivos)
Arquivos originais foram consolidados assim:
- `GAMEPLAY BASE.md` → anexo dentro de `01_DIRETRIZES.md`
- `SISTEMA DE POSTURA (MVP OFICIAL).md` → incorporado em `10_COMBATE_REGRAS.md`
- `FASES - AJUSTE CENA DE BATALHA.md` + `ROTEIRO DE EVOLUÇÃO DA TELA DE BATALHA.md` → `90_UI_ROADMAP_CENA_BATALHA.md`
- `VELVET (MVP EXPANDIDA PARA TESTES).md` + `INIMIGO GENÉRICO (MVP).md` → `40_TEST_FIXTURES.md`
- `Set Agressão.md` → apêndice em `30_EQUIP_SIGILS.md` (e referência em números)

> Se o código divergir de qualquer regra aqui, **o código vence** — e o doc deve ser ajustado imediatamente (sem “interpretar”).


## 6) Tooling (apoio)
Site para remover fundo

https://www.remove.bg/upload

## 7) Docs policy
- doc/ stores source-of-truth docs, guides, and decisions.
- Do not commit workspace/editor files (e.g. `.obsidian/`, `workspace.json`, `.DS_Store`).
