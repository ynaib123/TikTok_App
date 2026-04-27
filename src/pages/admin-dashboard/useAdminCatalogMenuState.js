import { useEffect, useState } from 'react'

export default function useAdminCatalogMenuState(initialValue = null) {
  const [openCatalogMenu, setOpenCatalogMenu] = useState(initialValue)

  useEffect(() => {
    if (!openCatalogMenu) return undefined

    const handleClickOutside = (event) => {
      if (event.target.closest('.admin-product-toolbar-select')) return
      setOpenCatalogMenu(null)
    }

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') setOpenCatalogMenu(null)
    }

    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [openCatalogMenu])

  return {
    openCatalogMenu,
    setOpenCatalogMenu,
  }
}
