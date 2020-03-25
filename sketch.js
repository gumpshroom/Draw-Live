var socket = io();
var paths = [];
let currentPath = [];
var canvas;
var cnv
var center = "display: block; margin-right: auto; margin-left: auto;"
var isInCanvas = false;
var accent = "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent"

function setup() {
    cnv = createCanvas(640, 480);
    cnv.mouseOver(function () {
        isInCanvas = true
    })
    cnv.mouseOut(function () {
        isInCanvas = false
    })
    canvas = document.getElementsByClassName("p5Canvas")[0]
    canvas.style.display = "inline-block"
    //canvas.style.marginLeft = "auto"
    //canvas.style.marginRight = "auto"
    background(255)
    var chatbox = document.createElement("div")
    chatbox.id = "history"
    chatbox.style.display = "inline-block"
    //chatbox.style.overflow = "scroll"
    //chatbox.style = center
    var chatboxw = parseInt((window.innerWidth - parseInt(canvas.style.width)) * 0.9)
    var chatstyle = "display: inline-block; height: " + parseInt(canvas.style.height) * 0.9 + "px; width: " + chatboxw.toString() + "px; float: right;"
    console.log(chatstyle)
    chatbox.setAttribute("style", chatstyle)
    //chatbox.setAttribute("height", canvas.height)
    document.body.appendChild(chatbox)
    var form = document.createElement("form")
    form.id = "chat"
    form.style.display = 'inline'
    var textInput = document.createElement("input")
    textInput.type = "text"
    textInput.id = "msg_text"
    textInput.name = "msg_text"
    var textInputw = parseInt(chatboxw * 0.8)
    var sendBtnw = parseInt(chatboxw * 0.2)
    console.log(textInputw)
    console.log(sendBtnw)
    var textInputStyle = "display: block; width: " + textInputw + "px; float: right;"
    textInput.setAttribute("style", textInputStyle)
    var sendBtn = document.createElement("input")
    sendBtn.type = "submit"
    sendBtn.value = "send"
    console.log(chatboxw)
    var btnInputStyle = "display: block; width: " + sendBtnw + "px; float: right;"
    sendBtn.setAttribute("style", btnInputStyle)
    form.append(sendBtn)
    form.append(textInput)

    $(form).submit(function(e) {
        console.log("wow")
        console.log(e)
        e.preventDefault();
        socket.emit("gamemsg", $(this).find("#msg_text").val(), function() {
            $("form#chat #msg_text").val("");
        });
    });
    document.body.appendChild(form)
    document.body.appendChild(document.createElement("br"))
    document.body.appendChild(document.createElement("br"))
    var div = document.createElement("div")
    //div.style = "display: block; margin-left: auto; margin-right: auto;"
    var createBtn = document.createElement("button")
    createBtn.innerText = "Create Game"
    createBtn.className = accent
    createBtn.setAttribute("onclick", "createGame()")
    createBtn.style = center
    var joinBtn = document.createElement("button")
    joinBtn.innerText = "Join Game"
    joinBtn.className = accent
    joinBtn.setAttribute("onclick", "joinGame()")
    joinBtn.style = center
    var desc = document.createElement("p")
    desc.innerText = "You're not in a game. Create one by clicking Create Game."
    desc.id = "gameInfo"
    desc.style = center + " text-align: center"
    div.appendChild(createBtn)
    div.appendChild(document.createElement("br"))
    div.appendChild(document.createElement("br"))
    div.appendChild(joinBtn)
    div.appendChild(document.createElement("br"))
    div.appendChild(document.createElement("br"))
    div.appendChild(desc)
    var br = document.createElement("br")
    document.body.appendChild(br)
    document.body.appendChild(div)

}

function draw() {
    chatWindow = document.getElementById('history');
    var xH = chatWindow.scrollHeight;
    chatWindow.scrollTo(0, xH);
    noFill();
    if (mouseIsPressed && isInCanvas) {
        const point = {
            x: mouseX,
            y: mouseY,
            color: 0,
            weight: 3
        };
        currentPath.push(point);
    }
    for (var x = 0; x < paths.length; x++) {
        var path = paths[x]
        if (path.length !== 0) {
            beginShape();
            path.forEach(point => {
                stroke(point.color);
                strokeWeight(point.weight);
                vertex(point.x, point.y);
            });
            endShape();
        } else {
            var index = paths.indexOf(path)
            paths.splice(index, 1)
            x--
        }
    }
}

function mousePressed() {
    currentPath = [];
    paths.push(currentPath);
}
function createGame() {
    var username
    Swal.fire({
        title: 'Enter a username between 4 and 15 characters long letters only',
        input: 'text',
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value.match("^[a-zA-Z0-9_]{3,15}[a-zA-Z]+[0-9]*$")) {
                return 'Specify a username between 4 and 15 characters long letters only'
            } else {
                username = value
                socket.emit("createGame", username)
            }
        }
    })
}

function joinGame() {
    var gameId, username
    Swal.fire({
        title: 'Enter a game id',
        input: 'text',
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) {
                return 'Specify a game id'
            } else {
                gameId = value

            }
        }
    }).then(function(){
        Swal.fire({
            title: 'Enter a username between 4 and 15 characters long letters only',
            input: 'text',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value.match("^[a-zA-Z0-9_]{3,15}[a-zA-Z]+[0-9]*$")) {
                    return 'Specify a username between 4 and 15 characters long letters only'
                } else {
                    username = value
                    socket.emit("joinGame", gameId, username)
                }
            }
        })
    })



}
socket.on("alert", function(content) {
    Swal.fire(content)
})
socket.on("joinedGame", function(gameObj) {
    var gameInfo = document.getElementById("gameInfo")
    var members = 1
    var t1p1 = "nobody"
    var t1p2 = "nobody"
    var t2p1 = "nobody"
    var t2p2 = "nobody"
    if(!isEmpty(gameObj.team1.p1)) {
        t1p1 = gameObj.team1.p1.username
        members ++
    }
    if(!isEmpty(gameObj.team1.p2)) {
        t1p2 = gameObj.team1.p2.username
        members ++
    }
    if(!isEmpty(gameObj.team2.p1)) {
        t2p1 = gameObj.team2.p1.username
        members ++
    }
    if(!isEmpty(gameObj.team2.p2)) {
        t2p2 = gameObj.team1.p2.username
        members ++
    }
    gameInfo.innerText = "You're in game " + gameObj.id + " with " + members + " member(s). You need 5 to play."
    gameInfo.innerHTML += "<br>Judge: " + gameObj.judge.username + "<br>Team 1: " + t1p1 + " and " + t1p2 + "<br>Team 2: " + t2p1 + " and " + t2p2

})
socket.on("chatUpdate", function(msg){
    var final_message = $("<p />").html(msg);
    $("#history").append(final_message);
});
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

