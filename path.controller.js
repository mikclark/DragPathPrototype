var app = angular.module('pathmaker');

app.controller('PathCtrl', function PathCtrl($scope, $window, $interval) {
    
    $scope.window = {
        width: $window.innerWidth,
        height: $window.innerHeight
    }
    $scope.pathStartTime = null;
    $scope.pathPoints = [];
    
    $scope.initialize = function() {
        var radius = 30; //$window.innerWidth * 0.02;
        $scope.sprite = {
            cx: $window.innerWidth/2,
            cy: $window.innerHeight/2,
            currentAngle: -0.5*Math.PI,
            fill: 'cyan',
            r: radius,
            shape: createXWing(),
            velocity: 150
        };
        
        var points = [
            {
                x: 100,
                y: 100,
                theta: 0.25*Math.PI
            },
            {
                x: 300,
                y: 300,
                theta: 0
            },
            {
                x: 500,
                y: 100,
                theta: -0.25*Math.PI
            }
        ];
        $scope.test = {
            point1:{x:540,y:100},
            point2:{x:560,y:180},
            theta1:0,
            theta2:0,
            testPath: points,
            smoothedTestPath: solvePathWithPointsAndThetas(points, 15, 30),
            smoothPiece1: solvePathTwoPoints(30, points[0], points[1], points[0].theta, points[1].theta),
            smoothPiece2: solvePathTwoPoints(30, points[1], points[2], points[1].theta, points[2].theta)
        };
        $scope.getOutput = function(ip1,ip2,ith1,ith2){
            $scope.test.outputPoints = solvePathTwoPoints(15, ip1,ip2,ith1*Math.PI/180.0,ith2*Math.PI/180.0);
        }
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
        
        if ( d && d > 2.1*$scope.sprite.r ) {
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
        if(!points){
            return "0,0";
        }
        var rotatedPoints = angle ? rotatePoints(points, angle) : points;
        cx = cx || 0;
        cy = cy || 0;
        return rotatedPoints.map(function(pt){return (pt.x + cx) + "," + (pt.y + cy);}).join(" ");
    }
    
    /*function getDistance(r1, r2) {
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
    }*/
    
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
        var timer = new Date();
        $scope.smoothedPathPoints = initialGuessPath($scope.pathPoints, $scope.sprite.currentAngle, $scope.sprite.velocity, $scope.sprite.r );
        $scope.smoothPath = $scope.formatPoints($scope.smoothedPathPoints.path);
        console.log("\nBUILD TIME: \n" + 0.001*(new Date() - timer) + "\n");
        var nthSegment = 0;
        
        function calculatePosition(flightTime){
            if (flightTime > $scope.smoothedPathPoints.endTime){
                // End of the path. Terminate flight loop.
                $interval.cancel(inFlight);
                inFlight = undefined;
                $scope.pathPoints = [];
                return;
            }
            
            var currentState = evaluatePathAtTime($scope.smoothedPathPoints.path, flightTime, nthSegment);
            nthSegment = currentState.index;
            $scope.sprite.cx = currentState.x;
            $scope.sprite.cy = currentState.y;
            $scope.sprite.currentAngle = currentState.theta;
        }
        
        /*var inFlight = $interval(function(){
            var flightTime = 0.001*(new Date() - $scope.flightStartTime);
            calculatePosition(flightTime);
        }, 30)*/
    }

})
