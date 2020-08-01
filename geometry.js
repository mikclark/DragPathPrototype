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

function evaluatePathAtTime(pathPoints, time, startAtNthSegment) {
    if(!pathPoints){
        return null;
    }
    
    // The purpose of this function is to take a sequence of (time,point) pairs and determine which
    // two points we are in between at time="time". Short circuit an error condition by checking if
    // "time" is between the first and last points of the array.
    if(pathPoints[pathPoints.length-1].time < time || pathPoints[0].time > time){
        return null;
    }
    
    // To speed things up, start looking where the caller tells us. If the caller hasn't
    // provided a place to start, then search the whole array.
    startAtNthSegment = startAtNthSegment || 0;
    if(pathPoints[startAtNthSegment].time > time){
        startAtNthSegment = 0;
    }
    
    for(var i = startAtNthSegment; i < pathPoints.length - 1; i++){
        if(pathPoints[i+1].time < time) {
            continue;
        }
        // Now we know that pathPoints[i].time <= time <= pathPoints[i+1].time
        var tFraction = (time - pathPoints[i].time)/(pathPoints[i+1].time - pathPoints[i].time);
        return {
            index: i,
            x: tFraction * pathPoints[i+1].x + (1.0 - tFraction) * pathPoints[i].x,
            y: tFraction * pathPoints[i+1].y + (1.0 - tFraction) * pathPoints[i].y,
            theta: interpolateAngle(pathPoints[i].theta, pathPoints[i+1].theta, tFraction)
        }
    }
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

