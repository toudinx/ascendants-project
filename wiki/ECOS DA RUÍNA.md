---
created: 2025-12-10T05:18
updated: 2025-12-10T05:18
---
# 📘 **ECOS DA RUÍNA — SISTEMA DE PROGRESSÃO (Versão 8 — MVP FINAL)**

**Ecos da Ruína** é um roguelike de runs curtas, baseadas em salas, evolução de rotas e transformações de personagem.  
Este documento define **o sistema completo de progressão e fluxo de jogo do MVP**.

---

# ⭐ 0. Início da Run — Escolha Inicial de Rota

Antes da primeira sala, o jogador deve fazer sua **primeira decisão de build**:

### ➤ Escolher +1 em uma das rotas:

- **Rota A — Crítico (+1)**
    
- **Rota B — Espiritual (+1)**
    
- **Rota C — Impacto (+1)**
    

Isso garante que:

- a sala 1 não é uma luta “vazia”
    
- o jogador já começa com identidade
    
- o gating parcialmente funciona naturalmente
    
- o jogo não é gratuito na primeira sala
    
- a run começa emocionante
    

Após escolher, os valores iniciais ficam, por exemplo:

`A:1, B:0, C:0   ou A:0, B:1, C:0   ou A:0, B:0, C:1`

---

# ⭐ 1. Estrutura Geral da Run

As runs são compostas por:

- **Salas comuns** (combate rápido)
    
- **Mini-boss** (meio da run)
    
- **Boss final** (última sala base)
    
- **Ascendentes** (modo opcional infinito)
    

A posição dos chefes depende do número total de salas:

|Total de Salas|Mini-boss|Boss Final|
|---|---|---|
|5|3|5|
|7|4|7|
|10|5|10|
|14|7|14|

**Evolução Inicial** ocorre sempre após o mini-boss.  
**Evolução Final** ocorre sempre após o boss final.

O jogador pode entrar nos **Ascendentes** após o boss final, e **pode sair quando quiser**, mantendo as recompensas.

---

# ⭐ 2. Rotas de Poder (A, B, C)

Cada personagem tem **3 rotas**, representando estilos distintos de combate.

Para Velvet no MVP:

- **A — Crítico**
    
- **B — Espiritual**
    
- **C — Impacto**
    

Níveis começam em 0, com exceção da escolha inicial.

Cada sala vencida concede **+1** em uma rota escolhida pelo jogador.

---

# ⭐ 3. Gating Parcial — Regra de Progressão

O gating evita builds fracas (como 3–0–0) sem limitar a criatividade.

### ✔ Regra:

Para subir uma rota para **nível N**,  
pelo menos **uma outra rota** deve estar em **nível N−1**.

### Exemplos práticos:

#### Para pegar A+2:

- B ≥ 1 **OU** C ≥ 1
    

#### Para pegar A+3:

- B ≥ 2 **OU** C ≥ 2
    

### ❌ Proibidos:

- 2–0–0
    
- 3–0–0
    
- 3–1–0 (sem suporte adequado)
    

### ✔ Permitidos:

- 3–2–0
    
- 3–1–1
    
- 2–2–2
    
- 1–3–2
    
- 2–3–1
    

### ✔ Terceira rota é livre:

Ela pode estar em nível baixo sem atrapalhar.

---

# ⭐ 4. Após Sala Comum — Fase 1 (Escolha de Upgrade)

Ao vencer uma sala comum:

### ✔ **1) Escolher upgrade**

O jogador escolhe entre:

- A +1
    
- B +1
    
- C +1
    

A UI **não mostra upgrades proibidos** pelo gating.

### ✔ **2) Reroll (se tiver)**

O jogador pode rerollar as opções de upgrade.  
Reroll é limitado (ver seção de itens).

Após confirmar o upgrade, avança para a Fase 2.

---

# ⭐ 5. Preparação da Próxima Sala — Fase 2 (Agency)

Antes de entrar na próxima sala, o jogador vê este menu:

### ✔ **1) Continuar para a próxima sala**

Fluxo normal.

### ✔ **2) Usar Item → Continuar**

O MVP possui apenas **um item** (Poção Restauradora).  
Usar item afeta o estado antes da próxima sala.

### ✔ **3) Fugir da Run (RUN)**

Permite abandonar a run voluntariamente.

#### Fugir concede:

- todas as recompensas obtidas até então
    
- mas não recompensa dos Ascendentes
    
- não conta como morte
    
- evita frustração (morte inevitável)
    

---

# ⭐ 6. Sistema de Itens (MVP)

## **Item Único: Poção Restauradora**

### ✔ Efeito:

Cura **30% da Vida Máxima** do personagem imediatamente.

### ✔ Uso:

- instantâneo
    
- só pode ser usado **1 vez por sala**
    
- botão fica travado até vencer a próxima sala
    

### ✔ Limite:

Máximo de **2 poções** no inventário.

### ✔ Fonte:

- 10% de chance de drop em salas comuns
    
- **Mini-boss dá 1 poção garantida**
    
- **Boss final dá 1 poção garantida**
    

---

# ⭐ 7. Mini-Boss

Ao derrotar o mini-boss, o jogador recebe:

- **+1 Reroll Point**
    
- **+1 Poção Restauradora**
    
- **Evolução Inicial**
    

O mini-boss é um marco emocional:  
meio da run, build consolidada, curva de poder importante.

---

# ⭐ 8. Evolução Inicial (após Mini-boss)

Regras:

- Acontece automaticamente ao derrotar o mini-boss
    
- Baseada **na rota mais alta** naquele momento
    

### Exemplos:

`2–1–0 → Evolução A   1–2–0 → Evolução B   0–1–2 → Evolução C`

### Empates:

- se duas rotas empatarem → aleatório entre elas
    
- se três empatarem → aleatório total
    

Efeito:

- explosão estética
    
- dano/efeito adicional
    
- aumento de presença visual
    

---

# ⭐ 9. Evolução Final (após Boss Final)

Regras:

- Ocorre ao derrotar o boss final
    
- Baseia-se na **rota dominante** (maior nível)
    

### Exemplos:

`3–2–0 → Evolução Final A   2–3–1 → Evolução Final B   1–1–3 → Evolução Final C`

### Empates:

Sempre **aleatório** entre as rotas empatadas.

Efeito:

- transformação final
    
- mudança significativa da habilidade ativa
    
- estética final mais intensa
    

---

# ⭐ 10. Ascendentes (Opcional)

Após o boss final, o jogador pode:

### ✔ A) Encerrar run → recebe recompensas da run

### ✔ B) Entrar nos Ascendentes → modo infinito

### ✔ C) Sair quando quiser

Ascendentes:

- aumentam dificuldade progressivamente
    
- dão buffs aleatórios a cada vitória
    
- servem para testar builds fortes
    

Morte encerra tentativa.

---

# ⭐ 11. UI — Diretrizes

### Tela Inicial da Run:

- escolha entre A+1 / B+1 / C+1
    

### Pós-sala (Fase 1):

- cards de upgrade claros
    
- reroll destacado
    
- upgrades bloqueados ocultos
    

### Pré-sala (Fase 2):

- mostrar poções
    
- botão RUN
    
- botão Usar Poção (desativado se recém usada)
    

### Evoluções:

- animação especial
    
- efeito sonoro
    
- mudança visual da Velvet
    

---

# ⭐ 12. Exemplo Completo (7 salas)

### Tela 0:

Jogador escolhe A+1

Build:

`A:1, B:0, C:0`

### Sala 1 → B+1

### Sala 2 → A+2

### Sala 3 → C+1

### Mini-boss →

+1 Reroll  
+1 Poção  
**Evolução Inicial: A** (rota mais alta)

### Sala 4 → A+3

### Sala 5 → B+2

### Sala 6 → C+2

### Boss Final →

**Evolução Final: A** (A=3 é a mais alta)

### Ascendentes → opcional

Build final:

`A:3, B:2, C:2`

---

# ⭐ 13. Filosofia do Design

O MVP foi projetado para:

✔ ser rápido  
✔ ser viciante  
✔ permitir builds profundas  
✔ ter decisões significativas  
✔ evitar frustração  
✔ ter evolução temática (waifu-driven)  
✔ ser fácil de implementar pelo Codex  
✔ escalar para novos modos de jogo  
✔ suportar vários personagens no futuro

---

# 📘 **ECOS DA RUÍNA — V8 FINALIZADO**

Este é o documento oficial pronto para:

- implementação no Codex
    
- criação das telas de UI
    
- definição das evoluções da Velvet
    
- estruturação das runs