/* @flow */

'use strict';

import { NativeModules, DeviceEventEmitter } from 'react-native';

const UUID = require("uuid");

import { ConfigType, DiscoveredDeviceType, SocketDataType } from './ConnectionTypes';

type AuthenticationData = {
    token: ?string,
    password: ?string,
};

class SocketCommunicationClass {
    _SocketModule: any = null;

    _communication_token: string = "";
    _currently_connected_ip: string = "";
    _currently_connected_port: number = 0;
    _currently_connected_ssl_state: boolean = false;
    _isUsingSSL: boolean = false;
    _authenticationData: AuthenticationData = {
        token: null,
        password: null,
    };

    _middleware_certificate: string =
        "-----BEGIN CERTIFICATE-----\n" +
        "MIICljCCAX4CCQCveAx3TZc54DANBgkqhkiG9w0BAQsFADANMQswCQYDVQQGEwJR\n" +
        "QTAeFw0xODA2MDMxNDM5NDNaFw0yMTAyMjYxNDM5NDNaMA0xCzAJBgNVBAYTAlFB\n" +
        "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA6lCw9/kerfXcdHetJnlf\n" +
        "15VNKu9nYVVVxyuzUnkMjTr7+AkiqlfcXXEoWbf1DI+r5RfhN+zn0EsL14W3zN8x\n" +
        "7UnTHwtPDNjdKH4uIgX96jiFDCV30U2GN2Kh85A0/72R5ZyeFdpLzbve26KIjrd2\n" +
        "Y/7SvU3/eC8OmiOcYLbJ7+IeQSc3v9fVbGqX6/mfRtPnoZk+oRaIUd/tnBi9noYa\n" +
        "mPdxv48d6hpMugx+2RPw6KfI+4NXU/OAG5xToxf8FbcXVPJhNK4/aqtnTRISnLCA\n" +
        "VwOUk09RTPvmAUJANuBmTSz9MexCDOVLR9K/wGmIyBzbY0FLkCL5l5m/pjuOFrVO\n" +
        "BQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQDVP1rUqNAlNHgxDlaoKbbxMSAVPTt2\n" +
        "32OYu+SIqpJNxVPRoW1Vc23OweHUM477vsbUkcZUiiuERMWZ3g8vVmH5N4TLKaa6\n" +
        "55AhOinhGHBgS7L9AuQquxEIb77TxMFQo2Oreq/28hy4LGvXso7zA6p9NlApClZC\n" +
        "1oossmx4Cjjm4N7VdpHnXRgbegXJj8UA/pIUefa1vq+3/ts9wxlHx5WJQa9A9keG\n" +
        "ce2V79JdWzN9fjtiJA2D6kiHAcTbv19oVhCj4d/KK2QT0oyg8QuzbiXlkyGb2OaX\n" +
        "gPtbkC2EpVIl5NvYkEmboLeUBs39JMRYLlFZeNcl7auwR8nZvlYdh1mA\n" +
        "-----END CERTIFICATE-----";

    _onConnected: () => any = () => {};
    _onDisconnected: () => any = () => {};
    _onMessage: (d: SocketDataType) => any = (d) => {};
    _onDeviceDiscovered: (d: DiscoveredDeviceType) => any = (d) => {};
    _onRequireAuthentication: () => null = () => null;

    _subscriptions = [];

    initialize(useSecondary: boolean) {
        this._communication_token = UUID.v4();

        this._SocketModule = !useSecondary ? NativeModules.MainSocket : NativeModules.SecondarySocket;
        var sPrefix = useSecondary ? "secondary_" : ""; // prefix for callback names (secondary_* if using secondary connection)

        this._SocketModule.initialize();

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
        this.sendMessage({authentication: this._authenticationData}, false, false);
        if (this._authenticationData.password)
            this._authenticationData.password = null;

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

        if ('noauth' in data) {
            // authentication failed!
            this._authenticationData.token = null;
            this._SocketModule.stopConnecting();
            this._onRequireAuthentication();
            return;
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

    setAuthenticationToken(token) {
        this._authenticationData.token = token;
    }

    setAuthenticationPassword(pw) {
        this._authenticationData.token = UUID.v4();
        this._authenticationData.password = pw;
        this._SocketModule.startConnecting();
        return this._authenticationData.token;
    }

    setSSLKey(key, cert, password) {
        this._SocketModule.setSSLKey(key, (cert ? cert : "") + "\n" + this._middleware_certificate, password);
        this._isUsingSSL = true;
    }

    disableSSL() {
        this._isUsingSSL = false;
    }

    connect(ip: string, port: number) {
        if (ip != this._currently_connected_ip || port != this._currently_connected_port || this._currently_connected_ssl_state != this._isUsingSSL) {
            this._currently_connected_ip = ip;
            this._currently_connected_port = port;
            this._currently_connected_ssl_state = this._isUsingSSL;
            this._SocketModule.startConnecting();
            this._SocketModule.connect(ip, port, this._isUsingSSL);
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

    setOnRequireAuthentication(on_auth: () => null) {
        this._onRequireAuthentication = on_auth;
    }
};

const SocketCommunication = new SocketCommunicationClass();

module.exports = {
    SocketCommunication,
    SocketCommunicationClass,
};
