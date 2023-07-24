const Vector = class {
    constructor(x,y){
        const self = this;
        self.x = x;
        self.y = y;
    };
    static lerp(a,b,c){
        return a+(b-a)*c;
    };
    static between(a,b,c){
        return (c>=a && c<=b) || (c>=b && c<=a);
    };
    static cross(v,v1){
        return v.crossWith(v1);
    };
    static dot(v,v1){
        return v.dotWith(v1);
    };
    static normalize(v){
        var sqrt = Math.sqrt(v.x**2+v.y**2);
        return new Vector(v.x/sqrt,v.y/sqrt);
    };
    crossWith(v1){
        const self = this;
        return self.x*v1.y - self.y*v1.x
    };
    addTo(v){
        const self = this;
        self.x+=v.x;
        self.y+=v.y;
        return self;
    };
    multiplyTo(v){
        const self = this;
        self.x*=v.x;
        self.y*=v.y;
        return self;
    };
    copy(){
        const self = this;
        return new Vector(self.x,self.y);
    }
    dotWith(v1){
        const self = this;
        return self.x*v1.x + self.y*v1.y;
    };
}

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
    length(){
        const self = this;
        return Math.sqrt((self.v1.x-self.v2.x)**2+(self.v1.y-self.v2.y)**2);
    };
    intersectWith(v){
        const self = this;
    };
}

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
        if(x<self.hitbox.x || x>self.hitbox.x+self.hitbox.width || y<self.hitbox.y || y>self.hitbox.y+self.hitbox.height){
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
    }
};
const ray = class {
    constructor(start,direction,distance){
        const self = this;
        self.start = start;
        self.direction = direction;
        self.distance = distance;
    };
};
const raytracer = class {
    constructor(){
        const self = this;
        self.shapes = [];
        self.game_dimensions = [800,500];
    };
    pushShape(v){
        const self = this;
        self.shapes.push((new Shape()).makeShape(v));
    }
    drawRay(draw,v1,v2){
        const self = this;
        var going = 0;
        var goingdist = -1;
        var total_distance = Segment.lengthOf(v1.x,v1.y,v2.x,v2.y);
        var start = v1.copy();
        var step = 1;
        var direction = Vector.normalize(new Vector(v2.x-v1.x,v2.y-v1.y)).multiplyTo(new Vector(step,step));
        for(var distance = 0;distance<total_distance;distance+=step){
            var intersects = 0;
            if(goingdist == -1){
                for(var i = 0;i<self.shapes.length;i++){
                    if(self.shapes[i].checkIntersection(start.x,start.y)){
                        intersects = true;
                        going = 1;
                        
                    }
                }
            }
            
            if(intersects){
                draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[0,0,0,255]);
            }
            else if(going){
                if(goingdist == -1){
                    goingdist = distance;
                }
                draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[Vector.lerp(0,255,0.5*(distance-goingdist)/(total_distance-goingdist)),Vector.lerp(0,255,0.5*(distance-goingdist)/(total_distance-goingdist)),0,255]);
            }
            else{
                draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[255,255,255,255]);
            }
            start.addTo(direction);
        }
    };
};

const drawer = class {
    constructor(){
        const self = this;
        self.canvas = 0;
        self.canv_ctx = 0;
        self.image_data = 0;
        self.resolution = [200,100];
        self.rtx = new raytracer();
        self.rescalecanv = 0;
        self.rescalecanv_ctx = 0;
        self.middle = new Vector(400,250);
    };
    attach(canv){
        const self = this;
        self.canvas = canv;
        self.canv_ctx = self.canvas.getContext("2d");
        self.rescalecanv = document.createElement("canvas");
        self.rescalecanv_ctx = self.rescalecanv.getContext("2d");
        self.canv_ctx.imageSmoothingEnabled = false;
        self.rescalecanv_ctx.imageSmoothingEnabled = false;
        self.canv_ctx.width = 400;
        self.canv_ctx.height = 250;
    };
    scaleToGamescreenX(x){
        const self = this;
        return x * self.rtx.game_dimensions[0]/self.resolution[0];
    }
    scaleToGamescreenY(y){
        const self = this;
        return y * self.rtx.game_dimensions[1]/self.resolution[1];
    }
    scaleToResolutionX(x){
        const self = this;
        return x * self.resolution[0]/self.rtx.game_dimensions[0];
    }
    scaleToResolutionY(y){
        const self = this;
        return y * self.resolution[1]/self.rtx.game_dimensions[1];
    }
    change_resolution(x,y){
        const self = this;
        self.resolution = [x,y];
        self.image_data = new ImageData(x,y);
        self.rescalecanv.width = x;
        self.rescalecanv.height = y;
    }
    change_pixel(px,py,color){
        const self = this;
        if(!Vector.between(0,self.image_data.width-1,px) || !Vector.between(0,self.image_data.height-1,py)){
            return self.image_data;
        }
        px = Math.floor(px);
        py = Math.floor(py);
        self.image_data.data[4*py*self.image_data.width + 4*px] = color[0];
        self.image_data.data[4*py*self.image_data.width + 4*px+1] = color[1];
        self.image_data.data[4*py*self.image_data.width + 4*px+2] = color[2];
        self.image_data.data[4*py*self.image_data.width + 4*px+3] = color[3];
        return self.image_data;
    }
    get_image_data(data){
        const self = this;
        for(var i = 0;i<2*(self.resolution[0]+self.resolution[1]);i++){
            var borderx = 0;
            var bordery = 0;
            if(i<self.resolution[0]){
                borderx = self.scaleToGamescreenX(i);
                bordery = 0;
            }
            else if(i<self.resolution[0]+self.resolution[1]){
                borderx = self.rtx.game_dimensions[0];
                bordery = self.scaleToGamescreenY(i-self.resolution[0]);

            }
            else if(i<2*self.resolution[0]+self.resolution[1]){
                borderx = self.scaleToGamescreenX(i-self.resolution[0]-self.resolution[1]);
                bordery = self.rtx.game_dimensions[1];
            }
            else{
                borderx = 0;
                bordery = self.scaleToGamescreenY(i-2*self.resolution[0]-self.resolution[1]);
            }
            self.rtx.drawRay(self,self.middle.copy(),new Vector(borderx,bordery));
        }
        return data;
    };


    draw(){
        const self = this;
        self.image_data = self.get_image_data(self.image_data);

        self.rescalecanv_ctx.putImageData(self.image_data,0,0);

        self.canv_ctx.setTransform(self.canvas.width/self.resolution[0],0,0,self.canvas.height/self.resolution[1],0,0);
        self.canv_ctx.drawImage(self.rescalecanv,0,0);
        game.fps = 1000/(Date.now() - game.fps_timestamp);
        game.fps_timestamp = Date.now();

    };
};
