// server.js
const express = require('express');
const cors = require('cors'); // Import CORS
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Use CORS
app.use(cors()); // Allow all origins by default

app.use(express.json());

app.post('/api/generate-form', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an assistant that generates JSON arrays of form field objects. Based on the given description, generate form fields. Each object should have:
          - label (string)
          - name (string, no spaces)
          - type (string: "text", "email", "number", etc)
          - required (boolean)
          Example output: [{"label": "Full Name", "name": "fullName", "type": "text", "required": true}]`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).send('Error generating form: ' + error.message);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
