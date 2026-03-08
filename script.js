// Состояние приложения
let state = {
    operations: ['multiplication'],
    operation: 'multiplication',
    mode: 'random',
    number: null,
    maxExamples: 10,
    infiniteMode: false,
    quizMode: false,
    timedMode: false,
    correctCount: 0,
    incorrectCount: 0,
    totalCount: 0,
    examplesCount: 0,
    currentProblem: null,
    currentAnswer: null,
    shownProblems: [],
    mistakes: [],
    // Для достижений
    sessionStartTime: null,
    currentStreak: 0,
    voiceExamples: 0,
    voiceStreak: 0,
    answerTimes: [],
    currentMode: null,
    multiplicationExamplesSession: 0,
    divisionExamplesSession: 0
};

// Переменные для таймера
let gameTimer = null;
let timeLeft = 60;

// Таймер для автоматического перехода
let errorTimer = null;

// Флаг блокировки при ошибке
let isErrorShowing = false;

// Инициализация темы
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    document.getElementById('themeToggle').textContent = theme === 'light' ? '🌙' : '☀️';
}

// Показать/скрыть выбор числа
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const numberGroup = document.getElementById('numberGroup');
        const numberChips = document.getElementById('numberChips');
        const numberInputs = document.querySelectorAll('input[name="number"]');

        if (this.value === 'specific') {
            numberGroup.classList.remove('disabled');
            numberChips.classList.remove('disabled');
            numberInputs.forEach(input => input.disabled = false);
        } else {
            numberGroup.classList.add('disabled');
            numberChips.classList.add('disabled');
            numberInputs.forEach(input => input.disabled = true);
        }
        validateOperations();
    });
});

// По умолчанию отключаем выбор числа при загрузке
const numberGroup = document.getElementById('numberGroup');
const numberChips = document.getElementById('numberChips');
const numberInputs = document.querySelectorAll('input[name="number"]');
numberGroup.classList.add('disabled');
numberChips.classList.add('disabled');
numberInputs.forEach(input => input.disabled = true);

// Показать/скрыть поле количества примеров в зависимости от режима
document.querySelectorAll('input[name="trainingMode"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const showCount = this.getAttribute('data-show-count') === 'true';
        const examplesCountGroup = document.getElementById('examplesCountGroup');
        const examplesCountInput = document.getElementById('examplesCount');

        if (showCount) {
            examplesCountGroup.classList.remove('disabled');
            examplesCountInput.disabled = false;
        } else {
            examplesCountGroup.classList.add('disabled');
            examplesCountInput.disabled = true;
        }
        validateOperations();
    });
});

// Обновление значения ползунка
document.getElementById('examplesCount').addEventListener('input', function() {
    document.getElementById('examplesCountValue').textContent = this.value;
});

// Обработчики изменения операций - предотвращаем снятие последней галочки
document.querySelectorAll('input[name="operation"]').forEach(checkbox => {
    checkbox.addEventListener('change', function(e) {
        const checkedCount = document.querySelectorAll('input[name="operation"]:checked').length;

        // Если пытаются снять последнюю галочку, отменяем действие
        if (checkedCount === 0) {
            e.preventDefault();
            this.checked = true;
            return;
        }

        validateOperations();
    });
});

// Валидация выбора операций
function validateOperations() {
    const selectedOperations = document.querySelectorAll('input[name="operation"]:checked');
    const startButton = document.querySelector('.btn-primary');

    // Всегда должна быть выбрана минимум одна операция
    if (selectedOperations.length === 0) {
        // Это состояние не должно возникать из-за блока выше, но на всякий случай
        const firstCheckbox = document.querySelector('input[name="operation"]');
        if (firstCheckbox) {
            firstCheckbox.checked = true;
        }
    }

    // Кнопка всегда активна, так как минимум одна операция всегда выбрана
    startButton.disabled = false;
    startButton.textContent = '🚀 Начать';
    startButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

// Начать тренировку
function startTraining() {
    const selectedOperations = [];
    document.querySelectorAll('input[name="operation"]:checked').forEach(checkbox => {
        selectedOperations.push(checkbox.value);
    });

    // Проверка: должна быть выбрана хотя бы одна операция
    if (selectedOperations.length === 0) {
        return;
    }

    state.operations = selectedOperations;
    state.operation = selectedOperations.length === 1 ? selectedOperations[0] : null;

    state.mode = document.querySelector('input[name="mode"]:checked').value;
    if (state.mode === 'specific') {
        state.number = parseInt(document.querySelector('input[name="number"]:checked').value);
    } else {
        state.number = null;
    }
    state.maxExamples = parseInt(document.getElementById('examplesCount').value);

    const trainingMode = document.querySelector('input[name="trainingMode"]:checked').value;
    state.infiniteMode = trainingMode === 'infinite';
    state.quizMode = trainingMode === 'quiz';
    state.timedMode = trainingMode === 'timed';

    state.correctCount = 0;
    state.incorrectCount = 0;
    state.totalCount = 0;
    state.examplesCount = 0;
    state.shownProblems = [];
    state.mistakes = [];

    // Инициализация статистики для достижений
    state.sessionStartTime = new Date();
    state.currentStreak = 0;
    state.voiceExamples = 0;
    state.voiceStreak = 0;
    state.answerTimes = [];
    state.currentMode = trainingMode;
    state.multiplicationExamplesSession = 0;
    state.divisionExamplesSession = 0;
    state.exampleStartTime = null;

    document.getElementById('settings').classList.add('hidden');
    document.getElementById('training').classList.remove('hidden');
    document.getElementById('completionAlert').classList.add('hidden');
    document.getElementById('problemSection').classList.remove('hidden');

    // Режим "На время"
    if (state.timedMode) {
        document.getElementById('timerDisplay').classList.remove('timer-hidden');
        state.infiniteMode = true; // Неограниченное количество примеров
        timeLeft = 60;
        updateTimerDisplay();
        startTimer();
    } else {
        document.getElementById('timerDisplay').classList.add('timer-hidden');
    }

    if (state.quizMode) {
        document.getElementById('normalMode').classList.add('hidden');
        document.getElementById('quizModeSection').classList.remove('hidden');
    } else {
        document.getElementById('normalMode').classList.remove('hidden');
        document.getElementById('quizModeSection').classList.add('hidden');
    }

    generateProblem();
    updateStats();
}

// Генерация примера
function generateProblem() {
    let a, b, problem, answer;

    // Сбросить переменные свайпа и флаг ошибки
    isDragging = false;
    isErrorShowing = false;
    
    // Записываем время начала примера для отслеживания скорости ответа
    state.exampleStartTime = new Date();

    let currentOperation;

    // Определяем текущую операцию
    if (state.operations.length === 1) {
        currentOperation = state.operations[0];
    } else {
        // Если выбраны обе операции, выбираем случайно
        currentOperation = Math.random() < 0.5 ? 'multiplication' : 'division';
    }

    if (state.mode === 'specific') {
        a = state.number;
        b = Math.floor(Math.random() * 10) + 1;
    } else {
        a = Math.floor(Math.random() * 10) + 1;
        b = Math.floor(Math.random() * 10) + 1;
    }

    if (currentOperation === 'multiplication') {
        problem = `${a} × ${b}`;
        answer = a * b;
    } else {
        const dividend = a * b;
        problem = `${dividend} ÷ ${b}`;
        answer = a;
    }

    state.currentProblem = problem;
    state.currentAnswer = answer;

    document.getElementById('problem').textContent = `${problem} = ?`;
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.classList.add('hidden');
    errorAlert.classList.remove('swiped');
    errorAlert.style.transform = '';
    errorAlert.style.opacity = '';

    if (state.quizMode) {
        generateQuizOptions(answer);
    } else {
        document.getElementById('answerInput').value = '';
        updateVoiceSubmitButton(false); // Сбрасываем кнопку на микрофон
    }
}

// Генерация вариантов для викторины
function generateQuizOptions(correctAnswer) {
    const options = [correctAnswer];

    while (options.length < 4) {
        const offset = Math.floor(Math.random() * 11) - 5;
        if (offset === 0) continue;

        const incorrect = correctAnswer + offset;
        if (incorrect > 0 && !options.includes(incorrect)) {
            options.push(incorrect);
        }
    }

    // Перемешать
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }

    const quizOptionsDiv = document.getElementById('quizOptions');
    quizOptionsDiv.innerHTML = '';

    options.forEach(option => {
        const button = document.createElement('button');
        button.className = 'quiz-option';
        button.textContent = option;
        button.dataset.value = option;
        button.onclick = () => checkAnswer(option, button);
        quizOptionsDiv.appendChild(button);
    });
}

// Закрыть ошибку и перейти к следующему примеру
function closeErrorAndNext(event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    if (errorTimer) {
        clearTimeout(errorTimer);
        errorTimer = null;
    }
    isErrorShowing = false;
    const errorAlert = document.getElementById('errorAlert');
    errorAlert.classList.add('hidden');
    errorAlert.classList.remove('swiped');
    errorAlert.style.transform = '';
    errorAlert.style.opacity = '';
    generateProblem();
}

// Проверка ответа
function checkAnswer(userAnswer = null, clickedButton = null, isVoice = false) {
    // Если показан алрет ошибки, блокируем выбор ответа
    if (isErrorShowing) {
        return;
    }

    if (userAnswer === null) {
        userAnswer = parseInt(document.getElementById('answerInput').value);
    }

    state.totalCount++;

    // Отслеживаем время ответа
    if (state.exampleStartTime) {
        const answerTime = (new Date() - state.exampleStartTime) / 1000;
        state.answerTimes.push(answerTime);
    }

    if (userAnswer === state.currentAnswer) {
        state.correctCount++;
        state.examplesCount++;
        
        // Обновляем статистику для достижений
        const stats = achievementData.stats;
        stats.totalCorrect++;
        
        // Добавляем правильный ответ в историю для скользящей точности
        stats.recentAnswers.push({correct: true, timestamp: Date.now()});
        // Ограничиваем историю последними 100 ответами
        if (stats.recentAnswers.length > 100) {
            stats.recentAnswers.shift();
        }
        
        // Рассчитываем скользящую точность (последние 100 ответов)
        if (stats.recentAnswers.length > 0) {
            const recentCorrect = stats.recentAnswers.filter(a => a.correct).length;
            stats.overallAccuracy = Math.round((recentCorrect / stats.recentAnswers.length) * 100);
        }
        
        state.currentStreak++;
        
        // Проверяем текущую операцию
        if (state.currentProblem.includes('×')) {
            state.multiplicationExamplesSession++;
            stats.multiplicationExamples++;
            stats.multiplicationStreak++;
            stats.divisionStreak = 0;
        } else if (state.currentProblem.includes('÷')) {
            state.divisionExamplesSession++;
            stats.divisionExamples++;
            stats.divisionStreak++;
            stats.multiplicationStreak = 0;
        }
        
        // Голосовой ввод
        if (isVoice) {
            state.voiceExamples++;
            state.voiceStreak++;
            stats.voiceExamples++;
        }
        
        // Проверяем достижения после правильного ответа
        const sessionStats = {
            examplesCount: state.examplesCount,
            currentStreak: state.currentStreak,
            voiceExamples: state.voiceExamples,
            voiceStreak: state.voiceStreak,
            avgAnswerTime: state.answerTimes.length > 0 
                ? state.answerTimes.reduce((a, b) => a + b) / state.answerTimes.length 
                : 0,
            totalAnswers: state.totalCount,
            multiplicationExamples: state.multiplicationExamplesSession,
            divisionExamples: state.divisionExamplesSession,
            mode: state.currentMode,
            duration: (new Date() - state.sessionStartTime) / 60, // в минутах
            hour: new Date().getHours()
        };
        checkAchievements(sessionStats);

        // Если режим викторины и нажата кнопка, подсветить её зеленым
        if (state.quizMode && clickedButton) {
            clickedButton.classList.add('correct');
            updateStats(); // Обновляем статистику
            // Через 0.5 сек перейти к следующему примеру
            setTimeout(() => {
                generateProblem();
            }, 500);
            return;
        }

        // Удалить из ошибок если был
        const mistakeIndex = state.mistakes.indexOf(state.currentProblem);
        if (mistakeIndex > -1) {
            state.mistakes.splice(mistakeIndex, 1);
        }

        // Проверить завершение
        if (!state.infiniteMode && state.examplesCount >= state.maxExamples) {
            showCompletion();
            return;
        }

        generateProblem();
    } else {
        state.incorrectCount++;

        // Обновляем статистику для достижений
        const stats = achievementData.stats;
        stats.totalIncorrect++;
        state.currentStreak = 0;
        state.voiceStreak = 0;
        stats.multiplicationStreak = 0;
        stats.divisionStreak = 0;

        // Сохраняем статистику
        stats.totalExamples++;
        
        // Добавляем неправильный ответ в историю для скользящей точности
        stats.recentAnswers.push({correct: false, timestamp: Date.now()});
        // Ограничиваем историю последними 100 ответами
        if (stats.recentAnswers.length > 100) {
            stats.recentAnswers.shift();
        }
        
        // Рассчитываем скользящую точность (последние 100 ответов)
        if (stats.recentAnswers.length > 0) {
            const recentCorrect = stats.recentAnswers.filter(a => a.correct).length;
            stats.overallAccuracy = Math.round((recentCorrect / stats.recentAnswers.length) * 100);
        }
        
        saveAchievements();

        // Если режим викторины и нажата кнопка, подсветить её красным
        if (state.quizMode && clickedButton) {
            clickedButton.classList.add('incorrect');

            // Найти и подсветить правильную кнопку
            const allButtons = document.querySelectorAll('.quiz-option');
            allButtons.forEach(btn => {
                if (parseInt(btn.dataset.value) === state.currentAnswer) {
                    btn.classList.add('correct');
                }
            });

            updateStats(); // Обновляем статистику
            // Через 1.5 сек перейти к следующему примеру
            setTimeout(() => {
                generateProblem();
            }, 1500);
            return;
        }

        // Установить флаг блокировки
        isErrorShowing = true;

        // Показать правильный ответ
        document.getElementById('errorMessage').innerHTML =
            `❌ Правильный ответ: <strong>${state.currentAnswer}</strong>`;
        document.getElementById('errorAlert').classList.remove('hidden');

        // Добавить в ошибки если нет
        if (!state.mistakes.includes(state.currentProblem)) {
            state.mistakes.push(state.currentProblem);
        }

        // Очистить предыдущий таймер если есть
        if (errorTimer) {
            clearTimeout(errorTimer);
        }

        // Показать ошибку на 3 секунды, затем перейти к следующему примеру
        errorTimer = setTimeout(() => {
            isErrorShowing = false;
            document.getElementById('errorAlert').classList.add('hidden');
            generateProblem();
        }, 3000);
    }

    // Правильный ответ в режиме с клавиатурой - очищаем поле ввода
    if (!state.quizMode && clickedButton === null && userAnswer === state.currentAnswer) {
        document.getElementById('answerInput').value = '';
        updateVoiceSubmitButton(false);
    }

    updateStats();
}

// Обновить статистику
function updateStats() {
    document.getElementById('correctCount').textContent = state.correctCount;
    document.getElementById('incorrectCount').textContent = state.incorrectCount;
    document.getElementById('totalCount').textContent = state.totalCount;
}

// Показать завершение
function showCompletion() {
    document.getElementById('problemSection').classList.add('hidden');
    document.getElementById('completionAlert').classList.remove('hidden');

    document.getElementById('finalExamples').textContent = state.examplesCount;
    document.getElementById('finalCorrect').textContent = state.correctCount;
    document.getElementById('finalIncorrect').textContent = state.incorrectCount;
    document.getElementById('finalTotal').textContent = state.totalCount;
    
    // Обновляем общую статистику после сессии
    const stats = achievementData.stats;
    stats.sessions++;
    stats.totalExamples += state.totalCount;
    
    // Обновляем дневную статистику
    const today = new Date().toDateString();
    if (stats.lastDailyDate !== today) {
        stats.dailyExamples = state.totalCount;
        stats.lastDailyDate = today;
    } else {
        stats.dailyExamples += state.totalCount;
    }
    
    // Проверяем серию дней
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (stats.lastTrainingDate === yesterday.toDateString()) {
        stats.streakDays++;
    } else if (stats.lastTrainingDate !== today) {
        stats.streakDays = 1;
    }
    stats.lastTrainingDate = new Date().toDateString();
    
    // Проверка на 100% точность в викторине
    if (state.currentMode === 'quiz' && state.totalCount === state.correctCount) {
        stats.perfectQuizzes++;
        stats.quizWins++;
    }
    
    // Финальная проверка достижений
    const sessionStats = {
        examplesCount: state.examplesCount,
        currentStreak: state.currentStreak,
        voiceExamples: state.voiceExamples,
        voiceStreak: state.voiceStreak,
        avgAnswerTime: state.answerTimes.length > 0 
            ? state.answerTimes.reduce((a, b) => a + b) / state.answerTimes.length 
            : 0,
        totalAnswers: state.totalCount,
        accuracy: state.totalCount > 0 ? Math.min(100, Math.round((state.correctCount / state.totalCount) * 100)) : 0,
        multiplicationExamples: state.multiplicationExamplesSession,
        divisionExamples: state.divisionExamplesSession,
        mode: state.currentMode,
        duration: (new Date() - state.sessionStartTime) / 60, // в минутах
        hour: new Date().getHours()
    };
    checkAchievements(sessionStats);
    saveAchievements();
}

// Функции таймера для режима "На время"
function startTimer() {
    if (gameTimer) {
        clearInterval(gameTimer);
    }
    gameTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.textContent = timeLeft;

    // Меняем цвет в зависимости от времени
    timerDisplay.classList.remove('warning', 'danger');
    if (timeLeft <= 10) {
        timerDisplay.classList.add('danger');
    } else if (timeLeft <= 20) {
        timerDisplay.classList.add('warning');
    }
}

function endGame() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }

    // Показать завершение
    document.getElementById('problemSection').classList.add('hidden');
    document.getElementById('completionAlert').classList.remove('hidden');
    document.getElementById('timerDisplay').classList.add('timer-hidden');

    document.getElementById('finalExamples').textContent = state.totalCount;
    document.getElementById('finalCorrect').textContent = state.correctCount;
    document.getElementById('finalIncorrect').textContent = state.incorrectCount;
    document.getElementById('finalTotal').textContent = state.totalCount;
}

// Функции числовой клавиатуры
function addDigit(digit) {
    const input = document.getElementById('answerInput');
    const currentValue = input.value;

    // Если в режиме прослушивания, останавливаем его
    if (isListening && recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Ошибка остановки распознавания:', error);
        }
    }

    // Ограничить длину до 3 цифр (максимум 100)
    if (currentValue.length < 3) {
        const newValue = currentValue + digit;
        input.value = newValue;
        // Заменяем микрофон на кнопку отправки
        updateVoiceSubmitButton(true);
    }
}

function clearInput() {
    const input = document.getElementById('answerInput');
    const currentValue = input.value;

    // Если в режиме прослушивания, останавливаем его
    if (isListening && recognition) {
        try {
            recognition.stop();
        } catch (error) {
            console.error('Ошибка остановки распознавания:', error);
        }
    }

    // Удалить последнюю цифру
    if (currentValue.length > 0) {
        const newValue = currentValue.slice(0, -1);
        input.value = newValue;
    }

    // Если поле пустое, возвращаем микрофон
    if (input.value.length === 0) {
        updateVoiceSubmitButton(false);
    }
}

// Обновление кнопки микрофон/отправка
function updateVoiceSubmitButton(hasInput) {
    const voiceBtn = document.getElementById('voiceBtn');
    if (!voiceBtn) return;

    if (hasInput) {
        // Показать кнопку отправки
        voiceBtn.innerHTML = '✓';
        // Удаляем все inline event handlers
        voiceBtn.removeAttribute('onmousedown');
        voiceBtn.removeAttribute('onmouseup');
        voiceBtn.removeAttribute('onmouseleave');
        voiceBtn.removeAttribute('ontouchstart');
        voiceBtn.removeAttribute('ontouchend');
        voiceBtn.onmousedown = null;
        voiceBtn.onmouseup = null;
        voiceBtn.onmouseleave = null;
        voiceBtn.ontouchstart = null;
        voiceBtn.ontouchend = null;
        voiceBtn.onclick = function() {
            const inputValue = parseInt(document.getElementById('answerInput').value);
            checkAnswer(inputValue);
        };
        voiceBtn.classList.remove('voice-btn');
        voiceBtn.classList.add('submit-btn');
    } else {
        // Показать кнопку микрофона
        voiceBtn.innerHTML = '🎤';
        voiceBtn.onclick = null;
        voiceBtn.onmousedown = startVoiceHold;
        voiceBtn.onmouseup = stopVoiceHold;
        voiceBtn.onmouseleave = stopVoiceHold;
        voiceBtn.ontouchstart = startVoiceHold;
        voiceBtn.ontouchend = stopVoiceHold;
        voiceBtn.classList.remove('submit-btn');
        voiceBtn.classList.add('voice-btn');
    }
}

// Сброс - на главный экран
function showSettings() {
    if (gameTimer) {
        clearInterval(gameTimer);
        gameTimer = null;
    }
    document.getElementById('settings').classList.remove('hidden');
    document.getElementById('achievements').classList.add('hidden');
    document.getElementById('training').classList.add('hidden');
    document.getElementById('timerDisplay').classList.add('timer-hidden');
}

function resetTraining() {
    showSettings();
}

// Обработка свайпа для алрета ошибки
const errorAlert = document.getElementById('errorAlert');
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let touchCurrentY = 0;
let isDragging = false;
const swipeThreshold = 100; // Порог для свайпа

// Touch события
errorAlert.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    lastTouchStartTime = Date.now();
    isDragging = true;
    errorAlert.classList.add('dragging');
    errorAlert.classList.remove('swiped');
}, { passive: true });

errorAlert.addEventListener('touchmove', function(e) {
    if (!isDragging) return;
    touchCurrentX = e.touches[0].clientX;
    touchCurrentY = e.touches[0].clientY;
    const diff = touchCurrentY - touchStartY;

    // Только свайп вверх
    if (diff < 0) {
        errorAlert.style.transform = `translateY(${diff}px)`;
        errorAlert.style.opacity = 1 - Math.abs(diff) / 200;
    }
}, { passive: true });

errorAlert.addEventListener('touchend', function(e) {
    if (!isDragging) return;
    isDragging = false;
    errorAlert.classList.remove('dragging');

    const diffY = touchStartY - touchCurrentY;
    const diffX = Math.abs(touchStartX - touchCurrentX);

    // Если свайп вверх больше порога и нет горизонтального движения, закрываем
    if (diffY > swipeThreshold && diffX < 50) {
        errorAlert.classList.add('swiped');
        setTimeout(() => {
            closeErrorAndNext();
        }, 300);
        return;
    } else {
        // Если это простой клик, закрываем
        const timeDiff = Date.now() - lastTouchStartTime;
        if (timeDiff < 300 && diffY < 10 && diffX < 10) {
            closeErrorAndNext();
            return;
        }
    }

    // Возвращаем на место
    errorAlert.style.transform = 'translateY(0)';
    errorAlert.style.opacity = 1;
});

// Mouse события (для десктопа)
errorAlert.addEventListener('mousedown', function(e) {
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    touchCurrentX = touchStartX;
    touchCurrentY = touchStartY;
    isDragging = true;
    lastMouseStartTime = Date.now();
    errorAlert.classList.add('dragging');
    errorAlert.classList.remove('swiped');
});

document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    touchCurrentX = e.clientX;
    touchCurrentY = e.clientY;
    const diff = touchCurrentY - touchStartY;

    // Только свайп вверх
    if (diff < 0) {
        errorAlert.style.transform = `translateY(${diff}px)`;
        errorAlert.style.opacity = 1 - Math.abs(diff) / 200;
    }
});

document.addEventListener('mouseup', function(e) {
    if (!isDragging) return;
    isDragging = false;
    errorAlert.classList.remove('dragging');

    const diffY = touchStartY - touchCurrentY;
    const diffX = Math.abs(touchStartX - touchCurrentX);

    // Если свайп вверх больше порога и нет горизонтального движения, закрываем
    if (diffY > swipeThreshold && diffX < 50) {
        errorAlert.classList.add('swiped');
        setTimeout(() => {
            closeErrorAndNext();
        }, 300);
        return;
    } else {
        // Если это простой клик, закрываем
        const timeDiff = Date.now() - lastMouseStartTime;
        if (timeDiff < 300 && diffY < 10 && diffX < 10) {
            closeErrorAndNext();
            return;
        }
    }

    // Возвращаем на место
    errorAlert.style.transform = 'translateY(0)';
    errorAlert.style.opacity = 1;
});

// Переменные для отслеживания времени
let lastTouchStartTime = 0;
let lastMouseStartTime = 0;

// Голосовой ввод (Speech Recognition)
let recognition = null;
let isListening = false;
let voiceBtn = null;

// Инициализация распознавания речи
function initSpeechRecognition() {
    voiceBtn = document.getElementById('voiceBtn');

    // Проверяем поддержку браузера
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        // Если не поддерживается, скрываем кнопку
        if (voiceBtn) {
            voiceBtn.classList.add('disabled');
            voiceBtn.disabled = true;
        }
        console.log('Speech Recognition API не поддерживается этим браузером');
        return;
    }

    try {
        recognition = new SpeechRecognition();
        recognition.lang = 'ru-RU';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

    recognition.onstart = function() {
        isListening = true;
        // Визуальные эффекты уже добавлены в startVoiceHold
    };

    recognition.onend = function() {
        isListening = false;

        // Очищаем волны
        const waveContainer = document.getElementById('waveContainer');
        if (waveContainer) {
            waveContainer.innerHTML = '';
        }

        // Убираем визуальные эффекты
        if (voiceBtn) {
            voiceBtn.classList.remove('listening');
            voiceBtn.innerHTML = '🎤';
        }

        // Убираем класс listening с поля ввода
        const answerInput = document.getElementById('answerInput');
        if (answerInput) {
            answerInput.classList.remove('listening');
        }

        // Если поле пустое, возвращаем микрофон вместо кнопки отправки
        updateVoiceSubmitButton(answerInput.value.length > 0);
    };

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            const confidence = event.results[0][0].confidence;

            console.log('Распознано:', transcript, 'Уверенность:', confidence);

            // Извлекаем число из текста
            const number = extractNumberFromText(transcript);

            if (number !== null) {
                document.getElementById('answerInput').value = number;
                // Сразу проверяем ответ при голосовом вводе
                setTimeout(() => {
                    checkAnswer(number);
                }, 100);
                console.log('Распознано число:', number, '- проверка ответа');
            } else {
                console.log('Число не найдено в:', transcript);
            }
        };

        recognition.onerror = function(event) {
            console.error('Ошибка распознавания:', event.error);

            isListening = false;

            // Очищаем волны
            const waveContainer = document.getElementById('waveContainer');
            if (waveContainer) {
                waveContainer.innerHTML = '';
            }

            // Убираем визуальные эффекты
            if (voiceBtn) {
                voiceBtn.classList.remove('listening');
                voiceBtn.innerHTML = '🎤';
            }

            const answerInput = document.getElementById('answerInput');
            if (answerInput) {
                answerInput.classList.remove('listening');
            }

            // Показать сообщение об ошибке
            if (event.error === 'not-allowed') {
                alert('Для голосового ввода необходимо разрешить доступ к микрофону');
            } else if (event.error === 'no-speech') {
                console.log('Речь не обнаружена');
            }
        };

    } catch (error) {
        console.error('Ошибка инициализации распознавания речи:', error);
        if (voiceBtn) {
            voiceBtn.classList.add('disabled');
            voiceBtn.disabled = true;
        }
    }
}

// Извлечение числа из текста
function extractNumberFromText(text) {
    // Словесные цифры и их числовые значения
    const wordNumbers = {
        'ноль': 0, 'один': 1, 'два': 2, 'три': 3, 'четыре': 4, 'пять': 5,
        'шесть': 6, 'семь': 7, 'восемь': 8, 'девять': 9, 'десять': 10,
        'одинадцать': 11, 'двенадцать': 12, 'тринадцать': 13, 'четырнадцать': 14,
        'пятнадцать': 15, 'шестнадцать': 16, 'семнадцать': 17, 'восемнадцать': 18,
        'девятнадцать': 19, 'двадцать': 20, 'тридцать': 30, 'сорок': 40,
        'пятьдесят': 50, 'шестьдесят': 60, 'семьдесят': 70, 'восемьдесят': 80,
        'девяносто': 90, 'сто': 100
    };

    text = text.toLowerCase().trim();

    // Сначала проверяем, есть ли сразу число в тексте
    const numberMatch = text.match(/\d+/);
    if (numberMatch) {
        const num = parseInt(numberMatch[0]);
        if (num >= 0 && num <= 100) {
            return num;
        }
    }

    // Проверяем словесные числа
    for (const [word, value] of Object.entries(wordNumbers)) {
        if (text.includes(word)) {
            return value;
        }
    }

    // Если ничего не нашли, возвращаем null
    return null;
}

// Создание волн
function createWaves() {
    const waveContainer = document.getElementById('waveContainer');
    if (!waveContainer) return;

    // Очищаем предыдущие волны
    waveContainer.innerHTML = '';

    // Создаём 3 волны
    for (let i = 0; i < 3; i++) {
        const wave = document.createElement('div');
        wave.className = 'wave';
        waveContainer.appendChild(wave);
    }
}

// Начать удержание микрофона
function startVoiceHold() {
    if (!recognition) {
        console.log('Speech Recognition не инициализирован');
        return;
    }

    if (isListening) {
        return; // Уже слушаем
    }

    // Создаём волны на кнопке
    createWaves();

    // Добавляем классы для визуальных эффектов
    if (voiceBtn) {
        voiceBtn.classList.add('listening');
        voiceBtn.innerHTML = '🔴';
    }

    const answerInput = document.getElementById('answerInput');
    if (answerInput) {
        answerInput.classList.add('listening');
        // Очищаем поле для отображения звуковой волны
        answerInput.value = '';
    }

    // Показываем звуковую волну в поле ввода
    const audioWave = document.getElementById('audioWave');
    if (audioWave) {
        audioWave.classList.remove('hidden');
    }

    // Начинаем распознавание
    try {
        recognition.start();
    } catch (error) {
        console.error('Ошибка запуска распознавания:', error);
        stopVoiceHold();
    }
}

// Остановить удержание микрофона
function stopVoiceHold() {
    if (!recognition || !isListening) {
        return;
    }

    // Скрываем звуковую волну в поле ввода
    const audioWave = document.getElementById('audioWave');
    if (audioWave) {
        audioWave.classList.add('hidden');
    }

    try {
        recognition.stop();
    } catch (error) {
        console.error('Ошибка остановки распознавания:', error);
    }
}

// Инициализация
initTheme();
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

// Инициализация валидации
validateOperations();

// Инициализация распознавания речи
initSpeechRecognition();

// ==================== СИСТЕМА ДОСТИЖЕНИЙ ====================

// Определения всех достижений
const ACHIEVEMENTS = {
    // Режим "По количеству"
    'first_ten': {
        id: 'first_ten',
        name: 'Первая десятка',
        description: 'Реши первые 10 примеров',
        icon: '🎯',
        category: 'quant',
        condition: (stats) => stats.totalExamples >= 10
    },
    'fifty_examples': {
        id: 'fifty_examples',
        name: 'Полёт нормальный',
        description: 'Реши 50 примеров за одну сессию',
        icon: '🏆',
        category: 'quant',
        condition: (stats, session) => session.examplesCount >= 50
    },
    'hundred_examples': {
        id: 'hundred_examples',
        name: 'Марафонец',
        description: 'Реши 100 примеров за одну сессию',
        icon: '🚀',
        category: 'quant',
        condition: (stats, session) => session.examplesCount >= 100
    },
    'perfect_ten': {
        id: 'perfect_ten',
        name: 'Безупречно',
        description: 'Реши 10 примеров подряд без ошибок',
        icon: '⭐',
        category: 'quant',
        condition: (stats, session) => session.currentStreak >= 10
    },
    'perfect_session': {
        id: 'perfect_session',
        name: 'Гимназист',
        description: 'Пройди сессию с точностью 100%',
        icon: '💎',
        category: 'quant',
        condition: (stats, session) => session.accuracy === 100
    },
    'speed_session': {
        id: 'speed_session',
        name: 'Стремительный',
        description: 'Реши 20 примеров за сессию быстрее, чем за 5 минут',
        icon: '🌟',
        category: 'quant',
        condition: (stats, session) => session.examplesCount >= 20 && session.duration < 300
    },

    // Режим "Бесконечный"
    'endless_30': {
        id: 'endless_30',
        name: 'Неутомимый',
        description: 'Реши 30 примеров за одну сессию',
        icon: '🔄',
        category: 'infinite',
        condition: (stats, session) => session.examplesCount >= 30 && session.mode === 'infinite'
    },
    'fast_answers': {
        id: 'fast_answers',
        name: 'На скорости',
        description: 'Среднее время ответа < 3 секунды',
        icon: '⚡',
        category: 'infinite',
        condition: (stats, session) => session.avgAnswerTime < 3 && session.totalAnswers > 10
    },
    'fire_streak': {
        id: 'fire_streak',
        name: 'Горячая серия',
        description: '20 правильных ответов подряд',
        icon: '🔥',
        category: 'combo',
        condition: (stats, session) => session.currentStreak >= 20
    },
    'enthusiast': {
        id: 'enthusiast',
        name: 'Энтузиаст',
        description: 'Реши 100 примеров за один день',
        icon: '🎪',
        category: 'combo',
        condition: (stats, session) => stats.dailyExamples >= 100
    },
    'sprinter': {
        id: 'sprinter',
        name: 'Спринтер',
        description: 'Реши 50 примеров быстрее, чем за 10 минут',
        icon: '🏃',
        category: 'infinite',
        condition: (stats, session) => session.examplesCount >= 50 && session.duration < 600
    },

    // Режим "Викторина"
    'expert': {
        id: 'expert',
        name: 'Знаток',
        description: 'Реши 10 викторин подряд',
        icon: '🎓',
        category: 'quiz',
        condition: (stats, session) => session.quizWins >= 10 && session.mode === 'quiz'
    },
    'intuitive': {
        id: 'intuitive',
        name: 'Интуитив',
        description: '5 правильных ответов подряд без ошибок',
        icon: '🎲',
        category: 'quiz',
        condition: (stats, session) => session.currentStreak >= 5 && session.mode === 'quiz'
    },
    'champion': {
        id: 'champion',
        name: 'Чемпион',
        description: 'Пройди 5 викторин со 100% точностью',
        icon: '👑',
        category: 'quiz',
        condition: (stats, session) => stats.perfectQuizzes >= 5
    },
    'quick_mind': {
        id: 'quick_mind',
        name: 'Быстрый разум',
        description: 'Среднее время ответа в викторине < 2 секунды',
        icon: '🧠',
        category: 'quiz',
        condition: (stats, session) => session.avgAnswerTime < 2 && session.mode === 'quiz' && session.totalAnswers > 10
    },

    // Режим "На время"
    'start_rush': {
        id: 'start_rush',
        name: 'Стартовый рывок',
        description: 'Реши первые 5 примеров за 60 секунд',
        icon: '⏱️',
        category: 'timed',
        condition: (stats, session) => session.examplesCount >= 5 && session.mode === 'timed'
    },
    'timed_15': {
        id: 'timed_15',
        name: 'Блиц',
        description: 'Реши 15 примеров за 60 секунд',
        icon: '🚀',
        category: 'timed',
        condition: (stats, session) => session.examplesCount >= 15 && session.mode === 'timed'
    },
    'timed_20': {
        id: 'timed_20',
        name: 'Молния',
        description: 'Реши 20 примеров за 60 секунд',
        icon: '⚡',
        category: 'timed',
        condition: (stats, session) => session.examplesCount >= 20 && session.mode === 'timed'
    },
    'cosmic_speed': {
        id: 'cosmic_speed',
        name: 'Космическая скорость',
        description: 'Реши 25+ примеров за 60 секунд',
        icon: '💫',
        category: 'timed',
        condition: (stats, session) => session.examplesCount >= 25 && session.mode === 'timed'
    },
    'sniper': {
        id: 'sniper',
        name: 'Снайпер',
        description: 'Реши 10 примеров за 60 секунд с точностью 100%',
        icon: '🎯',
        category: 'timed',
        condition: (stats, session) => session.examplesCount >= 10 && session.accuracy === 100 && session.mode === 'timed'
    },

    // Умножение
    'mult_table_2': {
        id: 'mult_table_2',
        name: 'Таблица ×2',
        description: 'Реши все примеры на 2 без ошибок',
        icon: '🔷',
        category: 'multiplication',
        condition: (stats) => stats.multiplicationTablesCompleted.includes(2)
    },
    'mult_table_5': {
        id: 'mult_table_5',
        name: 'Таблица ×5',
        description: 'Реши все примеры на 5 без ошибок',
        icon: '🔷',
        category: 'multiplication',
        condition: (stats) => stats.multiplicationTablesCompleted.includes(5)
    },
    'mult_table_10': {
        id: 'mult_table_10',
        name: 'Таблица ×10',
        description: 'Реши все примеры на 10 без ошибок',
        icon: '🔷',
        category: 'multiplication',
        condition: (stats) => stats.multiplicationTablesCompleted.includes(10)
    },
    'mult_ace': {
        id: 'mult_ace',
        name: 'Ас умножения',
        description: 'Реши 50 примеров на умножение',
        icon: '💠',
        category: 'multiplication',
        condition: (stats) => stats.multiplicationExamples >= 50
    },
    'precise_calc': {
        id: 'precise_calc',
        name: 'Точный расчёт',
        description: '50 примеров на умножение подряд без ошибок',
        icon: '🎯',
        category: 'multiplication',
        condition: (stats) => stats.multiplicationStreak >= 50
    },

    // Деление
    'div_table_2': {
        id: 'div_table_2',
        name: 'Магия ÷2',
        description: 'Решивсе примеры на деление на 2 без ошибок',
        icon: '🔹',
        category: 'division',
        condition: (stats) => stats.divisionTablesCompleted.includes(2)
    },
    'div_table_10': {
        id: 'div_table_10',
        name: 'Магия ÷10',
        description: 'Реши все примеры на деление на 10 без ошибок',
        icon: '🔹',
        category: 'division',
        condition: (stats) => stats.divisionTablesCompleted.includes(10)
    },
    'div_virtuoso': {
        id: 'div_virtuoso',
        name: 'Виртуоз деления',
        description: 'Реши 100 примеров на деление за сессию',
        icon: '🟦',
        category: 'division',
        condition: (stats, session) => session.divisionExamples >= 100
    },

    // Регулярность
    'streak_3': {
        id: 'streak_3',
        name: 'Тренированный',
        description: 'Реши примеры 3 дня подряд',
        icon: '📅',
        category: 'streak',
        condition: (stats) => stats.streakDays >= 3
    },
    'streak_7': {
        id: 'streak_7',
        name: 'Неделя усердия',
        description: 'Тренируйся 7 дней подряд',
        icon: '🗓️',
        category: 'streak',
        condition: (stats) => stats.streakDays >= 7
    },
    'night_owl': {
        id: 'night_owl',
        name: 'Ночная сова',
        description: 'Реши сессию между 22:00-06:00',
        icon: '🌙',
        category: 'streak',
        condition: (stats, session) => session.hour >= 22 || session.hour < 6
    },
    'early_bird': {
        id: 'early_bird',
        name: 'Ранний пёс',
        description: 'Реши сессию между 06:00-09:00',
        icon: '☀️',
        category: 'streak',
        condition: (stats, session) => session.hour >= 6 && session.hour < 9
    },

    // Совершенство
    'perfect_six': {
        id: 'perfect_six',
        name: 'Шесть баллов',
        description: 'Точность 100% в сессии от 10 примеров',
        icon: '💯',
        category: 'perfection',
        condition: (stats, session) => session.accuracy === 100 && session.totalAnswers >= 10
    },
    'excellent': {
        id: 'excellent',
        name: 'Отличник',
        description: 'Достигни общей точности 95%',
        icon: '🎖️',
        category: 'perfection',
        condition: (stats) => stats.overallAccuracy >= 95
    },
    'master': {
        id: 'master',
        name: 'Мастер',
        description: 'Реши 1000 примеров всего',
        icon: '🏅',
        category: 'perfection',
        condition: (stats) => stats.totalExamples >= 1000
    },
    'great_mathematician': {
        id: 'great_mathematician',
        name: 'Великий математик',
        description: 'Реши 5000 примеров всего',
        icon: '👑',
        category: 'perfection',
        condition: (stats) => stats.totalExamples >= 5000
    },

    // Голосовой ввод
    'voice_talker': {
        id: 'voice_talker',
        name: 'Говорун',
        description: 'Реши 50 примеров голосовым вводом',
        icon: '🎤',
        category: 'voice',
        condition: (stats) => stats.voiceExamples >= 50
    },
    'voice_pure': {
        id: 'voice_pure',
        name: 'Чистое звучание',
        description: '10 правильных ответов подряд голосом',
        icon: '🎙️',
        category: 'voice',
        condition: (stats, session) => session.voiceStreak >= 10
    },
    'voice_orator': {
        id: 'voice_orator',
        name: 'Оратор',
        description: 'Реши сессию полностью голосом (20+ примеров)',
        icon: '📣',
        category: 'voice',
        condition: (stats, session) => session.voiceExamples >= 20 && session.examplesCount === session.voiceExamples
    }
};

// Хранилище достижений
let achievementData = {
    achievements: {},
    stats: {
        totalExamples: 0,
        totalCorrect: 0,
        totalIncorrect: 0,
        voiceExamples: 0,
        sessions: 0,
        streakDays: 0,
        lastTrainingDate: null,
        overallAccuracy: 0,
        dailyExamples: 0,
        lastDailyDate: null,
        multiplicationExamples: 0,
        divisionExamples: 0,
        multiplicationStreak: 0,
        divisionStreak: 0,
        multiplicationTablesCompleted: [],
        divisionTablesCompleted: [],
        perfectQuizzes: 0,
        quizWins: 0,
        // История последних 100 ответов для скользящей точности
        recentAnswers: [] // массив объектов {correct: boolean, timestamp: number}
    }
};

// Загрузка достижений из localStorage
function loadAchievements() {
    const saved = localStorage.getItem('mathTrainerAchievements');
    if (saved) {
        try {
            achievementData = JSON.parse(saved);
            // Убеждаемся, что recentAnswers существует
            if (!achievementData.stats.recentAnswers) {
                achievementData.stats.recentAnswers = [];
            }
        } catch (e) {
            console.error('Ошибка загрузки достижений:', e);
        }
    }
}

// Сохранение достижений в localStorage
function saveAchievements() {
    localStorage.setItem('mathTrainerAchievements', JSON.stringify(achievementData));
}

// Проверка и разблокировка достижений
function checkAchievements(sessionStats = null) {
    const stats = achievementData.stats;
    const unlocked = [];
    let notificationTimeout = null;

    Object.values(ACHIEVEMENTS).forEach(achievement => {
        // Если уже разблокировано, пропускаем
        if (achievementData.achievements[achievement.id]?.unlocked) {
            return;
        }

        // Проверяем условие
        if (achievement.condition(stats, sessionStats)) {
            // Разблокируем достижение
            achievementData.achievements[achievement.id] = {
                unlocked: true,
                unlockedAt: new Date().toISOString()
            };
            unlocked.push(achievement);
        }
    });

    // Сохраняем если есть новые достижения
    if (unlocked.length > 0) {
        saveAchievements();
        // Показываем уведомления с задержкой
        unlocked.forEach((achievement, index) => {
            setTimeout(() => {
                showAchievementNotification(achievement);
                createConfetti();
            }, index * 2000);
        });
    }
}

// Показать уведомление о достижении
function showAchievementNotification(achievement) {
    const notification = document.getElementById('achievementNotification');
    const iconEl = document.getElementById('achievementIcon');
    const nameEl = document.getElementById('achievementName');

    iconEl.textContent = achievement.icon;
    nameEl.textContent = achievement.name;

    notification.classList.remove('hidden');

    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        hideAchievementNotification();
    }, 5000);
}

// Скрыть уведомление о достижении
function hideAchievementNotification() {
    const notification = document.getElementById('achievementNotification');
    notification.classList.add('slide-out');

    setTimeout(() => {
        notification.classList.remove('slide-out');
        notification.classList.add('hidden');
    }, 500);
}

// Создать confetti эффект
function createConfetti() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ffd700'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDelay = Math.random() * 2 + 's';
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        document.body.appendChild(confetti);

        // Удаляем через 3 секунды
        setTimeout(() => {
            confetti.remove();
        }, 3000);
    }
}

// Показать достижения
function showAchievements() {
    document.getElementById('settings').classList.add('hidden');
    document.getElementById('achievements').classList.remove('hidden');
    document.getElementById('achievements').style.display = 'flex';
    
    loadAchievements();
    renderAchievements('all');
    updateStatsDisplay();
}

// Обновить отображение статистики
function updateStatsDisplay() {
    const stats = achievementData.stats;
    
    document.getElementById('totalExamples').textContent = stats.totalExamples;
    
    // Скользящая точность - последние 100 ответов
    let accuracy = 0;
    if (stats.recentAnswers.length > 0) {
        const recentCorrect = stats.recentAnswers.filter(a => a.correct).length;
        accuracy = Math.round((recentCorrect / stats.recentAnswers.length) * 100);
    }
    document.getElementById('totalAccuracy').textContent = accuracy + '%';
    
    const unlockedCount = Object.values(achievementData.achievements).filter(a => a.unlocked).length;
    const totalCount = Object.keys(ACHIEVEMENTS).length;
    document.getElementById('unlockedAchievements').textContent = `${unlockedCount}/${totalCount}`;
}

// Отобразить достижения по категории
function renderAchievements(category) {
    const grid = document.getElementById('achievementsGrid');
    grid.innerHTML = '';

    // Обновляем активную вкладку
    document.querySelectorAll('.achievement-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.category === category) {
            tab.classList.add('active');
        }
    });

    Object.values(ACHIEVEMENTS).forEach(achievement => {
        if (category !== 'all' && achievement.category !== category) {
            return;
        }

        const isUnlocked = achievementData.achievements[achievement.id]?.unlocked;
        const unlockedAt = achievementData.achievements[achievement.id]?.unlockedAt;

        const card = document.createElement('div');
        card.className = `achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`;
        
        card.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-name">${achievement.name}</div>
            ${isUnlocked && unlockedAt ? 
                `<div class="achievement-date">${new Date(unlockedAt).toLocaleDateString('ru-RU')}</div>` : 
                ''}
        `;

        card.onclick = () => showAchievementDetails(achievement);
        grid.appendChild(card);
    });
}

// Показать категорию достижений
function showAchievementCategory(category) {
    renderAchievements(category);
}

// Показать детали достижения в модальном окне
function showAchievementDetails(achievement) {
    const isUnlocked = achievementData.achievements[achievement.id]?.unlocked;
    const unlockedAt = achievementData.achievements[achievement.id]?.unlockedAt;
    
    const modalOverlay = document.getElementById('achievementModalOverlay');
    const modalIcon = document.getElementById('modalIcon');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalStatus = document.getElementById('modalStatus');
    const modalDate = document.getElementById('modalDate');
    
    modalIcon.textContent = achievement.icon;
    modalTitle.textContent = achievement.name;
    modalDescription.textContent = achievement.description;
    
    if (isUnlocked) {
        modalStatus.textContent = '✅ Разблокировано';
        modalStatus.className = 'modal-status unlocked';
        if (unlockedAt) {
            modalDate.textContent = `Получено: ${new Date(unlockedAt).toLocaleDateString('ru-RU')} ${new Date(unlockedAt).toLocaleTimeString('ru-RU')}`;
            modalDate.style.display = 'block';
        } else {
            modalDate.style.display = 'none';
        }
    } else {
        modalStatus.textContent = '🔒 Заблокировано';
        modalStatus.className = 'modal-status locked';
        modalDate.style.display = 'none';
    }
    
    modalOverlay.classList.add('active');
}

// Закрыть модальное окно
function closeAchievementModal() {
    const modalOverlay = document.getElementById('achievementModalOverlay');
    modalOverlay.classList.remove('active');
}

// Обновить статистику после тренировки
function updateTrainingSessionStats(sessionData) {
    const stats = achievementData.stats;
}

// Инициализация достижений при загрузке
loadAchievements();
