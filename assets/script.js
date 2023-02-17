var ws = undefined
var ddisplay_id = "";
var retry_delay = 1000;
var interval = setInterval(connect, retry_delay);
let myFont

let font
let msg
let fSize

let txtPoints, txtBounds

let cam;

function preload() {
    myFont = loadFont('assets/fonts/D-DIN.otf');
    opentype.load('assets/fonts/D-DIN.otf', function (err, f) {
        if (err) {
            alert('Font could not be loaded: ' + err);
        } else {
            font = f
            console.log('font ready')

            fSize = 256
            msg = 'dDisplay'

            path = font.getPath(msg, 0, 0, fSize)
            console.log(path.commands)
        }
    })
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    cam.setViewport([0,0,windowWidth, windowHeight]);
  }
  


function setup() {
    createCanvas(windowWidth, windowHeight, WEBGL);
    cam = new Dw.EasyCam(this._renderer, {distance : 900});
    //document.oncontextmenu = ()=>false;
    smooth();
    setAttributes('antialias', true);
    textFont(myFont);
    textSize(32);
    textAlign(CENTER, CENTER);
    frameRate(30);
}

function draw_connection_state() {
    push();
    if (ws == undefined || ws.readyState == ws.CLOSED) {
        fill(255, 0, 0);
    } else if (ws.readyState == ws.OPEN) {
        fill(0, 255, 0);
    } else {
        fill(255, 165, 0);
    }
    ellipse(10, 10, 10, 10);
    pop();
}

function drawText3D(z) {
    if (txtBounds == null) {
        txtBounds = myFont.textBounds(msg, 0, 0, 256);
    }
    push();
    
    let locX = mouseX - height / 2;
    let locY = mouseY - width / 2;
    
    translate(-txtBounds.w /2, -txtBounds.h /2,z);
    noFill()
    
    stroke(255)

    for (let cmd of path.commands) {
        if (cmd.type === 'M') {
            beginShape()
            vertex(cmd.x, cmd.y)
        } else if (cmd.type === 'L') {
            vertex(cmd.x, cmd.y)
        } else if (cmd.type === 'C') {
           bezierVertex(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y)
        } else if (cmd.type === 'Q') {
            quadraticVertex(cmd.x1, cmd.y1, cmd.x, cmd.y)
        } else if (cmd.type === 'Z') {
            endShape(CLOSE)
        }
    }

    pop();
}



function draw() {
    perspective(60 * PI/180, width/height, 1, 5000);
    background(0,0.3)

    for (let z = -10; z < 20; z+=5) {
        drawText3D(z)
    }


    stroke(125);
    fill(125);
    strokeWeight(1);

    text(ddisplay_id, 0, 0);
    translate(-width / 2, -height / 2);


    cam.beginHUD();
    draw_connection_state();
    cam.endHUD();
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
            var cmds = { "iam": iam, "set": set, "bytes": byt };
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


        console.log(agenda);

        for (const item of agenda["Items"]) {
            let li = document.createElement('li');
            li.innerText = item["Title"];
            li.setAttribute("isActive", item["IsActive"]);

        }

    } catch (error) {
        console.log(error)
    }
}


connect();