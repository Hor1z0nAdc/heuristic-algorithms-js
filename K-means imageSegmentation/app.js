const canvas = document.getElementById("canvas");
const grayCanvas = document.getElementById("grayCanvas");
const imageSelector = document.getElementById("imageSelector");
const clasterInput = document.getElementById("clasterInput");
const startButton = document.getElementById("startBtn");
const imageTag = document.getElementById("imageTag");
const mainCtx = canvas.getContext("2d");
const grayCtx = grayCanvas.getContext("2d");
const reader = new FileReader();

let numOfClusters;
let centroids;
let imageWidth;
let imageHeight;
let pixels; //holds grayscale values 0-255

reader.onload = e => {
    //changes imageTags's src to selected image
    imageTag.src = e.target.result;
}

imageSelector.addEventListener('change', e => {
    //creats src for imageTag
    const file = e.target.files[0];
    reader.readAsDataURL(file);
})

startButton.addEventListener("click", (e) =>{
    e.preventDefault();
    numOfClusters = getNumOfClusters();
    const colors = [];

    //init colors in object rgba form
    for(let i = 0; i < numOfClusters; i++) {
        colors.push(getRandomColor());
    }

    //create gray scaled image
    const grayScaledPixels = averageGrayScale(imageTag);
    grayCtx.putImageData(grayScaledPixels, 0, 0, 0, 0, imageWidth, imageHeight);

    //get pixel indexes in clustered form
    const clusters = KMeans();
    
    //recolor image
    const recoloredPixels = getRecoloredPixels(clusters, colors);
    mainCtx.clearRect(0,0,imageTag.width, imageTag.height);
    mainCtx.putImageData(recoloredPixels, 0, 0, 0, 0, imageTag.width, imageTag.height);

})

function KMeans() {
    let clusters;  //holds the indexes of pixels
    let newCentroids = randomInitCentroids();  //centroid value ranges between 0-255 (intensity)
    
    let isContinue = true;
    let numOfRuns = 0;
    centroids = Array.from(newCentroids);

    while(isContinue) {
        numOfRuns++;
        clusters = [];

        //init clusters for current run
        for(let i = 0; i < numOfClusters; i++) {
            clusters.push([]);
        }
        
        //determine distances from every pixel to every centroid
        for(let i = 0; i < pixels.length; i++) {
            const pixel = pixels[i];
            const distances = getDistance(centroids, pixel);
            
            //add pixel to closest cluster
            const minCentroidIndex = getClosestClusterIndex(distances);
            clusters[minCentroidIndex].push(i);
        }
        
        //determine new centroids based on average of cluster points
        for(let i = 0; i < clusters.length; i++) {
            let cluster = clusters[i];
            let average = 0;

            for(let j = 0; j < cluster.length; j++) {
                average += pixels[cluster[j]];
            }
            average /= cluster.length;
            newCentroids[i] = average; 

            //const average = clusters[i].reduce((a, b) => pixels[a] + pixels[b], 0) / clusters[i].length;
        }
        
        //check if centroids changed (continue until there is change)
        if(JSON.stringify(centroids) === JSON.stringify(newCentroids)) {
            isContinue = false;
        }

        centroids = Array.from(newCentroids);
    }   

    return clusters;
}

function getDistance(centroids, pixel) {
    let pixelDistances = [];

    for(let i = 0; i < centroids.length; i++) {
        let distance = Math.abs(pixel - centroids[i]);
        pixelDistances.push(distance);
    }

    return pixelDistances;
}

function getClosestClusterIndex(distances) {
    let minimum = Math.min(...distances);
    let minCentroidIndex = distances.indexOf(minimum);

    return minCentroidIndex;
}

function getRandomColor() {
    const randomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);
    const randomByte = () => randomNumber(0, 255);
    const randomPercent = () => (randomNumber(200, 255));

    return { r: randomByte(), g: randomByte(), b: randomByte(), a: 255 };
}

function getNumOfClusters() {
    return parseInt(clasterInput.value);
}

function randomInitCentroids() {
    let set = [];

    for(let i = 0; i < numOfClusters; i++) {
        let centroid;

        do {
           centroid = randomIntFromInterval(0,255);

        }while(set.includes(centroid))
        set.push(centroid);
    }

    return set;
}

function luminosityGrayScale(imageObj) {
    imageWidth = imageObj.width;
    imageHeight = imageObj.height;
    
    //draw image on temporary canvas and extract pixels
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    grayCanvas.width = imageWidth;
    grayCanvas.height = imageHeight;
    mainCtx.drawImage(imageObj, 0, 0, imageWidth, imageHeight);
    let imagePixels = mainCtx.getImageData(0, 0, imageWidth, imageHeight);

    //create average gray scale image
    for(let y = 0; y < imagePixels.height; y++){
        for(let x = 0; x < imagePixels.width; x++){
            let i = (y * 4) * imagePixels.width + x * 4;
            imagePixels.data[i] *= 0.21; 
            imagePixels.data[i + 1] *= 0.72; 
            imagePixels.data[i + 2] *= 0.07;
        }
    }

    return imagePixels;
}

function getRecoloredPixels(clusters, colors) {
    let imagePixels = mainCtx.getImageData(0, 0, imageWidth, imageHeight);
    let pixelIndex;

    //recolor pixels based on clusters
    for(let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        const color = colors[i];

        for(let j = 0; j < cluster.length; j++) {
            pixelIndex = cluster[j] * 4;

            imagePixels.data[pixelIndex] = color.r;
            imagePixels.data[pixelIndex + 1] = color.g;
            imagePixels.data[pixelIndex + 2] = color.b;
            imagePixels.data[pixelIndex + 3] = color.a;
        }
    }
   
    return imagePixels;
}

function averageGrayScale(imageObj) {
    pixels = [];
    imageWidth = imageObj.width;
    imageHeight = imageObj.height;
    
    //draw image on temporary canvas and extract pixels
    canvas.width = imageWidth;
    canvas.height = imageHeight;
    grayCanvas.width = imageWidth;
    grayCanvas.height = imageHeight;
    mainCtx.drawImage(imageObj, 0, 0, imageWidth, imageHeight);
    let imagePixels = mainCtx.getImageData(0, 0, imageWidth, imageHeight);

    //create average gray scale image
    for(let y = 0; y < imagePixels.height; y++){
        for(let x = 0; x < imagePixels.width; x++){
            let i = (y * 4) * imagePixels.width + x * 4;
     
            const avg = (imagePixels.data[i] + imagePixels.data[i + 1] + imagePixels.data[i + 2]) / 3;
            imagePixels.data[i] = avg; 
            imagePixels.data[i + 1] = avg; 
            imagePixels.data[i + 2] = avg;
            pixels.push(imagePixels.data[i]);
        }
    }

    return imagePixels;
}

function randomIntFromInterval(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}