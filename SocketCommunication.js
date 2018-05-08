/* @flow */

'use strict';

import { NativeModules, DeviceEventEmitter } from 'react-native';

const UUID = require("uuid");

import { ConfigType, DiscoveredDeviceType, SocketDataType } from './ConnectionTypes';

class SocketCommunication {
    _communication_token: string = "";
    _currently_connected_ip: string = "";
    _currently_connected_port: number = 0;

    _onConnected: () => any = () => {};
    _onDisconnected: () => any = () => {};
    _onMessage: (d: SocketDataType) => any = (d) => {};
    _onDeviceDiscovered: (d: DiscoveredDeviceType) => any = (d) => {};

    initialize() {
        this._communication_token = UUID.v4();

        DeviceEventEmitter.addListener(NativeModules.Socket.manager_log, (data) => {
            console.log(data.data);
        });

        DeviceEventEmitter.addListener(NativeModules.Socket.socket_connected, this.handleSocketConnected.bind(this));

        DeviceEventEmitter.addListener(NativeModules.Socket.socket_data, ((data: Object) => {
            this.handleSocketData(JSON.parse(data.data));
        }).bind(this));

        DeviceEventEmitter.addListener(NativeModules.Socket.socket_disconnected, this.handleSocketDisconnected.bind(this));

        DeviceEventEmitter.addListener(NativeModules.Socket.device_discovered, this.handleDeviceDiscovered.bind(this));
    }

    cleanup() {
        NativeModules.Socket.killThread();
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
        device.port = 7990; // TODO: This is all patch work.
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
        NativeModules.Socket.write(JSON.stringify(msg));
    }

    discoverDevices() {
        NativeModules.Socket.discoverDevices();
    }

    connect(ip: string, port: number) {
        if (ip != this._currently_connected_ip || port != this._currently_connected_port) {
            this._currently_connected_ip = ip;
            this._currently_connected_port = port;
            NativeModules.Socket.connect(ip, port);
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

module.exports = new SocketCommunication();
