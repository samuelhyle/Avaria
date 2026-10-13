"use client"

import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing"

/**
 * Postprocessing chain for the hero. The aesthetic goal is "polished
 * product photography," not "neon particle effect" — so:
 *
 *   - Bloom intensity is conservative (0.35) with a high luminance
 *     threshold (0.92). It only lifts the brightest specular highlights,
 *     not the whole canvas.
 *   - ChromaticAberration is OFF. It was reading as "AI demo" — a faint
 *     prism shift on every pixel makes the scene look unrefined.
 *   - Vignette is gentle (0.35 darkness). Just enough to focus the eye
 *     on the focused vial.
 */
export function PostFX() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.35} luminanceThreshold={0.92} luminanceSmoothing={0.2} mipmapBlur />
      <Vignette eskil={false} offset={0.25} darkness={0.35} />
    </EffectComposer>
  )
}
