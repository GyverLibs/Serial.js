import SerialJS from "https://gyverlibs.github.io/Serial.js/serial.min.js";

let i = 0;
let ser = new SerialJS();

// control
select_b.onclick = () => ser.select();
open_b.onclick = () => ser.open();
close_b.onclick = () => ser.close();
send_b.onclick = () => ser.sendText('Hello ' + i++);

// read
// ser.onbin = b => console.log(b);
ser.ontext = t => console.log(t);
// ser.online = t => console.log(t);

// state
ser.onopen = () => {
    console.log('Opened', ser.getName());
}
ser.onclose = () => {
    console.log('Closed');
}
ser.onerror = e => {
    console.log(e);
}
ser.onselect = (port) => {
    console.log('port change', port);
}