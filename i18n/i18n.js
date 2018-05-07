/* @flow */

const { clock_translations } = require('./translations/clock_translations');
const { panel_translations } = require('./translations/panel_translations');
const { central_ac_translations } = require('./translations/central_ac_translations');
const { settings_translations } = require('./translations/settings_translations');

class I18n {
    _translations = {};
    _language: string = 'en';
    _language_direction = 'left_to_right';

    _supported_languages = {};
    _supported_languages_directions = {
        en: 'left_to_right', /* English */
        ru: 'left_to_right', /* Russian */
        de: 'left_to_right', /* German  */
        zh: 'left_to_right', /* Chinese */
        ar: 'right_to_left', /* Arabic  */
    }

    resetTranslations() {
        this._translations = {
            ...clock_translations,
            ...panel_translations,
            ...central_ac_translations,
            ...settings_translations
        };

        this._supported_languages = {};
    }

    addSupportedLanguages(translations: Object) {
        for (var lang in translations) {
            this._supported_languages[lang] = true;
        }
    }

    constructor() {
        this.resetTranslations();
    }

    addTranslations(title: string, translations: Object) {
        if (!translations) {
            return;
        }

        var prev = this._translations[title] || {};
        this._translations[title] = {
            ...prev,
            ...translations
        };

        this.addSupportedLanguages(translations);
    }

    setLanguage(language?: string) {
        if (language) {
            const exists = this._supported_languages[language] || null;
            if (exists !== null) {
                this._language = language;
                this._language_direction = this._supported_languages_directions[language];
                return language;
            }
        }

        return this._language;
    }

    t(word: string) {
        if (word in this._translations) {
            if (this._language in this._translations[word]) {
                return this._translations[word][this._language];
            }
        }
        return word;
    }

    r2l() {
        return this._language_direction === 'right_to_left';
    }

    l2r() {
        return this._language_direction === 'left_to_right';
    }
}

module.exports = new I18n;
