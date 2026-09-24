# Brain dump — backend Me Socorre

> Registro de contexto do backend em 11/09/2026. Este arquivo descreve o que está implementado no código hoje; para a visão de produto e histórico de etapas, ver também `prd.md`.

## O produto que estamos criando

**Me Socorre** é uma plataforma para conectar pessoas que precisam de serviços locais — como chaveiro, encanador, eletricista e vidraceiro — a prestadores cadastrados. O cliente pesquisa profissionais disponíveis, escolhe diretamente um deles e cria uma solicitação. O prestador escolhido aceita e executa o atendimento; depois, o cliente pode avaliá-lo.

O foco deste MVP é a escolha manual de um profissional aprovado e disponível. Não há despacho automático, pagamento, chat, e-mail/notificações nem geolocalização/mapas neste momento.

## Stack e execução

- Node.js 20.19+, 22.12+ ou 24+, TypeScript e Express 5 para a API REST.
- PostgreSQL (pensado para Neon) via Prisma 7 e `@prisma/adapter-pg`.
- Zod para validar entradas, bcrypt com custo 12 para senhas e JWT com validade de 1 dia para sessão.
- CORS restrito por variável de ambiente, corpo JSON limitado a 1 MB e rate limiting global e reforçado nas rotas de autenticação.
- Gemini (`@google/genai`) para resumir avaliações de prestadores, sempre no backend.
- Roteiro automatizado de integração em `tests/integracao.ts`.

Comandos úteis:

```bash
npm run dev                # servidor em PORT ou 3000
npm run build              # gera Prisma e valida TypeScript
npm run db:seed            # categorias iniciais e admin opcional
npm run test:integration   # roteiro automatizado de integração
```

Variáveis esperadas em `.env`: `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `TRUST_PROXY`, `GEMINI_API_KEY` (opcional), `GEMINI_MODEL` (padrão `gemini-2.5-flash`) e, para o seed do admin, `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`. Nenhuma credencial deve ir para o repositório.

## Modelo de dados

Há cinco entidades principais:

- `User`: conta base de cliente, prestador ou administrador. Armazena nome, e-mail único, hash da senha, telefone e endereço.
- `ProviderProfile`: perfil complementar, um para cada `User` com papel `PROVIDER`. Vincula o profissional a uma categoria e guarda aprovação, disponibilidade, destaque, média de avaliações, endereço e cache do resumo por IA.
- `Category`: catálogo de tipos de serviço.
- `ServiceRequest`: solicitação entre cliente, categoria e prestador escolhido; inclui descrição, endereço, tipo imediato/agendado, data, foto opcional, status e valor final.
- `Review`: uma avaliação por solicitação concluída, contendo nota de 1 a 5 e comentário opcional.

Papéis de usuário: `CLIENT`, `PROVIDER` e `ADMIN`.

Status de prestador: `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED`, `BANNED`.

Status de solicitação: `PENDING`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

## Regras de negócio que não podem se perder

- Um novo prestador inicia como `PENDING`; só aparece publicamente quando está `APPROVED` **e** `isAvailable = true`.
- O cliente precisa escolher um `idPrestador` ao criar a solicitação. A API confere aprovação, disponibilidade e compatibilidade entre categoria escolhida e categoria do prestador.
- A solicitação fica vinculada ao prestador escolhido: somente ele pode vê-la, aceitá-la e avançar o atendimento.
- O aceite só acontece de `PENDING` para `ACCEPTED`, e é feito com atualização condicional para evitar dois aceites concorrentes.
- Cliente só pode cancelar uma solicitação própria que ainda esteja `PENDING`.
- Prestador responsável só pode mudar `ACCEPTED → IN_PROGRESS → COMPLETED`; pode informar o valor final em `IN_PROGRESS` ou `COMPLETED`.
- Cliente só pode avaliar solicitação própria concluída, uma única vez. Ao criar a avaliação, a média do prestador é recalculada na mesma transação.
- Categorias com prestadores ou solicitações vinculados não podem ser excluídas.
- A senha nunca é devolvida pela API ou inserida no JWT. O token leva apenas `idUsuario` e `perfil`.

## Superfícies da API

Rotas públicas:

```text
GET  /                 # identificação da API
GET  /health           # health check
GET  /categories
GET  /providers        # filtros opcionais: search e categoryId
GET  /providers/:id
GET  /providers/:id/reviews
GET  /providers/:id/review-summary
```

Autenticação:

```text
POST /auth/client/register
POST /auth/provider/register
POST /auth/login
```

Cliente e categorias:

```text
GET/PUT    /clients/:id                  # dono do perfil ou admin
POST        /categories                  # admin
PUT/DELETE  /categories/:id              # admin
```

Prestadores e solicitações:

```text
PUT    /providers/:id                    # dono do perfil ou admin
PATCH  /providers/:id/status              # disponibilidade; aprovado ou admin

POST   /requests                          # cliente
GET    /requests                          # visão filtrada pelo papel
GET    /requests/:id                      # cliente, prestador responsável ou admin
PATCH  /requests/:id/provider             # aceite pelo prestador escolhido
PATCH  /requests/:id/status               # transições do ciclo de vida
PATCH  /requests/:id/value                # prestador responsável ou admin
POST   /reviews                           # cliente
```

Administração (todas exigem JWT de `ADMIN`):

```text
GET    /admin/dashboard
GET    /admin/providers?status=...
PATCH  /admin/providers/:id/approve
PATCH  /admin/providers/:id/reject
PATCH  /admin/providers/:id/suspend
PATCH  /admin/providers/:id/ban
PATCH  /admin/providers/:id/featured
GET    /admin/reviews
GET    /admin/requests
GET    /admin/clients
```

As transições administrativas permitidas hoje são: `PENDING → APPROVED|REJECTED|BANNED`, `APPROVED → SUSPENDED|BANNED` e `SUSPENDED → BANNED`. Qualquer status diferente de aprovado também desativa a disponibilidade.

## IA: resumo de avaliações

`GET /providers/:id/review-summary` lê as avaliações, envia um prompt em português ao Gemini e devolve um resumo estruturado. O resumo é armazenado no perfil do prestador; o cache é reutilizado até que existam pelo menos três novas avaliações desde a última geração. Sem avaliações, a rota responde sem chamar a IA. Se a integração falhar, a API devolve `503`.

O Gemini apenas sintetiza opiniões já existentes: não escolhe prestadores, não toma decisões de aprovação e não deve receber segredos ou dados além das avaliações necessárias.

## Estrutura atual

```text
src/
  server.ts                 # bootstrap, CORS, JSON e montagem das rotas
  routes/                   # auth, clients, categories, providers, requests, reviews, admin
  middlewares/              # JWT, autorização por perfil, 404 e erro global
  utils/auth.ts             # bcrypt e JWT
  services/gemini.service.ts
  lib/gemini.ts
prisma/
  schema.prisma             # fonte do modelo de dados
  migrations/               # evolução do banco
  seed.ts                   # categorias e admin opcional
tests/
  integracao.ts             # validação automatizada do fluxo principal e regras críticas
```

## Pontos de atenção e próximos passos prováveis

- Manter migrations e seed alinhados ao schema e executar `prisma migrate deploy` antes de cada publicação.
- Rodar `npm run build` e `npm run test:integration` antes de entregar ou publicar alterações.
- O roteiro automatizado cobre o fluxo principal, CORS, autenticação ausente, perfil incorreto, isolamento entre prestadores, transições inválidas, categoria vinculada, avaliação duplicada e cache/falha do Gemini com mock.
- Em produção com múltiplas instâncias, substituir o armazenamento em memória do rate limiting por um armazenamento compartilhado.
- Planejar upload real de imagens caso `photoUrl` deixe de ser apenas uma URL recebida do cliente.
- Definir estratégia de deploy e logs antes de produção; configurar `CORS_ORIGINS` e `TRUST_PROXY` conforme a hospedagem escolhida.
- Geolocalização, distância, rastreamento, pagamento, notificações e seleção automática permanecem explicitamente fora do MVP.
