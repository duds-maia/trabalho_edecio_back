# trabalho_edecio_front — Me Socorre

julia e eduardo

Frontend da plataforma **Me Socorre**, que conecta clientes a prestadores de serviço (chaveiro, encanador, eletricista…).
Responsivo: **mobile-first** com barra de navegação inferior no celular e layout em colunas no desktop.

- React 19 + **TypeScript**
- **CSS puro** com CSS Modules (um `.module.css` por componente/página) + tokens globais em `src/styles/tokens.css`
- React Router 7, Vite 7, ícones `lucide-react`
- Backend: [duds-maia/trabalho_edecio](https://github.com/duds-maia/trabalho_edecio) (pasta `Back/`)

## Como rodar

```bash
npm install
cp .env.example .env   # já vem com VITE_USE_MOCK=true
npm run dev
```

Abra http://localhost:5173.

### Modo demonstração (sem backend)

Com `VITE_USE_MOCK=true` o front usa uma API simulada em memória (`src/services/mock/`) que segue as mesmas regras do backend.
Na tela **Entrar** há botões para as contas de teste (qualquer senha):

| Perfil    | E-mail                |
| --------- | --------------------- |
| Cliente   | cliente@teste.com     |
| Prestador | prestador@teste.com   |
| Admin     | admin@teste.com       |

Os dados voltam ao estado inicial ao recarregar a página.

### Ligando no backend de verdade

1. Rode o backend (`Back/`) na porta 3000 (`npm run dev`).
2. No `.env` do front: `VITE_USE_MOCK=false` e `VITE_API_URL=/api`.
3. `npm run dev` — o Vite faz proxy de `/api/*` para `http://localhost:3000/*`, então não há problema de CORS.

Em produção, use `VITE_API_URL=https://url-do-backend` e adicione a URL do front em `CORS_ORIGINS` no backend.

## Estrutura

```
src/
├── components/        # Button, Input, Card, Modal, Header, BottomNav, Map, ProviderCard, Rating…
├── contexts/          # AuthContext (token JWT + usuário logado)
├── hooks/             # useAsync (loading/erro/reload)
├── pages/
│   ├── auth/          # Login, Register
│   ├── client/        # Home, Providers (busca + mapa), ProviderDetails, NewRequest, MyRequests, Profile
│   ├── provider/      # Dashboard (toggle de disponibilidade), Requests, Reviews, Profile
│   ├── admin/         # Dashboard, Providers, ProviderAnalysis, Requests, Reviews, Clients, Categories
│   └── shared/        # RequestDetails (cliente, prestador e admin, com ações por perfil)
├── routes/            # AppRoutes + rotas protegidas por perfil
├── services/          # api.ts (fetch + Bearer token) e um service por recurso da API
│   └── mock/          # API simulada para o modo demonstração
├── styles/            # tokens.css (paleta azul) e global.css
├── types/             # contratos TypeScript das respostas da API
└── utils/             # formatação e rótulos de status
```

## Rotas

| Rota | Quem acessa | Tela |
| --- | --- | --- |
| `/` | público | Página inicial (wireframe 1) |
| `/prestadores` | público | Busca e mapa (wireframe 2) |
| `/prestadores/:id` | público | Perfil do prestador (wireframe 3) |
| `/solicitacoes/nova` | público* | Nova solicitação (wireframe 4) — *pede login só na hora de enviar e guarda o rascunho |
| `/entrar`, `/cadastro` | público | Login e cadastro (cliente ou prestador) |
| `/minhas-solicitacoes`, `/perfil` | cliente | Acompanhar solicitações / meus dados |
| `/solicitacoes/:id` | logado | Detalhe com linha do tempo, cancelar, avaliar, aceitar/iniciar/concluir, valor final |
| `/prestador/*` | prestador | Painel, solicitações, avaliações, perfil |
| `/admin/*` | admin | Visão geral, moderação de prestadores, solicitações, avaliações, clientes, categorias |

## Pontos para alinhar com o backend

Coisas que o front já trata, mas que ficariam melhores com ajustes na API:

- **Mapa / distância**: o backend removeu os campos de localização. O componente `Map` é ilustrativo e a distância é fictícia (`pseudoDistance`). Quando houver latitude/longitude, basta trocar o conteúdo de `components/Map/Map.tsx` (Google Maps, etapa 7 do PRD).
- **Foto na solicitação**: a API aceita só `fotoUrl` (link). Upload de arquivo precisaria de um endpoint.
- **Avaliação já feita**: `GET /requests/:id` não retorna `review`; o front guarda no navegador quais já foram avaliadas e trata o erro 409.
- **Prestador pendente**: `GET /providers/:id` só devolve aprovados, então o prestador pendente não consegue ver o próprio perfil. Um `GET /providers/me` resolveria.
- **Admin — análise individual**: não há `GET /admin/providers/:id`; a tela filtra a listagem.
- **Descrição/bio do prestador**: não existe no schema; o perfil usa a descrição da categoria.
