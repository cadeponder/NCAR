const video = document.getElementById("myvideo");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
let trackButton = document.getElementById("trackbutton");
let updateNote = document.getElementById("updatenote");

let isVideo = false;
let model = null;

sunX = null;
sunY = null;

const modelParams = {
    flipHorizontal: true,   // flip e.g for video  
    maxNumBoxes: 20,        // maximum number of boxes to detect
    iouThreshold: 0.5,      // ioU threshold for non-max suppression
    scoreThreshold: 0.6,    // confidence threshold for predictions.
}

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

function toggleVideo() {
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



function runDetection() {
    model.detect(video).then(predictions => {
        console.log("Predictions: ", predictions);
        model.renderPredictions(predictions, canvas, context, video);

        // if face detected, render sun there
        face = predictions.find(p => p.label == 'face')
        if (face && face.bbox) {
          renderSun(face.bbox);
        }

        // if point detected, use that to control ellipse
        point = predictions.find(p => p.label == 'closed')
        if (point && point.bbox) {
          renderOrbit(point.bbox)
        }

        if (isVideo) {
            requestAnimationFrame(runDetection);
        }
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
  }
}

// Load the model.
handTrack.load(modelParams).then(lmodel => {
    // detect objects in the image.
    model = lmodel
    updateNote.innerText = "Loaded Model!"
    trackButton.disabled = false
});