# Serial.js
Обёртка на Web Serial API
- Автоматическое переподключение
- Сохранение последнего выбранного порта
- Буферизация отправки
- Буферизация приёма, разделение текста по разделителю

[demo](https://gyverlibs.github.io/Serial.js/test/)

> **Browser**: https://gyverlibs.github.io/Serial.js/Serial.min.js

> **Node**: npm i @alexgyver/serial

## Дока
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