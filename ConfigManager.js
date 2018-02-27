/* @flow */

const I18n = require('./i18n/i18n');

export type ThingStateType = Object;

export type ThingMetadataType = {
    id: string,
    category: string,
    name: string,
    [string]: any, // other properties
};

export type PresetType = {
    [string]: Object,
};

export type GroupType = {
    id: string,
    name: string,
    things: Array<ThingMetadataType>,
    presets: ?Array<PresetType>,
};

export type RoomType = {
    id: string,
    name: string,
    groups: Array<GroupType>,
};

export type TranslationsType = {
    [string]: {
        en: string,
        ar: ?string,
        [string]: string, // other languages...
    };
};

export type ConfigType = {
    id: string,
    rooms: Array<RoomType>,
    translations: ?TranslationsType,
};

export type MiddlewareUpdateType = {
    [string]: ThingStateType,
    config: ConfigType,
};

export type ConfigChangeCallbackType = (ConfigType) => any;

export type ThingStateChangeCallbackType = (ThingMetadataType, ThingStateType) => any;

type LegacyNameType = {
    en: string,
    ar: string,
};

type LegacyGenericThingType = {
    id: string,
    category: string,
    name: LegacyNameType,
};

type LegacyPanelType = {
    ratio: number, // row height ratio within column
    name: LegacyNameType, // panel name
    things: Array<LegacyGenericThingType>,
    presets?: Array<Object>, // array of presets, each one is a dictionary of <thing-id> -> <state>
};

type LegacyGridColumnType = {
    ratio: number,
    panels: Array<LegacyPanelType>
};

type LegacyRoomType = {
    name: LegacyNameType, // room name
    grid: Array<LegacyGridColumnType>,
    detail: Object,
    layout: Object,
};

type LegacyConfigType = {
    id?: string,
    rooms: Array<LegacyRoomType>,
};

class ConfigManagerImpl {
    _onConfigReceived: () => void = () => {};
    _configChangeCallbacks: Array<ConfigChangeCallbackType> = [];
    _thingStateChangeCallbacks: {[string]: Array<ThingStateChangeCallbackType>} = {};
    _categoryStateChangeCallbacks: {[string]: Array<ThingStateChangeCallbackType>} = {};
    _SocketLibrary: Object;

    config: ?ConfigType = null;
    things: {[string] : ThingStateType} = {};
    thingMetas: {[string] : ThingMetadataType} = {};
    isLegacy: boolean = false;

    initialize(socketLibrary: Object) {
        this._SocketLibrary = socketLibrary;
        this._SocketLibrary.setOnMessage(this.onMiddlewareUpdate.bind(this));
    }

    reset() {
        this.config = null;
        this.things = {};
        this.thingMetas = {};
        this.isLegacy = false;
    }

    loadConfig1(oldConfig: LegacyConfigType) {
        var translations: TranslationsType = {};

        var flatten = (lists: Array<Array<any>>) => [].concat.apply([], lists);

        var convertThing: LegacyGenericThingType => ThingMetadataType
                = t => {
            if (t.name && t.name.en)
                translations[t.name.en] = {...t.name};
            return {
                id: t.id,
                name: t.name ? t.name.en : "",
                category: t.category,
            };
        };

        var convertPanelToGroup: (p: LegacyPanelType, index: number) => GroupType
                = (p: LegacyPanelType, index: number) => {
            if (p.name && p.name.en)
                translations[p.name.en] = {...p.name};
            return {
                id: "group-"+index,
                name: (p.name ? p.name.en : undefined) || ("Group " + (index+1)),
                things: p.things.map(convertThing),
                presets: p.presets,
            };
        };

        var convertRoom: (r: LegacyRoomType, index: number) => RoomType
                = (r: LegacyRoomType, index: number) => {
            if (r.name && r.name.en)
                translations[r.name.en] = {...r.name};
            return {
                id: "room-"+index,
                name: (r.name ? r.name.en : undefined) || ("Room " + (index+1)),
                groups: flatten(r.grid.map(g => g.panels)).map(convertPanelToGroup),
            };
        };

        this.loadConfig2({
            id: oldConfig.id || "1",
            rooms: oldConfig.rooms.map(convertRoom),
            translations: translations,
        });
        this.isLegacy = true;
    }

    loadConfig2(cfg: ConfigType) {
        this.config = cfg;
        this.things = {};
        this.thingMetas = {};
        for (var r = 0; r < this.config.rooms.length; r++) {
            var room = this.config.rooms[r];
            for (var g = 0; g < room.groups.length; g++) {
                var group = room.groups[g];
                for (var t = 0; t < group.things.length; t++)
                    this.thingMetas[group.things[t].id] = group.things[t];
            }
        }
        this.isLegacy = false;
    }

    setConfig(cfg: ConfigType) {
        this.reset();

        try {
            this.loadConfig2(cfg);
        } catch (e1) {
            console.log("Middleware config not latest");
            try {
                this.loadConfig1(JSON.parse(JSON.stringify(cfg)));
                console.log("Loaded legacy config");
            } catch (e2) {
                console.log("Middleware config not supported ", e1, e2);
                console.log(cfg);
            }
        }

        if (this.config.translations)
            for (var k in this.config.translations)
                I18n.addTranslations(this.config.translations[k]);
    }

    setThingState(id: string, partialState: Object, send_socket: boolean) {
        if (send_socket === undefined)
            send_socket = true;
        return this.setThingsStates({[id]: partialState}, send_socket);
    }

    setThingsStates(idToState: Object, send_socket: boolean) {
        if (send_socket === undefined)
            send_socket = true;

        if (send_socket) {
            for (var id in idToState)
                this._SocketLibrary.sendMessage({...{thing: id}, ...idToState[id]});
        }

        for (id in idToState) {
            if (!(id in this.thingMetas))
                continue;

            var oldThingState = JSON.stringify(this.things[id]);
            this.things[id] = {...(this.things[id] || {}), ...idToState[id]};
            if (this.isLegacy)
                this.thingMetas[id] = {...idToState[id], ...(this.thingMetas[id] || {})};

            if (JSON.stringify(this.things[id]) !== oldThingState) {
                var category = this.things[id].category;

                if (id in this._thingStateChangeCallbacks) {
                    for (var i = 0; i < this._thingStateChangeCallbacks[id].length; i++)
                        this._thingStateChangeCallbacks[id][i](this.thingMetas[id], this.things[id]);
                }
                if (category in this._categoryStateChangeCallbacks) {
                    for (var i = 0; i < this._categoryStateChangeCallbacks[category].length; i++)
                        this._categoryStateChangeCallbacks[category][i](this.thingMetas[id], this.things[id]);
                }
            }
        }
    }

    onMiddlewareUpdate(update: MiddlewareUpdateType) {
        update = JSON.parse(JSON.stringify(update));

        if ('config' in update) {
            this.setConfig(update.config);
            if (this.config) {
                this._onConfigReceived();
                for (var c = 0; c < this._configChangeCallbacks.length; c++)
                    this._configChangeCallbacks[c](this.config);
            }
            delete update.config;
        }

        if ('__room_id' in update) {
          delete update.__room_id;
        }

        this.setThingsStates(update, false);
    }

    registerConfigChangeCallback(cb: ConfigChangeCallbackType): () => boolean {
        this._configChangeCallbacks.push(cb);
        return () => this.deregisterConfigChangeCallback(cb);
    }

    deregisterConfigChangeCallback(cb: ConfigChangeCallbackType): boolean {
        for (var c = 0; c < this._configChangeCallbacks.length; c++) {
            if (this._configChangeCallbacks[c] == cb) {
                this._configChangeCallbacks.splice(c, 1);
                return true;
            }
        }
        return false;
    }

    registerThingStateChangeCallback(id: string, cb: ThingStateChangeCallbackType): () => boolean {
        if (id in this._thingStateChangeCallbacks)
            this._thingStateChangeCallbacks[id].push(cb);
        else
            this._thingStateChangeCallbacks[id] = [cb];
        return () => this.deregisterThingStateChangeCallback(cb);
    }

    deregisterThingStateChangeCallback(cb: ThingStateChangeCallbackType): boolean {
        for (var tid in this._thingStateChangeCallbacks) {
            for (var i = 0; i < this._thingStateChangeCallbacks[tid].length; i++) {
                if (this._thingStateChangeCallbacks[tid][i] == cb) {
                    this._thingStateChangeCallbacks[tid].splice(i, 1);
                    return true;
                }
            }
        }
        return false;
    }

    registerCategoryChangeCallback(category: string, cb: ThingStateChangeCallbackType): () => boolean {
        if (category in this._categoryStateChangeCallbacks)
            this._categoryStateChangeCallbacks[category].push(cb);
        else
            this._categoryStateChangeCallbacks[category] = [cb];
        return () => this.deregisterCategoryChangeCallback(cb);
    }

    deregisterCategoryChangeCallback(cb: ThingStateChangeCallbackType): boolean {
        for (var cid in this._categoryStateChangeCallbacks) {
            for (var i = 0; i < this._categoryStateChangeCallbacks[cid].length; i++) {
                if (this._categoryStateChangeCallbacks[cid][i] == cb) {
                    this._categoryStateChangeCallbacks[cid].splice(i, 1);
                    return true;
                }
            }
        }
        return false;
    }

    getRoom(room_id: string): ?RoomType {
        if (this.config && this.config.rooms)
            return this.config.rooms.find((elem) => elem.id == room_id) || null;
        return null;
    }

    get rooms(): Array<RoomType> {
        if (this.config && this.config.rooms)
            return this.config.rooms;
        return [];
    }

    get hasConfig(): boolean {
        return !!this.config;
    }

    setOnConfigReceived(callback: () => void) {
        this._onConfigReceived = callback;
    }
};

export const ConfigManager = new ConfigManagerImpl();
