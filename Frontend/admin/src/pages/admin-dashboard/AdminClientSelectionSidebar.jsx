import { buildClientFullName } from './adminClientState'
import { formatMoney, formatOrderDate, getOrderAmount, normalizeStatus } from './utils'

function SectionMessage({ message }) {
  return <div className="admin-selection-empty">{message}</div>
}

function AccountToggleIcon({ isActive }) {
  if (isActive) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="11" width="16" height="9" rx="2.5" />
        <path d="M8 11V8.5a4 4 0 0 1 8 0V11" />
        <path d="m9.5 15.5 5 0" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="9" rx="2.5" />
      <path d="M8 11V8.5a4 4 0 0 1 8 0V11" />
      <path d="m12 14.5 0 3" />
      <path d="m10.5 16 3 0" />
    </svg>
  )
}

function AddressLabelIcon({ label = '', isPrimary = false }) {
  const normalizedLabel = String(label || '').toLowerCase()

  if (isPrimary || normalizedLabel.includes('maison') || normalizedLabel.includes('home') || normalizedLabel.includes('domicile')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11.5 12 4l9 7.5" />
        <path d="M5.5 10.5V20h13V10.5" />
      </svg>
    )
  }

  if (normalizedLabel.includes('bureau') || normalizedLabel.includes('work') || normalizedLabel.includes('office')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M9 5V3.5h6V5" />
        <path d="M4 12h16" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  )
}

function PaymentMethodIcon({ typeLabel = '' }) {
  const normalizedLabel = String(typeLabel || '').toLowerCase()

  if (normalizedLabel.includes('paypal')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 19 9.2 5h6.1a3.2 3.2 0 0 1 .6 6.3" />
        <path d="M6 14h6.4a3 3 0 1 0 0-6H9.8" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M3 10.5h18" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="m4.5 7 7.5 6 7.5-6" />
    </svg>
  )
}

function SidebarSection({ title, meta, children }) {
  return (
    <section className="admin-client-selection-block">
      <div className="admin-client-selection-block-head">
        <div>
          <strong className="admin-client-selection-section-title">{title}</strong>
        </div>
        {meta != null ? <span>{meta}</span> : null}
      </div>
      {children}
    </section>
  )
}

function ClientBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  )
}

export default function AdminClientSelectionSidebar({
  activeClient,
  clientProfile,
  deliveryAddresses,
  deliveryError,
  isAccountStatusSubmitting,
  isDeliveryLoading,
  isDeliveryUpdating,
  isPaymentLoading,
  isPaymentUpdating,
  isProfileLoading,
  isProfileUpdating,
  onToggleClientAccountStatus,
  onlineClientIdSet,
  paymentError,
  paymentMethods,
  profileError,
}) {
  const activeClientId = Number(activeClient?.id)
  const hasMatchingProfile = Number(clientProfile?.client?.id) === activeClientId
  const profileClient = hasMatchingProfile
    ? clientProfile.client
    : activeClient
  const hasSelectedClient = Boolean(profileClient?.id || activeClient)
  const recentOrders = hasMatchingProfile && Array.isArray(clientProfile?.recentOrders)
    ? clientProfile.recentOrders
    : []
  const isAccountActive = Boolean(profileClient?.compteActif)
  const isClientOnline = onlineClientIdSet?.has(Number(profileClient?.id))
  const clientDisplayName = buildClientFullName(profileClient)
  const totalOrders = Number(profileClient?.orderCount || recentOrders.length || 0)

  return (
    <aside className="admin-selection-sidebar admin-client-selection-sidebar" aria-labelledby="client-selection-title">
      <div className="admin-selection-sidebar-head">
        <div>
          <p id="client-selection-title" className="admin-context-sidebar-kicker">Fiche du client</p>
        </div>
      </div>
      <div className="admin-selection-sidebar-body">
        <div className="admin-client-selection-stack">
          <section className="admin-selection-sidebar-hero admin-selection-sidebar-hero-client">
            <div className="admin-client-hero-main">
              <span className={`admin-client-hero-badge ${isClientOnline ? 'is-online' : 'is-offline'}`} aria-hidden="true">
                <ClientBadgeIcon />
              </span>
              <div className="admin-selection-sidebar-hero-copy">
                <strong className="admin-selection-sidebar-hero-title">
                  {hasSelectedClient ? clientDisplayName : 'Aucun client selectionne'}
                </strong>
                <p className="admin-selection-sidebar-hero-subtitle">
                  {profileClient?.email || ''}
                </p>
              </div>
            </div>
            <div className="admin-client-hero-footer">
              <div className="admin-selection-sidebar-hero-pills">
                <span className={`admin-selection-sidebar-hero-pill ${hasSelectedClient && isAccountActive ? 'is-success' : 'is-warning'}`}>
                  {profileClient?.id ? `#${profileClient.id} • ` : ''}
                  {hasSelectedClient ? (isAccountActive ? 'Compte actif' : 'Compte suspendu') : 'Compte indisponible'}
                </span>
                <span className="admin-selection-sidebar-hero-pill admin-client-date-pill">
                  {profileClient?.createdAt
                    ? `Cree le : ${new Date(profileClient.createdAt).toLocaleDateString('fr-FR')}`
                    : 'Date indisponible'}
                </span>
              </div>
              <div className="admin-client-admin-actions admin-client-admin-actions-hero">
                <a
                  className="admin-client-admin-action admin-product-toolbar-trigger admin-product-toolbar-trigger-icon admin-client-admin-icon"
                  href={profileClient?.email ? `mailto:${profileClient.email}` : undefined}
                  aria-label="Contacter par email"
                  title={profileClient?.email ? 'Contacter par email' : 'Email indisponible'}
                  onClick={(event) => {
                    if (!profileClient?.email) {
                      event.preventDefault()
                    }
                  }}
                >
                  <span className="admin-toolbar-icon" aria-hidden="true">
                    <MailIcon />
                  </span>
                </a>
                <button
                  type="button"
                  className={`admin-client-admin-action admin-client-admin-toggle ${isAccountActive ? 'is-deactivate' : 'is-activate'}`}
                  onClick={() => void onToggleClientAccountStatus?.()}
                  disabled={!profileClient?.id || isAccountStatusSubmitting}
                  aria-label={
                    isAccountStatusSubmitting
                      ? 'Traitement du compte en cours'
                      : isAccountActive
                        ? 'Desactiver le compte'
                        : 'Activer le compte'
                  }
                  title={
                    !profileClient?.id
                      ? 'Selectionnez un client pour gerer son compte'
                      : isAccountStatusSubmitting
                        ? 'Traitement...'
                        : isAccountActive
                          ? 'Desactiver le compte'
                          : 'Activer le compte'
                  }
                >
                  {isAccountStatusSubmitting ? (
                    '...'
                  ) : (
                    <span className="admin-toolbar-icon" aria-hidden="true">
                      <AccountToggleIcon isActive={isAccountActive} />
                    </span>
                  )}
                </button>
              </div>
            </div>
          </section>

          <SidebarSection
            title="Contacts"
            meta={profileClient?.id ? `#${profileClient.id}${isProfileUpdating ? ' • Mise a jour...' : ''}` : 'Aucune fiche'}
          >
            {profileError ? <SectionMessage message={profileError} /> : null}

            <div className="admin-client-selection-list">
              <div className="admin-client-selection-row">
                <article className="admin-client-selection-item">
                  <span>Nom</span>
                  <strong>{profileClient?.nom || 'Non renseigne'}</strong>
                </article>
                <article className="admin-client-selection-item">
                  <span>Prenom</span>
                  <strong>{profileClient?.prenom || 'Non renseigne'}</strong>
                </article>
              </div>

              <div className="admin-client-selection-row">
                <article className="admin-client-selection-item">
                  <span>Email</span>
                  <strong>{profileClient?.email || 'Non renseigne'}</strong>
                </article>

                <article className="admin-client-selection-item">
                  <span>Telephone</span>
                  <strong>{profileClient?.telephone || 'Non renseigne'}</strong>
                </article>
              </div>

            </div>
          </SidebarSection>

          <SidebarSection
            title="Adresses"
            meta={hasSelectedClient ? `${deliveryAddresses.length}${isDeliveryUpdating ? ' • Mise a jour...' : ''}` : '0'}
          >
            {isDeliveryLoading && deliveryAddresses.length === 0 ? (
              <SectionMessage message="Chargement des adresses..." />
            ) : deliveryError ? (
              <SectionMessage message={deliveryError} />
            ) : deliveryAddresses.length === 0 ? (
              <SectionMessage message={hasSelectedClient ? 'Aucune adresse de livraison enregistree.' : 'Aucune adresse a afficher.'} />
            ) : (
              <div className="admin-client-selection-addresses">
                {deliveryAddresses.map((address, index) => (
                  <article key={address.id || `address-${index}`} className="admin-client-selection-item">
                    <span className="admin-client-address-label">
                      <span className="admin-client-address-icon" aria-hidden="true">
                        <AddressLabelIcon label={address.label} isPrimary={address.isPrimary} />
                      </span>
                      <span>{address.label || `Adresse ${index + 1}`}{address.isPrimary ? ' • Principale' : ''}</span>
                    </span>
                    <strong>{address.address || 'Adresse non renseignee'}</strong>
                    <small>
                      {address.city || 'Ville non renseignee'}
                      {address.postalCode ? ` - ${address.postalCode}` : ''}
                      {address.phone ? ` • ${address.phone}` : ''}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </SidebarSection>

          <SidebarSection
            title="Paiement"
            meta={hasSelectedClient ? `${paymentMethods.length}${isPaymentUpdating ? ' • Mise a jour...' : ''}` : '0'}
          >
            {isPaymentLoading && paymentMethods.length === 0 ? (
              <SectionMessage message="Chargement des methodes..." />
            ) : paymentError ? (
              <SectionMessage message={paymentError} />
            ) : paymentMethods.length === 0 ? (
              <SectionMessage message={hasSelectedClient ? 'Aucune methode de paiement enregistree.' : 'Aucune methode a afficher.'} />
            ) : (
              <div className="admin-client-selection-list">
                {paymentMethods.map((method) => (
                  <article key={method.id} className="admin-client-selection-item">
                    <span className="admin-client-payment-label">
                      <span className="admin-client-payment-icon" aria-hidden="true">
                        <PaymentMethodIcon typeLabel={method.typeLabel} />
                      </span>
                      <span>{method.typeLabel}</span>
                    </span>
                    <strong>{method.details}</strong>
                    <small>
                      {method.holder}
                      {method.isActive ? ' • Methode active' : ''}
                    </small>
                  </article>
                ))}
              </div>
            )}
          </SidebarSection>

          <SidebarSection title="Commandes" meta={`${totalOrders}${isProfileUpdating ? ' • Mise a jour...' : ''}`}>
            {isProfileLoading && !clientProfile ? (
              <SectionMessage message="Chargement des commandes..." />
            ) : profileError ? (
              <SectionMessage message={profileError} />
            ) : recentOrders.length === 0 ? (
              <SectionMessage message={hasSelectedClient ? "Ce client n'a pas encore passe de commande." : 'Aucune commande a afficher.'} />
            ) : (
              <div className="admin-client-selection-orders">
                {recentOrders.map((order) => (
                  <article key={order.id} className="admin-product-selection-pill admin-client-selection-order-pill">
                    <div className="admin-product-selection-copy">
                      <strong>Commande #{order.id}</strong>
                      <small>{formatOrderDate(order?.dateCommande)}</small>
                    </div>
                    <div className="admin-client-selection-order-meta">
                      <span className={`admin-status-pill is-${normalizeStatus(order?.statut)}`}>{order?.statut || 'Inconnue'}</span>
                      <strong>{formatMoney(getOrderAmount(order))}</strong>
                      <small>{order?.paymentStatus || order?.paymentMode || 'Paiement non renseigne'}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </SidebarSection>

        </div>
      </div>
    </aside>
  )
}
