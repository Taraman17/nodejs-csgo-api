﻿// what to do after document is loaded.
var socket = null;
$( document ).ready(() => {
    let startSocket = () => {
        try {
            socket = new WebSocket(`wss://${host}:8091`);
        } catch (err) {
            console.error('Connection to websocket failed:\n' + err);
        }

        socket.onopen = () => {
            socket.send('infoRequest');
        }

        socket.onmessage = (e) => {
            let data = JSON.parse(e.data);

            if (data.type == "serverInfo") {
                let serverInfo = data.payload;

                $("#currentMap").html(`Current map: ${serverInfo.map}`);
                $('#scoreT').text(serverInfo.score.T);
                $('#scoreCT').text(serverInfo.score.C);
                $('#rounds').html(
                    `Rounds: ${serverInfo.maxRounds} / Left: ${serverInfo.maxRounds - (serverInfo.score.T + serverInfo.score.C)}`
                );

                $('.playerDiv ul').empty();
                $('.playerDiv').hide(0);
                if (serverInfo.players.length > 0) {
                    for (let i=0; i < serverInfo.players.length; i++) {
                        let player = serverInfo.players[i];
                        $(`#${player.team.toLowerCase()}List`).append(`<li class="dropbtn">${player.name}</li>`);
                        $(`#${player.team.toLowerCase()}Players`).show(0);
                    }
                }
                if ($('#mapList li').length < 2) {
                    if (serverInfo.mapsAvail) {
                        let maplist = serverInfo.mapsAvail;
                        $("#mapList").empty();
                        for (map of maplist) {
                            var li = document.createElement("li");
                            li.appendChild(document.createTextNode(map));
                            $("#mapList").append(li);
                        }
                    }
                }
            } else if (data.type == "commandstatus") {
                if (data.payload.state == 'start') {
                    $('#popupCaption').text(`${titles[data.payload.operation]}`);
                    $('#popupText').text('Moment bitte!');
                    $('.container-popup').css('display', 'flex');
                } else if (data.payload.state == 'end' && data.payload.operation != 'start') {
                    $('#popupText').html(`${data.payload.operation} success!`);
                    setTimeout( () => {
                        $('.container-popup').css('display', 'none');
                        setupPage();
                    }, 1500);
                }
            } else if (data.type == "progress") {
                $('#popupText').html(`${data.payload.step}: ${data.payload.progress}%`);
            } else if (data.type == "mapchange") {
                if (data.payload.success$ && $('#popupCaption').text() == 'Changing Map') {
                    socket.send('infoRequest');
                    $('.container-popup').css('display', 'none');
                } else if (!data.payload.success) {
                    $('#popupText').html(`Mapchange failed!`);
                }
            }
        }

        socket.onclose = () => {
            // connection closed, discard old websocket and create a new one in 5s
            socket = null;
            setTimeout(startSocket, 5000);
        }
    }
    startSocket();
    loadMaplist();
    setupPage();
});