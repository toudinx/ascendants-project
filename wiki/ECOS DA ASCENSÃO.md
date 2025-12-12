---
created: 2025-12-10T14:10
updated: 2025-12-10T14:10
---
# 📘 **ECOS DA ASCENSÃO — MVP DO SISTEMA DE COMBATE**

**Versão:** 0.1 (Alfa)  
**Status:** ESTÁVEL • APROVADO COMO FUNDAÇÃO

---

# 🧩 **SUMÁRIO**

1. Visão Geral
    
2. Estruturas Básicas do Combate
    
3. Fluxo de Turno
    
4. Autoataque
    
5. Multi-Hit
    
6. DoT (Dano Contínuo)
    
7. Sistema de Postura
    
8. Quebra e Superquebra
    
9. Prioridade de Eventos (Tick System)
    
10. Hooks para Expansão Futura
    

---

# 1. **VISÃO GERAL**

O combate de _Ecos da Ascensão_ é baseado em:

- **turnos** (resolução sequencial)
    
- **ticks** (sub-eventos dentro de cada rodada)
    
- **postura** (barra de estabilidade que ao ser quebrada cria janelas táticas)
    

O sistema foi projetado para ser:

- simples de implementar
    
- fácil de expandir
    
- responsivo à progressão (rotas 0–4)
    
- compatível com builds DPS, suporte e tank
    
- ideal para personagens com multi-hit, DoT e interações com postura
    

Este documento descreve SOMENTE o MVP funcional — o mínimo necessário para o combate existir.

---

# 2. **ESTRUTURAS BÁSICAS DO COMBATE**

Cada entidade (personagem ou inimigo) possui:

### **Atributos Base**

- Vida (HP)
    
- Postura (POST)
    
- Ataque (ATK)
    
- Defesa (DEF)
    
- Velocidade (SPD) _(opcional por enquanto)_
    

### **Estados de Combate**

- Normal
    
- Postura Quebrada (1 turno)
    
- Superquebra (2 turnos)
    
- DoTs ativos
    
- Bloqueado (no futuro)
    

### **Ações Disponíveis (MVP)**

- Autoataque
    
- Passar turno (debug)
    

---

# 3. **FLUXO DE TURNO (MVP)**

### **1. Início do turno**

- verificar se o personagem está quebrado
    
- se estiver → perde turno
    
- aplicar efeitos de início de turno (placeholder)
    

### **2. Jogador escolhe ação**

- autoataque
    
- (futuro: habilidades, itens, troca, etc.)
    

### **3. Execução da ação**

- calcular hit principal
    
- calcular multi-hits (se existirem)
    
- aplicar dano
    
- reduzir postura
    
- checar quebra / superquebra
    

### **4. Tick de resolução final**

Aplicado **sempre** ao final do turno:

- aplicação de DoT
    
- redução de postura por DoT
    
- regeneração natural de postura
    
- resolução de efeitos pendentes
    

### **5. Passa para o turno do inimigo**

Esse é o loop.

---

# 4. **AUTOATAQUE (ATAQUE BÁSICO)**

O autoataque é o único comando ativo no MVP e deve conter:

### **Hit Principal**

- causa dano completo baseado em ATK
    
- reduz postura em **100% da fórmula base**
    
- pode critar (no futuro)
    

### **Multi-Hits (se houver)**

- cada hit extra → dano reduzido
    
- redução de postura reduzida (ver seção 5)
    

### **Interações**

- aplica DoTs ativos (caso existam)
    
- ativa passivas futuras
    
- ativa gatilhos de quebra de postura
    

### **Autoataque é SEMPRE seguro e confiável.**

---

# 5. **MULTI-HIT (MVP)**

Multi-hit define repetição de ataques dentro da mesma ação.

### **Regra Universal:**

- **Hit principal** → 100% de dano e 100% da redução de postura
    
- **Hits secundários** → 20–40% de dano e redução de postura  
    _(valor exato será decidido posteriormente)_
    

### Objetivo:

- deixar o multi-hit forte, mas não dominante
    
- evitar que spam de multi-hit quebre postura cedo demais
    
- manter o impacto do golpe principal
    

### Comportamento:

- Hits secundários ocorrem logo após o hit principal
    
- Não possuem delay
    
- Cada hit secundário é tratado como "micro-evento" na fórmula de postura
    

---

# 6. **DoT — DANO CONTÍNUO (MVP)**

DoTs são efeitos que causam dano automaticamente no fim do turno do ALVO.

### **Aplicação (placeholder):**

- qualquer personagem pode aplicar DoT
    
- casos específicos definidos depois
    

### **Resolução:**

No **tick final do turno do inimigo**:

- DoT causa dano
    
- reduz postura (pequena fração)
    
- pode matar
    
- não interrompe turno atual
    

### **Regras importantes:**

- DoT não causa multi-hit
    
- DoT não causa superquebra
    
- DoT não causa quebra normal diretamente
    
- DoT ajuda a completar a quebra
    

---

# 7. **POSTURA — BARRA DE ESTABILIDADE (MVP)**

### **O que é postura?**

Uma barra secundária que representa a capacidade do personagem de manter controle no combate.

### Todos possuem:

- POSTURA MÁXIMA (valor base configurável)
    
- POSTURA ATUAL
    

### **Como postura é reduzida?**

- hit principal reduz total
    
- multi-hits reduzem parcial
    
- DoTs reduzem no final do turno
    
- habilidades futuras podem reduzir
    

### **Como postura é regenerada?**

- pequena regeneração natural no fim do turno do ALVO
    
- regeneração é pausada se o alvo estiver quebrado
    

---

# 8. **QUEBRA E SUPERQUEBRA (MVP)**

## 🎯 **QUEBRA NORMAL**

Ocorre quando:

> POSTURA chega a **0**, mas NÃO foi 100% → 0 dentro do mesmo turno.

### **Efeitos:**

- alvo fica **Atordoado / Exposto por 1 turno**
    
- perde sua próxima ação
    
- postura não regenera nesse turno
    
- recebe dano aumentado
    

---

## 🧨 **SUPERQUEBRA**

Ocorre quando:

> A barra completa de postura é reduzida **de 100% → 0 no MESMO turno**.

### **Efeitos (MVP):**

- alvo fica **Atordoado / Exposto por 2 turnos**
    
- vulnerabilidade maior
    
- postura permanece em 0 por toda a duração
    
- ataques críticos não são necessários
    

### **Motivação:**

Cria um payoff delicioso para builds baseadas em burst de postura.

---

# 9. **PRIORIDADE DE EVENTOS (TICK SYSTEM)**

Para consistência:

### Durante uma ação (autoataque):

1. Hit principal
    
2. Multi-hits
    
3. Checar postura
    
4. Aplicar quebra / superquebra
    
5. Resolver estado “quebrado”
    

### Após a ação (encerramento do turno):

6. Aplicar DoTs
    
7. Reduzir postura por DoT
    
8. Regenerar postura (se aplicável)
    
9. Triggers futuros
    

Essa ordem garante que:

- Multi-hits não causem loops
    
- DoT nunca interrompa uma ação
    
- Postura se comporte de forma previsível
    

---

# 10. **HOOKS PARA FUTURA EXPANSÃO (DEIXADOS PRONTOS)**

### **Habilidade Ativa**

- gatilho após autoataque
    
- recebe contexto do turno
    
- pode alterar postura, DoT, hits extras etc.
    

### **Passivas**

- antes do hit
    
- após o hit
    
- após o turno
    
- ao aplicar DoT
    
- ao receber dano
    

### **Rotas 0–4**

- gatilho após calcular dano
    
- gatilho ao reduzir postura
    
- gatilho ao quebrar postura
    

### **Buffs e Debuffs**

- placeholders criados para futura integração
    

---

# 🟦 **DOCUMENTO FINALIZADO**

Este arquivo é **auto-suficiente**: você já pode começar o desenvolvimento do combate AGORA mesmo com esse conteúdo.