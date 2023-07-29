const Segment = class {
    constructor(v1,v2){
        const self = this;
        self.v1 = v1;
        self.v2 = v2
    };
    static intersect(v,v1){
        return v.intersectWith(v1);
    };
    static makeSegment(x1,y1,x2,y2){
        return new Segment(new Vector(x1,y1),new Vector(x2,y2));
    };
    static lengthOf(x1,y1,x2,y2){
        return Math.sqrt((x1-x2)**2+(y1-y2)**2);
    };
    json(){
        const self = this;
        return {"v1":self.v1.json(),"v2":self.v2.json()};
    };
    static loadjson(json){
        return new Segment(Vector.loadjson(json.v1),Vector.loadjson(json.v2));
    };
    length(){
        const self = this;
        return Math.sqrt((self.v1.x-self.v2.x)**2+(self.v1.y-self.v2.y)**2);
    };
    intersectWith(v){
        const self = this;
    };
};
const Shape = class {
    constructor(){
        const self = this;
        self.edges = [];
        self.verticies = [];
        self.hitbox = Segment.makeSegment(0,0,0,0);
    };
    makeShape(v){
        const self = this;
        for(var i = 0;i<v.length;i++){
            self.verticies.push(new Vector(v[i][0],v[i][1]));
        }
        for(var i = 0;i<self.verticies.length-1;i++){
            self.edges.push(new Segment(self.verticies[i],self.verticies[i+1]));
        }
        self.edges.push(new Segment(self.verticies[self.verticies.length-1],self.verticies[0]));
        self.calculateHitbox();
        return self;
    };
    calculateHitbox(){
        const self = this;
        var minx = self.verticies[0].x;
        var maxx = self.verticies[0].x;
        var miny = self.verticies[0].y;
        var maxy = self.verticies[0].y;
        for(var i = 0;i<self.verticies.length;i++){
            if(self.verticies[i].x>maxx){
                maxx = self.verticies[i].x;
            }
            else if(self.verticies[i].x<minx){
                minx = self.verticies[i].x;
            }
            if(self.verticies[i].y>maxy){
                maxy = self.verticies[i].y;
            }
            else if(self.verticies[i].y<miny){
                miny = self.verticies[i].y;
            }
        }
        self.hitbox.v1.x = minx;
        self.hitbox.v1.y = miny;
        self.hitbox.v2.x = maxx;
        self.hitbox.v2.y = maxy;
    }
    checkIntersection(x,y){
        const self = this;
        if(x<self.hitbox.v1.x || x>self.hitbox.v2.x || y<self.hitbox.v1.y || y>self.hitbox.v2.y){
            return false;
        }
        
        var count = 0;
        for(var i = 0;i<self.edges.length;i++){
            var a1 = self.edges[i].v2.y-self.edges[i].v1.y;
            var b1 = self.edges[i].v2.x-self.edges[i].v1.x;
            var solvedx = 0;
            var solvedy = 0;

            var miny = Math.min(self.edges[i].v1.y,self.edges[i].v2.y);
            var minx = Math.min(self.edges[i].v1.x,self.edges[i].v2.x);
            var maxy = Math.max(self.edges[i].v1.y,self.edges[i].v2.y);
            var maxx = Math.max(self.edges[i].v1.x,self.edges[i].v2.x);

            var slopeyx = (self.edges[i].v2.y-self.edges[i].v1.y)/(self.edges[i].v2.x-self.edges[i].v1.x);
            var c = 0;
            var solvedy = 0;
            c = self.edges[i].v1.y-slopeyx*self.edges[i].v1.x;
            if(minx<x && maxx>=x){
                solvedy = x*slopeyx+c;
                if(solvedy>y){
                    count+=1;
                }
            }
        }
        
        if(!(count&1)){
            return false;
        }
        return true;
    };
    checkIntersectionWith(s){
        
    };
};

const Frame = class {
    constructor(){
        const self = this;
        self.grid = [];
        self.shapes = [];
        self.players = [];
        self.framenumber = 0;
    };
    updateFrame(){
        const self = this;
        return self;
    };
    copyFrame(){
        const self = this;
        return self;
    };
    interpolate(frame,percentage){
        const self = this;
        return self;
    };
    makeFrame(){
        const self = this;
    };
    pushShape(v){
        const self = this;
        self.shapes.push(v);
    }
};
const World = class {
    constructor(f){
        const self = this;
        self.frames = new Map();
        self.frames.set(0,f);
        self.max_frame = 0;
        self.staticshapes = new Map();
        self.staticshapeslist = [];
        self.grid_size = 25;
        self.game_dimensions = [800,500];
    };
    pushStaticShape(s,push=true){
        const self = this;
        if(push){
            self.staticshapeslist.push(s);
        }
        for(var x = Math.floor(s.hitbox.v1.x/self.grid_size)*self.grid_size;x<Math.floor(s.hitbox.v2.x/self.grid_size)*self.grid_size;x+=self.grid_size){
            for(var y = Math.floor(s.hitbox.v1.y/self.grid_size)*self.grid_size;y<Math.floor(s.hitbox.v2.y/self.grid_size)*self.grid_size;y+=self.grid_size){
                if(s.checkIntersection(x,y)){
                    var hash_val = Vector.hash(x,y);
                    if(!self.staticshapes.has(hash_val)){
                        self.staticshapes.set(hash_val,[]);
                    }
                    self.staticshapes.get(hash_val).push(s);
                }
            }
        }
    };
    recalculateStaticShapeMap(){
        const self = this;
        self.staticshapes = new Map();
        for(var i = 0;i<self.staticshapeslist.length;i++){
            self.pushStaticShape(self.staticshapeslist[i],false);
        };
    };
    getCell(x,y){
        const self = this;
        var hash_val = Vector.hash(Math.floor(x/self.grid_size)*self.grid_size,Math.floor(y/self.grid_size)*self.grid_size);
        if(!self.staticshapes.has(hash_val)){
            self.staticshapes.set(hash_val,[]);
        }
        return self.staticshapes.get(hash_val);
    };
    getFrame(f){
        const self = this;
        var return_frame = self.frames.get(Math.floor(f));
        if(!return_frame){
            while(self.max_frame<f){
                self.frames.set(self.max_frame+1,self.frames.get(self.max_frame).updateFrame());
                self.max_frame+=1;
            }
            return_frame = self.frames.get(Math.floor(f)).interpolate(self.frames.get(Math.floor(f)+1),f-Math.floor(f));
        }
        else{
            return_frame = return_frame.interpolate(self.frames.get(Math.floor(f)+1),f-Math.floor(f));
        }
        return return_frame;
    };
};