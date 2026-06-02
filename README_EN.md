This is an automatic translation and may be incorrect in some places. See the source README and examples for authoritative information.

# Serial.js
Wrapper on Web Serial API
- Automatic reconnection
- Preservation of the last selected port
- Shipment buffering
- Reception buffering, separation of text by separator

[demo](https://gyverlibs.github.io/Serial.js/test/)

> **Browser**: https://gyverlibs.github.io/Serial.js/Serial.min.js

> **Node**: npm i @alexgyver/serial

## Doc.
```js
constructor(params = {});
config(params = {});
// eol: /\r?\n/
// baud: 115200
// auto_open: false
// reconnect: 1000

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
getName();

select();
open();
close();

sendBin(data);
sendText(text);
```
