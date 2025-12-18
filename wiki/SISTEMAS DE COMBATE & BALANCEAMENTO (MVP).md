---
created: 2025-12-14T02:52
updated: 2025-12-14T03:01
---
# 📘 COMPILADO GERAL — SISTEMAS DE COMBATE & BALANCEAMENTO (MVP)

**Ecos da Ascensão**

  

Este documento consolida **todos os sistemas numéricos definidos até agora**, servindo como **fonte única de verdade** para implementação e playtests.

  

---

  

# 1️⃣ VISÃO GERAL DO JOGO

  

- Modo de jogo: **Run de 7 salas**

- Combate: **1x1, por turnos**

- Objetivo de balanceamento:

  - Normal: ~4 turnos

  - Elite: ~6–7 turnos

  - Boss: ~10–11 turnos

- Progressão:

  - Crescimento **in-run**

  - Teto definido por **boneco base (late game)**

  

---

  

# 2️⃣ PERSONAGEM — BASE DO SISTEMA

  

## 2.1 Atributos do Personagem

O nível do personagem **escala apenas**:

- HP base

- ATK base

  

Outros atributos:

- Crit Rate base: **5%**

- Crit DMG base: **150%**

- Energy Regen base: **100%**

  

---

  

## 2.2 Boneco Base (Referência Late Game)

  

### Status finais

- HP: **10.800**

- ATK: **960**

- Crit Rate: **65%**

- Crit DMG: **190%**

- Dano do Personagem: **+32%**

  

### Kit

- Auto Attack: **100% ATK**

- Skill: **250% ATK**

- Cooldown da Skill: **3 turnos**

  

### Dano médio

- Auto: ~2.000

- Auto (buff): ~2.400

- Skill: ~5.000

- DPS médio (ciclo): ~3.250

  

---

  

# 3️⃣ ARMAS

  

## Estrutura da Arma

Cada arma possui **exatamente dois atributos**:

  

1. Stat base (flat):

   - ATK flat **ou**

   - HP flat

2. Stat secundário:

   - Crit Rate %

   - Crit DMG %

   - Energy Regen %

  

## Valores (endgame)

- ATK flat: **+140**

- HP flat: **+1.400**

- Crit Rate: **+20%**

- Crit DMG: **+40%**

- Energy Regen: **+20%**

  

---

  

# 4️⃣ ANÉIS

  

## 4.1 Estrutura

- Cada personagem pode equipar **5 anéis**

- Cada anel possui:

  - 1 Main Stat (escala com nível do slot)

  - 4 Substats (fixos)

  

O **nível do slot = nível do anel equipado**.

  

---

  

## 4.2 Main Stats por Faixa (valor no nível máximo)

  

### 1–20 / 21–40

- HP flat: **+800**

- ATK flat: **+80**

  

### 41–60

- HP %: **+18%**

- ATK %: **+18%**

  

### 61–80

- Dano do Personagem %: **+20%**

- Energy Regen %: **+20%**

- Redução de Dano %: **+15%**

- ATK % / HP %: **+22%**

  

### 81–95

- Crit Rate %: **+20%**

- Crit DMG %: **+40%**

- Heal %: **+20%**

- ATK % / HP %: **+25%**

  

---

  

## 4.3 Substats (fixos)

Cada anel tem **4 substats**, sem repetição no mesmo anel.

  

Pool:

- HP flat: **+300**

- ATK flat: **+30**

- HP %: **+6%**

- ATK %: **+6%**

- Crit Rate %: **+5%**

- Crit DMG %: **+10%**

- Energy Regen %: **+6%**

  

---

  

# 5️⃣ SETS DE ANÉIS

  

## Regras

- Bônus ativam em **3/5** e **5/5**

- Sets **não escalam com nível**

  

## Set Agressão (Referência)

  

- 3 peças: **+12% Dano do Personagem**

- 5 peças: Após usar Skill, **+25% Dano do Personagem por 2 turnos**

- Não acumula

  

---

  

# 6️⃣ INIMIGOS — ENDGAME (RÉGUA)

  

## HP

- Normal: **12.000**

- Elite: **22.000**

- Boss: **36.000**

  

## Dano

**Normal**

- 700 por turno

  

**Elite**

- 700 por turno

- 1 golpe forte: 1.400 (1x por luta)

  

**Boss**

- 750 por turno

- Ciclo de 4 turnos:

  - Carregando: 400

  - Golpe: 1.900

  

---

  

# 7️⃣ CURVA EARLY / MID / LATE

  

## Poder relativo do jogador

- Early: **45%**

- Mid: **70%**

- Late: **100%**

  

---

  

## Early Game (Salas 1–2 | Slots 1–2)

  

**DPS médio:** ~1.200

  

| Inimigo | HP | Dano/turno |

|------|----:|-----------:|

| Normal | 4.000 | 300 |

| Elite | 7.000 | 350 |

| Boss | 11.000 | 400 |

  

---

  

## Mid Game (Salas 3–6 | Slots 1–4)

  

**DPS médio:** ~2.200

  

| Inimigo | HP | Dano/turno |

|------|----:|-----------:|

| Normal | 8.000 | 500 |

| Elite | 14.000 | 550 |

| Boss | 24.000 | 600 |

  

---

  

## Late Game (Sala 7 | Slots 1–5)

  

**DPS médio:** ~3.250

  

| Inimigo | HP | Dano |

|------|----:|------:|

| Normal | 12.000 | 700 |

| Elite | 22.000 | 700 + 1.400 |

| Boss | 36.000 | 750 + picos |

  

---

  

# 8️⃣ PROGRESSÃO IN-RUN (7 SALAS)

  

| Sala | Poder do Jogador |

|---|---:|

| 1 | 55% |

| 2 | 60% |

| 3 | 65% |

| 4 | 70% |

| 5 | 80% |

| 6 | 90% |

| 7 | 100% |

  

---

  

# 9️⃣ EXEMPLOS DE BUILDS

  

## DPS ATK-scaler

- ATK alto

- Crit 60–70%

- Burst forte

- Baixa tolerância a erro

  

## DPS HP-scaler

- HP alto

- Dano escala com HP

- Crit relevante

- Dano consistente

  

## Tank

- HP máximo

- Redução de Dano

- Dano baixo

  

---

  

# 10️⃣ DIRETRIZES FINAIS

  

- Boneco Base define o teto

- Nada pode ultrapassar o DPS médio dele sem trade-off

- Ajustes devem priorizar:

  - HP de inimigos

  - multiplicadores

- Sistemas novos entram **comparados à régua existente**

  

---

  

**Status:** Documento completo  

**Uso:** Implementação + Playtest  

**Autoridade:** Fonte única de verdade (MVP)