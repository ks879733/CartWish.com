const { GoogleGenAI } = require("@google/genai");

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const generateAssistantReply = async (message) => {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the backend.");
  }

  const response = await ai.models.generateContent({
    model,

    contents: message,

    config: {
      systemInstruction: `
You are CartWish's virtual shopping assistant.

You help users with:
- Product recommendations
- Product-related questions
- Shopping guidance
- CartWish website assistance

Be helpful, concise and friendly.
Keep responses short and useful.
Do not unnecessarily repeat information.
      `,

      temperature: 0.7,
      maxOutputTokens: 300,
    },
  });

  return response.text;
};

module.exports = {
  generateAssistantReply,
};