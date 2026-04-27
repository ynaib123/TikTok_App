export const ADMIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { id: 'content-pipeline', label: 'Content Pipeline', path: '/content-pipeline' },
  { id: 'tiktok-accounts', label: 'TikTok Accounts', path: '/tiktok-accounts' },
  { id: 'manual-actions', label: 'Manual Actions', path: '/manual-actions' },
]

export const MAX_PRODUCT_IMAGES = 4

export const PRODUCT_SORT_OPTIONS = [
  { value: 'recent', label: 'Plus recents' },
  { value: 'name_asc', label: 'Nom A-Z' },
  { value: 'name_desc', label: 'Nom Z-A' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix decroissant' },
  { value: 'stock_asc', label: 'Stock croissant' },
  { value: 'stock_desc', label: 'Stock decroissant' },
  { value: 'rating_desc', label: 'Mieux notes' },
  { value: 'rating_asc', label: 'Moins notes' },
  { value: 'status_online', label: 'En ligne' },
  { value: 'status_offline', label: 'Hors ligne' },
]

export const PRODUCT_PAGE_SIZE_OPTIONS = [
  { value: 50, label: '50' },
  { value: 100, label: '100' },
  { value: 200, label: '200' },
]

export const PRODUCT_VIEW_MODE_OPTIONS = [
  { value: 'grid', label: 'Grille' },
  { value: 'table', label: 'Tableau' },
]

export const PRODUCT_STOCK_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous les stocks' },
  { value: 'ok', label: 'Stock OK' },
  { value: 'low', label: 'Stock faible' },
  { value: 'out', label: 'Rupture' },
]

export const PRODUCT_PUBLISH_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'online', label: 'En ligne' },
  { value: 'offline', label: 'Hors ligne' },
]

export const PRODUCT_MANAGEMENT_SUBSECTION_IDS = [
  'delete-products',
  'edit-products',
  'bulk-edit-products',
  'bulk-add-products',
]

export const EMPTY_CATEGORY_FORM = {
  libelle: '',
}

export const EMPTY_CATEGORY_MERGE_FORM = {
  libelle: '',
}

export const CATEGORY_SELECTION_STORAGE_KEY = 'admin_category_selection'
export const CATEGORY_SELECTION_LABELS_STORAGE_KEY = 'admin_category_selection_labels'

export const CATEGORY_SORT_OPTIONS = [
  { value: 'recent', label: 'Plus recentes' },
  { value: 'name_asc', label: 'Nom A-Z' },
  { value: 'name_desc', label: 'Nom Z-A' },
]

export const CATEGORY_PAGE_SIZE_OPTIONS = [
  { value: 12, label: '12' },
  { value: 24, label: '24' },
  { value: 48, label: '48' },
]

export const CLIENT_DIRECTORY_PREFERENCES_STORAGE_KEY = 'admin_client_directory_preferences'
export const CLIENT_SELECTION_STORAGE_KEY = 'admin_client_selection'
export const ADMIN_SESSION_ACTIVITY_STORAGE_KEY = 'admin_session_activity'

export const CLIENT_SORT_OPTIONS = [
  { value: 'activity_desc', label: 'Activite recente' },
  { value: 'name_asc', label: 'Nom A-Z' },
  { value: 'name_desc', label: 'Nom Z-A' },
  { value: 'orders_desc', label: 'Plus de commandes' },
]

export const CLIENT_PAGE_SIZE_OPTIONS = [
  { value: 12, label: '12' },
  { value: 24, label: '24' },
  { value: 48, label: '48' },
]

export const CLIENT_ACCOUNT_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous les comptes' },
  { value: 'active', label: 'Comptes actifs' },
  { value: 'inactive', label: 'Comptes suspendus' },
]

export const CLIENT_CONNECTION_FILTER_OPTIONS = [
  { value: 'all', label: 'Toutes presences' },
  { value: 'online', label: 'En ligne' },
  { value: 'offline', label: 'Hors ligne' },
]

export const CLIENT_VERIFICATION_FILTER_OPTIONS = [
  { value: 'all', label: 'Tous les emails' },
  { value: 'verified', label: 'Emails verifies' },
  { value: 'pending', label: 'Emails en attente' },
]

export const PRODUCT_SELECTION_STORAGE_KEY = 'admin_product_selection'

export const EMPTY_PRODUCT_FORM = {
  nom: '',
  description: '',
  imageUrl: '',
  imageUrlsText: '',
  prixAchat: '',
  prix: '',
  promotionActive: false,
  promotionPercent: '',
  stock: '',
  rating: '0',
  categorieId: '',
}

export const EMPTY_PRODUCT_FORM_SNAPSHOT = { ...EMPTY_PRODUCT_FORM }
export const EMPTY_PRODUCT_FORM_SNAPSHOT_JSON = JSON.stringify(EMPTY_PRODUCT_FORM_SNAPSHOT)

function createDraftId() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createProductDraft() {
  return {
    id: createDraftId(),
    form: { ...EMPTY_PRODUCT_FORM },
    persistedProductId: null,
    selectedPreviewImage: '',
  }
}

export function isCreateDraftSaved(draft, savedCreateDraftIds = []) {
  return Boolean(draft?.id) && savedCreateDraftIds.includes(draft.id)
}

export function findFirstPendingCreateDraftId(createDrafts = [], savedCreateDraftIds = []) {
  const pendingDraft = (Array.isArray(createDrafts) ? createDrafts : []).find((draft) => (
    draft?.id
    && !draft.persistedProductId
    && !isCreateDraftSaved(draft, savedCreateDraftIds)
  ))

  return pendingDraft?.id || null
}
