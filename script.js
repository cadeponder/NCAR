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

const earthWidth = 200;
const earthHeight = 200;
const earthImage = new Image(earthWidth, earthHeight);
earthImage.src = "earth.png";

globalObliquityAngle = 0

handLabels = ['point', 'closed', 'open', 'pinch']

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
 * 
 *      OBLIQUITY FUNCTIONS
 * 
 */

/**
 * Renders the obliquity interactions
 * 
 * @param {Array} predictions 
 */
function renderObliquity(predictions) {
    // find all hands
    hands = predictions.filter(p => handLabels.includes(p.label))
    face = predictions.find(p => p.label == 'face')

    angle = 0

    context.save()

    if (hands.length >= 2) {
        // TODO: handle >2 hands
        if (hands[0].bbox && hands[1].bbox) {
            globalObliquityAngle = calculateObliquityAngle(hands[0].bbox, hands[1].bbox)
        }
    }

    // if face detected, render earth there
    if (face && face.bbox) {
        renderEarth(face.bbox, globalObliquityAngle)

        renderSunAcrossEarth(face.bbox)
        context.restore()

        renderAngleDisplay(globalObliquityAngle)
    }
}

/**
 * Draw the sun on the same y-position as the Earth positioned over visitor's face
 * 
 * @param {Array} bbox 
 */
function renderSunAcrossEarth(bbox) {
    // render sun rays
    context.fillStyle = 'yellow'
    context.arc(600, calcBboxCenter(bbox)[1], 50, 0, 2 * Math.PI);
    context.fill()
}

/**
 * Show the user the degrees they are rotating the Earth's axis
 * 
 * @param {number} angle 
 */
function renderAngleDisplay(angle) {
    context.fillStyle = 'white'
    context.fillText("You are tilting Earth's axis by " + angle + "degrees", 10, 50);
}

/**
 * Get the angle between the hands and draw a line between them
 * 
 * @param {Array} hands - an array of 2 or more hand bounding boxes detected on the screen
 */
function calculateObliquityAngle(hand1, hand2) {
    x1 = hand1[0]
    y1 = hand1[1]

    x2 = hand2[0]
    y2 = hand2[1]

    // check if hands need to be swapped (if hand1 was on the right)
    if (x1 > x2) {
        x1 = x2
        y1 = y2

        x2 = hand1[0]
        y2 = hand1[1]
    }

    // Draw line between two hands
    // TODO: Change this so it goes through face? Or Vertical line for earth's axis?
    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineTo
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.closePath()

    // https://gist.github.com/conorbuck/2606166
    actualAngle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

    // divide true angle so the rotation of the Earth image isn't so sensitive    
    adjustedAngle = Math.abs(actualAngle / 30)

    // constrain angle so Earth doesn't flip :P
    if (adjustedAngle > .75) {
        return .75
    } else {
        return adjustedAngle
    }
}

/**
 * Draw Earth image over face
 * 
 * TOOD: scale to how big the person's head is
 * 
 * @param {Array} bbox - bounding box of the face
 * @param {number} angle - the rotation of the axis based on the hand position
 */
function renderEarth(bbox, angle) {
    earthCenter = calcBboxCenter(bbox)
    earthX = earthCenter[0]
    earthY = earthCenter[1]

    width = bbox[2]
    height = width

    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
    // translate to center of face
    context.translate(earthX, earthY)
    context.rotate(angle)

    // https://stackoverflow.com/questions/4422293/rotate-an-image-around-its-center-in-canvas
    context.drawImage(earthImage, -width / 2, -height / 2, width, height);
    
    // translate back
    context.rotate(-angle)
    context.translate(-earthX, -earthY)
    
}

/**
 * 
 *      ECCENTRICITY FUNCTIONS
 * 
 */

/**
 * Draw a yellow circle of the face detected
 * 
 * @param {} bbox 
 */
function renderSun(bbox) {
    sun = calcBboxCenter(bbox)
    sunX = sun[0]
    sunY = sun[1]

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

/**
 * 
 *      HELPER FUNCTIONS
 * 
 */

function calcDistance(x1, y1, x2, y2) {
    const a = x1 - x2;
    const b = y1 - y2;

    return Math.sqrt( a*a + b*b );
}

/**
 * Takes a bbox with [x, y, width, height]
 * and return an array representing the center of this box
 * [cx, cy]
 * 
 * @param {Array} bbox
 * @returns 
 */
function calcBboxCenter(bbox) {
    return [bbox[0] + bbox[2] / 2, bbox[1] + bbox[3] / 2]
}

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});