import { GoogleGenAI, Part } from "@google/genai";
import { GenerationConfig, BrandTone, AspectRatio } from "../types";

// Initialize the client
// API Key is strictly from process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Enhances a raw user prompt into a more descriptive visual prompt using a text model.
 * Incorporates Brand Tonality, User Scenario Analysis, and Aspect Ratio composition rules.
 */
export const enhancePrompt = async (rawPrompt: string, tone: BrandTone = 'default', ratio: AspectRatio = '1:1'): Promise<string> => {
  let systemInstruction = "You are an expert visual prompt engineer for generative AI.";
  
  let toneInstruction = "";
  switch (tone) {
    case 'minimalist':
      toneInstruction = "Brand Tone: 'Minimalist'. Focus on clean lines, negative space, desaturated palettes, soft diffused lighting, and simplicity.";
      break;
    case 'luxury':
      toneInstruction = "Brand Tone: 'Luxury'. Emphasize elegance, premium materials (gold, marble, silk), dramatic rim lighting, depth of field, and sophistication.";
      break;
    case 'energetic':
      toneInstruction = "Brand Tone: 'Energetic'. Use dynamic composition, motion blur, vibrant neon or saturated colors, high contrast, and action-oriented angles.";
      break;
    case 'corporate':
      toneInstruction = "Brand Tone: 'Corporate'. Ensure a professional, trustworthy look with blue/grey tones, structured symmetrical composition, and bright, even studio lighting.";
      break;
    case 'playful':
      toneInstruction = "Brand Tone: 'Playful'. Use soft rounded shapes, pastel or bright primary colors, warm high-key lighting, and a whimsical or inviting atmosphere.";
      break;
    default:
      toneInstruction = "Brand Tone: High-quality professional photography with balanced composition.";
  }

  // Composition rules based on Aspect Ratio - These are critical for the model to understand the frame
  let compositionInstruction = "";
  let ratioKeywords = "";
  
  switch (ratio) {
    case '16:9': 
      compositionInstruction = "Composition: Wide cinematic shot, rule of thirds, emphasize horizontal scale. Describe a wide-angle view."; 
      ratioKeywords = "wide shot, cinematic composition, panoramic view, 16:9 aspect ratio";
      break;
    case '9:16': 
      compositionInstruction = "Composition: Vertical portrait framing, tall subject matter, emphasize height and vertical leading lines. Describe a tall, vertical view."; 
      ratioKeywords = "vertical shot, portrait mode, tall composition, 9:16 aspect ratio";
      break;
    case '1:1': 
      compositionInstruction = "Composition: Centralized symmetrical framing, balanced square composition, focus on the subject."; 
      ratioKeywords = "square composition, symmetrical framing, centered subject";
      break;
    case '4:3':
      compositionInstruction = "Composition: Classic photography framing, balanced distribution.";
      ratioKeywords = "4:3 standard photography aspect ratio";
      break;
    case '3:4':
      compositionInstruction = "Composition: Classic portrait photography framing.";
      ratioKeywords = "3:4 standard portrait aspect ratio";
      break;
    default: 
      compositionInstruction = "Composition: Balanced standard photography framing."; 
      ratioKeywords = "balanced composition";
      break;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemInstruction} 
      
      TASK: Rewrite the user's request into a highly detailed image generation prompt (approx 100-150 words).

      STEPS:
      1. ANALYZE the "User Scenario" and apply specific technical rules:
         - IF Product Photography: Use "studio lighting, softbox, 100mm macro lens, 8k textures, neutral background".
         - IF UI/UX Design: Use "clean vector style, flat lay, Behance trending, modern typography, Figma style".
         - IF Character Design: Use "full body shot, expressive pose, octane render, subsurface scattering, rim lighting".
         - IF Architecture: Use "wide angle lens, architectural digest style, golden hour lighting, hyper-realistic materials".
         - IF Landscape/Nature: Use "atmospheric perspective, volumetric lighting, photorealistic, intricate details".
      
      2. APPLY Brand Tone: ${toneInstruction}
      
      3. APPLY Composition: ${compositionInstruction}
      
      4. MANDATORY: You MUST include these exact composition keywords in the final prompt text: "${ratioKeywords}".
      
      5. Output ONLY the raw prompt text. Do not use quotes, markdown, or explanations.
      
      User request: "${rawPrompt}"`,
    });
    return response.text?.trim() || rawPrompt;
  } catch (error) {
    console.warn("Prompt enhancement failed, using raw prompt", error);
    return rawPrompt;
  }
};

/**
 * Generates a creative random prompt for inspiration, tailored to the specific Brand Tone and Aspect Ratio.
 */
export const suggestCreativePrompt = async (tone: BrandTone = 'default', ratio: AspectRatio = '1:1'): Promise<string> => {
  let context = "";
  switch (tone) {
    case 'minimalist': context = "Generate a prompt for a clean, minimalist design object or architectural detail. Focus on white, grey, and soft light."; break;
    case 'luxury': context = "Generate a prompt for a high-end fashion editorial or luxury product shot (watch, perfume, car). Focus on gold, black, and dramatic light."; break;
    case 'energetic': context = "Generate a prompt for a dynamic sports event or cyberpunk scene with motion blur and neon colors."; break;
    case 'corporate': context = "Generate a prompt for a modern office concept or abstract tech visualization suitable for a business presentation."; break;
    case 'playful': context = "Generate a prompt for a cute 3D character or colorful landscape in a style like Pixar or Nintendo."; break;
    default: context = "Generate a vivid, highly detailed visual prompt (sci-fi, fantasy, or cinematic photography)."; break;
  }

  const ratioHint = ratio === '9:16' ? "The subject MUST fit a vertical frame (tall)." : ratio === '16:9' ? "The subject MUST fit a wide panoramic frame." : "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Task: ${context} 
      Constraint: ${ratioHint}
      Output ONLY the image prompt text. Keep it descriptive but under 50 words.`,
    });
    return response.text?.trim() || "A futuristic city floating in the clouds at golden hour, hyper-realistic, 8k resolution.";
  } catch (error) {
    return "A cyberpunk detective standing in neon rain, digital art style, high contrast.";
  }
};

/**
 * Generates an image based on the configuration.
 * Uses gemini-2.5-flash-image for standard generation.
 */
export const generateImage = async (config: GenerationConfig): Promise<string> => {
  const modelName = "gemini-2.5-flash-image";

  // Construct the prompt with style modifiers
  const fullPrompt = `${config.prompt}. ${config.negativePrompt ? `Exclude: ${config.negativePrompt}.` : ''}`;

  const parts: Part[] = [];

  // Add reference image if exists (Image Editing / Variation)
  if (config.referenceImage) {
    // Remove data URL header if present to get raw base64
    const base64Data = config.referenceImage.replace(/^data:image\/\w+;base64,/, "");
    parts.push({
      inlineData: {
        data: base64Data,
        mimeType: "image/png", // Assuming PNG/JPEG for simplicity
      },
    });
  }

  // Add text prompt
  parts.push({ text: fullPrompt });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts },
      config: {
        imageConfig: {
            aspectRatio: config.aspectRatio,
        }
      },
    });

    // Parse response to find image part. 
    // Gemini 2.5 Flash Image returns parts, we need to find the one with inlineData
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response.");

  } catch (error) {
    console.error("Gemini Image Generation Error:", error);
    throw error;
  }
};