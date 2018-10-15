/* @flow */

import { AsyncStorage } from 'react-native';

type KeyType = {
    [string]: string
};

class LocalStorage {

    _keys = {
        users_name: '@users_name',
        websocket_address: '@websocket_address',
        cached_configuration: '@cached_configuration'
    }

    get keys(): KeyType {
        return this._keys;
    }

    get(key: string, success?: (value: string) => void = () => {},
        failure?: () => void = () => {}, complete?: () => void = () => {}) {

        try {
            /* get value from AsyncStorage */
            AsyncStorage.getItem(key, (error, result) => {
                console.log('LocalStorage get key', key, 'value', result);
                if (result !== null && error === null) {
                    success(result);
                    complete();
                } else {
                    failure();
                    complete();
                }
            });
        }

        catch (err) {
            console.log(err);
            failure();
        }
    }

    store(key: string, value: string, success?: () => void = () => {},
        failure?: () => void = () => {}) {

        console.log('LocalStorage store key', key, 'value', value);

        try {
            /* store item in AsyncStorage */
            AsyncStorage.setItem(key, value, (error) => {
                if (error !== null) {
                    failure();
                } else {
                    success();
                }
            });
        }

        catch (err) {
            console.log(err);
            failure();
        }
    }

    remove(key: string, success?: () => void = () => {},
        failure?: () => void = () => {}) {

        console.log('LocalStorage remove key', key);

        try {
            /* remove item from AsyncStorage */
            AsyncStorage.removeItem(key, (error) => {
                if (error !== null) {
                    failure();
                } else {
                    success();
                }
            });
        }

        catch (err) {
            console.log(err);
            failure();
        }
    }

    reset(success?: () => void = () => {},
        failure?: () => void = () => {}) {

        console.log('LocalStorage reset');

        const keys = Object.values(this._keys);

        try {
            /* remove all keys from AsyncStorage */
            AsyncStorage.multiRemove(keys, (error) => {
                if (error !== null) {
                    failure();
                } else {
                    success();
                }
            });
        }

        catch (err) {
            console.log(err);
            failure();
        }
    }
}

export default new LocalStorage();
