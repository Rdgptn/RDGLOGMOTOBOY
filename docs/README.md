# RDGLOGEXPRESS — projeto organizado

Esta versão separa o site por responsabilidade e adiciona uma navegação em formato de OS (ordem de serviço), com menu lateral e acesso rápido às áreas principais.

## Estrutura de pastas

```text
rdglogexpress-organizado/
├── index.html                 # página principal e marcação das telas
├── assets/
│   ├── css/
│   │   ├── styles.css         # estilos originais/componentes
│   │   └── layout.css         # layout novo da OS e responsividade
│   └── js/
│       ├── config.js          # configurações editáveis da operação
│       └── app.js             # cálculo, autocomplete, PDF, WhatsApp e painel
├── data/
│   └── rates.json             # cópia legível das tarifas padrão
├── docs/
│   └── README.md              # este guia
└── backup/
    └── index-original.html   # arquivo enviado, preservado
```

## Como fazer alterações

- **Cores, menu lateral e layout da OS:** edite `assets/css/layout.css`.
- **Estilos dos cards, formulário e página:** edite `assets/css/styles.css`.
- **Tarifas, WhatsApp, senha do painel e token de mapa:** edite `assets/js/config.js`.
- **Lógica de cálculo, geração do PDF e interações:** edite `assets/js/app.js`.
- **Conteúdo e campos da página:** edite `index.html`.
- **Consulta rápida das tarifas:** veja `data/rates.json`. O site usa `config.js` como fonte de configuração e também salva ajustes feitos pelo painel administrativo no `localStorage` do navegador.

## Como abrir

Para testar recursos como autocomplete e geração de PDF, abra por um servidor local na pasta do projeto, por exemplo:

```bash
cd rdglogexpress-organizado
python3 -m http.server 8000
```

Depois acesse `http://localhost:8000`.

> A senha administrativa continua configurada em `assets/js/config.js`. Por segurança, em produção a autenticação deve ser movida para um servidor; qualquer senha em JavaScript do navegador pode ser visualizada por quem acessar o site.
