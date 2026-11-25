import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
      <h1 className="text-brand-green mb-3 text-8xl font-extrabold tracking-tight italic">
        404
      </h1>
      <p className="text-brand-text-dim mb-8 text-lg">
        {t('notFound.description')}
      </p>
      <Button asChild size="lg">
        <Link to="/">{t('notFound.cta')}</Link>
      </Button>
    </main>
  )
}
