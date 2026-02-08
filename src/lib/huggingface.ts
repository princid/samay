import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Processes a single image frame through the Hugging Face AI model
 * to apply anime-style transformation.
 *
 * Uses image-to-image pipeline with an anime stylization model.
 */
export async function processFrameToAnime(
  imageBuffer: Buffer
): Promise<Buffer> {
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });

  const result = await hf.imageToImage({
    model: "lllyasviel/Annotators",
    inputs: blob,
    parameters: {
      prompt: "anime style, high quality anime art",
      negative_prompt: "realistic, photo, blurry, low quality",
      strength: 0.65,
      guidance_scale: 7.5,
    },
  });

  const arrayBuffer = await result.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Fallback: Use a simpler model if the primary one is unavailable.
 */
export async function processFrameSimple(
  imageBuffer: Buffer
): Promise<Buffer> {
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });

  try {
    const result = await hf.imageToImage({
      model: "stabilityai/stable-diffusion-xl-refiner-1.0",
      inputs: blob,
      parameters: {
        prompt: "anime style artwork, cel shaded, vibrant colors",
        strength: 0.5,
      },
    });
    const arrayBuffer = await result.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    // If all models fail, return original frame
    console.warn("AI processing failed, returning original frame");
    return imageBuffer;
  }
}

export { hf };
