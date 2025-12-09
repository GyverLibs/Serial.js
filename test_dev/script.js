import SerialJS from "../serial";

let i = 0;
let ser = new SerialJS();

select_b.onclick = () => ser.select();
open_b.onclick = () => ser.open();
close_b.onclick = () => ser.close();
send_b.onclick = () => ser.sendText('Hello ' + i++);

// split reader
// ser.reader.setEOL(/\r?\n/);  // default
// ser.reader.ontext = t => console.log(t);

// read raw
// ser.onbin = b => console.log(b);
// ser.ontext = t => console.log(t);
ser.online = t => console.log(t);

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
ser.onportchange = () => {
    console.log('port change', ser.selected(), ser.getName());
}