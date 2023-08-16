<script setup>
import { onMounted, ref } from 'vue';
import { canvasRGB } from "stackblur-canvas";
import { PrismEditor } from 'vue-prism-editor';
import 'vue-prism-editor/dist/prismeditor.min.css';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/themes/prism-tomorrow.css'; // import syntax highlighting styles
import { Splitpanes, Pane } from 'splitpanes'
import 'splitpanes/dist/splitpanes.css'
import Tree from "vue3-tree";
import "vue3-tree/dist/style.css";

function calculateDistanceAndSide(x, y, x1, y1, x2, y2) {
    const distance = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / Math.sqrt(Math.pow(y2 - y1, 2) + Math.pow(x2 - x1, 2));

    const lineVector = { x: x2 - x1, y: y2 - y1 };
    const pointVector = { x: x - x1, y: y - y1 };
    const dotProduct = lineVector.x * pointVector.y - lineVector.y * pointVector.x;

    const side = dotProduct > 0;

    return { distance, side };
}

function setupVideoLayer() {
    navigator.getUserMedia({ video: true, audio: false }, function (stream) {
        var bgvideo = document.getElementById('bgvideo');
        const videoTrack = stream.getVideoTracks()[0];
        const { width, height } = videoTrack.getSettings();
        const bgcanvas = new OffscreenCanvas(width, height);
        const bgctx = bgcanvas.getContext("2d");
        const x0 = width - 200
        const y0 = -100
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

const code = ref('console.log("Hello World")')
let list = ref([])
function highlighter(code) {
    return highlight(code, languages.js);
}

const onNodeClick = async (node) => {
    if (!node.nodes) {
        code.value = await api.call("editor", node.id)
    }
};

onMounted(async () => {
    list.value = await api.call('listDir')
    console.log(list.value)
    setupVideoLayer()
})
</script>
<template>
    <video id="bgvideo"></video>
    <splitpanes class="default-theme mysplitpanes">
        <pane size="20">
            <Tree class="filelist" :nodes="list" :use-checkbox="false" :use-icon="true" @nodeClick="onNodeClick" />
        </pane>
        <pane>
            <splitpanes horizontal class="mysplitpanes">
                <pane>
                    <prism-editor class="my-editor" v-model="code" :highlight="highlighter" line-numbers></prism-editor>
                </pane>
                <pane :size="25">
                    <span>3</span>
                </pane>
            </splitpanes>
        </pane>
    </splitpanes>
</template>
<style>
video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    left: 0;
    top: 0;
}

.filelist {
    color: white;
}

.my-editor {
    color: #fff;
    font-family: Fira code, Fira Mono, Consolas, Menlo, Courier, monospace;
    font-size: 14px;
    line-height: 1.5;
    padding: 5px;
}

.prism-editor__line-number {
    position: relative !important;
    color: yellow !important;
}

/* optional class for removing the outline */
.prism-editor__textarea:focus {
    outline: none;
}

.mysplitpanes>.splitpanes__splitter {
    background: #00000080 !important;
    border: 0 !important;
}
</style>