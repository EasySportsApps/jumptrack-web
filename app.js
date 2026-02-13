const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const table = document.getElementById('results');

let baseline = null;
let inAir = false;
let takeoffTime = null;
let jumpCount = 0;

const g = 9.81;

const pose = new Pose({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

pose.onResults(results => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks) return;

    const leftFoot = results.poseLandmarks[31];
    const rightFoot = results.poseLandmarks[32];

    const l_y = leftFoot.y * canvas.height;
    const r_y = rightFoot.y * canvas.height;

    const footAvg = (l_y + r_y) / 2;

    if (baseline === null) {
        baseline = footAvg;
    }

    // Línea baseline
    ctx.beginPath();
    ctx.moveTo(0, baseline);
    ctx.lineTo(canvas.width, baseline);
    ctx.strokeStyle = "blue";
    ctx.stroke();

    const threshold = 10;

    // Despegue
    if (!inAir && footAvg < baseline - threshold) {
        inAir = true;
        takeoffTime = performance.now();
    }

    // Aterrizaje
    if (inAir && footAvg >= baseline - threshold) {
        inAir = false;

        let flightTime = (performance.now() - takeoffTime) / 1000;
        let height = g * flightTime * flightTime / 8 * 100;

        jumpCount++;

        addRow(jumpCount, flightTime, height);

        baseline = footAvg; // reset
    }

    // Dibujar pies
    drawPoint(leftFoot, "red");
    drawPoint(rightFoot, "red");
});

function drawPoint(p, color) {
    ctx.beginPath();
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 6, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function addRow(jump, ft, h) {
    let row = table.insertRow();

    row.insertCell(0).innerText = jump;
    row.insertCell(1).innerText = ft.toFixed(3);
    row.insertCell(2).innerText = h.toFixed(1);
}

// Cámara
const camera = new Camera(video, {
    onFrame: async () => {
        await pose.send({ image: video });
    },
    width: 640,
    height: 480
});

camera.start();
