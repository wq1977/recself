<script setup>
import { h, onMounted } from 'vue';
import { canvasRGB } from "stackblur-canvas";

function setupVideoLayer() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        var bgvideo = document.getElementById('bgvideo');
        const videoTrack = stream.getVideoTracks()[0];
        const { width, height } = videoTrack.getSettings();
        const LENGTH = 100
        const STARTX = Math.round(width * 3 / 4 - LENGTH / 2)
        const bgcanvas = new OffscreenCanvas(width, height);
        const bgctx = bgcanvas.getContext("2d");

        const fgcanvas = new OffscreenCanvas(width, height);
        const fgctx = fgcanvas.getContext("2d");
        fgctx.fillStyle = '#00000080'
        fgctx.fillRect(0, 0, width, height)

        async function bgframe(bitmap, timestamp) {
            bgctx.drawImage(bitmap, 0, 0, width, height);
            let imageData = bgctx.getImageData(STARTX, 0, LENGTH, height);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const x = Math.ceil((i / 4) % LENGTH);
                imageData.data[i + 0] *= (x / (LENGTH - 1));
                imageData.data[i + 1] *= (x / (LENGTH - 1));
                imageData.data[i + 2] *= (x / (LENGTH - 1));
                imageData.data[i + 3] = 0x80 + (0xFF - 0x80) * x / (LENGTH - 1);
            }
            fgctx.putImageData(imageData, STARTX, 0)
            fgctx.drawImage(bitmap, STARTX + LENGTH, 0, width - STARTX - LENGTH, height, STARTX + LENGTH, 0, width - STARTX - LENGTH, height)
            canvasRGB(
                bgcanvas, 0, 0, width, height, 10
            )
            bgctx.drawImage(fgcanvas, 0, 0, width, height)
            bitmap.close();
            imageData = null
            const newBitmap = await createImageBitmap(bgcanvas);
            return new VideoFrame(newBitmap, { timestamp });
        }
        const transformer = new TransformStream({
            async transform(videoFrame, controller) {
                const bitmap = await createImageBitmap(videoFrame);
                const timestamp = videoFrame.timestamp;
                videoFrame.close();
                const newFrame = await bgframe(
                    bitmap,
                    timestamp,
                );
                controller.enqueue(newFrame);
            },

            flush(controller) {
                controller.terminate();
            }
        });

        const trackProcessor = new MediaStreamTrackProcessor({
            track: videoTrack
        });
        const trackGenerator = new MediaStreamTrackGenerator({ kind: "video" });

        trackProcessor.readable
            .pipeThrough(transformer)
            .pipeTo(trackGenerator.writable);

        const processedStream = new MediaStream();
        processedStream.addTrack(trackGenerator);
        bgvideo.addEventListener("loadedmetadata", () => {
            bgvideo.play();
        });
        bgvideo.srcObject = processedStream;
    }, console.log);
}

onMounted(() => {
    setupVideoLayer()
})
</script>
<template>
    <video id="bgvideo"></video>
    <video id="fgvideo"></video>
</template>
<style scoped>
video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    left: 0;
    top: 0;
}
</style>