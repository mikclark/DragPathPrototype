function getDistance(r1, r2) {
    try {
        var dx = ((r1.x===null || r1.x===undefined) ? r1.cx : r1.x) - ((r2.x===null || r2.x===undefined) ? r2.cx : r2.x);
        var dy = ((r1.y===null || r1.y===undefined) ? r1.cy : r1.y) - ((r2.y===null || r2.y===undefined) ? r2.cy : r2.y);
        return Math.sqrt(dx*dx + dy*dy);
    } catch(err) {
        if(err.name === "TypeError"){
            return null;
        }else{
            throw err;
        }
    }
}


function interpolateAngle(theta1, theta2, fraction, towardPositive){
    var dtheta = theta2 - theta1;
    if(towardPositive===null || towardPositive===undefined){
        // If the direction is not known, travel the "shorter way" around the circle
        dtheta -= Math.round(dtheta/(2.0*Math.PI))*2.0*Math.PI;
    } else if (towardPositive===true){
        // Travel around the circle in the direction of positive theta
        dtheta -= Math.floor(dtheta/(2.0*Math.PI))*2.0*Math.PI;
    } else {
        // Travel around the circle in the direction of negative theta
        dtheta -= Math.ceil(dtheta/(2.0*Math.PI))*2.0*Math.PI;
    }
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


function evaluateStateFromPathAtTime(pathPoints, time, startAtNthSegment) {
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


function initialGuessPath(points, theta0, speed, radiusOfTurn){
    points[0].theta = theta0;
    for(var i = 1; i < points.length - 1; i++){
        points[i].theta = Math.atan2(  points[i+1].y - points[i-1].y, points[i+1].x - points[i-1].x  );
    }
    points[points.length-1].theta = Math.atan2(
        points[points.length-1].y - points[points.length-2].y,
        points[points.length-1].x - points[points.length-2].x
    );
    return {
        path: solvePathWithPointsAndThetas(points, speed, radiusOfTurn),
        points: points
    }
}



function solvePathWithPointsAndThetas(points, speed, radiusOfTurn){
    var algorithmStartTime = (new Date()).getTime();
    // Assume that points is a vector of objects and each object has properties .x, .y, and .theta
    var previousTime = 0.0;
    var path = [{
        x: points[0].x,
        y: points[0].y,
        theta: points[0],
        distance: 0.0,
        time: previousTime
    }]
    
    for(var i = 1; i < points.length; i++){
        var p1 = {
            x: points[i-1].x,
            y: points[i-1].y
        };
        var p2 = {
            x: points[i].x,
            y: points[i].y
        };
        var newPoints = solvePathTwoPoints(radiusOfTurn, p1, p2, points[i-1].theta, points[i].theta);
        for(var j = 1; j < newPoints.length; j++){
            var distance = getDistance(newPoints[i], newPoints[i-1]);
            var newTime = previousTime + distance/speed;
            path.push({
                x: newPoints[j].x,
                y: newPoints[j].y,
                theta: newPoints[j].theta,
                distance: distance,
                time: newTime
            });
            previousTime = newTime;
        }
    }
    console.log("Algorithm time (ms) = " + ((new Date()).getTime() - algorithmStartTime)/1000.0 );
    return path;
}





function solvePathTwoPoints(radiusOfTurn, point1, point2, theta1, theta2){
    var tangentP2P = {
        x: point2.x - point1.x,
        y: point2.y - point1.y
    };
    console.log("******************************************");
    var thetaP2P = Math.atan2(tangentP2P.y, tangentP2P.x);
    var distanceP2P = getDistance(point1, point2);
    console.log(JSON.stringify({
        "point1": point1,
        "point2": point2,
        "thetaP2P": thetaP2P,
        "distanceP2P": distanceP2P,
        "radiusOfTurn": radiusOfTurn
    },null,4));
    if(distanceP2P < 2.0*radiusOfTurn){
        throw "Too close together";
    }
    //theta1 -= Math.round(theta1/(2.0*Math.PI))*(2.0*Math.PI);
    //theta2 -= Math.round(theta2/(2.0*Math.PI))*(2.0*Math.PI);
    
    // Super special case: all lines colinear.
    if((thetaP2P == theta1) && (thetaP2P == theta2)){
        return [{
            x: point2.x,
            y: point2.y,
            theta: theta2
        }];
    }
    
    var tangent1 = {
        x: Math.cos(theta1),
        y: Math.sin(theta1)
    };
    var normal1 = {
        x: tangent1.y,
        y: -tangent1.x
    };
    var center1A = {
        x: point1.x + radiusOfTurn * normal1.x,
        y: point1.y + radiusOfTurn * normal1.y
    };
    var center1B = {
        x: point1.x - radiusOfTurn * normal1.x,
        y: point1.y - radiusOfTurn * normal1.y
    };
    
    var tangent2 = {
        x: Math.cos(theta2),
        y: Math.sin(theta2)
    };
    var normal2 = {
        x: tangent2.y,
        y: -tangent2.x
    };
    var center2A = {
        x: point2.x + radiusOfTurn * normal2.x,
        y: point2.y + radiusOfTurn * normal2.y
    };
    var center2B = {
        x: point2.x - radiusOfTurn * normal2.x,
        y: point2.y - radiusOfTurn * normal2.y
    };
    
    console.log(JSON.stringify({
        "point1": point1,
        "point2": point2,
        "tangent1": tangent1,
        "tangent2":tangent2,
        "tangentP2P": {
            x: tangentP2P.x/distanceP2P,
            y: tangentP2P.y/distanceP2P
        },
        "normal1": normal1,
        "normal2": normal2,
        "centers": {
            "center1A": center1A,
            "center1B": center1B,
            "center2A": center2A,
            "center2B": center2B,
        },
        "distances":{
            "c1A to 2": getDistance(center1A, point2),
            "c1B to 2": getDistance(center1B, point2),
            "c2A to p1": getDistance(center2A, point1),
            "c2B to p1": getDistance(center2B, point1)
        }
    }, null, 4));
    
    var circle1;
    var circle2;
    
    // Locate circle 1
    if(theta1 != thetaP2P){
        if(getDistance(center1A, point2) < getDistance(center1B, point2)) {
            circle1 = {
                x: center1A.x,
                y: center1A.y,
                r: radiusOfTurn,
                phiStart: theta1 + 0.5 * Math.PI,
                isNuPositive: false
            };
        } else {
            circle1 = {
                x: center1B.x,
                y: center1B.y,
                r: radiusOfTurn,
                phiStart:  theta1 - 0.5 * Math.PI,
                isNuPositive: true
            };
        }
    } else {
        console.log("1-equal");
        var ghostPoint2 = {
            x: point2.x - tangent2.x,
            y: point2.y - tangent2.y,
        };
        if(getDistance(center1A, ghostPoint2) < getDistance(center1B, ghostPoint2)) {
            circle1 = {
                x: center1A.x,
                y: center1A.y,
                r: radiusOfTurn,
                phiStart: theta1 + 0.5 * Math.PI,
                isNuPositive: false
            };
        } else {
            circle1 = {
                x: center1B.x,
                y: center1B.y,
                r: radiusOfTurn,
                phiStart:  theta1 - 0.5 * Math.PI,
                isNuPositive: true
            };
        }
    }
    
    // Locate circle 2
    if(theta2 != thetaP2P){
        if(getDistance(center2A, point1) < getDistance(center2B, point1)) {
            circle2 = {
                x: center2A.x,
                y: center2A.y,
                r: radiusOfTurn,
                phiEnd: theta2 + 0.5 * Math.PI,
                isNuPositive: false
            };
        } else {
            circle2 = {
                x: center2B.x,
                y: center2B.y,
                r: radiusOfTurn,
                phiEnd:  theta2 - 0.5 * Math.PI,
                isNuPositive: true
            };
        }
    } else {
        console.log("2-equal");
        var ghostPoint1 = {
            x: point1.x + tangent1.x,
            y: point1.y + tangent1.y,
        };
        if(getDistance(center2A, ghostPoint1) > getDistance(center2B, ghostPoint1)) {
            circle2 = {
                x: center2A.x,
                y: center2A.y,
                r: radiusOfTurn,
                phiEnd: theta2 + 0.5 * Math.PI,
                isNuPositive: false
            };
        } else {
            circle2 = {
                x: center2B.x,
                y: center2B.y,
                r: radiusOfTurn,
                phiEnd:  theta2 - 0.5 * Math.PI,
                isNuPositive: true
            };
        }
    }
    console.log(JSON.stringify({"circle1": circle1, "circle2":circle2}, null, 4));
    
    // Common tangents of two circles.
    var deltaTheta;
    if(circle1.isNuPositive && circle2.isNuPositive){
        console.log("   Two counter-clockwise circles");
        // Two counter-clockwise circles
        circle1.phiEnd = thetaP2P - 0.5*Math.PI;
        circle2.phiStart = thetaP2P - 0.5*Math.PI;
    } else if (circle1.isNuPositive) {
        // Circle1 counter-clockwise. Circle2 clockwise.
        deltaTheta = Math.acos(2.0*radiusOfTurn/distanceP2P);
        console.log("   Circle1 counter-clockwise. Circle2 clockwise. deltaTheta = " + deltaTheta);
        circle1.phiEnd = thetaP2P - deltaTheta;
        circle2.phiStart = thetaP2P - Math.PI - deltaTheta;
    } else if (circle2.isNuPositive) {
        deltaTheta = Math.acos(2.0*radiusOfTurn/distanceP2P);
        console.log("   Circle1 clockwise. Circle2 counter-clockwise. deltaTheta = " + deltaTheta);
        circle1.phiEnd = thetaP2P + deltaTheta;
        circle2.phiStart = thetaP2P + Math.PI + deltaTheta;
    } else {
        console.log("   Two clockwise circles");
        circle1.phiEnd = thetaP2P + 0.5*Math.PI;
        circle2.phiStart = thetaP2P + 0.5*Math.PI;
    }
    
    console.log(JSON.stringify({"arc1": circle1, "arc2":circle2}, null, 4));
    
    
    // Construct points
    var newPoints = [];    
    var nPointsInCircle1 = 16;
    var nPointsInCircle2 = 16;
    deltaTheta = Math.PI / nPointsInCircle1;
    for(var i1 = 0; i1 <= nPointsInCircle1; i1++){
        var iPhi1 = interpolateAngle(circle1.phiStart, circle1.phiEnd, 1.0*i1/nPointsInCircle1, circle1.isNuPositive);
        newPoints.push({
            x: circle1.x + radiusOfTurn * Math.cos(iPhi1),
            y: circle1.y + radiusOfTurn * Math.sin(iPhi1),
            theta: iPhi1 + (circle1.isNuPositive ? 0.5 : -0.5) * Math.PI
        });
    }
    for(var i2 = 0; i2 <= nPointsInCircle2; i2++){
        var iPhi2 = interpolateAngle(circle2.phiStart, circle2.phiEnd, 1.0*i2/nPointsInCircle2, circle2.isNuPositive);
        newPoints.push({
            x: circle2.x + radiusOfTurn * Math.cos(iPhi2),
            y: circle2.y + radiusOfTurn * Math.sin(iPhi2),
            theta: iPhi2 + (circle2.isNuPositive ? 0.5 : -0.5) * Math.PI
        });
    }
    return newPoints;
}


