function HermiteSplineChainWithCatmullRomTangents(constantV, pathPoints, theta0)
{   
    var thetas = constructInitialGuessForThetas(pathPoints, theta0);
    var splineChain = HermiteSplineChainFromPointsAndTangents(constantV, pathPoints, thetas);
    return splineChain
}

function improveSplineChain(splineChain)
{
    var thetas = Array.from(splineChain.thetas);
    var constantV = splineChain.V;
    var pathPoints = splineChain.pathPoints.map(function(x){return Object.assign({}, x);});
    
    var kappa0 = getTotalCurvatureOfPoints(splineChain.wholeShape());
    for(var iteration = 0; iteration < 5; iteration++)
    {
        
        console.log("kappa = " + kappa0 + "\nthetas = " + JSON.stringify(thetas,null,4));
        
        var delta = 0.01;
        var gradientKappa = [0.0];
        for(var iTheta = 1; iTheta < thetas.length; iTheta++)
        {
            thetas[iTheta] += delta;
            var perturbedChain = HermiteSplineChainFromPointsAndTangents(constantV, pathPoints, thetas);
            var thisGradientKappa = getTotalCurvatureOfPoints(perturbedChain.wholeShape()) - kappa0;
            gradientKappa.push(thisGradientKappa);
            thetas[iTheta] -= delta;
        }
        
        var factor = 0.0000001;
        var newThetas = thetas.map(function(x,i){return x - factor*gradientKappa[i];});
        console.log("newThetas = " + JSON.stringify(newThetas));
        splineChain = HermiteSplineChainFromPointsAndTangents(constantV, pathPoints, newThetas);
        var kappa = getTotalCurvatureOfPoints(splineChain.wholeShape());
        console.log("factor = " + factor + "\nkappa = " + kappa + "\nthetas = " + JSON.stringify(newThetas,null,4));
        
        thetas = Array.from(newThetas);
        kappa0 = kappa;
    }
    return splineChain;
}

function constructInitialGuessForThetas(pathPoints, theta0) {
    var thetas = [theta0];
    for(var iPoint = 1; iPoint < pathPoints.length - 1; iPoint++)
    {
        thetas.push(
            Math.atan2(
                pathPoints[iPoint+1].y - pathPoints[iPoint-1].y,
                pathPoints[iPoint+1].x - pathPoints[iPoint-1].x
            )
        );
    }
    thetas.push(
        Math.atan2(
            pathPoints[pathPoints.length-1].y - pathPoints[pathPoints.length-2].y,
            pathPoints[pathPoints.length-1].x - pathPoints[pathPoints.length-2].x
        )
    );
    return thetas;
}
    
function HermiteSplineChainFromPointsAndTangents(constantV, pathPoints, thetas) {
    this.V = constantV;
    this.pathPoints = Array.from(pathPoints);
    this.thetas = Array.from(thetas);
    this.splines = [];
    this.wholeShapePoints = null;
    
    var currentTime = 0.0;
    var theta0 = thetas[0];
    
    // Assume that the tangent at point (i) is given by averaging the slopes of the
    // two adject line segments, from (i-1) to (i) and from (i) to (i+1).
    // The tangent at the first point is given as theta0.
    // The tangent at the last point is assumed to be equivalent to the vector between the last two points.
    var firstDistance = pathPoints[1].distance || getDistance(pathPoints[0], pathPoints[1]);
    var tangent1 = {
        x: firstDistance * Math.cos(theta0),
        y: firstDistance * Math.sin(theta0)
    };
    for(var iPoint = 1; iPoint < pathPoints.length; iPoint++) {
        var tangent2 = {};
        if(iPoint == pathPoints.length - 1) {
            tangent2 = {
                x: pathPoints[iPoint].distance * Math.cos(thetas[iPoint]),
                y: pathPoints[iPoint].distance * Math.sin(thetas[iPoint])
            }
        } else {
            /*var d2x = 0.5*(pathPoints[iPoint+1].x - pathPoints[iPoint-1].x);
            var d2y = 0.5*(pathPoints[iPoint+1].y - pathPoints[iPoint-1].y);
            tangent2 = {
                x: d2x,
                y: d2y
            }*/
            var avgd = 0.5*(pathPoints[iPoint].distance + pathPoints[iPoint+1].distance);
            tangent2 = {
                x: avgd * Math.cos(thetas[iPoint]),
                y: avgd * Math.sin(thetas[iPoint])
            }
        }
        
        var spline = new HermiteSpline(pathPoints[iPoint-1], pathPoints[iPoint], tangent1, tangent2);
        var arcLength = spline.arcLengthApproximation();
        this.splines.push({
            function: spline,
            arcLength: arcLength,
            startTime: currentTime,
            endTime: currentTime + arcLength/this.V
        });
        
        currentTime += arcLength/this.V;
        tangent1 = {
            x: tangent2.x,
            y: tangent2.y
        };
    }
    this.endTime = currentTime;
    console.log("splines.length = " + this.splines.length);
    console.log("Start times = " + JSON.stringify(this.splines.map(function(s){return s.startTime})));
    
    // Now "this.splines" contains the entire path in terms of splines.
    
    this.evaluateAt = function(time) {
        var splineIndex = this.splines.findIndex(
            function(s, index){
                return (s.startTime <= time) && (s.endTime >= time);
            }
        );
        var currentSpline = this.splines[splineIndex];
        var t = (time - currentSpline.startTime)/(currentSpline.endTime - currentSpline.startTime);
        var result = currentSpline.function.evaluateAt(t);
        console.log("t=" + t + " splineIndex=" + splineIndex + " state=" + JSON.stringify(result));
        return result;
    }
    
    this.wholeShape = function(nPointsPerSegment){
        if(this.wholeShapePoints){
            return this.wholeShapePoints;
        }
        
        var lastPoint = this.splines[0].function.evaluateAt(0);
        lastPoint.time = 0.0;
        var wholeShapePoints = [lastPoint];
        
        this.splines.forEach(
            function(s)
            {
                var n = nPointsPerSegment || Math.round(s.arcLength / 10) || 10;
                for(var j = 1; j <= n; j++)
                {
                    var thisPoint = s.function.evaluateAt(1.0*j/n);
                    var segmentTravelTime = getDistance(lastPoint, thisPoint) / this.V;
                    thisPoint.time = lastPoint.time + segmentTravelTime;
                    wholeShapePoints.push(thisPoint);
                    
                    lastPoint = {
                        x: thisPoint.x,
                        y: thisPoint.y,
                        time: thisPoint.time,
                        theta: thisPoint.theta
                    }
                }
            }
        )
        this.wholeShapePoints = wholeShapePoints;
        return wholeShapePoints;
    }
    
    return this;
}

function HermiteSpline(point1, point2, tangent1, tangent2) {
    // Algorithm from https://en.wikipedia.org/wiki/Cubic_Hermite_spline#Interpolation_on_a_single_interval
    this.point1 = point1;
    this.point2 = point2;
    this.tangent1 = tangent1;
    this.tangent2 = tangent2;
    this.arcLength = null;
    this.lengthMap = null;
    //console.log("HermiteSpline(" + JSON.stringify(this.point1) + ", " + JSON.stringify(this.point2) + ", " + JSON.stringify(this.tangent1) + ", " + JSON.stringify(this.tangent2) + ")");
    
    this.evaluateAt = function(t, doNotComputeTheta){
        //console.log("HermiteSpline evaluateAt(" + t + ") : " + JSON.stringify(this.point1) + ", " + JSON.stringify(this.point2) + ", " + JSON.stringify(this.tangent1) + ", " + JSON.stringify(this.tangent2));
        var h00 = (1.0 + 2.0*t) * (1.0 - t) * (1.0 - t);
        var h10 = t * (1.0 - t) * (1.0 - t);
        var h01 = t * t * (3.0 - 2.0*t);
        var h11 = t * t * (t - 1.0);
        
        //console.log("h = " + h00 + ", " + h10 + ", " + h01 + ", " + h11);
        //console.log("x = " + h00*this.point1.x + ", " + h10*this.tangent1.x + ", " + h01*this.point2.x + ", " + h11*this.tangent2.x);
        //console.log("y = " + h00*this.point1.y + ", " + h10*this.tangent1.y + ", " + h01*this.point2.y + ", " + h11*this.tangent2.y);
        
        var result = {
            x: h00*this.point1.x + h10*this.tangent1.x + h01*this.point2.x + h11*this.tangent2.x,
            y: h00*this.point1.y + h10*this.tangent1.y + h01*this.point2.y + h11*this.tangent2.y,
            theta: null
        }
        if(!doNotComputeTheta){
            var d00 = -6.0 * t * (1.0 - t);
            var d10 = -(1.0 - t) * (3.0 * t - 1.0);
            var d01 = 6.0 * t * (1.0 - t);
            var d11 = t * (3.0 * t - 2.0);

            var dxdt = d00*this.point1.x + d10*this.tangent1.x + d01*this.point2.x + d11*this.tangent2.x;
            var dydt = d00*this.point1.y + d10*this.tangent1.y + d01*this.point2.y + d11*this.tangent2.y;
            result.theta = Math.atan2(dydt, dxdt);
        }
        return result;
    }
    
    this.arcLengthApproximation = function(){
        if (this.arcLength !== null){
            return this.arcLength;
        }
        var nSegments = 32;
        var dt = 1.0/nSegments;
        var points = [];
        for(var i = 0; i <= nSegments; i++){
            points.push(this.evaluateAt(dt*i, true, true));
        }
        
        this.lengthMap = [{
            fractionByTCoordinate: 0.0,
            fractionByArcLength: 0.0
        }];
        var lengthAllPoints = 0.0;
        //var lengthHalfPoints = 0.0;
        for(var j = 1; j <= nSegments; j++){
            var d = getDistance(points[j], points[j-1]);
            
            // Add to the lengthMap.
            var newMapPoint = {
                fractionByTCoordinate: 1.0*j/nSegments,
                fractionByArcLength: d
            }
            this.lengthMap.push(newMapPoint);
            
            // Compute the total length so far.
            lengthAllPoints += d;
            //if(j % 2 == 0){
            //    lengthHalfPoints += getDistance(points[j], points[j-2]);
            //}
        }
        
        // Take two approximate answers, one sampled at half the Reimann-interval as the other, and
        // extrapolate to the case of having a Reimann-interval approaching 0. Extrapolate assuming
        // that the error of the approximation increases with the Reimann-interval squared.
        var totalArcLength = lengthAllPoints ;//+ (lengthAllPoints - lengthHalfPoints)/(1.0 - 0.25)*(0.25)

        this.arcLength = totalArcLength;
        var cumulativeD = 0.0;
        this.lengthMap.forEach(function(mapPoint){
            var thisD = mapPoint.fractionByArcLength;
            cumulativeD += thisD/totalArcLength;
            mapPoint.fractionByArcLength = cumulativeD;
        });
        this.lengthMap[this.lengthMap.length-1].fractionByArcLength = 1.0; // Correct for machine-epsilon
        return totalArcLength;
    }
    
    return this;
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




function sortKeysReplacer(key, value) {
    return (value instanceof Object) && !(value instanceof Array) ? 
        Object.keys(value)
        .sort()
        .reduce((sorted, key) => {
            sorted[key] = value[key];
            return sorted 
        }, {}) :
        value;
}