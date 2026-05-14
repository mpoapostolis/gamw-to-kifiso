/**
 * THE CLEANERS — fx barrel.
 *
 * Importers can do `import { applyPostFX, pulseGlitch } from "../fx"`
 * instead of reaching directly into the pipeline module.
 */
export {
  CLEANERS_FX_KEY,
  CleanersFXPipeline,
  registerPostFX,
  applyPostFX,
  pulseGlitch,
  setColdShift,
} from "./postProcess";
