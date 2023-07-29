
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
        var step = 0.706;
        var direction = Vector.normalize(new Vector(v2.x-v1.x,v2.y-v1.y)).multiplyTo(new Vector(step,step));

        for(var distance = 0;distance<total_distance;distance+=step){
            var intersects = 0;
            var currentCell = self.world.getCell(start.x,start.y);
            if(goingdist == -1){
                for(var i = 0;i<currentCell.length;i++){
                    if(currentCell[i].checkIntersection(start.x,start.y)){
                        intersects = true;
                        going = 1;
                    }
                }
            }
            if(intersects){
                draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[255,0,0,255]);
            }
            else if(going){
                if(goingdist == -1){
                    goingdist = distance;
                }
                //draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[Vector.lerp(0,255,0.5*(distance-goingdist)/(total_distance-goingdist)),Vector.lerp(0,255,0.5*(distance-goingdist)/(total_distance-goingdist)),0,255]);
                draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[0,0,0,255]);
            }
            else{
                draw.change_pixel(draw.scaleToResolutionX(start.x),draw.scaleToResolutionY(start.y),[255,255,255,255]);
            }
            start.addTo(direction);
        }
    };
};

