import { StatTile } from './AccountsPresenters'

export interface AccountsStatsSummary {
  total: number
  healthy: number
  warning: number
  off: number
}

export function AccountsStatsSection({ stats }: { stats: AccountsStatsSummary }) {
  return (
    <section className="journey-stats" aria-label="Statistiques comptes">
      <StatTile label="Total" value={stats.total} delta="Tous services confondus" />
      <StatTile
        label="Healthy"
        value={stats.healthy}
        delta={stats.healthy === stats.total ? 'All good' : 'Opérationnels'}
        trend="up"
      />
      <StatTile
        label="Warning"
        value={stats.warning}
        delta={stats.warning > 0 ? 'À vérifier' : 'Aucun'}
        trend={stats.warning > 0 ? 'warn' : null}
      />
      <StatTile
        label="Off"
        value={stats.off}
        delta={stats.off > 0 ? 'Action requise' : 'Aucun'}
        trend={stats.off > 0 ? 'warn' : null}
      />
    </section>
  )
}
