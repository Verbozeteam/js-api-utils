/* @flow */

type TimeoutType = {
    time: number,
    autoClearTimeout: any,
    timeout: number,
};

class TimeoutHandlerImpl {
    _timeouts: {[string]: TimeoutType} = {};

    createTimeout(key: string, interval: number, f: () => any) {
        this.clearTimeout(key);
        this._timeouts[key] = {
            time: (new Date).getTime(),
            timeout: interval,
            autoClearTimeout: setTimeout(f, interval),
        };
    }

    clearTimeout(key: string) {
        if (key in this._timeouts) {
            clearTimeout(this._timeouts[key].autoClearTimeout);
            delete this._timeouts[key];
        }
    }

    getTimeout(key: string) : ?TimeoutType {
        return this._timeouts[key];
    }
};

module.exports = {
    TimeoutHandler: new TimeoutHandlerImpl()
};
