import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import ErrorPage from './error-page.jsx'
import Playlist from './Playlist.jsx'
import { TokenProvider } from './TokenContext.jsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
  },

  {
    path: 'playlist/:id',
    element: <Playlist />,
    errorElement: <ErrorPage />,
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TokenProvider>
      <RouterProvider router={router} />
    </TokenProvider>
  </React.StrictMode>
)
