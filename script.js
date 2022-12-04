const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

let isVideo = false;
let model = null;
let cycleParam = null;

let sunX = null;
let sunY = null;
let sunWidth = null;

let leftHandE = null;
let leftHandP = null;
let rightHandP = null;

const helperText = {
    raiseLeft: "Raise your left hand",
    moveLeft: "Move your left hand to cover the Earth with more ice",
    chooseOneHand: "Raise left or right hand to set summer equinox position",
    summerPeri: "Summer equinox is in Perihelion",
    summerApi: "Summer equinox is in Apihelion",
    obliquity: "Raise both hands to tilt the Earth",
    pause: "Waiting for model to load...",
    eWin: "by changing eccentricity",
    pWin: "by putting the summer equinox in Apihelion",
    oWin: "by tilting the Earth to 22.1 degrees",
    eTooHigh: "Too wide. Make the orbit less eccentric",
    eTooLow: "Not wide enough. Make the orbit more eccentric",
    oTooLow: "Tilted too far",
    oTooHigh: "Not tilted enough",
    eWinBottom: "Eccentricity set to ice age conditions",
    pWinBottom: "Summer equinox set to ice age conditions",
    oWinBottom: "Obliquity set to ice age conditions"
}

// booleans for tracking help image overlays
let shownEOverlay = false;
let startedETimer = false;
let shownPOverlay = false;
let startedPTimer = false;
let shownOOverlay = false;
let startedOTimer = false;

/**
 *      TIMING / WIN CONTROLS
 */
// how many ms to show overlay before allowing user interaction
const overlayTimeLimit = 5000;

 // all win conditions will only start to check after 10 seconds on that cycle
const winTimerLimit = 10000; 
const winTransitionTimer = 5000; // ms time to show win message over canvas
let startedWinTimer = false;
let shouldCheckWin = false;
let changedPageAfterWin = false;

// win conditions
const eWin = 300; // distance from head to hand must be 300 px on canvas
const eWinRange = 25; // +=25
let eWinningDist = 0;
let eWinningBbox = null;
let eWon = false; // switch if they win

let hasSwitchedRight = false;
const pWin = 3; // count how many times they have switched between peri to api
let pWon = false; // switch if they win

// oblquity angle must be += oWinRange from this oWin value to win
let oWin = .25; // use let so that we change oWin to exact angle once user gets it
const oWinRange = .05;
let oWon = false; // switch if they win

// these are so we can manually clear timeouts on page transitions
let winTimeout = null;
let overlayTimeout = null;
let winTransitionTimeout = null;


/**
 * 
 *      Overlay images
 * 
 */
// png is not perfect square; scale the height
heightScale = 1.44
const earthImageWidth = 200;
const earthImageHeight = earthImageWidth * heightScale;
const earthImage = new Image(earthImageWidth, earthImageHeight);
earthImage.src = "earth_with_axis.png";

const eOverlay = new Image(640, 480);
eOverlay.src = "img/eOverlay.png";

const pOverlay = new Image(640, 480);
pOverlay.src = "img/pOverlay.png";

const oOverlay = new Image(640, 480);
oOverlay.src = "img/oOverlay.png";

const introOverlay = new Image(640, 480);
introOverlay.src = "img/introOverlay.png";

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

// decide if Earth should go on left-hand side or right-hand side of sun
const Choices = {
    left: 'l',
    right: 'r',
    none: 'n'
}

let choice = Choices.none;

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
 * Change button over to reload the page
 */
function allowRestart() {
    restartButton = document.querySelector("button");
    restartButton.innerText = "Start over";
    restartButton.addEventListener("click", reloadPage);
}

function reloadPage() {
    location.reload();
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
    if (model) {
        model.detect(video).then(predictions => {
            // console.log("Predictions: ", predictions);
            model.renderPredictions(predictions, canvas, context, video);

            // Intro page
            if (cycleParam == null) {
                context.drawImage(introOverlay, 0, 0, canvas.width, canvas.height);
                detectBothHands(predictions);
            }

            // Eccentricity
            if (cycleParam == CycleParams.e) {
                if (eWon) {
                    winTransition(helperText.eWin);
                }

                callCycleFunction(shownEOverlay, eOverlay, startedETimer, renderEccentricity, predictions);
                startedETimer = true;
            }
            
            // Precession/perihelion
            if (cycleParam == CycleParams.p) {
                if (pWon) {
                    winTransition(helperText.pWin);
                }
                
                callCycleFunction(shownPOverlay, pOverlay, startedPTimer, renderPerihelionInteraction, predictions);
                startedPTimer = true;
            }

            // Obliquity
            if (cycleParam == CycleParams.o) {
                if (oWon) {
                    winTransition(helperText.oWin)
                }
                
                callCycleFunction(shownOOverlay, oOverlay, startedOTimer, renderObliquity, predictions);
                startedOTimer = true;
            }

            if (isVideo) {
                requestAnimationFrame(runDetection);
            }
        });
    } else {
        // prompt user to start their video
        homeHelperText = document.getElementById('edText');
        homeHelperText.textContent = helperText.pause;
    }
}

function detectBothHands(predictions) {
    hands = findHands(predictions);
    
    if (hands.length >= 2) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        changePage();
    }
}

/**
 *   
 * Calls the cycleFunction after a timeout is set to show an introductory overlay
 * 
 * @param {boolean} shownOverlay - has the overlay been shown to the user?
 * @param {boolean} startedTimer - has setTimeout been called?
 * @param {Image} overlayImg - overlay image to show
 * @param {function} cycleFunctionCallback - eg. renderEccentricity, renderObliquity
 * @param {Object} predictions - the model predictions to pass to cycleFunctionCallback
 */
function callCycleFunction(shownOverlay, overlayImg, startedTimer, cycleFunctionCallback, predictions) {
    if (!shownOverlay) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(overlayImg, 0, 0, canvas.width, canvas.height);

        if (!startedTimer) {
            resetConditionsPageChange();
            overlayTimeout = setTimeout(clearOverlay, overlayTimeLimit);
        }
    } else {
        cycleFunctionCallback(predictions);
    }
}

/**
 * Reset all of the win condition booleans
 */
function resetConditionsPageChange() {
    // reset all of the win condition booleans
    startedWinTimer = false;
    shouldCheckWin = false;
    changedPageAfterWin = false;

    clearTimeout(winTimeout);
    clearTimeout(winTransitionTimeout);
    clearTimeout(overlayTimeout);

    renderHelperText("");
}

/**
 * 
 * Clear the helper overlay and set booleans so that it doesn't show again
 * 
 */
function clearOverlay() {
    if (cycleParam == CycleParams.e) {
        shownEOverlay = true;
    }

    if (cycleParam == CycleParams.p) {
        shownPOverlay = true;
    }

    if (cycleParam == CycleParams.o) {
        shownOOverlay = true;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * 
 * Starts the timer to wait for winTimerLimit ms 
 * before allowing user to "win" and progress to next page
 * 
 */
function startWinTimer() {
    winTimeout = setTimeout(() => {
        shouldCheckWin = true;
    }, winTimerLimit)
}

/**
 * 
 * Show a message when the user "wins"
 * 
 * @param {string} text 
 */
function winTransition(text) {
    context.fillStyle = "white";
    context.rect(0, 0, canvas.width, 100);
    context.fill();
    context.fillStyle = "black";
    context.font = '32px serif';
    context.fillText("You just promoted an ice age", 10, 50);
    context.fillText(text, 10, 80);

    if (!changedPageAfterWin) {
        winTransitionTimeout = setTimeout(() => {
            changePage();
        }, winTransitionTimer)

        changedPageAfterWin = true;
    }
}

/**
 *      ECCENTRICITY 
 */
function renderEccentricity(predictions) {
    if (!startedWinTimer) {
        startWinTimer();
    }

    // if face detected, render sun there
    face = predictions.find(p => p.label == 'face')
    if (face && face.bbox) {
        renderSun(face.bbox);
    }

    // look for left hand
    hands = findHands(predictions);
    
    if (hands.length > 0) {
        // look for hand with x coord less than sun x coord
        leftHandE = hands.find(h => h.bbox && h.bbox[0] < sunX)
    }
    
    if (!shouldCheckWin) {
        if (leftHandE == null) {
            renderHelperText(helperText.raiseLeft)
        } else {
            // remove overlay
            shownEOverlay = true;
            renderHelperText(helperText.moveLeft)
        }
    }

    // clear out leftHand if it ends up moving past sun
    if (leftHandE && leftHandE.bbox && leftHandE.bbox[0] > sunX - sunWidth) {
        leftHandE = null
    }

    if (leftHandE) {
        if (eWon) leftHandE = {bbox: eWinningBbox};
        renderOrbitEccentricity(leftHandE.bbox)
    }
}

/**
 * Draw an orbit based on the LEFT hand position
 * 
 * @param {Array} bbox - bounding box of left hand
 */
 function renderOrbitEccentricity(bbox) {
    earthCenterForOrbit = calcBboxCenter(bbox)
    earthX = earthCenterForOrbit[0]
    earthY = earthCenterForOrbit[1]
    earthWidth = bbox[2]
    
    minimumOrbitRadius = sunWidth;
    xRadius = minimumOrbitRadius;
    yRadius = 75;

    // if sun exists and left hand exists
    if (sunX && sunY && leftHandE) {
        // change x radius (width) based on distance from sun's x to earth's x
        // but don't let it go lower than the minimum orbit radius
        xRadius = ((sunX + minimumOrbitRadius) - earthX) / 2

        // center of orbit needs to be off-center
        centerX = xRadius + earthX
        centerY = sunY

        drawRedEllipse(centerX, centerY, xRadius, yRadius);

        // Calculate distance between hand and face
        // this will make the ice melt based on how far earth is from sun
        distSunToEarth = calcDistance(sunX, sunY, earthX, earthY)

        if (eWon) {
            distSunToEarth = eWinningDist;
        }

        // divide by 3 here so that ice growth is more drastic
        percentScale = (canvas.width / 3 - distSunToEarth) / (canvas.width / 3)

        // change y so that the Earth stays on the orbit
        // https://math.stackexchange.com/questions/22064/calculating-a-point-that-lies-on-an-ellipse-given-an-angle
        bbox[1] = centerY + yRadius * Math.sin(0) - (bbox[3] / 2)
        renderEarth(bbox, .2, percentScale)

        if (shouldCheckWin) {
            if (distSunToEarth < eWin - eWinRange) { // too low
                renderHelperText(helperText.eTooLow);
            } else if (distSunToEarth > eWin + eWinRange) { // too high
                renderHelperText(helperText.eTooHigh);
            } else {
                eWon = true; // just right!
                eWinningDist = distSunToEarth;
                eWinningBbox = bbox;
                renderHelperText(helperText.eWinBottom);
            }
        }
    }
}

/**
 * Draws a red ellipse on the canvas - used by eccentricity & precession
 * 
 * https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/ellipse
 * params are: x, y, radiusX, radiusY, rotation, startAngle, endAngle
 */
function drawRedEllipse(x, y, xRadius, yRadius) {
    // Draw the ellipse
    context.strokeStyle = "red";
    context.lineWidth = 1;
    context.beginPath();
    context.ellipse(x, y, xRadius, yRadius, 0, 0, 2 * Math.PI);
    context.stroke();
    context.closePath()
    context.lineWidth = 0;
}

/**
 * Allow user to move the summer equinox position
 * by raising their left or right hand
 * 
 * @param {Array} predictions
 */
function renderPerihelionInteraction(predictions) {
    renderHelperText(helperText.chooseOneHand);

    // if face detected, render sun there
    face = predictions.find(p => p.label == 'face');
    if (face && face.bbox) {
        renderSun(face.bbox);
    }

    hands = findHands(predictions);
    
    if (hands.length > 0) {
        // left: look for hand with x coord less than sun x coord
        leftHandP = hands.find(h => h.bbox && h.bbox[0] < sunX);

        // right: look for hand with x coord greater than sun x coord
        rightHandP = hands.find(h => h.bbox && h.bbox[0] > sunX);
    }
    
    // instruct user to raise one hand 
    if (leftHandP == null && rightHandP == null) {
        renderHelperText(helperText.chooseOneHand);
    }

    renderOrbitP(leftHandP ? leftHandP.bbox : null, rightHandP ? rightHandP.bbox : null)
}

/**
 * Draw a yellow circle on the face detected
 * 
 * @param {Array} bbox 
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
 * Draw an orbit and Earth for Precession
 * Earth position is based on whether the left or the right hand is up
 * 
 * @param {Array or null} left - bounding box of left hand
 * @param {Array or null} right - bounding box of left hand
 */
function renderOrbitP(left, right) {
    if (left && right) {
        // if left higher up than right, choose left
        // note that y position grows as it moves DOWN the screen
        if (left[1] > right[1]) {
            choice = Choices.right;
        } else {
            choice = Choices.left;
        }
    } else if (left) {
        choice = Choices.left;
    } else if (right) {
        choice = Choices.right;
    }

    // increment count if they switched left/right hand
    if (choice == Choices.right) {
        hasSwitchedRight = true;
    }

    // keep left if pWon is true
    if (pWon) {
        choice = Choices.left;
    }

    // show appropriate helper text about summer equinox position
    textToShow = (choice == Choices.left) ? helperText.summerApi : 
        (choice == Choices.right) ? helperText.summerPeri : 
        helperText.chooseOneHand;
    renderHelperText(textToShow);
    
    // default orbit for precession
    xRadius = 200;
    yRadius = 75;

    // if sun exists
    if (sunX && sunY) {
        centerX = sunX - 50
        centerY = sunY

        // draw orbit
        drawRedEllipse(centerX, centerY, xRadius, yRadius)

        // if left: 0%, if right: 100%, else 50%
        percentScale = (choice == Choices.left) ? 0 : (choice == Choices.right) ? 1 : .5;

        // normalize distance to 0-180 (corresponds to position on ellipse)
        positionOnEllipse = calculateRadians(percentScale, Math.PI, 2 * Math.PI)

        // set up bbox for earth
        bbox = [0, 0, 100, 100]

        // adjust x, y so that Earth is on the orbit path
        // https://math.stackexchange.com/questions/22064/calculating-a-point-that-lies-on-an-ellipse-given-an-angle
        bbox[0] = centerX + xRadius * Math.cos(positionOnEllipse) - (bbox[2] / 2)
        bbox[1] = centerY + yRadius * Math.sin(positionOnEllipse) - (bbox[3] / 2)

        // adjust angle so that Earth's axis is pointed towards sun (NH summer)
        adjustedAngle = calculateRadians(percentScale, -.2, .2, true)

        renderEarth(bbox, adjustedAngle, percentScale)

        if (choice == Choices.left && hasSwitchedRight) {
            pWon = true;
            renderHelperText(helperText.pWinBottom);
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
    if (!startedWinTimer) {
        startWinTimer();
    }

    renderHelperText(helperText.obliquity)

    // find all hands
    hands = findHands(predictions)
    face = predictions.find(p => p.label == 'face')

    angle = 0

    context.save()

    if (hands.length >= 2) {
        // TODO: handle >2 hands
        if (hands[0].bbox && hands[1].bbox) {
            globalObliquityAngle = calculateObliquityAngle(hands[0].bbox, hands[1].bbox)
        }
    }

    // if won, keep angle at winning angle
    if (oWon) {
        globalObliquityAngle = oWin;
    }

    // if face detected, render earth there
    if (face && face.bbox) {
        renderEarth(face.bbox, globalObliquityAngle)

        renderSunAcrossEarth(face.bbox)
        context.restore()

        if (shouldCheckWin) {
            if (globalObliquityAngle < oWin - oWinRange) { // too low
                renderHelperText(helperText.oTooLow);
            } else if (oWin + oWinRange < globalObliquityAngle) { // too high
                renderHelperText(helperText.oTooHigh);
            } else { // just right!
                oWon = true;
                oWin = globalObliquityAngle;
                renderHelperText(helperText.oWinBottom);
            }
        }
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
 */
function renderEarth(bbox, angle, scalePercent=(angle/angleMax)) {
    earthCenter = calcBboxCenter(bbox);
    earthX = earthCenter[0];
    earthY = earthCenter[1];
    bboxWidth = bbox[2];

    width = bboxWidth;
    height = width * heightScale;

    //      translate to center of bbox

    // https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/rotate
    context.translate(earthX, earthY);
    context.rotate(angle);

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

/**
 * Find all of the hands detected, with a score of 75% accuracy or higher
 * 
 * @param {Array} predictions list of predictions to search through
 * @returns 
 */
function findHands(predictions) {
    return predictions.filter(p => handLabels.includes(p.label) && p.score > .75)
}

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
 * Render text to instruct user
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