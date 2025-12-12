---
created: 2025-12-10T15:27
updated: 2025-12-10T15:27
---
# 📘 **ECOS DA ASCENSÃO — VELVET (MVP EXPANDIDA PARA TESTES)**

**Versão:** 0.2  
**Status:** Aprovado como personagem protótipo  
**Objetivo:** Servir como personagem _sandbox_ para testar todos os sistemas do combate

---

# 🧩 SUMÁRIO

1. Propósito da Velvet MVP Expandida
    
2. Atributos Base
    
3. Autoattack
    
4. Habilidade Ativa
    
5. Multi-Hit
    
6. Crítico e Dano Crítico
    
7. Penetração de Postura
    
8. DoT
    
9. Contra-ataque
    
10. Regeneração de Energia
    
11. Estados
    
12. Loop de Turno
    
13. Observações finais
    

---

# 1. **PROPÓSITO DA VELVET MVP EXPANDIDA**

Esta versão da Velvet NÃO é um personagem real.  
Ela é uma _ferramenta de desenvolvimento_.

Ela existe para:

✔ testar **todas** as submecânicas  
✔ testar interações simultâneas  
✔ validar o fluxo de combate completo  
✔ depurar postura, crítico e DoT  
✔ simular comportamentos avançados  
✔ preparar terreno para futuros personagens

Essa Velvet é um _super boneco de testes_, não uma entidade de lore.

---

# 2. **ATRIBUTOS BASE**

Velvet MVP possui os seguintes atributos (placeholder):

### **Atributos Fundamentais**

- HP Máximo
    
- ATK Base
    
- DEF Base
    

### **Atributos de Crítico**

- **Chance de Crítico (%)**
    
- **Dano Crítico (multiplicador)**
    

### **Atributos de Postura**

- Postura Máxima
    
- Penetração de Postura (%)  
    _(penetração ignora parte da postura efetiva do alvo)_
    

### **Atributos da Habilidade Ativa**

- Energia Máxima
    
- Energia Atual
    
- Regeneração de Energia por turno  
    _(alternativamente: por ação)_
    
- Custo da habilidade ativa
    
- Cooldown base (em turnos)
    

### **Atributos Especiais**

- Chance de Multi-hit
    
- Chance de aplicar DoT
    
- Chance de Contra-Ataque
    
- Dano de DoT (placeholder)
    
- Redução de postura por multi-hit
    
- Duração do estado de DoT
    

**IMPORTANTE:**  
_Nenhum valor é definido aqui — apenas a EXISTÊNCIA do atributo._

---

# 3. **AUTOATAQUE**

### **Efeito principal:**

- causa dano baseado em ATK
    
- pode critar
    
- reduz postura (100% da fórmula base)
    
- aplica penetração de postura
    
- gera energia
    
- pode aplicar DoT (para testes)
    

### **Ordem de resolução:**

1. calcular crítico
    
2. calcular dano
    
3. aplicar penetração
    
4. aplicar dano
    
5. reduzir postura
    
6. checar quebra / superquebra
    
7. aplicar multi-hits (se houver)
    

---

# 4. **HABILIDADE ATIVA (MVP)**

Uma habilidade simples, sem efeitos complexos, só para validar:

### ⭐ **“Impacto Arcano”** (placeholder)

- dano = **X × autoattack**
    
- gera multi-hit igual ao autoattack
    
- escala com crítico
    
- reduz postura como ataque normal, porém potencializado
    
- respeita penetração de postura
    
- aplica DoT (se parâmetro habilitado)
    

### **Energia & Cooldown**

- custo: variável
    
- cooldown: variável
    
- regeneração: por turno ou ação
    

**Objetivo:**  
garantir que o sistema de cooldown, energia e ação especial esteja funcional.

---

# 5. **MULTI-HIT**

Velvet MVP possui:

- **Chance de acionar multi-hit**
    
- **Número de hits extras fixo (ex: 1 ou 2)**
    

Hit extra:

- dano reduzido
    
- postura reduzida em fração
    
- pode critar independentemente
    
- pode aplicar DoT também
    

---

# 6. **CRÍTICO E DANO CRÍTICO**

### **Chance de Crítico**

Valor percentual.

### **Dano Crítico**

Multiplicador aplicado em caso de crítico.

### **Regra:**

- hit principal pode critar
    
- cada multi-hit pode critar separadamente
    
- crítico afeta tanto dano quanto postura reduzida  
    _(se quiser — pode ficar opcional)_
    

---

# 7. **PENETRAÇÃO DE POSTURA**

Velvet ignora **X% da postura efetiva do alvo**.

Exemplo (não numérico, apenas conceito):

- Alvo tem 50 de postura
    
- Velvet tem 30% de penetração
    
- Postura tratada = 35
    

Funciona em:

- hit principal
    
- multi-hits
    
- habilidade ativa
    

---

# 8. **DOT (TESTE)**

Velvet MVP pode aplicar DoT com:

- chance fixa
    
- duração fixa
    
- dano por tick
    
- postura reduzida por tick
    

DoT resolve **no final do turno do alvo**, seguindo o sistema oficial.

---

# 9. **CONTRA-ATAQUE**

Velvet MVP pode ter:

- chance de contra-atacar quando toma dano
    
- contra-ataque = ataque básico simplificado
    
- não gera energia
    
- pode critar
    
- reduz postura do inimigo
    

Serve para validar:

- triggers reativos
    
- ordem de eventos
    
- resolução sem quebrar o fluxo do turno
    

---

# 10. **REGENERAÇÃO DE ENERGIA**

Velvet ganha energia por:

- autoataque
    
- sofrer dano
    
- final de turno
    
- final de rodada
    
- multi-hits (opcional)
    

Isso existe apenas para testar cooldowns e habilidades especiais.

---

# 11. **ESTADOS**

Velvet pode estar em:

- normal
    
- DoT ativo
    
- postura quebrada (1 turno)
    
- superquebrada (2 turnos)
    
- morto
    
- cooldown ativo da habilidade
    

---

# 12. **LOOP DE TURNO (COM HABILIDADE E CRÍTICO)**

### **1. Início do turno**

- verificar se está quebrada
    
- reduzir duração do estado
    
- reduzir cooldown da habilidade
    

### **2. Escolher ação**

- autoataque
    
- habilidade ativa (se carregada)
    

### **3. Resolver ação**

1. crítico
    
2. dano
    
3. postura
    
4. multi-hit
    
5. DoT (se ação permitir)
    

### **4. Tick final do turno**

- DoT
    
- postura do DoT
    
- regeneração de postura
    
- regeneração de energia
    

### **5. Próximo turno**

---

# 13. **OBSERVAÇÕES FINAIS**

A Velvet MVP Expandida é um _playground_.

Ela permite testar:

- sistema de combate
    
- pipeline de eventos
    
- postura
    
- superquebra
    
- DoT
    
- crítico
    
- multi-hit
    
- cooldown
    
- energia
    
- contra-ataque
    
- penetração
    

Depois que tudo funcionar, **criamos a Velvet real (Sentinela)** com seu kit completo.