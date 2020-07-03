var app = angular.module('pathmaker');

app.controller('PathCtrl', function PathCtrl($scope, $window, $interval) {
    
    $scope.window = {
        width: $window.innerWidth,
        height: $window.innerHeight
    }
    $scope.pathStartTime = null;
    $scope.pathPoints = [];
    
    $scope.initialize = function() {
        var radius = $window.innerWidth * 0.02;
        $scope.sprite = {
            cx: $window.innerWidth/2,
            cy: $window.innerHeight/2,
            currentAngle: -0.5*Math.PI,
            fill: 'cyan',
            r: radius,
            shape: createXWing(),
            velocity: 150
        };
    };
    
    $scope.isClickOnSprite = function(event){
        if ((getDistance(event, $scope.sprite) || 1e9) <= $scope.sprite.r) {
            if(angular.isDefined(inFlight)){
                $interval.cancel(inFlight);
                inFlight = undefined;
            }
            $scope.drawing = true;
            $scope.pathPoints = [
                {
                    x: $scope.sprite.cx, 
                    y: $scope.sprite.cy, 
                    time:0,
                    angle: $scope.sprite.currentAngle
                }
            ];
        }
    }
    
    $scope.drawPath = function(event) {
        var lastPoint = $scope.pathPoints[$scope.pathPoints.length - 1];
        $scope.formattedPath = $scope.formatPoints($scope.pathPoints);
        
        // We need a better curvature check than this. Recommend: cos(q) = a.b / |a||b|,
        // since the linear distances |a| and |b| must be computed at some point.
        var d = getDistance(event, lastPoint);
        
        if ( d && d >= $scope.sprite.r ) {
            var dx = event.x - lastPoint.x;
            var dy = event.y - lastPoint.y;
            var currentPoint = {
                x: event.x,
                y: event.y,
                time: d/$scope.sprite.velocity + lastPoint.time,
                angle: Math.atan2(dy, dx)
            };
            
            // Update the "angle" of the previous* point using the midpoint-angle approximation
            if($scope.pathPoints.length > 2) {
                var secondLastPoint = $scope.pathPoints[$scope.pathPoints.length - 2];
                var d2x = event.x - secondLastPoint.x;
                var d2y = event.y - secondLastPoint.y;
                lastPoint.angle = Math.atan2(d2y, d2x);
            }
            
            // Now add the new point to pathPoints.
            $scope.pathPoints.push(currentPoint);
        }
    }
    
    $scope.formatPoints = function(points, cx, cy, angle){
        var rotatedPoints = angle ? rotatePoints(points, angle) : points;
        cx = cx || 0;
        cy = cy || 0;
        return rotatedPoints.map(function(pt){return (pt.x + cx) + "," + (pt.y + cy);}).join(" ");
    }
    
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
    
    function getCosTheta(point1, point2, point3){
        // Use the definition of "dot product" to calculate cos(angle made by 3 points)
        var adotb = (point1.left - point2.left) * (point2.left - point3.left)
            + (point1.top - point2.top) * (point2.top - point3.top);
        var atimesb = point1.distance * point2.distance;
        return adotb/atimesb;
    }
    
    var inFlight;
    $scope.beginFlightPath = function(){
        if(angular.isDefined(inFlight) || $scope.pathPoints.length < 2){
            return;
        }
        
        // We need to use the point-to-point distances to compute the times at
        // which the sprite is supposed to reach each point. We then interrogate
        // the current time and interpolate.
        $scope.drawing = false;
        $scope.flightStartTime = new Date();
        $scope.formattedPath = $scope.formatPoints($scope.pathPoints);
        
        function calculatePosition(flightTime){
            var fraction = (flightTime - $scope.pathPoints[0].time)/($scope.pathPoints[1].time - $scope.pathPoints[0].time);
            $scope.fraction = fraction;
            if(fraction < 1.0){
                $scope.sprite.cx = $scope.pathPoints[0].x + fraction * ($scope.pathPoints[1].x - $scope.pathPoints[0].x);
                $scope.sprite.cy = $scope.pathPoints[0].y + fraction * ($scope.pathPoints[1].y - $scope.pathPoints[0].y);
                $scope.sprite.currentAngle = interpolateAngle($scope.pathPoints[0].angle, $scope.pathPoints[1].angle, fraction);
            } else {
                if ($scope.pathPoints.length == 2){
                    // End of the path. Terminate flight loop.
                    $interval.cancel(inFlight);
                    inFlight = undefined;
                    $scope.pathPoints = [];
                } else {
                    // Remove this point and repeat the flight path calculation with the new point.
                    $scope.pathPoints.splice(0,1);
                    calculatePosition(flightTime);
                }
            }
        }
        
        inFlight = $interval(function(){
            var flightTime = 0.001*(new Date() - $scope.flightStartTime);
            calculatePosition(flightTime);
        }, 30)
    }

})
