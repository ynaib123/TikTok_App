export default function AdminCategorySelectionSidebar({
  activeCategory,
  createCategoryForm,
  editCategoryForm,
  embedded = false,
  handleCategorySelect,
  handleClearAllSelectedCategories,
  handleRemoveSelectedCategoryId,
  mergeCategoryForm,
  handleCreateCategory,
  handleMergeCategories,
  handleUpdateCategory,
  isCreatingCategory,
  isDeletingCategory,
  isMergingCategories,
  isUpdatingCategory,
  selectedCategories = [],
  selectedCategoryCount,
  setCreateCategoryForm,
  setEditCategoryForm,
  setMergeCategoryForm,
}) {
  const WrapperTag = embedded ? 'section' : 'aside'
  const hasCreateCategoryValue = String(createCategoryForm?.libelle || '').trim().length > 0

  return (
    <WrapperTag
      className={embedded
        ? 'admin-console-panel admin-category-editor-panel'
        : 'admin-selection-sidebar admin-product-selection-sidebar admin-category-selection-sidebar'}
      aria-labelledby="category-selection-title"
    >
      <div className="admin-selection-sidebar-head">
        <div>
          <p id="category-selection-title" className="admin-context-sidebar-kicker">Edition de categorie</p>
        </div>
      </div>

      <div className="admin-selection-sidebar-body">
        <div className="admin-category-editor-stack">
          <section className="admin-selection-group-block admin-category-selection-hero-block" aria-labelledby="category-selection-overview-title">
            <div className="admin-selection-saved-head is-pending">
              <strong id="category-selection-overview-title" className="admin-product-selection-group-title">Selections</strong>
              <div className="admin-selection-saved-actions">
                <span aria-live="polite" aria-atomic="true">{selectedCategoryCount}</span>
                <button
                  type="button"
                  className="admin-selection-saved-clear is-pending"
                  onClick={() => handleClearAllSelectedCategories?.()}
                  aria-label="Vider toutes les categories selectionnees"
                  title="Fermer tout"
                  disabled={selectedCategoryCount === 0}
                >
                  −
                </button>
              </div>
            </div>

            <div className="admin-product-selection-summary admin-product-selection-summary-column">
              {selectedCategories.map((category) => {
                const isActive = Number(category?.id) === Number(activeCategory?.id)

                return (
                  <article
                    key={`selected-category-${category.id}`}
                    className={`admin-product-selection-pill admin-product-selection-pill-button admin-category-selection-pill admin-category-selection-pill-hero ${isActive ? 'is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="admin-product-selection-pill-main"
                      onClick={() => {
                        if (typeof handleCategorySelect === 'function') {
                          handleCategorySelect({ id: category.id, libelle: category.label })
                        }
                      }}
                      disabled={!category?.id || category.id === 'empty'}
                    >
                      <span className="admin-product-selection-thumb admin-category-selection-thumb" aria-hidden="true">
                        <span>#</span>
                      </span>
                      <span className="admin-product-selection-copy">
                        <strong>{category.label}</strong>
                        <small>{category.idLabel || `#${category.id}`}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="admin-product-selection-remove"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        handleRemoveSelectedCategoryId?.(category.id)
                      }}
                      aria-label={`Retirer ${category.label}`}
                      title="Retirer"
                      disabled={!category?.id || category.id === 'empty'}
                    >
                      ×
                    </button>
                  </article>
                )
              })}
            </div>
          </section>

          <div className="admin-category-editor-bottom-stack">
            <section className="admin-selection-group-block admin-selection-group-block-create" aria-labelledby="category-create-title">
              <div className="admin-selection-saved-head is-pending">
                <strong id="category-create-title" className="admin-product-selection-group-title">Ajout</strong>
                <div className="admin-selection-saved-actions">
                  <span>Creation</span>
                </div>
              </div>

              <form className="admin-category-editor-form" onSubmit={(event) => {
                event.preventDefault()
                void handleCreateCategory()
              }}>
                <div className="admin-category-inline-row">
                  <div className="admin-product-selection-copy admin-category-selection-copy">
                    <label className="admin-product-field admin-category-edit-field">
                      <input
                        id="category-create-input"
                        type="text"
                        value={createCategoryForm.libelle}
                        onChange={(event) => setCreateCategoryForm({ libelle: event.target.value })}
                        placeholder="Ex. Accessoires gaming"
                        maxLength={100}
                        disabled={isCreatingCategory || isDeletingCategory}
                        aria-label="Nom de la nouvelle categorie"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="admin-selection-saved-clear is-pending admin-category-selection-action"
                    disabled={!hasCreateCategoryValue || isCreatingCategory || isDeletingCategory}
                    aria-label={isCreatingCategory ? 'Creation de la categorie en cours' : 'Creer la categorie'}
                    title={isCreatingCategory ? 'Creation...' : 'Ajouter'}
                  >
                    <span aria-hidden="true">+</span>
                  </button>
                </div>
              </form>
            </section>

            <section className="admin-selection-group-block admin-selection-group-block-edit" aria-labelledby="category-edit-title">
              <div className="admin-selection-saved-head is-dirty">
                <strong id="category-edit-title" className="admin-product-selection-group-title">Modification</strong>
                <div className="admin-selection-saved-actions">
                  <span>{activeCategory ? `#${activeCategory.id}` : 'Selection'}</span>
                </div>
              </div>

              <form className="admin-category-editor-form" onSubmit={(event) => {
                event.preventDefault()
                void handleUpdateCategory()
              }}>
                <div className="admin-category-inline-row">
                  <div className="admin-product-selection-copy admin-category-selection-copy">
                    <label className="admin-product-field admin-category-edit-field">
                      <input
                        id="category-edit-input"
                        type="text"
                        value={editCategoryForm.libelle}
                        onChange={(event) => setEditCategoryForm({ libelle: event.target.value })}
                        placeholder="Nom de categorie"
                        maxLength={100}
                        disabled={!activeCategory || isUpdatingCategory || isDeletingCategory}
                        aria-label="Modifier le nom de la categorie selectionnee"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="admin-selection-saved-clear is-save admin-category-selection-action"
                    disabled={!activeCategory || isUpdatingCategory || isDeletingCategory}
                    aria-label={isUpdatingCategory ? 'Mise a jour de la categorie en cours' : 'Enregistrer la categorie'}
                    title={isUpdatingCategory ? 'Mise a jour...' : 'Enregistrer'}
                  >
                    <span aria-hidden="true">✓</span>
                  </button>
                </div>
              </form>
            </section>

            <section className="admin-selection-group-block admin-selection-group-block-merge" aria-labelledby="category-merge-title">
              <div className="admin-selection-saved-head is-dirty">
                <strong id="category-merge-title" className="admin-product-selection-group-title">Fusion</strong>
                <div className="admin-selection-saved-actions">
                  <span>{selectedCategoryCount} selection</span>
                </div>
              </div>

              <form className="admin-category-editor-form" onSubmit={(event) => {
                event.preventDefault()
                void handleMergeCategories()
              }}>
                <div className="admin-category-inline-row">
                  <div className="admin-product-selection-copy admin-category-selection-copy">
                    <label className="admin-product-field admin-category-edit-field">
                      <input
                        id="category-merge-input"
                        type="text"
                        value={mergeCategoryForm.libelle}
                        onChange={(event) => setMergeCategoryForm({ libelle: event.target.value })}
                        placeholder="Ex. Univers gaming"
                        maxLength={100}
                        disabled={selectedCategoryCount < 2 || isMergingCategories || isDeletingCategory}
                        aria-label="Nom de la categorie fusionnee"
                      />
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="admin-selection-saved-clear is-dirty admin-category-selection-action"
                    disabled={selectedCategoryCount < 2 || isMergingCategories || isDeletingCategory}
                    aria-label={isMergingCategories ? 'Fusion des categories en cours' : 'Fusionner les categories selectionnees'}
                    title={selectedCategoryCount < 2 ? 'Selectionnez au moins deux categories' : 'Fusionner'}
                  >
                    <span aria-hidden="true">⇄</span>
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </div>
    </WrapperTag>
  )
}
