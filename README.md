# Handball-3D

Ferramenta web para visualizar lances de andebol em 3D.

- Campo oficial (40×20 m) + balizas
- Avatares genéricos — azul vs vermelho
- Bola
- Campo virtual por cima do vídeo (arrastar, não é preciso clicar nos 4 cantos)
- Geração 3D aproximada a partir do clip
- Exportar o vídeo 3D

## Uso

1. Carrega um lance curto
2. Pausa e alinha o campo amarelo com as linhas visíveis
3. Gera a representação 3D
4. Exporta se precisares

## Correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Deploy

Publica a branch **main** mais recente (não um commit antigo).

## Stack

Next.js + TypeScript + Tailwind + React Three Fiber + Three.js + TensorFlow.js (deteção no browser)
