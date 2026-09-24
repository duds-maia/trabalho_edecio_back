import { prisma } from '../lib/prisma'
import { gerarHashSenha } from '../src/utils/auth'

const categorias = [
  { name: 'Chaveiro', description: 'Serviços de chaveiro e abertura de portas.' },
  { name: 'Encanador', description: 'Reparos hidráulicos e vazamentos.' },
  { name: 'Eletricista', description: 'Instalações e reparos elétricos.' },
  { name: 'Vidraceiro', description: 'Instalação e reparo de vidros.' },
  { name: 'Ar-condicionado', description: 'Instalação, limpeza e manutenção de ar-condicionado.' },
    { name: 'Desentupidora', description: 'Desentupimento de pias, ralos, vasos sanitários e tubulações.' },
  { name: 'Serralheiro', description: 'Fabricação, instalação e reparo de estruturas metálicas e fechaduras.' },
  { name: 'Marceneiro', description: 'Fabricação e reparo de móveis e estruturas de madeira.' },
  { name: 'Montador de móveis', description: 'Montagem e desmontagem de móveis residenciais e comerciais.' },
  { name: 'Pedreiro', description: 'Reformas, construções e reparos em alvenaria.' },
  { name: 'Pintor', description: 'Pintura interna, externa e acabamento de ambientes.' },
  { name: 'Técnico de eletrodomésticos', description: 'Manutenção e reparo de geladeiras, máquinas de lavar e outros eletrodomésticos.' },
  { name: 'Técnico de informática', description: 'Manutenção de computadores, redes, impressoras e sistemas.' },
  { name: 'Instalador de antenas', description: 'Instalação e manutenção de antenas, televisores e equipamentos de sinal.' },
  { name: 'Calheiro', description: 'Instalação e limpeza de calhas e sistemas de escoamento.' },
  { name: 'Dedetizador', description: 'Controle e eliminação de pragas e insetos.' },
  { name: 'Jardineiro', description: 'Manutenção de jardins, poda, plantio e limpeza de áreas externas.' },
  { name: 'Limpeza residencial', description: 'Serviços de limpeza e organização de residências.' },
  { name: 'Limpeza de estofados', description: 'Higienização de sofás, colchões, tapetes e estofados.' },
  { name: 'Instalador de redes de proteção', description: 'Instalação de redes de proteção em janelas, sacadas e escadas.' },
]

async function main() {
  for (const categoria of categorias) {
    await prisma.category.upsert({
      where: { name: categoria.name },
      update: { description: categoria.description },
      create: categoria,
    })
  }

  const emailAdministrador = process.env.ADMIN_EMAIL?.toLowerCase()
  const senhaAdministrador = process.env.ADMIN_PASSWORD
  const nomeAdministrador = process.env.ADMIN_NAME ?? 'Administrador'

  if (!emailAdministrador || !senhaAdministrador) {
    console.log('Administrador não criado: defina ADMIN_EMAIL e ADMIN_PASSWORD para incluí-lo no seed.')
    return
  }

  const administradorExistente = await prisma.user.findUnique({
    where: { email: emailAdministrador },
  })

  if (administradorExistente) {
    await prisma.user.update({
      where: { id: administradorExistente.id },
      data: { name: nomeAdministrador, role: 'ADMIN' },
    })
    console.log('Administrador existente atualizado.')
    return
  }

  await prisma.user.create({
    data: {
      name: nomeAdministrador,
      email: emailAdministrador,
      password: await gerarHashSenha(senhaAdministrador),
      role: 'ADMIN',
    },
  })
  console.log('Administrador inicial cadastrado.')
}

main()
  .then(() => console.log('Categorias iniciais cadastradas.'))
  .catch((error) => {
    console.error('Erro ao cadastrar categorias:', error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
