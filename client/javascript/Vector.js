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
    static clamp(a,b,c){
        if(c>Math.max(a,b)){
            return Math.max(a,b)
        }
        else if(c<Math.min(a,b)){
            return Math.min(a,b);
        }
        return c;
    }
    static randint(a,b){
        return Math.floor(Math.min(a,b))+Math.floor(Math.random()*(Math.abs(a-b)+1));
    }
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
};