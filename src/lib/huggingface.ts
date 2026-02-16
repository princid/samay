import { InferenceClient } from "@huggingface/inference";

const hf = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

/**
 * Ordered list of model + provider combos to try.
 * The free `hf-inference` provider has ZERO image-to-image models,
 * so we must target providers that actually host them (fal-ai, novita,
 * replicate, etc.).  The user's HF token must have the provider enabled
 * at https://hf.co/settings/inference-providers.
 */
const MODEL_CONFIGS = [
  {
    model: "black-forest-labs/FLUX.1-Kontext-dev",
    provider: "fal-ai" as const,
    prompt:
      "Transform this image into Studio Ghibli anime style, hand-drawn animation, cel shaded, vibrant colors, masterpiece",
    negativePrompt:
      "realistic, photo, 3d render, distorted faces, blurry, grainy, lowres, text, watermark",
    strength: 0.75,
    guidance: 12.0,
  },
  {
    model: "black-forest-labs/FLUX.1-Kontext-dev",
    provider: "replicate" as const,
    prompt:
      "Transform this image into Studio Ghibli anime style, hand-drawn animation, cel shaded, vibrant colors, masterpiece",
    negativePrompt:
      "realistic, photo, 3d render, distorted faces, blurry, grainy, lowres, text, watermark",
    strength: 0.75,
    guidance: 12.0,
  },
  {
    model: "nitrosocke/Ghibli-Diffusion",
    provider: "novita" as const,
    prompt:
      "ghibli style, cinematic anime art, studio ghibli, hand-drawn animation, cel shaded, vibrant colors, masterpiece",
    negativePrompt:
      "realistic, photo, 3d render, distorted faces, blurry, grainy, lowres, text, watermark",
    strength: 0.75,
    guidance: 12.0,
  },
];

/** Track which config index works to avoid re-trying bad ones. */
let workingConfigIdx: number | null = null;
let allConfigsFailed = false;

/**
 * Processes a single image frame through the Hugging Face Inference API.
 * Tries multiple model+provider combos until one succeeds, then sticks with it.
 */
export async function processFrameToAnime(
  imageBuffer: Buffer
): Promise<Buffer> {
  if (allConfigsFailed) return imageBuffer;

  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });

  // If we already found a working config, use it directly
  if (workingConfigIdx !== null) {
    return callModel(blob, MODEL_CONFIGS[workingConfigIdx]);
  }

  // Try each config until one works
  for (let i = 0; i < MODEL_CONFIGS.length; i++) {
    try {
      const result = await callModel(blob, MODEL_CONFIGS[i]);
      workingConfigIdx = i;
      console.log(
        `✓ Using ${MODEL_CONFIGS[i].model} via ${MODEL_CONFIGS[i].provider}`
      );
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(
        `Model ${MODEL_CONFIGS[i].model} (${MODEL_CONFIGS[i].provider}) failed: ${msg}`
      );
    }
  }

  // All configs exhausted
  allConfigsFailed = true;
  console.warn(
    "⚠ All AI models failed. Returning original frames.\n" +
      "  To enable Ghibli-style conversion:\n" +
      "  1. Get an API key from https://huggingface.co/settings/tokens\n" +
      "  2. Enable a provider (fal-ai, replicate, or novita) at\n" +
      "     https://hf.co/settings/inference-providers\n" +
      "  3. Set HUGGINGFACE_API_KEY in your .env.local"
  );
  return imageBuffer;
}

async function callModel(
  blob: Blob,
  config: (typeof MODEL_CONFIGS)[number]
): Promise<Buffer> {
  const result = await hf.imageToImage({
    model: config.model,
    provider: config.provider,
    inputs: blob,
    parameters: {
      prompt: config.prompt,
      negative_prompt: config.negativePrompt,
      strength: config.strength,
      guidance_scale: config.guidance,
    },
  });
  const arrayBuffer = await result.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Simplified fallback — just delegates to the main function which
 * already handles provider fallback internally.
 */
export async function processFrameSimple(
  imageBuffer: Buffer
): Promise<Buffer> {
  return processFrameToAnime(imageBuffer);
}

export { hf };
