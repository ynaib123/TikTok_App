export function getCategoryDensityTone(category) {
  const usageCount = Number(category?.productCount || 0)
  const onlineUsageCount = Number(category?.onlineProductCount || 0)

  if (onlineUsageCount > 0) return 'is-online'
  if (usageCount > 0) return 'is-populated'
  return 'is-empty'
}

export function buildCategoryCardPresentation(category) {
  const usageCount = Number(category?.productCount || 0)
  const onlineUsageCount = Number(category?.onlineProductCount || 0)

  return {
    densityTone: getCategoryDensityTone(category),
    id: Number(category?.id),
    idLabel: `#${category?.id ?? '-'}`,
    label: String(category?.libelle || 'Categorie sans nom'),
    selectionMetaLabel: `Identifiant #${category?.id ?? '-'} • ${onlineUsageCount} en ligne`,
    usageCount,
    usageLabel: `${usageCount} produit${usageCount > 1 ? 's' : ''}`,
  }
}

export function buildCategoryWorkspacePresentation({
  activeCategory,
  selectedCategoryCount = 0,
  totalCategoryCount = 0,
}) {
  const activeCategoryLabel = String(activeCategory?.libelle || '').trim()

  return {
    heroTitle: activeCategoryLabel || 'Aucune categorie active',
    heroSubtitle: activeCategory
      ? `Categorie #${activeCategory.id}`
      : `${totalCategoryCount} categorie${totalCategoryCount > 1 ? 's' : ''} disponibles`,
    selectionSummary: selectedCategoryCount > 0
      ? `${selectedCategoryCount} selectionne${selectedCategoryCount > 1 ? 's' : ''}`
      : 'Aucune selection',
  }
}
