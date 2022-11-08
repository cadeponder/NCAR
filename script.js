const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
let updateNote = document.getElementById("updatenote");

let isVideo = false;
let model = null;
let cycleParam = null;

sunX = null;
sunY = null;

// constant for which parameter of the M cycle
// e: eccentricity, p: precession, o: obliquity
const CycleParams = {
    e: 'e',
    p: 'p',
    o: 'o'
}

const modelParams = {
    flipHorizontal: true,   // flip e.g for video  
    maxNumBoxes: 20,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.6,    // confidence threshold for predictions.
}

/**
 * Starts the webcam video and runs detection
 * 
 */
function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        console.log("video started", status);
        if (status) {
            updateNote.innerText = "Video started. Now tracking"
            isVideo = true
            runDetection()
        } else {
            updateNote.innerText = "Please enable video"
        }
    });
}

/**
 * This function gets called from the toggle video button on the html
 * passes in a cycleParam to determine with part of the cycle is being viewed
 * (eccentricity, obliquity, precession)
 * 
 * @param {CycleParams} c: e, o or p based on which page
 */
function toggleVideo(c) {
    cycleParam = c;
    if (!isVideo) {
        updateNote.innerText = "Starting video"
        startVideo();
    } else {
        updateNote.innerText = "Stopping video"
        handTrack.stopVideo(video)
        isVideo = false;
        updateNote.innerText = "Video stopped"
    }
}


/**
 * runs detect on the model, giving predictions for what the webcam sees with an array:
 * # array of predicted matches for faces and hands
 * predictions: [
 *   label: 'face' # this can be face, point, closed, open
 *   # bounding box between 
 *   bbox: [
 *     # note: I had a hard time finding docs on exact coords. just got these #s from experimentation
 *     24, # x coordinate out of ~515
 *     87, # y coordinate out of ~360
 *     100, # width
 *     200 # height
 *   ],
 *   class: 5,
 *   score: "0.98" # how accurate the prediction is
 * ]
 * 
 */
function runDetection() {
    model.detect(video).then(predictions => {
        console.log("Predictions: ", predictions);
        model.renderPredictions(predictions, canvas, context, video);

        // Eccentricity
        if (cycleParam == CycleParams.e) {
            renderEccentricity(predictions)
        }

        // Obliquity
        if (cycleParam == CycleParams.o) {
            renderObliquity(predictions)
        }

        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
    });
}

/**
 * Renders the eccentricity interactions
 * - Sun on face
 * - Orbit based on pointed finger
 * 
 * @param {Array} predictions 
 */
function renderEccentricity(predictions) {
    // if face detected, render sun there
    face = predictions.find(p => p.label == 'face')
    if (face && face.bbox) {
      renderSun(face.bbox);
    }

    // if point detected, use that to control ellipse
    point = predictions.find(p => p.label == 'point')
    if (point && point.bbox) {
      renderOrbit(point.bbox)
    }
}

/**
 * Renders the obliquity interactions
 * 
 * @param {Array} predictions 
 */
function renderObliquity(predictions) {
    // if face detected, render earth there
    face = predictions.find(p => p.label == 'face')
    if (face && face.bbox) {
      renderEarth(face.bbox);
    }
}

/**
 * Draw Earth gif
 */
function renderEarth(bbox) {
    const width = 200;
    const height = 200;
    const image = new Image(width, height);
    image.src = "earth.png";

    earthX = bbox[0];
    earthY = bbox[1];

    // earth gif
    image.addEventListener("load", (e) => {
        context.drawImage(image, earthX, earthY, width, height);
    });
}

/**
 * Draw a yellow circle of the face detected
 * 
 * @param {} bbox 
 */
function renderSun(bbox) {
    sunX = bbox[0] + bbox[2] / 2;
    sunY = bbox[1] + bbox[3] / 2;

    // sun on face
    context.fillStyle = "yellow";
    context.beginPath();
    context.arc(sunX, sunY, 50, 0, 2 * Math.PI);
    context.fill();
}

/**
 * Draw an orbit based on the pointed finger position
 * 
 * @param {} bbox 
 */
function renderOrbit(bbox) {
    x = bbox[0]
    y = bbox[1]

    if (sunX && sunY) {
        // Draw the ellipse
        context.strokeStyle = "red";
        context.beginPath();
        radius = 250 - bbox[0];
        // never let radius go negative
        radius = radius > 0 ? radius : 0;

        // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/ellipse
        // params are: x, y, radiusX, radiusY, rotation, startAngle, endAngle
        context.ellipse(sunX, sunY, radius, 100, 0, 0, 2 * Math.PI);
        context.stroke();

        if (calcDistance(sunX, sunY, x, y) < 50) {
            // this is just to test how we get the transition to happen
            console.log("you won!")
        }
    }
}

function calcDistance(x1, y1, x2, y2) {
    const a = x1 - x2;
    const b = y1 - y2;

    return Math.sqrt( a*a + b*b );
}

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});