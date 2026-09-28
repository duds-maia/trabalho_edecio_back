# Configurar o Me Socorre no Supabase

Este projeto continua usando Prisma, PostgreSQL, a API Express e autenticação JWT própria. O frontend chama a API; ele **não** deve receber a senha do banco, `DATABASE_URL` ou `DIRECT_URL`.

## 1. Crie o projeto

Crie um projeto no Supabase. Em **Connect**, copie as strings reais de **Transaction pooler** (porta 6543) para `DATABASE_URL` e de **Session pooler** (porta 5432) para `DIRECT_URL`. Acrescente `?pgbouncer=true&connection_limit=1` ao fim da `DATABASE_URL`. Copie o host exato do painel, sem tentar montar o nome pela região. A conexão **Direct** também serve para `DIRECT_URL` se o ambiente de migração tiver IPv6. Codifique caracteres especiais da senha em URL (`@`, `#`, `?`, etc.). Veja `back/.env.example`.

Configure as duas variáveis **somente no backend** (também no painel do serviço de deploy), além de `JWT_SECRET` e `CORS_ORIGINS`. `CORS_ORIGINS` recebe a origem publicada do frontend (ex.: `https://meu-front.vercel.app`), sem barra final. O front usa `VITE_API_URL=https://meu-backend.exemplo.com` e `VITE_USE_MOCK=false` em produção. Não use a URL `https://PROJECT_REF.supabase.co` em `VITE_API_URL`: as rotas do projeto pertencem ao backend Express. `VITE_API_URL=/api` funciona no desenvolvimento local com o proxy do Vite. Faça o build do front depois de definir as variáveis: o Vite incorpora os valores no build.

## 2. Crie as tabelas (escolha um caminho para um banco vazio)

**Pelo SQL Editor (mais simples):** execute todo o arquivo `back/supabase/schema.sql` uma única vez. Ele contém o estado final dos cinco modelos Prisma: `users`, `categories`, `provider_profiles`, `service_requests` e `reviews`, seus quatro enums, chaves e índices. As tabelas ficam com RLS ligado e sem políticas para acesso direto pelo navegador. O backend continua acessando via usuário PostgreSQL do Supabase.

Se optar pelo SQL Editor e depois quiser usar `prisma migrate deploy`, registre as cinco migrações existentes como aplicadas, a partir da pasta `back` e com `DIRECT_URL` configurada:

```bash
npx prisma migrate resolve --applied 20260813225130_add_tabela_marca_e_carros
npx prisma migrate resolve --applied 20260907120000_create_me_socorre
npx prisma migrate resolve --applied 20260910120000_remove_maps_fields
npx prisma migrate resolve --applied 20260913120000_remove_legacy_vehicles
npx prisma migrate resolve --applied 20260928190000_enable_rls
```

**Pelo Prisma CLI:** em vez de executar o SQL manual, configure `DIRECT_URL` e, da pasta `back`, execute `npm ci`, `npm run db:migrate:deploy` e `npm run db:seed`. As migrações históricas criam e removem tabelas antigas temporariamente e terminam com o mesmo esquema e RLS. Não execute o SQL Editor e `migrate deploy` juntos sem antes registrar as migrações como aplicadas.

O `db:seed` cria categorias e, se `ADMIN_EMAIL` e `ADMIN_PASSWORD` estiverem configurados, um administrador. Use uma senha forte e mantenha essas variáveis no backend.

## 3. Ligue frontend e backend

Publique o backend como serviço Node compatível com a versão indicada em `back/package.json`; inicie com `npm start` (ou use a integração do provedor com o `app` exportado em `src/server.ts`). Publique o frontend estático de `front` com `npm run build`. Coloque a URL pública do backend em `VITE_API_URL`, e a origem do frontend em `CORS_ORIGINS`.

Teste `GET /health` no backend e depois faça cadastro e login no site. `/health` verifica apenas o processo HTTP; cadastro/login exercitam o banco. Migrar os **dados existentes** do Neon para Supabase exige exportação e importação separadas: o SQL cria as tabelas, mas não copia registros. Sem as credenciais do novo projeto, a conexão e o deploy não podem ser testados aqui.
