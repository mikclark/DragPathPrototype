var goldenRatio = (Math.sqrt(5) + 1.0)/2.0;
function goldenRatioMinimization(functionToMinimize, leftPoint, rightPoint, tolerance, maxIter)
{
    tolerance = tolerance || 1e-4;
    maxIter = maxIter || 100;
    
    var delta = (rightPoint - leftPoint)/goldenRatio;
    var midPointLeft = rightPoint - delta;
    var midPointRight = leftPoint + delta;
    if(Math.abs(midPointLeft - midPointRight) < tolerance){
        return 0.5*(midPointLeft + midPointRight);
    }
    
    var fMidPointLeft = functionToMinimize(midPointLeft);
    var fMidPointRight = functionToMinimize(midPointRight);
    
    if(fMidPointLeft < fMidPointRight){
        return goldenRatioMinimization(functionToMinimize, leftPoint, midPointRight);
    } else {
        return goldenRatioMinimization(functionToMinimize, midPointLeft, rightPoint);
    }
}