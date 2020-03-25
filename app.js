var app = require('http').createServer(response);
var fs = require('fs');
var io = require('socket.io')(app);
var ids = []
var games = []
var sockets = []
/*app.get('/', function(req, res){
  console.log(req.url)
  try {
    if (fs.existsSync(req.url)) {
      res.sendFile(__dirname + req.url);
    }
  } catch(err) {
    console.error(err)
  }


});*/
async function response(req, res) {
    var file = "";
    if (req.url === "/") {
        file = __dirname + "/index.html"
    } else {
        file = __dirname + req.url;
    }


    fs.readFile(file,
        function (err, data) {
            if (err) {
                res.writeHead(404);
                return res.end('Page or file not found');
            }
            res.writeHead(200);
            res.end(data);
        }
    );

}

app.listen(process.env.PORT || 3000);
io.on('connection', function (socket) {
    sockets.push(socket)
    ids.push(socket.id)
    socket.on('disconnect', function() {
        var game = getGameBySocketId(socket.id)
        if(game) {
            var player = getPlayerById(socket.id)
            if(game.inGame) {
                gameEmit(game, "alert", player.username + " left. Party's over.")
                games.splice(games.indexOf(game), 1)
            } else {
                if(player.team === "judge") {
                    gameEmit(game, "alert", "Host left the game, please reload.")
                    games.splice(games.indexOf(game), 1)
                } else if(game["team" + player.team].p1.id === player.id) {
                    game["team" + player.team].p1 = {}
                    gameEmit(game, "joinedGame", game)
                    gameEmit(game, "chatUpdate", player.username + " left the game.")
                } else {
                    game["team" + player.team].p2 = {}
                    gameEmit(game, "joinedGame", game)
                    gameEmit(game, "chatUpdate", player.username + " left the game.")
                }
            }
        }
    });
    socket.on("gamemsg", function(msg, callback)  {
        var game = getGameBySocketId(socket.id)
        if(game && msg !== "") {
            var player = getPlayerById(socket.id)
            var filteredmsg = msg.replace(/\</g, "&lt;");   //for <
            filteredmsg = filteredmsg.replace(/\>/g, "&gt;");
            filteredmsg = "<b>" + player.username + ":</b> " + filteredmsg;
            gameEmit(game, "chatUpdate", filteredmsg)
            callback()
        }
    })
    socket.on("createGame", function(name) {
        if(name.match("^[a-zA-Z0-9_]{3,15}[a-zA-Z]+[0-9]*$")) {
            var game = getGameBySocketId(socket.id)
            if (!game) {
                var newPlayer = {
                    username: name,
                    id: socket.id,
                    team: "judge"
                }
                var newTeam1 = {
                    p1: {},
                    p2: {},
                    paths: [],
                    timeout: 60000,
                    turn: 1,
                    ink: 500,
                    score: 0
                }
                var newTeam2 = {
                    p1: {},
                    p2: {},
                    paths: [],
                    timeout: 60000,
                    turn: 1,
                    ink: 500,
                    score: 0
                }
                var newGame = {
                    team1: newTeam1,
                    team2: newTeam2,
                    judge: newPlayer,
                    round: 1,
                    subject: "",
                    hidden: false,
                    inGame: false,
                    id: getUniqueGameId()
                }
                games.push(newGame)
                console.log(JSON.stringify(newGame))
                socket.emit("joinedGame", newGame)
            } else {
                socket.emit("alert", "Already in a game. Reload to exit.")
            }
        } else {
            socket.emit("alert", "Bad username. Try again.")
        }
    })
    socket.on("joinGame", function(id, name) {
        var gameExists = getGameBySocketId(socket.id)
        if(name.match("^[a-zA-Z0-9_]{3,15}[a-zA-Z]+[0-9]*$")) {
            if (!gameExists) {
                if (findObjectByKey(games, "id", parseInt(id)) && gameNameTaken(name, findObjectByKey(games, "id", parseInt(id))) === false) {
                    var game = findObjectByKey(games, "id", parseInt(id))
                    var playercount = 1
                    for (var x = 0; x < getPlayers(game); x++) {
                        if (!isEmpty(getPlayers(game)[x])) {
                            playercount++
                        }
                    }
                    if (playercount !== 5) {
                        var newPlayer = {
                            username: name,
                            id: socket.id,
                            team: 0
                        }
                        console.log(teamFilled(game.team1))
                        if (!teamFilled(game.team1)) {
                            newPlayer.team = 1
                            if (isEmpty(game.team1.p1)) {
                                console.log(game.team1)
                                console.log(game.team2)
                                game.team1.p1 = newPlayer
                                console.log(game.team1)
                                console.log(game.team2)
                            } else {
                                game.team1.p2 = newPlayer
                            }
                        } else {
                            newPlayer.team = 2
                            if (isEmpty(game.team2.p1)) {
                                game.team2.p1 = newPlayer
                            } else {
                                game.team2.p2 = newPlayer
                            }
                        }


                        console.log(game)
                        gameEmit(game, "joinedGame", game)
                        gameEmit(game, "chatUpdate", newPlayer.username + " joined the game.")
                    } else {
                        socket.emit("alert", "Game is full.")
                    }
                } else {
                    socket.emit("alert", "Game doesn't exist or username taken.")
                }
            } else {
                socket.emit("alert", "Already in a game. Reload to exit.")
            }
        } else {
            socket.emit("alert", "Bad username. Try again.")
        }
    })

});
function findObjectByKey(array, key, value) {
    for (var i = 0; i < array.length; i++) {
        if (array[i][key] === value) {
            return array[i];
        }
    }
    return null;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function generateSquareWithCenter(x, y, radius) {
    var square = {
        x1: x,
        y1: y,
        x2: x + radius * 2,
        y2: y + radius * 2
    }
    return square
}
function finishGame(p1) {
    var currentGame = findObjectByKey(games, "p1", p1)
    var gameoverdata = {
        p1: currentGame.p1,
        p2: currentGame.p2,
        p1score: currentGame.p1score,
        p2score: currentGame.p2score
    }
    if(currentGame.p1score > currentGame.p2score) {
        gameoverdata.judgement = "player 1 wins"
    } else if(currentGame.p2score > currentGame.p1score) {
        gameoverdata.judgement = "player 2 wins"
    } else {
        gameoverdata.judgement = "tie"
    }
    io.to(`${currentGame.p1}`).emit("gameover", gameoverdata, currentGame.p1)
    io.to(`${currentGame.p2}`).emit("gameover", gameoverdata, currentGame.p2)
    games.splice(games.indexOf(currentGame), 1)

}
function getUniqueGameId() {
    var foundId = false
    var id
    while(!foundId) {
        var tempId = getRandomInt(100000, 999999)
        if(!findObjectByKey(games, "id", tempId)) {
            id = tempId
            foundId = true
        }
    }
    return id
}
function gameNameTaken(name, game) {
    var players = getPlayers(game)
    var names = []
    for(var x = 0; x < players.length; x++) {
        names.push(players[x].username)
    }
    return names.includes(name);
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
function teamFilled(team) {
    return !isEmpty(team.p1) && !isEmpty(team.p2);
}
function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}
function getGameBySocketId(id) {
    for(var x = 0; x < games.length; x++) {
        var game = games[x]
        var players = getPlayers(game)
        for(var x = 0; x < players.length; x++) {
            if(!isEmpty(players[x]) && players[x].id === id) {
                return game
            }
        }
    }
    return null
}
function getPlayerById(id) {
    var game = getGameBySocketId(id)
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
function gameEmit(game, toEmit, args) {
    var players = getPlayers(game)
    for (var x = 0; x < players.length; x++) {
        if (!isEmpty(players[x])) {
            io.to(`${players[x].id}`).emit(toEmit, args)
        }
    }
}
