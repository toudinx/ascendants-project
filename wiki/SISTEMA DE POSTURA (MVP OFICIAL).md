---
created: 2025-12-10T14:12
updated: 2025-12-10T14:12
---
# 📘 **ECOS DA ASCENSÃO — SISTEMA DE POSTURA (MVP OFICIAL)**

**Versão:** 0.1 (Alfa)  
**Status:** Aprovado para implementação imediata  
**Escopo:** Mínimo necessário para funcionar no MVP

---

# 🧩 SUMÁRIO

1. O que é Postura (MPV)
    
2. Como Postura é reduzida
    
3. Como Postura é regenerada
    
4. Condições de Quebra
    
5. Condições de Superquebra
    
6. Efeitos da Quebra
    
7. Efeitos da Superquebra
    
8. Prioridade de Eventos
    
9. Variáveis ajustáveis
    
10. Futuras expansões (placeholder)
    

---

# 1. **O QUE É POSTURA (MVP)**

Postura é uma barra secundária que representa a **estabilidade** de um personagem durante o combate.

Ela é independente do HP e funciona como um medidor de resistência a pressionamento.

### Todo personagem possui:

- **Postura Máxima** (valor fixado no balance do MVP)
    
- **Postura Atual**
    

**Quando postura chega a 0 → ocorrem estados de Quebra.**

---

# 2. **COMO POSTURA É REDUZIDA (MVP)**

Postura pode ser reduzida por:

### ✔ A) Hit Principal

- reduz postura com força total (fórmula base)
    

### ✔ B) Multi-Hits

- reduzem postura, mas em **fração menor**  
    _(ex: 20–40% da redução do hit principal)_
    

### ✔ C) DoT (final do turno do alvo)

- reduz postura levemente
    
- nunca causa superquebra
    
- nunca causa quebra imediata durante o ataque
    

---

# 3. **COMO POSTURA É REGENERADA**

No **final do turno do personagem**, se ele NÃO estiver quebrado:

- postura regenera lentamente
    
- taxa de regeneração é constante no MVP
    

Se ele estiver quebrado:

- postura NÃO regenera
    
- postura só volta a regenerar quando o estado termina
    

---

# 4. **CONDIÇÃO DE QUEBRA (NORMAL)**

Ocorre quando:

> A postura chega a **0**, mas NÃO foi reduzida de 100% → 0 no mesmo turno.

### Exemplo:

- personagem ataca
    
- postura reduz de 40 → 0  
    → QUEBRA NORMAL
    

---

# 5. **CONDIÇÃO DE SUPERQUEBRA**

Ocorre quando:

> A postura é reduzida de **100% → 0 dentro do mesmo turno**.

Isso significa:

- o atacante limpou toda a barra de uma vez
    
- seja por hit único forte ou múltiplos hits dentro do mesmo turno
    

Não depende de crítico.  
Não depende de rota.  
Não depende de personagem.

É puramente **output de postura no turno atual**.

---

# 6. **EFEITOS DA QUEBRA (1 TURNO)**

Ao entrar em Quebra:

1. O personagem fica **Atordoado / Exposto por 1 turno**
    
2. Perde sua próxima ação
    
3. Recebe dano aumentado
    
4. Postura não regenera nesse turno
    
5. Postura começa a regenerar **após** o turno perdido terminar
    

Quebra = punição leve, mas cria janela de ataque.

---

# 7. **EFEITOS DA SUPERQUEBRA (2 TURNOS)**

Ao entrar em Superquebra:

1. O personagem fica **Atordoado / Exposto por 2 turnos**
    
2. Perde duas ações
    
3. Recebe dano aumentado
    
4. Postura fica travada em 0 durante toda a duração
    
5. Após os 2 turnos → postura volta a regenerar
    

Superquebra = punição severa e janela de burst.

---

# 8. **PRIORIDADE DE EVENTOS**

Dentro da ação (ataque):

1. Aplicar hit principal
    
2. Aplicar multi-hits
    
3. Reduzir postura
    
4. Checar Quebra / Superquebra
    
5. Aplicar estado (se houver)
    

Fim do turno:

6. Aplicar DoTs
    
7. Reduzir postura por DoT
    
8. Regenerar postura (se aplicável)
    

---

# 9. **VARIÁVEIS AJUSTÁVEIS (PLACEHOLDERS)**

Essas variáveis NÃO são definidas agora, mas o sistema deve permitir:

- postura máxima
    
- taxa de regeneração
    
- fórmula de redução por hit
    
- fórmula de redução por multi-hit
    
- intensidade da redução por DoT
    
- intensidade do dano aumentado na quebra
    
- intensidade do dano aumentado na superquebra
    

---

# 10. **FUTURAS EXPANSÕES (REFERÊNCIA, NÃO IMPLEMENTAR AGORA)**

- interação de postura com rotas
    
- buffs e debuffs que alteram postura
    
- estado “quase quebrado”
    
- habilidades com dano baseado em postura
    
- postura compartilhada entre inimigos
    
- postura alternativa (ex: “escudos”)
    
- recuperação acelerada por cura
    
- superquebra com efeitos especiais
    

**NENHUM desses itens faz parte do MVP.**