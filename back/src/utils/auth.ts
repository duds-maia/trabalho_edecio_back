import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export type DadosAutenticacao = {
  idUsuario: string
  perfil: 'CLIENT' | 'PROVIDER' | 'ADMIN'
}

const obterChaveJwt = () => {
  const chave = process.env.JWT_SECRET
  if (!chave) throw new Error('JWT_SECRET não configurado')
  return chave
}

export const gerarHashSenha = (senha: string) => bcrypt.hash(senha, 12)

export const compararSenha = (senha: string, hashSenha: string) =>
  bcrypt.compare(senha, hashSenha)

export const gerarTokenAcesso = (dados: DadosAutenticacao) =>
  jwt.sign(dados, obterChaveJwt(), { expiresIn: '1d' })

export const validarTokenAcesso = (token: string) =>
  jwt.verify(token, obterChaveJwt()) as DadosAutenticacao
