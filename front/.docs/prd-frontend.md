# PRD — Frontend do Iffod

## 1. Visão geral

O frontend do Iffod terá três interfaces distintas — cliente, prestador e admin — todas consumindo a mesma API REST do backend, cada uma com suas próprias telas e permissões.

## 2. Stack tecnológica

- React + TypeScript
- Tailwind CSS
- React Router
- Vite
- Biblioteca de mapas do Google Maps (a definir na etapa de integração)

## 3. Estrutura de pastas

```
frontend/
│
├── src/
│   ├── components/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   ├── Modal/
│   │   ├── Header/
│   │   ├── Sidebar/
│   │   ├── Map/
│   │   ├── ProviderCard/
│   │   ├── Rating/
│   │   └── Loading/
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── Login.tsx
│   │   │   └── Register.tsx
│   │   │
│   │   ├── client/
│   │   │   ├── Home.tsx
│   │   │   ├── NewRequest.tsx
│   │   │   ├── Providers.tsx
│   │   │   ├── ProviderDetails.tsx
│   │   │   ├── MyRequests.tsx
│   │   │   └── Profile.tsx
│   │   │
│   │   ├── provider/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Requests.tsx
│   │   │   ├── RequestDetails.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── Reviews.tsx
│   │   │
│   │   └── admin/
│   │       ├── Dashboard.tsx
│   │       ├── Providers.tsx
│   │       ├── ProviderAnalysis.tsx
│   │       ├── Reviews.tsx
│   │       ├── Clients.tsx
│   │       ├── Requests.tsx
│   │       └── Categories.tsx
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx
│   │
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── client.service.ts
│   │   ├── provider.service.ts
│   │   ├── request.service.ts
│   │   ├── review.service.ts
│   │   └── admin.service.ts
│   │
│   ├── routes/
│   │   └── AppRoutes.tsx
│   │
│   ├── types/
│   ├── hooks/
│   ├── utils/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── public/
├── .env
├── package.json
└── vite.config.ts
```

## 4. Regras por tipo de usuário

- **Prioridade mobile-first** — o cliente pode estar em situação de emergência, então o fluxo de solicitação precisa ser curto e simples (poucos passos, sem formulário extenso).
- **Cliente**: acessa apenas suas próprias solicitações, prestadores próximos e seu perfil.
- **Prestador**: só aparece disponível para matching quando o status estiver `DISPONÍVEL` — a interface deve deixar esse toggle bem visível (dashboard).
- **Admin**: acesso à moderação de prestadores (pendente/aprovado/suspenso/banido) e visão geral da plataforma.
- Token JWT fica salvo no `AuthContext` e é enviado via `Authorization: Bearer <token>` em `services/api.ts`.

## 5. Etapas de desenvolvimento

### Etapa 1 — Setup do projeto
- Criar projeto com Vite + React + TypeScript.
- Configurar Tailwind CSS.
- Configurar React Router (`AppRoutes.tsx`).
- Criar `.env` com a URL da API backend.

### Etapa 2 — Layout base e componentes reutilizáveis
- Criar componentes genéricos: Button, Input, Card, Modal, Header, Sidebar, Loading.
- Definir identidade visual (cores, tipografia) do Iffod.

### Etapa 3 — Autenticação
- Telas de Login e Cadastro (cliente e prestador).
- `AuthContext.tsx`: usuário logado, tipo de usuário, token, login, logout.
- `services/api.ts`: instância central de requisições, injetando o token JWT.
- Rotas protegidas por tipo de usuário (cliente/prestador/admin).

### Etapa 4 — Área do cliente
- `Home.tsx`: visualização de categorias de serviço.
- `NewRequest.tsx`: fluxo de nova solicitação (categoria → descrição → foto → endereço → localização → emergência/agendamento).
- `Providers.tsx`: lista de prestadores próximos com mapa, distância, avaliação e disponibilidade.
- `ProviderDetails.tsx`: dados do prestador, avaliações, comentários e resumo gerado pelo Gemini.
- `MyRequests.tsx`: status das solicitações do cliente.
- Fluxo de avaliação ao final do atendimento.

### Etapa 5 — Área do prestador
- `Dashboard.tsx`: toggle de disponibilidade (🟢 Disponível / 🔴 Indisponível) e atualização de localização.
- `Requests.tsx`: solicitações novas, aceitas e concluídas.
- `RequestDetails.tsx`: aceitar, iniciar, concluir atendimento e informar valor final.
- `Profile.tsx` e `Reviews.tsx`: dados do prestador e avaliações recebidas.

### Etapa 6 — Área do administrador
- `Dashboard.tsx`: visão geral da plataforma.
- `Providers.tsx`: listagem por status (pendentes/aprovados/suspensos/banidos).
- `ProviderAnalysis.tsx`: análise individual (dados cadastrais, categoria, endereço, perfil, avaliações) com ações de aprovar/reprovar/suspender/banir.
- `Reviews.tsx`, `Clients.tsx`, `Requests.tsx`, `Categories.tsx`: gerenciamento geral.

### Etapa 7 — Integração com Google Maps
- Componente `Map/` reutilizável para exibir prestadores próximos e localização da solicitação.

### Etapa 8 — Responsividade e refinamento
- Revisar todas as telas com prioridade mobile, depois tablet e desktop.
- Ajustes finais de UX no fluxo de solicitação de emergência (reduzir passos, feedback visual claro).
