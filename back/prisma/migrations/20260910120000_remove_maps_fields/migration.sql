-- A localizacao passa a ser informada somente como endereco textual.
ALTER TABLE "users"
DROP COLUMN "latitude",
DROP COLUMN "longitude";

ALTER TABLE "provider_profiles"
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "locationUpdatedAt";

ALTER TABLE "service_requests"
DROP COLUMN "latitude",
DROP COLUMN "longitude";
