/* @flow */

const { clock_translations } = require('./translations/clock_translations');
const { panel_translations } = require('./translations/panel_translations');
const { central_ac_translations } = require('./translations/central_ac_translations');
const { settings_translations } = require('./translations/settings_translations');

class I18n {
    _translations = {};
    _language: string = 'en';
    _language_direction = 'left_to_right';

    _supported_languages = ['en', 'ar'];
    _supported_languages_directions = ['left_to_right', 'right_to_left'];

    constructor() {
        this._translations = {
            ...clock_translations,
            ...panel_translations,
            ...central_ac_translations,
            ...settings_translations
        };
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
                this._language_direction = this._supported_languages_directions[index];
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
