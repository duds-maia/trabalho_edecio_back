import { Type } from '@google/genai'
import { z } from 'zod'
import { prisma } from '../../lib/prisma'
import { obterClienteGemini } from '../lib/gemini'

const QUANTIDADE_MINIMA_NOVAS_AVALIACOES = 3
const schemaRespostaGemini = z.object({
  resumo: z.string().min(1).max(700),
})

type AvaliacaoParaResumo = {
  rating: number
  comment: string | null
}

const gerarResumoAvaliacoes = async (avaliacoes: AvaliacaoParaResumo[]) => {
  const textoAvaliacoes = avaliacoes
    .map((avaliacao, indice) => {
      const comentario = avaliacao.comment?.trim() || 'Sem comentário.'
      return `${indice + 1}. Nota ${avaliacao.rating}/5: ${comentario}`
    })
    .join('\n')

  const cliente = obterClienteGemini()
  const resposta = await cliente.models.generateContent({
    model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
    contents: `Resuma em português as avaliações abaixo de um prestador de serviços. Seja objetivo, mencione pontos fortes e eventuais pontos de atenção. Não invente informações.\n\n${textoAvaliacoes}`,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          resumo: { type: Type.STRING },
        },
        required: ['resumo'],
      },
    },
  })

  if (!resposta.text) throw new Error('Gemini não retornou um resumo.')
  return schemaRespostaGemini.parse(JSON.parse(resposta.text)).resumo
}

type GeradorResumo = (avaliacoes: AvaliacaoParaResumo[]) => Promise<string>

export const obterResumoPrestador = async (
  idPrestador: string,
  gerarResumo: GeradorResumo = gerarResumoAvaliacoes,
) => {
  const prestador = await prisma.providerProfile.findUnique({ where: { id: idPrestador } })
  if (!prestador) return null

  const avaliacoes = await prisma.review.findMany({
    where: { providerId: idPrestador },
    select: { rating: true, comment: true },
    orderBy: { createdAt: 'desc' },
  })

  if (avaliacoes.length === 0) {
    return { resumo: null, origem: 'SEM_AVALIACOES' as const, quantidadeAvaliacoes: 0 }
  }

  const possuiCacheAtual =
    prestador.aiSummary &&
    avaliacoes.length - prestador.aiSummaryReviewCount < QUANTIDADE_MINIMA_NOVAS_AVALIACOES

  if (possuiCacheAtual) {
    return {
      resumo: prestador.aiSummary,
      origem: 'CACHE' as const,
      quantidadeAvaliacoes: avaliacoes.length,
    }
  }

  const resumo = await gerarResumo(avaliacoes)
  await prisma.providerProfile.update({
    where: { id: idPrestador },
    data: { aiSummary: resumo, aiSummaryReviewCount: avaliacoes.length },
  })

  return { resumo, origem: 'GEMINI' as const, quantidadeAvaliacoes: avaliacoes.length }
}
