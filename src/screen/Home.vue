<script setup>
import { onMounted } from 'vue';
import { canvasRGB } from "stackblur-canvas";

function calculateDistanceAndSide(x, y, x1, y1, x2, y2) {
    const distance = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

    const lineVector = { x: x2 - x1, y: y2 - y1 };
    const pointVector = { x: x - x1, y: y - y1 };
    const dotProduct = lineVector.x * pointVector.y - lineVector.y * pointVector.x;

    const side = dotProduct > 0;

    return { distance, side };
}

function isPointInsideEllipse(x, y, a, b, cx, cy) {
    let equation = (x - cx) ** 2 / a ** 2 + (y - cy) ** 2 / b ** 2;
    if (equation <= 1) {
        return true;
    } else {
        return false;
    }
}

function setupVideoLayer() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        var bgvideo = document.getElementById('bgvideo');
        const videoTrack = stream.getVideoTracks()[0];
        const { width, height } = videoTrack.getSettings();
        const bgcanvas = new OffscreenCanvas(width, height);
        const bgctx = bgcanvas.getContext("2d");
        const x0 = width - 200
        const y0 = 0
        const LENGTH = 50
        const boundLeft = x0 - LENGTH
        const boundTop = y0 - LENGTH
        const boundWidth = width - boundLeft
        const boundHeight = height - boundTop

        const fgcanvas = new OffscreenCanvas(width, height);
        const fgctx = fgcanvas.getContext("2d");
        fgctx.fillStyle = '#00000080'
        fgctx.fillRect(0, 0, width, height)

        async function bgframe(bitmap, timestamp) {
            bgctx.drawImage(bitmap, 0, 0, width, height);
            let imageData = bgctx.getImageData(boundLeft, boundTop, boundWidth, boundHeight);
            for (let i = 0; i < imageData.data.length; i += 4) {
                const x = Math.floor((i / 4) % boundWidth);
                const y = Math.floor((i / 4) / boundWidth);
                const { distance, side } = calculateDistanceAndSide(x, y, LENGTH, boundHeight, boundWidth, LENGTH)
                if (!side) {
                    if (distance <= LENGTH) {
                        const rate = (LENGTH - distance) / LENGTH
                        imageData.data[i + 0] *= rate;
                        imageData.data[i + 1] *= rate;
                        imageData.data[i + 2] *= rate;
                        imageData.data[i + 3] = 0x80 + (0xFF - 0x80) * rate;
                    } else {
                        imageData.data[i + 0] = 0;
                        imageData.data[i + 1] = 0;
                        imageData.data[i + 2] = 0;
                        imageData.data[i + 3] = 0x80;
                    }
                } else {
                    //保留原来的图片
                }
            }
            fgctx.putImageData(imageData, boundLeft, boundTop)
            imageData = null
            bitmap.close();
            canvasRGB(
                bgcanvas, 0, 0, width, height, 20
            )
            bgctx.drawImage(fgcanvas, 0, 0, width, height)
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