var handModel = undefined;
var handPredictions = undefined;
let newWidth = 0;
let newHeight = 0;
let ratio = 1;
var boxes = new Array();
var ball;
var diameter = 200;

class Ball {
  constructor(xPos, yPos) {
    this.x = xPos;
    this.y = yPos;
    this.bSelected = false;
    this.bHovering = false;
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  video = createCapture(VIDEO);

  setTimeout(() => {
    console.log(video.width, video.height); // 640->480
    newWidth = windowWidth;
    ratio = newWidth / video.width;
    newHeight = video.height * ratio;
  }, 1000);

  handpose.load().then(function (loadedModel) {
    console.log("Hand pose model loaded");
    handModel = loadedModel;
    predictHand();
  });

  boxes.push(new Ball(windowWidth / 2, windowHeight / 2));

  ball = new Draggable(100, 100, 100, 100);
}

function predictHand() {
  handModel.estimateHands(video.elt).then(function (newPredictions) {
    handPredictions = newPredictions;

    window.requestAnimationFrame(predictHand);
  });
}

function draw() {
  ball.over();
  ball.update();
  ball.show();
  clear();
  noStroke();
  push();
  translate(width, 0);
  scale(-1, 1);
  //image(video, 0, 0, newWidth, newHeight);
  pop();


  if (handPredictions != undefined && handPredictions.length > 0) {
    prediction = handPredictions[0];

    if (prediction.handInViewConfidence > 0.9) {
      palmBase = prediction.annotations.palmBase[0];
      fill(0, 255, 0);

      circle(palmBase[0] * ratio, palmBase[1] * ratio, 10);

      for (const f in prediction.annotations) {
        let finger = prediction.annotations[f];
        let pX;
        let pY;

        for (let i = 0; i < finger.length; i++) {
          const [x, y, z] = finger[i];
          noStroke();

          let pct = (i + 1) / 4;
          fill(0, 128 + 128 * (1 - pct), 255 * pct);
          circle(x * ratio, y * ratio, 8);

          stroke(0, 128 + 128 * (1 - pct), 255 * pct);
          strokeWeight(2);

          if (i === 0) {
            line(
              x * ratio,
              y * ratio,
              palmBase[0] * ratio,
              palmBase[1] * ratio
            );
          } else {
            line(x * ratio, y * ratio, pX * ratio, pY * ratio);
          }
          pX = x;
          pY = y;
        }
      }

      let center = getPalmCenter(prediction);
      fill(255, 150, 0, 100);
      noStroke();

      let isGrabbing = isHandGrabbing(prediction);

      if (isGrabbing) {
        let width = getPalmWidth(prediction);
        circle(center.x * ratio, center.y * ratio, width * 2);
      } else {
        circle(center.x * ratio, center.y * ratio, 15);
      }

      // look through boxes and determine hover/selected states
      let selectedIdx = -1;
      for (let i = 0; i < boxes.length; i++) {
        let b = boxes[i];

        if (
          center.x * ratio > b.x - diameter / 2 &&
          center.x * ratio < b.x + diameter / 2 &&
          center.y * ratio > b.y - diameter / 2 &&
          center.y * ratio < b.y + diameter / 2
        ) {
          boxes[i].bHovering = true;
          boxes[i].bSelected = false;

          if (isGrabbing) {
            boxes[i].bSelected = true;
            selectedIdx = i;
          }

          console.log("hand inside box ");
        } else {
          boxes[i].bHovering = false;
          boxes[i].bSelected = false;
          console.log("hand NOT inside box ");
        }
      }
    }
  }

  push();
  let alpha = 100;
  strokeWeight(1);
  rectMode(CENTER);

  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].bSelected) {
      stroke(250, 0, 0, alpha);
      fill(250, 0, 0, alpha);
    } else if (boxes[i].bHovering) {
      stroke(0, 255, 0, alpha);
      fill(0, 255, 0, alpha);
    } else {
      stroke(200, alpha);
      fill(0, alpha);
    }

    circle(boxes[i].x, boxes[i].y, 200);
  }

  pop();
}

function mousePressed() {
  ball.pressed();
}

function mouseReleased() {
  ball.released();
}

function isHandGrabbing(handPrediction) {
  let isGrabbing = false;

  if (handPrediction != undefined) {
    // get distance from fingertips to palm center, normalized by the width
    // of the hand (i.e. the distance from first index joint to first pinky
    // joint)
    handWidth = getPalmWidth(handPrediction);
    palmCenter = getPalmCenter(handPrediction);

    let fingerTips = [
      handPrediction.annotations.thumb[3],
      handPrediction.annotations.indexFinger[3],
      handPrediction.annotations.middleFinger[3],
      handPrediction.annotations.ringFinger[3],
      handPrediction.annotations.pinky[3],
    ];
    let fingerDists = [0, 0, 0, 0, 0];

    let avgDist = 0;
    for (let i = 0; i < 5; i++) {
      let d =
        dist(fingerTips[i][0], fingerTips[i][1], palmCenter.x, palmCenter.y) /
        handWidth;
      fingerDists[i] = d;
      avgDist += d;
    }
    avgDist /= 5;

    if (avgDist < 0.9) isGrabbing = true;
  }

  return isGrabbing;
}

function getPalmCenter(handPrediction) {
  let indexBase = handPrediction.annotations.indexFinger[0];
  let palmBase = handPrediction.annotations.palmBase[0];
  let pinkyBase = handPrediction.annotations.pinky[0];
  return {
    x: (palmBase[0] + indexBase[0] + pinkyBase[0]) / 3,
    y: (palmBase[1] + indexBase[1] + pinkyBase[1]) / 3,
  };
}

// Get the distance from first index joint to first pinky joint for normalization
function getPalmWidth(handPrediction) {
  let indexBase = handPrediction.annotations.indexFinger[0];
  let pinkyBase = handPrediction.annotations.pinky[0];
  return dist(indexBase[0], indexBase[1], pinkyBase[0], pinkyBase[1]);
}
