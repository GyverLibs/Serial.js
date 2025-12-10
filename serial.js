import { sleep, ShiftBuffer, StreamSplitter } from "@alexgyver/utils";

const States = {
    Open: 1,
    Closing: 2,
    Closed: 3,
};

export default class SerialJS {
    //#region handlers
    onbin = null;
    ontext = null;

    onopen() { }
    onclose() { }
    onchange(s) { }
    onselect(name) { }
    onerror(e) { }

    //#region constructor
    constructor(params = {}) {
        const def = {
            eol: /\r?\n/,
            baud: 115200,
            reconnect: 1000,
        };
        this.cfg = { ...def, ...params };

        this._setLastPort().then(() => this.onselect(this.getName()));
        this.splitter = new StreamSplitter(this.cfg.eol);
        this.splitter.ontext = (t) => this.ontext(t);
    }

    config(params = {}) {
        this.cfg = { ...this.cfg, ...params };
        this.splitter.eol = this.cfg.eol;
    }

    //#region methods
    static supported() {
        return 'serial' in navigator;
    }

    opened() {
        return this._state == States.Open;
    }

    selected() {
        return !!this._port;
    }

    getName() {
        if (!this._port) return null;

        switch (this._port.getInfo().usbProductId) {
            case 0x55d3: return 'CH343';
            case 0x7584: return 'CH340S';
            case 0x7522: case 0x7523: return 'CH340';
            case 0x5512: case 0x5523: case 0x5584: return 'CH341';
            case 0x0402: case 0x0403: case 0x0404: case 0x0405: case 0x6001: case 0x0602: case 0x6010: return 'FT232';
            case 0x9500: case 0x0102: case 0x0501: case 0x80a9: case 0xea60: case 0xea61: case 0xea63: return 'CP210x';
        }
        return 'Unknown';
    }

    async select() {
        try {
            await this.close();
            this._port = null;
            let ports = await navigator.serial.getPorts();
            for (let p of ports) await p.forget();
            await sleep(50);
            await navigator.serial.requestPort();
            await this._setLastPort();
        } catch (e) {
            this._error(e);
        }
        this.onselect(this.getName());
        return this.selected();
    }

    async open() {
        if (this.cfg.reconnect) this.retry = true;
        await this._open();
    }
    async _open() {
        if (this.opened()) return;

        try {
            await this._close();
            await this._setLastPort();
            await this._port.open({ baudRate: this.cfg.baud });
            this.writer = this._port.writable.getWriter();
            this.reader = this._port.readable.getReader();
            this._buffer.clear();
            this._state = States.Open;
            this._change(true);

            while (this._state == States.Open) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) {
                    if (this.onbin) this.onbin(value);
                    if (this.ontext) this.splitter.write(this._decoder.decode(value, { stream: true }));
                }
            }
        } catch (e) {
            this._error(e);
            if (this.retry) setTimeout(() => this._open(), this.cfg.reconnect);
        }

        if (this.reader) this.reader.releaseLock();
        if (this.writer) this.writer.releaseLock();
        this.reader = null;
        this.writer = null;
        this._state = States.Closed;

        try {
            await this._port.close();
            this._change(false);
        } catch (e) { }
    }

    async close() {
        this.retry = false;
        await this._close();
    }
    async _close() {
        switch (this._state) {
            case States.Closed: return;
            case States.Open:
                if (this.reader) await this.reader.cancel();
                this._state = States.Closing;
                break;
        }

        let i = 0;
        while (this._state == States.Closing) {
            await sleep(10);
            if (++i > 200) {
                this._error('Close timeout');
                this._state = States.Closed;
                break;
            }
        }

    }

    async sendText(text) {
        await this.sendBin((new TextEncoder()).encode(text));
    }

    async sendBin(data) {
        this._buffer.push(data);
        this._send();
    }

    //#region private
    _port = null;
    _state = States.Closed;
    _buffer = new ShiftBuffer();
    _decoder = new TextDecoder();

    async _send() {
        if (this._busy) return;
        this._busy = true;
        while (this._buffer.length) {
            let d = this._buffer.shiftAll();
            try {
                if (this.writer) await this.writer.write(d);
            } catch (e) { }
        }
        this._busy = false;
    }
    async _setLastPort() {
        let ports = await navigator.serial.getPorts();
        this._port = ports.length ? ports[0] : null;
    }

    _error(e) {
        this.onerror('[SerialJS] ' + e);
    }
    _change(s) {
        this.onchange(s);
        s ? this.onopen() : this.onclose();
    }
}