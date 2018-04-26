/* @flow */

const { clock_translations } = require('./translations/clock_translations');
const { panel_translations } = require('./translations/panel_translations');
const { central_ac_translations } = require('./translations/central_ac_translations');
const { settings_translations } = require('./translations/settings_translations');

class I18n {
    _translations = {};
    _language: string = 'en';
    _language_direction = 'left_to_right';

    _supported_languages = [];
    _supported_languages_directions = {
        en: 'left_to_right', /* English */
        ru: 'left_to_right', /* Russian */
        de: 'left_to_right', /* German  */
        zh: 'left_to_right', /* Chinese */
        ar: 'right_to_left', /* Arabic  */
    }

    getSupportedLanguages() {
        var supported_languages = {};
        /* Loop through all translated words */
        for (var key of Object.keys(this._translations)) {
            const word = this._translations[key];
            /* Loop through different translations for word */
            for (var key2 of Object.keys(word)) {
                /* Add language abbreviation if not added before */
                if (!(key2 in supported_languages)) {
                    supported_languages[key2] = true;
                }
            }
        }

        return Object.keys(supported_languages);
    }

    constructor() {
        this._translations = {
            ...clock_translations,
            ...panel_translations,
            ...central_ac_translations,
            ...settings_translations
        };

        this._supported_languages = this.getSupportedLanguages();

    }

    addTranslations(word: Object) {
        if (!word) {
            return;
        }

        if ('en' in word) {
            var prev = {};
            if (word.en in this._translations) {
                prev = this._translations[word.en];
            }
            this._translations[word.en] = Object.assign(
                prev,
                word
            );
        }
    }

    setLanguage(language?: string): string {
        if (language) {
            const index = this._supported_languages.indexOf(language);
            if (index !== -1) {
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
