var socket = io();
var paths = [];
let currentPath = [];
var canvas;
var cnv
var center = "display: block; margin-right: auto; margin-left: auto;"
var isInCanvas = false;
var accent = "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent"
var seconds
var inGame = false
var playerRole
var ink
var turn
var topic
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
    textAlign(CENTER);
    textSize(32)
    text('Welcome to Draw Live!', 320, 240);
    var welcome = document.createElement("p")
    welcome.innerHTML = "Welcome to Draw Live! If you don't know how to play, click <a href='about.txt'>here</a>."
    document.getElementById("history").appendChild(welcome)
    textAlign(LEFT)
}

function draw() {

    if(inGame && seconds !== undefined) {
        //console.log(seconds)
        fill(255)
        noStroke()
        rect(9, 0, 40, 40)
        fill(0)
        textSize(32)
        text(seconds, 10, 30)
    }
    if(inGame && playerRole !== "judge") {
        fill(255)
        noStroke()
        rect(499, 0, 100, 40)
        fill(0)
        textSize(32)
        text("ink: " + ink, 500, 30)
    }
    if(inGame) {
        textSize(20)
        text("Draw " + topic + "!", 10, 450)
    }
    chatWindow = document.getElementById('history');
    var xH = chatWindow.scrollHeight;
    chatWindow.scrollTo(0, xH);
    /*
    if (chatWindow.scrollTop >= (chatWindow.scrollHeight - chatWindow.offsetHeight)) {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
     */
    noFill();
    if (mouseIsPressed && isInCanvas && inGame && ink > 0 && turn === playerRole) {
        if(currentPath.length !== 0) {
            var distThisLast = Math.hypot(mouseX - currentPath[currentPath.length - 1].x, mouseY - currentPath[currentPath.length - 1].y)
            if (distThisLast >= 5) {
                const point = {
                    x: mouseX,
                    y: mouseY,
                    color: 0,
                    weight: 3
                };
                currentPath.push(point);
                ink--
            }
        } else {
            const point = {
                x: mouseX,
                y: mouseY,
                color: 0,
                weight: 3
            };
            currentPath.push(point);
            ink--
        }
    }
    //console.log(paths)
    if(playerRole !== "judge") {
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
}

function mousePressed() {

    currentPath = [];
    paths.push(currentPath);

}
function mouseReleased() {
    if(inGame && currentPath.length !== 0) {
        socket.emit("pathDrawn", currentPath)
        console.log(currentPath)
    }
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
    if(document.getElementById("startBtn")) {
        document.body.removeChild(document.getElementById("startBtn"))
    }
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
        t2p2 = gameObj.team2.p2.username
        members ++
    }
    gameInfo.innerText = "You're in game " + gameObj.id + " with " + members + " member(s). You need 5 to play."
    gameInfo.innerHTML += "<br>Judge: " + gameObj.judge.username + "<br>Team 1: " + t1p1 + " and " + t1p2 + "<br>Team 2: " + t2p1 + " and " + t2p2
    if(members === 5 && gameObj.judge.id === socket.id) {
        var startBtn = document.createElement("button")
        startBtn.innerText = "Start"
        startBtn.className = accent
        startBtn.id = "startBtn"
        startBtn.setAttribute("onclick", "startGame()")
        startBtn.setAttribute("style", center)
        document.body.appendChild(startBtn)
    }
})
socket.on("chatUpdate", function(msg){
    var final_message = $("<p />").html(msg);
    $("#history").append(final_message);
});
socket.on("gameStarted", function(game) {
    clear()
    background(255)
    inGame = true
    if(document.getElementById("startBtn")) {
        document.body.removeChild(document.getElementById("startBtn"))
    }
    topic = game.topic
    var currentPlayer = getPlayerById(socket.id, game)
    document.getElementById("gameInfo").innerHTML = "You (<b>" + currentPlayer.username + "</b>) are in a game."
    if(currentPlayer.team !== "judge") {
        if (game["team" + currentPlayer.team].p1.id === socket.id) {
            playerRole = 1
        } else {
            playerRole = 2
        }
        var teamRole
        if (playerRole === 1) {
            teamRole = 2
        } else {
            teamRole = 1
        }
        //clear()
        seconds = game.timeout / 1000
        ink = game["team" + currentPlayer.team].ink
        turn = game["team" + currentPlayer.team].turn
        if(turn === playerRole) {
            fill(255)
            noStroke()
            rect(249, 0, 200, 40)
            fill(0)
            textSize(32)
            text("Your Turn!", 250, 30)
        } else {
            fill(255)
            noStroke()
            rect(249, 0, 200, 40)
        }
        noFill();
        Swal.fire("Game started!", "You have 60 seconds to draw <b>" + game.topic + "</b> with your teammate, " + game["team" + currentPlayer.team]["p" + teamRole].username + "!")
    } else {
        playerRole = 'judge'
    }

})
socket.on("updateTime", function(timeLeft) {
    seconds = timeLeft
})
socket.on("updateInk", function(inkLeft, newPaths, newTurn) {
    ink = inkLeft
    paths = newPaths
    turn = newTurn
    if(turn === playerRole) {
        fill(255)
        noStroke()
        rect(249, 0, 200, 40)
        fill(0)
        textSize(32)
        text("Your Turn!", 250, 30)
    } else {
        fill(255)
        noStroke()
        rect(249, 0, 200, 40)
    }
    noFill();
})
socket.on("roundOver", function(game, paths1, paths2) {
    var currentPlayer = getPlayerById(socket.id, game)
    console.log(paths1)
    clear()
    background(255)
    if(currentPlayer.team === "judge") {
        fill(0)
        strokeWeight(3)
        rect(318, 0, 4, 640)
        noFill()
        drawMultiplePaths(paths1, paths2)
        var startBtn = document.createElement("button")
        startBtn.innerText = "Start"
        startBtn.className = accent
        startBtn.id = "startBtn"
        startBtn.setAttribute("onclick", "startGame()")
        startBtn.setAttribute("style", center)
        document.body.appendChild(startBtn)

    } else {

        Swal.fire("Round " + game.round + " Completed!", "Waiting for Judge to start next round.")
    }

})
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function startGame() {
    var topic
    Swal.fire({
        title: 'Enter a topic for the contestants to draw',
        input: 'text',
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) {
                return 'Specify a topic'
            } else {
                topic = value
                socket.emit("startGame", topic)
            }
        }
    })
}
function getPlayerById(id, game) {
    if(game) {
        var players = getPlayers(game)
        for(var x = 0; x < players.length; x++) {
            if(!isEmpty(players[x]) && players[x].id === id) {
                return players[x]
            }
        }
    } else {
        return null
    }
}
function getPlayers(game) {
    var players = []
    players.push(game.judge)
    players.push(game.team1.p1)
    players.push(game.team1.p2)
    players.push(game.team2.p1)
    players.push(game.team2.p2)
    return players
}
function drawMultiplePaths(paths1, paths2) {
    for (var x = 0; x < paths1.length; x++) {
        var path = paths1[x]
        if (path.length !== 0) {
            beginShape();
            //noFill();
            path.forEach(point => {
                stroke(point.color);
                strokeWeight(point.weight);
                vertex(point.x/2, point.y/2);
            });
            endShape();
        }
    }
    for (var x = 0; x < paths2.length; x++) {
        var path = paths2[x]
        if (path.length !== 0) {
            beginShape();
            //noFill();
            path.forEach(point => {
                stroke(point.color);
                strokeWeight(point.weight);
                vertex(point.x/ 2 + 320, point.y / 2);
            });
            endShape();
        }
    }
}
