-- O backend acessa o banco via Prisma; a API pública do Supabase não deve expor as tabelas.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "provider_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "service_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;
