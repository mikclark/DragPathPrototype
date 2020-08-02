var app = angular.module('pathmaker');

app.controller('PathCtrl', function PathCtrl($scope, $window, $interval) {
    
    $scope.window = {
        width: $window.innerWidth,
        height: $window.innerHeight
    }
    $scope.pathStartTime = null;
    $scope.pathPoints = [];
    
    $scope.initialize = function() {
        var radius = 60; //$window.innerWidth * 0.02;
        var maximumTurnAngle = 0.5*Math.PI;
        $scope.sprite = {
            cx: $window.innerWidth/2,
            cy: $window.innerHeight/2,
            currentAngle: -0.5*Math.PI,
            fill: 'cyan',
            r: radius,
            maximumTurnAngle: maximumTurnAngle,
            maximumTurnCosAngle: Math.cos(maximumTurnAngle),
            shape: createXWing(),
            velocity: 150
        };
        
        var segment = 200;
        var inputPoints = [{x:100,y:100},{x:100,y:100+segment},{x:100+segment,y:100+segment},{x:100+segment,y:100}];
        var hermite1 = new HermiteSplineChainWithCatmullRomTangents($scope.sprite.velocity, inputPoints, Math.PI);
        //var hermite2 = new HermiteSplineChainWithCatmullRomTangents($scope.sprite.velocity, inputPoints, Math.PI);
        $scope.test = {
            inputPoints: inputPoints,
            outputPoints: hermite1.wholeShape(20),
            //outputPoints2: hermite2.wholeShape(20)
        };
        
        $scope.numerical = {
            tests: [
                [0.0, goldenRatioMinimization(function(x){return x*x;}, -1.0, 1.0)],
                [-1.57, goldenRatioMinimization(function(x){return Math.cos(2.0*x);}, 0.0, 3.0)],
                [1.0, goldenRatioMinimization(function(x){return x*x*x - 3*x + 1.0;}, 0.0, 3.0)]
            ]
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
                    theta: $scope.sprite.currentAngle
                }
            ];
        }
    }
    
    $scope.drawPath = function(event) {
        var lastPoint = $scope.pathPoints[$scope.pathPoints.length - 1];
        $scope.formattedPath = $scope.formatPoints($scope.pathPoints);
        
        var d = getDistance(event, lastPoint);
        
        if ( d && d >= $scope.sprite.r ) {
            // curvature check
            if($scope.pathPoints.length > 2) {
                var secondLastPoint = $scope.pathPoints[$scope.pathPoints.length - 2];
                
                var dotProduct = (event.x - lastPoint.x)*(lastPoint.x - secondLastPoint.x) + (event.y-lastPoint.y)*(lastPoint.y-secondLastPoint.y);
                var cosAngle = dotProduct/d/getDistance(lastPoint,secondLastPoint);
                if(cosAngle < $scope.sprite.maximumTurnCosAngle){
                    // Curvature is too tight.
                    return;
                }
            } else {
                var firstPathAngle = Math.atan2(event.y - lastPoint.y, event.x - lastPoint.x);
                if ( Math.abs(firstPathAngle - $scope.sprite.currentAngle) > $scope.sprite.maximumTurnAngle ) {
                    return;
                }
            }
                        
            // Now add the new point to pathPoints.
            $scope.pathPoints.push({
                x: event.x,
                y: event.y,
                distance: d
            });
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
        $scope.formattedPath = $scope.formatPoints($scope.pathPoints);
        
        var timer = new Date();
        console.log("pathPoints:\n" + JSON.stringify($scope.pathPoints,sortKeysReplacer,4));
        var splines = HermiteSplineChainWithCatmullRomTangents($scope.sprite.velocity, $scope.pathPoints, $scope.sprite.currentAngle);
        console.log("splines:\n" + JSON.stringify(splines.splines,
            ["function", "point1","point2","tangent1","tangent2","arcLength","x","y","time","theta","startTime","endTime"],
            4));
        $scope.smoothedPathPoints = splines.wholeShape();
        //$scope.smoothedPathPoints = $scope.pathPoints;
        $scope.smoothPath = $scope.formatPoints($scope.smoothedPathPoints);
        console.log("smoothedPathPoints:\n" + JSON.stringify($scope.smoothedPathPoints,sortKeysReplacer,4));
        console.log("\nBUILD TIME: \n" + 0.001*(new Date() - timer) + "\n");
        var nthSegment = 0;
        $scope.flightStartTime = new Date();
        
        
        function calculatePosition(flightTime){
            if (flightTime > $scope.smoothedPathPoints[$scope.smoothedPathPoints.length-1].time){
                // End of the path. Terminate flight loop.
                $interval.cancel(inFlight);
                inFlight = undefined;
                $scope.pathPoints = [];
                return;
            }
            
            var currentState = evaluatePathAtTime($scope.smoothedPathPoints, flightTime, nthSegment);
            nthSegment = currentState.index;
            $scope.sprite.cx = currentState.x;
            $scope.sprite.cy = currentState.y;
            $scope.sprite.currentAngle = currentState.theta;
        }
        
        inFlight = $interval(function(){
            var flightTime = 0.001*(new Date() - $scope.flightStartTime);
            calculatePosition(flightTime);
        }, 30)
    }

})
