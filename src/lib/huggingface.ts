import { HfInference } from "@huggingface/inference";

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

/**
 * Processes a single image frame through the Hugging Face AI model
 * to apply anime/ghibli-style transformation.
 *
 * Uses the instruct-pix2pix model which is designed for instruction-based
 * image editing via the image-to-image pipeline.
 */
export async function processFrameToAnime(
  imageBuffer: Buffer
): Promise<Buffer> {
  const blob = new Blob([new Uint8Array(imageBuffer)], { type: "image/png" });

  const result = await hf.imageToImage({
    model: "timbrooks/instruct-pix2pix",
    inputs: blob,
    parameters: {
      prompt:
        "Transform this into Studio Ghibli anime style, cel shaded animation, vibrant colors, anime artwork",
      negative_prompt:
        "realistic, photograph, blurry, low quality, distorted, deformed",
      guidance_scale: 7.5,
      image_guidance_scale: 1.5,
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
      model: "nitrosocke/Ghibli-Diffusion",
      inputs: blob,
      parameters: {
        prompt:
          "ghibli style, anime, Studio Ghibli, high quality anime art, cel shaded, vibrant colors",
        negative_prompt:
          "realistic, photograph, blurry, low quality, distorted",
        strength: 0.75,
        guidance_scale: 7.5,
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
