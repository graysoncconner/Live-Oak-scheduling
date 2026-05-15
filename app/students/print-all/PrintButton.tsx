'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-primary ml-auto print:hidden"
    >
      Print All
    </button>
  )
}
