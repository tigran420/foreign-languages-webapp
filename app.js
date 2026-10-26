(() => {
  "use strict";

  const LANGUAGES = {
    en: { name: "Английский", englishName: "English" },
    de: { name: "Немецкий", englishName: "Deutsch" },
    fr: { name: "Французский", englishName: "Français" },
    es: { name: "Испанский", englishName: "Español" }
  };

  const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  const cards = Array.from(document.querySelectorAll("[data-language]"));
  const hint = document.getElementById("hint");
  const browserSubmit = document.getElementById("browser-submit");
  const statusMessage = document.getElementById("status-message");
  let selectedLanguage = null;

  const launchedInsideTelegram = Boolean(tg && tg.initData);
  if (launchedInsideTelegram) {
    document.body.classList.add("telegram-mode");
    tg.ready();
    tg.expand();
    tg.MainButton.setParams({
      text: "Подтвердить выбор",
      color: "#3269e8",
      text_color: "#ffffff",
      is_visible: false,
      is_active: false
    });
  }

  function updateSelection(code) {
    const language = LANGUAGES[code];
    if (!language) return;
    selectedLanguage = code;

    cards.forEach((card) => {
      const isSelected = card.dataset.language === code;
      card.classList.toggle("selected", isSelected);
      card.setAttribute("aria-pressed", String(isSelected));
    });

    hint.textContent = `Вы выбрали: ${language.name}. Подтвердите выбор.`;
    statusMessage.textContent = "";
    browserSubmit.disabled = false;

    if (launchedInsideTelegram) {
      tg.MainButton.setText(`Выбрать: ${language.name}`);
      tg.MainButton.show();
      tg.MainButton.enable();
    }
  }

  function sendSelection() {
    if (!selectedLanguage || !LANGUAGES[selectedLanguage]) {
      statusMessage.textContent = "Сначала выберите язык.";
      return;
    }

    const payload = JSON.stringify({ language: selectedLanguage });
    if (launchedInsideTelegram) {
      // sendData передаёт payload боту и закрывает Mini App.
      tg.sendData(payload);
      return;
    }

    statusMessage.textContent = `Демо-режим: выбран ${LANGUAGES[selectedLanguage].name}. ` +
      "Для передачи выбора боту откройте страницу внутри Telegram.";
  }

  cards.forEach((card) => {
    card.addEventListener("click", () => updateSelection(card.dataset.language));
  });
  browserSubmit.addEventListener("click", sendSelection);

  if (launchedInsideTelegram) {
    tg.onEvent("mainButtonClicked", sendSelection);
  }
})();
