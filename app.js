var app = require('http').createServer(response);
var fs = require('fs');
var io = require('socket.io')(app);
var ids = []
var games = []
var sockets = []
/*app.get('/', function(req, res){
  //console.log(req.url)
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

            if (req.url.substr(-3) === ".js") {
                res.setHeader("Content-Type", "text/javascript")
            } else if (req.url.substr(-4) === ".css") {
                res.setHeader("Content-Type", "text/css")
                //console.log("sent css " + req.url)
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
            if(msg === "left" || msg === "right" && player.team === "judge" && game.right !== 0 && game.left !== 0) {
                if(msg === "left") {
                    game["team" + game.left].score ++
                    gameEmit(game, "chatUpdate", "Team " + game.left + " won the round!")
                    gameEmit(game, "chatUpdate", "Team 1 score: " + game.team1.score)
                    gameEmit(game, "chatUpdate", "Team 2 score: " + game.team2.score)
                    gameEmit(game, "chatUpdate", "Rounds remaining: " + (5 - game.round))
                    io.to(`${game["team" + game.left].p1.id}`).emit("alert", "Your team won the round!")
                    io.to(`${game["team" + game.left].p2.id}`).emit("alert", "Your team won the round!")
                    game.left = 0
                    game.right = 0
                } else {
                    game["team" + game.right].score ++
                    gameEmit(game, "chatUpdate", "Team " + game.right + " won the round!")
                    gameEmit(game, "chatUpdate", "Team 1 score: " + game.team1.score)
                    gameEmit(game, "chatUpdate", "Team 2 score: " + game.team2.score)
                    gameEmit(game, "chatUpdate", "Rounds remaining: " + (5 - game.round))
                    io.to(`${game["team" + game.right].p1.id}`).emit("alert", "Your team won the round!")
                    io.to(`${game["team" + game.right].p2.id}`).emit("alert", "Your team won the round!")
                    game.left = 0
                    game.right = 0
                }
            } else {
                var filteredmsg = msg.replace(/\</g, "&lt;");   //for <
                filteredmsg = filteredmsg.replace(/\>/g, "&gt;");
                filteredmsg = "<b>" + player.username + ":</b> " + filteredmsg;
                gameEmit(game, "chatUpdate", filteredmsg)
                callback()
            }
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
                    turn: 1,
                    ink: 30,
                    score: 0
                }
                var newTeam2 = {
                    p1: {},
                    p2: {},
                    paths: [],
                    turn: 1,
                    ink: 30,
                    score: 0
                }
                var newGame = {
                    team1: newTeam1,
                    team2: newTeam2,
                    judge: newPlayer,
                    timeout: 60000,
                    round: 1,
                    topic: "",
                    left: 0,
                    right: 0,
                    inGame: false,
                    id: 1,//getUniqueGameId(),
                    finishRound: function() {
                        if(this.round < 5) {
                            var randomNum = getRandomInt(1, 3)
                            var hiddenGameObj = JSON.parse(JSON.stringify(this))
                            this.left = randomNum
                            this.right = (randomNum % 2) + 1
                            var players = getPlayers(this)
                            for (var x = 0; x < players.length; x++) {
                                if (!isEmpty(players[x])) {
                                    io.to(`${players[x].id}`).emit("roundOver", hiddenGameObj, this["team" + this.left].paths, this["team" + this.right].paths)
                                }
                            }
                            gameEmit(this, "chatUpdate", this.judge.username + ", please look at your screen and say <b>right</b> or <b>left</b> in the chat to decide the victor of this round.")
                            this.timeout = 60000
                            this.team1.ink = 30
                            this.team2.ink = 30
                            this.team1.turn = 1
                            this.team2.turn = 1
                            this.team1.paths = []
                            this.team2.paths = []
                            this.round++
                        } else {
                            if(this.team1.score > this.team2.score) {
                                gameEmit(this, "alert", {title:"Team 1 wins!", html:"Team 1 score: " + this.team1.score + "<br>Team 2 score: " + this.team2.score + "<br>Refresh to play again!"})
                            } else if(this.team2.score > this.team1.score) {
                                gameEmit(this, "alert", {title:"Team 2 wins!", html:"Team 1 score: " + this.team1.score + "<br>Team 2 score: " + this.team2.score + "<br>Refresh to play again!"})
                            } else {
                                gameEmit(this, "alert", {title:"Tie!", html:"Team 1 score: " + this.team1.score + "<br>Team 2 score: " + this.team2.score + "<br>Refresh to play again!"})
                            }
                            games.splice(games.indexOf(this), 1)
                        }
                    }
                }
                games.push(newGame)
                //console.log(JSON.stringify(newGame))
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
                        //console.log(teamFilled(game.team1))
                        if (!teamFilled(game.team1)) {
                            newPlayer.team = 1
                            if (isEmpty(game.team1.p1)) {

                                game.team1.p1 = newPlayer

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


                        //console.log(game)
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
    socket.on("startGame", function(topicraw) {
        if(topicraw !== "") {
            var topic = topicraw.replace(/\</g, "&lt;");   //for <
            topic = topic.replace(/\>/g, "&gt;"); //for >
            var game = getGameBySocketId(socket.id)
            var members = 0
            if(game) {
                for(var x = 0; x < getPlayers(game).length; x++) {
                    if(!isEmpty(getPlayers(game)[x])) {
                        members ++
                    }
                }
            }
            if (game && members === 5) {
                var player = getPlayerById(socket.id)
                if (player.team === "judge") {
                    game.topic = topic
                    game.inGame = true
                    var timer = setInterval(function() {
                        gameEmit(game, "updateTime", game.timeout / 1000)
                        if(game.timeout <= 0) {
                            clearInterval(timer)
                            game.finishRound()
                        }
                        game.timeout -= 1000
                    }, 1000)
                    gameEmit(game, "gameStarted", game)

                } else {
                    socket.emit("alert", "Only a judge can start the game.")
                }
            } else {
                socket.emit("alert", "Game not ready.")
            }
        } else {
            socket.emit("alert", "Input a topic.")
        }
    })
    socket.on("pathDrawn", function(path) {
        var game = getGameBySocketId(socket.id)
        if(game) {
            //console.log(0)
            var player = getPlayerById(socket.id)
            if(player.team !== "judge") {
                //console.log(1)
                var team = game["team" + player.team]
                var playerRole;
                if(team.p1.id === player.id) {
                    playerRole = 1
                } else {
                    playerRole = 2
                }
                if(playerRole === team.turn) {
                    //console.log(2)
                    var newPath = path
                    if(path.length >= team.ink) {
                        newPath = path.slice(0, team.ink)
                    }
                    team.ink -= newPath.length
                    if(team.ink <= 0) {
                        //console.log(3)
                        if(playerRole === 1) {
                            team.turn = 2
                        } else {
                            team.turn = 1
                        }
                        team.paths.push(newPath)
                        team.ink = 30
                        io.to(`${team["p" + team.turn]}`).emit("alert", "Your turn!")
                    } else {
                        team.paths.push(newPath)
                        console.log(team.ink)
                    }
                    io.to(`${team.p1.id}`).emit("updateInk", team.ink, team.paths, team.turn)
                    io.to(`${team.p2.id}`).emit("updateInk", team.ink, team.paths, team.turn)
                } else {
                    socket.emit("alert", "It's not your turn!")
                }
            }
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
