import { Route, Routes } from 'react-router-dom'
import { EmptyState } from '../components/Feedback/Feedback'
import { Button } from '../components/Button/Button'
import { AppLayout } from '../components/Layout/AppLayout'
import { ProtectedRoute } from '../components/ProtectedRoute/ProtectedRoute'
import { Categories as AdminCategories } from '../pages/admin/Categories'
import { Clients as AdminClients } from '../pages/admin/Clients'
import { Dashboard as AdminDashboard } from '../pages/admin/Dashboard'
import { ProviderAnalysis as AdminProviderAnalysis } from '../pages/admin/ProviderAnalysis'
import { Providers as AdminProviders } from '../pages/admin/Providers'
import { Requests as AdminRequests } from '../pages/admin/Requests'
import { Reviews as AdminReviews } from '../pages/admin/Reviews'
import { Login } from '../pages/auth/Login'
import { Register } from '../pages/auth/Register'
import { Home } from '../pages/client/Home'
import { MyRequests } from '../pages/client/MyRequests'
import { NewRequest } from '../pages/client/NewRequest'
import { Profile as ClientProfile } from '../pages/client/Profile'
import { ProviderDetails } from '../pages/client/ProviderDetails'
import { Providers } from '../pages/client/Providers'
import { Dashboard as ProviderDashboard } from '../pages/provider/Dashboard'
import { Profile as ProviderProfile } from '../pages/provider/Profile'
import { Requests as ProviderRequests } from '../pages/provider/Requests'
import { Reviews as ProviderReviews } from '../pages/provider/Reviews'
import { RequestDetails } from '../pages/shared/RequestDetails'

function NotFound() {
  return (
    <div className="container page">
      <EmptyState title="Página não encontrada" description="O endereço acessado não existe." action={<Button to="/">Voltar ao início</Button>} />
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Públicas: o visitante navega sem login (ver wireframe) */}
        <Route index element={<Home />} />
        <Route path="prestadores" element={<Providers />} />
        <Route path="prestadores/:id" element={<ProviderDetails />} />
        <Route path="solicitacoes/nova" element={<NewRequest />} />
        <Route path="entrar" element={<Login />} />
        <Route path="cadastro" element={<Register />} />

        <Route element={<ProtectedRoute roles={['CLIENT']} />}>
          <Route path="minhas-solicitacoes" element={<MyRequests />} />
          <Route path="perfil" element={<ClientProfile />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="solicitacoes/:id" element={<RequestDetails />} />
        </Route>

        <Route element={<ProtectedRoute roles={['PROVIDER']} />}>
          <Route path="prestador" element={<ProviderDashboard />} />
          <Route path="prestador/solicitacoes" element={<ProviderRequests />} />
          <Route path="prestador/avaliacoes" element={<ProviderReviews />} />
          <Route path="prestador/perfil" element={<ProviderProfile />} />
        </Route>

        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/prestadores" element={<AdminProviders />} />
          <Route path="admin/prestadores/:id" element={<AdminProviderAnalysis />} />
          <Route path="admin/solicitacoes" element={<AdminRequests />} />
          <Route path="admin/avaliacoes" element={<AdminReviews />} />
          <Route path="admin/clientes" element={<AdminClients />} />
          <Route path="admin/categorias" element={<AdminCategories />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
