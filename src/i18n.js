import { createI18n } from "vue-i18n/dist/vue-i18n.cjs";
const messages = {
  en: {
    message: {
      hello: "hello world",
    },
  },
  zh_CN: {
    message: {
      hello: "你好，世界",
    },
  },
};

const language = navigator.language || navigator.userLanguage;
let locale = language.replace("-", "_");

const i18n = createI18n({
  legacy: false,
  locale, // set locale
  fallbackLocale: "en", // set fallback locale
  messages, // set locale messages
});
export default i18n;
