import { createBrowserRouter } from 'react-router'

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
])
