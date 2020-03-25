var socket = io();
var pcode = 0;
var w = window
w.findClickPos = function(e) {
    var posx, posy;
    posx = 0;
    posy = 0;
    if (!e) e = window.event;
    if (e.pageX || e.pageY) {
        posx = e.pageX;
        posy = e.pageY;
    } else if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    return {
        x: posx,
        y: posy
    };
};
socket.on("joinedGame", function(gameData, p) {
    setScreen("game_screen")
    setPosition("circle", gameData.targetX, gameData.targetY)
    if(gameData.p1 === p) {
        pcode = 1
        setText("total_score", gameData.p1score)
        setText("opponent_score", gameData.p2score)
    } else {
        pcode = 2
        setText("total_score", gameData.p2score)
        setText("opponent_score", gameData.p1score)
    }
})
socket.on("update", function(gameData, p) {
    setScreen("game_screen")
    setPosition("circle", gameData.targetX, gameData.targetY)
    setText("timer", parseInt(gameData.timeRemaining) / 1000)
    if(gameData.p1 === p) {
        setText("total_score", gameData.p1score)
        setText("opponent_score", gameData.p2score)
    } else {
        setText("total_score", gameData.p2score)
        setText("opponent_score", gameData.p1score)
    }
})
socket.on("queueing", function() {
    setText("start_button", "waiting p2...")
})
socket.on("oppdisconnect", function() {
    alert("opponent disconnected!")
})
onEvent("start_button", "click", function() {
    socket.emit("startQueue")
});
onEvent("circle", "click", function(e) {
    socket.emit("clicked", e.x, e.y)
});
socket.on("gameover", function(gameoverdata, p) {
    setScreen("lose_screen");
    if(gameoverdata.p1 === p) {
        setText("yourScore", "your score: " + gameoverdata.p1score)
        setText("theirScore", "their score: " + gameoverdata.p2score)
        if(gameoverdata.judgement === "player 1 wins") {
            setText("winner", "winner: " + gameoverdata.judgement + " (you)")
        } else {
            setText("winner", "winner: " + gameoverdata.judgement + " (them)")
        }
    } else {
        setText("yourScore", "your score: " + gameoverdata.p2score)
        setText("theirScore", "their score: " + gameoverdata.p1score)
        if(gameoverdata.judgement === "player 2 wins") {
            setText("winner", "winner: " + gameoverdata.judgement + " (you)")
        } else {
            setText("winner", "winner: " + gameoverdata.judgement + " (them)")
        }
    }
});
onEvent("background", "click", function(e) {
    socket.emit("clicked", e.x, e.y)
})
onEvent("playAgain_button", "click", function() {
    setScreen("welcome_screen");
    setText("start_button", "ok")
});
onEvent("tryAgain_button", "click", function() {
    setScreen("welcome_screen");
    setText("start_button", "ok")
});
function clear() {
    socket.emit('disconnect')
}
