import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import AdminQueryProvider from './components/AdminQueryProvider'
import { initI18n } from './i18n'
import './styles/admin.css'
import AdminApp from './AdminApp'

initI18n()

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Admin root element not found in document.')
}

createRoot(rootElement).render(
  <BrowserRouter>
    <AdminQueryProvider>
      <AdminAuthProvider>
        <AdminApp />
      </AdminAuthProvider>
    </AdminQueryProvider>
  </BrowserRouter>,
)
