/**
 * Sits fixed behind the whole app (mounted once in App.tsx) so every glass
 * panel — sidebar, cards, modals, tables — has a soft, slowly-drifting
 * blue/violet mesh gradient underneath it to blur.
 */
export function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />
      <div className="ambient-blob ambient-blob-4" />
    </div>
  )
}

export default AmbientBackground
