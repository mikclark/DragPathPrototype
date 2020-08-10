function missileStartFiring(event, ship)
{
    console.log("Firing");
}

function missileFinishFiring(event, ship, interval)
{
    console.log("Cease fire");
    function makeMissileFly(thisMissile){
        var now = new Date();
        if( now >= thisMissile.destination.t ) {
            interval.cancel(thisMissile.missileInterval);
            for (var prop in thisMissile) {
                delete thisMissile[prop];
            }
            return;
        }
        var f = (now - thisMissile.origin.t) / (thisMissile.destination.t - thisMissile.origin.t);
        thisMissile.cx = (1.0-f)*thisMissile.origin.x + f*(thisMissile.destination.x);
        thisMissile.cy = (1.0-f)*thisMissile.origin.y + f*(thisMissile.destination.y);
    }

    var newMissile = {
        origin: {
            x: ship.cx,
            y: ship.cy, 
            t: new Date()
        },
        destination: {
            x: event.x,
            y: event.y,
            t: new Date()
        },
        speed: 400,
        angle: Math.atan2(event.y - ship.cy, event.x - ship.cx),
        style: {
            stroke: "red",
            fill: "red"
        },
        cx: ship.cx,
        cy: ship.cy,
        points: [
            {x:4,y:0},
            {x:0,y:4},
            {x:-4,y:0},
            {x:0,y:-4}
        ]
    };
    
    newMissile.travelDistance = getDistance(event, ship);
    newMissile.travelTime = newMissile.travelDistance/newMissile.speed;
    newMissile.destination.t = new Date( newMissile.origin.t.getTime() + 1000.0 * newMissile.travelTime);

    newMissile.missileInterval = interval(makeMissileFly, 50, 0, true, newMissile);

    return newMissile;
}
