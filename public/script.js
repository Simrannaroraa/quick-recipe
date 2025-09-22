const submitBtn = document.getElementById('submit-btn');
const ingredientsInput = document.getElementById('ingredients-input');
const resultsContainer = document.getElementById('results-container');
const loadingSpinner = document.getElementById('loading-spinner');

const difficultyFilter = document.getElementById('difficulty-filter');
const cuisineFilter = document.getElementById('cuisine-filter');
const timeFilter = document.getElementById('time-filter');

let dishesData = [];

const renderDishCards = (dishesToRender) => {
    resultsContainer.innerHTML = '';
    if (dishesToRender.length > 0) {
        const cardGrid = document.createElement('div');
        cardGrid.classList.add('card-grid');
        resultsContainer.appendChild(cardGrid);

        dishesToRender.forEach(dish => {
            const cardWrapper = document.createElement('div');
            cardWrapper.classList.add('card-wrapper');
            
            const cardInner = document.createElement('div');
            cardInner.classList.add('card-inner');

            const cardFront = document.createElement('div');
            cardFront.classList.add('card-front');
            cardFront.innerHTML = `
                <h3>${dish.name}</h3>
                <p>${dish.description}</p>
                <p><em>(Click to see recipe!)</em></p>
            `;

            const cardBack = document.createElement('div');
            cardBack.classList.add('card-back');
            cardBack.innerHTML = `<h4>${dish.name} Recipe</h4><p>Loading recipe...</p>`;

            cardInner.appendChild(cardFront);
            cardInner.appendChild(cardBack);
            cardWrapper.appendChild(cardInner);
            cardGrid.appendChild(cardWrapper);

            cardWrapper.addEventListener('click', () => {
                cardWrapper.classList.toggle('flipped');
                if (cardWrapper.classList.contains('flipped')) {
                    if (!cardInner.dataset.recipeLoaded) {
                        fetchRecipe(dish.name, dish.ingredients, cardBack, cardInner);
                    }
                }
            });
        });
    } else {
        resultsContainer.innerHTML = '<p>No dishes found with the selected ingredients and filters. Please try a different combination.</p>';
    }
};

const fetchRecipe = async (dishName, ingredients, cardBackElement, cardInnerElement) => {
    try {
        cardBackElement.innerHTML = `<h4>${dishName} Recipe</h4><p>Loading recipe...</p>`;
        
        const response = await fetch('/api/get-recipe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ dishName, ingredients }) 
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.recipe) {
            cardBackElement.innerHTML = `<h4>${dishName} Recipe</h4><p>${data.recipe}</p>`;
            cardInnerElement.dataset.recipeLoaded = true;
        } else {
            cardBackElement.innerHTML = `<h4>${dishName} Recipe</h4><p>Failed to load recipe.</p>`;
        }

    } catch (error) {
        console.error('Error fetching recipe:', error);
        cardBackElement.innerHTML = `<h4>${dishName} Recipe</h4><p>Could not fetch recipe. Please try again.</p>`;
    }
};

submitBtn.addEventListener('click', async () => {
    const ingredients = ingredientsInput.value.split(',').map(item => item.trim()).filter(item => item !== '');

    if (ingredients.length === 0) {
        alert('Please enter at least one ingredient.');
        return;
    }

    const difficulty = difficultyFilter.value;
    const cuisine = cuisineFilter.value;
    const timeRequired = timeFilter.value;

    loadingSpinner.classList.remove('hidden');
    resultsContainer.innerHTML = '';

    try {
        const response = await fetch('/api/suggest-dishes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ingredients, difficulty, cuisine, timeRequired }) 
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        loadingSpinner.classList.add('hidden');

        if (data && data.dishes && data.dishes.length > 0) {
            dishesData = data.dishes.map(dish => ({ ...dish, ingredients: ingredients }));
            renderDishCards(dishesData);
        } else {
            resultsContainer.innerHTML = '<p>No dishes found with the selected ingredients and filters. Please try a different combination.</p>';
        }

    } catch (error) {
        console.error('Error fetching dish suggestions:', error);
        loadingSpinner.classList.add('hidden');
        resultsContainer.innerHTML = `<p>Something went wrong while fetching dish suggestions. Please try again later. Error: ${error.message}</p>`;
    }
});