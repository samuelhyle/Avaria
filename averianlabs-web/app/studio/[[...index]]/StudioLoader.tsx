"use client"

import { NextStudio } from "next-sanity/studio"
import config from "../../../sanity/sanity.config"

export default function StudioLoader() {
  return <NextStudio config={config} />
}
