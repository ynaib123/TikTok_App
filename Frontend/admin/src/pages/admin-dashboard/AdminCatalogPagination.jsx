function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m14.5 6-6 6 6 6" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9.5 6 6 6-6 6" />
    </svg>
  )
}

export default function AdminCatalogPagination({
  currentPage,
  menuId = 'page',
  onChangePage,
  onChangePageSize,
  openCatalogMenu,
  pageSize,
  pageSizeAriaLabel,
  pageSizeOptions = [],
  pageSizeScrollRef,
  selectedPageSizeLabel,
  setOpenCatalogMenu,
  totalPages,
  className = '',
  summaryLabel,
}) {
  const menuRef = useRef(null)
  const resolvedTotalPages = Math.max(1, Number(totalPages || 1))
  const resolvedCurrentPage = Math.min(resolvedTotalPages, Math.max(1, Number(currentPage || 1)))
  const resolvedClassName = ['admin-product-pagination', className].filter(Boolean).join(' ')

  const handlePageSizeChange = (nextValue) => {
    if (pageSizeScrollRef?.current !== undefined) {
      pageSizeScrollRef.current = typeof window === 'undefined' ? null : window.scrollY
    }
    onChangePageSize?.(nextValue)
    setOpenCatalogMenu?.(null)
  }

  useEffect(() => {
    if (openCatalogMenu !== menuId) return undefined

    const frame = window.requestAnimationFrame(() => {
      const menuElement = menuRef.current
      if (!(menuElement instanceof HTMLElement)) return

      const selectedOption = menuElement.querySelector('.is-selected')
      const firstOption = menuElement.querySelector('button:not([disabled])')
      const target = selectedOption instanceof HTMLElement ? selectedOption : firstOption
      if (target instanceof HTMLElement) {
        target.focus()
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [menuId, openCatalogMenu])

  const handleMenuKeyDown = (event) => {
    const menuElement = menuRef.current
    if (!(menuElement instanceof HTMLElement)) return

    const options = Array.from(menuElement.querySelectorAll('button:not([disabled])'))
      .filter((item) => item instanceof HTMLElement)

    if (options.length === 0) return

    const currentIndex = options.findIndex((item) => item === document.activeElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      setOpenCatalogMenu?.(null)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % options.length
      options[nextIndex].focus()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = currentIndex < 0 ? options.length - 1 : (currentIndex - 1 + options.length) % options.length
      options[nextIndex].focus()
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      options[0].focus()
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      options[options.length - 1].focus()
    }
  }

  return (
    <div className={resolvedClassName}>
      <div className="admin-product-pagination-actions admin-product-pagination-actions-left">
        <button
          type="button"
          className="admin-product-pagination-btn"
          onClick={() => onChangePage?.(Math.max(1, resolvedCurrentPage - 1))}
          disabled={resolvedCurrentPage === 1}
          aria-label="Page precedente"
        >
          <span className="admin-toolbar-icon" aria-hidden="true"><ChevronLeftIcon /></span>
        </button>
      </div>

      <div className="admin-product-pagination-center">
        {Array.isArray(pageSizeOptions) && pageSizeOptions.length > 0 && onChangePageSize ? (
          <div className="admin-product-toolbar-field admin-product-toolbar-select admin-product-toolbar-select-icon admin-product-pagination-size-picker">
            <button
              type="button"
              className={`admin-product-pagination-summary-btn ${openCatalogMenu === menuId ? 'is-open' : ''}`}
              onClick={() => setOpenCatalogMenu?.((prev) => (prev === menuId ? null : menuId))}
              aria-controls={openCatalogMenu === menuId ? `admin-pagination-menu-${menuId}` : undefined}
              aria-haspopup="listbox"
              aria-expanded={openCatalogMenu === menuId}
              aria-label={pageSizeAriaLabel}
              title={selectedPageSizeLabel ? `Par page: ${selectedPageSizeLabel}` : undefined}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setOpenCatalogMenu?.(menuId)
                }
              }}
            >
              <span aria-live="polite" aria-atomic="true">{summaryLabel || `Page ${resolvedCurrentPage} sur ${resolvedTotalPages}`}</span>
            </button>

            {openCatalogMenu === menuId ? (
              <div
                id={`admin-pagination-menu-${menuId}`}
                className="admin-product-toolbar-menu admin-product-toolbar-menu-up"
                role="listbox"
                aria-label={pageSizeAriaLabel}
                ref={menuRef}
                tabIndex={-1}
                onKeyDown={handleMenuKeyDown}
              >
                {pageSizeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`admin-product-toolbar-option ${pageSize === option.value ? 'is-selected' : ''}`}
                    onClick={() => handlePageSizeChange(option.value)}
                    role="option"
                    aria-selected={pageSize === option.value}
                  >
                    <span>{option.label}</span>
                    {pageSize === option.value ? <strong>•</strong> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <span className="admin-console-copy">{summaryLabel || `Page ${resolvedCurrentPage} sur ${resolvedTotalPages}`}</span>
        )}
      </div>

      <div className="admin-product-pagination-actions admin-product-pagination-actions-right">
        <button
          type="button"
          className="admin-product-pagination-btn is-primary"
          onClick={() => onChangePage?.(Math.min(resolvedTotalPages, resolvedCurrentPage + 1))}
          disabled={resolvedCurrentPage >= resolvedTotalPages}
          aria-label="Page suivante"
        >
          <span className="admin-toolbar-icon" aria-hidden="true"><ChevronRightIcon /></span>
        </button>
      </div>
    </div>
  )
}
import { useEffect, useRef } from 'react'
