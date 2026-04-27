export function resolveProductNavigationPolicy({
  hasSelectionReset = false,
  hasUnsavedChanges = false,
  intent = 'in-app-navigation',
}) {
  if (intent === 'selection-reset') {
    return hasSelectionReset ? 'open-selection-modal' : 'allow'
  }

  if (intent === 'leave-admin') {
    return hasUnsavedChanges ? 'confirm-browser' : 'allow'
  }

  return 'allow'
}

export function buildUnsavedProductChangesState({
  dirtyCreateDrafts = [],
  dirtySelectedProductsForSidebar = [],
  isCreateDirty = false,
  isEditDirty = false,
  isImportModalOpen = false,
}) {
  const dirtyCreateCount = Array.isArray(dirtyCreateDrafts) ? dirtyCreateDrafts.length : 0
  const dirtyEditCount = Array.isArray(dirtySelectedProductsForSidebar) ? dirtySelectedProductsForSidebar.length : 0
  const hasUnsavedChanges = Boolean(
    isCreateDirty
    || isEditDirty
    || dirtyCreateCount > 0
    || dirtyEditCount > 0
    || isImportModalOpen
  )

  return {
    dirtyCreateCount,
    dirtyEditCount,
    hasUnsavedChanges,
    isImportModalOpen: Boolean(isImportModalOpen),
  }
}

export function buildUnsavedProductChangesMessage({
  dirtyCreateCount = 0,
  dirtyEditCount = 0,
  isImportModalOpen = false,
}) {
  const segments = []

  if (dirtyCreateCount > 0) {
    segments.push(`${dirtyCreateCount} brouillon${dirtyCreateCount > 1 ? 's' : ''} de creation`)
  }

  if (dirtyEditCount > 0) {
    segments.push(`${dirtyEditCount} produit${dirtyEditCount > 1 ? 's' : ''} modifie${dirtyEditCount > 1 ? 's' : ''}`)
  }

  if (isImportModalOpen) {
    segments.push("une importation en cours de preparation")
  }

  if (segments.length === 0) {
    return 'Des modifications non sauvegardees sont encore presentes. Quitter cette page ?'
  }

  return `Vous avez ${segments.join(', ')} non sauvegarde${segments.length > 1 ? 's' : ''}. Quitter cette page ?`
}
