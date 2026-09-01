# Serial.js
Обёртка на Web Serial API
- Автоматическое переподключение
- Восстановление ранее разрешённого порта
- Безопасная работа с несколькими разрешёнными портами
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

`select()` использует порт, возвращённый системным диалогом выбора. По умолчанию `forgetOtherPorts: true` - разрешение остаётся только у выбранного порта, поэтому после перезагрузки страницы его можно восстановить автоматически.

Для приложений, работающих с несколькими портами, нужен `forgetOtherPorts: false`. В этом режиме библиотека не отзывает чужие разрешения, а `restore()` автоматически выбирает порт только тогда, когда разрешён ровно один. Если портов несколько, надо вызвать `select()`.

- `getPorts()` возвращает все ранее разрешённые порты
- `restore()` восстанавливает порт без системного диалога, если выбор однозначен
- `forget()` закрывает текущий порт и отзывает только его разрешение
