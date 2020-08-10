function mirror(points, axis){
    var newpoints = angular.copy(points);
    newpoints.points.forEach(function(p){
        p[axis] = -p[axis];
    })
    return newpoints;
}

function projectPoints(points, directionAndScale){
    return points.map(function(p){
        return {
            x: p.x*directionAndScale.x - p.y*directionAndScale.y,
            y: p.y*directionAndScale.x + p.x*directionAndScale.y
        }
    })
}

function projectShape(shape, directionAndScale){
    return shape.map(function(piece){
        return {
            style: angular.copy(piece.style),
            points: projectPoints(piece.points, directionAndScale)
        };
    });
}

function createXWing(){
    var body = {
        style: {
          	fill: 'grey',
            stroke: 'red',
            'stroke-width': '1'
        },
    	points: [
            {x:0, y:174},
            {x:10, y:144},
            {x:18, y:34},
            {x:18, y:-36},
            {x:-18, y:-36},
            {x:-18, y:34},
            {x:-10, y:144}
        ]
    };
    var engine = {
        points: [
            {x:18,y:28},
            {x:20,y:-56},
            {x:34,y:-56},
            {x:36,y:28}
        ]
    };
    var wing = {
        points: [
            {x:36, y:19},
            {x:90,y:16},
            {x:90,y:112},
            {x:92,y:112},
            {x:96,y:-24},
            {x:88,y:-24},
            {x:88,y:-12},
            {x:36,y:-26}
        ]
    };
    var cockpit = {
        style:{
          	fill: 'black',
            stroke: 'none'
        },
        points: [
          	{x:-5,y:30},
            {x:-5,y:-30},
            {x:5,y:-30},
            {x:5,y:30}
        ]
    };
        
    return rotateShape([
        body,
        engine,
        mirror(engine,'x'),
        wing,
        mirror(wing, 'x'),
        cockpit
    ], -0.5*Math.PI);
}
    
function createAWing(){
    var body = [
        {x:-15,y:75},
        {x:-17,y:64},
        {x:-42,y:0},
        {x:-42,y:-16},
        {x:-24,y:-16},
        {x:-24,y:-48},
        {x:-14,y:-48},
        {x:-12,y:-58},
        {x:12,y:-58},
        {x:14,y:-48},
        {x:24,y:-48},
        {x:25,y:-16},
        {x:42,y:-16},
        {x:42,y:0},
        {x:17,y:64},
        {x:15,y:75}
    ];
    var engine = [
        {x:-30,y:-16},
        {x:-32,y:-48},
        {x:-32,y:-75},
        {x:-16,y:-75},
        {x:-16,y:-16}
    ];
    var blaster = [
        {x:48,y:28},
        {x:49,y:0},
        {x:49,y:-20},
        {x:45,y:-20},
        {x:45,y:-10},
        {x:42,y:-10},
        {x:42,y:-8},
        {x:45,y:-8},
        {x:45,y:0},
        {x:46,y:28}
    ];
    return [
        engine,
        mirror(engine,'x'),
        body,
        blaster,
        mirror(blaster,'x')
    ]
}

function createMilleniumFalcon(){
    var body1 = {
        points: [
            {x:16, y:0},
            {x:16, y:4},
            {x:30, y:4},
            {x:30, y:6},
            {x:8.0, y:13.86},
            {x:0, y:16},
            {x:-8.0, y:13.86},
            {x:-11.3, y:11.3},
            {x:-13.86, y:8.0},
            {x:-16, y:0}
        ]
    };
    var body = {
        style:{
            fill: 'gray',
            stroke: 'white'
        },
        points: body1.points.concat(mirror(body1,'y').points.reverse())
    };
    
    var cockpit = {
        style:{
            fill: "dimgray",
            stroke: "white"
        },
        points: [
            {x:4, y:5.86},
            {x:8, y:13.86},
            {x:12, y:13.86},
            {x:13, y:15.86},
            {x:13, y:16.86},
            {x:12, y:17.86},
            {x:4, y:17.86},
            {x:0, y:7.86}
            
        ]
    };
    
    var dish = {
        style: {
            fill: "dimgray",
            stroke: "white"
        },
        points :[
            {x:10,y:-6},
            {x:10,y:-4},
            {x:9,y:-4},
            {x:8,y:-7},
            {x:8,y:-9},
            {x:9,y:-9},
            {x:10,y:-6},
            {x:7,y:-6},
            {x:7,y:-7},
            {x:10,y:-7}
        ]
    };
    
    /*var engine = [
        {x:-30,y:-16},
        {x:-32,y:-48},
        {x:-32,y:-75},
        {x:-16,y:-75},
        {x:-16,y:-16}
    ];
    var blaster = [
        {x:48,y:28},
        {x:49,y:0},
        {x:49,y:-20},
        {x:45,y:-20},
        {x:45,y:-10},
        {x:42,y:-10},
        {x:42,y:-8},
        {x:45,y:-8},
        {x:45,y:0},
        {x:46,y:28}
    ];
    return [
        engine,
        mirror(engine,'x'),
        body,
        blaster,
        mirror(blaster,'x')
    ]*/
    return [
        body,
        cockpit,
        dish
    ];
}