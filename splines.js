function addCatmullRomPointsToPath(pathPoints, theta0){
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

function HermiteSplineChainWithCatmullRomTangents(constantV, pathPoints, theta0) {
    this.V = constantV;
    this.splines = [];
    
    var currentTime = 0.0;
    
    // Assume that the tangent at point (i) is given by averaging the slopes of the
    // two adject line segments, from (i-1) to (i) and from (i) to (i+1).
    // The tangent at the first point is given as theta0.
    // The tangent at the last point is assumed to be equivalent to the vector between the last two points.
    var tangent1 = {
        x: this.V * Math.cos(theta0),
        y: this.V * Math.sin(theta0)
    };
    for(var iPoint = 0; iPoint < pathPoints.length - 1; iPoint++) {
        var d2x;
        var d2y;
        if(iPoint == pathPoints.length - 2) {
            d2x = pathPoints[iPoint+1].x - pathPoints[iPoint].x;
            d2y = pathPoints[iPoint+1].y - pathPoints[iPoint].y;
        } else {
            d2x = pathPoints[iPoint+2].x - pathPoints[iPoint].x;
            d2y = pathPoints[iPoint+2].y - pathPoints[iPoint].y;
        }
        var d = Math.sqrt(d2x*d2x+d2y*d2y);
        var tangent2 = {
            x: this.V * d2x/d,
            y: this.V * d2y/d
        };
        
        var spline = new HermiteSpline(pathPoints[iPoint], pathPoints[iPoint+1], tangent1, tangent2);
        var arcLength = spline.arcLengthApproximation();
        this.splines.push({
            function: spline,
            arcLength: arcLength,
            startTime: currentTime,
            endTime: currentTime + arcLength/this.V
        });
        
        currentTime += arcLength/this.V;
        tangent1 = tangent2;
    }
    this.endTime = currentTime;
    console.log("splines.length = " + this.splines.length);
    for(var iii = 0; iii < this.splines.length; iii++){
        console.log("spline[" + iii + "] = " + JSON.stringify(this.splines[iii], null, 4));
    }
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
        var wholeShapePoints = [this.splines[0].function.evaluateAt(0, true, true)];
        this.splines.forEach(
            function(s) {
                for(var j = 1; j <= nPointsPerSegment; j++){
                    wholeShapePoints.push(s.function.evaluateAt(1.0*j/nPointsPerSegment, true, true));
                }
            }
        )
        return wholeShapePoints;
    }
    
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
    
    this.evaluateAt = function(t, doNotComputeTheta, doNotUseMap){
        //console.log("HermiteSpline evaluateAt(" + t + ") : " + JSON.stringify(this.point1) + ", " + JSON.stringify(this.point2) + ", " + JSON.stringify(this.tangent1) + ", " + JSON.stringify(this.tangent2));
        if(!doNotUseMap){
            t = this.mapTByLength(t);
        }
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
            theta: Math.atan2(dydt, dxdt)
        }
        if(!doNotComputeTheta){
            var d00 = 6.0 * t * (1.0 + t);
            var d10 = (1 - t) * (3.0 * t - 1.0);
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
    
    this.mapTByLength = function(fractionLength){
        if(fractionLength < 0.0 || fractionLength > 1.0){
            throw ("HermiteSpline.mapT received an invalid fractionLength: " + fractionLength);
        }
        
        var middleIndex = Math.floor(this.lengthMap.length/2);
        var startSearchIndex = (fractionLength >= this.lengthMap[middleIndex].fractionByArcLength) ? middleIndex : 0;
        for(var i = startSearchIndex; i < this.lengthMap.length - 1; i++){
            var f1 = this.lengthMap[i].fractionByArcLength;
            var t1 = this.lengthMap[i].fractionByTCoordinate;
            var f2 = this.lengthMap[i+1].fractionByArcLength;
            var t2 = this.lengthMap[i+1].fractionByTCoordinate;
            if(f1 <= fractionLength && fractionLength <= f2){
                return t1 + (t2 - t1)/(f2 - f1) * (fractionLength - f1);
            }
        }
        return undefined;
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