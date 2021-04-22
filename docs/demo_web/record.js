const project = 'Alba';
const step = '0';
const nextURL = 'final.html';
var recordedBlob;

let preview = document.getElementById("preview");
let recording = document.getElementById("recording");
let stopButton = document.getElementById("myBtn");
let downloadButton = document.getElementById("downloadButton");
let logElement = document.getElementById("log");
let completeButtons = document.getElementById("completeButtons");
let reloadButton = document.getElementById("reloadButton");
let sendButton = document.getElementById("sendButton");
let title = document.getElementById("title");
let explanation = document.getElementById("explanation");
let mailinput = document.getElementById("mailinput");
let videoSendButton = document.getElementById("videoSend");
let content = document.getElementById("content");
let sendingBox = document.getElementById("sending-box");


let recordingTimeMS = 2 * 60 * 1000;
var endRecording = new Date().getTime() + recordingTimeMS;

var interval = setInterval(function () {
    var now = new Date().getTime();
    var distance = endRecording - now;
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    document.getElementById("counter").innerHTML = minutes + "m " + seconds + "s ";

    if (distance < 0) {
        clearInterval(interval);
        document.getElementById("counter").innerHTML = "EXPIRED";
    }
}, 1000);

function log(msg) {
    console.log(msg + "\n");
}

function wait(delayInMS) {
    return new Promise(resolve => setTimeout(resolve, delayInMS));
}

function startRecording(stream, lengthInMS) {
    let recorder = new MediaRecorder(stream);
    let data = [];

    recorder.ondataavailable = event => data.push(event.data);
    recorder.start();
    log(recorder.state + " for " + (lengthInMS / 1000) + " seconds...");

    let stopped = new Promise((resolve, reject) => {
        recorder.onstop = resolve;
        recorder.onerror = event => reject(event.name);
    });

    let recorded = wait(lengthInMS).then(
        () => recorder.state == "recording" && recorder.stop()
    );

    return Promise.any([
        stopped,
        recorded
    ]).then(() => data);
}

function stop(stream) {
    stream.getTracks().forEach(track => track.stop());
}

function onLoad() {
    preview = document.getElementById("preview");
    recording = document.getElementById("recording");
    stopButton = document.getElementById("stopButton");
    downloadButton = document.getElementById("downloadButton");
    logElement = document.getElementById("log");
    completeButtons = document.getElementById("completeButtons");
    reloadButton = document.getElementById("reloadButton");
    sendButton = document.getElementById("sendButton");

    title = document.getElementById("title");
    explanation = document.getElementById("explanation");
    mailinput = document.getElementById("mailinput");
    videoSendButton = document.getElementById("videoSend");

    title.innerHTML = "Gravant!";
    explanation.innerHTML = "Cliqueu per parar la gravació";

    completeButtons.style.display = 'none';

    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    })
        .then(stream => {
            preview.srcObject = stream;
            //downloadButton.href = stream;
            preview.captureStream = preview.captureStream || preview.mozCaptureStream;
            return new Promise(resolve => preview.onplaying = resolve);
        })
        .then(() => startRecording(preview.captureStream(), recordingTimeMS))
        .then(recordedChunks => {
            recordedBlob = new Blob(recordedChunks, {type: "video/webm"});
            recording.src = URL.createObjectURL(recordedBlob);
            //downloadButton.href = recording.src;
            //downloadButton.download = "RecordedVideo.webm";

            log("Successfully recorded " + recordedBlob.size + " bytes of " +
                recordedBlob.type + " media.");
        })
        .catch(log);

    stopButton.addEventListener("click", function () {
        clearInterval(interval);
        document.getElementById("counter").innerHTML = "";

        recording.style.display = 'block';
        stop(preview.srcObject);
        title.innerHTML = "Enviar?";
        explanation.innerHTML = "Torna a provar o envia!";
        preview.style.display = 'none';
        stopButton.style.display = 'none';
        completeButtons.style.display = 'flex';
    }, false);

    reloadButton.addEventListener("click", function () {
        location.reload();
    }, false);

    sendButton.addEventListener("click", function () {
        explanation.style.display = 'none';
        completeButtons.style.display = 'none';
        mailinput.style.display = 'inline';
        videoSendButton.style.display = 'inline';
    });

    videoSendButton.addEventListener("click", function(){
        if (mailinput.value.length > 3) {
            let mail = mailinput.value;
            content.style.display = 'none';
            sendingBox.style.display = 'flex';

            fetch('https://#####.execute-api.eu-west-1.amazonaws.com' +
                '/api/presignedurl/' + project + '/' + step + '/' + '?mail=' + mail)
                .then(
                    function (response) {
                        if (response.status !== 200) {
                            console.log('Looks like there was a problem. Status Code: ' +
                                response.status);
                            return;
                        }

                        response.json().then(function (data) {
                            console.log(data);
                            let presigned = data;
                            const formData = new FormData();
                            formData.append("acl", presigned.fields['acl']);
                            formData.append("key", presigned.fields['key']);
                            formData.append("AWSAccessKeyId", presigned.fields['AWSAccessKeyId']);
                            formData.append("x-amz-security-token", presigned.fields['x-amz-security-token']);
                            formData.append("policy", presigned.fields['policy']);
                            formData.append("signature", presigned.fields['signature']);
                            formData.append("file", recordedBlob);

                            console.log("POSTING! " + presigned.url)

                            fetch(presigned.url, {
                                method: "POST",
                                body: formData
                            }).then(function (secondresponse) {
                                    window.location = nextURL
                                    console.log('Everything worked!: ' + secondresponse.status);
                                }
                            );
                        });
                    }
                )
                .catch(function (err) {
                    console.log('Fetch Error :-S', err);
                });
        }

    }, false);
}
