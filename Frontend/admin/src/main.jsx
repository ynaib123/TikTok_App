import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AdminAuthProvider } from './contexts/AdminAuthContext'
import AdminQueryProvider from './components/AdminQueryProvider'
import './styles/admin.css'
import AdminApp from './AdminApp'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AdminQueryProvider>
      <AdminAuthProvider>
        <AdminApp />
      </AdminAuthProvider>
    </AdminQueryProvider>
  </BrowserRouter>
)
