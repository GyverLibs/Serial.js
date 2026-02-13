import { sleep, ShiftBuffer, StreamSplitter } from "@alexgyver/utils";

export default class SerialJS {
    static State = {
        Closed: 'closed',
        Opening: 'opening',
        Open: 'open',
        Closing: 'closing',
    };

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
            auto_open: false,
            reconnect: 1000,
        };
        this.cfg = { ...def, ...params };

        this._setLastPort().then(() => this.onselect(this.getName()));
        this.splitter = new StreamSplitter(this.cfg.eol);
        this.splitter.ontext = (t) => this.ontext(t);
    }

    //#region methods
    config(params = {}) {
        this.cfg = { ...this.cfg, ...params };
        this.splitter.eol = this.cfg.eol;
    }

    static supported() {
        return 'serial' in navigator;
    }

    opened() {
        return this._state == SerialJS.State.Open;
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
        if (this.cfg.auto_open) this.open();
        return this.selected();
    }

    async open() {
        const ports = await navigator.serial.getPorts();
        if (!ports.length) return;
        
        if (this.cfg.reconnect) this.retry = true;
        await this._open();
    }
    async _open() {
        if (this.opened()) return;
        this._change(SerialJS.State.Opening);

        try {
            await this._close();
            await this._setLastPort();
            await this._port.open({ baudRate: this.cfg.baud });
            this.writer = this._port.writable.getWriter();
            this.reader = this._port.readable.getReader();
            this._buffer.clear();
            this._change(SerialJS.State.Open);

            while (this._state == SerialJS.State.Open) {
                const { value, done } = await this.reader.read();
                if (done) break;
                if (value) {
                    if (this.onbin) this.onbin(value);
                    if (this.ontext) this.splitter.write(this._decoder.decode(value, { stream: true }));
                }
            }
        } catch (e) {
            this._error(e);
            this._change(SerialJS.State.Closed);
            if (this.retry) setTimeout(() => this._open(), this.cfg.reconnect);
        }

        if (this.reader) this.reader.releaseLock();
        if (this.writer) this.writer.releaseLock();
        this.reader = null;
        this.writer = null;

        try {
            await this._port.close();
            this._change(SerialJS.State.Closed);
        } catch (e) { }
    }

    async close() {
        this.retry = false;
        await this._close();
    }
    async _close() {
        switch (this._state) {
            case SerialJS.State.Closed: return;
            case SerialJS.State.Open:
                if (this.reader) await this.reader.cancel();
                this._change(SerialJS.State.Closing);
                break;
        }

        let i = 0;
        while (this._state == SerialJS.State.Closing) {
            await sleep(10);
            if (++i > 200) {
                this._error('Close timeout');
                this._change(SerialJS.State.Closed);
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
    _state = SerialJS.State.Closed;
    _buffer = new ShiftBuffer();
    _decoder = new TextDecoder();

    async _send() {
        if (this._busy) return;
        this._busy = true;
        while (this._buffer.length && this.writer) {
            let d = this._buffer.shiftAll();
            try {
                await this.writer.write(d);
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
        this._state = s;
        this.onchange(s);
        switch (s) {
            case SerialJS.State.Open: this.onopen(); break;
            case SerialJS.State.Closed: this.onclose(); break;
        }
    }
}