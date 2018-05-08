/* @flow */

class MinuteTickerImpl {
  _callback: () => {} = () => {};

  _expected_time: number = 0;
  _timeout: Object = null;

  start(callback: (minutes: number) => {}) {
    this._callback = callback;
    clearTimeout(this._timeout);

    /* calculate time till next minute */
    const datetime = new Date();
    this._expected_time = datetime.getTime() + (
      60000 - (datetime.getSeconds() * 1000) - datetime.getMilliseconds()
    );

    /* set up timeout till start of next minute */
    this._timeout = setTimeout(this.tick.bind(this),
      this._expected_time - datetime.getTime());
  }

  tick() {
    const datetime = new Date();

    /* calculate delta between expected time of timeout and actual execution
       time */
    const delta = datetime.getTime() - this._expected_time;
    const minutes = Math.max(1, 1 + Math.round(delta / 60000));

    /* call the callback */
    this._callback(minutes);

    /* set up timeout till start of next minute */
    this._expected_time += 60000 * minutes;
    clearTimeout(this._timeout);
    this._timeout = setTimeout(this.tick.bind(this), 60000 * minutes - delta);
  }

  stop() {
    clearTimeout(this._timeout);
  }
}

module.exports = {
  MinuteTicker: new MinuteTickerImpl()
};
