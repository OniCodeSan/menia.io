import React from 'react'
import ReactDOM from 'react-dom/client'
import { initSentry } from '@/lib/sentry'
import AdminApp from '@/AdminApp.jsx'
import '@/index.css'

initSentry();

ReactDOM.createRoot(document.getElementById('root')).render(
  <AdminApp />
)
