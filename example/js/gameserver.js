﻿// Change here if you don't host the webInterfae on the same host as the NodeJS API
var host = window.location.hostname;
var address =`https://${host}:8090/csgoapi/v1.0`;
var maplistFile = './maplist.txt';

// Titles for throbber window.
var titles = { 
    'start': 'Starting server',
    'stop': 'Stopping server',
    'auth': 'Authenticating RCON',
    'update': 'Updating server',
    'mapchange': 'Changing map'
}
var running = false;
var authenticated = false;

// Redirect to login page.
function doLogin() {
     window.location.href = `${address}/login`;
}

// Sends a get Request with the headers needed for authentication with the seesion cookie.
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

// Load the maplist for serverstart from maplist.txt
function loadMaplist() {
    // The Maplist file can be taken from the csgo folder.
    $.get(maplistFile, (data) => {
        let lines = data.split(/\r\n|\n/);
        lines.forEach( (map) => {
            $("#mapAuswahl").append(`<option value="${map}">${map}</option>`);
        });
    });
}

// Setup the Elements according to server status.
function setupPage() {
    $('#popupCaption').text('Querying Server');
    getPromise = (path) => {
        return Promise.resolve(sendGet(`${address}/${path}`));
    }

    let loginCheck = getPromise('loginStatus');
    loginCheck.then((data) => {
        if (data.login) {
            let authenticated = getPromise('info/rconauthstatus');
            authenticated.then((data) => {
                if (data.rconauth) {
                    setupServerRunning();
                } else {
                    let serverRunning = getPromise('info/runstatus');
                    serverRunning.then((data) => {
                        if (data.running) {
                            window.location.href = './notauth.htm';
                        } else {
                            setupServerStopped();
                        }
                    });
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
    if (socket.readyState != 1) { // if websocket not connected
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
    $('#popupCaption').text(`${titles[action]}`);
    $('#popupText').text('Moment bitte!');
    $('.container-popup').css('display', 'flex');
    startMap = document.getElementById('mapAuswahl').value;

    sendGet(`${address}/control/${action}`, `startmap=${startMap}`).done(( data ) => {
        if (socket.readyState != 1) { // if websocket not connected
            if (action != 'update') {
                setupPage();
            }
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
        if (socket.readyState != 1) {
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
    $('#popupCaption').text(titles['mapchange']);
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

function authenticate (caller) {
    sendGet(`${address}/authenticate`).done((data) => {
        if (data.authenticated) {
            window.location.href = './gameserver.htm';
        } else {
            caller.disabled = true;
            $('#autherror').show('fast');
        }
    });
}
function kill(caller) {
    
    sendGet(`${address}/control/kill`).done((data) => {
        window.location.href = './gameserver.htm';
    }).fail ((error) => {
        caller.disabled = true;
        $('#killerror').show('fast');
    });
}