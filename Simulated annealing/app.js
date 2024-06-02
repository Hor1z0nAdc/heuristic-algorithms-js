import { checkInside } from "./common.js"

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
    const time = message.data.time;
    const fitness = message.data.fitNew;

    log.value = log.value + "\nPerimeter: " + perimeter;
    ctx.clearRect(0, 0, canvasW, canvasH);
    drawPoints(coords, "green");
    drawPoints(poly, "red");
    drawLines(poly);
    numSpan.innerText = time;
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
        initPolygon2();
        drawPoints(polygonCoords, "red");
        drawLines(polygonCoords);
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

function initPolygon() {
    polygonCoords = [];
    let midPoint = getCenter();
    let furthestP = distanceFromPoint(midPoint, coords[0]);
    
    for(let i = 1; i < coords.length; i++) {
        let dist = distanceFromPoint(midPoint, coords[i]);
        if(dist > furthestP) {
            furthestP = dist;
        }
    }

    for(let i = 0; i < polygonDeg; i++) {
    
        let angle = Math.random()*Math.PI*2;
        let polyX = Math.cos(angle) * furthestP * 1.2;
        let polyY = Math.sin(angle) * furthestP * 1.2;
        polygonCoords.push({x: polyX + midPoint.x, y: polyY + midPoint.y});
    }
    
    drawPoints(polygonCoords, "red");
    drawLines(polygonCoords);
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