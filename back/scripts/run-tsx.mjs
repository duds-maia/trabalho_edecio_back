import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const tsxCli = fileURLToPath(new URL('../node_modules/tsx/dist/cli.mjs', import.meta.url))
const preload = '--require=./scripts/userinfo-fallback.cjs'
const nodeOptions = [process.env.NODE_OPTIONS, preload].filter(Boolean).join(' ')

const filho = spawn(process.execPath, [tsxCli, ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
  stdio: 'inherit',
})

filho.once('error', (erro) => {
  console.error('Nao foi possivel iniciar o executor TypeScript:', erro)
  process.exitCode = 1
})

filho.once('exit', (codigo, sinal) => {
  if (sinal) process.kill(process.pid, sinal)
  else process.exitCode = codigo ?? 1
})
