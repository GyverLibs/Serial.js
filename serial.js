import { StreamSplitter } from "@alexgyver/utils";

export default class SerialJS {
    //#region handlers
    onbin = null;
    ontext = null;
    online = null;

    async onopen() { }
    async onclose() { }
    async onerror(e) { }
    async onportchange(selected) { }

    //#region constructor
    constructor() {
        this.splitter = new StreamSplitter();
        this.splitter.ontext = (t) => this.online(t);

        this._ok = 'serial' in navigator;
        if (this._ok) this._update().then(() => this.onportchange(this.selected()));
        else this._error('Browser is not supported');
    }

    //#region methods
    opened() {
        return this._open;
    }

    selected() {
        return !!this._port;
    }

    getName() {
        if (!this._port) return 'None';

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
        if (!this._ok) return;

        try {
            await this.close();
            let ports = await navigator.serial.getPorts();
            for (let p of ports) await p.forget();
            await new Promise(r => setTimeout(r, 50));
            await navigator.serial.requestPort();
            await this._update();
        } catch (e) {
            this._port = null;
            this._error(e);
        }
        this.onportchange(this.selected());
    }

    async open(baud = 115200) {
        if (!this._ok) return;

        try {
            await this.close();
            await this._update();
            if (!this.selected()) throw "No port";
            try {
                await this._port.open({ baudRate: baud });
                this._open = true;
                this.onopen();
                // this.reader.reset();
                await this._readLoop();
            } finally {
                await this._port.close();
                this._open = false;
                this.onclose();
            }
        } catch (e) {
            this._error(e);
        }
    }

    async close() {
        if (!this._ok) return;
        if (!this._open) return;

        this._close = true;
        if (this._reader) await this._reader.cancel();

        const t0 = performance.now();
        while (this._open) {
            if (performance.now() - t0 > 2000) this._error("Close timeout");
            await new Promise(r => setTimeout(r, 10));
        }
    }

    async sendBin(data) {
        if (!this._ok) return;
        if (!this.opened()) return;

        try {
            let writer = this._port.writable.getWriter();
            await writer.write(data);
            writer.releaseLock();
        } catch (e) {
            this._error(e);
        }
    }

    async sendText(text) {
        await this.sendBin((new TextEncoder()).encode(text));
    }

    //#region private
    _port = null;
    _open = false;
    _close = false;
    _reader = null;

    _error(e) {
        this.onerror('[SerialJS] ' + e);
    }
    async _update() {
        let ports = await navigator.serial.getPorts();
        this._port = ports.length ? ports[0] : null;
    }
    async _readLoop() {
        this._close = false;
        const decoder = new TextDecoder();

        while (this._port.readable && !this._close) {
            this._reader = this._port.readable.getReader();
            try {
                while (true) {
                    const { done, value } = await this._reader.read();
                    if (done) return;

                    if (this.onbin) this.onbin(value);
                    if (this.ontext || this.online) {
                        const text = decoder.decode(value);
                        if (this.ontext) this.ontext(text);
                        if (this.online) this.splitter.write(text);
                    }
                }
            } finally {
                this._reader.releaseLock();
                this._reader = null;
            }
        }
    }
}