'use strict';

const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
const screen = document.getElementById('screen');
const pageTitle = document.getElementById('pageTitle');
const pageSubtitle = document.getElementById('pageSubtitle');
const stepCounter = document.getElementById('stepCounter');
const progressFill = document.getElementById('progressFill');
const localNote = document.getElementById('localNote');

const LANGUAGES = [
  { id: 'Английский', icon: '🇬🇧', detail: 'Для учёбы, работы и путешествий' },
  { id: 'Немецкий', icon: '🇩🇪', detail: 'Грамматика и разговорная практика' },
  { id: 'Французский', icon: '🇫🇷', detail: 'Красивое произношение и общение' },
  { id: 'Испанский', icon: '🇪🇸', detail: 'Язык путешествий и общения' },
  { id: 'Китайский', icon: '🇨🇳', detail: 'Иероглифы и основы речи' },
  { id: 'Японский', icon: '🇯🇵', detail: 'Лексика, письмо и разговорная речь' }
];

// Демонстрационный список преподавателей. Его можно заменить на актуальный список.
// Демонстрационные цены в рублях за одно занятие.
// При необходимости замените суммы здесь и в PRICES_RUB в bot.py.
const PRICES_RUB = {
  'Английский': { 30: 450, 45: 650, 60: 850, 90: 1200 },
  'Немецкий':    { 30: 500, 45: 700, 60: 900, 90: 1300 },
  'Французский': { 30: 550, 45: 750, 60: 1000, 90: 1450 },
  'Испанский':   { 30: 450, 45: 650, 60: 850, 90: 1200 },
  'Китайский':   { 30: 650, 45: 900, 60: 1200, 90: 1750 },
  'Японский':    { 30: 650, 45: 900, 60: 1200, 90: 1750 }
};

const TEACHERS = [
  { name: 'Анна Смирнова', language: 'Английский', detail: 'Разговорный английский · 5 лет опыта', avatar: '👩🏻‍🏫' },
  { name: 'Марк Уилсон', language: 'Английский', detail: 'Английский для учёбы и работы · 7 лет опыта', avatar: '👨🏼‍🏫' },
  { name: 'Иван Волков', language: 'Немецкий', detail: 'Общий немецкий · 4 года опыта', avatar: '👨🏻‍🏫' },
  { name: 'Елена Морозова', language: 'Французский', detail: 'Французский с нуля · 6 лет опыта', avatar: '👩🏼‍🏫' },
  { name: 'Дмитрий Орлов', language: 'Испанский', detail: 'Разговорная практика · 5 лет опыта', avatar: '👨🏻‍🏫' },
  { name: 'Ли Вэй', language: 'Китайский', detail: 'Китайский для начинающих · 8 лет опыта', avatar: '👨🏻‍🏫' },
  { name: 'Юки Сато', language: 'Японский', detail: 'Японский язык и культура · 6 лет опыта', avatar: '👩🏻‍🏫' }
];

const state = {
  step: 0,
  name: '',
  language: '',
  lessonsPerWeek: null,
  durationMinutes: null,
  teacher: '',
  accepted: false,
  sent: false
};

const STEP_COPY = [
  ['Начнём знакомство', 'Оставьте заявку на обучение — это займёт всего пару минут.'],
  ['Какой язык изучаем?', 'Выберите иностранный язык, который хотите освоить.'],
  ['Сколько раз в неделю?', 'Укажите желаемую частоту занятий.'],
  ['Продолжительность занятия', 'Выберите удобную длительность одного урока.'],
  ['Выберите преподавателя', 'Для выбранного языка доступны следующие преподаватели.'],
  ['Проверьте заявку', 'Убедитесь, что все данные указаны правильно.']
];

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}

function formatMoney(amount) {
  return `${Number(amount).toLocaleString('ru-RU')} ₽`;
}

function getPricing() {
  const perLesson = PRICES_RUB[state.language]?.[state.durationMinutes];
  if (!perLesson || !state.lessonsPerWeek) {
    throw new Error('Не удалось определить стоимость выбранного занятия.');
  }
  const perWeek = perLesson * state.lessonsPerWeek;
  return { perLesson, perWeek, perFourWeeks: perWeek * 4 };
}

function pricePreviewMarkup() {
  const price = getPricing();
  return `
    <div class="price-preview">
      <div class="price-preview-title">Стоимость выбранного формата</div>
      <div class="price-preview-row"><span>Одно занятие</span><strong>${formatMoney(price.perLesson)}</strong></div>
      <div class="price-preview-row"><span>В неделю (${state.lessonsPerWeek} зан.)</span><strong>${formatMoney(price.perWeek)}</strong></div>
      <div class="price-preview-row price-preview-total"><span>За 4 недели</span><strong>${formatMoney(price.perFourWeeks)}</strong></div>
    </div>`;
}

function updateTelegramMainButton() {
  if (!tg || state.sent) return;
  if (state.step === 5) {
    tg.MainButton.setText('Подтвердить заявку');
    tg.MainButton.show();
    if (state.accepted) tg.MainButton.enable();
    else tg.MainButton.disable();
  } else {
    tg.MainButton.hide();
  }
}

function render() {
  if (state.sent) return;
  const copy = STEP_COPY[state.step];
  pageTitle.textContent = copy[0];
  pageSubtitle.textContent = copy[1];
  stepCounter.textContent = `${state.step + 1} / 6`;
  progressFill.style.width = `${((state.step + 1) / 6) * 100}%`;
  localNote.hidden = Boolean(tg);

  if (state.step === 0) renderName();
  if (state.step === 1) renderLanguage();
  if (state.step === 2) renderFrequency();
  if (state.step === 3) renderDuration();
  if (state.step === 4) renderTeacher();
  if (state.step === 5) renderSummary();
  updateTelegramMainButton();
}

function renderName() {
  screen.innerHTML = `
    <label class="field-label" for="studentName">Как к вам обращаться?</label>
    <input class="text-input" id="studentName" name="studentName" type="text" maxlength="60"
      autocomplete="name" placeholder="Например, Александр" value="${escapeHtml(state.name)}">
    <p class="helper">Укажите имя, которое мы сможем использовать при общении.</p>
    <div class="actions">
      <button class="action-btn action-primary" data-action="next-name" id="nextName" ${state.name.trim().length < 2 ? 'disabled' : ''}>Продолжить</button>
    </div>`;
  const input = document.getElementById('studentName');
  input.addEventListener('input', () => {
    state.name = input.value;
    document.getElementById('nextName').disabled = input.value.trim().length < 2;
  });
  input.focus({ preventScroll: true });
}

function renderLanguage() {
  screen.innerHTML = `
    <div class="option-grid">
      ${LANGUAGES.map((item) => `
        <button class="option-card ${state.language === item.id ? 'selected' : ''}" data-action="language" data-value="${escapeHtml(item.id)}">
          <span class="option-icon">${item.icon}</span>
          <span><span class="option-title">${escapeHtml(item.id)}</span><span class="option-description">${escapeHtml(item.detail)}</span></span>
          ${state.language === item.id ? '<span class="option-check">✓</span>' : ''}
        </button>`).join('')}
    </div>
    ${backButton()}`;
}

function renderFrequency() {
  const options = [1, 2, 3, 4, 5];
  screen.innerHTML = `
    <p class="field-label">Количество занятий в неделю</p>
    <div class="option-grid">
      ${options.map((n) => `
        <button class="option-card number-card ${state.lessonsPerWeek === n ? 'selected' : ''}" data-action="frequency" data-value="${n}">
          <span class="option-title">${n}</span><span class="option-description">${n === 1 ? 'занятие' : n < 5 ? 'занятия' : 'занятий'}</span>
        </button>`).join('')}
    </div>
    ${backButton()}`;
}

function renderDuration() {
  const options = [30, 45, 60, 90];
  screen.innerHTML = `
    <p class="field-label">Сколько будет длиться одно занятие?</p>
    <div class="option-grid">
      ${options.map((n) => `
        <button class="option-card number-card ${state.durationMinutes === n ? 'selected' : ''}" data-action="duration" data-value="${n}">
          <span class="option-title">${n}</span><span class="option-description">минут</span>
        </button>`).join('')}
    </div>
    ${backButton()}`;
}

function renderTeacher() {
  const available = TEACHERS.filter((teacher) => teacher.language === state.language);
  screen.innerHTML = `
    ${available.length ? pricePreviewMarkup() : '<p class="helper">Для выбранного языка пока нет преподавателей.</p>'}
    <div class="option-list">
      ${available.map((teacher) => `
        <button class="option-card teacher-card ${state.teacher === teacher.name ? 'selected' : ''}" data-action="teacher" data-value="${escapeHtml(teacher.name)}">
          <span class="teacher-avatar">${teacher.avatar}</span>
          <span><span class="option-title">${escapeHtml(teacher.name)}</span><span class="option-description">${escapeHtml(teacher.detail)}</span></span>
          ${state.teacher === teacher.name ? '<span class="option-check">✓</span>' : ''}
        </button>`).join('')}
    </div>
    ${backButton()}`;
}

function renderSummary() {
  const price = getPricing();
  const values = [
    ['Имя', state.name],
    ['Язык', state.language],
    ['Занятий в неделю', String(state.lessonsPerWeek)],
    ['Длительность', `${state.durationMinutes} минут`],
    ['Преподаватель', state.teacher],
    ['Стоимость одного занятия', formatMoney(price.perLesson)],
    ['Стоимость в неделю', formatMoney(price.perWeek)],
    ['Стоимость за 4 недели', formatMoney(price.perFourWeeks)]
  ];
  screen.innerHTML = `
    <div class="summary-card">
      ${values.map(([key, value]) => `
        <div class="summary-row"><span class="summary-key">${escapeHtml(key)}</span><span class="summary-value">${escapeHtml(value)}</span></div>
      `).join('')}
    </div>
    <label class="confirm-check">
      <input type="checkbox" id="acceptData" ${state.accepted ? 'checked' : ''}>
      <span>Подтверждаю, что данные указаны верно, и отправляю заявку.</span>
    </label>
    <div class="actions">
      <button class="action-btn action-secondary" data-action="back">Назад</button>
      ${tg ? '' : `<button class="action-btn action-primary" id="browserSubmit" data-action="browser-submit" ${state.accepted ? '' : 'disabled'}>Подтвердить</button>`}
    </div>`;
  const checkbox = document.getElementById('acceptData');
  checkbox.addEventListener('change', () => {
    state.accepted = checkbox.checked;
    const browserButton = document.getElementById('browserSubmit');
    if (browserButton) browserButton.disabled = !state.accepted;
    updateTelegramMainButton();
  });
}

function backButton() {
  return `<div class="actions"><button class="action-btn action-secondary" data-action="back">Назад</button></div>`;
}

function goNext() {
  state.step = Math.min(state.step + 1, 5);
  render();
}

function goBack() {
  state.step = Math.max(state.step - 1, 0);
  render();
}

function buildApplication() {
  return {
    type: 'language_course_application',
    name: state.name.trim(),
    language: state.language,
    lessons_per_week: state.lessonsPerWeek,
    lesson_duration_minutes: state.durationMinutes,
    teacher: state.teacher,
    // Стоимость для предварительного отображения; бот самостоятельно пересчитывает её.
    price_per_lesson_rub: getPricing().perLesson,
    price_per_week_rub: getPricing().perWeek,
    price_per_four_weeks_rub: getPricing().perFourWeeks
  };
}

function submitApplication() {
  if (state.sent || !state.accepted) return;
  const payload = buildApplication();
  const json = JSON.stringify(payload);
  if (tg) {
    // sendData передаёт JSON-строку боту; Telegram закрывает Web App после отправки.
    tg.sendData(json);
    state.sent = true;
  } else {
    state.sent = true;
    pageTitle.textContent = 'Заявка подготовлена';
    pageSubtitle.textContent = 'Это демонстрационный режим в обычном браузере.';
    stepCounter.textContent = 'Готово';
    progressFill.style.width = '100%';
    screen.innerHTML = `
      <div class="success-panel">
        <div class="success-icon">✓</div>
        <h2>Заявка сформирована</h2>
        <p>В Telegram она будет передана боту и появится сообщением в этом же чате с пользователем.</p>
      </div>
      <div class="actions"><button class="action-btn action-secondary" data-action="restart">Заполнить заново</button></div>`;
    console.info('Данные тестовой заявки:', payload);
    updateTelegramMainButton();
  }
}

screen.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === 'next-name') {
    const input = document.getElementById('studentName');
    state.name = input.value.trim();
    if (state.name.length >= 2) goNext();
  } else if (action === 'language') {
    state.language = value;
    state.teacher = '';
    goNext();
  } else if (action === 'frequency') {
    state.lessonsPerWeek = Number(value);
    goNext();
  } else if (action === 'duration') {
    state.durationMinutes = Number(value);
    goNext();
  } else if (action === 'teacher') {
    state.teacher = value;
    state.accepted = false;
    goNext();
  } else if (action === 'back') {
    goBack();
  } else if (action === 'browser-submit') {
    submitApplication();
  } else if (action === 'restart') {
    Object.assign(state, { step: 0, name: '', language: '', lessonsPerWeek: null, durationMinutes: null, teacher: '', accepted: false, sent: false });
    render();
  }
});

if (tg) {
  tg.ready();
  tg.expand();
  tg.MainButton.setParams({ color: '#4169e1', text_color: '#ffffff' });
  tg.onEvent('mainButtonClicked', submitApplication);
}

render();
