# RDGLOGEXPRESS

Site estático da RDGLOGEXPRESS com calculadora de corridas, sugestões de endereço e cálculo de rota via Mapbox.

## Estrutura

- `index.html` — marcação e conteúdo da página.
- `styles.css` — identidade visual e responsividade.
- `script.js` — calculadora, geocodificação, Directions, orçamento imprimível e painel administrativo local.
- `manus-routes.json` — manifesto da rota principal.
- `_headers` e `_redirects` — arquivos reconhecidos pelo Cloudflare Pages.

## Publicação no Cloudflare Pages

1. Crie um projeto no Cloudflare Pages conectado ao repositório, ou faça upload direto da pasta.
2. Para este projeto estático, deixe o comando de build vazio (ou use `true`).
3. Defina a pasta de saída como a raiz do projeto (`/`).
4. Publique `index.html`, `styles.css`, `script.js`, `manus-routes.json`, `_headers` e `_redirects`.

O token público do Mapbox permanece no JavaScript para manter a integração existente. No painel do Mapbox, restrinja esse token aos domínios de produção e preview do site.

## Observações

- O cálculo usa Mapbox Geocoding para sugestões e Mapbox Directions para a distância; quando uma API não responde, a lógica existente usa fallback por distância aproximada.
- As configurações administrativas são mantidas no `localStorage` do navegador. Não há backend ou segredo privado no site estático.
