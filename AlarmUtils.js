/* @flow */

type AlarmType = {
  id: number,
  time: string
};

export const minutesDifference = (t1: Object, t2: Object) => {
  return Math.floor(t1.getTime() / 60000) -
    Math.floor(t2.getTime() / 60000);
}

export const addAlarm =
  (alarms_id: string, ConfigManager: Object, alarm: AlarmType, alarms: Array<AlarmType>) => {

    /* if array of alarms passed, will check that no other duplicate alarm exists */
    if (typeof alarms !== 'undefined') {
      for (var i = 0; i < alarms.length; i++) {
        if (minutesDifference(new Date(alarms[i].time), alarm.time) == 0) {
          return ;
        }
      }
    }

    /* create new alarm */
    ConfigManager.setThingState(
      alarms_id,
      {add_alarm: alarm},
      true, false
    );
};

export const removeAlarm =
  (alarms_id: string, ConfigManager: Object, alarm: AlarmType) => {

  /* remove alarm */
  ConfigManager.setThingState(
    alarms_id,
    {remove_alarms: [alarm.id]},
    true, false
  );
};

export const snoozeAlarm =
  (alarms_id: string, ConfigManager: Object, alarm: AlarmType, delta: number) => {

  /* calculate alarm time */
  const snoozeAlarmTime = new Date();
  snoozeAlarmTime.setMilliseconds(0);
  snoozeAlarmTime.setTime(snoozeAlarmTime.getTime() + delta);

  /* remove alarm and add new snoozed alarm */
  removeAlarm(alarms_id, ConfigManager, alarm);
  addAlarm(alarms_id, ConfigManager, {time: snoozeAlarmTime});
};

export const ringAlarm =
  (alarms_id: string, ConfigManager: Object, alarm: AlarmType) => {

  /* set alarm to ringing */
  ConfigManager.setThingState(
    alarms_id,
    {'ring_alarm': alarm.id},
    true, false
  );
};
