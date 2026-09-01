import { sleep, StreamSplitter, SerialExecutor } from "@alexgyver/utils";

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
            forgetOtherPorts: true,
        };
        this.cfg = { ...def, ...params };

        this.restore().then(() => this.onselect(this.getName()));
        this.splitter = new StreamSplitter(this.cfg.eol);
        this.splitter.ontext = (t) => {
            try {
                this.ontext?.(t);
            } catch (e) {
                this._error(e);
            }
        };
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

    getInfo() {
        return this._port?.getInfo() ?? null;
    }

    getName() {
        if (!this._port) return 'None';

        switch (this.getInfo().usbProductId) {
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
            const port = await navigator.serial.requestPort();

            if (this.cfg.forgetOtherPorts) {
                const ports = await navigator.serial.getPorts();
                for (const p of ports) {
                    if (p !== port) await p.forget();
                }
            }

            this._port = port;
        } catch (e) {
            this._error(e);
        }
        this.onselect(this.getName());
        if (this.cfg.auto_open) return this.open();
        return this.selected();
    }

    async getPorts() {
        return navigator.serial.getPorts();
    }

    async restore() {
        const ports = await this.getPorts();
        this._port = this.cfg.forgetOtherPorts
            ? (ports[0] ?? null)
            : (ports.length === 1 ? ports[0] : null);
        return this.selected();
    }

    async forget() {
        await this.close();
        if (!this._port) return false;

        const port = this._port;
        this._port = null;

        try {
            await port.forget();
            this.onselect(this.getName());
            return true;
        } catch (e) {
            this._port = port;
            this._error(e);
            return false;
        }
    }

    async open() {
        if (this.opened()) return true;
        if (this._openPromise) return this._openPromise;
        if (this._state !== SerialJS.State.Closed) return false;

        if (this.cfg.reconnect) this.retry = true;

        const promise = this._connect();
        this._openPromise = promise;
        const result = await promise;
        if (this._openPromise === promise) this._openPromise = null;
        return result;
    }
    async _connect() {
        this._change(SerialJS.State.Opening);

        try {
            if (!this._port) await this.restore();

            if (!this._port) {
                throw new Error('No port');
            }

            if (this._state === SerialJS.State.Closing) {
                await this._cleanup();
                return false;
            }

            await this._port.open({ baudRate: this.cfg.baud });

            if (this._state === SerialJS.State.Closing) {
                await this._cleanup();
                return false;
            }

            this.writer = this._port.writable.getWriter();
            this.reader = this._port.readable.getReader();

            this._sender.reset();
            this._change(SerialJS.State.Open);
            void this._listen();
            return true;
        } catch (e) {
            this._error(e);
        }

        await this._cleanup();
        return false;
    }

    async _listen() {
        try {
            while (this._state === SerialJS.State.Open) {
                const { value, done } = await this.reader.read();

                if (done) break;

                if (value) {
                    try {
                        this.onbin?.(value);
                    } catch (e) {
                        this._error(e);
                    }

                    if (this.ontext) {
                        this.splitter.write(
                            this._decoder.decode(value, { stream: true })
                        );
                    }
                }
            }
        } catch (e) {
            this._error(e);
        }

        await this._cleanup();
    }

    async _cleanup() {
        this._sender.reset();

        try {
            if (this.reader) this.reader.releaseLock();
        } catch (e) { }

        try {
            if (this.writer) this.writer.releaseLock();
        } catch (e) { }

        this.reader = null;
        this.writer = null;

        try {
            if (this._port) await this._port.close();
        } catch (e) { }

        this._change(SerialJS.State.Closed);

        if (this.retry) {
            setTimeout(() => {
                if (this.retry) this.open();
            }, this.cfg.reconnect);
        }
    }

    async close() {
        this.retry = false;
        this._sender.reset();
        await this._close();
        return true;
    }
    async _close() {
        switch (this._state) {
            case SerialJS.State.Closed:
                return;

            case SerialJS.State.Opening:
                this._change(SerialJS.State.Closing);
                break;

            case SerialJS.State.Open:
                this._change(SerialJS.State.Closing);

                if (this.reader) {
                    try {
                        await this.reader.cancel();
                    } catch (e) { }
                }

                break;
        }

        let i = 0;
        while (this._state === SerialJS.State.Closing) {
            await sleep(10);

            if (++i > 200) {
                this._error('Close timeout');
                this._change(SerialJS.State.Closed);
                break;
            }
        }
    }

    async sendText(text) {
        return this.sendBin(new TextEncoder().encode(text));
    }

    async sendBin(data) {
        if (!this.opened() || !this.writer) return false;

        try {
            return await this._sender.run(async () => {
                if (!this.opened() || !this.writer) return false;
                await this.writer.write(data);
                return true;
            });
        } catch (e) {
            if (this.opened()) this._error(e);
            return false;
        }
    }

    //#region private
    _port = null;
    _decoder = new TextDecoder();
    _sender = new SerialExecutor();
    _state = SerialJS.State.Closed;
    _openPromise = null;

    _error(e) {
        this.onerror('[SerialJS] ' + e);
    }
    _change(s) {
        if (this._state === s) return;

        this._state = s;
        this.onchange(s);

        switch (s) {
            case SerialJS.State.Open: this.onopen(); break;
            case SerialJS.State.Closed: this.onclose(); break;
        }
    }
}
