function solveForArc(constantV, x0, y0, theta0, x1, y1)
{
    console.log("solveForArc");
    console.log("    V  = " + constantV);
    console.log("    x0 = " + x0);
    console.log("    y0 = " + y0);
    console.log("    th0= " + theta0);
    console.log("    x1 = " + x1);
    console.log("    y1 = " + y1);
    var dx = (x1 - x0) || 0.001;
    var dy = (y1 - y0) || 0.001;
    var d = Math.sqrt(dx*dx + dy*dy);
    console.log("  dx = " + dx);
    console.log("  dy = " + dy);
    
    var fraction = (dx * Math.cos(theta0) + dy * Math.sin(theta0))/d;
    var alpha = Math.atan(dx/dy);
    var beta = (dy > 0 ? 1.0 : -1.0) * Math.asin(fraction);
    console.log("  f  = " + fraction);
    console.log("  a  = " + alpha);
    var tPrime;
    if (Math.abs(theta0 + alpha) <= 0.5 * Math.PI) {
        console.log("  (PI - asin - alpha - theta)");
        tPrime = Math.PI - beta - alpha - theta0;
    } else {
        console.log("  (asin - alpha - theta)");
        tPrime = beta  - alpha - theta0;
    }
    console.log("  t' = " + tPrime);
    var vPrime = dx / (Math.sin(theta0 + tPrime) - Math.sin(theta0));
    var vPrimeConfirm = dy / (Math.cos(theta0) - Math.cos(theta0 + tPrime));
    console.log("  v' = " + vPrime);
    console.log("  v\" = " + vPrimeConfirm);
    if( Math.abs(vPrimeConfirm/vPrime - 1.0) > 0.001 ) {
        var msg = "Inconsistent calculation: vPrime = " + vPrime + " != " + vPrimeConfirm;
        throw msg;
    }
    
    var dtheta = constantV / vPrime;
    var tmax = tPrime / dtheta; 
    if (tmax < 0){
        tmax = (tPrime - Math.round(tPrime/2.0/Math.PI) * 2.0*Math.PI)/dtheta;
    }
    console.log("    dtheta = " + dtheta);
    console.log("    tmax   = " + tmax);
    return new OneArc (constantV, x0, y0, theta0, dtheta, tmax);
}

function OneArc (constantV, x0, y0, theta0, dtheta, tmax) {
    this.V = constantV;
    this.x0 = x0;
    this.y0 = y0;
    this.theta0 = theta0;
    this.dtheta = dtheta;
    this.tmax = tmax;
    this.startTime = null;
    
    
    this.getLocation = function(localTime) {
        var theta = this.theta0 + this.dtheta * localTime;
        return {
            theta: theta,
            x: this.x0 + this.V / this.dtheta * (Math.sin(theta) - Math.sin(this.theta0)),
            y: this.y0 + this.V / this.dtheta * (Math.cos(this.theta0) - Math.cos(theta)),
        }
    }
    return this;
}



function PathOfArcs (velocity, initialAngle, pathPoints) {
    this.arcs = [];
    this.pathStartTime = new Date();
    this.currentIndex = 0;
    
    var currentArcStartTime = this.pathStartTime;
    var currentAngle = initialAngle;
    for (var i = 0; i < pathPoints.length - 1; i++)
    {
        var arc = solveForArc(velocity, pathPoints[i].x, pathPoints[i].y, currentAngle, pathPoints[i+1].x, pathPoints[i+1].y);
        var currentArcEndTime = new Date(currentArcStartTime.getTime() + arc.tmax * 1000.0);
        this.arcs.push({
            arc: arc,
            startTime: currentArcStartTime,
            endTime: currentArcEndTime
        });

        currentArcStartTime = currentArcEndTime;
        currentAngle = arc.theta0 + arc.dtheta * arc.tmax;
        currentAngle -= (2.0*Math.PI) * Math.round( currentAngle/(2.0*Math.PI));
    }

    
    
    this.getLocation = function(datetime)
    {
        if( (datetime < this.arcs[this.currentIndex].startTime) || (datetime > this.arcs[this.currentIndex].endTime) )
        {
            this.currentIndex = this.arcs.findIndex(
                function(arc) {
                    return (datetime >= arc.startTime) && (datetime <= arc.endTime);
                }
            )
            if(this.currentIndex < -1){
                throw "Datetime cannot be found within this path.";
            }
        }
        
        var activeArc = this.arcs[this.currentIndex];
        var localTime = datetime - activeArc.startTime;
        return activeArc.getLocation(localTime);
    }
    
    return this;
}