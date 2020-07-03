function getDistance(r1, r2) {
    try {
        var dx = (r1.x || r1.cx) - (r2.x || r2.cx);
        var dy = (r1.y || r1.cy) - (r2.y || r2.cy);
        return Math.sqrt(dx*dx + dy*dy);
    } catch(err) {
        if(err.name === "TypeError"){
            return null;
        }else{
            throw err;
        }
    }
}


function interpolateAngle(theta1, theta2, fraction){
    var dtheta = theta2 - theta1;
    dtheta -= Math.round(dtheta/(2.0*Math.PI))*2.0*Math.PI;
    return theta1 + fraction * dtheta;
}


function rotatePoints(points, theta){
    var sinx = Math.sin(theta);
    var cosx = Math.cos(theta);
    return points.map(function(p){
        return {
            x: p.x * cosx - p.y * sinx,
            y: p.y * cosx + p.x * sinx
        }
    })
}

function rotatePointsFromSlope(points, slope){
    var theta = Math.atan2(slope.y, slope.x);
    var sinx = Math.sin(theta);
    var cosx = Math.cos(theta);
    return points.map(function(p){
        return {
            x: p.x * cosx + p.y * sinx,
            y: p.y * cosx - p.x * sinx
        }
    })
}

function rotateShape(shape, theta){
    return shape.map(function(piece){
        return {
            style: angular.copy(piece.style),
            points: rotatePoints(piece.points, theta)
        };
    });
}


function addSmoothPointsToPath(pathPoints, theta0){
    // Cannot use Catmull-Rom on less than 4 points.
    if (pathPoints.length < 4) return pathPoints;
    
    function generateNPoints(splineObject, nPoints, tStart, tEnd) {
        // tStart is inclusive. tEnd is not inclusive.
        var dt = (tEnd - tStart)/nPoints;
        var newPoints = [];
        for(var i = 0; i < nPoints; i++){
            newPoints.push( splineObject.evaluateAt(tStart + i * dt) );
        }
        return newPoints;
    }
    var smoothPath = [];
    
    // First leg.
    var tempDistance = 100.0;
    var tempPoints = [{
        x: pathPoints[0].x - tempDistance * Math.cos(theta0),
        y: pathPoints[0].y - tempDistance * Math.sin(theta0),
    }];
    tempPoints = tempPoints.concat(pathPoints.slice(0,3));
    var spline = CatmullRomSpline(tempPoints, 0.0);
    //smoothPath = smoothPath.concat(generateNPoints(spline, 10, spline.t[0], spline.t[1]));
    
    // All middle legs.
    var t0 = 0.0;
    for(var iPoint = 0; iPoint < pathPoints.length - 3; iPoint++) {
        spline = CatmullRomSpline(pathPoints.slice(iPoint,iPoint+4), t0);
        smoothPath = smoothPath.concat(generateNPoints(spline, 10, spline.t[1], spline.t[2]));
        t0 = spline.t[1];
    }
    
    // Last leg. Do not rebuild the spline.
    //smoothPath = smoothPath.concat(generateNPoints(spline, 10, spline.t[2], spline.t[3]));
    smoothPath.push(spline.evaluateAt(spline.t[2]));
    return smoothPath;
    
}

function CatmullRomSpline(points, t0) {
    // ALgorithm taken from https://en.wikipedia.org/wiki/Centripetal_Catmull%E2%80%93Rom_spline
    function getNextT(tInit, pInit, pNext) {
        var distance = getDistance(pNext, pInit);
        return tInit + Math.sqrt(distance);
    }
    
    function averagePoints(p1,p2,f){
        return {
            x: f * p1.x + (1.0 - f) * p2.x,
            y: f * p1.y + (1.0 - f) * p2.y
        }
    }
    
    this.point = points;
    this.t = [t0];
    for(var ii = 1; ii < 4; ii++) {
        this.t.push( getNextT(this.t[ii-1], this.point[ii-1], this.point[ii]) );
    }
    
    this.evaluateAt = function(t) {
        var f01 = (this.t[1]-t)/(this.t[1]-this.t[0]);
        var f02 = (this.t[2]-t)/(this.t[2]-this.t[0]);
        var f12 = (this.t[2]-t)/(this.t[2]-this.t[1]);
        var f13 = (this.t[3]-t)/(this.t[3]-this.t[1]);
        var f23 = (this.t[3]-t)/(this.t[3]-this.t[2]);
        
        var A1 = averagePoints(this.point[0], this.point[1], f01);
        var A2 = averagePoints(this.point[1], this.point[2], f12);
        var A3 = averagePoints(this.point[2], this.point[3], f23);
        
        var B1 = averagePoints(A1, A2, f02);
        var B2 = averagePoints(A2, A3, f13);
        
        var C = averagePoints(B1, B2, f12);
        return C;
    }
    
    return this;
}