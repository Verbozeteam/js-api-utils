/* @flow */

import { ConfigManagerClass } from './ConfigManager';

export type ThingStateType = Object;


class RoomConfigManagerClass {
    _SocketLibrary: Object;

    _configManagers: {[string]: ConfigManagerClass}; // room name -> config manager

    initialize(socketLibrary: Object) {
        this._SocketLibrary = socketLibrary;
        this._SocketLibrary.setOnMessage(this.onMiddlewareUpdate.bind(this));
    }

    reset() {
        for (var key in this._configManagers)
            this._configManagers[key].reset();
    }

    onMiddlewareUpdate(update: Object) {
        update = JSON.parse(JSON.stringify(update));
        if (!("__room_id" in update)) // no room, no deal
            return;

        var room = update.__room_id;
        if (room in this._configManagers) {
            delete update.__room_id;
            this._configManagers[room].onMiddlewareUpdate(update);
        }
    }

    createCustomSendFunc(roomId: string): ((Object, ?boolean, ?boolean) => any) {
        return (msg, b1, b2) => this._SocketLibrary.sendMessage({...msg, __room_id: roomId}, b1, b2);
    }

    addRoom(roomId: string) {
        if (!(roomId in this._configManagers)) {
            this._configManagers[roomId] = new ConfigManagerClass();
            this._configManagers[roomId].initialize(this._SocketLibrary, this.createCustomSendFunc(roomId));
            this._SocketLibrary.setOnMessage(this.onMiddlewareUpdate.bind(this)); // reset this to us
        }
    }

    getConfigManager(roomId: string): ConfigManagerClass {
        return this._configManagers[roomId];
    }

    CM(roomId: string): ConfigManagerClass {
        return this._configManagers[roomId];
    }
};

const RoomConfigManager = new RoomConfigManagerClass();

module.exports = {
    RoomConfigManager,
    RoomConfigManagerClass,
};
