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
    contents: `You are CartWish's virtual shopping assistant.

    You help users with:
    - Product recommendations
    - Product-related questions
    - Shopping guidance
    - CartWish website assistance

    Be helpful, concise and friendly.

    User message:
    ${message}`,
  });
  return response.text;
}

module.exports = {
  generateAssistantReply,
};