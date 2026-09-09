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

`select()` использует порт, возвращённый системным диалогом выбора. По умолчанию `forgetOtherPorts: true` - разрешение остаётся только у выбранного порта, поэтому после перезагрузки страницы его можно восстановить автоматически.

Для приложений, работающих с несколькими портами, нужен `forgetOtherPorts: false`. В этом режиме библиотека не отзывает чужие разрешения, а `restore()` автоматически выбирает порт только тогда, когда разрешён ровно один. Если портов несколько, надо вызвать `select()`.

- `getPorts()` возвращает все ранее разрешённые порты
- `restore()` восстанавливает порт без системного диалога, если выбор однозначен
- `forget()` закрывает текущий порт и отзывает только его разрешение

## Настройки порта

При открытии библиотека передаёт в `SerialPort.open()` параметры `baud`, `dataBits`, `stopBits`, `parity`, `bufferSize` и `flowControl`. Например:

```js
const serial = new SerialJS({
    baud: 115200,
    bufferSize: 4096,
    flowControl: 'hardware',
});
```

`flowControl: 'hardware'` включает RTS/CTS и работает только при поддержке со стороны порта и физического подключения. Значение по умолчанию — `'none'`.

`sendBin()` последовательно выполняет отправки и ожидает Promise от `writer.write()`. Это использует backpressure Web Serial, но не является прикладным подтверждением обработки данных устройством.
