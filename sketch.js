//================================CLIENT CODE================================\\


//declare global variables
var socket = io(); //needed for socket connection
var paths = []; //line paths
let currentPath = []; //current drawing path
var canvas; //actual p5 canvas.
var cnv //p5-declared canvas TODO: figure out if these are the same
var center = "display: block; margin-right: auto; margin-left: auto;" //"center" style
var isInCanvas = false;// is the mouse in canvas
var accent = "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent" //button style
var seconds //seconds left in the game
var inGame = false //self-explanatory
var playerRole //player's "number", 1 or 2
var ink //ink left for player
var turn //1 or 2, team's turn
var topic //topic to draw
var paused //is the game in between drawing sessions
var firstTime = true //first time in chat
var joinedGame = false //first time joining game

function shouldJoinGame() {
    //called at onload, handles if client has joined from a generated link
    if(window.location.pathname.slice(0, 5) === "/join" && getUrlParameter("id")) {
        joinGameWithId(parseInt(getUrlParameter("id")))
        //join game using link query param
    }
}
function getUrlParameter(name) {
    //returns value of a URL param given a key
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};
function setup() {
    //setup function required by p5.js. runs on browser onload
    cnv = createCanvas(640, 480);
    cnv.mouseOver(function () {
        isInCanvas = true
    })
    cnv.mouseOut(function () {
        isInCanvas = false
    })
    document.onkeypress = function(e) {
        if(e.key === "Enter") {
            console.log(e)
            $("#msg_text").select()
        }
    }
    canvas = document.getElementsByClassName("p5Canvas")[0]
    canvas.style.display = "inline-block"
    background(255)
    var colorpicker = document.createElement("input")
    colorpicker.type = "color"
    colorpicker.id = "colorpicker"
    colorpicker.value = "000000"
    document.body.appendChild(colorpicker)
    var chatbox = document.createElement("div")
    chatbox.id = "history"
    chatbox.style.display = "inline-block"
    var chatboxw = parseInt((window.innerWidth - parseInt(canvas.style.width)) * 0.8)
    var chatstyle = "display: inline-block; height: " + parseInt(canvas.style.height) * 0.9 + "px; width: " + chatboxw.toString() + "px; float: right; overflow-wrap: break-word;"
    console.log(chatstyle)
    chatbox.setAttribute("style", chatstyle)
    document.body.appendChild(chatbox)
    var form = document.createElement("form")
    form.id = "chat"
    form.autocomplete = "off"
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

    $(form).submit(function (e) {
        console.log("wow")
        console.log(e)
        e.preventDefault();
        socket.emit("gamemsg", $(this).find("#msg_text").val(), function () {
            $("form#chat #msg_text").val("");
        });
    });
    document.body.appendChild(form)
    document.body.appendChild(document.createElement("br"))
    document.body.appendChild(document.createElement("br"))
    var div = document.createElement("div")
    var createBtn = document.createElement("button")
    createBtn.innerText = "Create Game"
    createBtn.className = accent
    createBtn.setAttribute("onclick", "createGame(false)")
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
    welcome.innerHTML = "Welcome to Draw Live! If you don't know how to play, click <a href='about.txt' target='_blank'>here</a>."
    document.getElementById("history").appendChild(welcome)
    textAlign(LEFT)

}

function draw() {
    //p5js function. runs repeatedly
    if (inGame && seconds !== undefined) {
        fill(255)
        noStroke()
        rect(9, 0, 63, 40)
        fill(0)
        textSize(32)
        text(seconds, 10, 30)
    }
    if (inGame && playerRole !== "judge") {
        fill(255)
        noStroke()
        rect(499, 0, 100, 40)
        fill(0)
        textSize(32)
        text("ink: " + ink, 500, 30)
    }
    if (inGame) {
        textSize(20)
        text("Draw " + topic + "!", 10, 450)
    }
    chatWindow = document.getElementById('history');

    noFill();
    if ((mouseIsPressed || (touches.length === 1 && touches[0].x < 640 && touches[0].y < 480)) && isInCanvas && inGame && ink > 0 && turn === playerRole) {
        var mx, my
        if(mouseIsPressed) {
            mx = mouseX
            my = mouseY
        } else {
            mx = touches[0].x
            my = touches[0].y
        }
        if(currentPath.length !== 0) {
            var distThisLast = Math.hypot(mouseX - currentPath[currentPath.length - 1].x, mouseY - currentPath[currentPath.length - 1].y)
            if (distThisLast >= 5) {
                const point = {
                    x: mx,
                    y: my,
                    color: document.getElementById("colorpicker").value,
                    weight: 3
                };
                currentPath.push(point);
                ink--
            }
        } else {
            const point = {
                x: mx,
                y: my,
                color: 0,
                weight: 3
            };
            currentPath.push(point);
            ink--
        }

    }
    if (!paused) {
        if (playerRole !== "judge") {
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
        } else {
            textAlign(CENTER);
            textSize(32)
            fill(0)
            text('Teams are drawing...', 320, 240);
            textAlign(LEFT);
        }
    }
}
function touchMoved() {
    //do nothing
    if(touches.length === 1 && touches[0].x < 640 && touches[0].y < 480) {
        isInCanvas = true
        return false;
    } else if(touches.length === 1) {
        isInCanvas = false
    }
}
function mousePressed() {
    //on mouse press
    currentPath = [];
    paths.push(currentPath);

}
function touchEnded() {
    //on touch release, do the same thing as mouse
    if (inGame && currentPath.length !== 0) {
        socket.emit("pathDrawn", currentPath)
        console.log(currentPath)
    }
}
function mouseReleased() {
    //on mouse release
    if (inGame && currentPath.length !== 0) {
        socket.emit("pathDrawn", currentPath)
        console.log(currentPath)
    }
}
function submitCreateGame() {
    var gameConfig = {
        rounds: $("#rounds").val(),
        gametime: $("#gametime").val(),
        username: $("#username").val(),
        maxInk: $("#ink").val()
    };
    socket.emit("createGame", gameConfig, $("#fill").val() === "true")
    Swal.close()
}

function createGame(fill) {
    //create game through button
    var username = "" //was used for a random name (removed).
    var html = '<form><label for="username">Enter a username between 4 and 20 characters long no special chars except underscore</label><br><input type="text" id="username" name="username" size="20" value="' + username + '"><br>' +
        '<br><label for="gametime">Enter a custom time limit in minutes (1 to 5 minutes)</label><br><input type="number" size="1" id="gametime" name="gametime" value="1"><br>' +
        '<br><label for="rounds">Enter a custom number of rounds (1 to 11)</label><br><input type="number" size="2" id="rounds" name="rounds" value="5"><br>' +
        '<br><label for="ink">Enter a custom ink limit (20 to 80)</label><br><input type="number" size="2" id="ink" name="ink" value="30"><br>' +
        '<input type="hidden" value="' + fill + '"' +
        '<br><br><input type="button" onclick="submitCreateGame()" class="swal2-confirm swal2-styled" value="Create Game!"></form>'

    Swal.fire({
        title: 'Creating a game',
        html: html,
        showCancelButton: false,
        showConfirmButton: false
    })
}

function joinGame() {
    //join game through button
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
    }).then(function () {
        Swal.fire({
            title: 'Enter a username between 4 and 20 characters long no special chars except underscore',
            input: 'text',
            showCancelButton: true,

            onOpen: function() {
                var input = swal.getInput()
                input.setSelectionRange(0, input.value.length)
            },
            inputValidator: (value) => {
                if (!value.match("^(?=[A-Za-z_\\d]*[A-Za-z])[A-Za-z_\\d]{4,20}$")) {
                    return 'Specify a username between 4 and 20 characters long no special chars except underscore'
                } else {
                    username = value
                    socket.emit("joinGame", gameId, username)
                }
            }
        })
    })


}
function joinGameWithId(id) {
    //join game with URL query param (no button)
    var username
        Swal.fire({
            title: 'Enter a username between 4 and 20 characters long no special chars except underscore',
            input: 'text',
            showCancelButton: true,

            onOpen: function() {
                var input = swal.getInput()
                input.setSelectionRange(0, input.value.length)
            },
            inputValidator: (value) => {
                if (!value.match("^(?=[A-Za-z_\\d]*[A-Za-z])[A-Za-z_\\d]{4,20}$")) {
                    return 'Specify a username between 4 and 20 characters long no special chars except underscore'
                } else {
                    username = value
                    socket.emit("joinGame", id, username)
                }
            }
        })


}
function selectText(containerid) {
    //auto select text in div
    if (document.selection) { // IE
        var range = document.body.createTextRange();
        range.moveToElementText(document.getElementById(containerid));
        range.select();
    } else if (window.getSelection) {
        var range = document.createRange();
        range.selectNode(document.getElementById(containerid));
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
}
socket.on("alert", function (content) {
    //custom swal alert on server event
    Swal.fire(content)
    if(content.includes(" left. Party's over.") || content.includes("Host left the game, reloading...") || (content.html && content.includes("Team 1 score:"))) {
        setTimeout(function() {
            location.reload()
        }, 1000)
    }
})
socket.on("joinedGame", function (gameObj) {
    //on player join (or leave)
    if (document.getElementById("startBtn")) {
        document.body.removeChild(document.getElementById("startBtn"))
    }
    var gameInfo = document.getElementById("gameInfo")
    var members = 1
    var t1p1 = "nobody"
    var t1p2 = "nobody"
    var t2p1 = "nobody"
    var t2p2 = "nobody"
    if (!isEmpty(gameObj.team1.p1)) {
        t1p1 = gameObj.team1.p1.username
        members++
    }
    if (!isEmpty(gameObj.team1.p2)) {
        t1p2 = gameObj.team1.p2.username
        members++
    }
    if (!isEmpty(gameObj.team2.p1)) {
        t2p1 = gameObj.team2.p1.username
        members++
    }
    if (!isEmpty(gameObj.team2.p2)) {
        t2p2 = gameObj.team2.p2.username
        members++
    }
    gameInfo.innerText = "You're in game " + gameObj.id + " with " + members + " member(s). You need 5 to play."
    gameInfo.innerHTML += "<br>Rounds: " + gameObj.maxRound + "<br>Time Limit: " + (parseInt(gameObj.maxTime) / 60000) + " minute(s)" + "<br>Ink Limit: " + gameObj.maxInk
    gameInfo.innerHTML += "<br>Judge: " + gameObj.judge.username + "<br>Team 1: " + t1p1 + " and " + t1p2 + "<br>Team 2: " + t2p1 + " and " + t2p2

    if (members === 5 && gameObj.judge.id === socket.id) {
        var startBtn = document.createElement("button")
        startBtn.innerText = "Start"
        startBtn.className = accent
        startBtn.id = "startBtn"
        startBtn.setAttribute("onclick", "startGame()")
        startBtn.setAttribute("style", center)
        document.body.appendChild(startBtn)
    }
    var final_message
    if(members < 5 && !joinedGame) {
        var chatBoxWidth = document.getElementById("history").style.width
        final_message = $("<p />").html("You've joined the game! Invite your friends with this link: <input type='text' style='width: " + (parseInt(chatBoxWidth) * 0.8) + "px;' id='select' onclick='selectText(\"select\")' value='" + window.location.protocol + "//" + window.location.hostname + "/" + "join?id=" + gameObj.id + "'>");
        $("#history").append(final_message);
        var container = document.getElementById("history")
        if (firstTime) {
            container.scrollTop = container.scrollHeight;
            firstTime = false;
        } else if (container.scrollTop + container.clientHeight >= container.scrollHeight * 0.9) {
            container.scrollTop = container.scrollHeight;
        }
    }
    joinedGame = true
})
socket.on("chatUpdate", function (msg) {
    //on chat updated
    var final_message = $("<p />").html(msg);
    $("#history").append(final_message);
    var container = document.getElementById("history")
    if (firstTime) {
        container.scrollTop = container.scrollHeight;
        firstTime = false;
    } else if (container.scrollTop + container.clientHeight >= container.scrollHeight * 0.9) {
        container.scrollTop = container.scrollHeight;
    }
});
socket.on("gameStarted", function (game) {
    //on game start
    clear()
    background(255)
    inGame = true
    if (document.getElementById("startBtn")) {
        document.body.removeChild(document.getElementById("startBtn"))
    }
    topic = game.topic
    var currentPlayer = getPlayerById(socket.id, game)

    if (currentPlayer.team !== "judge") {

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
        document.getElementById("gameInfo").innerHTML = "You (<b>" + currentPlayer.username + "</b>) are in a game. You are on Team " + currentPlayer.team + " and your teammate is " + game["team" + currentPlayer.team]["p" + teamRole].username + "."

        seconds = game.timeout / 1000
        ink = game["team" + currentPlayer.team].ink
        turn = game["team" + currentPlayer.team].turn
        paths = game["team" + currentPlayer.team].paths
        paused = false
        if (turn === playerRole) {
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
            fill(0)
            textSize(32)
            text("Their Turn!", 250, 30)
        }
        noFill();
        Swal.fire("Game started!", "You have " + (parseInt(game.maxTime) / 1000) + " seconds to draw <b>" + game.topic + "</b> with your teammate, " + game["team" + currentPlayer.team]["p" + teamRole].username + "!")
    } else {
        document.getElementById("gameInfo").innerHTML = "You (<b>" + currentPlayer.username + "</b>) are in a game. You are the judge."
        playerRole = 'judge'
    }

})
socket.on("updateTime", function (timeLeft) {
    //update the time left in game
    seconds = timeLeft
})
socket.on("updateInk", function (inkLeft, newPaths, newTurn) {
    //updated ink left
    ink = inkLeft
    paths = newPaths
    turn = newTurn
    if (turn === playerRole) {
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
        fill(0)
        textSize(32)
        text("Their Turn!", 250, 30)
    }
    noFill();
})
socket.on("roundOver", function (game, paths1, paths2) {
    //on round over
    var currentPlayer = getPlayerById(socket.id, game)
    paused = true
    console.log(paths1)
    clear()
    background(255)
    fill(0)
    strokeWeight(3)
    rect(318, 0, 4, 640)
    noFill()
    drawMultiplePaths(paths1, paths2)
    if (currentPlayer.team === "judge") {
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
    //is the object empty
    return Object.keys(obj).length === 0;
}

function getRandomInt(min, max) {
    //random integer in range. min inclusive max exclusive
    return Math.floor(Math.random() * (max - min)) + min;
}

function startGame() {
    //start game through button, wait for response of server for random topic
    socket.emit("getRandomTopic")
}
socket.on("receivedRandomTopic", function(topic) {
    Swal.fire({
        title: 'Enter a topic for the contestants to draw',
        input: 'text',
        inputValue: topic,
        onOpen: function() {
            var input = swal.getInput()
            input.setSelectionRange(0, input.value.length)
        },
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
})
function getPlayerById(id, game) {
    //get player by socket id
    if (game) {
        var players = getPlayers(game)
        for (var x = 0; x < players.length; x++) {
            if (!isEmpty(players[x]) && players[x].id === id) {
                return players[x]
            }
        }
    } else {
        return null
    }
}

function getPlayers(game) {
    //returns array of players in game
    var players = []
    players.push(game.judge)
    players.push(game.team1.p1)
    players.push(game.team1.p2)
    players.push(game.team2.p1)
    players.push(game.team2.p2)
    return players
}

function drawMultiplePaths(paths1, paths2) {
    //draw paths on round complete
    for (var x = 0; x < paths1.length; x++) {
        var path = paths1[x]
        if (path.length !== 0) {
            beginShape();
            path.forEach(point => {
                stroke(point.color);
                strokeWeight(point.weight / 2);
                vertex(point.x / 2, point.y / 2);
            });
            endShape();
        }
    }
    for (var x = 0; x < paths2.length; x++) {
        var path = paths2[x]
        if (path.length !== 0) {
            beginShape();
            path.forEach(point => {
                stroke(point.color);
                strokeWeight(point.weight / 2);
                vertex(point.x / 2 + 320, point.y / 2);
            });
            endShape();
        }
    }
}
