
const fileSelector = document.getElementById('fileSelector');
const startBtn = document.getElementById('startBtn');
const numSpan = document.getElementById('num');
const cFit = document.getElementById('cFit');
const log = document.getElementById('log');
const canvas = document.getElementById("cv");
const ctx = canvas.getContext("2d");
const canvasW = canvas.width;
const canvasH = canvas.height;
const CIRCLE_RADIUS = 12;
const worker = new Worker("worker.js");
let numOfPoints, polygonDeg;
let coords;
let polygonCoords;

startBtn.addEventListener("click", startAlgorithm)

fileSelector.addEventListener('change', (e) => {
    loadData();
});

worker.onmessage = function (message) {
    const poly = message.data.currentPoly;
    const perimeter = message.data.currentPerimeter;
    const iterations = message.data.iterations;
    const fitness = message.data.fitCopy;

    //log the perimeter, update DOM elements, clear the canvas and redraw new point
    log.value = log.value + "\nPerimeter: " + perimeter;
    ctx.clearRect(0, 0, canvasW, canvasH);
    drawPoints(coords, "green");
    drawPoints(poly, "red");
    drawLines(poly);
    numSpan.innerText = iterations;
    cFit.innerText = fitness;
}

function startAlgorithm() {
   worker.postMessage({polygonCoords, coords});
}

function loadData() {
    const file= fileSelector.files[0];
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");
    
    reader.addEventListener("load", () => {
        const fileString = reader.result;
        const lineArray = fileString.split("\r\n");
        
        numOfPoints = parseInt(lineArray[0]);
        polygonDeg = parseInt(lineArray[1]);
        
        coords = [];
        for(let i = 2; i < lineArray.length - 1; i++) {
            let e = {x: parseInt(lineArray[i].split(",")[0]), y: parseInt(lineArray[i].split(",")[1])}
            coords.push(e);
        }

        ctx.clearRect(0, 0, canvasW, canvasH);
        drawPoints(coords, "green");
        initPolygon2(polygonDeg, coords);
        drawPoints(polygonCoords, "red");
        drawLines(polygonCoords)
    })
}

function drawPoints(points, color) {
    ctx.fillStyle = color;
    let x,y;

    for(let i = 0; i < points.length; i++) {
        x = points[i].x;
        y = points[i].y;

        ctx.beginPath();
        ctx.arc(canvasW * 0.5 + x, canvasH * 0.5 + y, CIRCLE_RADIUS, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
    }
}

function drawLines(polygonPoints) {
    ctx.lineWidth = 3;
    for(let i = 0; i < polygonDeg - 1; i++) {
        ctx.beginPath();
        ctx.moveTo(polygonPoints[i].x + canvasW/2, polygonPoints[i].y + canvasH/2);
        ctx.lineTo(polygonPoints[i+1].x + canvasW/2, polygonPoints[i+1].y + canvasH/2);
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(polygonPoints[polygonPoints.length - 1].x + canvasW/2, polygonPoints[polygonPoints.length - 1].y + canvasH/2);
    ctx.lineTo(polygonPoints[0].x + canvasW/2, polygonPoints[0].y + canvasH/2);
    ctx.stroke();
}

function initPolygon(polygonDeg, coords) {
    polygonCoords = [];
    let degArea = 360 / polygonDeg;
    let midPoint = getCenter(coords);

    //determine the furthest point of coords from the centre of mass
    let furthestP = distanceFromPoint(midPoint, coords[0]);
    for(let i = 1; i < coords.length; i++) {
        let dist = distanceFromPoint(midPoint, coords[i]);
        if(dist > furthestP) {
            furthestP = dist;
        }
    }

    //create as many polygon points as it's degree
    for(let i = 0; i < polygonDeg; i++) {
    
        let angle = Math.random() * degArea;
        angle += i * degArea;
        angle = degToRad(angle);
        let polyX = Math.cos(angle) * (furthestP * 1.4);
        let polyY = Math.sin(angle) * (furthestP * 1.4);
        polygonCoords.push({x: polyX + midPoint.x, y: polyY + midPoint.y});
    }

    return polygonCoords;
}

function initPolygon2() {
    polygonCoords = [];
    let degArea = 360 / polygonDeg;
    let midPoint = getCenter();
    let furthestP = distanceFromPoint(midPoint, coords[0]);

    //determine the furthest point of coords from the centre of mass
    for(let i = 1; i < coords.length; i++) {
        let dist = distanceFromPoint(midPoint, coords[i]);
        if(dist > furthestP) {
            furthestP = dist;
        }
    }

    //create new poly until it encloses the starting points
    let isContinue;
    let tempPolygonCoords;
    do {
        isContinue = false;
        tempPolygonCoords = [];

        //create as many polygon points as it's degree
        for(let i = 0; i < polygonDeg; i++) {
            let poly;
            
            let angle = Math.random() * degArea;
            angle += i * degArea;
            angle = degToRad(angle);
            let polyX = Math.cos(angle) * (furthestP * 1.7);
            let polyY = Math.sin(angle) * (furthestP * 1.7);
            poly = {x: polyX + midPoint.x, y: polyY + midPoint.y}
            tempPolygonCoords.push(poly)
        }

        //check if any points are outside the polygon
        let checkIsInside = false;
        for(let i = 0; i < coords.length; i++) {
            checkIsInside = checkInside(tempPolygonCoords, coords[i]);

            if(!checkIsInside) {
                isContinue = true;
                break;
            }
        }
    }
    while(isContinue)

    polygonCoords = Array.from(tempPolygonCoords);
}

function degToRad(degrees)
{
  const pi = Math.PI;
  return degrees * (pi/180);
}

function getCenter() {
    let midX = 0;
    let midY = 0;

    for(let i = 0; i < coords.length; i++) {
        midX += coords[i].x;
        midY += coords[i].y;
    }
    midX /= coords.length;
    midY /= coords.length;

    let data = {x: midX, y: midY};
    return data;
}

function distanceFromLine(lp1, lp2, p) {
    for(let i = 0; i < polygonDeg; i++) {
        return ((lp2.y - lp1.y)*p.x - (lp2.x - lp1.x)*p.y + lp2.x*lp1.y - lp2.y*lp1.x) / Math.sqrt(Math.pow(lp2.y - lp1.y, 2) + Math.pow(lp2.x - lp1.x, 2));
    }
}

function distanceFromPoint(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function checkInside(polygon, point) {
    let tmp = {x:9999, y:point.y};
    let exline = {p1:point, p2: tmp};
    let count = 0;
    let i = 0;
    const n = polygon.length;
    do {
        // Forming a line from two consecutive points of poly
        let side = {p1:polygon[i], p2:polygon[(i + 1) % n]};
    
        if (isIntersect(side, exline)) {
            
            // If side is intersects exline
            if (directionOfPoint(side.p1, side.p2, point) == 0)
            return onLine(side, point);
            count++;
        }
        i = (i + 1) % n;
    } while (i != 0);
    
    // When count is odd
    if(count % 2 == 1) {
        return true;
    }
    return false;
}

function isIntersect(l1, l2)
{
    // Four direction for two lines and points of other line
    let dir1 = directionOfPoint(l1.p1, l1.p2, l2.p1);
    let dir2 = directionOfPoint(l1.p1, l1.p2, l2.p2);
    let dir3 = directionOfPoint(l2.p1, l2.p2, l1.p1);
    let dir4 = directionOfPoint(l2.p1, l2.p2, l1.p2);
 
    // When intersecting
    if (dir1 != dir2 && dir3 != dir4)
        return true;
 
    // When p2 of line2 are on the line1
    if (dir1 == 0 && onLine(l1, l2.p1))
        return true;
 
    // When p1 of line2 are on the line1
    if (dir2 == 0 && onLine(l1, l2.p2))
        return true;
 
    // When p2 of line1 are on the line2
    if (dir3 == 0 && onLine(l2, l1.p1))
        return true;
 
    // When p1 of line1 are on the line2
    if (dir4 == 0 && onLine(l2, l1.p2))
        return true;
 
    return false;
}

function directionOfPoint(p1, p2, dot) {
    let b = substract(p1, dot);
    let p = substract(p2, dot);

    let crossP = crossProduct(b,p);

    //Colinear
    if(crossP == 0) {
        return 0;
    }
    else if(crossP < 0) {
         // Anti-clockwise direction
        return 2;
    }
     // Clockwise direction
     return 1;
}

function substract(p1, p2) {
    let result = {x: p1.x - p2.x, y: p1.y - p2.y}
    return result;
}

function crossProduct(p1, p2) {
    return p1.x * p2.y - p2.x * p1.y;
}

function onLine(l1, p)
{
    // Check whether p is on the line or not
    if (p.x <= Math.max(l1.p1.x, l1.p2.x)
        && p.x <= Math.min(l1.p1.x, l1.p2.x)
        && (p.y <= Math.max(l1.p1.y, l1.p2.y)
            && p.y <= Math.min(l1.p1.y, l1.p2.y)))
        return true;
 
    return false;
}
