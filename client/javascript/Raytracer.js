
const raytracer = class {
    constructor(frame = 0){
        const self = this;
        self.frame = frame;
        self.world = 0;
    };
    setFrame(f){
        const self = this;
        self.frame = f;
    };
    drawRay(draw,v1,v2){
        const self = this;
        var going = 0;
        var goingdist = -1;
        var total_distance = Segment.lengthOf(v1.x,v1.y,v2.x,v2.y);
        var start = v1.copy();
        var step = 0.7;
        var direction = Vector.normalize(new Vector(v2.x-v1.x,v2.y-v1.y)).multiplyTo(new Vector(step,step));
        var already = v1.copy();
        already.x = Math.floor(draw.scaleToResolutionX(already.x));
        already.y = Math.floor(draw.scaleToResolutionY(already.y));
        already.x+=100000;
        already.y+=100000;
        for(var distance = 0;distance<total_distance;distance+=step){
            var intersects = 0;
            var currentCell = self.world.getCell(start.x,start.y);
            var drawThisStep = true;
            if(already.x == Math.floor(draw.scaleToResolutionX(start.x)) && already.y == Math.floor(draw.scaleToResolutionY(start.y))){
                drawThisStep = false;
            }
            if(goingdist == -1){
                for(var i = 0;i<currentCell.length;i++){
                    if(currentCell[i].checkIntersection(start.x,start.y)){
                        intersects = true;
                        going = 1;
                    }
                }
               
            }
            if(intersects){
                if(drawThisStep){
                    draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[255,0,0,255]);
                }
            }
            else if(going){
                if(goingdist == -1){
                    goingdist = distance;
                }
                if(drawThisStep){
                    draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[0,0,0,255]);
                }
            }
            else{
                if(drawThisStep){
                    draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[255,255,255,255]);
                }
            }
            already.x = Math.floor(draw.scaleToResolutionX(start.x));
            already.y = Math.floor(draw.scaleToResolutionY(start.y));
            start.addTo(direction);
        }
    };
};

