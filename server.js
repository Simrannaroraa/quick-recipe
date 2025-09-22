const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/suggest-dishes', async (req, res) => {
    try {
        const { ingredients, difficulty, cuisine, timeRequired } = req.body;

        if (!ingredients || ingredients.length === 0) {
            return res.status(400).json({ error: 'Ingredients are required.' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            You are a culinary assistant. Analyze the following list of ingredients and suggest ten distinct, plausible dishes.
            
            For each dish, provide:
            - **name**: The dish's name.
            - **description**: A brief, one-sentence description.
            - **difficulty**: The difficulty level (Easy, Medium, Hard).
            - **cuisine**: The cuisine type (e.g., Italian, Mexican, Asian).
            - **timeRequired**: The estimated time in minutes (e.g., "30 mins", "1 hour").

            **Rules & Edge Cases:**
            1. **Strictly JSON:** Respond ONLY with a JSON object containing a single key "dishes", which is an array of dish objects. No extra text or markdown.
            2. **Ingredient Specificity:** Base suggestions strictly on the provided ingredients. Do not invent dishes that require unlisted, non-staple items.
            3. **Filter Application:** If a filter (difficulty, cuisine, or time) is provided and not "all", prioritize suggestions that match it.
            4. **No Dishes Found:** If the ingredients are nonsensical, too limited to form a dish, or don't fit the filters, return an empty array: {"dishes": []}.

            **Ingredients:**
            ${ingredients.join(', ')}
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let dishes;
        try {
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
                dishes = JSON.parse(jsonMatch[1]);
            } else {
                dishes = JSON.parse(text);
            }
        } catch (parseError) {
            console.error('Failed to parse JSON:', text);
            throw new Error('Invalid JSON response from the API.');
        }

        res.json(dishes);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to generate dish suggestions. Please try again later.' });
    }
});

app.post('/api/get-recipe', async (req, res) => {
    try {
        const { dishName, ingredients } = req.body;

        if (!dishName || !ingredients || ingredients.length === 0) {
            return res.status(400).json({ error: 'Dish name and ingredients are required to get a recipe.' });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

        const prompt = `
            Provide a detailed, step-by-step recipe for "${dishName}" using the ingredients: ${ingredients.join(', ')}.
            
            **Recipe Structure:**
            - **Dish Name:** Bold the title.
            - **Ingredients:** Provide a bulleted list with suggested quantities.
            - **Instructions:** Give clear, numbered steps.
            - **Notes:** Include preparation/cooking time and serving suggestions.

            **Rules & Edge Cases:**
            1. **No JSON:** Respond only with the recipe text. Do not use any JSON formatting.
            2. **Missing Ingredients:** If the dish is complex but the provided ingredients are minimal, mention that "additional common pantry staples (like oil, salt, pepper) are assumed" or suggest where the user might need to substitute.
            3. **Impossible Recipe:** If the request is nonsensical (e.g., "recipe for a car"), return a polite message stating that a recipe cannot be created from the given information.

            **Example Format:**
            **Classic Pasta with Tomato Sauce**
            
            **Ingredients:**
            * 200g spaghetti
            * 1 can (400g) crushed tomatoes
            * 2 cloves garlic, minced
            * 1 tbsp olive oil
            * Salt and pepper to taste
            
            **Instructions:**
            1. Cook pasta according to package directions.
            2. ...
            
            **Notes:**
            * Prep time: 5 mins, Cook time: 15 mins
            * Serves 2.

        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text(); 

        res.json({ recipe: text });

    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.status(500).json({ error: 'Failed to generate recipe. Please try again later.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});