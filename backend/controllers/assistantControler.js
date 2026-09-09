const { generateAssistantReply } =  require("../services/geminiService")
const chatWithAssistant = async (req, res) => {
  try {
    const { message } = req.body;
    if(!message || !message.trim()){
      return res.status(400).json({message: "Message is required",});
    }

    const reply = await generateAssistantReply(message);

    return res.status(200).json({reply,});
    
  } catch (error) {
    console.error("Assistant Error:", error);

    return res.status(500).json({
      message: "Assistant is currently unavailable",});
  }
}

module.exports = { chatWithAssistant }