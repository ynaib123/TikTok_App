import { apiDelete, apiPost, apiPut, apiRequest } from '../../services/adminApiClient.js'

export async function uploadProductImageRequest(file) {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest('/produits/upload-image', {
    method: 'POST',
    body: formData,
  })
}

export async function updateProductRequest(productId, payload) {
  return apiPut(`/produits/${productId}`, payload)
}

export async function createProductRequest(payload) {
  return apiPost('/produits', payload)
}

export async function deleteProductRequest(productId) {
  return apiDelete(`/produits/${productId}`)
}

export async function deleteProductsBulkRequest(productIds) {
  return apiPost('/produits/admin/delete-bulk', {
    productIds,
  })
}

export async function updateProductPublishStatusRequest(productIds, published) {
  return apiPost('/produits/admin/publish-status', {
    productIds,
    published,
  })
}
