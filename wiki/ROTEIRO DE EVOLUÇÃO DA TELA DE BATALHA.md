---
created: 2025-12-12T00:55
updated: 2025-12-12T00:55
---
# 📘 ECOS DA ASCENSÃO — ROTEIRO DE EVOLUÇÃO DA TELA DE BATALHA

**Documento Oficial — Combate Cinemático Autoplay**  
**Versão:** 1.0  
**Status:** Diretriz estratégica aprovada para implementação incremental

---

## 🎯 OBJETIVO DO DOCUMENTO

Definir um **roteiro claro, incremental e executável** para evoluir a tela de batalha de:

> _"UI baseada em números e logs"_

para:

> _"Arena viva, com personagens, intenção, impacto e espetáculo visual"_

Sem reescrever o core do combate e mantendo total compatibilidade com **Angular + tick-based autoplay**.

---

## 🧠 PRINCÍPIO CENTRAL

> **Em jogos turn-based com autoplay, o jogador não joga — ele assiste.**

Logo:

- A **apresentação da batalha** é o produto
    
- A arena é o palco principal
    
- A UI existe para apoiar o espetáculo
    

---

## 🧭 VISÃO GERAL DO ROTEIRO

O roteiro é dividido em **fases independentes**, onde **cada fase já melhora significativamente o jogo**.

📌 **Nenhuma fase depende da próxima para ser válida.**

---

## 🔰 FASE 0 — BASE (ATUAL)

**Status:** ✔ Concluída

### O que já existe:

- Sistema de combate tick-based funcional
    
- Autoplay estável
    
- HP / Postura / Energia
    
- Estados de combate (buffs, charge, break)
    
- Números flutuantes
    
- Log rápido
    

👉 Esta base **não será refatorada**.

---

## 🏟️ FASE 1 — ARENA REAL (CENÁRIO)

🎯 **Meta:** A batalha precisa acontecer em um _lugar_, não em um painel abstrato.

### Implementações:

- Criar `ArenaContainer`
    
- Adicionar cenário base (imagem ou gradiente + textura)
    
- Definir chão visual (plataforma, sombra ou linha de ancoragem)
    
- Separar camadas:
    
    - Background (cenário)
        
    - Midground (personagens)
        
    - Foreground (efeitos)
        

### Resultado esperado:

- Jogador entende **onde a luta acontece**
    
- A tela deixa de parecer apenas UI
    

---

## 👥 FASE 2 — PERSONAGENS EM CAMPO

🎯 **Meta:** Transformar entidades lógicas em **atores visuais**.

### Velvet:

- Inserir sprite da Velvet na arena
    
- Estado inicial: `idle`
    
- Microanimações:
    
    - Respiração leve
        
    - Blink ocasional
        

### Inimigo:

- Inserir sprite pixelado simples
    
- Reação visual ao tomar hit (recuo / flash)
    
- Estado visual de "preparando ataque" (aura / charge)
    

### Resultado esperado:

- Existe troca visual entre dois personagens
    
- O cérebro reconhece ação e reação
    

---

## 🎭 FASE 3 — SISTEMA DE POSES DA VELVET (EVENT-DRIVEN)

🎯 **Meta:** Velvet reage ao combate sem animação frame-a-frame.

### Implementações:

- Definir estados de sprite:
    
    - idle
        
    - attack
        
    - cast
        
    - buff
        
    - defend
        
    - victory
        
    - down
        
- Troca de sprite **baseada em eventos do combate**
    
- Retorno automático ao estado `idle`
    

### Resultado esperado:

- Velvet parece ativa e consciente
    
- Cada ação tem intenção visual clara
    

---

## ⚔️ FASE 4 — ATAQUES VISÍVEIS (ORIGEM → DESTINO)

🎯 **Meta:** Todo dano precisa ter trajetória visual.

### Implementações:

- Projetil simples (linha, orb ou feixe)
    
- Origem clara (mão da Velvet ou do inimigo)
    
- Impacto no alvo:
    
    - Flash
        
    - Partículas
        
- Números flutuantes surgem **no ponto de impacto**
    

### Resultado esperado:

- Combate deixa de ser abstrato
    
- Jogador assiste o ataque acontecer
    

---

## 💥 FASE 5 — REAÇÃO E IMPACTO

🎯 **Meta:** Dar peso físico às ações.

### Implementações:

- Recuo do inimigo ao tomar hit
    
- Tremida leve da arena em golpes fortes
    
- Flash visual de crítico
    
- Multi-hit com slashes rápidos
    

### Resultado esperado:

- Sensação de impacto
    
- Combate mais satisfatório visualmente
    

---

## ✨ FASE 6 — BUFFS, DOTS E ESTADOS VISUAIS

🎯 **Meta:** Estados devem ser compreendidos sem leitura.

### Implementações:

- Buff = aura ou partículas na Velvet
    
- DoT = efeito contínuo no inimigo
    
- Break / Superbreak = efeitos dedicados
    
- Energia cheia = brilho pulsante
    

### Resultado esperado:

- Leitura visual clara
    
- Menos dependência de texto/log
    

---

## 🎬 FASE 7 — POLISH CINEMÁTICO (OPCIONAL)

🎯 **Meta:** Criar momentos memoráveis.

### Implementações:

- Zoom leve em críticos
    
- Slow motion raro
    
- Efeito especial no primeiro break da luta
    
- Finalização dramática do inimigo
    

### Resultado esperado:

- Sensação de jogo premium
    
- Combates memoráveis mesmo em autoplay
    

---

## 🧠 REGRA DE OURO

> **Se algo acontece no log, precisa acontecer na arena.**

Caso contrário, é considerado _bug visual_.

---

## 📌 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. FASE 1 — Arena
    
2. FASE 2 — Personagens
    
3. FASE 4 — Ataques visíveis
    
4. FASE 3 — Poses da Velvet
    
5. FASE 5 — Impacto
    
6. FASE 6 — Estados
    
7. FASE 7 — Polish
    

---

## 🏁 CONCLUSÃO

Este roteiro permite:

- Evolução incremental
    
- Alto impacto visual
    
- Baixo risco técnico
    
- Total compatibilidade com Angular
    
- Forte alinhamento com monetização waifu-driven
    

> **O sucesso do jogo não está na complexidade do sistema, mas na forma como a batalha é apresentada.**

---

📌 **Este documento deve ser tratado como diretriz oficial para toda implementação visual da tela de batalha.**