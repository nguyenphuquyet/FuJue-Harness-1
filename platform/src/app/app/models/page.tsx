import { ModelsView } from '@/components/app/ModelsView'
import { loadServedModels } from '@/lib/model-store'

export const dynamic = 'force-dynamic'

/**
 * Model catalog route.
 *
 * @returns the models page.
 */
export default async function ModelsPage() {
  return <ModelsView models={await loadServedModels()} />
}
