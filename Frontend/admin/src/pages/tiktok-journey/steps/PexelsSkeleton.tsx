/**
 * Skeleton placeholder for the Pexels gallery while React Query is fetching.
 *
 * Reserves the same grid footprint as the real result so cards arrive without
 * shifting the surrounding layout. Pure presentational — no props beyond the
 * desired number of placeholder tiles.
 */
export function PexelsGallerySkeleton({ tiles = 9 }: { tiles?: number }) {
  return (
    <div
      className="journey-media-grid is-skeleton"
      aria-busy="true"
      aria-label="Chargement de la galerie Pexels"
    >
      {Array.from({ length: tiles }).map((_, index) => (
        <div key={index} className="journey-media-card is-skeleton" aria-hidden="true">
          <div className="journey-skeleton-shimmer journey-media-card-video" />
          <div className="journey-skeleton-shimmer journey-skeleton-line" />
          <div className="journey-skeleton-shimmer journey-skeleton-line is-short" />
        </div>
      ))}
    </div>
  )
}

/**
 * Smaller skeleton for the library list / cards while bootstrap is loading.
 */
export function LibraryCardsSkeleton({ tiles = 6 }: { tiles?: number }) {
  return (
    <div className="journey-library-grid is-skeleton" aria-busy="true">
      {Array.from({ length: tiles }).map((_, index) => (
        <div key={index} className="journey-library-card is-skeleton" aria-hidden="true">
          <div className="journey-skeleton-shimmer journey-library-thumb" />
          <div className="journey-skeleton-shimmer journey-skeleton-line" />
          <div className="journey-skeleton-shimmer journey-skeleton-line is-short" />
        </div>
      ))}
    </div>
  )
}
