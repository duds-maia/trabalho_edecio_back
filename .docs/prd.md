# PRD — Backend do Me Socorre

## 1. Visão geral

O Me Socorre é uma plataforma que conecta clientes que precisam de um serviço (chaveiro, encanador, eletricista, vidraceiro, ar-condicionado etc.) com prestadores aprovados e disponíveis. Na primeira versão, o cliente pesquisa os prestadores por nome ou categoria e escolhe diretamente quem receberá sua solicitação. O backend é único e compartilhado pelos três tipos de usuário (cliente, prestador e admin), cada um com permissões diferentes.

### Escopo da primeira versão

- Listar prestadores aprovados e disponíveis, com filtros por nome e categoria.
- Permitir que o cliente escolha um prestador antes de criar a solicitação.
- Encaminhar a solicitação somente ao prestador escolhido.
- Permitir que o prestador escolhido aceite e execute o atendimento.
- Manter localização em tempo real, cálculo de distância e integração com mapas fora do escopo inicial.

## 2. Stack tecnológica

- Node.js + TypeScript
- Express (API REST)
- Prisma ORM (adapter-pg)
- PostgreSQL hospedado no Neon
- **bcrypt para hash/proteção da senha** e **JWT para autenticação das requisições**
- zod para validação
- Google Gemini API (resumo de avaliações)
- Testes automatizados de integração executados contra a API

## 3. Estrutura de pastas

```
backend/
│
├── src/
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── client.controller.ts
│   │   ├── provider.controller.ts
│   │   ├── category.controller.ts
│   │   ├── request.controller.ts
│   │   ├── review.controller.ts
│   │   └── admin.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── client.service.ts
│   │   ├── provider.service.ts
│   │   ├── category.service.ts
│   │   ├── request.service.ts
│   │   ├── review.service.ts
│   │   ├── gemini.service.ts
│   │   └── admin.service.ts
│   │
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── client.routes.ts
│   │   ├── provider.routes.ts
│   │   ├── category.routes.ts
│   │   ├── request.routes.ts
│   │   ├── review.routes.ts
│   │   └── admin.routes.ts
│   │
│   ├── middlewares/
│   │   ├── role.middleware.ts
│   │   └── error.middleware.ts
│   │
│   ├── lib/
│   │   ├── prisma.ts
│   │   └── gemini.ts
│   │
│   ├── types/
│   ├── utils/
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── .env
├── .env.example
├── package.json
└── tsconfig.json
```

> Base de partida: repositório de exemplo `github.com/duds-maia/trabalho_edecio`, reaproveitando o esqueleto técnico (Express + TS + Prisma adapter-pg + PostgreSQL + bcrypt + zod) e adaptando a estrutura de pastas para o padrão em camadas acima (controllers/services/routes/middlewares).

## 4. Modelo de dados (entidades principais)

- **Cliente**: id, nome, email, senha (hash), telefone, endereço
- **Prestador**: id, categoriaId, nome, email, senha (hash), telefone, avaliação, status de aprovação, disponibilidade, destaque e endereço
- **Categoria**: id, nome, descrição
- **Solicitação**: id, clienteId, prestadorId, categoriaId, descrição, endereço, tipoAtendimento, dataAgendamento, status, valor e fotoUrl
- **Admin**: id, nome, email, senha (hash)

### Status do prestador (regra de negócio importante)

```
PENDENTE → ANÁLISE DO ADMIN → APROVADO / REPROVADO
APROVADO → pode ficar SUSPENSO (temporário) ou BANIDO (permanente)
```

Somente prestadores com status **APROVADO** e disponibilidade **DISPONÍVEL** aparecem para escolha do cliente.

## 5. Regras de negócio importantes

1. **Proteção da senha e autenticação**: a senha nunca é armazenada em texto puro — é protegida com hash via bcrypt. Após o login, a API gera um JWT contendo somente a identidade mínima do usuário (`userId` e `role`), assinado com `JWT_SECRET`. Rotas protegidas validam o token pelo cabeçalho `Authorization: Bearer <token>`.
2. **Gemini fica exclusivamente no backend**: a chave da API nunca é exposta ao frontend. O frontend só consome `GET /providers/:id/review-summary`.
3. **Gemini não escolhe o prestador**: a IA apenas resume avaliações. A escolha é feita pelo cliente entre os prestadores aprovados e disponíveis retornados pela API.
4. **Controle de custo da IA**: armazenar/reutilizar o resumo do Gemini em vez de gerar a cada acesso; atualizar apenas quando houver quantidade relevante de novas avaliações.
5. **Prestador pendente, reprovado, suspenso ou banido nunca aparece na listagem de profissionais disponíveis.**
6. **A `DATABASE_URL` do Neon fica só no `.env`, nunca no código nem no GitHub.**
7. **A aplicação deve possuir código simples de entender e de fácil manutenção.**
8. **Toda nova solicitação deve informar `idPrestador`, e o prestador precisa estar aprovado, disponível e vinculado à categoria escolhida.**
9. **Somente o prestador escolhido pode visualizar e aceitar a solicitação pendente.**

## 6. Etapas de desenvolvimento

### Etapa 0 — Preparar o repositório base ✅ CONCLUÍDA
0.1. Apagar rotas específicas do domínio de veículos (`carros.ts`, `clientes.ts`, `login.ts`, `marcas.ts`, `propostas.ts`). ✅
0.2. Apagar `prisma/schema.prisma`, `prisma/seed.ts` e `prisma/migrations/`. ✅
0.3. Apagar `services/iaServices.ts` (fica só como referência de padrão, não é reaproveitado). ✅
0.4. Manter `package.json`, `tsconfig.json`, `prisma.config.ts` e `lib/prisma.ts`. ✅

### Etapa 1 — Configuração inicial do projeto ✅ CONCLUÍDA
1.1. Ajustar `name` e `description` no `package.json`. ✅
1.2. Garantir as dependências `jsonwebtoken`, `@types/jsonwebtoken`, `bcrypt` e `zod` no `package.json`. ✅
1.3. Rodar `npm install` para confirmar que tudo instala sem erro. ✅

### Etapa 2 — Banco de dados (Neon) ⏳ EM ANDAMENTO
2.1. Criar conta/projeto no Neon. 
2.2. Copiar a connection string (`DATABASE_URL`). ✅
2.3. Criar `.env` e `.env.example` com `DATABASE_URL`, `GEMINI_API_KEY` e `JWT_SECRET`. ✅ (`.env.example` criado; chaves opcionais ainda não foram preenchidas no `.env`)
2.4. Confirmar que `.env` está no `.gitignore`. ✅

### Etapa 3 — Servidor mínimo ⏳ EM VALIDAÇÃO
3.1. Recriar `src/server.ts` com Express + cors + rota raiz de teste. ✅
3.2. Rodar `npm run dev` (ou `npx tsx watch src/server.ts`) e confirmar que o servidor sobe na porta esperada. 

### Etapa 4 — Modelagem do banco (schema) ✅ CONCLUÍDA
4.1. Definir o model `User` para clientes, prestadores e administradores. ✅
4.2. Definir o model `ProviderProfile` vinculado ao usuário prestador. ✅
4.3. Definir o model `Category`. ✅
4.4. Definir os enums de aprovação, disponibilidade e status de solicitação. ✅
4.5. Definir as relações de `ProviderProfile` com `User` e `Category`. ✅
4.6. Definir os models `ServiceRequest` e `Review`, com seus relacionamentos. ✅

### Etapa 5 — Migration e seed ✅ CONCLUÍDA
5.1. Aplicar a migration `create_me_socorre` no Neon. ✅
5.2. Conferir as tabelas criadas no Neon. ✅
5.3. Criar `prisma/seed.ts` com categorias iniciais (chaveiro, encanador, eletricista, vidraceiro, ar-condicionado). ✅

### Etapa 6 — Proteção de senha e autenticação JWT ✅ CONCLUÍDA
6.1. Instalar `bcrypt` (já vem do repositório base) e `zod`. ✅
6.2. Criar função utilitária de hash de senha em `utils/` (ex.: `hashPassword`, `comparePassword`). ✅
6.3. Criar serviço de geração e validação de JWT, sem armazenar senha ou dados sensíveis no payload. ✅
6.4. Criar middleware de autenticação que lê e valida `Authorization: Bearer <token>`. ✅

### Etapa 7 — Cadastro e login (cliente e prestador) ✅ CONCLUÍDA
7.1. Validar e-mail duplicado e aplicar hash bcrypt no cadastro. ✅
7.2. Criar rota `POST /auth/client/register`. ✅
7.3. Criar rota `POST /auth/provider/register`, com status inicial `PENDING`. ✅
7.4. Criar rota `POST /auth/login`, com validação de e-mail/senha e retorno de JWT. ✅

### Etapa 8 — Login e permissões do admin ✅ CONCLUÍDA
8.1. Cadastro do admin via seed, sem rota pública de registro. ✅
8.2. `POST /auth/login` cobrindo também o admin. ✅
8.3. Middleware de perfil para restringir rotas por tipo de usuário, usando o perfil validado no JWT. ✅

### Etapa 9 — CRUD de clientes ✅ CONCLUÍDA
9.1. `GET /clients/:id` — visualizar perfil, protegido por JWT. ✅
9.2. `PUT /clients/:id` — editar dados cadastrais, protegido por JWT. ✅

### Etapa 10 — CRUD de categorias ✅ CONCLUÍDA
10.1. `GET /categories` — listagem pública. ✅
10.2. `POST /categories`, `PUT /categories/:id`, `DELETE /categories/:id` — restritos ao admin. ✅

### Etapa 11 — Perfil e disponibilidade do prestador ✅ CONCLUÍDA
11.1. `GET /providers/:id` e `PUT /providers/:id` — visualizar/editar perfil. ✅
11.2. `PATCH /providers/:id/status` — atualizar disponibilidade (`disponivel: true/false`). ✅

### Etapa 12 — Criação de solicitações ✅ CONCLUÍDA
12.1. `POST /requests` — cliente cria solicitação informando categoria, prestador escolhido, descrição, foto, endereço e tipo de atendimento. ✅
12.2. `GET /requests` e `GET /requests/:id` — listar/detalhar conforme o perfil autenticado. ✅
12.3. Validar se o prestador escolhido está aprovado, disponível e pertence à categoria informada. ✅

### Etapa 13 — Ciclo de vida da solicitação ✅ CONCLUÍDA
13.1. `PATCH /requests/:id/provider` — somente o prestador previamente escolhido, aprovado e disponível aceita a solicitação. ✅
13.2. `PATCH /requests/:id/status` — iniciar, concluir ou cancelar atendimento com transições validadas. ✅
13.3. `PATCH /requests/:id/value` — prestador responsável informa valor final. ✅

### Etapa 14 — Busca e escolha de prestadores ✅ CONCLUÍDA
14.1. Buscar prestadores por nome ou categoria, exigindo status `APPROVED` e disponibilidade ativa. ✅
14.2. `GET /providers?categoryId={id}` — listar opções disponíveis para o cliente. ✅
14.3. Exibir prestadores em destaque primeiro e, em seguida, ordenar pela avaliação média. ✅
14.4. Vincular a solicitação ao prestador escolhido no momento da criação. ✅

### Etapa 15 — Avaliações ✅ CONCLUÍDA
15.1. `POST /reviews` — cliente avalia prestador após conclusão. ✅
15.2. Recalcular avaliação média do prestador. ✅
15.3. `GET /providers/:id/reviews` — listar avaliações. ✅

### Etapa 16 — Integração com Gemini ✅ CONCLUÍDA
16.1. `lib/gemini.ts` — configurar client do Gemini com `GEMINI_API_KEY`. ✅
16.2. `gemini.service.ts` — montar prompt com as avaliações e `responseSchema` para retorno estruturado. ✅
16.3. Salvar/atualizar o resumo gerado no prestador, com cache por quantidade de avaliações. ✅
16.4. `GET /providers/:id/review-summary` — expor o resumo identificado como gerado por IA. ✅

### Etapa 17 — Geolocalização e mapas ⏭️ ADIADA
17.1. Integração com mapas não faz parte da primeira versão. Poderá ser avaliada após a entrega do MVP.
17.2. Uma versão futura poderá incluir geocodificação, localização em tempo real, cálculo de distância e ordenação por proximidade.

### Etapa 18 — Painel administrativo ✅ CONCLUÍDA
18.1. `GET /admin/providers?status=PENDING` e `GET /admin/dashboard` — listagem e indicadores por status. ✅
18.2. `PATCH /admin/providers/:id/approve`, `.../reject` e `.../featured`. ✅
18.3. `PATCH /admin/providers/:id/suspend` e `.../ban`. ✅
18.4. `GET /admin/reviews`, `GET /admin/requests`, `GET /admin/clients` — visão geral para o admin. ✅

### Etapa 19 — Testes das rotas ✅ CONCLUÍDA
19.1. Criar roteiro automatizado de integração. ✅
19.2. Cobrir autenticação, clientes, categorias, prestadores disponíveis, escolha direta, solicitações, avaliações e admin. ✅

## 7. Principais endpoints

```
POST   /auth/client/register
POST   /auth/provider/register
POST   /auth/login

GET    /categories
POST   /categories
PUT    /categories/:id
DELETE /categories/:id

GET    /providers
GET    /providers/:id
PUT    /providers/:id
PATCH  /providers/:id/status
GET    /providers/:id/review-summary

POST   /requests
GET    /requests
GET    /requests/:id
PATCH  /requests/:id/status
PATCH  /requests/:id/provider
PATCH  /requests/:id/value

POST   /reviews
GET    /providers/:id/reviews

# Admin
GET    /admin/providers?status=PENDENTE
PATCH  /admin/providers/:id/approve
PATCH  /admin/providers/:id/reject
PATCH  /admin/providers/:id/suspend
PATCH  /admin/providers/:id/ban
```

## 8. Variáveis de ambiente

```
DATABASE_URL=
GEMINI_API_KEY=
JWT_SECRET=
```

## 9. Alinhamento com os requisitos acadêmicos

O projeto atende aos requisitos de exibição, pesquisa, login, área administrativa, dashboard, CRUD, interações, IA e deploy:

- A entidade principal é o prestador de serviço, exibido em destaque e por avaliação.
- A pesquisa localiza prestadores disponíveis por nome e categoria.
- O administrador controla `isFeatured`, aprovação, suspensão e banimento.
- O acesso público permite consultar categorias e prestadores; solicitar, agendar e avaliar exige login.
- O Gemini gera no backend o “Resumo gerado por IA” das avaliações.
- O cliente pode persistir seu `userId` no LocalStorage ao selecionar “Manter conectado”.
- O painel administrativo terá dashboard de prestadores, solicitações, atendimentos e avaliações.
- Status e mensagens internas atendem inicialmente à comunicação; e-mail fica como extensão, se exigido.
- O deploy previsto inclui frontend, backend e PostgreSQL na nuvem.

### Modelo relacional adotado

O modelo usa cinco tabelas relacionadas: `User`, `ProviderProfile`, `Category`, `ServiceRequest` e `Review`. Pagamentos não fazem parte do MVP; `ServiceRequest.finalPrice` armazena apenas o valor final informado.

## 10. Fora do escopo da primeira versão

- Google Maps ou outro serviço externo de mapas.
- Captura e atualização de latitude/longitude.
- Rastreamento do prestador em tempo real.
- Cálculo de distância e ordenação por proximidade.
- Seleção automática de prestador.

Esses recursos ficam registrados como possíveis evoluções após a entrega do MVP. A primeira versão prioriza a escolha manual de um profissional aprovado e disponível, reduzindo complexidade técnica e risco para o prazo de entrega.
