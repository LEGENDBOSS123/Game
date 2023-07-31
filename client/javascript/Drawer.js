const Drawer = class {
    constructor(){
        const self = this;
        self.canvas = 0;
        self.canv_ctx = 0;
        self.image_data = 0;
        self.resolution = [1,1];
        self.rtx = new raytracer();
        self.rescalecanv = 0;
        self.rescalecanv_ctx = 0;
        self.middle = new Vector(400,250);
        self.world = 0;
    };
    attach(canv,world){
        const self = this;
        self.canvas = canv;
        self.canv_ctx = self.canvas.getContext("2d");
        self.rescalecanv = document.createElement("canvas");
        self.rescalecanv_ctx = self.rescalecanv.getContext("2d");
        self.canv_ctx.imageSmoothingEnabled = false;
        self.rescalecanv_ctx.imageSmoothingEnabled = false;
        self.world = world;
        self.rtx.world = world;
    };
    scaleToGamescreenX(x){
        const self = this;
        return x * self.world.game_dimensions[0]/self.resolution[0];
    }
    scaleToGamescreenY(y){
        const self = this;
        return y * self.world.game_dimensions[1]/self.resolution[1];
    }
    scaleToResolutionX(x){
        const self = this;
        return x * self.resolution[0]/self.world.game_dimensions[0];
    }
    scaleToResolutionY(y){
        const self = this;
        return y * self.resolution[1]/self.world.game_dimensions[1];
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
            return;
        }
        px = Math.floor(px);
        py = Math.floor(py);
        if(self.image_data.data[4*py*self.image_data.width + 4*px+3] > 0){
            return;
        }
        self.image_data.data.set(color,4*py*self.image_data.width + 4*px);
    }
    get_pixel(px,py){
        const self = this;
        if(!Vector.between(0,self.image_data.width-1,px) || !Vector.between(0,self.image_data.height-1,py)){
            return [0,0,0,255];
        }
        px = Math.floor(px);
        py = Math.floor(py);
        
        return [self.image_data.data[4*py*self.image_data.width + 4*px],self.image_data.data[4*py*self.image_data.width + 4*px+1],self.image_data.data[4*py*self.image_data.width + 4*px+2],self.image_data.data[4*py*self.image_data.width + 4*px+3]];
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
                borderx = self.world.game_dimensions[0];
                bordery = self.scaleToGamescreenY(i-self.resolution[0]);

            }
            else if(i<2*self.resolution[0]+self.resolution[1]){
                borderx = self.scaleToGamescreenX(i-self.resolution[0]-self.resolution[1]);
                bordery = self.world.game_dimensions[1];
            }
            else{
                borderx = 0;
                bordery = self.scaleToGamescreenY(i-2*self.resolution[0]-self.resolution[1]);
            }
            self.rtx.drawRay(self,self.middle.copy(),new Vector(borderx,bordery));
        }
        return data;
    };


    draw(frame){
        const self = this;
        self.canvas.width = self.canvas.clientWidth;
        self.canvas.height = self.canvas.clientHeight
        self.image_data = new ImageData(self.resolution[0],self.resolution[1]);
        self.rtx.setFrame(frame);
        self.image_data = self.get_image_data(self.image_data);
        self.rescalecanv_ctx.putImageData(self.image_data,0,0);

        self.canv_ctx.setTransform(self.canvas.clientWidth/self.resolution[0],0,0,self.canvas.clientHeight/self.resolution[1],0,0);
        self.canv_ctx.drawImage(self.rescalecanv,0,0);
        self.canv_ctx.setTransform(1,0,0,1,0,0);
    };
};