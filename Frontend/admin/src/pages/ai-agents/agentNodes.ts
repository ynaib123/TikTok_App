export type NodeId = 'user' | 'agent' | 'backend' | 'postgres'

export interface SceneNode {
  id: NodeId
  label: string
  position: [number, number, number]
  color: string
  description: string
}

export const SCENE_NODES: SceneNode[] = [
  {
    id: 'user',
    label: 'Operator',
    position: [-7, 0, 0],
    color: '#9c9c9c',
    description: "Toi — l'admin connecté qui déclenche les runs depuis cette page.",
  },
  {
    id: 'agent',
    label: 'Claude Agent',
    position: [-2, 1.6, 0],
    color: '#ffc36f',
    description:
      "L'agent IA Claude qui raisonne. Reçoit un prompt + des outils. Rend une recommandation structurée.",
  },
  {
    id: 'backend',
    label: 'Spring Backend',
    position: [3, 1.6, 0],
    color: '#f3f3f3',
    description:
      "Spring Boot. Expose les outils (list_top_topics, get_publish_kpis, get_pending_ideas) que l'agent peut appeler.",
  },
  {
    id: 'postgres',
    label: 'Postgres',
    position: [7.5, 0, 0],
    color: '#12b76a',
    description: 'Base de données. Source de vérité pour le contenu, les runs et les métriques.',
  },
]
