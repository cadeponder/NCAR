const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

let isVideo = false;
let model = null;
let cycleParam = null;

sunX = null;
sunY = null;
sunWidth = null;

leftHand = null;

// png is not perfect square; scale the height
heightScale = 1.44
const earthImageWidth = 200;
const earthImageHeight = earthImageWidth * heightScale;
const earthImage = new Image(earthImageWidth, earthImageHeight);
earthImage.src = "earth_with_axis.png";

let globalObliquityAngle = 0
const angleMax = .75

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
    maxNumBoxes: 5,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.6,    // confidence threshold for predictions.
    bboxLineWidth: "0.01",  // get rid of bounding boxes drawn on video
    fontSize: 0
}

/**
 * Starts the webcam video and runs detection
 */
function startVideo() {
    handTrack.startVideo(video).then(function (status) {
        if (status) {
            isVideo = true
            runDetection()
        } else {
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
function toggleVideo() {
    if (!isVideo) {
        startVideo();
    } else {
        handTrack.stopVideo(video)
        isVideo = false;
    }
}

/**
 * Controls which interaction is used
 * 
 * @param {CycleParams} c : 
 * e: 'e',
 * p: 'p',
 * o: 'o'
 * 
 */
function setCycle(c) {
    cycleParam = c
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
        // console.log("Predictions: ", predictions);
        model.renderPredictions(predictions, canvas, context, video);

        // Eccentricity or Precession render orbit controls
        if (cycleParam == CycleParams.e || cycleParam == CycleParams.p) {
            renderOrbitInteraction(predictions, cycleParam)
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
 *      ECCENTRICITY 
 *          & 
 *      PRECESSION 
 *      FUNCTIONS
 */

/**
 * Renders orbit interactions
 * - Sun on face
 * - Orbit & earth based on LEFT hand
 * 
 * @param {Array} predictions 
 * @param {CycleParam} c (can be 'e' or 'p')
 */
function renderOrbitInteraction(predictions, c) {
    renderHelperText("Eccentricity")

    // if face detected, render sun there
    face = predictions.find(p => p.label == 'face')
    if (face && face.bbox) {
        renderSun(face.bbox);
    }

    // look for left hand
    hands = predictions.filter(p => handLabels.includes(p.label))
    
    if (hands.length > 0) {
        // look for hand with x coord less than sun x coord
        leftHandArray = hands.filter(h => h.bbox && h.bbox[0] < sunX)
        leftHand = leftHandArray.length > 0 ? leftHandArray[0] : leftHand
    }

    // clear out leftHand if it ends up moving past sun
    if (leftHand && leftHand.bbox && leftHand.bbox[0] > sunX - sunWidth) {
        leftHand = null
    }

    // if Precession, always render Earth on orbit regardless of left hand presence
    if (leftHand || c == CycleParams.p) {
        bboxParam = leftHand ? leftHand.bbox : [0,0,0,0]
        renderOrbit(bboxParam, c)
    }
}

/**
 * Draw a yellow circle of the face detected
 * 
 * @param {} bbox 
 */
 function renderSun(bbox) {
    sun = calcBboxCenter(bbox)
    sunX = sun[0]
    sunY = sun[1]
    sunWidth = bbox[2]

    // sun on face
    context.fillStyle = "yellow";
    context.beginPath();
    context.arc(sunX, sunY, sunWidth / 2, 0, 2 * Math.PI);
    context.closePath()
    context.fill();
}

/**
 * Draw an orbit based on the LEFT hand position
 * 
 * @param {} bbox - bounding box of left hand
 * @param {CycleParam} c - can be 'e' or 'p'
 */
function renderOrbit(bbox, c) {
    x = bbox[0]
    y = bbox[1]
    earthWidth = bbox[2]
    isEccentricity = c == CycleParams.e

    maxEarthWidth = sunWidth / 1.25;
    earthWidth = maxEarthWidth > earthWidth ? maxEarthWidth : earthWidth;
    earthCenterX = x + earthWidth / 2;
    
    // default orbit for precession
    xRadius = 200;
    yRadius = 75;

    minimumOrbitRadius = sunWidth;

    // if sun exists and left hand exists
    if (sunX && sunY && sunX > x) {

        // if eccentricity, change ellipse width based on bbox x coordinate
        if (isEccentricity) {
            // xRadius = sunX - (x + earthWidth / 2) - sunWidth / 2;
            xRadius = ((sunX + minimumOrbitRadius) - earthCenterX) / 2
            // keep orbit at least as big as a perfect circle around sun
            // xRadius = xRadius > minimumOrbitRadius ? xRadius : minimumOrbitRadius;
        }

        centerX = xRadius + earthCenterX
        centerY = sunY

        // adjust center of orbit if we get more eccentric than perfect circle
        // if (xRadius > minimumOrbitRadius) {
        //     centerX = xRadius + x + earthWidth / 2 - sunWidth / 2;
        // }

        // Draw the ellipse
        context.strokeStyle = "red";
        context.lineWidth = 1;
        context.beginPath();
        // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/ellipse
        // params are: x, y, radiusX, radiusY, rotation, startAngle, endAngle
        context.ellipse(centerX, centerY, xRadius, yRadius, 0, 0, 2 * Math.PI);
        context.stroke();
        context.closePath()
        context.lineWidth = 0;

        // Calculate distance between hand and face
        // For eccentricity, this will make the ice melt based on how far earth is from sun
        // For precession, we will use this to move earth along the orbital path
        distSunToEarth = calcDistance(sunX, sunY, x, y)
        //todo: check numbers... what is maximum?
        percentScale = (700 - distSunToEarth) / 700

        // ECCENTRICITY: hand stretches orbit width
        if (isEccentricity) {
            // change y so that the Earth stays on the orbit
            bbox[1] = centerY + yRadius * Math.sin(0) - (bbox[3] / 2)
            renderEarth(bbox, .2, percentScale, maxEarthWidth)
        } else if (x > 0) {
            // this is how far left hand is from center on a percentage
            handDistFromCenter = (250 - x)/250

            // PRECESSION: hand moves NH summer location on orbit
            // normalize distance to 0-180 (corresponds to position on ellipse)
            positionOnEllipse = calculateRadians(handDistFromCenter, Math.PI, 2 * Math.PI)
            console.log(positionOnEllipse)

            // adjust bbox so that x, y of Earth moves across orbit
            // based on left hand position
            // https://math.stackexchange.com/questions/22064/calculating-a-point-that-lies-on-an-ellipse-given-an-angle
            bbox[0] = centerX + xRadius * Math.cos(positionOnEllipse) - (bbox[2] / 2)
            bbox[1] = centerY + yRadius * Math.sin(positionOnEllipse) - (bbox[3] / 2)

            // adjust angle so that Earth's axis is pointed towards sun (NH summer)
            adjustedAngle = calculateRadians(handDistFromCenter, -.2, .2, true)

            renderEarth(bbox, adjustedAngle, handDistFromCenter, maxEarthWidth)
        }
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
    context.fillStyle = 'yellow';
    context.beginPath()
    context.arc(600, calcBboxCenter(bbox)[1], 50, 0, 2 * Math.PI);
    context.closePath()
    context.fill()
}

/**
 * Show the user the degrees they are rotating the Earth's axis
 * 
 * @param {number} angle 
 */
function renderAngleDisplay(angle) {
    context.fillStyle = 'white';
    context.fillText("You are tilting Earth's axis by " + angle + "degrees", 10, 50);
}

/**
 * Get the angle between the hands and draw a line between them
 * 
 * @param {Array} hands - an array of 2 or more hand bounding boxes detected on the screen
 */
function calculateObliquityAngle(hand1, hand2) {
    hand1 = calcBboxCenter(hand1)
    hand2 = calcBboxCenter(hand2)

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
    context.lineWidth = 2;
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.closePath()
    context.lineWidth = 0;

    // https://gist.github.com/conorbuck/2606166
    actualAngle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

    // divide true angle so the rotation of the Earth image isn't so sensitive    
    adjustedAngle = Math.abs(actualAngle / 30)

    // constrain angle so Earth doesn't flip :P
    if (adjustedAngle > angleMax) {
        return angleMax
    } else {
        return adjustedAngle
    }
}

/**
 * Draw Earth image over bbox
 * 
 * @param {Array} bbox - bounding box: [x, y, width, height]
 * @param {number} angle - the rotation of the axis based on the hand position
 * @param {number} scalePercent - percentge to scale the ice cap by
 * @param {number} maxEarthWidth - prevents earth from getting too big in comparison to sun
 */
function renderEarth(bbox, angle, scalePercent=(angle/angleMax), maxEarthWidth=500) {
    earthCenter = calcBboxCenter(bbox)
    earthX = earthCenter[0]
    earthY = earthCenter[1]
    bboxWidth = bbox[2]

    // set width of earth to either the hand's width or the maximum passed in as maxEarthWidth
    width = bboxWidth > maxEarthWidth ? maxEarthWidth : bboxWidth
    height = width * heightScale

    //      translate to center of bbox

    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
    context.translate(earthX, earthY)
    context.rotate(angle)

    //      Draw Earth image on bbox

    // https://stackoverflow.com/questions/4422293/rotate-an-image-around-its-center-in-canvas
    context.drawImage(earthImage, -width / 2, -height / 2, width, height);

    //      Make the "ice cap"

    // calculate how far the ice should be going...
    // lower angle = more ice
    iceStart = calculateRadians(scalePercent, 1 * Math.PI, 1.49 * Math.PI)
    iceEnd = calculateRadians(scalePercent, 1.51 * Math.PI, 1.99 * Math.PI, true)

    // image here is helpful for arc: https://www.w3resource.com/html5-canvas/html5-canvas-arc.php
    context.fillStyle = "white";
    context.beginPath();
    context.arc(0, 0, width / 2, iceStart, iceEnd)
    context.closePath()
    context.fill()

    // translate back
    context.rotate(-angle)
    context.translate(-earthX, -earthY)
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

/**
 * Helps scale the angle that is set for obliquity to the radians 
 * needed to make the ice cap
 * 
 * https://stackoverflow.com/questions/14224535/scaling-between-two-number-ranges
 * https://www.w3resource.com/html5-canvas/html5-canvas-arc.php 
 * 
 * @param {number} percent - percentage to scale by
 * @param {number} min
 * @param {number} max
 * @param {flip} (optional) - negate the value
 * @returns 
 */
function calculateRadians(percent, min, max, flip=false) {
    if (flip) {
        return max - percent * (max - min)
    }

    return percent * (max - min) + min;
}

/**
 * Render 
 * 
 * @param {String} text 
 */
function renderHelperText(text) {
    helperElement = document.getElementById('helper-text');
    helperElement.textContent = text;
}

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
});