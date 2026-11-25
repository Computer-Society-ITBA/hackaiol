import { Outlet, ScrollRestoration } from 'react-router'

import { BrandHeader } from '@/components/brand/BrandHeader'
import { Footer } from '@/components/landing/Footer'

export function RootLayout() {
  return (
    <>
      <div aria-hidden="true" className="brand-backdrop" />
      <div className="relative z-10 flex min-h-screen flex-col overflow-x-clip">
        <ScrollRestoration />
        <BrandHeader />
        <div className="flex-1">
          <Outlet />
        </div>
        <Footer />
      </div>
    </>
  )
}
