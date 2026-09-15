"use client"

import { Bloom, ChromaticAberration, EffectComposer, Vignette } from "@react-three/postprocessing"
import { Vector2 } from "three"

export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.55} luminanceThreshold={0.85} luminanceSmoothing={0.2} mipmapBlur />
      <ChromaticAberration offset={new Vector2(0.0006, 0.0006)} />
      <Vignette eskil={false} offset={0.2} darkness={0.55} />
    </EffectComposer>
  )
}
