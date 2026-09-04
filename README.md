# Handball-3D

Ferramenta web simples para visualizar lances de andebol em 3D:

- Campo aproximado + balizas
- Avatares genéricos — **azul** vs **vermelho**
- Bola
- Demo de contra-ataque
- Upload de vídeo de referência (lado a lado)
- Câmara interativa

Não extrai automaticamente o lance do vídeo. O vídeo serve como referência visual ao lado da representação 3D.

## Correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:3000

## Deploy na Vercel

1. Importa este repositório em [vercel.com](https://vercel.com/new)
2. Framework: Next.js (detetado automaticamente)
3. Deploy

## Stack

Next.js + TypeScript + Tailwind + React Three Fiber + Three.js
