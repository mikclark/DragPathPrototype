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