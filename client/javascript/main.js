const wsslink = "ws://localhost:443";


const Game = class{
    constructor(div,prefix){
        const self = this;
        self.container = div;
        self.idprefix = prefix;
        self.wss = 0;
        self.username = "";
        self.password = "";
        self.accountdata = {};
        self.loggedin = false;
        self.settingsconfigured = false;
        self.packetdelay = 0;
        self.timesync_timelimit = 0;
        self.lobbylist = {};
        self.sessionid = ["",0];
        self.inlobby = false;
        self.state = "login";
        self.inchat = false;
        self.ineditor = false;
        self.previousState = self.state;
        self.onlogin = function(){};
        self.lobbydata = {};
        self.recievepacketid = {};
        self.sendpacketid = {};
        self.recievehandler = {};
        self.pointerlobbyid = -1;
        self.pointerlobbyhaspass = false;
        self.lobbyclicktimestamp = 0;
        
    };
    unfocusAll(){
        document.activeElement.blur();
    };
    createHTML(){
        const self = this;
        self.getId("LoginForm").onsubmit = function(){
            self.username = self.getId("LoginTextbox").value;
            self.password = self.getId("LoginPasswordbox").value;
            if(!(self.username.length+self.password.length)){
                return;
            }
            self.login(self.username,self.password).then(function(data){
                if(data){
                    self.updateState("main menu");
                }
                else{
                    self.alertBox("Wrong account info.");
                }
            });
        };
        self.getId("CreateAccountForm").onsubmit = function(){
            self.username = self.getId("CreateAccountTextbox").value;
            self.password = self.getId("CreateAccountPasswordbox").value;
            if(!(self.username.length+self.password.length)){
                return;
            }
            self.createaccount(self.username,self.password).then(function(data){
                if(data){
                    self.login(self.username,self.password).then(function(data){
                        if(data){
                            self.updateState("main menu");
                        }
                        else{
                            self.alertBox("Something went wrong, but your account was created!");
                        }
                    });
                }
                else{
                    self.alertBox("Failed to create account.");
                }
            });
        };
        self.getId("AlertBoxButton").onclick = function(){
            self.getId("AlertBoxScreen").style.display = "none";
        };
        self.getId("PromptBoxButton").onclick = function(){
            self.getId("PromptBoxScreen").style.display = "none";
        };
        self.getId("MainMenuLeftColumnButtonSignOut").onclick = function(){
            self.updateState("login");
        };
        self.getId("MainMenuLeftColumnButtonLobbies").onclick = function(){
            self.updateState("lobbies");
        };
        self.getId("MainMenuLeftColumnButtonLobbiesBack").onclick = function(){
            self.updateState("main menu");
        };
        self.getId("CreateLobbyButton").onclick = function(){
            var lobbyname = self.getId("CreateLobbyName").value;
            var lobbypassword = self.getId("CreateLobbyPassword").value;
            var maxplayers = parseInt(self.getId("CreateLobbyMaxPlayers").value);
            if(self.wss){
                return;
            }
            if(maxplayers<=0 || maxplayers>8){
                self.alertBox("Max Players must be an integer between 1 and 8 inclusive.");
                return;
            }
            else if(lobbypassword.length>20){
                self.alertBox("The password cannot be more than 20 digits.");
                return;
            }
            else if(lobbyname.length<1 || lobbyname.length>35){
                self.alertBox("The roomname must be between 1 and 35 digits inclusive.");
                return;
            }
            self.createlobby(lobbyname,lobbypassword,maxplayers);
        };
        self.getId("ChatInput").onfocus = function(){
            self.inchat = true;
        };
        self.getId("ChatInput").onblur = function(){
            self.inchat = false;

        }
        self.getId("ChatInput").onkeydown = function(e){
            if(self.inchat && self.wss){
                if(e.isTrusted && e.key == "Enter"){
                    if(self.getId("ChatInput").value.length>0){
                        self.send([self.sendpacketid.chatmsg,self.getId("ChatInput").value]);
                    }
                    self.getId("ChatInput").value = "";
                    self.unfocusAll();
                }
            }
        }
        self.getId("PromptBoxInput").onkeydown = function(e){
            if(e.isTrusted && e.key == "Enter"){
                self.getId("PromptBoxButton").click();
                self.unfocusAll();
            }
        }
        document.onkeydown = function(e){
            if(!self.inchat && !self.ineditor && self.wss){
                if(e.isTrusted && e.key == "Enter"){
                    self.getId("ChatInput").focus();
                }
            }
        }
        self.getId("InLobbyLeave").onclick = function(){
            if(self.wss){
                if(self.getId("InLobbyLeave").children[0].textContent == "Sure?"){
                    self.send([0]);
                    return;
                }
                self.getId("InLobbyLeave").children[0].textContent = "Sure?";
                setTimeout(function(){self.getId("InLobbyLeave").children[0].textContent = "Leave"},500);
            }
        };
        self.getId("LobbiesLeftColumnJoinLobby").onclick = function(){
            if(self.pointerlobbyid>=0){
                if(!self.pointerlobbyhaspass){
                    self.joinlobby(self.pointerlobbyid,"");
                }
                else{
                    self.promptBox("This lobby requires a password. Enter a password below.").then(function(data){
                        self.joinlobby(self.pointerlobbyid,data);
                    });
                }
            }
        };
        self.getId("LobbiesLeftColumnRefresh").onclick = function(){
            self.displayLobbies();
        };
    };
    updateState(text){
        const self = this;
        self.previousState = self.state;
        self.unfocusAll();
        if(text){
            self.state = text;
        }
        if(self.state == "login"){
            self.getId("LoginScreen").style.display = "block";
            self.getId("MenuWrapper").style.display = "none";
        }
        else{
            self.getId("LoginScreen").style.display = "none";
            self.getId("MenuWrapper").style.display = "block";
        }
        if(self.state == "main menu"){
            self.getId("MainMenuLeftColumn").style.display = "block";
            self.getId("PlayerName").textContent = self.username;
            if(self.accountdata.skins){
                //self.getId("PlayerImage").style.backgroundColor = "rgb("+self.accountdata.skins[0].toString()+")";
            }
        }
        else{
            self.getId("MainMenuLeftColumn").style.display = "none";
        }
        if(self.state == "lobbies"){
            self.getId("LobbiesLeftColumn").style.display = "block";
            self.getId("MiddleLobbiesContainer").style.display = "block";
            self.getId("RightColumnLobbiesContainer").style.display = "block";
            self.displayLobbies();
        }
        else{
            self.getId("LobbiesLeftColumn").style.display = "none";
            self.getId("MiddleLobbiesContainer").style.display = "none";
            self.getId("RightColumnLobbiesContainer").style.display = "none";
        }
        if(self.state == "inlobby"){
            self.getId("InLobbyLeftColumn").style.display = "block";
            self.getId("ChatContainer").style.display = "block";
            self.resetLobby();
        }
        else{
            self.getId("InLobbyLeftColumn").style.display = "none";
            self.getId("ChatContainer").style.display = "none";
        }
    };
    sanitize(text){
        return text.replace(/&/g, '&amp;').replace(/>/g, '&gt;').replace(/</g, '&lt;');
    }
    alertBox(text){
        const self = this;
        if(self.getId("AlertBoxScreen").style.display!="block"){
            self.getId("AlertBoxText").textContent = text;
            self.getId("AlertBoxScreen").style.display = "block";
            self.unfocusAll();
        }
    };
    async promptBox(text){
        const self = this;
        self.getId("PromptBoxText").textContent = text;
        self.getId("PromptBoxScreen").style.display = "block";
        self.getId("PromptBoxInput").value = "";
        self.unfocusAll();
        return new Promise(function(res,rej){
            self.getId("PromptBoxButton").addEventListener('click',function(e) {
                res(self.getId("PromptBoxInput").value);
            }, {once: true})
        });
    }
    displayChatMessage(username,text){
        const self = this;
        var chatelement = document.createElement("div");
        chatelement.classList = "ChatMessage";
        var usernameelement = document.createElement("div");
        usernameelement.textContent = username+" : ";
        usernameelement.classList = "ChatUsername";
        var textelement = document.createElement("div");
        textelement.textContent = text;
        textelement.classList = "ChatText";
        var line = document.createElement("div");
        line.classList = "ChatLine";

        var scrolldown = false;
        if(Math.abs(self.getId("ChatMessagesContainer").scrollHeight-self.getId("ChatMessagesContainer").clientHeight-self.getId("ChatMessagesContainer").scrollTop)<1){
            scrolldown = true;
        }
        chatelement.appendChild(line);
        chatelement.appendChild(usernameelement);
        chatelement.appendChild(textelement);
        self.getId("ChatMessagesContainer").appendChild(chatelement);
        if(scrolldown){
            self.getId("ChatMessagesContainer").scrollTop = self.getId("ChatMessagesContainer").scrollHeight;
        }
    };
    async displayLobbies(){
        const self = this;
        var lobbies = await self.getlobbylist();
        var keys = Object.keys(lobbies);
        while(self.getId("MiddleLobbiesList").children.length){
            self.getId("MiddleLobbiesList").removeChild(self.getId("MiddleLobbiesList").firstChild);
        }
        if(keys.length == 0){
            self.getId("MiddleLobbiesMiddleTextContainer").style.display = "block";
            return;
        }
        else{
            self.getId("MiddleLobbiesMiddleTextContainer").style.display = "none";
        }
        for(var i = 0;i<keys.length;i++){
            var element = document.createElement("div");
            element.lobbyid = keys[i];
            element.haspass = lobbies[keys[i]].haspass;
            element.classList = "LobbyElement";
            var lobbyname = document.createElement("div");
            lobbyname.classList = "LobbyName";
            lobbyname.textContent = lobbies[keys[i]].lobbyname;
            var players = document.createElement("div");
            players.classList = "LobbyPlayers";
            players.textContent = lobbies[keys[i]].players+"/"+lobbies[keys[i]].maxplayers;

            var password = document.createElement("div");
            password.classList = "LobbyPassword";
            password.textContent = (lobbies[keys[i]].haspass?"Passworded":"No Password");

            element.appendChild(lobbyname);
            element.appendChild(players);
            element.appendChild(password);

            element.onclick = function(){
                if(this.lobbyid == self.pointerlobbyid){
                    if(Date.now()-self.lobbyclicktimestamp<500){
                        if(!this.haspass){
                            self.promptBox("This lobby requires a password. Enter a password below.").then(function(data){
                                self.joinlobby(self.pointerlobbyid,data);
                            });
                            return;
                        }
                        else{
                            self.promptBox("This lobby requires a password. Enter a password below.").then(function(data){
                                self.joinlobby(self.pointerlobbyid,data);
                            });
                        }
                    }
                }
                self.lobbyclicktimestamp = Date.now();
                self.pointerlobbyhaspass = this.haspass;
                self.pointerlobbyid = this.lobbyid;
                for(var i = 0;i<self.getId("MiddleLobbiesList").children.length;i++){
                    if(self.getId("MiddleLobbiesList").children[i].lobbyid == self.pointerlobbyid){
                        self.getId("MiddleLobbiesList").children[i].style.backgroundColor = "white";
                    }
                    else{
                        self.getId("MiddleLobbiesList").children[i].style.backgroundColor = "#a4aa97";
                    }
                }
            };

            self.getId("MiddleLobbiesList").appendChild(element);
        }
    }
    displayPlayerAction(username,action,action2=""){
        const self = this;
        var chatelement = document.createElement("div");
        chatelement.classList = "ChatMessage";
        var textelement = document.createElement("div");
        textelement.textContent = username+" has "+action+" the lobby"+action2+".";
        textelement.classList = "ChatAction";

        var scrolldown = false;
        if(Math.abs(self.getId("ChatMessagesContainer").scrollHeight-self.getId("ChatMessagesContainer").clientHeight-self.getId("ChatMessagesContainer").scrollTop)<1){
            scrolldown = true;
        }
        chatelement.appendChild(textelement);
        self.getId("ChatMessagesContainer").appendChild(chatelement);
        if(scrolldown){
            self.getId("ChatMessagesContainer").scrollTop = self.getId("ChatMessagesContainer").scrollHeight;
        }
    };
    getId(id){
        const self = this;
        return document.getElementById(self.idprefix+id);
    };
    resetLobby(){
        const self = this;
        while(self.getId("ChatMessagesContainer").children.length){
            self.getId("ChatMessagesContainer").removeChild(self.getId("ChatMessagesContainer").firstChild);
        }
        while(self.getId("MiddleLobbiesList").children.length){
            self.getId("MiddleLobbiesList").removeChild(self.getId("MiddleLobbiesList").firstChild);
        }
    };
    setuprecievehandler(){
        const self = this;
        self.recievehandler[self.recievepacketid.disconnect] = function(jsondata){
            self.alertBox("You left the lobby.");
            self.updateState(self.previousState);
            self.disconnect();
        };
        self.recievehandler[self.recievepacketid.roomjoin] = function(jsondata){};
        self.recievehandler[self.recievepacketid.roomcreate] = function(jsondata){};
        self.recievehandler[self.recievepacketid.movementinputs] = function(jsondata){};
        self.recievehandler[self.recievepacketid.gamestart] = function(jsondata){};
        self.recievehandler[self.recievepacketid.gameend] = function(jsondata){};
        self.recievehandler[self.recievepacketid.chatmsg] = function(jsondata){
            self.displayChatMessage(self.lobbydata.playerids[jsondata[0]].username,jsondata[1]);
        };
        self.recievehandler[self.recievepacketid.playerjoin] = function(jsondata){
            self.lobbydata.playerids[jsondata[0].id] = jsondata[0];
            self.displayPlayerAction(jsondata[0].username,"joined");
        };
        self.recievehandler[self.recievepacketid.timesync] = function(jsondata){
            self.packetdelay = jsondata[0];
            self.send([self.sendpacketid.timesync])
        };
        self.recievehandler[self.recievepacketid.playerleaves] = function(jsondata){
            var username = self.lobbydata.playerids[jsondata[0]].username;
            delete self.lobbydata.playerids[jsondata[0]];
            var host = self.lobbydata.hostid;
            self.lobbydata.hostid = jsondata[1];
            if(jsondata[1] == host){
                self.displayPlayerAction(username,"left");
            }
            else{
                self.displayPlayerAction(username,"left"," and "+self.lobbydata.playerids[self.lobbydata.hostid].username+" is now the host");
            }
            if(self.lobbydata.myid == jsondata[1]){
                self.lobbydata.ishost = true;
            }
            else{
                self.lobbydata.ishost = false;
            }
        };
        self.recievehandler[self.recievepacketid.mapload] = function(jsondata){};
        self.recievehandler[self.recievepacketid.playerlist] = function(jsondata){
            self.lobbydata.myid = jsondata[0];
            self.lobbydata.hostid = jsondata[1];
            if(jsondata[0] == jsondata[1]){
                self.lobbydata.ishost = true;
            }
            else{
                self.lobbydata.ishost = false;
            }
            self.lobbydata.ingame = jsondata[2];
            self.lobbydata.gamestarttimestamp = jsondata[3];
            var playeridlist = jsondata[4];
            for(var i = 0;i<playeridlist.length;i++){
                self.lobbydata.playerids[playeridlist[i].id] = playeridlist[i];
            }
            self.updateState("inlobby");
        };
        self.recievehandler[self.recievepacketid.error] = function(jsondata){
            if(jsondata[0] == self.sendpacketid.roomcreate){
                self.updateState(self.previousState);
                self.alertBox("Failed to create lobby.");
                self.disconnect();
            }
            else if(jsondata[0] == self.sendpacketid.roomjoin){
                self.updateState(self.previousState);
                self.alertBox("Failed to join lobby.");
                self.disconnect();
            }
        };
        self.recievehandler[self.recievepacketid.ratelimit] = function(jsondata){};
        self.recievehandler[self.recievepacketid.login] = function(jsondata){
            self.onlogin();
        };
    };
    resetlobbydata(){
        const self = this;
        self.lobbydata = {"ishost":false,"playerids":{},"mapdata":{},"ingame":false,"rounds":0,"teamson":false,"myid":0,"hostid":0,"gamestarttimestamp":0};
    };
    async fetchpacketids(){
        const self = this;
        var error = false;
        self.postjson({"type":"getsettings"}).then(function(settings){
            if(settings.success){
                self.settingsconfigured = true;
                self.recievepacketid = settings.recievepacketid;
                self.sendpacketid = settings.sendpacketid;
                self.timesync_timelimit = settings.timesync_timelimit;
                self.setuprecievehandler();
            }
        }).catch(function(){
            error = true;
        });
        return !error;
    }
    setup(){
        const self = this;
        self.fetchpacketids();
        self.createHTML();
        self.updateState();
    };
    async postjson(jsondata){
        const self = this;
        return fetch("", {method: 'POST',body: JSON.stringify(jsondata)}).then(function(e){
            return e.json();
        });
    };
    async login(username,password){
        const self = this;
        var error = false;
        await self.postjson({"type":"login","username":username,"password":password,"createaccount":false}).then(function(jsondata){
            if(jsondata.success){
                self.sessionid = jsondata.sessionid;
                self.loggedin = true;
                self.getaccountdata(username,self.sessionid[0]);
            }
            else{
                error = true;
            }
        }).catch(function(){
            error = true;
        });
        return !error;
    };
    async createaccount(username,password){
        const self = this;
        var error = false;
        await self.postjson({"type":"login","username":username,"password":password,"createaccount":true}).then(function(jsondata){
            if(!jsondata.success){
                error = true;
            }
        }).catch(function(){
            error = true;
        });
        return !error;
    };
    async getaccountdata(username,sessionid){
        const self = this;
        var error = false;
        await self.postjson({"type":"getaccountdata","username":username,"sessionid":sessionid}).then(function(jsondata){
            if(jsondata.success){
                self.accountdata = jsondata.accountdata;
            }
            else{
                error = true;
            }
        }).catch(function(){
            error = true;
        });
        if(error){
            return false;
        };
        return self.accountdata;
    };
    async getlobbylist(){
        const self = this;
        var error = false;
        await self.postjson({"type":"lobbylist"}).then(function(jsondata){
            if(jsondata.success){
                self.lobbylist = jsondata.lobbylist;
            }
            else{
                error = true;
            }
        }).catch(function(){
            error = true;
        });
        if(error){
            return false;
        };
        return self.lobbylist;
    };
    disconnect(){
        const self = this;
        self.send([self.sendpacketid.disconnect]);
        self.inlobby = false;
        self.resetlobbydata();
        self.wss = 0;
    }
    send(jsondata){
        const self = this;
        if(self.wss!=0 && self.wss.readyState == 1){
            console.log(JSON.stringify(jsondata));
            self.wss.send(JSON.stringify(jsondata));
        }
    }
    recieve(jsondata){
        const self = this;
        if(!Array.isArray(jsondata)){
            self.disconnect();
            return;
        }
        else if(jsondata.length == 0){
            self.disconnect();
            return;
        }
        else if(Object.keys(self.recievehandler).includes(jsondata[0])){
            self.disconnect();
            return;
        }
        console.log(jsondata);
        self.recievehandler[jsondata[0]](jsondata.slice(1));
    }
    joinlobby(lobbyid,pass){
        const self = this;
        if(self.wss || !self.loggedin || !Number.isInteger(parseInt(lobbyid))){
            return false;
        }
        self.startwss();
        self.onlogin = function(){
            self.send([self.sendpacketid.roomjoin,parseInt(lobbyid),pass]);
        };
        return true;
    };
    createlobby(lobbyname,pass,maxplayers){
        const self = this;
        if(self.wss || !self.loggedin){
            return false;
        }
        self.startwss();
        self.onlogin = function(){
            self.send([self.sendpacketid.roomcreate,lobbyname,pass,maxplayers]);
        };
        return true;
    };
    startwss(onopenfunction = function(){}){
        const self = this;
        var wss = new WebSocket(wsslink);
        wss.onmessage = function(packet){
            try{
                var jsondata = JSON.parse(packet.data);
                self.recieve(jsondata);
            }
            catch(err){
                console.log(err);
                self.disconnect();
            }
        };
        wss.onerror = function(err){
            console.log(err);
            self.disconnect();
        };
        wss.onclose = function(){
            self.disconnect();
        };
        wss.onopen = function(){
            self.wss = wss;
            self.resetlobbydata();
            self.send([self.sendpacketid.login,self.accountdata.username,self.sessionid[0]]);
        };
    };
};

var game = new Game(document.getElementById("GameDiv"),"");
game.setup();
