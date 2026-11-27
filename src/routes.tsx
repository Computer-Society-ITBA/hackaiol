import { createBrowserRouter, Navigate } from 'react-router'

import { RootLayout } from './layouts/RootLayout'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'
import SignupPage from './pages/SignupPage'

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // The backoffice is lazy loaded, so its code stays out of the public
  // bundle. AdminLayout guards every screen under /admin.
  {
    path: '/admin/login',
    lazy: async () => ({
      Component: (await import('./pages/admin/AdminLoginPage')).default,
    }),
  },
  {
    path: '/admin',
    lazy: async () => ({
      Component: (await import('./pages/admin/AdminLayout')).default,
    }),
    children: [
      { index: true, element: <Navigate to="participants" replace /> },
      {
        path: 'participants',
        lazy: async () => ({
          Component: (await import('./pages/admin/AdminParticipantsPage'))
            .default,
        }),
      },
      {
        path: 'teams',
        lazy: async () => ({
          Component: (await import('./pages/admin/AdminTeamsPage')).default,
        }),
      },
      { path: '*', element: <Navigate to="participants" replace /> },
    ],
  },
])
