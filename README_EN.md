This is an automatic translation and may be incorrect in some places. See the source README and examples for authoritative information.

# Serial.js
Wrapper on Web Serial API
- Automatic reconnection
- Restoration of a previously authorized port
- Safe handling of multiple authorized ports
- Sequential writes
- Buffered text reception and splitting

[demo](https://gyverlibs.github.io/Serial.js/test/)

> **Browser**: https://gyverlibs.github.io/Serial.js/Serial.min.js

> **Node**: npm i @alexgyver/serial

## Doc.
```js
constructor(params = {});
config(params = {});
// eol: /\r?\n/
// baud: 115200
// dataBits: 8
// stopBits: 1
// parity: 'none'
// bufferSize: 255
// flowControl: 'none'
// auto_open: false
// reconnect: 1000
// forgetOtherPorts: true

onbin(b);
ontext(t);

onopen():
onclose():
onchange(s):
onselect(name);
onerror(e);

static supported();
opened();
selected();
getInfo();
getName();

select();
restore();
getPorts();
forget();
open();
close();

sendBin(data);
sendText(text);
```

The library passes `baud`, `dataBits`, `stopBits`, `parity`, `bufferSize`, and `flowControl` to `SerialPort.open()`. For example:

```js
const serial = new SerialJS({
    baud: 115200,
    bufferSize: 4096,
    flowControl: 'hardware',
});
```

Hardware flow control uses RTS/CTS and only works when both the port and the physical connection support it. The default is `'none'`.

`sendBin()` serializes writes and awaits the Promise returned by `writer.write()`. This applies Web Serial backpressure, but it does not confirm that the remote application has processed the data.
