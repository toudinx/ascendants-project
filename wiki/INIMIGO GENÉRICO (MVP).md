---
created: 2025-12-10T22:04
updated: 2025-12-10T22:04
---
# 📘 **ECOS DA ASCENSÃO — INIMIGO GENÉRICO (MVP)**

**Versão:** 1.0 (Aprovado)  
**Escopo:** Inimigo base utilizado para testar e validar o sistema de combate.  
**Foco:** Simplicidade, previsibilidade estratégica e implementação rápida.

---

# 🧩 SUMÁRIO

1. Propósito
    
2. Atributos Base
    
3. Postura
    
4. Estados
    
5. Ações do Inimigo
    
6. IA MVP (Lógica de Decisão)
    
7. Multiplicadores Dinâmicos de Fase
    
8. Parâmetros Ajustáveis
    
9. Extensões Futuras (Não MVP)
    

---

# 1. **PROPÓSITO**

O Inimigo Genérico é uma entidade neutra, usada para:

- testar todo o fluxo de combate
    
- validar postura, quebra e superquebra
    
- validar autoattack, crítico, multi-hit
    
- validar habilidade ativa da Velvet
    
- testar ordens de evento
    
- testar barras e UI futura
    

Ele não representa uma criatura real do jogo final — ele é um “boneco inteligente” para testes.

---

# 2. **ATRIBUTOS BASE**

Todos os valores são **placeholders**; não definimos números no MVP.

### **Atributos Fundamentais**

- HP Máximo
    
- HP Atual
    
- ATK
    
- DEF
    

### **Atributos de Crítico**

- Chance de Crítico (%)
    
- Dano Crítico (multiplicador)
    

### **Atributos de Postura**

- Postura Máxima
    
- Postura Atual
    

### **Atributos Especiais**

- Chance de Multi-Hit (1 hit extra)
    
- Chance de aplicar DoT
    
- Chance de Contra-Ataque
    
- Dano de DoT
    
- Duração de DoT
    

### **Atributos da Habilidade Ativa (Opcional)**

- Energia Máxima
    
- Energia Atual
    
- Regeneração por turno (opcional)
    
- Cooldown
    
- Custo
    

---

# 3. **POSTURA**

O inimigo segue o sistema oficial de postura:

- reduz postura ao ser atingido
    
- reduz postura com multi-hits
    
- reduz postura à noite por DoT (após o turno)
    
- regenera postura no fim do turno dele
    
- em Quebra → não regenera
    
- em Superquebra → postura travada em 0
    

---

# 4. **ESTADOS**

O inimigo pode estar em:

- **Normal**
    
- **Preparando Ataque Forte**
    
- **Quebrado (1 turno)**
    
- **Superquebrado (2 turnos)**
    
- **Sob efeito de DoT**
    
- **Morto**
    

---

# 5. **AÇÕES DO INIMIGO (MVP)**

O inimigo pode executar **somente 3 ações**, para manter o MVP simples:

---

## ✔ 1. Autoataque

Ataque básico.

Efeito:

- dano baseado em ATK
    
- pode critar
    
- reduz postura da Velvet
    
- pode aplicar DoT (chance)
    
- chance de multi-hit reduzido
    

---

## ✔ 2. Preparar Ataque Forte

O inimigo entra no estado:

`preparandoAtaqueForte = true`

No log/UI:

> “O inimigo está preparando um ataque poderoso!”

---

## ✔ 3. Ataque Forte (Carga liberada)

No turno seguinte, se estava preparando:

- causa dano maior (multiplicador)
    
- reduz postura extra
    
- aplica crítico normalmente
    
- inicia cooldown
    
- sai do estado de preparação
    

---

# 6. **IA DO INIMIGO (LÓGICA MVP)**

A IA minimalista segue regras claras, simples e robustas:

---

### 🧠 **1) Se estiver quebrado**

→ perde o turno automaticamente.

---

### 🧠 **2) Se estava preparando um ataque**

→ usa **Ataque Forte**  
→ inicia cooldown  
→ `preparandoAtaqueForte = false`  
→ fim do turno.

---

### 🧠 **3) Habilidade Forte disponível?**

`if (cooldown == 0):     30% chance → Preparar Ataque Forte     70% chance → Autoataque else:     Autoataque`

---

## ✅ Resultado:

- simples
    
- funciona em produção
    
- divertido para jogar
    
- fácil de balancear
    
- fácil de implementar
    
- com picos e vales de dificuldade
    
- sem comportamentos estranhos
    

Esse comportamento já cria uma **curva de drama**, mesmo em um MVP.

---

# 7. **MULTIPLICADORES DINÂMICOS DE FASE**

Para evitar que todas as runs sejam idênticas, o inimigo recebe multiplicadores **aleatórios dentro de intervalos** definidos pela fase.

---

## 🎯 **Estrutura de multiplicadores por fase:**

Cada fase tem intervalos configuráveis:

`HP:        [min, max] ATK:       [min, max] DEF:       [min, max] POSTURA:   [min, max] REGPOST:   [min, max] RES_DOT:   [min, max] RES_POST:  [min, max]`

Ao gerar o inimigo:

`HP = HP_BASE * Random(HP_MIN[fase], HP_MAX[fase]) ATK = ATK_BASE * Random(ATK_MIN[fase], ATK_MAX[fase]) ...`

Esses modificadores tornam cada luta **levemente diferente**, mantendo o jogo vivo sem complexidade.

---

# 8. **PARÂMETROS AJUSTÁVEIS (MVP)**

Ajustáveis em arquivo/config:

- chance de atacar forte
    
- cooldown do ataque forte
    
- chance de preparar ataque forte
    
- chance de multi-hit
    
- chance de contra-ataque
    
- chance de aplicar DoT
    
- resistência a DoT
    
- postura máxima
    
- regeneração de postura
    

Diminuir a monotonia sem IA avançada.

---

# 9. **EXTENSÕES FUTURAS (NÃO MVP)**

Listamos aqui apenas para referência, não para implementação:

- raridade de inimigos (comum, raro, elite)
    
- traits que mudam comportamento
    
- buffs defensivos específicos
    
- leitura do comportamento da Velvet
    
- inimigos de suporte
    
- inimigos que manipulam postura
    
- inimigos que manipulam DoT
    
- inimigos que atacam múltiplas vezes por turno
    
- padrões complexos tipo mini-boss
    

---

# 📌 **DOCUMENTO FINALIZADO**

Este documento está pronto para ser inserido no repositório.  
Ele completa a base do sistema de combate juntamente com:

- Velvet MVP Expandida
    
- MVP de Combate
    
- Sistema de Postura
    
- Sistema de Rotas