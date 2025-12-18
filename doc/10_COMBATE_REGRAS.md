# Combate — Regras (SoT)

**Authority:** Source of Truth (ordem de eventos + definição de combate/postura)  
**Status:** Ativo  
**Escopo:** Como o combate funciona (sem números). Números vivem no doc de tuning.  
**Projeto:** KAEZAN: AWAKENING  
**Última revisão:** 2025-12-17


## 0) Glossário mínimo
- **Tick:** step de resolução/feedback.
- **Turno:** ação lógica de um ator.
- **Rodada:** turno do player + turno do inimigo.

## 1) Estrutura do combate (MVP)
- 1 player vs 1 inimigo (base do MVP).
- Em cada **turno**, o ator executa **1 ação**:
  - **Autoataque** (default)
  - **Skill** (se disponível: cooldown + energia)

## 2) Ação (ordem de resolução)
Dentro de uma ação (ataque):
1. Determinar ação (Auto vs Skill)
2. **Hit principal**
3. **Multi-hits** (se houver)
4. Redução de **Postura**
5. Checar **Quebra / Superquebra**
6. Aplicar estados do ataque (ex.: DoT) — se existir no kit

### 2.1 Fórmulas aplicadas (MVP e futuros modos)
> Objetivo: tornar o comportamento implementável sem “achismos”. Valores (multiplicadores/custos/caps) vivem no doc numérico ou no código.

**Notação**
- `ATK`, `HPMax`, `HPAtual`
- `Dano%` = **Dano do Personagem %** (stats do atacante) → multiplicador `1 + Dano%`
- `CritRate`, `CritDMG%` (ex.: 150% = 1.5)
- `DR%` = **Redução de Dano %** (stats do alvo) → multiplicador `1 - clamp(DR%, 0, DR_CAP)`
- `Heal%` = **Heal %** (stats da fonte de cura) → multiplicador `1 + Heal%`
- `BreakTaken%` = bônus de dano recebido durante Quebra/Superquebra (tuning)

**Dano (HP) — por instância**
1) `Base = ATK * MultInstancia`  
2) `ModAtk = Base * (1 + Dano%)`  
3) `ModCrit = ModAtk * (Crit ? (CritDMG%/100) : 1)`  
4) `ModBreak = ModCrit * (1 + BreakTaken%)` (se alvo estiver em Quebra/Superquebra)  
5) `FinalHP = floor(ModBreak * (1 - clamp(DR%, 0, DR_CAP)))`  
- `FinalHP` nunca é negativo.

**Dano de Postura — por instância**
- Cada instância tem seu próprio `PosturaBase` (tuning; pode ser 0).
- `FinalPostura = floor(PosturaBase * (1 + Dano%) * (Crit ? (CritDMG%/100) : 1))`
- **DR% não reduz postura** (DR é mitigação de HP).

**Cura (HP) — por instância**
- `BaseHeal` vem da fonte (skill/poção/efeito).
- `FinalHeal = floor(BaseHeal * (1 + Heal%))`
- Aplicação: `HPAtual = min(HPMax, HPAtual + FinalHeal)`

**Rounding**
- Default: `floor` em dano/cura para consistência com log.

Fim do turno (sempre nesta ordem):
7. Resolver **DoT aplicado por este ator (fonte)** nos seus alvos
   - somar stacks por alvo (para log) ou processar stack-a-stack e agrupar
8. Aplicar redução de Postura por DoT (se aplicável; ver seção DoT vs Quebra)
9. Regenerar Postura do ator (se aplicável)
10. Avançar cooldowns/buffs/durações (**unidade: turno do dono do efeito**)

## 3) Crítico (MVP)
- **Crit Rate** e **Crit DMG** existem (ver números).
- Regra:
  - Cada instância de dano pode critar: **hit**, **multi-hit**, **DoT**.
  - Crítico afeta:
    - dano causado
    - **redução de postura causada pela mesma instância** (consistente com docs de teste)

## 4) Skill, Energia e Cooldown (MVP)
### 4.1 Regra mínima (não-negociável)
No turno do ator:
- Se **skill** estiver fora do cooldown **e** tiver energia suficiente → usa skill.
- Caso contrário → autoataque.

### 4.2 Unidade de tempo (para não quebrar logs)
- Cooldown e duração de buffs/debuffs são em **turnos**.
- Decremento padrão:
  - no fim do **turno do dono** (ex.: cooldown do player decrementa no fim do turno do player).

### 4.3 Energia (definição mínima)
- Cada ator tem:
  - **Energia Máxima**
  - **Energia Atual**
  - **Regeneração por turno**
- **Energy Regen %** (stats de anéis) multiplica a regeneração base.
- Fórmula (fim do turno do ator):
  - `RegenFinal = floor(RegenBase * (EnergyRegen%/100))`
  - `EnergiaAtual = min(EnergiaMax, EnergiaAtual + RegenFinal)`
- Valores exatos (`EnergiaMax`, `RegenBase`, `CustoSkill`) devem refletir o código e/ou doc numérico.

## 5) Multi-hit (MVP)
- Multi-hit = hits extras dentro da mesma ação.
- Cada multi-hit é uma instância separada (pode critar e aplicar DoT se configurado).
- Redução de postura por multi-hit é **fração** do hit principal (tuning).

## 6) DoT (MVP)
- DoT é **stackável**: cada aplicação cria **1 stack** no alvo.
- Cada stack carrega (mínimo):
  - `TickDamageHP` (dano por tick; instância de dano)
  - `TickPostura` (opcional; tuning)
  - `Duração` (em **turnos da fonte**)
  - `Fonte` (quem aplicou)

### Quando resolve (regra oficial)
- DoT resolve no **fim do turno da fonte (aplicador)**.
  - Ex.: DoT aplicado pelo Player no Inimigo → ticks acontecem no fim dos turnos do Player.
  - Ex.: DoT aplicado pelo Inimigo no Player → ticks acontecem no fim dos turnos do Inimigo.

### Crítico (quando aplicável)
- Se DoT pode critar, o roll acontece **na aplicação do stack**.
- `TickDamageHP` / `TickPostura` já armazenam o resultado final (o tick **não** rerola crítico).

### Como resolve (stacking)
No fim do turno da fonte:
- Para cada alvo que possui stacks desta fonte:
  - somar os danos (`TickDamageHP`) de todos os stacks ativos e aplicar (log pode agrupar)
  - somar `TickPostura` (se existir) e aplicar junto
- Depois do tick:
  - `Duração -= 1` em cada stack
  - remover stacks com `Duração == 0`

### DoT vs Quebra (edge cases oficiais)
- DoT **não** dispara checagem de **Quebra/Superquebra**.
- Redução de postura por DoT:
  - se alvo **não** estiver em Quebra/Superquebra → aplicar redução e **clamp mínimo em 1** (DoT nunca coloca postura em 0)
  - se alvo estiver em **Quebra** → postura permanece em 0 (DoT não altera)
  - se alvo estiver em **Superquebra** → postura travada em 0 (DoT não altera)

### Regras gerais
- DoT:
  - causa dano
  - pode matar
  - nunca interrompe uma ação
## 7) Postura, Quebra e Superquebra (MVP)
### 7.1 Postura
- Barra secundária separada de HP.

### 7.2 Redução
- Hit principal: redução total (tuning)
- Multi-hit: redução parcial (tuning)
- DoT: redução leve no fim do turno do alvo (tuning; sem checagem de quebra)

### 7.3 Regeneração
No fim do turno do personagem, se NÃO estiver quebrado:
- postura regenera (tuning)

### 7.4 Condição de Quebra (normal)
- Postura chega a 0, mas **não** foi 100% → 0 dentro do mesmo turno.

### 7.5 Condição de Superquebra
- Postura é reduzida de **100% → 0 dentro do mesmo turno**.

### 7.6 Efeitos
- Mesmo perdendo a ação, o **turno acontece** e executa o bloco *Fim do turno* (DoT/cooldowns/durações).
- **Quebra (1 turno):**
  - perde a próxima ação
  - recebe dano aumentado (tuning)
  - postura não regenera durante o turno perdido
  - postura volta a regenerar após o turno perdido terminar
- **Superquebra (2 turnos):**
  - perde duas ações
  - recebe dano aumentado (tuning)
  - postura travada em 0 durante a duração
  - postura volta a regenerar após os 2 turnos

## 8) Checklist de consistência (para evitar retrabalho)
- Logs usam **turno** como agrupamento.
- Tick é só “tempo/feedback”; não redefine regra.
- Nenhum outro doc reescreve estas regras; só referencia.
