const PARAM1 = 1;
const PARAM2 = 100000;
const TEST_NUM = 1000;
const E = 10;
const B = 0.001;

let latestImprovements;
let currentImprovement;
let countOutside;

onmessage = message => {
    steepestAscent2(message.data.polygonCoords, message.data.coords);
}

let steepestAscent2 = (polygonCoords, coords) => {
    //Initializing the algorithm
    let stuck = false;
    let stopValue = false;
    let iterations = 0;
    let currentPoly = Array.from(polygonCoords);

   do {
       iterations++;

        let fitnesSet = [];
        let polySet = []

        //Generating a set of selected polygon points and fitness values
        for(let i = 0; i < polygonCoords.length; i++) {
            for(let j = 0; j < TEST_NUM; j++) {
                let newPolygon = modifyPolygon(currentPoly, i);
                fitnesSet.push(fitnes(newPolygon, coords));
                polySet.push(newPolygon);
            }
        }

        //Selecting the best generated alternative coordinates based on fitness
        let polyIndex = argMin(fitnesSet);
        let bestModifiedPoly = polySet[polyIndex];
        const fitOriginal = fitnes(currentPoly, coords);
        const fitCopy = fitnes(bestModifiedPoly, coords);
    
        //Core part of steepest hill climbing algorithm
        if(fitCopy < fitOriginal) {
            currentPoly = bestModifiedPoly;
            const currentPerimeter = calcPerimeter(currentPoly)
            postMessage({currentPoly, currentPerimeter, iterations, fitCopy})
        }
        else {
            stuck = true;
        }
        
        currentImprovement = fitOriginal - fitCopy;
        stopValue = stopCondition();
    } while(stopCondition() && !stuck);
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

const argFact = (compareFn) => (array) => array.map((el, idx) => [el, idx]).reduce(compareFn)[1];
const argMin = argFact((max, el) => (el[0] < max[0] ? el : max));

let stopCondition = () => {
    if(currentImprovement > B) {
        return true;
    }

    return false;
}

function modifyPolygon(poly, index) {
    let newPoly = poly.map((item, i) => {
        if(i != index) {
            return item;
        }

        let rndAngle = Math.random()*Math.PI*2;
        let newPoint = {x: poly[index].x + Math.cos(rndAngle)*E, y: poly[index].y + Math.sin(rndAngle)*E};
        return newPoint;
    })

    return newPoly;
}

function distanceToLine(p1, p2, dot) {
    return Math.abs((dot.x-p1.x) * (-p2.y+p1.y) + (dot.y-p1.y) * (p2.x-p1.x)) / Math.sqrt(Math.pow(-p2.y+p1.y, 2) + Math.pow(p2.x-p1.x, 2))
}
 
function fitnes(poly, coords) {
    let fitnes = 0;
    countOutside = 0;

    //Add perimeter to fitnes with weight
    const perimeter = calcPerimeter(poly);
    fitnes += PARAM1 * perimeter;

    for(let i = 0; i < coords.length; i++) {
        //determine, if given dot is outside/inside polygon
        let isInside = checkInside(poly, coords[i]);

        //when point is outside of polygon add dist to closest line to fitnes multiplie by weight
        if(!isInside) {
            countOutside++;
            let closestLine = getClosestLine(poly, coords[i]);
            let closestLineDist = distanceToLine(poly[closestLine.p1], poly[closestLine.p2], coords[i]);
            let penalty = closestLineDist > 20? 100 : closestLineDist;
            fitnes += PARAM2 * penalty;
        }   
    }

    return fitnes
}

//returns the index of dots, that are forming a line
function getClosestLine(poly, dot) {
    let distances = [];

    for(let i = 0; i < poly.length - 2; i++) {
        const dist = distanceToLine(poly[i], poly[i+1], dot);
        distances.push(dist);
    }
    const distLast = distanceToLine(poly[poly.length-1], poly[0], dot);
    distances.push(distLast);

    let shortestDistIndex = argMin(distances);
    const index = shortestDistIndex == poly.length -1 ? 0 : shortestDistIndex + 1; 
    const line = {p1: shortestDistIndex, p2: index};
    return line;
}

function calcPerimeter(poly) {
    let perimeter = 0;

    for(let i = 0; i < poly.length - 1; i++) {
        perimeter += distanceFromPoint(poly[i], poly[i+1]);
    }
    perimeter += distanceFromPoint(poly[poly.length-1], poly[0]);

    return perimeter;
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
    result = {x: p1.x - p2.x, y: p1.y - p2.y}
    return result;
}

function crossProduct(p1, p2) {
    return p1.x * p2.y - p2.x * p1.y;
}

function distanceFromLine(lp1, lp2, p) {
    for(let i = 0; i < polygonDeg; i++) {
        return ((lp2.y - lp1.y)*p.x - (lp2.x - lp1.x)*p.y + lp2.x*lp1.y - lp2.y*lp1.x) / Math.sqrt(Math.pow(lp2.y - lp1.y, 2) + Math.pow(lp2.x - lp1.x, 2));
    }
}

function distanceFromPoint(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

function sleep(seconds) 
{
  var e = new Date().getTime() + (seconds * 1000);
  while (new Date().getTime() <= e) {}
}
