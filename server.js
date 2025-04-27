const express = require("express");
const { OpenAI } = require("openai");
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

// Load environment variables from a .env file
dotenv.config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this environment variable is set
});

const app = express();
app.use(express.json());
const port = process.env.PORT || 3000;

async function createEmbedding(input) {
  try {
    // Generate vector embedding from input text
    const { data: embeddingData } = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input,
    });

    if (!embeddingData || !embeddingData[0]?.embedding) {
      throw new Error("Failed to generate embedding.");
    }

    return embeddingData[0].embedding;
  } catch (err) {
    console.error("Error in createEmbedding function:", err.message);
    throw err;
  }
}

async function findNearestMatch(embedding) {
  try {
    // Query Supabase for nearest vector match
    const { data, error } = await supabase.rpc("match_movies", {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 3,
    });

    if (error) {
      throw new Error(`Supabase query failed: ${error.message}`);
    }

    const match = data.map((obj) => obj.content).join("\n");
    return match;
  } catch (err) {
    console.error("Error in findNearestMatch function:", err.message);
    throw err;
  }
}
const chatMessages = [
  {
    role: "system",
    content: `You are an enthusiastic movie expert who loves recommending movies to people. 
      You will be given two pieces of information - some context about movies and a question. 
      Your main job is to formulate a short answer to the question using the provided context. 
      If the answer is not given in the context, find the answer in the conversation history if possible. 
      If you are unsure and cannot find the answer, say, "Sorry, I don't know the answer." 
      Please do not make up the answer. Always speak as if you were chatting to a friend.`,
  },
];

async function getChatCompletion(text, query) {
  try {
    chatMessages.push({
      role: "user",
      content: `Context: ${text} Question: ${query}`,
    });

    const { choices } = await openai.chat.completions.create({
      model: "gpt-4",
      messages: chatMessages,
      temperature: 0.65,
      frequency_penalty: 0.5,
    });

    const responseMessage = choices[0].message;
    chatMessages.push(responseMessage);
    console.log("Chat Response:", responseMessage.content);
    return responseMessage.content;
  } catch (error) {
    console.error("Error in getChatCompletion function:", error.message);
    throw new Error("Failed to generate a conversational response.");
  }
}

async function main(input) {
  try {
    console.log("Thinking...");
    const embedding = await createEmbedding(input); // Reuse existing function
    const match = await findNearestMatch(embedding); // Reuse existing function
    const response = await getChatCompletion(match, input); // Reuse existing function
    console.log("Response:", response);
    return response;
  } catch (error) {
    console.error("Error in main function.", error.message);
    throw new Error("Sorry, something went wrong. Please try again.");
  }
}

// POST endpoint for generating vector match
app.post("/match", async (req, res) => {
  const { input } = req.body;

  // Check if input is provided
  if (!input || typeof input !== "string") {
    return res
      .status(400)
      .json({ error: "Input is required and must be a string." });
  }

  try {
    // Call the main function
    const result = await main(input);

    if (!result) {
      return res
        .status(500)
        .json({ error: "An error occurred while processing the input." });
    }

    // Send the results back to the client
    return res.status(200).json(result);
  } catch (err) {
    console.error("Error in POST endpoint:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
