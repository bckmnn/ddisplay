var ws = undefined
var ddisplay_id = "";
var retry_delay = 1000;
var interval = setInterval(connect, retry_delay);
let myFont

function preload() {
    myFont = loadFont('assets/fonts/D-DIN.otf');
}
  

function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    smooth();
    textFont(myFont);
    textSize(32);
    textAlign(CENTER, CENTER);
    frameRate(30);
}

function draw_connection_state() {
    push();
    if(ws == undefined || ws.readyState == ws.CLOSED){
        fill(255,0,0);
    }else if (ws.readyState == ws.OPEN){
        fill(0,255,0);
    }else{
        fill(255,165,0);
    }
    ellipse(10,10,10,10);
    pop();
}



function draw() {

    push();


    text(ddisplay_id, 0, 0);

    translate(-width / 2, -height / 2);
    stroke(125);
    strokeWeight(1);
    fill(125);

    draw_connection_state();
}

function connect() {
    if (ws === undefined || (ws && ws.readyState === 3)) {
        console.log('trying to connect ....', retry_delay);
        let proto = "ws:"
        if (window.location.protocol == "https:") {
            proto = "wss:"
        }
        ws = new WebSocket(`${proto}//${window.location.host}/ws`);

        ws.onopen = () => {
            console.log("connected!")
            retry_delay = 1000;
            clearInterval(interval);
        }
        ws.onerror = () => {
            ws.close();
        };

        ws.onmessage = (msg) => {
            var cmds = {"iam": iam, "set": set, "bytes": byt };
            if (msg.data) {
                var parts = msg.data.split(" ")
                var cmd = cmds[parts[0]];
                if (cmd) {
                    if (cmd == byt) {
                        cmd.apply(null, [parts.slice(1).join(" ")]);
                    } else {
                        cmd.apply(null, parts.slice(1));
                    }
                }
            }
        };

        ws.onclose = (event) => {
            console.log('The connection has been closed successfully.');
            clearInterval(interval);
            retry_delay *= 2
            retry_delay = Math.min(retry_delay, 10000);
            setInterval(connect, retry_delay);
        }

    }
}

function iam(id) {
    ddisplay_id = id;
}

function setTop(idx) {
    ws.send(`$SET:${idx}`);
}

function byt(data) {
    console.log("bytes", data);
    try {
        let agenda = JSON.parse(data);

        let list = document.getElementById('agenda');
        list.innerHTML = "";

        console.log(agenda);

        for (const item of agenda["Items"]) {
            let li = document.createElement('li');
            li.innerText = item["Title"];
            li.setAttribute("isActive", item["IsActive"]);

            list.appendChild(li);
        }

    } catch (error) {
        console.log(error)
    }
}


connect();