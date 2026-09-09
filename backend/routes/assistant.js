const express = require('express');

const router = express.Router();
const authMiddleware = require('../middleware/auth')
const { chartWithAssistant, chatWithAssistant, } = require("../controllers/assistantControler");

router.post('/chat', authMiddleware, chatWithAssistant);

module.exports = router;  