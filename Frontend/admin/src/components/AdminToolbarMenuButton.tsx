import { useEffect, useRef, type Dispatch, type KeyboardEvent, type ReactNode, type SetStateAction } from 'react'

type MenuRenderProps = { closeMenu: () => void; isOpen: boolean }

interface AdminToolbarMenuButtonProps {
  ariaLabel?: string
  children?: ReactNode | ((props: MenuRenderProps) => ReactNode)
  icon?: ReactNode
  menuAriaLabel?: string
  menuClassName?: string
  menuId: string
  menuRole?: 'listbox' | 'menu'
  openCatalogMenu: string | null
  setOpenCatalogMenu?: Dispatch<SetStateAction<string | null>>
  title?: string
  triggerClassName?: string
  triggerRole?: string
}

export default function AdminToolbarMenuButton({
  ariaLabel,
  children,
  icon,
  menuAriaLabel,
  menuClassName = '',
  menuId,
  menuRole = 'listbox',
  openCatalogMenu,
  setOpenCatalogMenu,
  title,
  triggerClassName = '',
  triggerRole = 'button',
}: AdminToolbarMenuButtonProps) {
  const menuRef = useRef<HTMLDivElement | null>(null)
  const isOpen = openCatalogMenu === menuId
  const resolvedTriggerClassName = [
    'admin-product-toolbar-trigger',
    'admin-product-toolbar-trigger-icon',
    isOpen ? 'is-open' : '',
    triggerClassName,
  ]
    .filter(Boolean)
    .join(' ')
  const resolvedMenuClassName = ['admin-product-toolbar-menu', menuClassName]
    .filter(Boolean)
    .join(' ')

  const toggleMenu = () => {
    setOpenCatalogMenu?.((prev) => (prev === menuId ? null : menuId))
  }

  const closeMenu = () => setOpenCatalogMenu?.(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const frame = window.requestAnimationFrame(() => {
      const menuElement = menuRef.current
      if (!(menuElement instanceof HTMLElement)) return

      const firstItem = menuElement.querySelector('button:not([disabled]), [role="menuitem"]:not([aria-disabled="true"])')
      if (firstItem instanceof HTMLElement) {
        firstItem.focus()
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!isOpen) {
        setOpenCatalogMenu?.(menuId)
      }
    }
  }

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const menuElement = menuRef.current
    if (!(menuElement instanceof HTMLElement)) return

    const items = Array.from(menuElement.querySelectorAll('button:not([disabled])'))
      .filter((item): item is HTMLElement => item instanceof HTMLElement)

    if (items.length === 0) return

    const currentIndex = items.findIndex((item) => item === document.activeElement)

    if (event.key === 'Escape') {
      event.preventDefault()
      closeMenu()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length
      items[nextIndex].focus()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length
      items[nextIndex].focus()
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      items[0].focus()
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      items[items.length - 1].focus()
    }
  }

  return (
    <div className="admin-product-toolbar-field admin-product-toolbar-select admin-product-toolbar-select-icon">
      <button
        type="button"
        className={resolvedTriggerClassName}
        onClick={toggleMenu}
        aria-controls={isOpen ? `admin-toolbar-menu-${menuId}` : undefined}
        aria-haspopup={menuRole}
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        title={title}
        role={triggerRole === 'button' ? undefined : triggerRole}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="admin-toolbar-icon" aria-hidden="true">{icon}</span>
      </button>

      {isOpen ? (
        <div
          id={`admin-toolbar-menu-${menuId}`}
          className={resolvedMenuClassName}
          role={menuRole}
          aria-label={menuAriaLabel}
          ref={menuRef}
          onKeyDown={handleMenuKeyDown}
        >
          {typeof children === 'function' ? children({ closeMenu, isOpen }) : children}
        </div>
      ) : null}
    </div>
  )
}
