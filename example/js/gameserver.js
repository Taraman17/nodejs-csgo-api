﻿var address;
var ip = window.location.hostname;
try {
    var socket = new WebSocket(`wss://${ip}:8091`);
} catch (err) {
    console.error('Connection to websocket failed:\n' + err);
}

function doLogin() {
     window.location.href = `${address}/login`;
}

function sendGet(address, data, callback) {
    return $.ajax({
        type: "GET",
        url: address,
        data: data,
        cache: false,
        crossDomain: true,
        xhrFields: {
            withCredentials: true
        },
        success: callback
    });
}

// what to do after document is loaded.
$( document ).ready(() => {
    // Change here if you don't host the webInterfae on the same host as the NodeJS API
    address = `https://${ip}:8090/csgoapi/v1.0`;
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
        } else if (data.type == "opsStart") {
            if (data.payload.state == 'start') {
                $('#popupCaption').text(`${data.payload.operation}ing Server`);
                $('#popupText').text('Moment bitte!');
                $('.container-popup').css('display', 'flex');
            } else if (data.payload.state == 'end') {
                $('.container-popup').css('display', 'none');
                setupPage();
            }
        } else if (data.type == "updateProgress") {
            $('#popupText').html(`${data.payload.step}: ${data.payload.progress}%`);
            if (data.payload.step == 'Update Successful!') {
                window.setTimeout( () => {
                    $('.container-popup').css('display', 'none');
                }, 1500);
            }
        } else if (data.type == "mapchange") {
            if (data.payload.success) {
                setupPage();
                $('.container-popup').css('display', 'none');
            } else {
                $('#popupText').html(`Mapchange failed!`);
                window.setTimeout( () => {
                    $('.container-popup').css('display', 'none');
                }, 2000);
            }
        }
    }
    loadMaplist();
    setupPage();
});

// Load the maplist for serverstart from maplist.txt
function loadMaplist() {
    // The Maplist file can be taken from the csgo folder.
    $.get('./maplist.txt', (data) => {
        let lines = data.split(/\r\n|\n/);
        lines.forEach( (map) => {
            $("#mapAuswahl").append(`<option value="${map}">${map}</option>`);
        });
    });
}

// Setup the Elements according to server status.
function setupPage() {
    $('#popupCaption').text('Querying Server');
    function loggedIn() {
        return Promise.resolve(sendGet(`${address}/loginStatus`));
    }

    let loginCheck = loggedIn();
    loginCheck.then((data) => {
        if (data.login) {
            let running = () => {
                return Promise.resolve(sendGet(`${address}/info/runstatus`));
            }
            let serverRunning = running();
            serverRunning.then((data) => {
                if (data.running) {
                    let authStatus = () => {
                        return Promise.resolve(sendGet(`${address}/info/rconauthstatus`));
                    }
                    let authenticated = authStatus();
                    authenticated.then((data) => {
                        if (data.rconauth) {
                            setupServerRunning();
                        } else {
                            sendGet(`${address}/authenticate`).done((data) => {
                                if (data.authenticated) {
                                    setupServerRunning();
                                } else {
                                    alert('RCON not authenticated - try restarting server manually!');
                                    setupServerStopped();
                                }
                            });
                        }
                    });
                } else {
                    setupServerStopped();
                }
            }).catch((error) => {
                setupServerStopped();
            });
        } else {
            setupNotLoggedIn();
        }
    }).catch((error) => {
        setupNotLoggedIn();
    });

    $('.container-popup').css('display', 'none');
}

function setupNotLoggedIn() {
    $('#power-image').hide(0);
    $('#startMap').hide(0);
    $('#buttonStop').hide(0);
    $('#buttonStart').hide(0);
    $('#buttonUpdate').hide(0);
    $('#buttonLogin').show(0);
    $('#serverInfo').hide(0);
    $('#mapControl').hide(0);
}
function setupServerRunning() {
    $('#power-image').attr('src', 'pic/power-on.png');
    if (socket.readyState > 2) { // if websocket not connected
        getMaps();
    } else if ($("#mapList li").length < 2) {
        socket.send('infoRequest');
    }
    $('#startMap').hide(0);
    $('#mapList').on( 'click', showPlay);
    $('#mapList').on( 'dblclick', changeMap);
    $('#buttonStop').show(0);
    $('#buttonStart').hide(0);
    $('#buttonUpdate').hide(0);
    $('#buttonLogin').hide(0);
    $('#serverInfo').css('display', 'flex');
    $('#mapControl').show(0);
}
function setupServerStopped() {
    $('#power-image').attr('src', 'pic/power-off.png');
    $('#startMap').show(0);
    $('#buttonStart').show(0);
    $('#buttonStop').hide(0);
    $('#buttonUpdate').show(0);
    $('#buttonLogin').hide(0);
    $('#serverInfo').hide(0);
    $('#mapControl').hide(0);
    $('#mapSelector').hide('fast');
}

function clickButton(aButton) {
    action = aButton.value.toLowerCase();
    $('#popupCaption').text(`${action}ing Server`);
    $('#popupText').text('Moment bitte!');
    $('.container-popup').css('display', 'flex');
    startMap = document.getElementById('mapAuswahl').value;

    sendGet(`${address}/control/${action}`, `startmap=${startMap}`).done(( data ) => {
        if (action != 'update') {
            setupPage();
        }
        if (socket.readyState > 2) { // if websocket not connected
            $('.container-popup').css('display', 'none');
        }
    }).fail((err) => {
        let errorText = err.responseJSON.error;
        if (errorText.indexOf('Another Operation is pending:') != -1) {
            let operation = errorText.split(':')[1];
            alert(`${operation} running.\nTry again in a moment.`);
        } else {
            alert(`command ${action} failed!\nError: ${errorText}`);
        }
        if (socket.readyState > 2) {
            $('.container-popup').css('display', 'none');
        }
    });
}

function showPlayerMenu(event) {
    $('#playerDropdown').css({ 'top': event.pageY, 'left': event.pageX, 'display': 'block' });
    $('#playerDropdown').attr('player', event.target.textContent);
    // Close the dropdown menu if the user clicks outside of it
    window.onclick = function(event) {
      if (!event.target.matches('.dropbtn')) {
        $('#playerDropdown').css('display', 'none');
        window.onclick = '';
      }
    }
}
function movePlayer(event) {
    // This function uses sourcemod plugin "moveplayers" -> https://forums.alliedmods.net/showthread.php?p=2471466
    /* "sm_movect"                        - Move a player to the counter-terrorist team.
       "sm_movespec"                      - Move a player to the spectators team.
       "sm_movet"                         - Move a player to the terrorist team. */
    let player = event.target.parentElement.getAttribute('player')
    let command = event.target.getAttribute('command');
    sendGet(`${address}/rcon`, `message=sm_move${command} "${player}"`, ( data ) => {
        // no actions for now.
    });
}

function getMaps() {
    function getServerInfo() {
        return Promise.resolve(sendGet(`${address}/info/serverInfo`));
    }
    let serverInfo = getServerInfo();
    serverInfo.then((data) => {
        $("#currentMap").html(`Current map: ${data.map}`);
        maplist = data.mapsAvail;
        $("#mapList").empty();
        for (map of maplist) {
            var li = document.createElement("li");
            li.appendChild(document.createTextNode(map));
            $("#mapList").append(li);
        }
    }).catch((error) => {
        // do nothing for now
    });
}

function toggleMaplist() {
    $('#mapSelector').toggle('fast');
}

function showPlay(event) {
    if (event.target.classList.contains('active')) {
        changeMap(event);
        $('#mapSelector li').removeClass('active');
    } else {
        $('#mapSelector li').removeClass('active');
        event.target.classList.add('active');
    }
}

function changeMap(event) {
    let map = event.target.innerText;
    $('#mapSelector').hide('fast');
    $('#popupCaption').text('Changing Map');
    $('.container-popup').css('display', 'flex');
    sendGet(`${address}/control/changemap`, `map=${map}`, (data) => {
        if (data.success) {
            $('#popupText').html(`Changing map to ${map}`);
        } else {
            $('#popupText').html(`Mapchange failed!`);
            window.setTimeout( () => {
                $('.container-popup').css('display', 'none');
            }, 2000);
        }
    });
}

function restartRound() {
    sendGet(`${address}/rcon`, `message=mp_restartgame 1`, ( data ) => {
        $('#popupCaption').text(`Restart Round`);
        $('#popupText').html(`Round Restarted!`);
        $('.container-popup').css('display', 'flex');
        window.setTimeout( () => {
            $('.container-popup').css('display', 'none');
        }, 1000);
    });
}