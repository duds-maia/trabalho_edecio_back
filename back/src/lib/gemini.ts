import { GoogleGenAI } from '@google/genai'

export const obterClienteGemini = () => {
  const chaveApi = process.env.GEMINI_API_KEY
  if (!chaveApi) throw new Error('GEMINI_API_KEY não configurada.')
  return new GoogleGenAI({ apiKey: chaveApi })
}
