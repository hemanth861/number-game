let secretNumber = 0;
let attempts = 0;
let maxAttempts = 10;
let gameOver = false;
let guessHistory = [];
let totalScore = 0;
let bestRound = 0;
let lastDirection = null;
let highScoreTimeout = null;

const DIFFICULTY_CONFIG = {
    easy: { maxAttempts: Infinity, multiplier: 1, label: 'Easy' },
    medium: { maxAttempts: 10, multiplier: 2, label: 'Medium' },
    hard: { maxAttempts: 5, multiplier: 3, label: 'Hard' }
};

const STORAGE_KEYS = {
    highScore: 'numberGuessHighScore',
    totalScore: 'numberGuessTotalScore',
    bestRound: 'numberGuessBestRound',
    voice: 'numberGuessVoiceEnabled'
};

const storage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
        }
    }
};

const guessInput = document.getElementById('guessInput');
const guessBtn = document.getElementById('guessBtn');
const newGameBtn = document.getElementById('newGameBtn');
const hintBtn = document.getElementById('hintBtn');
const difficultySelect = document.getElementById('difficulty');
const difficultyHint = document.getElementById('difficultyHint');
const attemptsDisplay = document.getElementById('attempts');
const highScoreDisplay = document.getElementById('highScore');
const totalScoreDisplay = document.getElementById('totalScore');
const bestRoundDisplay = document.getElementById('bestRound');
const messageDisplay = document.getElementById('message');
const historyList = document.getElementById('historyList');
const characterMessage = document.getElementById('characterMessage');
const mouth = document.getElementById('mouth');
const voiceToggle = document.getElementById('voiceToggle');
const voiceInfo = document.getElementById('voiceInfo');
const voiceLabel = document.getElementById('voiceLabel');

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
let voiceEnabled = storage.get(STORAGE_KEYS.voice) === 'true';
let hasInteracted = false;

function markInteraction() {
    hasInteracted = true;
}

window.addEventListener('pointerdown', markInteraction, { once: true, passive: true });
window.addEventListener('keydown', markInteraction, { once: true });
window.addEventListener('touchstart', markInteraction, { once: true, passive: true });

function getStoredNumber(key, fallback) {
    const value = storage.get(key);
    const parsed = value === null ? NaN : parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getHighScore() {
    const score = storage.get(STORAGE_KEYS.highScore);
    return score ? parseInt(score, 10) : null;
}

function updateHighScoreDisplay() {
    const highScore = getHighScore();
    highScoreDisplay.textContent = highScore !== null ? highScore : '-';
}

function updateScoreDisplays() {
    totalScoreDisplay.textContent = totalScore;
    bestRoundDisplay.textContent = bestRound;
}

function loadPersistentStats() {
    totalScore = getStoredNumber(STORAGE_KEYS.totalScore, 0);
    bestRound = getStoredNumber(STORAGE_KEYS.bestRound, 0);
    updateHighScoreDisplay();
    updateScoreDisplays();
}

function getPreferredVoice() {
    if (!synth || typeof synth.getVoices !== 'function') {
        return null;
    }
    const voices = synth.getVoices();
    return voices.find((voice) => /^en[-_](US|GB)/i.test(voice.lang))
        || voices.find((voice) => /^en/i.test(voice.lang))
        || null;
}

function speak(text) {
    if (!voiceEnabled || !synth || !hasInteracted) {
        return;
    }

    const cleanText = String(text)
        .replace(/[^\p{L}\p{N}\s.,!?'%-]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleanText) {
        return;
    }

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const preferredVoice = getPreferredVoice();
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    utterance.lang = 'en-US';
    utterance.rate = 1;
    utterance.pitch = 1.05;
    utterance.volume = 1;

    window.setTimeout(() => {
        if (voiceEnabled) {
            synth.speak(utterance);
        }
    }, 0);
}

function updateVoiceUI() {
    if (!synth) {
        voiceToggle.disabled = true;
        voiceInfo.disabled = true;
        voiceLabel.textContent = 'Voice N/A';
        voiceToggle.setAttribute('aria-pressed', 'false');
        return;
    }

    voiceToggle.classList.toggle('active', voiceEnabled);
    voiceToggle.setAttribute('aria-pressed', String(voiceEnabled));
    voiceToggle.setAttribute('aria-label', voiceEnabled ? 'Turn voice assistant off' : 'Turn voice assistant on');
    voiceLabel.textContent = voiceEnabled ? 'Voice: On' : 'Voice: Off';
}

function toggleVoice() {
    if (!synth) {
        showMessage('Voice assistant is not supported in this browser.', 'error');
        return;
    }

    voiceEnabled = !voiceEnabled;
    storage.set(STORAGE_KEYS.voice, String(voiceEnabled));
    updateVoiceUI();

    if (voiceEnabled) {
        speak('Voice assistant enabled. I will read game updates aloud.');
    } else {
        synth.cancel();
    }
}

function buildGameInfo() {
    if (gameOver) {
        return `The game is over. The secret number was ${secretNumber}. Your total score is ${totalScore} points. Start a new game to play again.`;
    }

    const config = DIFFICULTY_CONFIG[difficultySelect.value] || DIFFICULTY_CONFIG.medium;
    const remaining = maxAttempts === Infinity
        ? 'unlimited attempts remaining'
        : `${maxAttempts - attempts} attempt${maxAttempts - attempts === 1 ? '' : 's'} remaining`;
    const lastGuess = guessHistory.length
        ? `Your last guess was ${guessHistory[guessHistory.length - 1]}.`
        : 'You have not made a guess yet.';
    let feedback = '';
    if (lastDirection === 'high') {
        feedback = 'That guess was too high, so try a lower number.';
    } else if (lastDirection === 'low') {
        feedback = 'That guess was too low, so try a higher number.';
    }

    return `Difficulty is ${config.label}. You are guessing a number between 1 and 100. You have used ${attempts} attempt${attempts === 1 ? '' : 's'} with ${remaining}. ${lastGuess} ${feedback} Your total score is ${totalScore} points.`;
}

function speakGameInfo() {
    if (!synth) {
        showMessage('Voice assistant is not supported in this browser.', 'error');
        return;
    }

    if (!voiceEnabled) {
        voiceEnabled = true;
        storage.set(STORAGE_KEYS.voice, 'true');
        updateVoiceUI();
    }

    showMessage(buildGameInfo(), 'info');
}

function updateDifficultyHint() {
    const config = DIFFICULTY_CONFIG[difficultySelect.value] || DIFFICULTY_CONFIG.medium;
    difficultyHint.textContent = config.maxAttempts === Infinity
        ? 'Unlimited attempts · 1× score multiplier'
        : `${config.maxAttempts} attempts · ${config.multiplier}× score multiplier`;
}

function newGame() {
    if (highScoreTimeout) {
        clearTimeout(highScoreTimeout);
        highScoreTimeout = null;
    }

    secretNumber = Math.floor(Math.random() * 100) + 1;
    attempts = 0;
    gameOver = false;
    guessHistory = [];
    lastDirection = null;

    const config = DIFFICULTY_CONFIG[difficultySelect.value] || DIFFICULTY_CONFIG.medium;
    maxAttempts = config.maxAttempts;

    attemptsDisplay.textContent = attempts;
    guessInput.value = '';
    guessInput.disabled = false;
    guessBtn.disabled = false;
    hintBtn.disabled = false;

    messageDisplay.className = 'message';
    messageDisplay.textContent = '';

    historyList.innerHTML = '';

    characterMessage.textContent = "I'm ready! Make your guess!";
    mouth.setAttribute('d', 'M 95 90 Q 100 95 105 90');

    updateDifficultyHint();
    updateScoreDisplays();

    guessInput.focus();

    showMessage('New game started! Make your first guess.', 'info');
}

function showMessage(text, type = 'info') {
    messageDisplay.textContent = text;
    messageDisplay.className = 'message show ' + type;

    if (type === 'correct') {
        characterMessage.textContent = 'Woohoo! You nailed it!';
        mouth.setAttribute('d', 'M 90 90 Q 100 100 110 90');
    } else if (type === 'high') {
        characterMessage.textContent = 'Ooh, going too high!';
        mouth.setAttribute('d', 'M 95 92 Q 100 88 105 92');
    } else if (type === 'low') {
        characterMessage.textContent = 'Getting warmer, go higher!';
        mouth.setAttribute('d', 'M 95 92 Q 100 88 105 92');
    } else if (type === 'error') {
        characterMessage.textContent = 'Game Over! Better luck next time!';
        mouth.setAttribute('d', 'M 90 95 Q 100 90 110 95');
    } else if (type === 'info') {
        characterMessage.textContent = "Let's crack this one!";
        mouth.setAttribute('d', 'M 95 90 Q 100 95 105 90');
    }

    speak(text);
}

function updateAttempts() {
    attempts++;
    attemptsDisplay.textContent = attempts;
}

function addToHistory(guess, result = 'info') {
    guessHistory.push(guess);
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item ' + result;
    historyItem.textContent = guess;
    historyList.appendChild(historyItem);
}

function calculateRoundScore() {
    const config = DIFFICULTY_CONFIG[difficultySelect.value] || DIFFICULTY_CONFIG.medium;
    const base = 120;
    const rawScore = Math.max(10, base - attempts * 10);
    return Math.round(rawScore * config.multiplier);
}

function disableControls() {
    gameOver = true;
    guessInput.disabled = true;
    guessBtn.disabled = true;
    hintBtn.disabled = true;
}

function handleWin() {
    disableControls();

    const roundScore = calculateRoundScore();
    totalScore += roundScore;
    bestRound = Math.max(bestRound, roundScore);

    storage.set(STORAGE_KEYS.totalScore, String(totalScore));
    storage.set(STORAGE_KEYS.bestRound, String(bestRound));
    updateScoreDisplays();

    showMessage(`🎉 Correct! The number was ${secretNumber}. You got it in ${attempts} attempt(s) and earned ${roundScore} points!`, 'correct');

    characterMessage.textContent = 'CHAMPION! Amazing job!';
    mouth.setAttribute('d', 'M 90 90 Q 100 100 110 90');

    const currentHighScore = getHighScore();
    if (currentHighScore === null || attempts < currentHighScore) {
        storage.set(STORAGE_KEYS.highScore, attempts.toString());
        updateHighScoreDisplay();
        highScoreTimeout = window.setTimeout(() => {
            highScoreTimeout = null;
            showMessage(`🎉 New High Score! ${attempts} attempts and ${roundScore} points!`, 'correct');
            characterMessage.textContent = "NEW HIGH SCORE! You're on fire!";
        }, 1500);
    }
}

function handleLoss() {
    disableControls();
    showMessage(`😔 Game Over! The number was ${secretNumber}. No attempts left!`, 'error');
    characterMessage.textContent = "Don't give up! Try again!";
    mouth.setAttribute('d', 'M 90 95 Q 100 90 110 95');
}

function makeGuess() {
    if (gameOver) {
        return;
    }

    const guess = parseInt(guessInput.value, 10);

    if (isNaN(guess)) {
        showMessage('Please enter a valid number!', 'error');
        return;
    }

    if (guess < 1 || guess > 100) {
        showMessage('Please enter a number between 1 and 100!', 'error');
        return;
    }

    if (guessHistory.includes(guess)) {
        showMessage('You already guessed that number!', 'error');
        return;
    }

    updateAttempts();

    let result;
    if (guess === secretNumber) {
        result = 'correct';
    } else if (guess > secretNumber) {
        result = 'high';
    } else {
        result = 'low';
    }

    lastDirection = result === 'correct' ? null : result;
    addToHistory(guess, result);

    if (result === 'correct') {
        handleWin();
    } else {
        showMessage(
            result === 'high' ? '📈 Too high! Try a lower number.' : '📉 Too low! Try a higher number.',
            result
        );

        if (maxAttempts !== Infinity && attempts >= maxAttempts) {
            handleLoss();
        }
    }

    guessInput.value = '';
    guessInput.focus();
}

function giveHint() {
    if (gameOver) {
        showMessage('Game is over! Start a new game for hints.', 'info');
        return;
    }

    if (attempts === 0) {
        showMessage('Make at least one guess first to get a hint!', 'info');
        return;
    }

    if (secretNumber > 50) {
        showMessage('💡 Hint: The number is in the upper half (51-100)', 'info');
    } else {
        showMessage('💡 Hint: The number is in the lower half (1-50)', 'info');
    }
}

guessBtn.addEventListener('click', makeGuess);

guessInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        makeGuess();
    }
});

newGameBtn.addEventListener('click', newGame);

hintBtn.addEventListener('click', giveHint);

difficultySelect.addEventListener('change', () => {
    updateDifficultyHint();
    if (attempts > 0 && !gameOver) {
        showMessage('Difficulty changed. Click New Game to apply.', 'info');
    } else {
        newGame();
    }
});

voiceToggle.addEventListener('click', toggleVoice);

voiceInfo.addEventListener('click', speakGameInfo);

document.addEventListener('DOMContentLoaded', () => {
    loadPersistentStats();
    updateVoiceUI();
    updateDifficultyHint();
    newGame();

    characterMessage.textContent = "Hey there! Let's play!";
    mouth.setAttribute('d', 'M 95 90 Q 100 95 105 90');
});

