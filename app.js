(() => {
  "use strict";

  // Данные каталога соответствуют bot/core/catalog.py и bot/schema.sql.
  const LANGUAGES = {
    en: { name: "Английский", englishName: "English", flag: "assets/gb.svg" },
    de: { name: "Немецкий", englishName: "Deutsch", flag: "assets/de.svg" },
    fr: { name: "Французский", englishName: "Français", flag: "assets/fr.svg" },
    es: { name: "Испанский", englishName: "Español", flag: "assets/es.svg" }
  };

  const TEACHERS = {
    en: [
      { id: "en1", name: "Анна", price: 1500, about: "IELTS/TOEFL, 8 лет опыта" },
      { id: "en2", name: "Michael", price: 2200, about: "Носитель языка, разговорная практика" },
      { id: "en3", name: "Ольга", price: 1000, about: "Школьная программа и база" }
    ],
    de: [
      { id: "de1", name: "Екатерина", price: 1400, about: "Goethe-Zertifikat, 6 лет опыта" },
      { id: "de2", name: "Hans", price: 2100, about: "Носитель языка" }
    ],
    fr: [
      { id: "fr1", name: "Мария", price: 1300, about: "DELF/DALF, 5 лет опыта" },
      { id: "fr2", name: "Pierre", price: 2000, about: "Носитель языка" }
    ],
    es: [
      { id: "es1", name: "Дарья", price: 1200, about: "DELE, 4 года опыта" },
      { id: "es2", name: "Carlos", price: 1900, about: "Носитель языка" },
      { id: "es3", name: "Игорь", price: 900, about: "Для начинающих" }
    ]
  };

  const PAYMENT_METHODS = [
    { code: "sbp", title: "📲 СБП", subtitle: "Перевод через Систему быстрых платежей" },
    { code: "card", title: "💳 Банковская карта", subtitle: "Оплата банковской картой" },
    { code: "crypto", title: "₿ Криптовалюта", subtitle: "USDT (TRC20)" }
  ];
  const LESSONS_PER_WEEK = [1, 2, 3, 4, 5];
  const DURATIONS = [45, 60, 90];
  const STEPS = ["language", "lessons", "duration", "teacher", "summary", "payment"];
  const STEP_TEXT = [
    { title: "Какой язык хотите изучать?", description: "Выберите направление — затем укажите расписание и преподавателя." },
    { title: "Сколько занятий в неделю?", description: "Выберите желаемую интенсивность обучения." },
    { title: "Длительность занятия", description: "Выберите продолжительность одного урока." },
    { title: "Выберите преподавателя", description: "Стоимость указана за 60 минут. Для каждого языка доступны свои преподаватели." },
    { title: "Проверьте заявку", description: "Проверьте выбранные параметры и подтвердите заявку перед оплатой." },
    { title: "Способ оплаты", description: "Выберите способ оплаты. Все реквизиты в этом учебном проекте тестовые." }
  ];

  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const launchedInsideTelegram = Boolean(tg && tg.initData);
  const content = document.getElementById("step-content");
  const title = document.getElementById("step-title");
  const description = document.getElementById("step-description");
  const stepCount = document.getElementById("step-count");
  const progressFill = document.getElementById("progress-fill");
  const browserSubmit = document.getElementById("browser-submit");
  const backButton = document.getElementById("back-button");
  const statusMessage = document.getElementById("status-message");

  const state = {
    step: 0,
    language: null,
    lessonsPerWeek: null,
    durationMin: null,
    teacherId: null,
    confirmed: false,
    paymentMethod: null
  };

  if (launchedInsideTelegram) {
    document.body.classList.add("telegram-mode");
    tg.ready();
    tg.expand();
    tg.MainButton.setParams({
      color: "#3269e8",
      text_color: "#ffffff",
      is_visible: true,
      is_active: false
    });
    tg.onEvent("mainButtonClicked", primaryAction);
  }

  function getTeacher() {
    return (TEACHERS[state.language] || []).find((teacher) => teacher.id === state.teacherId) || null;
  }

  function getPaymentMethod() {
    return PAYMENT_METHODS.find((method) => method.code === state.paymentMethod) || null;
  }

  function weeklyCost() {
    const teacher = getTeacher();
    if (!teacher || !state.durationMin || !state.lessonsPerWeek) return 0;
    return Math.round(teacher.price * state.durationMin / 60 * state.lessonsPerWeek);
  }

  function money(value) {
    return `${value.toLocaleString("ru-RU")} ₽`;
  }

  function isValidStep() {
    switch (STEPS[state.step]) {
      case "language": return Boolean(state.language && LANGUAGES[state.language]);
      case "lessons": return LESSONS_PER_WEEK.includes(state.lessonsPerWeek);
      case "duration": return DURATIONS.includes(state.durationMin);
      case "teacher": return Boolean(getTeacher());
      case "summary": return Boolean(state.language && state.lessonsPerWeek && state.durationMin && getTeacher());
      case "payment": return Boolean(getPaymentMethod());
      default: return false;
    }
  }

  function primaryLabel() {
    switch (STEPS[state.step]) {
      case "summary": return "Подтвердить заявку";
      case "payment": return "Перейти к оплате";
      default: return "Продолжить";
    }
  }

  function updateControls() {
    const valid = isValidStep();
    browserSubmit.disabled = !valid;
    browserSubmit.textContent = primaryLabel();
    backButton.hidden = state.step === 0;
    progressFill.style.width = `${((state.step + 1) / STEPS.length) * 100}%`;
    stepCount.textContent = `Шаг ${state.step + 1} из ${STEPS.length}`;

    if (launchedInsideTelegram) {
      tg.MainButton.setText(primaryLabel());
      if (valid) tg.MainButton.enable();
      else tg.MainButton.disable();
      tg.MainButton.show();
    }
  }

  function selectedClass(selected) {
    return selected ? " selected" : "";
  }

  function languageMarkup() {
    return `<div class="language-grid">${Object.entries(LANGUAGES).map(([code, language]) => `
      <button class="choice-card${selectedClass(state.language === code)}" type="button" data-choice="language" data-value="${code}" aria-pressed="${state.language === code}">
        <span class="flag-wrap"><img src="${language.flag}" alt="Флаг: ${language.name}"></span>
        <span class="choice-title">${language.name}</span>
        <span class="choice-subtitle">${language.englishName}</span>
        <span class="choice-check" aria-hidden="true">✓</span>
      </button>`).join("")}</div>`;
  }

  function lessonsMarkup() {
    return `<p class="section-label">Занятий в неделю</p><div class="option-grid">${LESSONS_PER_WEEK.map((number) => `
      <button class="choice-card${selectedClass(state.lessonsPerWeek === number)}" type="button" data-choice="lessonsPerWeek" data-value="${number}" aria-pressed="${state.lessonsPerWeek === number}">
        <span class="choice-title">${number} ${number === 1 ? "занятие" : "занятия"}</span>
        <span class="choice-subtitle">в неделю</span>
        <span class="choice-check" aria-hidden="true">✓</span>
      </button>`).join("")}</div>`;
  }

  function durationMarkup() {
    return `<p class="section-label">Продолжительность одного урока</p><div class="option-grid">${DURATIONS.map((duration) => `
      <button class="choice-card${selectedClass(state.durationMin === duration)}" type="button" data-choice="durationMin" data-value="${duration}" aria-pressed="${state.durationMin === duration}">
        <span class="choice-title">${duration} минут</span>
        <span class="choice-subtitle">одно занятие</span>
        <span class="choice-check" aria-hidden="true">✓</span>
      </button>`).join("")}</div>`;
  }

  function teacherMarkup() {
    const teachers = TEACHERS[state.language] || [];
    return `<div class="teacher-list">${teachers.map((teacher) => `
      <button class="choice-card${selectedClass(state.teacherId === teacher.id)}" type="button" data-choice="teacherId" data-value="${teacher.id}" aria-pressed="${state.teacherId === teacher.id}">
        <span class="choice-title">${teacher.name}</span>
        <span class="choice-subtitle">${teacher.about}</span>
        <span class="choice-subtitle">${money(teacher.price)} / час</span>
        <span class="choice-check" aria-hidden="true">✓</span>
      </button>`).join("")}</div>`;
  }

  function summaryMarkup() {
    const language = LANGUAGES[state.language];
    const teacher = getTeacher();
    const weekly = weeklyCost();
    return `<div class="summary-card">
      <p class="summary-heading">Ваша заявка</p>
      <div class="summary-row"><span class="summary-key">Язык</span><span class="summary-value">${language.name}</span></div>
      <div class="summary-row"><span class="summary-key">Расписание</span><span class="summary-value">${state.lessonsPerWeek} ${state.lessonsPerWeek === 1 ? "занятие" : "занятия"} в неделю</span></div>
      <div class="summary-row"><span class="summary-key">Длительность</span><span class="summary-value">${state.durationMin} минут</span></div>
      <div class="summary-row"><span class="summary-key">Преподаватель</span><span class="summary-value">${teacher.name}</span></div>
      <div class="summary-row"><span class="summary-key">Стоимость</span><span class="summary-value">${money(teacher.price)} / час</span></div>
      <div class="summary-total"><span>В неделю</span><span>${money(weekly)}</span></div>
      <div class="summary-total"><span>За 4 недели</span><span>${money(weekly * 4)}</span></div>
    </div>
    <p class="notice">Имя, телефон и email уже указаны в анкете Telegram-бота. После подтверждения заявка сохранится, и бот предложит выбрать способ оплаты.</p>`;
  }

  function paymentMarkup() {
    return `<div class="payment-list">${PAYMENT_METHODS.map((method) => `
      <button class="choice-card${selectedClass(state.paymentMethod === method.code)}" type="button" data-choice="paymentMethod" data-value="${method.code}" aria-pressed="${state.paymentMethod === method.code}">
        <span class="choice-title">${method.title}</span>
        <span class="choice-subtitle">${method.subtitle}</span>
        <span class="choice-check" aria-hidden="true">✓</span>
      </button>`).join("")}</div>
      <p class="notice">После отправки анкеты Telegram-бот покажет учебные реквизиты и кнопку проверки оплаты. Реальные деньги не списываются.</p>`;
  }

  function bindChoices() {
    content.querySelectorAll("[data-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const key = button.dataset.choice;
        const rawValue = button.dataset.value;
        let value = rawValue;
        if (key === "lessonsPerWeek" || key === "durationMin") value = Number(rawValue);

        if (["language", "lessonsPerWeek", "durationMin", "teacherId"].includes(key)) {
          state.confirmed = false;
          state.paymentMethod = null;
        }
        if (key === "language" && state.language !== value) {
          state.teacherId = null;
        }
        state[key] = value;
        statusMessage.textContent = "";
        render();
      });
    });
  }

  function render() {
    const meta = STEP_TEXT[state.step];
    title.textContent = meta.title;
    description.textContent = meta.description;
    content.innerHTML = [languageMarkup, lessonsMarkup, durationMarkup, teacherMarkup, summaryMarkup, paymentMarkup][state.step]();
    bindChoices();
    updateControls();
  }

  function goBack() {
    if (state.step <= 0) return;
    state.step -= 1;
    statusMessage.textContent = "";
    render();
  }

  function primaryAction() {
    if (!isValidStep()) {
      statusMessage.textContent = "Сначала выберите один из вариантов.";
      return;
    }
    if (state.step < STEPS.length - 1) {
      if (STEPS[state.step] === "summary") state.confirmed = true;
      state.step += 1;
      statusMessage.textContent = "";
      render();
      return;
    }
    sendForm();
  }

  function sendForm() {
    if (!state.confirmed || !isValidStep()) {
      statusMessage.textContent = "Проверьте заявку и выберите способ оплаты.";
      return;
    }
    const payload = {
      language: state.language,
      lessons_per_week: state.lessonsPerWeek,
      duration_min: state.durationMin,
      teacher_id: state.teacherId,
      confirmed: true,
      payment_method: state.paymentMethod
    };

    if (launchedInsideTelegram) {
      tg.sendData(JSON.stringify(payload));
      return;
    }

    statusMessage.textContent = "Демо-режим: анкета заполнена. Чтобы передать её боту, откройте Web App из Telegram.";
  }

  browserSubmit.addEventListener("click", primaryAction);
  backButton.addEventListener("click", goBack);
  render();
})();
