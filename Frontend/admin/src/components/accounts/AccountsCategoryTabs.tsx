import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from '../../types/services'

const ORDER: Array<ServiceCategory | 'all'> = ['all', 'llm', 'video', 'photo', 'social']

export function AccountsCategoryTabs({
  activeCategory,
  onChange,
  countsByCategory,
}: {
  activeCategory: ServiceCategory | 'all'
  onChange: (value: ServiceCategory | 'all') => void
  countsByCategory: Partial<Record<ServiceCategory | 'all', number>>
}) {
  return (
    <div className="accounts-category-tabs" role="tablist" aria-label="Catégorie de service">
      {ORDER.map((category) => {
        const label = category === 'all' ? 'Tous' : SERVICE_CATEGORY_LABELS[category]
        const count = countsByCategory[category]
        return (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={activeCategory === category}
            className={`accounts-category-tab ${activeCategory === category ? 'is-active' : ''}`}
            onClick={() => onChange(category)}
          >
            <span>{label}</span>
            {typeof count === 'number' ? <span className="accounts-category-tab-count">{count}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
