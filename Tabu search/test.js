const PARAM1 = 1;
const PARAM2 = 10000;
const TEST_NUM = 1000;
const E = 2;
const B = 0.01;
const TABU_ENVIRONMENT = 50000000;
const RUN_NUM = 10;

let latestImprovements;
let currentImprovement;
let countOutside;
let numOfStop;
let queue = [];

onmessage = message => {
    tabuSearch(message.data.coords, message.data.polygonDeg);
}

function tabuSearch(pointCoords, polygonDeg) {
    //Initializing the tabu search algorithm
    let optimalPolygon = undefined;
    let optimalFitness = 9999999999;
    let tabuStopvalue = false;
    let tabuIteration = 0;
    let iterations;
    numOfStop = 0;
    queue = [];
    
    //Body of tabu search
    do {
        //Initializing the random starting state for hill climbing
        tabuIteration++;
        iterations = 0;
        let polygon = initPolygon(polygonDeg, pointCoords);
        let peri = calcPerimeter(polygon);
        let initFitnes = fitnes(polygon, pointCoords)

        setTabuBarrier();
        postMessage({currentPoly: polygon, currentPerimeter: peri, iterations, fitCopy: initFitnes, optimalFit: initFitnes, tabuIteration})

        //Initializing the hill climbing algorithm
        let stuck = false;
        let stopValue = false;
        let isTabuValue = false;
        let currentPoly = Array.from(polygon);
        
        //Body of hill climbing
        do {
            iterations++;

            //Initializing the optimal polygon at first run
            if(optimalPolygon == undefined || (fitnes(currentPoly, pointCoords) < fitnes(optimalPolygon, pointCoords))) {
                optimalPolygon = currentPoly;
                optimalFitness = fitnes(optimalPolygon, pointCoords);
            }

            addTabu(currentPoly);
            if(queue.length >= 10000) {
                purgeTabu();
            }
            
            //START OF Q-ARGMIN PART
            //Selecting random point of the polygon
            const index = Math.floor(Math.random() * (currentPoly.length));

            let fitnesSet = [];
            let polySet = []

            //Generating a set of selected polygon points and fitness values
            for(let i = 0; i < TEST_NUM; i++) {
                let newPolygon = modifyPolygon(currentPoly, index);
                fitnesSet.push(fitnes(newPolygon, pointCoords));
                polySet.push(newPolygon);
            }

            //Selecting the best generated alternative coordinates based on fitness
            let polyIndex = argMin(fitnesSet);
            let bestModifiedPoly = polySet[polyIndex];
            const fitOriginal = fitnes(currentPoly, pointCoords);
            const fitCopy = fitnes(bestModifiedPoly, pointCoords);
            //END OF Q-ARGMIN PART

            //Core part of steepest hill climbing algorithm
            if(fitCopy < fitOriginal) {
                currentPoly = bestModifiedPoly;
                const currentPerimeter = calcPerimeter(currentPoly)
                postMessage({currentPoly, currentPerimeter, iterations, fitCopy, optimalFit: optimalFitness, tabuIteration})
            }
            else {
                stuck = true;
            }
            
            currentImprovement = fitOriginal - fitCopy;
            stopValue = stopCondition();
            isTabuValue = isTabu(currentPoly, polygonDeg);
        } while(stopValue && !stuck && !isTabuValue);
            
        tabuStopvalue = tabuStopCondition(tabuIteration);
    }while(tabuStopvalue)

    optimalFitness = fitnes(optimalPolygon, pointCoords);
    const currentPerimeter = calcPerimeter(optimalPolygon);
    console.log("num of stops: " + numOfStop)
    postMessage({currentPoly: optimalPolygon, currentPerimeter, iterations, fitCopy:optimalFitness, optimalFit: optimalFitness, tabuIteration})
}

function tabuStopCondition(tabuIteration) {
    if(tabuIteration >= RUN_NUM) {
        return false;
    }

    return true;
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

function setTabuBarrier() {

}

function isTabu(polygon, polygonDeg) { 
    const tabuBoundary = TABU_ENVIRONMENT * polygonDeg;   
    queue.forEach(tabuElement => { 
        let totalDist = 0;

        polygon.forEach(point => {
            totalDist += distanceFromPoint(point, tabuElement);
        })

        if(totalDist <= tabuBoundary) {
            numOfStop++;
            return true;
        }
    })

    return false;
}

function addTabu(p) {
    queue.push(p);
}

function purgeTabu() {
    queue.shift();
}

function initPolygon(polygonDeg, coords) {
    polygonCoords = [];
    let degArea = 360 / polygonDeg;
    let midPoint = getCenter(coords);
    let furthestP = distanceFromPoint(midPoint, coords[0]);
    
    for(let i = 1; i < coords.length; i++) {
        let dist = distanceFromPoint(midPoint, coords[i]);
        if(dist > furthestP) {
            furthestP = dist;
        }
    }

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
    if(poly == undefined) {
        return 9999999999;
    }
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

            fitnes += PARAM2 * closestLineDist;
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

function getCenter(coords) {
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

function degToRad(degrees)
{
  const pi = Math.PI;
  return degrees * (pi/180);
}

function sleep(seconds) 
{
  var e = new Date().getTime() + (seconds * 1000);
  while (new Date().getTime() <= e) {}
}