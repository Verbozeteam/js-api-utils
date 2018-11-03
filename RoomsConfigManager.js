/* @flow */

import { ConfigManagerClass } from './ConfigManager';
import type {
    ThingMetadataType,
    ThingStateType,
    ConfigChangeCallbackType,
    ConfigType
} from './ConfigManager';

export type RoomConfigChangeCallbackType = (roomId: string, config: ConfigType) => any;
export type RoomThingStateChangeCallbackType = (roomId: string, meta: ThingMetadataType, state: ThingStateType) => any;

class RoomConfigManagerClass {
    _SocketLibrary: Object;

    _configChangeCallbacks: Array<RoomConfigChangeCallbackType> = [];
    _thingStateChangeCallbacks: Array<RoomThingStateChangeCallbackType> = [];

    _configManagers: {[string]: ConfigManagerClass} = {}; // room name -> config manager

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
            this._configManagers[roomId].registerThingStateChangeCallback('__all', (meta, state) => this.onThingStateChange(roomId, meta, state))
            this._configManagers[roomId].registerConfigChangeCallback(cfg => this.onConfigChange(roomId, cfg));
        }
    }

    getConfigManager(roomId: string): ConfigManagerClass {
        return this._configManagers[roomId];
    }

    CM(roomId: string): ConfigManagerClass {
        return this._configManagers[roomId];
    }

    onConfigChange(roomId: string, config: ConfigType) {
        for (var i = 0; i < this._configChangeCallbacks.length; i++) {
            this._configChangeCallbacks[i] (roomId, config);
        }
    }

    onThingStateChange(roomId: string, meta: ThingMetadataType, state: ThingStateType) {
        for (var i = 0; i < this._thingStateChangeCallbacks.length; i++) {
            this._thingStateChangeCallbacks[i] (roomId, meta, state);
        }
    }


    registerConfigChangeCallback(cb: RoomConfigChangeCallbackType): () => boolean {
        this._configChangeCallbacks.push(cb);
        return () => this.deregisterConfigChangeCallback(cb);
    }

    deregisterConfigChangeCallback(cb: RoomConfigChangeCallbackType): boolean {
        for (var c = 0; c < this._configChangeCallbacks.length; c++) {
            if (this._configChangeCallbacks[c] == cb) {
                this._configChangeCallbacks.splice(c, 1);
                return true;
            }
        }
        return false;
    }

    registerRoomChangeCallback(cb: RoomThingStateChangeCallbackType): () => boolean {
        this._thingStateChangeCallbacks.push(cb);
        return () => this.deregisterRoomChangeCallback(cb);
    }

    deregisterRoomChangeCallback(cb: RoomThingStateChangeCallbackType): boolean {
        for (var i = 0; i < this._thingStateChangeCallbacks.length; i++) {
            if (this._thingStateChangeCallbacks[i] == cb) {
                this._thingStateChangeCallbacks.splice(i, 1);
                return true;
            }
        }
        return false;
    }
};

const RoomConfigManager = new RoomConfigManagerClass();

module.exports = {
    RoomConfigManager,
    RoomConfigManagerClass,
};
