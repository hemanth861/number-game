// Game state
let secretNumber = 0;
let attempts = 0;
let maxAttempts = 10;
let gameOver = false;
let guessHistory = [];

// DOM elements
const guessInput = document.getElementById('guessInput');
const guessBtn = document.getElementById('guessBtn');
const newGameBtn = document.getElementById('newGameBtn');
const hintBtn = document.getElementById('hintBtn');
const difficultySelect = document.getElementById('difficulty');
const attemptsDisplay = document.getElementById('attempts');
const highScoreDisplay = document.getElementById('highScore');
const messageDisplay = document.getElementById('message');
const historyList = document.getElementById('historyList');
const characterMessage = document.getElementById('characterMessage');
const mouth = document.getElementById('mouth');

// Initialize high score from localStorage
function getHighScore() {
    const score = localStorage.getItem('numberGuessHighScore');
    return score ? parseInt(score) : null;
}

function updateHighScoreDisplay() {
    const highScore = getHighScore();
    highScoreDisplay.textContent = highScore !== null ? highScore : '-';
}

// Start new game
function newGame() {
    secretNumber = Math.floor(Math.random() * 100) + 1;
    attempts = 0;
    gameOver = false;
    guessHistory = [];
    
    // Set max attempts based on difficulty
    const difficulty = difficultySelect.value;
    if (difficulty === 'easy') {
        maxAttempts = Infinity;
    } else if (difficulty === 'medium') {
        maxAttempts = 10;
    } else if (difficulty === 'hard') {
        maxAttempts = 5;
    }
    
    // Reset UI
    attemptsDisplay.textContent = attempts;
    guessInput.value = '';
    guessInput.disabled = false;
    guessBtn.disabled = false;
    hintBtn.disabled = false;
    
    messageDisplay.className = 'message';
    messageDisplay.textContent = '';
    
    historyList.innerHTML = '';
    
    if (characterMessage) {
        characterMessage.textContent = "I'm ready! Make your guess!";
    }
    if (mouth) {
        mouth.setAttribute('d', 'M 95 90 Q 100 95 105 90');
    }
    
    guessInput.focus();
    
    showMessage('New game started! Make your first guess.', 'info');
}

// Show message with styling
function showMessage(text, type = 'info') {
    messageDisplay.textContent = text;
    messageDisplay.className = 'message show ' + type;
    
    // Update character based on message type
    if (characterMessage) {
        if (type === 'correct') {
            characterMessage.textContent = "Woohoo! You nailed it!";
            if (mouth) {
                mouth.setAttribute('d', 'M 90 90 Q 100 100 110 90');
            }
        } else if (type === 'high') {
            characterMessage.textContent = "Ooh, going too high!";
            if (mouth) {
                mouth.setAttribute('d', 'M 95 92 Q 100 88 105 92');
            }
        } else if (type === 'low') {
            characterMessage.textContent = "Getting warmer, go higher!";
            if (mouth) {
                mouth.setAttribute('d', 'M 95 92 Q 100 88 105 92');
            }
        } else if (type === 'error') {
            characterMessage.textContent = "Game Over! Better luck next time!";
            if (mouth) {
                mouth.setAttribute('d', 'M 90 95 Q 100 90 110 95');
            }
        } else if (type === 'info') {
            characterMessage.textContent = "Let's crack this one!";
            if (mouth) {
                mouth.setAttribute('d', 'M 95 90 Q 100 95 105 90');
            }
        }
    }
}

// Update attempts display
function updateAttempts() {
    attempts++;
    attemptsDisplay.textContent = attempts;
}

// Add guess to history
function addToHistory(guess) {
    guessHistory.push(guess);
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.textContent = guess;
    historyList.appendChild(historyItem);
}

// Handle guess
function makeGuess() {
    if (gameOver) return;
    
    const guess = parseInt(guessInput.value);
    
    // Validation
    if (isNaN(guess)) {
        showMessage('Please enter a valid number!', 'error');
        return;
    }
    
    if (guess < 1 || guess > 100) {
        showMessage('Please enter a number between 1 and 100!', 'error');
        return;
    }
    
    // Check if already guessed
    if (guessHistory.includes(guess)) {
        showMessage('You already guessed that number!', 'error');
        return;
    }
    
    updateAttempts();
    addToHistory(guess);
    
    // Check guess
    if (guess === secretNumber) {
        // Correct guess
        gameOver = true;
        guessInput.disabled = true;
        guessBtn.disabled = true;
        hintBtn.disabled = true;
        
        showMessage(`🎉 Correct! The number was ${secretNumber}. You got it in ${attempts} attempt(s)!`, 'correct');
        
        if (characterMessage) {
            characterMessage.textContent = "CHAMPION! Amazing job!";
        }
        if (mouth) {
            mouth.setAttribute('d', 'M 90 90 Q 100 100 110 90');
        }
        
        // Check high score
        const currentHighScore = getHighScore();
        if (currentHighScore === null || attempts < currentHighScore) {
            localStorage.setItem('numberGuessHighScore', attempts.toString());
            updateHighScoreDisplay();
            setTimeout(() => {
                showMessage(`🎉 New High Score! ${attempts} attempts!`, 'correct');
                if (characterMessage) {
                    characterMessage.textContent = "NEW HIGH SCORE! You're on fire!";
                }
            }, 1500);
        }
    } else if (guess > secretNumber) {
        showMessage(`📈 Too high! Try a lower number.`, 'high');
        
        // Check if out of attempts
        if (maxAttempts !== Infinity && attempts >= maxAttempts) {
            gameOver = true;
            guessInput.disabled = true;
            guessBtn.disabled = true;
            hintBtn.disabled = true;
            showMessage(`😔 Game Over! The number was ${secretNumber}. No attempts left!`, 'error');
            if (characterMessage) {
                characterMessage.textContent = "Don't give up! Try again!";
            }
            if (mouth) {
                mouth.setAttribute('d', 'M 90 95 Q 100 90 110 95');
            }
        }
    } else if (guess < secretNumber) {
        showMessage(`📉 Too low! Try a higher number.`, 'low');
        
        // Check if out of attempts
        if (maxAttempts !== Infinity && attempts >= maxAttempts) {
            gameOver = true;
            guessInput.disabled = true;
            guessBtn.disabled = true;
            hintBtn.disabled = true;
            showMessage(`😔 Game Over! The number was ${secretNumber}. No attempts left!`, 'error');
            if (characterMessage) {
                characterMessage.textContent = "Don't give up! Try again!";
            }
            if (mouth) {
                mouth.setAttribute('d', 'M 90 95 Q 100 90 110 95');
            }
        }
    }
    
    guessInput.value = '';
    guessInput.focus();
}

// Give hint
function giveHint() {
    if (gameOver) {
        showMessage('Game is over! Start a new game for hints.', 'info');
        return;
    }
    
    if (attempts === 0) {
        showMessage('Make at least one guess first to get a hint!', 'info');
        return;
    }
    
    const range = Math.ceil((100) / 4);
    if (secretNumber > 50) {
        showMessage(`💡 Hint: The number is in the upper half (51-100)`, 'info');
    } else {
        showMessage(`💡 Hint: The number is in the lower half (1-50)`, 'info');
    }
}

// Event listeners
guessBtn.addEventListener('click', makeGuess);

guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        makeGuess();
    }
});

newGameBtn.addEventListener('click', newGame);

hintBtn.addEventListener('click', giveHint);

difficultySelect.addEventListener('change', () => {
    if (attempts > 0 && !gameOver) {
        showMessage('Difficulty changed. Click New Game to apply.', 'info');
    } else {
        newGame();
    }
});

// Initialize game on load
document.addEventListener('DOMContentLoaded', () => {
    updateHighScoreDisplay();
    newGame();
    
    if (characterMessage) {
        characterMessage.textContent = "Hey there! Let's play!";
    }
    if (mouth) {
        mouth.setAttribute('d', 'M 95 90 Q 100 95 105 90');
    }
});
