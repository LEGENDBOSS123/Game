const http = require("http");
const fs = require("fs");
const fsp = fs.promises;
const websocket = require("ws");
const crypto = require("crypto");



const host = "0.0.0.0";
const port = 80;
//const wsslink = "ws://localhost:443";
const wssport = 8081;
const wsslink = "ws://localhost:"+wssport;







const alldirectories = ["/data","/accounts"];
const allfiles = ["/data/maxaccountid"];
const loadAllFiles = function(){
    for(var i = 0;i<alldirectories.length;i++){
        fs.mkdirSync(__dirname+alldirectories[i],{recursive:true});
    }
    for(var i = 0;i<allfiles.length;i++){
        fs.openSync(__dirname+allfiles[i],"a+");
    }
};
loadAllFiles();
/*
------------------------------------------------
PACKET LIST FOR SERVER TO SEND:

0: disconnect            [ 0 ]

1: room join             [ 1 , room id]

2: room create           

3: movement inputs

4: game start

5: game end

6: chat message

7: player joins          [ 7 , player id , username , experience , team , skin ]

8: timesync              [ 8 , ]

9: player leaves          [ 9 , leaving player id , new host id ]

10: map load

11: player list

12: error                [ 12 , packet id of error that client sent ]

13: lobby list

14: login
 ------------------------------------------------
PACKET LIST FOR SERVER TO RECIEVE:

0: disconnect

1: room join

2: room create

3: movement inputs

4: game start

5: game end

6: chat message

7: timesync

8: player leaves

9: map load

10: lobby list

11: log in
------------------------------------------------
*/
const contenttypes = {"html":"text/html","css":"text/css","js":"text/javascript"};
const timesync_timelimit = 5000;
const sendpacketid = {
    disconnect: 0,
    roomjoin: 1,
    roomcreate: 2,
    movementinputs: 3,
    gamestart: 4,
    gameend: 5,
    chatmsg: 6,
    playerjoin: 7,
    timesync: 8,
    playerleaves: 9,
    mapload: 10,
    playerlist: 11,
    error: 12,
    ratelimit:13,
    login: 14
};
const recievepacketid = {
    disconnect: 0,
    roomjoin: 1,
    roomcreate: 2,
    movementinputs: 3,
    gamestart: 4,
    gameend: 5,
    chatmsg: 6,
    timesync: 7,
    playerleaves: 8,
    mapload: 9,
    login: 11
};

const acceptable_username_char = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"," ","1","2","3","4","5","6","7","8","9","0","_"];
const notacceptable_username_char = ["  "];

const typechecker = {};
typechecker[recievepacketid.disconnect] = [];
typechecker[recievepacketid.roomjoin] = [Number,String];
typechecker[recievepacketid.roomcreate] = [String,String,Number];
typechecker[recievepacketid.movementinputs] = [Number,Number,Number];
typechecker[recievepacketid.gamestart] = [];
typechecker[recievepacketid.gameend] = [];
typechecker[recievepacketid.chatmsg] = [String];
typechecker[recievepacketid.timesync] = [];
typechecker[recievepacketid.playerleaves] = [];
typechecker[recievepacketid.mapload] = [];
typechecker[recievepacketid.login] = [String,String];

const lobby = class{
    constructor(){
        const self = this;
        self.playerids = {};
        self.hostid = 0;
        self.teamson = false;
        self.teamslocked = false;
        self.maxplayers = 0;
        self.lobbypassword = "";
        self.lobbyname = "";
        self.map = {};
        self.ingame = false;
        self.currentframe = 0;
        self.lobbyid = -1;
        self.gamestarttimestamp = 0;
        self.ticspersecond = 20;

    };
    broadcast(jsondata,exceptions=[]){
        const self = this;
        var values = Object.values(self.playerids);
        for(var i = 0;i<values.length;i++){
            if(!exceptions.includes(values[i])){
                values[i].send(jsondata);
            }
        }
    };
    playerleft(playerid){
        const self = this;
        var washost = (playerid == self.hostid);
        self.playerids[playerid].reset(); 
        delete self.playerids[playerid]; 
        var keys = Object.keys(self.playerids);
        if(keys.length == 0){
            self.close();
            return;
        }    
        if(washost){
            self.hostid = parseInt(keys[0]);
            self.playerids[keys[0]].ishost = true;
        }
        self.broadcast([sendpacketid.playerleaves,playerid,self.hostid,self.currentframe]);
    };
    playerjoin(player){
        const self = this;
        var keys = Object.keys(self.playerids);
        if(keys.length<self.maxplayers){
            if(keys.length == 0){
                player.ishost = true;
                player.playerid = 0;
                player.lobby = self;
                self.hostid = 0;
            }
            else{
                for(var i = 0;i<keys.length;i++){
                    if(player.accountid == self.playerids[keys[i]].accountid){
                        player.send([sendpacketid.error,recievepacketid.roomjoin]);
                        return;
                    }
                }
                player.ishost = false;
                for(var i = 0;i<Math.max(...keys)+2;i++){
                    if(!self.playerids[i]){
                        player.playerid = i;
                        break;
                    }
                }
                player.lobby = self;
            }
            self.playerids[player.playerid] = player;
            self.broadcast([sendpacketid.playerjoin,player.json()],[player]);
            var playerlist = [];
            var keys = Object.keys(self.playerids);
            for(var i = 0;i<keys.length;i++){
                playerlist.push(self.playerids[keys[i]].json());
            }
            player.send([sendpacketid.playerlist,player.playerid,self.hostid,self.ingame,self.gamestarttimestamp,playerlist]);
        }
        else{
            player.send([sendpacketid.error,recievepacketid.roomjoin]);
        }
    };
    findid(lobbies){
        const self = this;
        crypto.randomBytes(16);
        var maxid = -1;
        for(var i = 0;i<lobbies.length;i++){
            if(lobbies[i].lobbyid>maxid){
                maxid = lobbies[i].lobbyid;
            }
        }
        return maxid+1;

    };
    close(){
        const self = this;
        lobbies.splice(lobbies.indexOf(self),1);
    };

};

const player = class{
    constructor(){
        const self = this;
        self.username = "";
        self.experience = 0;
        self.team = 1;
        self.lobby = 0;
        self.skin = [0,0,0];
        self.lasttimesync = -1;
        self.lasttimesyncsent = -1;
        self.packetdelay = 0;
        self.accountid = -1;
        self.ishost = false;
        self.wss = 0;
        self.loggedin = false;
        self.lobby = 0;
        self.playerid = -1;
        self.ticspersecond = 20;
        self.ratelimits = {};
        self.recievehandler = {};
        
        self.ratelimits[recievepacketid.disconnect] = new ratelimit();
        self.recievehandler[recievepacketid.disconnect] = function(jsondata){
            self.disconnect();
            return;
        };

        self.ratelimits[recievepacketid.roomjoin] = new ratelimit();
        self.recievehandler[recievepacketid.roomjoin] = function(jsondata){
            if(self.lobby || !self.loggedin){
                self.send([sendpacketid.error,recievepacketid.roomjoin]);
                return;
            }
            for(var i = 0;i<lobbies.length;i++){
                if(lobbies[i].lobbyid == jsondata[0]){
                    if(lobbies[i].lobbypassword == jsondata[1]){
                        lobbies[i].playerjoin(self);
                    }
                    else{
                        self.send([sendpacketid.error,recievepacketid.roomjoin]);
                    }
                    return;
                }
            }
            self.send([sendpacketid.error,recievepacketid.roomjoin]);
        };

        self.ratelimits[recievepacketid.roomcreate] = new ratelimit();
        self.recievehandler[recievepacketid.roomcreate] = function(jsondata){
            if(self.lobby || !self.loggedin){
                self.send([sendpacketid.error,recievepacketid.roomcreate]);
                return;
            }
            if((jsondata[0].length<1 || jsondata[0].length>35) || (jsondata[1].length<0 || jsondata[1].length>20) || (jsondata[2]<1 || jsondata[2]>8 || !Number.isInteger(jsondata[2]))){
                self.send([sendpacketid.error,recievepacketid.roomcreate]);
                return;
            }
            var newlobby = new lobby();
            newlobby.lobbyname = jsondata[0];
            newlobby.lobbypassword = jsondata[1];
            newlobby.maxplayers = jsondata[2];
            newlobby.lobbyid = newlobby.findid(lobbies);
            newlobby.playerjoin(self);
            lobbies.push(newlobby);
        };

        self.ratelimits[recievepacketid.movementinputs] = new ratelimit(60,1000);
        self.recievehandler[recievepacketid.movementinputs] = function(jsondata){
            if(!self.lobby){
                self.send([sendpacketid.error,recievepacketid.movementinputs]);
                return;
            }
            if(!self.lobby.ingame || Math.abs(self.lobby.currentframe-jsondata[1])>3){
                self.send([sendpacketid.error,recievepacketid.movementinputs]);
                return;
            }
            self.broadcast([sendpacketid.movementinputs,self.playerid,jsondata[0],jsondata[1]],[self]);
        };

        self.ratelimits[recievepacketid.gamestart] = new ratelimit(1,3000);
        self.recievehandler[recievepacketid.gamestart] = function(jsondata){};

        self.ratelimits[recievepacketid.gameend] = new ratelimit(1,500);
        self.recievehandler[recievepacketid.gameend] = function(jsondata){};

        self.ratelimits[recievepacketid.chatmsg] = new ratelimit(4,3000,500,4);
        self.recievehandler[recievepacketid.chatmsg] = function(jsondata){
            if(!self.lobby){
                self.send([sendpacketid.error,recievepacketid.chatmsg]);
                return;
            }
            self.broadcast([sendpacketid.chatmsg,self.playerid,jsondata[0].substring(0,400)])
        };

        self.ratelimits[recievepacketid.timesync] = new ratelimit(2,timesync_timelimit);
        self.recievehandler[recievepacketid.timesync] = function(jsondata){
            if(!self.loggedin || !self.lobby){
                self.send([sendpacketid.error,recievepacketid.timesync]);
                return;
            }
            self.packetdelay = Date.now()-self.lasttimesyncsent;
            self.lasttimesync = Date.now();
        };

        self.ratelimits[recievepacketid.playerleaves] = new ratelimit();
        self.recievehandler[recievepacketid.playerleaves] = function(jsondata){
            if(!self.lobby){
                self.send([sendpacketid.error,recievepacketid.playerleaves]);
                return;
            }
            self.disconnect();
        };

        self.ratelimits[recievepacketid.mapload] = new ratelimit(3,2000);
        self.recievehandler[recievepacketid.mapload] = function(jsondata){};

        self.ratelimits[recievepacketid.login] = new ratelimit();
        self.recievehandler[recievepacketid.login] = function(jsondata){
            if(self.loggedin){
                self.send([sendpacketid.error,recievepacketid.login]);
                return;
            }
            if(jsondata[0].length<4 || jsondata[0].length>18){
                self.send([sendpacketid.error,recievepacketid.login]);
                return;
            }
            fm.validate_sessionid(jsondata[0],jsondata[1]).then(function(success){
                if(success.success){
                    fm.getaccountdata(jsondata[0]).then(function(data){
                        if(data.success){
                            self.accountid = data.accountdata.accountid;
                            self.username = data.accountdata.username;
                            self.experience = data.accountdata.info.experience;
                            self.skin = data.accountdata.info.skins;
                            self.loggedin = true;
                            self.send([sendpacketid.login]);
                        }
                        else{
                            self.send([sendpacketid.error,recievepacketid.login]);
                        }
                    });
                }
                else{
                    self.send([sendpacketid.error,recievepacketid.login]);
                }
            });
        };
    };
    start_timesync_timer(){
        const self = this;
        if(!self.wss){
            return;
        }
        if(self.lasttimesync == -1){
            self.lasttimesync = Date.now()+timesync_timelimit;
        }
        else{
            if(Date.now()-self.lasttimesync>timesync_timelimit*2){
                self.disconnect();
                return;
            }
            self.send([sendpacketid.timesync,self.packetdelay]);
            self.lasttimesyncsent = Date.now();
        }
        setTimeout(self.start_timesync_timer.bind(self),timesync_timelimit);
    }
    json(){
        const self = this;
        return {"id":self.playerid,"team":self.team,"username":self.username,"experience":self.experience,"skin":self.skin};
    };
    reset(){
        const self = this;
        self.lobby = 0;
        self.team = 1;
        self.ishost = false;
        self.playerid = -1;
    }
    
    validate_packet(packet,types){
        const self = this;
        if(types.length != packet.length){
            return false;
        }
        for(var i = 0;i<types.length;i++){
            if(Array.isArray(types[i])){
                if(!self.validate_packet(packet[i],types[i])){
                    return false;
                }
            }
            else if(packet[i]?.constructor != types[i]){
                return false;
            }
            
        }
        return true;
    };
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
        else if(!self.validate_packet(jsondata.slice(1),typechecker[jsondata[0]])){
            self.disconnect();
            return;
        }
        if(self.ratelimits[jsondata[0]].call()){
            self.recievehandler[jsondata[0]](jsondata.slice(1));
        }
        else{
            self.send([sendpacketid.ratelimit,jsondata[0]]);
        }
    };
    send(jsondata){
        const self = this;
        if(self.wss!=0 && self.wss.readyState == 1){
            self.wss.send(JSON.stringify(jsondata));
        }
    };
    broadcast(jsondata,exceptions=[]){
        const self = this;
        if(self.lobby!=0){
            self.lobby.broadcast(jsondata,exceptions);
        }
    };
    left(){
        const self = this;
        if(self.lobby!=0){
            self.lobby.playerleft(self.playerid);
        }
    };
    disconnect(){
        const self = this;
        self.left();
        if(self.wss!=0){
            self.send([sendpacketid.disconnect]);
            self.wss.close();
            self.wss = 0;
        }
    };
};

const filemanager = class{
    constructor(){
        const self = this;
        self.filequeue = [];
    };
    sampleaccountdata(){
        const self = this;
        return {"username":"","hashedpassword":{},"accountid":0,"sessionid":["",0],"info":{"username":"","accountid":0,"experience":0,"skins":[],"friends":[]}};
    };
    generatesalt(length){
        const self = this;
        return crypto.randomBytes(Math.ceil(length/2)).toString("hex").slice(0,length);
    };
    hashpassword(password,salt){
        var hash = crypto.createHmac("sha512",salt);
        hash.update(password);
        var value = hash.digest("base64");
        return {"salt":salt,"hashedpassword":value}
    };
    salthashpassword(password){
        const self = this;
        var salt = self.generatesalt(16);
        return self.hashpassword(password,salt);
    };
    validate_string(string){
        for(var i = 0;i<string.length;i++){
            if(!acceptable_username_char.includes(string[i]) || notacceptable_username_char.includes(string[i])){
                return false;
            }
        }
        return true;
    }
    async writeaccount(accountdata){
        const self = this;
        var error = false;
        await fsp.writeFile(__dirname+"/accounts/"+accountdata.username.toLowerCase(),JSON.stringify(accountdata)).catch(function(){
            error = true;
        });
        return !error;
    };
    async validate_sessionid(username,sessionid){
        const self = this;
        var error = false;
        await fsp.readFile(__dirname+"/accounts/"+username.toLowerCase()).then(async function(accountdata){
            accountdata = JSON.parse(accountdata);
            if(Date.now()>accountdata.sessionid[1]){
                accountdata.sessionid = ["",0];
            }
            if(accountdata.sessionid[0] != sessionid){
                error = true;
            }
        }).catch(function(){
            error = true;
        });
        if(error){
            return {"success":false};
        }
        return {"success":true};
    };
    generatesessionid(){
        const self = this;
        return [crypto.randomBytes(16).toString("base64"),Date.now()+10*60*1000];
    };
    async getaccountdata(username){
        const self = this;
        var error = false;
        var accountdata = {};
        if(!self.validate_string(username.toLowerCase())){
            return {"success":false};
        }
        await fsp.readFile(__dirname+"/accounts/"+username.toLowerCase()).then(function(accountdata2){
            accountdata = JSON.parse(accountdata2);
        }).catch(function(){
            error = true;
        });
        if(error){
            return {"success":false};
        }
        return {"success":true,"accountdata":accountdata};
    };
    async createaccount(username,password){
        const self = this;
        var error = false;
        if(!self.validate_string(username.toLowerCase())){
            return {"success":false};
        }
        await fsp.readdir(__dirname+"/accounts").then(async function(files){
            for(var i = 0;i<files.length;i++){
                if(files[i].toLowerCase() == username.toLowerCase()){
                    error = true;
                    return;
                }
            }
            if(files.length>6){
                error = true;
                return;
            }
            var accountdata = self.sampleaccountdata();
            accountdata.username = username;
            accountdata.info.username = username;
            accountdata.accountid = 0;
            accountdata.info.accountid = 0;
            await fsp.readFile(__dirname+"/data/maxaccountid").then(async function(data){
                var maxaccountid = JSON.parse(data);
                accountdata.accountid = maxaccountid.maxaccountid;
                accountdata.info.accountid = maxaccountid.maxaccountid;
                maxaccountid.maxaccountid+=1;
                await fsp.writeFile(__dirname+"/data/maxaccountid",JSON.stringify(maxaccountid)).catch(function(){
                    error = true;
                });
            }).catch(function(){
                error = true;
            });
            if(error){
                return;
            }
            accountdata.hashedpassword = self.salthashpassword(password);
            var writed = await self.writeaccount(accountdata);
            if(!writed){
                error = true;
            }

        }).catch(function(){
            error = true;
        });
        if(error){
            return {"success":false};
        }
        return {"success":true};
    };
    async loginaccount(username,password){
        const self = this;
        var error = false;
        if(!self.validate_string(username.toLowerCase())){
            return {"success":false};
        }
        var sessionid = ["",0];
        await fsp.readFile(__dirname+"/accounts/"+username.toLowerCase()).then(async function(accountdata){
            accountdata = JSON.parse(accountdata);
            if(accountdata.hashedpassword.hashedpassword == self.hashpassword(password,accountdata.hashedpassword.salt).hashedpassword){
                if(Date.now()>accountdata.sessionid[1]){
                    accountdata.sessionid = ["",0];
                }
                if(accountdata.sessionid[0].length == 0){
                    accountdata.sessionid = self.generatesessionid();
                }
                sessionid = accountdata.sessionid;
                var writed = await self.writeaccount(accountdata);
                if(!writed){
                    error = true;
                }
            }
            else{
                error = true;
            }
        }).catch(function(){
            error = true;
        });
        if(error){
            return {"success":false};
        }
        return {"success":true,"sessionid":sessionid};
    };
};

const ratelimit = class{
    constructor(maxcount = -1,time = 0,punish = 0,maxpunish=0,invert = false){
        const self = this;
        self.maxcount = maxcount;
        self.time = time;
        self.invert = invert;
        self.punish = punish;
        self.maxpunish = maxpunish;
        self.punishtime = 0;
        self.lasttimestamp = 0;
        self.count = 0;
    };
    call(){
        const self = this;
        if(self.maxcount == -1){
            return true;
        }
        if(Date.now()-this.lasttimestamp>self.time+Math.min(self.punishtime,self.maxpunish*self.punish)){
            this.lasttimestamp = Date.now();
            self.count = 0;
            self.punishtime = 0;
        }
        self.count+=1;
        if(self.count>self.maxcount){
            self.punishtime+=self.punish;
            return false;
        }
        return true;
    };
};


var lobbies = [];
var fm = new filemanager();

const requestListener = function(req,res){
    console.log(req);
    if(req.method == "GET"){
        var url = "/../client";
        if(req.url == "/"){
            url += "/index.html";
        }
        else{
            url += req.url.replaceAll("..","");
        }
        fsp.readFile(__dirname+url).then(function(data){
            var splitted = url.split(".");
            var extension = splitted[splitted.length-1];
            if(Object.keys(contenttypes).includes(extension)){
                res.setHeader("Content-Type",contenttypes[extension]);
                res.end(data);
            }
            else{
                res.setHeader("Content-Type","text/html");
                res.end();
            }
        }).catch(function(){
            res.setHeader("Content-Type","text/html");
            res.end();
        });
    }
    else if(req.method == "POST"){
        var body = "";
        req.on("data",function(data){
            body+=data;
            if(body.length>1000){
                res.setHeader("Content-Type","text/json");
                res.end(JSON.stringify({"success":false}));
            }
        });
        req.on("end",function(){
            try{
                body = JSON.parse(body);
            }
            catch{
                res.setHeader("Content-Type","text/json");
                res.end(JSON.stringify({"success":false}));
            }
            if(body.type == "login"){
                if(!body.username || !(body.createaccount===true || body.createaccount===false) || !body.password){
                    res.setHeader("Content-Type","text/json");
                    res.end(JSON.stringify({"success":false}));
                    return;
                }
                else if((body.username.length<3 || body.username.length>18) || (body.password.length<4 || body.password.length>20)){
                    res.setHeader("Content-Type","text/json");
                    res.end(JSON.stringify({"success":false}));
                    return;
                }
                if(body.createaccount){
                    fm.createaccount(body.username,body.password).then(function(success){
                        res.setHeader("Content-Type","text/json");
                        res.end(JSON.stringify(success));
                    });
                }
                else{
                    fm.loginaccount(body.username,body.password).then(function(success){
                        res.setHeader("Content-Type","text/json");
                        res.end(JSON.stringify(success));
                    });
                }
            }
            else if(body.type == "lobbylist"){
                var lobbydict = {};
                for(var i = 0;i<lobbies.length;i++){
                    lobbydict[lobbies[i].lobbyid] = {"lobbyname":lobbies[i].lobbyname,"players":Object.keys(lobbies[i].playerids).length,"maxplayers":lobbies[i].maxplayers,"haspass":(lobbies[i].lobbypassword.length>0)};
                }
                res.setHeader("Content-Type","text/json");
                res.end(JSON.stringify({"success":true,"lobbylist":lobbydict}));
            }
            else if(body.type == "getaccountdata"){
                if(!body.username || !body.sessionid){
                    res.setHeader("Content-Type","text/json");
                    res.end(JSON.stringify({"success":false}));
                    return;
                }
                fm.validate_sessionid(body.username,body.sessionid).then(function(success){
                    if(success.success){
                        fm.getaccountdata(body.username).then(function(data){
                            if(data.success){
                                res.setHeader("Content-Type","text/json");
                                res.end(JSON.stringify({"success":true,"accountdata":data.accountdata.info}));
                            }
                            else{
                                res.setHeader("Content-Type","text/json");
                                res.end(JSON.stringify({"success":false}));
                            }
                        });
                    }
                    else{
                        res.setHeader("Content-Type","text/json");
                        res.end(JSON.stringify({"success":false}));
                    }
                });
            }
            else if(body.type == "getsettings"){
                res.setHeader("Content-Type","text/json");
                res.end(JSON.stringify({"success":true,"sendpacketid":recievepacketid,"recievepacketid":sendpacketid,"timesync_timelimit":timesync_timelimit,"wsslink":wsslink}));
            }
            else{
                res.setHeader("Content-Type","text/json");
                res.end(JSON.stringify({"success":false}));
            }
            
        });
    }
};

const server = http.createServer(requestListener);

server.listen(port,host,function(){console.log("Server started.")});




const wss = new websocket.Server({port: wssport});
wss.on("connection",function(ws){
    console.log(ws)
    ws.onclose = function(){
        console.log("Client disconnected");
        this.player.disconnect();
    };
    ws.onerror = function(){
        console.log("Client disconnected");
        this.player.disconnect();
    };
    ws.onmessage = function(packet){
        try{
            jsondata = JSON.parse(packet.data);
            ws.player.recieve(jsondata);
        }
        catch(err){
            console.log(err);
            ws.player.disconnect();
        }
    };
    ws.player = new player();
    ws.player.wss = ws;
    console.log("Client connected");
    ws.player.start_timesync_timer();
});
