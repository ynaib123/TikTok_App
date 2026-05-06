import { useState } from 'react'

import AdminShell from '../components/AdminShell'
import { Button, Modal, Pill, Spinner } from '../design-system'
import '../styles/features/journey.css'

/**
 * Preview interne des primitives du design system. Sert de "Storybook leger"
 * pour valider visuellement Button / Modal / Pill / Spinner sans installer
 * Storybook (qui ajouterait ~80MB de deps).
 *
 * Accessible via /__design quand on est connecte admin.
 */
export default function DesignSystemPreviewPage() {
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSize, setModalSize] = useState<'sm' | 'md' | 'lg'>('md')

  return (
    <div className="admin-page video-ops-page">
      <AdminShell activeNavId="dashboard">
        <div className="video-ops-shell" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <header className="journey-page-head">
            <div className="journey-page-head-copy">
              <h1>Design system — preview</h1>
              <p>Verifie visuellement les primitives <code>Button</code>, <code>Modal</code>, <code>Pill</code>, <code>Spinner</code>.</p>
            </div>
          </header>

          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Button — variants</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="primary">Primary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="danger">Danger</Button>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Button — sizes</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="md">Medium</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Button — states</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="primary" disabled>Disabled</Button>
              <Button variant="primary" loading>Loading</Button>
              <Button variant="primary" leadingIcon={<Spinner size={12} />}>With spinner</Button>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Pill — tones</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Pill tone="neutral">neutral</Pill>
              <Pill tone="success">success</Pill>
              <Pill tone="warning">warning</Pill>
              <Pill tone="error">error</Pill>
              <Pill tone="info">info</Pill>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Spinner — sizes</h2>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <Spinner size={12} />
              <Spinner size={16} />
              <Spinner size={24} />
              <Spinner size={32} />
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Modal — sizes</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['sm', 'md', 'lg'] as const).map((size) => (
                <Button
                  key={size}
                  variant="ghost"
                  onClick={() => {
                    setModalSize(size)
                    setModalOpen(true)
                  }}
                >
                  Open {size}
                </Button>
              ))}
            </div>
          </section>

          <Modal
            open={modalOpen}
            title={`Modal preview (${modalSize})`}
            size={modalSize}
            onClose={() => setModalOpen(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => setModalOpen(false)}>Confirm</Button>
              </>
            }
          >
            <p>
              Modale avec backdrop cliquable et fermeture a l&apos;Escape. Le contenu peut
              etre n&apos;importe quel ReactNode.
            </p>
            <Pill tone="success">status pill inside modal</Pill>
          </Modal>
        </div>
      </AdminShell>
    </div>
  )
}
