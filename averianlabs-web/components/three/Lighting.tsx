"use client"

/** Original procedural lighting; no unverified external HDR asset. */
export function Lighting() {
  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 6, 5]} intensity={2} color="#ffffff" />
      <directionalLight position={[-4, 3, -2]} intensity={0.8} color="#e7edf4" />
      <hemisphereLight args={["#f5f7fa", "#8995a5", 0.8]} />
    </>
  )
}
