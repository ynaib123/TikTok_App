export interface TemplateDescriptor {
  templateId: string
  compositionId: string
  description: string
}

export const templates: TemplateDescriptor[] = [
  {
    templateId: 'tiktok-pro-vertical',
    compositionId: 'tiktok-pro-vertical',
    description: 'Premium hook + script + CTA with palette par catégorie.',
  },
  {
    templateId: 'tiktok-pro-vertical-v1',
    compositionId: 'tiktok-pro-vertical',
    description: 'Alias rétrocompatible vers tiktok-pro-vertical.',
  },
  {
    templateId: 'tiktok-bold-story',
    compositionId: 'tiktok-bold-story',
    description: 'Display typography, mot-par-mot, accents catégoriels marqués.',
  },
  {
    templateId: 'tiktok-clean-minimal',
    compositionId: 'tiktok-clean-minimal',
    description: 'Minimaliste, ligne par ligne, sous-titres soignés.',
  },
]

const DEFAULT_COMPOSITION_ID = 'tiktok-pro-vertical'

export function resolveCompositionId(templateId: string | null | undefined): string {
  if (!templateId) return DEFAULT_COMPOSITION_ID
  const match = templates.find((template) => template.templateId === templateId)
  return match ? match.compositionId : DEFAULT_COMPOSITION_ID
}

export function listTemplates(): TemplateDescriptor[] {
  return templates.filter((template) => template.templateId !== 'tiktok-pro-vertical-v1')
}
