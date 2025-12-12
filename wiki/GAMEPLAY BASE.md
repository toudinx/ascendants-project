---
created: 2025-12-10T02:05
updated: 2025-12-10T02:05
---
# 🎮 **GAMEPLAY BASE — Versão 1.0**

_(Documento Oficial — Núcleo do Sistema de Jogo)_

---

# 📌 1. Filosofia Geral da Gameplay

O jogo deve ser:

- **rápido** (loop curto)
    
- **viciante** (feedback constante)
    
- **simples de jogar**
    
- **forte em sensação de poder**
    
- **agradável visualmente** (waifu + efeitos)
    
- **modular** (suporta múltiplos modos de jogo)
    

A experiência de gameplay é sempre construída sobre:

> **tick-based explosivo + buildcraft leve + momentos de evolução transformacional.**

---

# ⚡ 2. Sistema de Combate — _Tick-Based Explosivo_

O jogo opera em ciclos automáticos chamados **ticks**.

Cada **tick** é um micro-turno que ocorre em intervalos fixos (ex.: 0.75s), no qual são processados:

- ataques do jogador
    
- ataques do inimigo
    
- críticos
    
- ecos
    
- venenos e outros status
    
- buffs e debuffs
    
- efeitos especiais
    
- lógica de evolução
    
- atualizações de UI
    
- verificação de morte
    

O tic é o **ritmo** do jogo, equilibrando:

- visibilidade
    
- impacto
    
- velocidade
    
- caos controlado
    

A velocidade base do tick é fixa no início da run, mas pode ser **reduzida** por upgrades, aumentando o ritmo e a intensidade do combate.

---

# 🔥 3. Ataque e Feedback Visual

A cada tick:

1. O jogador causa dano automaticamente.
    
2. Números flutuantes aparecem na tela.
    
3. Críticos e efeitos têm destaque visual.
    
4. Inimigos reagem (perda de vida, efeitos).
    
5. A UI atualiza o estado da batalha.
    

Esse sistema cria:

- sensação constante de ação
    
- progressão visual clara
    
- fácil leitura da força da build
    
- forte potencial de clipes virais
    

---

# 🧱 4. Buildcraft Leve (Estilo Vampire Survivors)

A gameplay base é construída em torno de **escolhas rápidas** que incrementam poder.

Características:

- upgrades simples
    
- efeitos diretos
    
- decisões frequentes
    
- nada complexo ou profundo
    
- fácil de entender
    
- difícil de largar
    

Exemplos de upgrades:

- +20% crítico
    
- ataques ecoam
    
- veneno explode
    
- +dano espiritual
    
- +velocidade de tick
    
- multi-hit
    

O foco é **impacto imediato**, não estratégia complicada.

---

# 💥 5. Evoluções (Momentos "WOW")

Evoluções são combinações especiais de upgrades que alteram drasticamente o combate.

Características:

- raras
    
- poderosas
    
- fáceis de entender
    
- transformacionais
    
- núcleo do “momento hype” da run
    

Evoluções mudam completamente:

- padrão de ataque
    
- quantidade de hits
    
- tipo de dano
    
- ritmo do combate
    
- explosões e efeitos
    

Esses momentos são fundamentais para sensação de:

- power fantasy
    
- variedade
    
- “essa build ficou insana”
    

---

# 💫 6. Sensação da Run

Toda run deve transmitir:

- crescimento rápido
    
- explosões constantes de poder
    
- conquistas relevantes
    
- builds emergentes
    
- fantasia de ficar absurdamente forte
    
- satisfação imediata
    
- tomada de decisão leve (quase automática)
    

A run deve **sempre parecer que valeu a pena**, não apenas por concluir, mas por:

- completar evoluções
    
- ver números gigantes
    
- testar combinações
    
- ver a Velvet brilhar
    

O jogador deve terminar pensando:

> “Vou fazer só mais uma.”

---

# 🎨 7. Estética e Identidade Visual

A estética é central:

- Velvet deve ser sempre visível
    
- efeitos simples e elegantes (CSS/JS)
    
- números grandes e satisfatórios
    
- partículas leves
    
- cores legíveis
    
- foco na waifu como centro emocional
    

O combate não depende de animações complexas — o sistema tick-based permite efeitos minimalistas.

---

# 🔧 8. Modularidade e Extensibilidade

O sistema de gameplay base é flexível e suporta múltiplos futuros modos:

- 1x1
    
- hordas
    
- boss rush
    
- torre/portal
    
- arena infinita
    
- diárias
    
- eventos
    

Nada no núcleo depende do tipo de inimigo ou do formato da sala.

O **tick** é a unidade fundamental que garante consistência entre modos.

---

# 🧩 9. O que NÃO pertence ao Core (mantido fora para manter simplicidade)

Os seguintes itens são deliberadamente excluídos da gameplay base:

❌ quantidade de salas  
❌ quantidade de inimigos por sala  
❌ formato da arena  
❌ história, lore ou narrativa  
❌ sistemas meta (resina, gacha, diárias)  
❌ progressão de conta  
❌ modos específicos

Esses elementos são adicionados em camadas superiores, sem afetar o núcleo.

---

# 🎯 10. Definição Final do Core

> **O núcleo da gameplay é um sistema de combate automático baseado em ticks rápidos, combinando builds leves com evoluções transformacionais, proporcionando runs curtas, poderosas e altamente viciantes, centradas na presença estética da Velvet.**