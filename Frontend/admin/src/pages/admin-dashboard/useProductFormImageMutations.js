import { useCallback, useState } from 'react'
import {
  EMPTY_PRODUCT_FORM,
  EMPTY_PRODUCT_FORM_SNAPSHOT,
  MAX_PRODUCT_IMAGES,
} from './constants.js'
import {
  ADMIN_ERROR_MESSAGES,
  imageLimitMessage,
  normalizeUploadError,
  partialImageUploadMessage,
  PRODUCT_IMAGE_DIMENSION_RULE,
  productImageDimensionMessage,
  productImageFileTypeMessage,
  productImageUrlMessage,
} from './feedbackMessages.js'
import {
  getProductImage,
  isPromotionEnabled,
  normalizeImageUrlsText,
} from './utils.js'
import {
  applyImageListMutation,
  getNormalizedImageUrls,
} from './productMutationState.js'
import { uploadProductImageRequest } from './productMutationService.js'

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif']

export default function useProductFormImageMutations({
  activeCreateDraftId,
  categories,
  createForm,
  createImageUrlDraft,
  editImageUrls,
  editingProduct,
  imageUrlDraft,
  initialEditForm,
  isCreateSection,
  selectedCreatePreviewImage,
  selectedPreviewImage,
  setCreateCategoryDraft,
  setCreateDrafts,
  setCreateForm,
  setCreateImageUrlDraft,
  setDescriptionInputValue,
  setEditCategoryDraft,
  setEditForm,
  setError,
  setImageUrlDraft,
  setInfo,
  setInitialCreateForm,
  setSavedCreateDraftIds,
  setSelectedCreatePreviewImage,
  setSelectedPreviewImage,
}) {
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [isUploadingCreateImages, setIsUploadingCreateImages] = useState(false)

  const isValidImageUrl = useCallback((value) => {
    const trimmedValue = String(value || '').trim()
    if (!trimmedValue) return false

    try {
      const parsedUrl = new URL(trimmedValue)
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
    } catch {
      return false
    }
  }, [])

  const validateImageFile = useCallback((file) => {
    const mimeType = String(file?.type || '').toLowerCase()
    const fileName = String(file?.name || '').toLowerCase()
    const hasSupportedExtension = SUPPORTED_IMAGE_EXTENSIONS.some((extension) => fileName.endsWith(extension))
    const hasSupportedMimeType = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)

    if (!hasSupportedMimeType && !hasSupportedExtension) {
      throw new Error(productImageFileTypeMessage())
    }

    return true
  }, [])

  const handleEditFieldChange = useCallback((field, value) => {
    setEditForm((prev) => {
      if (field === 'promotionPercent') {
        return {
          ...prev,
          promotionPercent: value,
          promotionActive: isPromotionEnabled(value),
        }
      }

      return {
        ...prev,
        [field]: value,
      }
    })
  }, [setEditForm])

  const handleCreateFieldChange = useCallback((field, value) => {
    setCreateForm((prev) => {
      if (field === 'promotionPercent') {
        return {
          ...prev,
          promotionPercent: value,
          promotionActive: isPromotionEnabled(value),
        }
      }

      return {
        ...prev,
        [field]: value,
      }
    })

    if (isCreateSection && activeCreateDraftId) {
      setSavedCreateDraftIds((prev) => prev.filter((draftId) => draftId !== activeCreateDraftId))
      setCreateDrafts((prev) => prev.map((draft) => (
        draft.id === activeCreateDraftId
          ? {
              ...draft,
              form: field === 'promotionPercent'
                ? { ...draft.form, promotionPercent: value, promotionActive: isPromotionEnabled(value) }
                : { ...draft.form, [field]: value },
              persistedProductId: null,
            }
          : draft
      )))
    }
  }, [activeCreateDraftId, isCreateSection, setCreateDrafts, setCreateForm, setSavedCreateDraftIds])

  const handleResetEditChanges = useCallback(() => {
    if (!initialEditForm) return

    const initialCategory = categories.find((category) => String(category?.id) === String(initialEditForm.categorieId)) || null
    const resetPreview = normalizeImageUrlsText(initialEditForm.imageUrlsText).split('\n').find(Boolean)
      || initialEditForm.imageUrl
      || getProductImage(editingProduct)

    setEditForm(initialEditForm)
    setEditCategoryDraft(initialCategory?.libelle ? String(initialCategory.libelle) : '')
    setDescriptionInputValue(String(initialEditForm.description || ''))
    setImageUrlDraft('')
    setSelectedPreviewImage(resetPreview)
    setError(null)
  }, [
    categories,
    editingProduct,
    initialEditForm,
    setDescriptionInputValue,
    setEditCategoryDraft,
    setEditForm,
    setError,
    setImageUrlDraft,
    setSelectedPreviewImage,
  ])

  const handleResetCreateChanges = useCallback(() => {
    setCreateForm(EMPTY_PRODUCT_FORM)
    setInitialCreateForm(EMPTY_PRODUCT_FORM_SNAPSHOT)
    setCreateCategoryDraft('')
    setCreateImageUrlDraft('')
    setSelectedCreatePreviewImage('')

    if (isCreateSection && activeCreateDraftId) {
      setSavedCreateDraftIds((prev) => prev.filter((draftId) => draftId !== activeCreateDraftId))
      setCreateDrafts((prev) => prev.map((draft) => (
        draft.id === activeCreateDraftId
          ? { ...draft, form: { ...EMPTY_PRODUCT_FORM }, selectedPreviewImage: '', persistedProductId: null }
          : draft
      )))
    }

    setError(null)
  }, [
    activeCreateDraftId,
    isCreateSection,
    setCreateDrafts,
    setCreateForm,
    setCreateCategoryDraft,
    setCreateImageUrlDraft,
    setError,
    setInitialCreateForm,
    setSavedCreateDraftIds,
    setSelectedCreatePreviewImage,
  ])

  const syncImageList = useCallback((updater) => {
    setEditForm((prev) => ({
      ...prev,
      ...applyImageListMutation(prev.imageUrlsText, updater, prev.imageUrl),
    }))
  }, [setEditForm])

  const syncCreateImageList = useCallback((updater) => {
    setCreateForm((prev) => ({
      ...prev,
      ...applyImageListMutation(prev.imageUrlsText, updater, prev.imageUrl),
    }))

    if (isCreateSection && activeCreateDraftId) {
      setSavedCreateDraftIds((prev) => prev.filter((draftId) => draftId !== activeCreateDraftId))
      setCreateDrafts((prev) => prev.map((draft) => {
        if (draft.id !== activeCreateDraftId) return draft

        return {
          ...draft,
          persistedProductId: null,
          form: {
            ...draft.form,
            ...applyImageListMutation(draft.form.imageUrlsText, updater, draft.form.imageUrl),
          },
        }
      }))
    }
  }, [activeCreateDraftId, isCreateSection, setCreateDrafts, setCreateForm, setSavedCreateDraftIds])

  const handleSetCreatePreviewImage = useCallback((imageUrl) => {
    setSelectedCreatePreviewImage(imageUrl)

    if (isCreateSection && activeCreateDraftId) {
      setCreateDrafts((prev) => prev.map((draft) => (
        draft.id === activeCreateDraftId
          ? { ...draft, selectedPreviewImage: imageUrl }
          : draft
      )))
    }
  }, [activeCreateDraftId, isCreateSection, setCreateDrafts, setSelectedCreatePreviewImage])

  const handleSetEditPreviewImage = useCallback((imageUrl) => {
    setSelectedPreviewImage(imageUrl)
  }, [setSelectedPreviewImage])

  const handleAddImageUrl = useCallback(() => {
    const nextUrl = imageUrlDraft.trim()
    if (!nextUrl) return

    if (!isValidImageUrl(nextUrl)) {
      setError(productImageUrlMessage())
      return
    }

    if (editImageUrls.length >= MAX_PRODUCT_IMAGES) {
      setError(imageLimitMessage(MAX_PRODUCT_IMAGES))
      return
    }

    setError(null)
    syncImageList((currentUrls) => [...currentUrls, nextUrl])
    handleSetEditPreviewImage(nextUrl)
    setImageUrlDraft('')
  }, [
    editImageUrls.length,
    handleSetEditPreviewImage,
    imageUrlDraft,
    isValidImageUrl,
    setError,
    setImageUrlDraft,
    syncImageList,
  ])

  const handleAddCreateImageUrl = useCallback(() => {
    const nextUrl = createImageUrlDraft.trim()
    if (!nextUrl) return

    if (!isValidImageUrl(nextUrl)) {
      setError(productImageUrlMessage())
      return
    }

    const createImageUrls = getNormalizedImageUrls(createForm.imageUrlsText, createForm.imageUrl)
    if (createImageUrls.length >= MAX_PRODUCT_IMAGES) {
      setError(imageLimitMessage(MAX_PRODUCT_IMAGES))
      return
    }

    setError(null)
    syncCreateImageList((currentUrls) => [...currentUrls, nextUrl])
    handleSetCreatePreviewImage(nextUrl)
    setCreateImageUrlDraft('')
  }, [
    createForm.imageUrl,
    createForm.imageUrlsText,
    createImageUrlDraft,
    handleSetCreatePreviewImage,
    isValidImageUrl,
    setCreateImageUrlDraft,
    setError,
    syncCreateImageList,
  ])

  const handleSelectPrimaryImage = useCallback((imageUrl) => {
    setEditForm((prev) => ({
      ...prev,
      imageUrl,
    }))
    handleSetEditPreviewImage(imageUrl)
  }, [handleSetEditPreviewImage, setEditForm])

  const handleSelectCreatePrimaryImage = useCallback((imageUrl) => {
    setCreateForm((prev) => ({
      ...prev,
      imageUrl,
    }))

    if (isCreateSection && activeCreateDraftId) {
      setSavedCreateDraftIds((prev) => prev.filter((draftId) => draftId !== activeCreateDraftId))
      setCreateDrafts((prev) => prev.map((draft) => (
        draft.id === activeCreateDraftId
          ? {
              ...draft,
              persistedProductId: null,
              form: {
                ...draft.form,
                imageUrl,
              },
            }
          : draft
      )))
    }

    handleSetCreatePreviewImage(imageUrl)
  }, [
    activeCreateDraftId,
    handleSetCreatePreviewImage,
    isCreateSection,
    setCreateDrafts,
    setCreateForm,
    setSavedCreateDraftIds,
  ])

  const handleRemoveImage = useCallback((imageUrl) => {
    const remainingUrls = editImageUrls.filter((value) => value !== imageUrl)
    syncImageList((currentUrls) => currentUrls.filter((value) => value !== imageUrl))

    if (selectedPreviewImage === imageUrl) {
      handleSetEditPreviewImage(remainingUrls[0] || '')
    }
  }, [
    editImageUrls,
    handleSetEditPreviewImage,
    selectedPreviewImage,
    syncImageList,
  ])

  const handleRemoveCreateImage = useCallback((imageUrl) => {
    const createImageUrls = getNormalizedImageUrls(createForm.imageUrlsText, createForm.imageUrl)
    const remainingUrls = createImageUrls.filter((value) => value !== imageUrl)

    syncCreateImageList((currentUrls) => currentUrls.filter((value) => value !== imageUrl))

    if (selectedCreatePreviewImage === imageUrl) {
      handleSetCreatePreviewImage(remainingUrls[0] || '')
    }

    if (isCreateSection && activeCreateDraftId) {
      setCreateDrafts((prev) => prev.map((draft) => {
        if (draft.id !== activeCreateDraftId) return draft
        if (draft.selectedPreviewImage !== imageUrl) return draft
        return { ...draft, selectedPreviewImage: remainingUrls[0] || '' }
      }))
    }
  }, [
    activeCreateDraftId,
    createForm.imageUrl,
    createForm.imageUrlsText,
    isCreateSection,
    setCreateDrafts,
    handleSetCreatePreviewImage,
    selectedCreatePreviewImage,
    syncCreateImageList,
  ])

  const uploadProductImage = useCallback(async (file) => {
    try {
      const response = await uploadProductImageRequest(file)
      return String(response?.imageUrl || '').trim()
    } catch (error) {
      if (error?.status === 404) {
        throw new Error("L'upload d'images n'est pas disponible sur le backend en cours. Redemarre le serveur Spring pour charger la route /api/produits/upload-image.")
      }

      throw error
    }
  }, [])

  const validateImageDimensions = useCallback(async (file) => {
    const objectUrl = URL.createObjectURL(file)

    try {
      const dimensions = await new Promise((resolve, reject) => {
        const image = new Image()
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
        image.onerror = () => reject(new Error("Impossible de lire les dimensions de l'image."))
        image.src = objectUrl
      })

      const { minWidth, minHeight, maxWidth, maxHeight } = PRODUCT_IMAGE_DIMENSION_RULE

      if (
        dimensions.width < minWidth
        || dimensions.height < minHeight
        || dimensions.width > maxWidth
        || dimensions.height > maxHeight
      ) {
        throw new Error(productImageDimensionMessage())
      }
    } finally {
      URL.revokeObjectURL(objectUrl)
    }
  }, [])

  const handleImagesUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return

    setIsUploadingImages(true)
    setError(null)

    try {
      const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - editImageUrls.length)
      if (remainingSlots <= 0) {
        throw new Error(`Un produit ne peut pas avoir plus de ${MAX_PRODUCT_IMAGES} images.`)
      }

      const acceptedFiles = files.slice(0, remainingSlots)
      const uploadedUrls = []

      for (const file of acceptedFiles) {
        validateImageFile(file)
        await validateImageDimensions(file)
        const imageUrl = await uploadProductImage(file)

        if (!imageUrl) {
          throw new Error("Aucune image n'a pu etre envoyee.")
        }

        uploadedUrls.push(imageUrl)
      }

      if (uploadedUrls.length === 0) {
        throw new Error("Aucune image n'a pu etre envoyee.")
      }

      syncImageList((currentUrls) => [...currentUrls, ...uploadedUrls])
      handleSetEditPreviewImage(uploadedUrls[uploadedUrls.length - 1])
      if (files.length > acceptedFiles.length) {
        setInfo(partialImageUploadMessage(acceptedFiles.length, MAX_PRODUCT_IMAGES))
      }
    } catch (err) {
      setError(normalizeUploadError(err.message, ADMIN_ERROR_MESSAGES.uploadImages))
    } finally {
      setIsUploadingImages(false)
    }
  }, [
    editImageUrls.length,
    handleSetEditPreviewImage,
    setError,
    setInfo,
    syncImageList,
    uploadProductImage,
    validateImageDimensions,
    validateImageFile,
  ])

  const handleCreateImagesUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (files.length === 0) return

    setIsUploadingCreateImages(true)
    setError(null)

    try {
      const createImageUrls = getNormalizedImageUrls(createForm.imageUrlsText, createForm.imageUrl)
      const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - createImageUrls.length)
      if (remainingSlots <= 0) {
        throw new Error(`Un produit ne peut pas avoir plus de ${MAX_PRODUCT_IMAGES} images.`)
      }

      const acceptedFiles = files.slice(0, remainingSlots)
      const uploadedUrls = []

      for (const file of acceptedFiles) {
        validateImageFile(file)
        await validateImageDimensions(file)
        const imageUrl = await uploadProductImage(file)

        if (!imageUrl) {
          throw new Error("Aucune image n'a pu etre envoyee.")
        }

        uploadedUrls.push(imageUrl)
      }

      if (uploadedUrls.length === 0) {
        throw new Error("Aucune image n'a pu etre envoyee.")
      }

      syncCreateImageList((currentUrls) => [...currentUrls, ...uploadedUrls])
      handleSetCreatePreviewImage(uploadedUrls[uploadedUrls.length - 1])
      if (files.length > acceptedFiles.length) {
        setInfo(partialImageUploadMessage(acceptedFiles.length, MAX_PRODUCT_IMAGES))
      }
    } catch (err) {
      setError(normalizeUploadError(err.message, ADMIN_ERROR_MESSAGES.uploadImages))
    } finally {
      setIsUploadingCreateImages(false)
    }
  }, [
    createForm.imageUrl,
    createForm.imageUrlsText,
    handleSetCreatePreviewImage,
    setError,
    setInfo,
    syncCreateImageList,
    uploadProductImage,
    validateImageDimensions,
    validateImageFile,
  ])

  return {
    handleAddCreateImageUrl,
    handleAddImageUrl,
    handleCreateFieldChange,
    handleCreateImagesUpload,
    handleEditFieldChange,
    handleImagesUpload,
    handleRemoveCreateImage,
    handleRemoveImage,
    handleResetCreateChanges,
    handleResetEditChanges,
    handleSelectCreatePrimaryImage,
    handleSelectPrimaryImage,
    handleSetCreatePreviewImage,
    handleSetEditPreviewImage,
    isUploadingCreateImages,
    isUploadingImages,
  }
}
