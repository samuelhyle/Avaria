/** Laboratory dilution math. Mass and volume are independent physical quantities. */
export function calculateAliquots(massMg: number, volumeMl: number, aliquotMcg: number) {
  if (![massMg, volumeMl, aliquotMcg].every((value) => Number.isFinite(value) && value > 0))
    return null
  const concentrationMgPerMl = massMg / volumeMl
  const aliquotVolumeMl = aliquotMcg / (concentrationMgPerMl * 1000)
  const aliquotCount = Math.floor((massMg * 1000) / aliquotMcg)
  if (
    ![concentrationMgPerMl, aliquotVolumeMl, aliquotCount].every(Number.isFinite) ||
    aliquotCount < 1
  )
    return null
  return {
    concentrationMgPerMl,
    concentrationMcgPerMl: concentrationMgPerMl * 1000,
    aliquotVolumeMl,
    aliquotVolumeUl: aliquotVolumeMl * 1000,
    aliquotCount,
  }
}
