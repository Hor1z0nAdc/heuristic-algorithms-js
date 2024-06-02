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

export { checkInside, crossProduct, isIntersect, onLine, substract, directionOfPoint }
