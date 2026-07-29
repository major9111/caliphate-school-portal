/**
 * Sits fixed behind the whole app (mounted once in App.tsx) so glass
 * panels — sidebar, top nav, dropdowns, modals — have a soft, slowly
 * drifting indigo/cyan/emerald mesh gradient underneath them to blur.
 * Solid surfaces (cards, tables, forms) are unaffected by this layer.
 */
export function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />
    </div>
  )
}

export default AmbientBackground
