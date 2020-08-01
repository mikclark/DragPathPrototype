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





function solvePathTwoPoints(radiusOfTurn, point1, point2, theta1, theta2){
    var tangentP2P = {
        x: point2.x - point2.x,
        y: point2.y - point1.y
    };
    var thetaP2P = Math.atan2(tangentP2P.y, tangentP2P.x);
    
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
        if(getDistance(center2A, ghostPoint1) < getDistance(center2B, ghostPoint1)) {
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
    var denominator = radiusOfTurn*radiusOfTurn + (point1.x-point2.x)*(point1.x-point2.x) + (point1.y-point2.y)*(point1.y-point2.y);
    if(circle1.isNuPositive && circle2.isNuPositive){
        // Two counter-clockwise circles
        circle1.phiEnd = thetaP2P - 0.5*Math.PI;
        circle2.phiStart = thetaP2P - 0.5*Math.PI;
    } else if (circle1.isNuPositive) {
        // Circle1 counter-clockwise. Circle2 clockwise.
        deltaTheta = Math.acos(radiusOfTurn/Math.sqrt(denominator));
        circle1.phiEnd = thetaP2P - deltaTheta;
        circle2.phiStart = thetaP2P - Math.PI - deltaTheta;
    } else if (circle2.isNuPositive) {
        deltaTheta = Math.acos(radiusOfTurn/Math.sqrt(denominator));
        circle1.phiEnd = thetaP2P + deltaTheta;
        circle2.phiStart = thetaP2P + Math.PI + deltaTheta;
    } else {
        circle1.phiEnd = thetaP2P + 0.5*Math.PI;
        circle2.phiStart = thetaP2P + 0.5*Math.PI;
    }
    
    console.log(JSON.stringify({"arc1": circle1, "arc2":circle2}, null, 4));
    
    
    // Construct points
    var newPoints = [];
    deltaTheta = Math.PI / 32.0;
    for(var i1 = 0; i1 <= 32; i1++){
        var iPhi1 = interpolateAngle(circle1.phiStart, circle1.phiEnd, 0.03125*i1);
        newPoints.push({
            x: circle1.x + radiusOfTurn * Math.cos(iPhi1),
            y: circle1.y + radiusOfTurn * Math.sin(iPhi1),
            theta: iPhi1 + (circle1.isNuPositive ? 0.5 : -0.5) * Math.PI
        });
    }
    for(var i2 = 0; i2 <= 32; i2++){
        var iPhi2 = interpolateAngle(circle2.phiStart, circle2.phiEnd, 0.03125*i2);
        newPoints.push({
            x: circle2.x + radiusOfTurn * Math.cos(iPhi2),
            y: circle2.y + radiusOfTurn * Math.sin(iPhi2),
            theta: iPhi2 + (circle2.isNuPositive ? 0.5 : -0.5) * Math.PI
        });
    }
    return newPoints;
}


