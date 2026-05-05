# Admin dashboard — prop-drilling refactor plan

`useAdminProductViewProps.js` (and the surrounding controllers) currently pass
~45 individual flat props through `ProductManagementSection`,
`AdminProductsPage` and the panels below. This file scopes the refactor that
groups them by domain.

## Target shape

A consumer (e.g. `ProductManagementSection`) should receive **four groups**,
not 45 named props:

```ts
interface AdminProductViewProps {
  catalog: CatalogProps;       // filters, pagination, sort, search, view mode
  selection: SelectionProps;   // selected ids, toggle/select-all/clear handlers
  modals: ModalsProps;         // open/close handlers for create/import/delete
  mutations: MutationsProps;   // publish/unpublish, delete, etc.
}
```

## Domains (by current flat-prop name)

### `catalog`
- `productCategoryFilter`, `setProductCategoryFilter`, `selectedProductCategory`
- `productPublishStatusFilter`, `setProductPublishStatusFilter`,
  `selectedProductPublishStatusFilter`
- `productStockFilter`, `setProductStockFilter`, `selectedProductStockFilter`
- `productSearch`, `setProductSearch`
- `productSort`, `setProductSort`, `selectedProductSort`
- `productViewMode`, `setProductViewMode`, `selectedProductViewMode`
- `productPage`, `setProductPage`, `totalProductPages`,
  `productsPerPage`, `setProductsPerPage`, `selectedProductsPerPage`
- `productCategoryOptions`, `paginatedProducts`,
  `selectedProductFilterSummary`
- `openCatalogMenu`, `setOpenCatalogMenu`
- `loading`

### `selection`
- `pendingSelectedProductIds`, `pendingSelectedProductIdSet`
- `filteredProductIds`, `filteredProductCount`
- `hasSelectedProducts`
- `toggleSelectedProductId`,
  `handleClearAllSelectedProducts`,
  `handleSelectAllFilteredProducts`
- `pendingProductsPerPageScrollRef`

### `modals`
- `handleOpenProductCreateWorkspace`,
  `handleOpenProductImportModal`,
  `openDeleteProductsModal`,
  `handleOpenProductDetailsFromCatalog` (renamed `openProductDetails` in the
  output)

### `mutations`
- `handleBulkProductPublishStatus`,
  `isUpdatingProductPublishStatus`

## Why this isn't done in one PR

`useAdminProductViewProps.js` has 11 colocated `*.test.js` files which assert
the *flat* shape of the returned object (e.g.
`useAdminProductViewProps.test.js`,
`adminProductsPageControllerState.test.js`). A clean refactor requires
co-updating all of those, then verifying the panel components below
(`ProductManagementSection`, `ProductPanels`, `ProductManagementPanels`,
`AdminCatalogPagination`) read from the new nested shape.

**Recommended phased rollout:**

1. **Add the grouped shape as a parallel return field** (no consumer change).
   Tests stay green.
2. **Migrate `ProductManagementSection`** to read from the grouped shape.
   Update only its tests.
3. **Migrate downstream panels one by one** (`ProductPanels`, then forms).
4. **Remove the flat fields** once nothing references them; delete legacy
   tests.

Each step is a separate PR; each step is independently revertible.
