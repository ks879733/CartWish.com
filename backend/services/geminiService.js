const { GoogleGenAI } = require("@google/genai");
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const generateAssistantReply = async (message) => {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
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