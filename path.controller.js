var app = angular.module('pathmaker');

app.controller('PathCtrl', function PathCtrl($scope, $window) {
    
    $scope.pathPoints = [];
    
    $scope.initialize = function() {
        $scope.sprite = {
            left: $window.innerWidth/2,
            top: $window.innerHeight/2,
            background: 'cyan'
        };
    };
    
    $scope.isClickOnSprite = function(event){
        if (true || checkDistance(event, $scope.sprite, 10)) {
            $scope.drawing = true;
            $scope.pathPoints = [
                {left: $scope.sprite.left, top: $scope.sprite.top}
            ];
        }
    }
    
    $scope.drawPath = function(event) {
        var lastPoint = $scope.pathPoints[$scope.pathPoints.length - 1];
        if (checkDistance(event, lastPoint, 10)) {
            $scope.pathPoints.push({
                left: event.x,
                top: event.y
            });
        }
    }
    
    function checkDistance(r1, r2, d) {
        $scope.message = [
            "r1 = (" + (r1.x || r1.left) + "," + (r1.y || r1.top) + ")",
            "r2 = (" + (r2.x || r2.left) + "," + (r2.y || r2.top) + ")",
            "d = " + d
        ];
        try {
            var dx = (r1.x || r1.left) - (r2.x || r2.left);
            var dy = (r1.y || r1.top) - (r2.y || r2.top);
            return (dx*dx + dy*dy) > d*d;
        } catch(err) {
            if(err.name === "TypeError"){
                return false;
            }else{
                throw err;
            }
        }
    }

})