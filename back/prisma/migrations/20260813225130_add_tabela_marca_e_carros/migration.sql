-- CreateEnum
CREATE TYPE "Combustiveis" AS ENUM ('FLEX', 'GASOLINA', 'ETANOL', 'DIESEL', 'ELETRICO', 'HIBRIDO');

-- CreateTable
CREATE TABLE "marcas" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(30) NOT NULL,

    CONSTRAINT "marcas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carros" (
    "id" SERIAL NOT NULL,
    "modelo" VARCHAR(30) NOT NULL,
    "ano" SMALLINT NOT NULL,
    "preco" DECIMAL(10,2) NOT NULL,
    "km" INTEGER NOT NULL,
    "foto" TEXT NOT NULL,
    "acessorios" TEXT,
    "combustivel" "Combustiveis" NOT NULL DEFAULT 'FLEX',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "destaque" BOOLEAN NOT NULL DEFAULT true,
    "marcaId" INTEGER NOT NULL,

    CONSTRAINT "carros_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "carros" ADD CONSTRAINT "carros_marcaId_fkey" FOREIGN KEY ("marcaId") REFERENCES "marcas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
