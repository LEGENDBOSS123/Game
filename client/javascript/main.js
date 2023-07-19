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
        self.onlogin = function(){};
        self.lobbydata = {};
        self.recievepacketid = {};
        self.sendpacketid = {};
        self.recievehandler = {};
        
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
            console.log("E")
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
    };
    updateState(text){
        const self = this;
        self.unfocusAll();
        if(text){
            self.state = text;
        }
        if(self.state == "login"){
            self.getId("LoginScreen").style.display = "block";
        }
        else{
            self.getId("LoginScreen").style.display = "none";
        }
        if(self.state == "main menu"){
            self.getId("MenuWrapper").style.display = "block";
            self.getId("PlayerName").textContent = self.username;
            if(self.accountdata.skins){
                self.getId("PlayerImage").style.backgroundColor = "rgb("+self.accountdata.skins[0].toString()+")";
            }
        }
        else{
            self.getId("MenuWrapper").style.display = "none";
        }
    };
    alertBox(text){
        const self = this;
        self.getId("AlertBoxText").textContent = text;
        self.getId("AlertBoxScreen").style.display = "block";
        self.unfocusAll();
    };
    getId(id){
        const self = this;
        return document.getElementById(self.idprefix+id);
    };
    setuprecievehandler(){
        const self = this;
        self.recievehandler[self.recievepacketid.disconnect] = function(jsondata){
            self.disconnect();
        };
        self.recievehandler[self.recievepacketid.roomjoin] = function(jsondata){};
        self.recievehandler[self.recievepacketid.roomcreate] = function(jsondata){};
        self.recievehandler[self.recievepacketid.movementinputs] = function(jsondata){};
        self.recievehandler[self.recievepacketid.gamestart] = function(jsondata){};
        self.recievehandler[self.recievepacketid.gameend] = function(jsondata){};
        self.recievehandler[self.recievepacketid.chatmsg] = function(jsondata){};
        self.recievehandler[self.recievepacketid.playerjoin] = function(jsondata){
            self.lobbydata.playerids[jsondata[0].id] = jsondata[0];
        };
        self.recievehandler[self.recievepacketid.timesync] = function(jsondata){
            self.packetdelay = jsondata[0];
            self.send([self.sendpacketid.timesync])
        };
        self.recievehandler[self.recievepacketid.playerleaves] = function(jsondata){
            delete self.lobbydata.playerids[jsondata[0]];
            self.lobbydata.hostid = jsondata[1];
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
        };
        self.recievehandler[self.recievepacketid.error] = function(jsondata){};
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
        if(self.wss || !self.loggedin){
            return false;
        }
        self.startwss();
        self.onlogin = function(){
            self.send([self.sendpacketid.roomjoin,lobbyid,pass]);
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
