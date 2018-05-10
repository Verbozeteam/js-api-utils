/* @flow */

'use strict';

import { NativeModules, DeviceEventEmitter } from 'react-native';

const UUID = require("uuid");

import { ConfigType, DiscoveredDeviceType, SocketDataType } from './ConnectionTypes';

class SocketCommunicationClass {
    _SocketModule: any = null;

    _communication_token: string = "";
    _currently_connected_ip: string = "";
    _currently_connected_port: number = 0;

    _onConnected: () => any = () => {};
    _onDisconnected: () => any = () => {};
    _onMessage: (d: SocketDataType) => any = (d) => {};
    _onDeviceDiscovered: (d: DiscoveredDeviceType) => any = (d) => {};

    _subscriptions = [];

    initialize(useSecondary: boolean) {
        this._communication_token = UUID.v4();

        this._SocketModule = !useSecondary ? NativeModules.MainSocket : NativeModules.SecondarySocket;
        var sPrefix = useSecondary ? "secondary_" : ""; // prefix for callback names (secondary_* if using secondary connection)

        this._SocketModule.initialize();
        console.log(this._SocketModule)

        this._subscriptions.concat(DeviceEventEmitter.addListener(this._SocketModule.manager_log, (data) => {
            console.log(data.data);
        }));

        this._subscriptions.concat(DeviceEventEmitter.addListener(this._SocketModule[sPrefix+"socket_connected"], this.handleSocketConnected.bind(this)));

        this._subscriptions.concat(DeviceEventEmitter.addListener(this._SocketModule[sPrefix+"socket_data"], ((data: Object) => {
            this.handleSocketData(JSON.parse(data.data));
        }).bind(this)));

        this._subscriptions.concat(DeviceEventEmitter.addListener(this._SocketModule[sPrefix+"socket_disconnected"], this.handleSocketDisconnected.bind(this)));

        this._subscriptions.concat(DeviceEventEmitter.addListener(this._SocketModule[sPrefix+"device_discovered"], this.handleDeviceDiscovered.bind(this)));
    }

    cleanup() {
        this._SocketModule.killThread();
        this._SocketModule = null;
        for (var i = 0; i < this._subscriptions.length; i++)
            this._subscriptions[i].remove();
        this._subscriptions = [];
        this._onConnected = () => {};
        this._onDisconnected = () => {};
        this._onMessage = (d) => {};
        this._onDeviceDiscovered = (d) => {};
    }

    handleSocketConnected() {
        this._onConnected();
    }

    handleSocketDisconnected() {
        this._onDisconnected();
    }

    handleSocketData(data: SocketDataType) {
        var keys = Object.keys(data);
        for (var k = 0; k < keys.length; k++) {
            if (data[keys[k]].token && data[keys[k]].token == this._communication_token)
                delete data[keys[k]];
        }
        this._onMessage(data);
    }

    handleDeviceDiscovered(device: DiscoveredDeviceType) {
        device.port = parseInt(device.data) ||  7990;
        this._onDeviceDiscovered(device);
    }

    sendMessage(msg: Object, deepTokenize?: boolean = false, add_token?: boolean = true) {
        if (add_token) {
            if (deepTokenize) {
                /* this makes the token embedded inside every value of
                keys of the message */
                for (var k in msg) {
                    msg[k].token = this._communication_token;
                }
            } else {
                msg.token = this._communication_token;
            }
        }
        this._SocketModule.write(JSON.stringify(msg));
    }

    discoverDevices() {
        this._SocketModule.discoverDevices();
    }

    connect(ip: string, port: number) {
        if (ip != this._currently_connected_ip || port != this._currently_connected_port) {
            this._currently_connected_ip = ip;
            this._currently_connected_port = port;
            this._SocketModule.connect(ip, port);
        }
    }

    setOnConnected(conn: () => any) {
        this._onConnected = conn;
    }

    setOnDisconnected(dconn: () => any) {
        this._onDisconnected = dconn;
    }

    setOnMessage(on_msg: (data: ConfigType) => any) {
        this._onMessage = on_msg;
    }

    setOnDeviceDiscovered(on_device: (device: DiscoveredDeviceType) => any) {
        this._onDeviceDiscovered = on_device;
    }
};

const SocketCommunication = new SocketCommunicationClass();

module.exports = {
    SocketCommunication,
    SocketCommunicationClass,
};
