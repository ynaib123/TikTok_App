import { useEffect, useRef, useState } from 'react'
import {
  EMPTY_PRODUCT_FORM,
  EMPTY_PRODUCT_FORM_SNAPSHOT,
  PRODUCT_EDIT_DRAFTS_STORAGE_KEY,
} from './constants'
import useDebouncedStorageEffect from './useDebouncedStorageEffect'
import { readStoredEditDrafts } from './productPageState.js'

export default function useAdminProductPageState() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [info, setInfo] = useState(null)
  const [productImportModalState, setProductImportModalState] = useState({
    isOpen: false,
    files: [],
    error: null,
    importedDrafts: [],
    importedRows: [],
    importedSelectedKeys: [],
    importedCount: 0,
    skippedRowCount: 0,
  })
  const [isImportingProductFile, setIsImportingProductFile] = useState(false)
  const [isPersistingImportedProducts, setIsPersistingImportedProducts] = useState(false)
  const [importProgressPercent, setImportProgressPercent] = useState(0)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const pendingProductsPerPageScrollRef = useRef(null)
  const [selectedPreviewImage, setSelectedPreviewImage] = useState('')
  const [editForm, setEditForm] = useState(EMPTY_PRODUCT_FORM)
  const [editCategoryDraft, setEditCategoryDraft] = useState('')
  const [editDraftsByProductId, setEditDraftsByProductId] = useState(() => (
    readStoredEditDrafts(PRODUCT_EDIT_DRAFTS_STORAGE_KEY)
  ))
  const [createCategoryDraft, setCreateCategoryDraft] = useState('')
  const [descriptionInputValue, setDescriptionInputValue] = useState('')
  const [initialEditForm, setInitialEditForm] = useState(null)
  const [createForm, setCreateForm] = useState(EMPTY_PRODUCT_FORM)
  const [initialCreateForm, setInitialCreateForm] = useState(EMPTY_PRODUCT_FORM_SNAPSHOT)
  const [imageUrlDraft, setImageUrlDraft] = useState('')
  const [createImageUrlDraft, setCreateImageUrlDraft] = useState('')
  const [selectedCreatePreviewImage, setSelectedCreatePreviewImage] = useState('')

  useEffect(() => {
    if (!info) return undefined
    const timer = window.setTimeout(() => setInfo(null), 3000)
    return () => window.clearTimeout(timer)
  }, [info])

  useEffect(() => {
    if (!error) return undefined
    const timer = window.setTimeout(() => setError(null), 3000)
    return () => window.clearTimeout(timer)
  }, [error])

  useDebouncedStorageEffect({
    key: PRODUCT_EDIT_DRAFTS_STORAGE_KEY,
    value: editDraftsByProductId,
  })

  return {
    createCategoryDraft,
    createForm,
    createImageUrlDraft,
    descriptionInputValue,
    editCategoryDraft,
    editDraftsByProductId,
    editForm,
    editingProduct,
    error,
    imageUrlDraft,
    importProgressPercent,
    info,
    initialCreateForm,
    initialEditForm,
    isCreatingCategory,
    isImportingProductFile,
    isPersistingImportedProducts,
    loading,
    pendingProductsPerPageScrollRef,
    productImportModalState,
    selectedCreatePreviewImage,
    selectedPreviewImage,
    setCreateCategoryDraft,
    setCreateForm,
    setCreateImageUrlDraft,
    setDescriptionInputValue,
    setEditCategoryDraft,
    setEditDraftsByProductId,
    setEditForm,
    setEditingProduct,
    setError,
    setImageUrlDraft,
    setImportProgressPercent,
    setInfo,
    setInitialCreateForm,
    setInitialEditForm,
    setIsCreatingCategory,
    setIsImportingProductFile,
    setIsPersistingImportedProducts,
    setLoading,
    setProductImportModalState,
    setSelectedCreatePreviewImage,
    setSelectedPreviewImage,
  }
}
