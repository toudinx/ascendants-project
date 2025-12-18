# UI — Roadmap da Cena de Batalha (Roadmap)

**Authority:** Roadmap (implementação/UX)  
**Status:** Ativo  
**Escopo:** Plano incremental para melhorar a cena de batalha. Não define regras do combate.  
**Projeto:** KAEZAN: AWAKENING  
**Última revisão:** 2025-12-17


## Regras do roadmap
- Cada fase deve ser implementada sem quebrar a anterior.
- Prioridade: **legibilidade → feedback → estética**.
- O log deve seguir o modelo “turno” definido em `10_COMBATE_REGRAS.md`.

## 🔰 FASE 0 — BASE (ATUAL)
- Sistema de combate tick-based funcional
- Autoplay estável
- HP / Postura / Energia
- Estados de combate (buffs, charge, break)
- Números flutuantes
- Log rápido

## 🏟️ FASE 1 — ARENA REAL (CENÁRIO)
- Criar `ArenaContainer`
- Adicionar cenário base (imagem ou gradiente + textura)
- Definir chão visual (plataforma, sombra ou linha de ancoragem)
- Separar camadas:
- Background (cenário)
- Midground (personagens)
- Foreground (efeitos)
- Jogador entende **onde a luta acontece**
- A tela deixa de parecer apenas UI

## 👥 FASE 2 — PERSONAGENS EM CAMPO
- Inserir sprite da Velvet na arena
- Estado inicial: `idle`
- Microanimações:
- Respiração leve
- Blink ocasional
- Inserir sprite pixelado simples
- Reação visual ao tomar hit (recuo / flash)
- Estado visual de "preparando ataque" (aura / charge)
- Existe troca visual entre dois personagens
- O cérebro reconhece ação e reação

## 🎭 FASE 3 — SISTEMA DE POSES DA VELVET (EVENT-DRIVEN)
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
- Velvet parece ativa e consciente
- Cada ação tem intenção visual clara

## ⚔️ FASE 4 — ATAQUES VISÍVEIS (ORIGEM → DESTINO)
- Projetil simples (linha, orb ou feixe)
- Origem clara (mão da Velvet ou do inimigo)
- Impacto no alvo:
- Flash
- Partículas
- Números flutuantes surgem **no ponto de impacto**
- Combate deixa de ser abstrato
- Jogador assiste o ataque acontecer

## 💥 FASE 5 — REAÇÃO E IMPACTO
- Recuo do inimigo ao tomar hit
- Tremida leve da arena em golpes fortes
- Flash visual de crítico
- Multi-hit com slashes rápidos
- Sensação de impacto
- Combate mais satisfatório visualmente

## ✨ FASE 6 — BUFFS, DOTS E ESTADOS VISUAIS
- Buff = aura ou partículas na Velvet
- DoT = efeito contínuo no inimigo
- Break / Superbreak = efeitos dedicados
- Energia cheia = brilho pulsante
- Leitura visual clara
- Menos dependência de texto/log

## 🎬 FASE 7 — POLISH CINEMÁTICO (OPCIONAL)
- Zoom leve em críticos
- Slow motion raro
- Efeito especial no primeiro break da luta
- Finalização dramática do inimigo
- Sensação de jogo premium
- Combates memoráveis mesmo em autoplay
