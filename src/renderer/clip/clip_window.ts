/// <reference types="vite/client" />

const { ipcRenderer, clipboard, nativeImage } =
    require("electron") as typeof import("electron");
import hotkeys from "hotkeys-js";
import { jsKeyCodeDisplay, ele2jsKeyCode } from "../../../lib/key";
import { getImgUrl, initStyle, setTitle } from "../root/root";
import open_with from "../../../lib/open_with";
import { t } from "../../../lib/translate/translate";
import chroma from "chroma-js";
import store from "../../../lib/store/renderStore";
import {
    ActiveSelection,
    Canvas,
    Circle,
    type CircleProps,
    FabricImage,
    type FabricObject,
    IText,
    Line,
    PencilBrush,
    type Point,
    Polygon,
    Polyline,
    Rect,
    type RectProps,
    Shadow,
    SprayBrush,
    classRegistry,
    filters,
} from "fabric";
import { EraserBrush } from "@erase2d/fabric";

import initScreenShots from "../screenShot/screenShot";
const screenShots = initScreenShots(
    { c: store.get("额外截屏器.命令"), path: store.get("额外截屏器.位置") },
    undefined,
    t,
);

import type {
    setting,
    EditType,
    功能,
    translateWinType,
    功能列表,
} from "../../ShareTypes.js";
import {
    ele,
    type ElType,
    frame,
    image,
    input,
    p,
    pack,
    setProperties,
    trackPoint,
    txt,
    view,
} from "dkh-ui";

initStyle(store);

// @auto-path:../assets/icons/$.svg
function iconEl(src: string) {
    return view().add(image(getImgUrl(`${src}.svg`), "icon").class("icon"));
}

function selectEl<i extends string>(
    el: ElType<HTMLElement>,
    title: string,
    data: { name: string; value: i }[],
) {
    let value: string;
    const valueMap = new Map(
        data.map((i) => [
            i.value,
            view()
                .add(i.name)
                .on("click", () => {
                    setV(i.value);
                    change();
                }),
        ]),
    );

    function change() {
        el.el.dispatchEvent(new CustomEvent("change"));
        selectEl.remove();
        selectEl.el.hidePopover();
    }

    function setV(v: i) {
        value = v;
        el.data({
            title: `${title} - ${data.find((i) => i.value === v)?.name ?? ""}`,
        });
    }

    function showList() {
        for (const [v, el] of valueMap) {
            el.el.classList.remove("selected");
            if (v === value) el.el.classList.add("selected");
        }
        const rect = handleEl.el.getBoundingClientRect();
        selectEl
            .clear()
            .addInto()
            .add(Array.from(valueMap.values()))
            .style({
                position: "fixed",
                zIndex: 9999,
                top: `${rect.top}px`,
                left: `${rect.left}px`,
                margin: 0,
            });
        selectEl.el.showPopover();
    }

    const selectEl = view().attr({ popover: "auto" }).class("side_select_menu");
    const handleEl = view()
        .addInto(el)
        .on("click", showList)
        .class("side_select");

    el.on("pointerup", (e) => {
        if (e.button === 2) showList();
    });

    return el
        .bindGet(() => value)
        .bindSet((v: i) => {
            setV(v);
        });
}

function rangeBar(
    _min: number | undefined,
    _max: number | undefined,
    _step: number | undefined,
    text = "",
) {
    const min = _min ?? 0;
    const max = _max ?? 100;
    const step = _step ?? 1;

    let type: "edit" | "move" = "move";

    const p = view().style({
        "align-content": "center",
        position: "relative",
        cursor: "ew-resize",
    });
    const bar = view().style({
        position: "absolute",
        top: "0",
        height: "100%",
        background: "var(--bar-focus-color)",
        "border-radius": "inherit",
        "z-index": "-1",
    });
    const i = input()
        .style({
            // @ts-ignore
            "field-sizing": "content",
            "line-height": "1",
            height: "auto",
        })
        .on("input", () => {
            setV(Number.parseFloat(i.gv), true);
        })
        .on("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                setV(Number.parseFloat(i.gv));
                useI(false);
                valueHistory.push(value);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setV(value + step);
            } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setV(value - step);
            }
        })
        .on("blur", () => {
            setV(Number.parseFloat(i.gv));
            useI(false);
            valueHistory.push(value);
        })
        .on("mousedown", (e) => {
            if (e.button === 2 && valueHistory.length) {
                e.preventDefault();
                setV(valueHistory.pop() as number);
            }
        });

    useI(false);
    p.add(
        view("x").add([i, text]).style({
            "justify-content": "center",
            "font-family": "var(--monospace)",
        }),
    )
        .add(bar)
        .class("range-b");

    function useI(b: boolean) {
        i.attr({ disabled: !b }).style({
            "pointer-events": b ? "all" : "none",
        });
        type = b ? "edit" : "move";
        if (b) i.el.focus();
    }

    let value = min;

    const valueHistory: number[] = [value];

    const range = max - min;

    function setV(v: number, noInput = false, event = true) {
        value = vFix(v);
        setBar(value);
        if (!noInput) i.sv(String(value));
        if (event) inputEvent();
    }

    trackPoint(p, {
        start: () => {
            if (type === "edit") return null;
            return { x: 0, y: 0, data: value };
        },
        ing: (p, _e, { startData: oldV }) => {
            setV(oldV + (p.x / 200) * range);
        },
        end(e, { moved }) {
            if (!moved) {
                if (e.button === 2 && valueHistory.length) {
                    setV(valueHistory.pop() as number);
                } else useI(true);
            } else {
                valueHistory.push(value);
            }
        },
    });

    function vFix(v: number) {
        const vv = Math.max(min, Math.min(max, v));
        if (step < 1) {
            const r = 1 / step;
            return (Math.round(vv * r - min * r) + min * r) / r;
        }
        return Math.round((vv - min) / step) * step + min;
    }

    function setBar(v: number) {
        const p = (v - min) / range;
        bar.style({ width: `${p * 100}%` });
    }

    function inputEvent() {
        p.el.dispatchEvent(new Event("input"));
    }

    return p
        .bindGet(() => {
            return vFix(value);
        })
        .bindSet((v: number) => {
            setV(v, false, false);
        })
        .sv(value);
}

function setSetting() {
    const 工具栏 = store.get("工具栏");
    setProperties({
        "--color-size": `${colorSize * colorISize}px`,
        "--min-color-size": "10px",
        "--color-i-size": `${colorISize}px`,
        "--color-i-i": `${colorSize}`,
        "--bar-size": `${工具栏.按钮大小}px`,
        "--bar-icon": `${工具栏.按钮图标比例}`,
    });
}

function toCanvas(canvas: HTMLCanvasElement, img: ImageData) {
    (canvas.getContext("2d") as CanvasRenderingContext2D).putImageData(
        img,
        0,
        0,
    );
}

function setScreen(i: (typeof allScreens)[0]) {
    const img = i.captureSync(true).data;
    if (!img) return;
    const w = img.width;
    const h = img.height;
    mainCanvas.width = clipCanvas.width = drawCanvas.width = w;
    mainCanvas.height = clipCanvas.height = drawCanvas.height = h;
    toCanvas(mainCanvas, img);
    fabricCanvas.setHeight(h);
    fabricCanvas.setWidth(w);
    finalRect = [0, 0, mainCanvas.width, mainCanvas.height];
    if (记忆框选)
        if (记忆框选值?.[i.id]?.[2]) {
            finalRect = 记忆框选值[i.id];
            rectSelect = true;
            finalRectFix();
        } // 记忆框选边不为0时
    drawClipRect();
    nowScreenId = i.id;

    if (w < window.innerWidth || h < window.innerHeight)
        document.body.classList.add("editor_bg");
}

function setEditorP(zoom: number, x: number, y: number) {
    const t: string[] = [];
    if (zoom != null) {
        t.push(`scale(${zoom})`);
        editorP.zoom = zoom;
    }
    if (x != null) {
        let limitX = x;
        const min = -mainCanvas.width;
        const max =
            (window.innerWidth * window.devicePixelRatio) / editorP.zoom;
        if (x < min) limitX = min;
        if (x > max) limitX = max;
        t.push(`translateX(${limitX}px)`);
        editorP.x = limitX;
    }
    if (y != null) {
        let limitY = y;
        const min = -mainCanvas.height;
        const max =
            (window.innerHeight * window.devicePixelRatio) / editorP.zoom;
        if (y < min) limitY = min;
        if (y > max) limitY = max;
        t.push(`translateY(${limitY}px)`);
        editorP.y = limitY;
    }
    editor.el.style.transform = t.join(" ");

    whBar(finalRect);
}

function edge() {
    const canvas = mainCanvas;
    const src = cv.imread(canvas);

    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB);

    const dst = new cv.Mat();
    const cMin = store.get("框选.自动框选.最小阈值");
    const cMax = store.get("框选.自动框选.最大阈值");
    cv.Canny(src, dst, cMin, cMax, 3, true);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    cv.findContours(
        dst,
        contours,
        hierarchy,
        cv.RETR_CCOMP,
        cv.CHAIN_APPROX_SIMPLE,
    );

    for (let i = 0; i < contours.size(); i++) {
        const cnt = contours.get(i);
        const r = cv.boundingRect(cnt);
        edgeRect.push({ ...r, type: "image" });
    }

    src.delete();
    dst.delete();
    contours.delete();
    hierarchy.delete();
}

function getWin() {
    for (const win of windows) {
        const x = Math.max(win.rect.x, 0);
        const y = Math.max(win.rect.y, 0);
        const w = Math.min(win.rect.w, mainCanvas.width - x);
        const h = Math.min(win.rect.h, mainCanvas.height - y);
        edgeRect.push({
            x: x,
            y: y,
            width: w,
            height: h,
            type: "system",
        });
    }
}

function getNowScreen(id = nowScreenId) {
    const s = allScreens.find((i) => i.id === id) ?? allScreens[0];
    return s;
}

function showSaveBar(m: boolean) {
    hotkeys.deleteScope("c_bar");
    if (m) {
        centerBarEl.style({
            opacity: 1,
            pointerEvents: "auto",
        });
        toHotkeyScope("c_bar");
    } else {
        centerBarEl.style({
            opacity: 0,
            pointerEvents: "none",
        });
        backHotkeyScope();
    }
}

function toHotkeyScope(scope: hotkeyScope) {
    if (hotkeyScopes.at(-1) !== scope) hotkeyScopes.push(scope);
    hotkeys.setScope(scope);
}
function backHotkeyScope() {
    if (hotkeyScopes.length > 1) hotkeyScopes.pop();
    hotkeys.setScope(hotkeyScopes.at(-1) ?? "normal");
    console.log(hotkeys.getScope(), hotkeyScopes);
}

function setDefaultAction(act: setting["框选后默认操作"]) {
    if (!act) return;
    autoDo = act;
    if (autoDo !== "no") {
        toolBarEl.els[autoDo].el.style.backgroundColor =
            "var(--bar-focus-color)";
    }
}

function 记忆框选f() {
    if (记忆框选 && !longInited) {
        记忆框选值[nowScreenId] = [
            finalRect[0],
            finalRect[1],
            finalRect[2],
            finalRect[3],
        ];
        store.set("框选.记忆.rects", 记忆框选值);
    }
}

// 关闭
function closeWin() {
    document.documentElement.style.display =
        "none"; /* 退出时隐藏，透明窗口，动画不明显 */
    记忆框选f();
    mainCanvas.width = clipCanvas.width = drawCanvas.width = mainCanvas.width; // 确保清空画布
    if (uIOhook) {
        uIOhook.stop();
    }
    setTimeout(() => {
        ipcRenderer.send("clip_main_b", "window-close");
    }, 50);
}

function runOcr() {
    const type = ocr引擎.gv;
    getClipPhoto("png").then((c: HTMLCanvasElement) => {
        ipcRenderer.send("clip_main_b", "ocr", [c.toDataURL(), type]);
    });
    tool.close();
}

function runSearch() {
    const type = 识图引擎.gv;
    getClipPhoto("png").then((c: HTMLCanvasElement) => {
        ipcRenderer.send("clip_main_b", "search", [c.toDataURL(), type]);
    });
    tool.close();
}
// 二维码
function runQr() {
    getClipPhoto("png").then(async (c: HTMLCanvasElement) => {
        ipcRenderer.send("clip_main_b", "QR", c.toDataURL());
        tool.close();
    });
}

function drawM(v: boolean) {
    if (v) {
        // 绘画模式
        clipCanvas.style.pointerEvents = "none";
        whEl.style({ pointerEvents: "none" });
    } else {
        // 裁切模式
        clipCanvas.style.pointerEvents = "auto";
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
        whEl.style({ pointerEvents: "auto" });
    }
}

/**
 * 编辑栏跟踪工具栏
 */
function trackLocation() {
    const h = toolBar.offsetTop;
    let l = toolBar.offsetLeft + toolBar.offsetWidth + 8;
    if (drawBarPosi === "left") {
        l = toolBar.offsetLeft - drawBar.offsetWidth - 8;
    }
    drawBar.style.top = `${h}px`;
    drawBar.style.left = `${l}px`;
}

// 在其他应用打开

function openApp() {
    const path = require("node:path");
    const os = require("node:os");
    const tmpPhoto = path.join(os.tmpdir(), "/eSearch/tmp.png");
    const fs = require("node:fs");
    getClipPhoto("png").then((c: HTMLCanvasElement) => {
        const f = c.toDataURL().replace(/^data:image\/\w+;base64,/, "");
        const dataBuffer = Buffer.from(f, "base64");
        fs.writeFile(tmpPhoto, dataBuffer, () => {
            open_with(tmpPhoto);
        });
    });
}

function initRecord() {
    if (toolBarEl.els.record.gv === "normal") {
        ipcRenderer.send("clip_main_b", "record", {
            rect: finalRect,
            id: nowScreenId,
            w: mainCanvas.width,
            h: mainCanvas.height,
            ratio: ratio,
        });
    } else {
        ipcRenderer.send("clip_main_b", "recordx");
    }
    tool.close();
}

function long_s() {
    addLong(getNowScreen().captureSync()?.data ?? undefined);
}

function startLong() {
    initLong(finalRect);
    const r = [...finalRect];
    r[0] += screenPosition[nowScreenId].x;
    r[1] += screenPosition[nowScreenId].y;
    long_s();
    ipcRenderer.send("clip_main_b", "long_s", r);
    if (!cv) cv = require("@techstark/opencv-js");
    if (store.get("广截屏.模式") === "自动") {
        uIOhook = require("uiohook-napi").uIOhook;
        if (uIOhook) {
            uIOhook.start();
            uIOhook.on("keyup", () => {
                long_s();
            });
            uIOhook.on("wheel", () => {
                const n = new Date().getTime();
                if (n - lastLong > 500) {
                    lastLong = n;
                    long_s();
                }
            });
        }
    } else {
        longClipTime = setInterval(() => {
            long_s();
        }, store.get("广截屏.t"));
    }
}

function initLong(rect: number[]) {
    longRunning = true;
    longInited = true;

    for (const i of longHide) {
        i.style.display = "none";
    }

    document.body.classList.remove("editor_bg");

    记忆框选值[nowScreenId] = [rect[0], rect[1], rect[2], rect[3]];
    store.set("框选.记忆.rects", 记忆框选值);

    lr.style({
        left: `${rect[0] / ratio}px`,
        top: `${rect[1] / ratio}px`,
        width: `${rect[2] / ratio}px`,
        height: `${rect[3] / ratio}px`,
    });
    const w = 16;
    let right = 0;
    let botton = 0;
    if ((rect[2] + rect[3]) / ratio + w > window.innerHeight) {
        if ((rect[0] + rect[2]) / ratio + w > window.innerWidth) {
        } else {
            right = -w;
        }
    } else {
        botton = -w;
    }
    finishLongB.style.right = `${right}px`;
    finishLongB.style.bottom = `${botton}px`;
    finishLongB.onclick = stopLong;

    let longWidth = 0;
    if (window.innerWidth / 2 > (rect[0] + rect[2] / 2) / ratio) {
        // 右边
        longPreview.style({ right: "0", left: "auto" });
        longWidth = window.innerWidth - (rect[0] + rect[2]) / ratio - w;
    } else {
        longPreview.style({ left: "0" });
        longWidth = rect[0] / ratio - w;
    }
    longPreview.style({
        display: longWidth < 100 ? "none" : "",
        width: `${longWidth}px`,
        height: "100vh",
    });
}

function stopLong() {
    // 再截屏以覆盖结束按钮
    long_s();

    lr.style({ opacity: "0" });
    ipcRenderer.send("clip_main_b", "long_e", nowScreenId);
    addLong(undefined);
    for (const i of longHide) {
        i.style.display = "";
    }
}

function addLong(x: ImageData | undefined) {
    if (!x) {
        uIOhook?.stop();
        uIOhook = null;
        clearInterval(longClipTime);
        pjLong();
        return;
    }
    // 原始区域
    const canvas = ele("canvas").el;
    const d = x;
    // 设定canvas宽高并设置裁剪后的图像
    canvas.width = finalRect[2];
    canvas.height = finalRect[3];
    (canvas.getContext("2d") as CanvasRenderingContext2D).putImageData(
        d,
        -finalRect[0],
        -finalRect[1],
    );

    if (!longX.lastImg) {
        longPutImg(canvas, 0, 0);
        longX.lastImg = canvas;
        return;
    }

    const match = longMatch(longX.lastImg, canvas);
    console.log(match);

    const dx = longFX === "xy" ? match.dx : 0;
    const dy = match.dy;
    const putImg = match.clipedImg;
    longPutImg(putImg, dx + longX.lastXY.x, dy + longX.lastXY.y);

    longX.lastImg = canvas;
    longX.lastXY.x += longFX === "xy" ? match.srcDX : 0;
    longX.lastXY.y += match.srcDY;
}

function longMatch(img0: HTMLCanvasElement, img1: HTMLCanvasElement) {
    // clip img1 “回”字中间的“口”
    function clip(v: number) {
        const x = v - Math.max((v / 3) * 1, 50);
        return Math.floor(Math.max(x, 0) / 2);
    }
    const dw = longFX === "xy" ? clip(img1.width) : 0; // “目”中间的“口”
    const dh = clip(img1.height);

    const clip1Canvas = ele("canvas").el;
    clip1Canvas.width = img1.width - dw * 2;
    clip1Canvas.height = img1.height - dh * 2;
    (clip1Canvas.getContext("2d") as CanvasRenderingContext2D).drawImage(
        img1,
        -dw,
        -dh,
    );
    // match
    const src = cv.imread(img0);
    const templ = cv.imread(clip1Canvas);
    const dst = new cv.Mat();
    const mask = new cv.Mat();
    cv.matchTemplate(src, templ, dst, cv.TM_CCOEFF, mask);
    const result = cv.minMaxLoc(dst, mask);
    const maxPoint = result.maxLoc;
    const dx = maxPoint.x;
    const dy = maxPoint.y;
    src.delete();
    dst.delete();
    mask.delete();
    // clip img1
    const ndx = dx - dw;
    const ndy = dy - dh;
    // 0:裁切九宫格边的三个格 !=0:裁出“田”字
    const clip2Canvas = ele("canvas").el;
    clip2Canvas.width = ndx !== 0 ? img1.width - dw : img1.width;
    clip2Canvas.height = ndy !== 0 ? img1.height - dh : img1.height;
    // d>0需要-dw或-dh平移，<=0不需要平移
    (clip2Canvas.getContext("2d") as CanvasRenderingContext2D).drawImage(
        img1,
        ndx > 0 ? -dw : 0,
        ndy > 0 ? -dh : 0,
    );

    return {
        dx: ndx > 0 ? dx : ndx,
        dy: ndy > 0 ? dy : ndy,
        srcDX: ndx,
        srcDY: ndy,
        clipedImg: clip2Canvas,
    };
}

function longPutImg(img: HTMLCanvasElement, x: number, y: number) {
    // 前提：img大小一定小于等于最终拼接canvas
    const newCanvas = ele("canvas").el;
    const newCtx = newCanvas.getContext("2d") as CanvasRenderingContext2D;

    const srcW = longX.img?.width || 0;
    const srcH = longX.img?.height || 0;
    const minX = longX.imgXY.x;
    const minY = longX.imgXY.y;
    const maxX = minX + srcW;
    const maxY = minY + srcH;

    let srcDx = 0;
    let srcDy = 0;

    if (x < minX) {
        srcDx = minX - x;
        newCanvas.width = srcDx + srcW;
        longX.imgXY.x -= srcDx;
    } else if (x + img.width > maxX) {
        newCanvas.width = x + img.width - maxX + srcW;
    } else {
        newCanvas.width = srcW;
    }
    if (y < minY) {
        srcDy = minY - y;
        newCanvas.height = srcDy + srcH;
        longX.imgXY.y -= srcDy;
    } else if (y + img.height > maxY) {
        newCanvas.height = y + img.height - maxY + srcH;
    } else {
        newCanvas.height = srcH;
    }

    if (longX.img) newCtx.drawImage(longX.img, srcDx, srcDy);

    const nx = x - longX.imgXY.x;
    const ny = y - longX.imgXY.y;
    newCtx.drawImage(img, nx, ny);
    longX.img = newCanvas;

    longPreview.clear();
    newCanvas.style.maxWidth = "100%";
    newCanvas.style.maxHeight = "100%";
    longPreview.add(newCanvas);
}

function pjLong() {
    const oCanvas = longX.img;
    if (!oCanvas) return;
    mainCanvas.width = clipCanvas.width = drawCanvas.width = oCanvas.width;
    mainCanvas.height = clipCanvas.height = drawCanvas.height = oCanvas.height;

    const ggid = (
        oCanvas.getContext("2d") as CanvasRenderingContext2D
    ).getImageData(0, 0, oCanvas.width, oCanvas.height);
    (mainCanvas.getContext("2d") as CanvasRenderingContext2D).putImageData(
        ggid,
        0,
        0,
    );

    finalRect = [0, 0, oCanvas.width, oCanvas.height];

    fabricCanvas.setWidth(oCanvas.width);
    fabricCanvas.setHeight(oCanvas.height);

    longPreview.style({ display: "none" });
    longPreview.clear();

    document.body.classList.add("editor_bg");

    lr.style({ width: "0", height: "0" });

    longRunning = false;
}

// 钉在屏幕上
function runDing() {
    getClipPhoto("png").then((c: HTMLCanvasElement) => {
        const display = getNowScreen();
        const dingWindowArg = [
            finalRect[0] / ratio + display.bounds.x,
            finalRect[1] / ratio + display.bounds.y,
            finalRect[2] / ratio,
            finalRect[3] / ratio,
            c.toDataURL(),
        ];
        ipcRenderer.send("clip_main_b", "ding", dingWindowArg);
        tool.close();
    });
}

async function translate() {
    const display = getNowScreen();
    ipcRenderer.send("clip_main_b", "translate", {
        rect: {
            x: finalRect[0],
            y: finalRect[1],
            w: finalRect[2],
            h: finalRect[3],
        },
        dipRect: {
            x: finalRect[0] / ratio + display.bounds.x,
            y: finalRect[1] / ratio + display.bounds.y,
            w: finalRect[2] / ratio,
            h: finalRect[3] / ratio,
        },
        displayId: nowScreenId,
        img: (await getClipPhoto("png")).toDataURL(),
        type: toolBarEl.els.translate.gv,
    } as translateWinType);
    tool.close();
}

// 复制
function runCopy() {
    getClipPhoto("png").then((c: HTMLCanvasElement) => {
        clipboard.writeImage(nativeImage.createFromDataURL(c.toDataURL()));
        tool.close();
    });
}
// 保存
function runSave() {
    if (store.get("保存.快速保存")) {
        type = store.get("保存.默认格式");
        const p = ipcRenderer.sendSync("get_save_file_path", type);
        save(p);
        return;
    }
    showSaveBar(true);
    const els = suffixList;
    const type2N = saveTypeList;
    for (const i of els) {
        i.el.className = "";
    }
    let i = type2N.indexOf(store.get("保存.默认格式"));
    els[i].el.className = "suffix_h";
    toHotkeyScope("c_bar");
    hotkeys("enter", "c_bar", () => {
        els[i].el.click();
        showSaveBar(false);
    });
    const l = type2N.length;
    hotkeys("up", "c_bar", () => {
        els[i % l].el.className = "";
        i = i === 0 ? l - 1 : i - 1;
        els[i % l].el.className = "suffix_h";
    });
    hotkeys("down", "c_bar", () => {
        els[i % l].el.className = "";
        i++;
        els[i % l].el.className = "suffix_h";
    });
    hotkeys("esc", "c_bar", () => {
        showSaveBar(false);
    });
}
async function save(message: string) {
    if (message) {
        const fs = require("node:fs");
        let dataBuffer: Buffer;
        if (type === "svg") dataBuffer = Buffer.from(await getClipPhoto("svg"));
        else {
            let f = "";
            const nc = await getClipPhoto(type);
            if (type === "png") {
                f = nc.toDataURL("image/png", 1);
            } else if (type === "jpg") {
                f = nc.toDataURL("image/jpeg", 1);
            } else if (type === "webp") {
                f = nc.toDataURL("image/webp", 1);
            }
            dataBuffer = Buffer.from(
                f.replace(/^data:image\/\w+;base64,/, ""),
                "base64",
            );
            if (store.get("保存.保存并复制")) {
                clipboard.writeImage(nativeImage.createFromDataURL(f));
            }
        }

        fs.writeFile(message, dataBuffer, (err) => {
            if (!err) {
                ipcRenderer.send("ok_save", message);
            }
        });
        tool.close();
    }
}
/**
 * 获取选区图像
 * @param type 格式
 * @returns promise svg base64|canvas element
 */
function getClipPhoto(type: "svg"): Promise<string>;
function getClipPhoto(type: "png" | "jpg" | "webp"): Promise<HTMLCanvasElement>;
function getClipPhoto(
    type: "png" | "jpg" | "webp" | "svg",
): Promise<string | HTMLCanvasElement> {
    const mainCtx = mainCanvas.getContext("2d") as CanvasRenderingContext2D;
    if (!finalRect) finalRect = [0, 0, mainCanvas.width, mainCanvas.height];

    if (typeof fabricCanvas !== "undefined") {
        fabricCanvas.discardActiveObject();
        fabricCanvas.renderAll();
    }

    if (type === "svg") {
        const svg = document.createElement("div");
        if (typeof fabricCanvas === "undefined") {
            svg.innerHTML = `<!--?xml version="1.0" encoding="UTF-8" standalone="no" ?-->
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="${mainCanvas.width}" height="${mainCanvas.height}" viewBox="0 0 1920 1080" xml:space="preserve">
            <desc>Created with eSearch</desc>
            </svg>`;
        } else {
            svg.innerHTML = fabricCanvas.toSVG();
            // @ts-ignore
            svg.querySelector("desc").innerHTML =
                "Created with eSearch & Fabric.js";
        }
        const svgEl = svg.querySelector("svg") as SVGElement;
        svgEl.setAttribute("viewBox", finalRect.join(" "));
        const image = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "image",
        );
        image.setAttribute("xlink:href", mainCanvas.toDataURL());
        svgEl.insertBefore(image, svgEl.firstChild);
        const svgT = new XMLSerializer().serializeToString(svgEl);
        if (type === "svg")
            return new Promise((resolve: (value: string) => void, _rejects) => {
                resolve(svgT);
            });
    }
    const tmpCanvas = document.createElement("canvas");
    const tmpctx = tmpCanvas.getContext("2d") as CanvasRenderingContext2D;
    tmpCanvas.width = finalRect[2];
    tmpCanvas.height = finalRect[3];
    const gid = mainCtx.getImageData(
        finalRect[0],
        finalRect[1],
        finalRect[2],
        finalRect[3],
    ); // 裁剪
    tmpctx.putImageData(gid, 0, 0);
    const image = document.createElement("img");
    image.src = fabricCanvas.toDataURL({
        left: finalRect[0],
        top: finalRect[1],
        width: finalRect[2],
        height: finalRect[3],
        format: "png",
        multiplier: 1,
    });
    return new Promise((resolve, _rejects) => {
        image.onload = () => {
            tmpctx.drawImage(image, 0, 0, finalRect[2], finalRect[3]);
            if (!isRect) {
                const ctx = tmpctx;

                // 创建临时Canvas并保存原始内容
                const tempCanvas = createTemporaryCanvas(tmpCanvas);

                // 清除主Canvas
                ctx.clearRect(0, 0, tmpCanvas.width, tmpCanvas.height);

                // 定义裁剪区域
                ctx.beginPath();
                freeSelect.forEach((point, index) => {
                    if (index === 0) {
                        ctx.moveTo(
                            point.x - finalRect[0],
                            point.y - finalRect[1],
                        );
                    } else {
                        ctx.lineTo(
                            point.x - finalRect[0],
                            point.y - finalRect[1],
                        );
                    }
                });
                ctx.closePath();
                ctx.clip();

                // 将原始内容重新绘制到主Canvas上
                ctx.drawImage(tempCanvas, 0, 0);
            }
            resolve(tmpCanvas);
        };
    });
}

function createTemporaryCanvas(originalCanvas: HTMLCanvasElement) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height;
    const tempCtx = tempCanvas.getContext("2d") as CanvasRenderingContext2D;
    tempCtx.drawImage(originalCanvas, 0, 0);
    return tempCanvas;
}

function e2pXYdb(e: MouseEvent | PointerEvent) {
    const cX = (e.clientX - editorP.x * editorP.zoom) / editorP.zoom;
    const cY = (e.clientY - editorP.y * editorP.zoom) / editorP.zoom;
    return { x: cX, y: cY };
}

function e2pXY(e: MouseEvent | PointerEvent) {
    const { x, y } = e2pXYdb(e);
    return { x: Math.round(x), y: Math.round(y) } as editor_position;
}

// 鼠标框选坐标转画布坐标,鼠标坐标转画布坐标
function p2Rect(p1: px_position | null, p2: px_position | null): rect {
    if (!p1 || !p2) return [0, 0, 0, 0];
    const { x: oX1, y: oY1 } = p1;
    const { x: oX2, y: oY2 } = p2;
    const x1 = Math.min(oX1, oX2);
    const y1 = Math.min(oY1, oY2);
    const x2 = Math.max(oX1, oX2) + 1;
    const y2 = Math.max(oY1, oY2) + 1;
    return [x1, y1, x2 - x1, y2 - y1];
}

function e2cXY(e: MouseEvent | PointerEvent) {
    const { x, y } = e2pXYdb(e);
    if (editorP.zoom === 1 / window.devicePixelRatio) {
        return { x: Math.ceil(x), y: Math.ceil(y) } as px_position; // 确保获取到最后的像素
    }
    return { x: Math.floor(x), y: Math.floor(y) } as px_position; // 放大后，可以进行高精度计算来获取所有像素，缩写后，看的是放大镜，这就无关紧要了
}

function pointsOutRect(points: point[]) {
    if (points.length === 0) {
        return [0, 0, 0, 0] as rect;
    }

    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;

    // 遍历所有点，找到最小和最大的x,y坐标
    for (const point of points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }

    // 返回边框的左下角和右上角坐标
    return [minX, minY, maxX - minX, maxY - minY] as rect;
}

// 开始操纵框选
function clipStart(e: MouseEvent, inRect: boolean) {
    const p = e2pXY(e);
    if (isRect) {
        // 在选区内，则调整，否则新建
        if (inRect) {
            isInClipRect(p);
            oldP = { x: p.x, y: p.y };
            oFinalRect = finalRect;
            moving = true;
            moveRect(oFinalRect, p, p);
        } else {
            selecting = true;
            rectStartE = e2cXY(e);
            finalRect = p2Rect(rectStartE, rectStartE);
            rightKey = false;
            changeRightBar(false);
        }
    } else {
        if (inRect) {
            oldP = { x: p.x, y: p.y };
            oPoly = structuredClone(freeSelect);
            moving = true;
            movePoly(oPoly, p, p);
        } else {
            selecting = true;
            freeSelect = [p];
            finalRect = pointsOutRect(freeSelect);
            rightKey = false;
            changeRightBar(false);
        }
    }
    renderClip(e);

    // 隐藏
    drawBar.style.opacity = toolBar.style.opacity = "0";
}

function pickColor(e: MouseEvent | PointerEvent) {
    rightKey = !rightKey;
    // 自由右键取色
    mouseBar(finalRect, e);
    // 改成多格式样式
    if (rightKey) {
        changeRightBar(true);
    } else {
        changeRightBar(false);
    }
}

function clipEnd(e: MouseEvent) {
    const p = e2pXY(e);
    clipCtx.closePath();
    selecting = false;
    if (isRect) {
        const r = p2Rect(rectStartE, e2cXY(e));
        if (rectInRect.length) {
            let nearestL = Number.POSITIVE_INFINITY;
            let nr: rect | null = null;
            for (const rect of rectInRect) {
                const center1 = {
                    x: rect[0] + rect[2] / 2,
                    y: rect[1] + rect[3] / 2,
                };
                const center2 = { x: r[0] + r[2] / 2, y: r[1] + r[3] / 2 };
                const l =
                    Math.sqrt(
                        (center1.x - center2.x) ** 2 +
                            (center1.y - center2.y) ** 2,
                    ) +
                    Math.abs(rect[0] - r[0]) +
                    Math.abs(rect[1] - r[1]) +
                    Math.abs(rect[0] + rect[2] - (r[0] + r[2])) +
                    Math.abs(rect[1] + rect[3] - (r[1] + r[3]));
                if (l < nearestL) {
                    nearestL = l;
                    nr = rect;
                }
            }
            if (nr && (e.shiftKey || (!moved && down))) {
                rectSelect = true;
                finalRect = nr;
            } else {
                finalRect = r;
            }
        } else {
            finalRect = r;
        }
    } else {
        freeSelect.push(p);
        finalRect = pointsOutRect(freeSelect);
    }
    renderClip(e);
    hisPush();
}

/** 画框(遮罩) */
function drawClipRect() {
    const cw = clipCanvas.width;
    const ch = clipCanvas.height;

    const x = finalRect[0];
    const y = finalRect[1];
    const width = finalRect[2];
    const height = finalRect[3];

    clipCtx.fillStyle = 遮罩颜色;

    clipCtx.fillRect(0, 0, cw, ch);
    clipCtx.clearRect(x, y, width, height);

    for (const ix of x选区参考线.x) {
        clipCtx.fillStyle = c参考线颜色.选区参考线;
        clipCtx.fillRect(x + ix * width, y, 1, height);
    }
    for (const iy of x选区参考线.y) {
        clipCtx.fillStyle = c参考线颜色.选区参考线;
        clipCtx.fillRect(x, y + iy * height, width, 1);
    }

    // 大小栏
    whBar(finalRect);
}

/** 画多边形(遮罩) */
function drawClipPoly(points: point[]) {
    const ctx = clipCtx;
    const canvas = clipCanvas;

    if (points.length < 2) return;

    ctx.fillStyle = 遮罩颜色;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 创建内部镂空效果
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.fillStyle = "#fff";
    ctx.closePath();
    ctx.fill();

    // 恢复默认绘图模式
    ctx.globalCompositeOperation = "source-over";
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.fillStyle = "#0000";
    ctx.closePath();
    ctx.fill();

    // 大小栏
    whBar(pointsOutRect(points));
}

function drawClip() {
    if (isRect) drawClipRect();
    else drawClipPoly(freeSelect);
}

function cleanCanvas() {
    clipCtx.clearRect(0, 0, clipCanvas.width, clipCanvas.height);
}

/**
 * 自动框选提示
 */
function inEdge(p: editor_position) {
    if (rectSelect) return;
    console.log(1);

    rectInRect = [];
    for (const i of edgeRect) {
        const x0 = i.x;
        const y0 = i.y;
        const x1 = i.x + i.width;
        const y1 = i.y + i.height;
        if (x0 < p.x && p.x < x1 && y0 < p.y && p.y < y1) {
            rectInRect.push([i.x, i.y, i.width, i.height]);
        }
    }
    clipCtx.strokeStyle = "#000";
    clipCtx.lineWidth = 1;
    for (const i of rectInRect) {
        clipCtx.strokeRect(i[0], i[1], i[2], i[3]);
    }
}

function renderClip(e: MouseEvent) {
    if (down) {
        moved = true;
        rectSelect = true; // 按下并移动，肯定手动选好选区了
    }

    if (selecting) {
        if (isRect) {
            // 画框
            finalRect = p2Rect(rectStartE, e2cXY(e));
        } else {
            freeSelect.push(e2pXY(e));
            finalRect = pointsOutRect(freeSelect);
        }
    }
    if (moving) {
        if (isRect) {
            moveRect(oFinalRect, oldP, { x: e.offsetX, y: e.offsetY });
        } else {
            movePoly(oPoly, oldP, { x: e.offsetX, y: e.offsetY });
        }
    }

    if (g光标参考线 || selecting || moving) {
        cleanCanvas();
        drawClip();
        inEdge({ x: e.offsetX, y: e.offsetY });
        ckx(e);
    }

    if (!selecting && !moving) {
        // 只是悬浮光标时生效，防止在新建或调整选区时光标发生突变
        if (isRect) {
            isInClipRect({ x: e.offsetX, y: e.offsetY });
        } else {
            isPointInPolygon({ x: e.offsetX, y: e.offsetY });
        }
    }
}

// 大小栏
function whBar(finalRect: rect) {
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    // 大小文字
    const d = 0;
    const x0 = String(finalRect[0] + d);
    const y0 = String(finalRect[1] + d);
    const x1 = String(finalRect[0] + d + finalRect[2]);
    const y1 = String(finalRect[1] + d + finalRect[3]);
    const w = String(finalRect[2]);
    const h = String(finalRect[3]);
    const ch =
        x0.length +
        2 + // ", "
        y0.length +
        x1.length +
        2 + // ", "
        y1.length +
        w.length +
        3 + // " × "
        h.length;
    const width = ch * chPX + 16 * 3;
    whX0.el.value = x0;
    whY0.el.value = y0;
    whX1.el.value = x1;
    whY1.el.value = y1;
    whW.el.value = w;
    whH.el.value = h;
    checkWhBarWidth();
    // 位置
    const zx = (finalRect[0] + editorP.x) * editorP.zoom;
    const zy = (finalRect[1] + editorP.y) * editorP.zoom;
    const zw = finalRect[2] * editorP.zoom;
    const zh = finalRect[3] * editorP.zoom;
    const dw = width;
    const dh = 40;
    let x: number;
    x = zx + zw / 2 - dw / 2;
    x = Math.max(0, Math.min(winWidth - dw, x));

    let y: number;
    const yGap = 10;
    if (zy - (dh + yGap) >= 0) {
        y = zy - (dh + yGap); // 不超出时在外
    } else {
        if (zy + zh + yGap + dh <= winHeight) {
            y = zy + zh + yGap;
        } else {
            y = zy + yGap;
        }
    }
    y = Math.max(0, Math.min(winHeight - dh, y));

    whEl.style({ top: `${y}px`, right: "", left: `${x}px` });
}

function checkWhBarWidth() {
    for (const el of whL) {
        el.style({ width: `${el.el.value.length}ch` });
    }
}

function changeWH(el: ElType<HTMLInputElement>) {
    const l0 = whL.map((i) => i.el.value);
    const l = l0.map((string) => {
        // 排除（数字运算符空格）之外的非法输入
        if (string.match(/[\d\+\-*/\.\s\(\)]/g)?.length !== string.length)
            return null;
        // todo sandbox math
        // biome-ignore lint: 已经过滤（？） 计算math
        return eval(string);
    });

    if (l.includes(null)) {
        whBar(finalRect);
        return;
    }

    const d = 0;
    if (el === whX0 || el === whY0) {
        finalRect[0] = Number(l[0]) - d;
        finalRect[1] = Number(l[1]) - d;
    } else if (el === whX1 || el === whY1) {
        finalRect[2] = Number(l[2]) - finalRect[0] - d;
        finalRect[3] = Number(l[3]) - finalRect[1] - d;
    } else {
        finalRect[2] = Number(l[4]);
        finalRect[3] = Number(l[5]);
    }
    finalRectFix();
    hisPush();
    drawClipRect();
    followBar();
}

function mouseBar(finalRect: rect, e: MouseEvent) {
    const { x, y } = e2cXY(e);
    const [x0, y0, width, height] = finalRect;

    const delta = (colorSize - 1) / 2;
    const xOffset = x - delta;
    const yOffset = y - delta;

    const imageData = mainCanvasContext.getImageData(
        xOffset,
        yOffset,
        colorSize,
        colorSize,
    );

    pointColorCanvasCtx.clearRect(0, 0, colorSize, colorSize);
    pointColorCanvasBgCtx.clearRect(0, 0, colorSize, colorSize);

    pointColorCanvasBgCtx.putImageData(imageData, 0, 0);

    let points: point[] = [];

    if (isRect || freeSelect.length < 3) {
        points.push({ x: x0, y: y0 });
        points.push({ x: x0, y: y0 + height });
        points.push({ x: x0 + width, y: y0 + height });
        points.push({ x: x0 + width, y: y0 });
    } else {
        points = freeSelect;
    }

    pointColorCanvasCtx.save();

    pointColorCanvasCtx.beginPath();
    pointColorCanvasCtx.moveTo(points[0].x - xOffset, points[0].y - yOffset);
    for (let i = 1; i < points.length; i++) {
        pointColorCanvasCtx.lineTo(
            points[i].x - xOffset,
            points[i].y - yOffset,
        );
    }
    pointColorCanvasCtx.closePath();
    pointColorCanvasCtx.clip();
    pointColorCanvasCtx.drawImage(pointColorCanvasBg, 0, 0);

    pointColorCanvasCtx.restore();

    const centerIndex = (colorSize * delta + delta) * 4;
    let [r, g, b, a] = imageData.data.slice(centerIndex, centerIndex + 4);

    a /= 255;
    const cssColor = `rgb(${r} ${g} ${b} / ${a})`;
    pointCenter.style.background = cssColor;
    theColor = [r, g, b, a];
    clipColorText([r, g, b, a], 取色器默认格式);

    mouseBarXy.sv([x, y]);
}

function ckx(e: MouseEvent) {
    if (!g光标参考线) return;
    const { x, y } = e2cXY(e);
    clipCtx.fillStyle = c参考线颜色.光标参考线;
    clipCtx.fillRect(0, y, x, 1);
    clipCtx.fillRect(x + 1, y, clipCanvas.width - x - 1, 1);

    clipCtx.fillRect(x, 0, 1, y);
    clipCtx.fillRect(x, y + 1, 1, clipCanvas.height - y - 1);
}

function numberFormat(num: number) {
    return (num || 0).toFixed(1).replace(/\.?0+$/, "");
}

function rgba2str(rgba: colorRGBA) {
    return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${rgba[3]})`;
}

// 色彩空间转换
function colorConversion(rgba: colorRGBA | null, type: colorFormat): string {
    const color = chroma(rgba2str(rgba || [0, 0, 0, 0]));
    if (color.alpha() !== 1) return "/";
    switch (type) {
        case "HEX":
            return color.hex();
        case "RGB":
            return color.css();
        case "HSL": {
            return color.css("hsl");
        }
        case "HSV": {
            const hsv = color.hsv();
            return `hsv(${numberFormat(hsv[0])} ${numberFormat(hsv[1] * 100)}% ${numberFormat(hsv[2] * 100)}%)`;
        }
        case "CMYK": {
            const cmyk = color.cmyk();
            return `cmyk(${numberFormat(cmyk[0] * 100)}% ${numberFormat(cmyk[1] * 100)}% ${numberFormat(cmyk[2] * 100)}% ${numberFormat(cmyk[3] * 100)}%)`;
        }
        case "HWB": {
            const [h, s, v] = color.hsv();
            return `hwb(${numberFormat(h)} ${numberFormat((1 - s) * v * 100)}% ${numberFormat((1 - v) * 100)}%)`;
        }
        case "LAB":
            return color.css("lab");
        case "LCH":
            return color.css("lch");
        case "OKLAB":
            return color.css("oklab");
        case "OKLCH":
            return color.css("oklch");
        default:
            return "";
    }
}

function getColorFormatEl() {
    return mouseBarCopyColorList[取色器格式位置];
}

// 改变颜色文字和样式
function clipColorText(l: colorRGBA, type: colorFormat) {
    const color = chroma(rgba2str(l));
    const clipColorTextColor = color.alpha() === 1 ? pickTextColor(color) : "";
    theTextColor = [color.hex(), clipColorTextColor];

    mouseBarCopyColor.el.style.backgroundColor = color.hex();
    const mainEl = getColorFormatEl();
    // 只改变默认格式的字体颜色和内容，并定位展示
    mainEl.el.style.color = theTextColor[1];
    const c = colorConversion(l, type);
    const main = c.includes("(")
        ? c
              .match(/\((.*)\)/)[1]
              .replace("deg", "°")
              .replace("none", "-")
        : c;
    const minR = 0.6;
    mainEl
        .clear()
        .style({
            fontSize: `${Math.max(minR, Math.min((colorSize * colorISize) / (main.length * chPX), 1))}rem`,
        })
        .add(main);
    const minW = main.length * chPX * minR;
    setProperties({ "--min-color-size": `${minW}px` });

    if (color.alpha() !== 1) {
        mainEl.el.style.color = "";
    }
}

// 改变鼠标跟随栏形态，展示所有颜色格式
function changeRightBar(v: boolean) {
    mouseBarCopySize
        .clear()
        .add(`${finalRect[2]} × ${finalRect[3]}`)
        .on("click", (_, el) => {
            copy(el);
        });
    mouseBarCopyColorList = allColorFormat.map((i) =>
        view()
            .add(colorConversion(theColor, i))
            .on("click", (_, el) => {
                copy(el);
            }),
    );
    mouseBarCopyColor
        .clear()
        .style({
            backgroundColor: theTextColor[0],
            color: theTextColor[1],
        })
        .add(mouseBarCopyColorList);
    const maxW = Math.max(
        ...mouseBarCopyColorList.map((i) => i.el.innerText.length * chPX),
    );
    if (v) {
        mouseBarColor.el.style.height = "0";
        mouseBarCopy.style({
            width: `${maxW}px`,
            height: `${32 * (allColorFormat.length + 1)}px`,
        });
        mouseBarCopyI.el.style.top = "0";
        mouseBarEl.el.style.pointerEvents = "auto";
    } else {
        mouseBarColor.el.style.height = "";
        mouseBarCopy.style({
            width: "max(var(--color-size), var(--min-color-size))",
            height: "32px",
        });
        mouseBarCopyI.el.style.top = `${-32 * (取色器格式位置 + 1)}px`;
        mouseBarEl.el.style.pointerEvents = "none";
        if (theColor) clipColorText(theColor, 取色器默认格式);
    }
}

/**
 * 复制内容
 */
function copy(e: ElType<HTMLElement>) {
    clipboard.writeText(e.el.innerText);
    rightKey = false;
    changeRightBar(false);
}

/**
 * 工具栏自动跟随
 */
function followBar(op?: { x: number; y: number }) {
    const zx = (finalRect[0] + editorP.x) * editorP.zoom;
    const zy = (finalRect[1] + editorP.y) * editorP.zoom;
    const zw = finalRect[2] * editorP.zoom;
    const zh = finalRect[3] * editorP.zoom;
    let x = 0;
    let y = 0;
    if (!op) {
        // @ts-ignore
        const dx = undoStack.at(-1)[0] - undoStack.at(-2)[0];
        // @ts-ignore
        const dy = undoStack.at(-1)[1] - undoStack.at(-2)[1];
        // @ts-ignore
        x = followBarList.at(-1)[0] + dx / ratio;
        // @ts-ignore
        y = followBarList.at(-1)[1] + dy / ratio;
    } else {
        x = op.x;
        y = op.y;
    }
    followBarList.push([x, y]);
    const [x1, y1] = [zx, zy];
    const x2 = x1 + zw;
    const y2 = y1 + zh;
    const maxWidth = window.innerWidth;
    const maxHeight = window.innerHeight;
    const toolW = toolBar.offsetWidth;
    const drawW = drawBar.offsetWidth;
    const gap = barGap;
    const groupW = toolW + gap + drawW;

    if ((x1 + x2) / 2 <= x) {
        // 向右
        if (x2 + groupW + gap <= maxWidth) {
            toolBar.style.left = `${x2 + gap}px`; // 贴右边
            drawBarPosi = "right";
        } else {
            if (工具栏跟随 === "展示内容优先") {
                // 超出屏幕贴左边
                if (x1 - groupW - gap >= 0) {
                    toolBar.style.left = `${x1 - toolW - gap}px`;
                    drawBarPosi = "left";
                } else {
                    // 还超贴右内
                    toolBar.style.left = `${maxWidth - groupW}px`;
                    drawBarPosi = "right";
                }
            } else {
                // 直接贴右边,即使遮挡
                toolBar.style.left = `${x2 - groupW - gap}px`;
                drawBarPosi = "right";
            }
        }
    } else {
        // 向左
        if (x1 - groupW - gap >= 0) {
            toolBar.style.left = `${x1 - toolW - gap}px`; // 贴左边
            drawBarPosi = "left";
        } else {
            if (工具栏跟随 === "展示内容优先") {
                // 超出屏幕贴右边
                if (x2 + groupW <= maxWidth) {
                    toolBar.style.left = `${x2 + gap}px`;
                    drawBarPosi = "right";
                } else {
                    // 还超贴左内
                    toolBar.style.left = `${0 + drawW + gap}px`;
                    drawBarPosi = "left";
                }
            } else {
                toolBar.style.left = `${x1 + gap}px`;
                drawBarPosi = "left";
            }
        }
    }

    if (y >= (y1 + y2) / 2) {
        if (y2 - toolBar.offsetHeight >= 0) {
            toolBar.style.top = `${y2 - toolBar.offsetHeight}px`;
        } else {
            if (y1 + toolBar.offsetHeight > maxHeight) {
                toolBar.style.top = `${maxHeight - toolBar.offsetHeight}px`;
            } else {
                toolBar.style.top = `${y1}px`;
            }
        }
    } else {
        if (y1 + toolBar.offsetHeight <= maxHeight) {
            toolBar.style.top = `${y1}px`;
        } else {
            toolBar.style.top = `${maxHeight - toolBar.offsetHeight}px`;
        }
    }
    drawBar.style.opacity = toolBar.style.opacity = "1";
    trackLocation();
}

// 修复final_rect负数
// 超出屏幕处理
function finalRectFix() {
    finalRect = finalRect.map((i) => Math.round(i)) as rect;
    const x0 = finalRect[0];
    const y0 = finalRect[1];
    const x1 = finalRect[0] + finalRect[2];
    const y1 = finalRect[1] + finalRect[3];
    let x = Math.min(x0, x1);
    let y = Math.min(y0, y1);
    let w = Math.max(x0, x1) - x;
    let h = Math.max(y0, y1) - y;
    // 移出去移回来保持原来大小
    if (x < 0) w = x = 0;
    if (y < 0) h = y = 0;
    if (x > mainCanvas.width) x = x % mainCanvas.width;
    if (y > mainCanvas.height) y = y % mainCanvas.height;
    if (x + w > mainCanvas.width) w = mainCanvas.width - x;
    if (y + h > mainCanvas.height) h = mainCanvas.height - y;
    finalRect = [x, y, w, h];
}

function inRange(
    min: number,
    value: number,
    max: number,
    type: `${"[" | "("}${")" | "]"}` = "[]",
) {
    if (type === "[]") return min <= value && value <= max;
    if (type === "(]") return min < value && value <= max;
    if (type === "[)") return min <= value && value < max;
    return min < value && value < max;
}

/**
 * 判断光标位置并更改样式,定义光标位置的移动方向
 */
function isInClipRect(p: editor_position) {
    let inRect = false;

    const [x0, y0, width, height] = finalRect;
    const x1 = x0 + width;
    const y1 = y0 + height;
    // 如果全屏,那允许框选
    if (
        !(
            finalRect[2] === mainCanvas.width &&
            finalRect[3] === mainCanvas.height
        )
    ) {
        if (x0 <= p.x && p.x <= x1 && y0 <= p.y && p.y <= y1) {
            // 在框选区域内,不可框选,只可调整
            inRect = true;
        } else {
            inRect = false;
        }

        direction = "";

        const num = (8 / editorP.zoom) * window.devicePixelRatio;

        // 光标样式
        if (inRange(x0, p.x, x0 + num) && inRange(y0, p.y, y0 + num)) {
            clipCanvas.style.cursor = "nwse-resize";
            direction = "西北";
        } else if (inRange(x1 - num, p.x, x1) && inRange(y1 - num, p.y, y1)) {
            clipCanvas.style.cursor = "nwse-resize";
            direction = "东南";
        } else if (inRange(y0, p.y, y0 + num) && inRange(x1 - num, p.x, x1)) {
            clipCanvas.style.cursor = "nesw-resize";
            direction = "东北";
        } else if (inRange(y1 - num, p.y, y1) && inRange(x0, p.x, x0 + num)) {
            clipCanvas.style.cursor = "nesw-resize";
            direction = "西南";
        } else if (inRange(x0, p.x, x0 + num) && inRange(y0, p.y, y1)) {
            clipCanvas.style.cursor = "ew-resize";
            direction = "西";
        } else if (inRange(x1 - num, p.x, x1) && inRange(y0, p.y, y1)) {
            clipCanvas.style.cursor = "ew-resize";
            direction = "东";
        } else if (inRange(y0, p.y, y0 + num) && inRange(x0, p.x, x1)) {
            clipCanvas.style.cursor = "ns-resize";
            direction = "北";
        } else if (inRange(y1 - num, p.y, y1) && inRange(x0, p.x, x1)) {
            clipCanvas.style.cursor = "ns-resize";
            direction = "南";
        } else if (
            inRange(x0 + num, p.x, x1 - num, "()") &&
            inRange(y0 + num, p.y, y1 - num, "()")
        ) {
            clipCanvas.style.cursor = "move";
            direction = "move";
        } else {
            clipCanvas.style.cursor = "crosshair";
            direction = "";
        }
    } else {
        // 全屏可框选
        clipCanvas.style.cursor = "crosshair";
        direction = "";
        inRect = false;
    }
    return inRect;
}

/** 调整框选 */
function moveRect(
    oldFinalRect: rect | null,
    oldPosition: editor_position,
    position: editor_position,
) {
    if (!oldFinalRect) return;
    const op = oldPosition;
    const p = position;
    const dx = p.x - op.x;
    const dy = p.y - op.y;
    switch (direction) {
        case "西北":
            finalRect = [
                oldFinalRect[0] + dx,
                oldFinalRect[1] + dy,
                oldFinalRect[2] - dx,
                oldFinalRect[3] - dy,
            ];
            break;
        case "东南":
            finalRect = [
                oldFinalRect[0],
                oldFinalRect[1],
                oldFinalRect[2] + dx,
                oldFinalRect[3] + dy,
            ];
            break;
        case "东北":
            finalRect = [
                oldFinalRect[0],
                oldFinalRect[1] + dy,
                oldFinalRect[2] + dx,
                oldFinalRect[3] - dy,
            ];
            break;
        case "西南":
            finalRect = [
                oldFinalRect[0] + dx,
                oldFinalRect[1],
                oldFinalRect[2] - dx,
                oldFinalRect[3] + dy,
            ];
            break;
        case "西":
            finalRect = [
                oldFinalRect[0] + dx,
                oldFinalRect[1],
                oldFinalRect[2] - dx,
                oldFinalRect[3],
            ];
            break;
        case "东":
            finalRect = [
                oldFinalRect[0],
                oldFinalRect[1],
                oldFinalRect[2] + dx,
                oldFinalRect[3],
            ];
            break;
        case "北":
            finalRect = [
                oldFinalRect[0],
                oldFinalRect[1] + dy,
                oldFinalRect[2],
                oldFinalRect[3] - dy,
            ];
            break;
        case "南":
            finalRect = [
                oldFinalRect[0],
                oldFinalRect[1],
                oldFinalRect[2],
                oldFinalRect[3] + dy,
            ];
            break;
        case "move":
            finalRect = [
                oldFinalRect[0] + dx,
                oldFinalRect[1] + dy,
                oldFinalRect[2],
                oldFinalRect[3],
            ];
            break;
    }
    if (finalRect[0] < 0) {
        finalRect[2] = finalRect[2] + finalRect[0];
        finalRect[0] = 0;
    }
    if (finalRect[1] < 0) {
        finalRect[3] = finalRect[3] + finalRect[1];
        finalRect[1] = 0;
    }
    if (finalRect[0] + finalRect[2] > mainCanvas.width)
        finalRect[2] = mainCanvas.width - finalRect[0];
    if (finalRect[1] + finalRect[3] > mainCanvas.height)
        finalRect[3] = mainCanvas.height - finalRect[1];

    finalRectFix();
}
function isPointInPolygon(p: point): boolean {
    let inside = false;

    inside = clipCtx.isPointInPath(p.x, p.y);

    if (inside) {
        clipCanvas.style.cursor = "move";
        direction = "move";
    } else {
        clipCanvas.style.cursor = "crosshair";
        direction = "";
    }
    return inside;
}

/** 调整框选 */
function movePoly(
    oldPoly: point[] | null,
    oldPosition: editor_position,
    position: editor_position,
) {
    if (!oldPoly) return;
    const op = oldPosition;
    const p = position;
    const dx = p.x - op.x;
    const dy = p.y - op.y;
    if (direction === "move") {
        freeSelect = oldPoly.map((i) => {
            const x = Math.round(i.x + dx);
            const y = Math.round(i.y + dy);
            return { x, y };
        });
    }
}

/**
 * 保存历史
 */
function hisPush() {
    // 撤回到中途编辑，复制撤回的这一位置参数与编辑的参数一起放到末尾
    if (undoStackI !== undoStack.length - 1 && undoStack.length >= 2)
        undoStack.push(undoStack[undoStackI]);

    const finalRectV = [
        finalRect[0],
        finalRect[1],
        finalRect[2],
        finalRect[3],
    ] as rect; // 防止引用源地址导致后续操作-2个被改变
    const canvas = fabricCanvas?.toJSON() || {};

    if (`${rectStack.at(-1)}` !== `${finalRectV}`) rectStack.push(finalRectV);
    if (JSON.stringify(canvasStack.at(-1)) !== JSON.stringify(canvas))
        canvasStack.push(canvas);

    undoStack.push({
        rect: rectStack.length - 1,
        canvas: canvasStack.length - 1,
    });
    undoStackI = undoStack.length - 1;
}
/**
 * 更改历史指针
 * @param {boolean} v true向前 false向后
 */
function undo(v: boolean) {
    if (v) {
        if (undoStackI > 0) {
            undoStackI--;
        }
    } else {
        if (undoStackI < undoStack.length - 1) {
            undoStackI++;
        }
    }
    const c = undoStack[undoStackI];
    finalRect = rectStack[c.rect];
    drawClipRect();
    followBar();
    if (fabricCanvas) fabricCanvas.loadFromJSON(canvasStack[c.canvas]);
}

function getShapePro(name: keyof typeof shapePro) {
    const v = {
        fc: fillColor,
        sc: strokeColor,
        sw: strokeWidth,
        shadow: 0,
    };
    const free: (typeof name)[] = ["free", "eraser", "spray"];
    if (free.includes(name)) {
        v.sc = freeColor;
        v.sw = freeWidth;
    }
    if (!shapePro[name]) shapePro[name] = {};

    for (const x of ["fc", "sc", "sw", "shadow"] as const) {
        if (shapePro[name][x]) {
            // @ts-ignore
            v[x] = shapePro[name][x];
        } else {
            // @ts-ignore
            shapePro[name][x] = v[x] =
                store.get(`图像编辑.形状属性.${name}.${x}`) ?? v[x];
        }
    }
    const nv: { fc: string; sc: string; sw: number; shadow?: number } = {
        fc: v.fc,
        sc: v.sc,
        sw: v.sw,
    };
    if (free.includes(name)) nv.shadow = v.shadow;
    return nv;
}

function setEditType<T extends keyof EditType>(
    mainType: T,
    type: EditType[T],
): void {
    if (!(mainType === "select" && type === "draw")) {
        editType[mainType] = type;
        nowType = mainType;
    }

    const SELECT = "select";

    for (const [i, mel] of Object.entries(drawMainEls)) {
        if (i === mainType) {
            mel.el.classList.add(SELECT);
            mel.el.innerHTML = drawSideEls[mainType][type].el.innerHTML;
        } else {
            mel.el.classList.remove(SELECT);
        }
        for (const [j, sel] of Object.entries(
            drawSideEls[i as keyof EditType],
        )) {
            if (i === mainType && j === type) {
                sel.el.classList.add(SELECT);
            } else {
                sel.el.classList.remove(SELECT);
            }
        }
    }

    if (mainType === "select") {
        if (type !== "draw") {
            exitFree();
            exitShape();
            exitFilter();
            drawM(false);
            if (type === "free") {
                isRect = false;
            } else {
                isRect = true;
            }
        } else {
            drawM(true);
            exitFree();
            exitShape();
            exitFilter();
        }
        backHotkeyScope();
    } else {
        drawM(true);
        toHotkeyScope("drawing");
    }
    if (mainType === "draw") {
        fabricCanvas.isDrawingMode = true;
        mode = type as EditType["draw"];
        freeInit();
        if (type === "free") {
            pencilElClick();
        }
        if (type === "eraser") {
            eraserElClick();
        }
        if (type === "spray") {
            freeSprayElClick();
        }
        exitShape();
        exitFilter();
        freeDrawCursor();
        ableChangeColor();
    }
    if (mainType === "filter") {
        willFilter = type;
        exitFree();
        exitShape();
        newFilterSelecting = true;
        fabricCanvas.defaultCursor = "crosshair";
    }
    if (mainType === "shape") {
        shape = type as Shape;
        if (shape) {
            const sPro = getShapePro(shape);
            colorFillEl.sv(sPro.fc);
            colorStrokeEl.sv(sPro.sc);
            strokeWidthEl.sv(sPro.sw);
        }

        exitFree();
        exitFilter();
        fabricCanvas.defaultCursor = "crosshair";

        ableChangeColor();
    }

    if (!(mainType === "select" && type === "draw"))
        store.set(`图像编辑.记忆.${mainType}`, type);

    setOnlyStroke(
        mainType === "draw" ||
            (mainType === "shape" && strokeShapes.includes(type)),
    );
}

function showSideBarItem(index: number) {
    showSideBar(true);
    for (const [i, { w, el }] of drawBarSideElChildren.entries()) {
        if (index === i) {
            const height = Math.ceil(el.el.children.length / w);
            const x = w;
            const y = height;
            el.style({ display: "", width: `${x * bSize}px` });
            let left = bSize * 1;
            if (drawBar.offsetLeft + bSize + bSize * x > window.innerWidth)
                left = -bSize * x;
            drawSideBar.style.left = `${left}px`;
            drawSideBar.style.top = `${bSize * Math.min(i, drawMainBar.children.length - y)}px`;
            drawSideBar.style.width = `${bSize * x}px`;
            drawSideBar.style.height = `${bSize * y}px`;
        } else {
            el.style({ display: "none" });
        }
    }
}

function isInDrawBar() {
    return drawBar.contains(
        document.elementFromPoint(nowMouseE.clientX, nowMouseE.clientY),
    );
}

function showSideBar(show: boolean) {
    if (show) {
        drawSideBar.classList.remove("draw_side_hide");
    } else {
        drawSideBar.classList.add("draw_side_hide");
    }
}

function showBars(b: boolean) {
    const l = [toolBar, drawBar];
    for (const i of l) {
        if (b) {
            i.style.pointerEvents = "";
            i.style.opacity = "";
        } else {
            i.style.pointerEvents = "none";
            i.style.opacity = "0";
        }
    }
}
function pencilElClick() {
    fabricCanvas.freeDrawingBrush = new PencilBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.color = getShapePro("free").sc;
    fabricCanvas.freeDrawingBrush.width = getShapePro("free").sw;

    freeShadow();
}
function eraserElClick() {
    // todo
    const eraser = new EraserBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush = eraser;
    fabricCanvas.freeDrawingBrush.width = getShapePro("eraser").sw;
}
function freeSprayElClick() {
    fabricCanvas.freeDrawingBrush = new SprayBrush(fabricCanvas);
    fabricCanvas.freeDrawingBrush.color = getShapePro("spray").sc;
    fabricCanvas.freeDrawingBrush.width = getShapePro("spray").sw;
}
function freeShadow() {
    if (fabricCanvas.freeDrawingBrush)
        fabricCanvas.freeDrawingBrush.shadow = new Shadow({
            blur: getShapePro("free").shadow,
            color: getShapePro("free").sc,
        });
}

function freeDrawCursor() {
    if (mode === "free" || mode === "eraser") {
        let svgW = freeWidth;
        let hW = svgW / 2;
        const r = freeWidth / 2;
        if (svgW < 10) {
            svgW = 10;
            hW = 5;
        }
        let svg = "";
        if (mode === "free") {
            svg = `<svg width="${svgW}" height="${svgW}" xmlns="http://www.w3.org/2000/svg"><line x1="0" x2="${svgW}" y1="${hW}" y2="${hW}" stroke="#000"/><line y1="0" y2="${svgW}" x1="${hW}" x2="${hW}" stroke="#000"/><circle style="fill:${freeColor};" cx="${hW}" cy="${hW}" r="${r}"/></svg>`;
        } else {
            svg = `<svg width="${svgW}" height="${svgW}" xmlns="http://www.w3.org/2000/svg"><line x1="0" x2="${svgW}" y1="${hW}" y2="${hW}" stroke="#000"/><line y1="0" y2="${svgW}" x1="${hW}" x2="${hW}" stroke="#000"/><circle style="stroke-width:1;stroke:#000;fill:none" cx="${hW}" cy="${hW}" r="${r}"/></svg>`;
        }
        const d = document.createElement("div");
        d.innerHTML = svg;
        const s = new XMLSerializer().serializeToString(
            d.querySelector("svg") as SVGElement,
        );
        const cursorUrl = `data:image/svg+xml;base64,${window.btoa(s)}`;
        fabricCanvas.freeDrawingCursor = `url(" ${cursorUrl} ") ${hW} ${hW}, auto`;
    } else {
        fabricCanvas.freeDrawingCursor = "auto";
    }
}

function freeInit() {
    const { sc, sw, shadow } = getShapePro(mode);
    setDrawMode("stroke");
    colorStrokeEl.sv(sc);
    strokeWidthEl.sv(sw);
    shadowBlurEl.sv(shadow);
}

function fabricDelete() {
    for (const o of fabricCanvas.getActiveObjects()) {
        fabricCanvas.remove(o);
    }
    getFObjectV();
    getFilters();
    hisPush();
}

function rotate(x: number, y: number, r: number) {
    const s = Math.sin(r);
    const c = Math.cos(r);
    return [x * c - y * s, x * s + y * c];
}

// 画一般图形
function draw(
    shape: EditType["shape"],
    v: "start" | "move",
    x1: number,
    y1: number,
    x2: number,
    y2: number,
) {
    const pro = getShapePro(shape);
    const [fillColor, strokeColor, strokeWidth] = [pro.fc, pro.sc, pro.sw];
    if (v === "move") {
        const obj = shapes.at(-1);
        if (obj) fabricCanvas.remove(obj);
        shapes.splice(shapes.length - 1, 1);
    }
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x1 - x2);
    const h = Math.abs(y1 - y2);
    let shapeX: FabricObject | null = null;
    if (shape === "line") {
        shapeX = new Line([x1, y1, x2, y2], {
            stroke: strokeColor,
            形状: "line",
        });
    } else if (shape === "circle") {
        shapeX = new Circle({
            radius: Math.max(w, h) / 2,
            left: x,
            top: y,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            canChangeFill: true,
            形状: "circle",
        });
    } else if (shape === "rect") {
        shapeX = new Rect({
            left: x,
            top: y,
            width: w,
            height: h,
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            canChangeFill: true,
            形状: "rect",
        });
    } else if (shape === "text") {
        shapeX = new IText("点击输入文字", {
            left: x,
            top: y,
            canChangeFill: true,
            形状: "text",
            fontFamily: 字体.主要字体,
        });
    } else if (shape === "arrow") {
        shapeX = new arrow([x1, y1, x2, y2], {
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            形状: "arrow",
        });
    } else if (shape === "mask") {
        shapeX = new mask({
            left: 0,
            top: 0,
            width: fabricCanvas.width,
            height: fabricCanvas.height,
            fill: fillColor,
            rect: { x, y, w, h },
            canChangeFill: true,
            形状: "mask",
        });
    }
    if (shapeX) {
        shapes.push(shapeX);
        fabricCanvas.add(shapeX);
    }
}
// 多边形
function drawPoly(shape: EditType["shape"]) {
    console.log(1111);

    const pro = getShapePro(shape);
    const [fillColor, strokeColor, strokeWidth] = [pro.fc, pro.sc, pro.sw];
    if (polyOP.length !== 1) {
        const obj = shapes.at(-1);
        if (obj) fabricCanvas.remove(obj);
        shapes.splice(shapes.length - 1, 1);
    }
    let shapeX: FabricObject | null = null;
    if (shape === "polyline") {
        shapeX = new Polyline(polyOP, {
            fill: "#0000",
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            形状: "polyline",
        });
    }
    if (shape === "polygon") {
        shapeX = new Polygon(polyOP, {
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            canChangeFill: true,
            形状: "polygon",
        });
    }
    if (shapeX) {
        shapes.push(shapeX);
        fabricCanvas.add(shapeX);
    }
}

function drawNumber() {
    const nowShape = shapes.at(-1);
    if (!nowShape) return;
    // @ts-ignore
    drawNumberN = Number(nowShape.text) + 1 || drawNumberN;
    const p = polyOP.at(-1);
    if (!p) return;

    const txt = new xnumber({
        left: p.x,
        top: p.y,
        fontSize: 16,
        radius: 12,
        originX: "center",
        originY: "center",
        fill: getShapePro("number").fc,
        stroke: getShapePro("number").sc,
        strokeWidth: getShapePro("number").sw,
        canChangeFill: true,
        text: String(drawNumberN),
        形状: "number",
    });
    shapes.push(txt);
    fabricCanvas.add(nowShape);
    fabricCanvas.setActiveObject(txt);

    drawNumberN++;
}

/** 切换当前颜色设定的ui */
function setDrawMode(m: typeof colorM) {
    colorM = m;
    if (m === "fill") {
        colorFillEl.style({ height: "" });
        colorStrokeEl.style({ height: "0" });
        drawStrokeWidth.style({ height: "0" });
        drawColorSwitchMark.style({ top: 0 }).attr({ title: "当前为填充" });
    } else {
        colorFillEl.style({ height: "0" });
        colorStrokeEl.style({ height: "" });
        drawStrokeWidth.style({ height: "" });
        drawColorSwitchMark.style({ top: "calc(var(--bar-size) / 2)" }).attr({
            title: "当前为描边",
        });
    }
}

function ableChangeColor() {
    if (fabricCanvas.isDrawingMode || shape || fabricCanvas.getActiveObject()) {
        drawColorSide.style({ pointerEvents: "auto", opacity: "1" });
    } else {
        drawColorSide.style({ pointerEvents: "none", opacity: "0.2" });
    }
}

function pickTextColor(bg: chroma.Color, c1 = "#fff", c2 = "#000") {
    // todo 主题色
    if (chroma.contrast(bg, c1) > chroma.contrast(bg, c2)) {
        return c1;
    }
    return c2;
}

function colorInput(type: "fill" | "stroke") {
    const i = input().on("input", () => {
        setC();
        main.el.dispatchEvent(new Event("input"));
    });
    const alpha = rangeBar(0, 1, 0.01).on("input", () => {
        setC();
        main.el.dispatchEvent(new Event("input"));
    });

    function getInputV() {
        return chroma(i.gv).alpha(Number(alpha.gv));
    }
    function setC() {
        const color = getInputV();
        i.style({ "background-color": color.hex() });

        let textColor = "#000";
        const tColor = color;
        const bgColor = chroma(
            window
                .getComputedStyle(document.documentElement)
                .getPropertyValue("--bar-bg0"),
        );
        if (tColor.alpha() >= 0.5 || tColor.alpha() === undefined) {
            textColor = pickTextColor(tColor); // todo 直接混合
        } else {
            // 低透明度背景呈现栏的颜色
            textColor = pickTextColor(bgColor);
        }
        i.style({ color: textColor });

        if (type === "fill") {
            drawColorEl.el.style.backgroundColor = color.hex();
        }
        if (type === "stroke") {
            drawColorEl.el.style.borderColor = color.hex();
        }
    }
    const main = view()
        .add([i, alpha])
        .bindSet((v: string) => {
            const color = chroma(v);
            i.sv(color.hex());
            alpha.sv(color.alpha());
            setC();
        })
        .bindGet(() => {
            return getInputV().hex();
        });
    return main;
}

/** 主编辑栏的属性预览显示为描边 */
function setOnlyStroke(b: boolean) {
    const el = drawColorEl;
    if (b) {
        el.style({
            width: 0,
            rotate: "45deg",
        });
    } else {
        el.style({
            width: "",
            rotate: "",
        });
    }
    setDrawMode(b ? "stroke" : "fill");
}

// 色盘
function colorBar() {
    // 主盘
    const colorList = [0];
    for (let i = 0; i < 360; i += 15) {
        colorList.push(i);
    }
    let isNext = false;
    showColor();
    // 下一层级
    function nextColor(h: number) {
        const nextColorList: string[] = [];
        if (h === 0) {
            for (let i = 0; i < 25; i++) {
                const x = (100 / 24) * (24 - i);
                nextColorList.push(`hsl(0, 0%, ${x}%)`);
            }
        } else {
            for (let i = 90; i > 0; i -= 20) {
                for (let j = 100; j > 0; j -= 20) {
                    nextColorList.push(`hsl(${h}, ${j}%, ${i}%)`);
                }
            }
        }
        drawColorColor.clear().add(
            Object.values(nextColorList).map((v) => {
                return view()
                    .class("color_i")
                    .style({
                        "background-color": v,
                    })
                    .data({
                        title: colorConversion(
                            chroma(v).rgba(),
                            取色器默认格式,
                        ),
                    });
            }),
        );
    }
    function showColor() {
        drawColorColor.clear().add(
            colorList.map((x, i) => {
                return view()
                    .class("color_i")
                    .style({
                        "background-color":
                            i === 0 ? "#fff" : `hsl(${x}, 100%, 50%)`,
                    })
                    .data({
                        i: i.toString(),
                        title: colorConversion(
                            chroma(x).rgba(),
                            取色器默认格式,
                        ),
                    });
            }),
        );
    }
    // 事件
    function cColor(el: HTMLElement) {
        const color = el.style.backgroundColor;
        if (colorM === "fill") {
            colorFillEl.sv(color);
            setFObjectV(color, null, null);
        }
        if (colorM === "stroke") {
            colorStrokeEl.sv(color);
            setFObjectV(null, color, null);
        }
    }
    drawColorColor.on("pointerdown", (e) => {
        const el = e.target as HTMLElement;
        if (e.button === 0) {
            cColor(el);
        } else {
            isNext = !isNext;
            if (isNext) {
                const index = Number(el.getAttribute("data-i"));
                nextColor(colorList[index]);
            } else {
                showColor();
            }
        }
    });
}

/** 鼠标点击后，改变栏文字样式 */
function getFObjectV() {
    const pro: {
        fc: string | undefined;
        sc: string | undefined;
        sw: number | undefined;
    } = { fc: fillColor, sc: strokeColor, sw: strokeWidth };
    const n = fabricCanvas.getActiveObject();
    if (n) {
        // todo 当线与形一起选中，确保形不会透明
        pro.fc = n.fill?.toString();
        pro.sc = n.stroke?.toString();
        pro.sw = n.strokeWidth;
        if ((n as FabricImage).filters) {
            pro.fc = fillColor;
            pro.sc = strokeColor;
            pro.sw = strokeWidth;
        }
        setOnlyStroke(!n.canChangeFill);
    } else if (fabricCanvas.isDrawingMode) {
        pro.fc = shapePro.free?.sc;
        pro.sc = shapePro.free?.sc;
        pro.sw = shapePro.free?.sw;
    } else {
        if (nowType === "shape" || nowType === "draw") {
            const p = shapePro[editType[nowType]];
            pro.fc = p?.fc;
            pro.sc = p?.sc;
            pro.sw = p?.sw;
        }
    }
    console.log(pro);
    strokeWidthEl.sv(pro.sw ?? strokeWidth);
    colorFillEl.sv(pro.fc ?? fillColor);
    colorStrokeEl.sv(pro.sc ?? strokeColor);

    ableChangeColor();
}
/**
 * 更改全局或选中形状的颜色
 * @param {String} fill 填充颜色
 * @param {String} stroke 边框颜色
 * @param {Number} sw 边框宽度
 */
function setFObjectV(
    fill: string | null,
    stroke: string | null,
    sw: number | null,
) {
    if (fabricCanvas.getActiveObject()) {
        console.log(0);
        /* 选中Object */
        const n = fabricCanvas.getActiveObjects();
        for (const i of n) {
            if (fill) {
                // 只改变形的颜色
                if (i.canChangeFill) i.set("fill", fill);
            }
            if (stroke) i.set("stroke", stroke);
            if (sw) i.set("strokeWidth", sw);
            if (i.形状) {
                store.set(`图像编辑.形状属性.${i.形状}.fc`, fill || fillColor);
                store.set(
                    `图像编辑.形状属性.${i.形状}.sc`,
                    stroke || strokeColor,
                );
                store.set(`图像编辑.形状属性.${i.形状}.sw`, sw || strokeWidth);
                shapePro[i.形状] = {
                    fc: fill || fillColor,
                    sc: stroke || strokeColor,
                    sw: sw || strokeWidth,
                };
            }
        }
        fabricCanvas.renderAll();
    } else if (fabricCanvas.isDrawingMode) {
        console.log(1);
        /* 画笔 */
        if (stroke) {
            if (fabricCanvas.freeDrawingBrush)
                fabricCanvas.freeDrawingBrush.color = stroke;
            const s = shapePro[editType.draw];
            if (s) s.sc = stroke;
        }
        if (sw) {
            if (fabricCanvas.freeDrawingBrush)
                fabricCanvas.freeDrawingBrush.width = sw;
            const s = shapePro[editType.draw];
            if (s) s.sw = sw;
        }
        freeDrawCursor();
        freeShadow();
        if (mode) {
            store.set(`图像编辑.形状属性.${mode}.sc`, stroke || strokeColor);
            store.set(`图像编辑.形状属性.${mode}.sw`, sw || strokeWidth);
        }
    } else {
        console.log(2);
        /* 非画笔非选中 */
        const pro = shapePro[editType.shape] ?? {};
        if (fill) pro.fc = fill;
        if (stroke) pro.sc = stroke;
        if (sw) pro.sw = sw;
        store.set(`图像编辑.形状属性.${editType.shape}`, pro);
    }
}

function newFilterSelect(o, no) {
    const x1 = o.x.toFixed();
    const y1 = o.y.toFixed();
    const x2 = no.x.toFixed();
    const y2 = no.y.toFixed();
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x1 - x2);
    const h = Math.abs(y1 - y2);

    const mainCtx = mainCanvas.getContext("2d") as CanvasRenderingContext2D;
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    const gid = mainCtx.getImageData(x, y, w, h); // 裁剪
    (tmpCanvas.getContext("2d") as CanvasRenderingContext2D).putImageData(
        gid,
        0,
        0,
    );
    const img = new FabricImage(tmpCanvas, {
        left: x,
        top: y,
        lockMovementX: true,
        lockMovementY: true,
        lockRotation: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,
        hoverCursor: "auto",
    });
    fabricCanvas.add(img);
    fabricCanvas.setActiveObject(img);
}

// biome-ignore lint/suspicious/noExplicitAny: 适配库
function applyFilter(i: number, filter: filters.BaseFilter<string, any>) {
    const obj = fabricCanvas.getActiveObject() as FabricImage;
    obj.filters[i] = filter;
    obj.applyFilters();
    fabricCanvas.renderAll();
}
function getFilters() {
    const obj = fabricCanvas.getActiveObject() as FabricImage;
    if (!obj?.filters) return;
    const f = obj.filters;

    const values = Object.values(filtetMap);
    for (const fl of values) {
        const i = values.indexOf(fl);
        if (fl.value) {
            if (f[i]) {
                const name = Object.keys(filtetMap)[i];
                const range = (
                    fl.el?.() ??
                    rangeBar(
                        fl.value.min,
                        fl.value.max,
                        fl.value.step,
                        fl.value.text,
                    )
                )
                    .on("input", () => {
                        // @ts-ignore
                        const filter = fl.fun(range.gv);
                        console.log(range.gv);

                        applyFilter(i, filter);
                    })
                    .sv(Object.values(f[i])[0]);
                filterRangeEl.clear().add(range);
                for (const i of Object.values(drawSideEls.filter)) {
                    i.el.classList.remove("filter_select");
                }
                drawSideEls.filter[name].classList.add("filter_select");
            }
        }
    }
}

// 确保退出其他需要鼠标事件的东西，以免多个东西一起出现
function exitFree() {
    fabricCanvas.isDrawingMode = false;
    fabricCanvas.defaultCursor = "auto";
}
function exitShape() {
    shape = "";
    drawingShape = false;
    fabricCanvas.selection = true;
    fabricCanvas.defaultCursor = "auto";
    polyOP = [];
}
function exitFilter() {
    newFilterSelecting = false;
    fabricCanvas.defaultCursor = "auto";
    willFilter = "";
}

async function fabricCopy() {
    const dx = store.get("图像编辑.复制偏移.x");
    const dy = store.get("图像编辑.复制偏移.y");
    const activeObject = fabricCanvas.getActiveObject();
    if (!activeObject) return;
    const fabricClipboard = await activeObject.clone();
    const clonedObj = await fabricClipboard.clone();
    fabricCanvas.discardActiveObject();
    clonedObj.set({
        left: clonedObj.left + dx,
        top: clonedObj.top + dy,
        evented: true,
    });
    if (clonedObj instanceof ActiveSelection) {
        clonedObj.canvas = fabricCanvas;
        clonedObj.forEachObject((obj) => {
            fabricCanvas.add(obj);
        });
        clonedObj.setCoords();
    } else {
        fabricCanvas.add(clonedObj);
    }
    fabricCanvas.setActiveObject(clonedObj);
    fabricCanvas.requestRenderAll();
    hisPush();
}

// 获取设置

if (store.get("框选.自动框选.图像识别")) {
    // biome-ignore format:
    // biome-ignore lint: 为了部分引入
    var cv = require("@techstark/opencv-js") as typeof import('@techstark/opencv-js');
}

const 字体 = store.get("字体");

const allColorFormat: colorFormat[] = [
    "HEX",
    "RGB",
    "HSL",
    "HSV",
    "HWB",
    "LAB",
    "LCH",
    "OKLAB",
    "OKLCH",
    "CMYK",
];

const 工具栏跟随 = store.get("工具栏跟随");
const 四角坐标 = store.get("显示四角坐标");
const 遮罩颜色 = store.get("框选.颜色.遮罩") || "#0008";
const 取色器默认格式 = store.get("取色器.默认格式");
const 取色器格式位置 = allColorFormat.indexOf(取色器默认格式);
const 取色器显示 = store.get("取色器.显示");
const colorSize = store.get("取色器.大小");
const colorISize = store.get("取色器.像素大小");
const 记忆框选 = store.get("框选.记忆.开启");
const 记忆框选值 = store.get("框选.记忆.rects") as {
    [id: string]: rect;
};
const bSize = store.get("工具栏.按钮大小");

const g光标参考线 = store.get("框选.参考线.光标");
const x选区参考线 = store.get("框选.参考线.选区");
const c参考线颜色 = store.get("框选.颜色");

const 全局缩放 = store.get("全局.缩放") || 1.0;
let ratio = 1;

setSetting();

const tools: 功能列表 = [
    "close",
    "screens",
    "ocr",
    "search",
    "QR",
    "open",
    "ding",
    "record",
    "long",
    "translate",
    "editor",
    "copy",
    "save",
];

const hotkeyTipEl = view().attr({ id: "hotkeys_tip" }).class("bar");

const toolBarEl = frame("tool", {
    _: view().class("bar"),
    close: iconEl("close").attr({ title: "关闭" }),
    screens: view().attr({ title: "屏幕管理" }),
    ocr: selectEl(iconEl("ocr"), t("文字识别"), [
        ...store.get("离线OCR").map((i) => ({ value: i[0], name: i[0] })),
        { value: "baidu", name: t("百度") },
        { value: "youdao", name: t("有道") },
    ]),
    search: selectEl(iconEl("search"), t("以图搜图"), [
        { value: "baidu", name: t("百度") },
        { value: "yandex", name: "Yandex" },
        { value: "google", name: "Google" },
        { value: "ai", name: "AI" },
    ]),
    QR: iconEl("scan").attr({ title: "二维码" }),
    open: iconEl("open").attr({ title: "其他应用打开" }),
    ding: iconEl("ding").attr({ title: "屏幕贴图" }),
    record: selectEl<"normal" | "super">(iconEl("record"), t("录屏"), [
        { name: t("标准录屏"), value: "normal" },
        { name: t("超级录屏"), value: "super" },
    ]),
    long: selectEl<"y" | "xy">(iconEl("long_clip"), t("广截屏"), [
        { name: t("长截屏 y"), value: "y" },
        { name: t("广截屏 xy"), value: "xy" },
    ]),
    translate: selectEl<translateWinType["type"]>(
        iconEl("translate"),
        t("屏幕翻译"),
        [
            { name: t("贴图"), value: "ding" },
            { name: t("自动翻译"), value: "live" },
        ],
    ),
    editor: iconEl("super_edit").attr({ title: "高级图片编辑" }),
    copy: iconEl("copy").attr({ title: "复制" }),
    save: iconEl("save").attr({ title: "保存" }),
});

// 仅仅是为了确保功能的值都存在，在更改功能时能类型检查
const toolList: Record<功能, ElType<HTMLElement>> = {
    close: toolBarEl.els.close,
    screens: toolBarEl.els.screens,
    ocr: toolBarEl.els.ocr,
    search: toolBarEl.els.search,
    QR: toolBarEl.els.QR,
    open: toolBarEl.els.open,
    ding: toolBarEl.els.ding,
    record: toolBarEl.els.record,
    long: toolBarEl.els.long,
    translate: toolBarEl.els.translate,
    editor: toolBarEl.els.editor,
    copy: toolBarEl.els.copy,
    save: toolBarEl.els.save,
};

toolBarEl.el.attr({ id: "tool_bar" });

toolBarEl.els.long.sv(store.get("广截屏.方向"));
toolBarEl.els.long.on("change", () => {
    store.set("广截屏.方向", toolBarEl.els.long.gv);
    longFX = toolBarEl.els.long.gv;
    tool.long();
});

toolBarEl.els.record.sv(store.get("录屏.模式"));
toolBarEl.els.record.on("change", () => {
    store.set("录屏.模式", toolBarEl.els.record.gv);
    tool.record();
});

toolBarEl.els.translate.sv(store.get("屏幕翻译.type"));
toolBarEl.els.translate.on("change", () => {
    store.set("屏幕翻译.type", toolBarEl.els.translate.gv);
    tool.translate();
});

toolBarEl.el.style({
    left: store.get("工具栏.初始位置.left"),
    top: store.get("工具栏.初始位置.top"),
});

const toolsOrder = store.get("工具栏.功能");
for (const g of tools) {
    const id = g;
    const i = toolsOrder.indexOf(id);
    const el = toolBarEl.els[id];
    if (i !== -1) el.style({ order: String(i) });
    else el.style({ display: "none" });
}

const drawBarEl = view().attr({ id: "draw_bar" }).addInto();
const drawBarMainEl = view()
    .attr({ id: "draw_main" })
    .class("bar")
    .addInto(drawBarEl);
const drawBarSideEl = view()
    .attr({ id: "draw_side" })
    .class("bar")
    .addInto(drawBarEl);

const drawColorEl = view();

const drawMainElsx = {
    select: iconEl("rect_select").attr({
        id: "draw_select",
        title: "选择与控制",
    }),
    free: iconEl("free_draw").attr({ id: "draw_free", title: "自由绘画" }),
    shapes: iconEl("shapes").attr({ id: "draw_shapes", title: "形状和文字" }),
    filters: iconEl("filters").attr({ id: "draw_filters", title: "滤镜" }),
    color: view()
        .attr({ id: "draw_color", title: "颜色和大小" })
        .add(drawColorEl),
    position: iconEl("position").attr({
        id: "draw_position",
        title: "层叠高度",
    }),
    操作: iconEl("setting").attr({ id: "draw_操作", title: "操作" }),
} as const;

const drawBarMainElList = Object.values(drawMainElsx);
for (const el of drawBarMainElList) {
    drawBarMainEl.add(el);
}

const drawSideSelect = {
    rect: iconEl("rect_select").attr({ title: "矩形选择" }),
    free: iconEl("free_select").attr({ title: "自由选择" }),
    draw: iconEl("draw_select").attr({ title: "移动" }),
} as const;

const drawSideFree = {
    pencil: iconEl("draw").attr({ title: "画笔" }),
    eraser: iconEl("eraser").attr({ title: "橡皮" }),
    spray: iconEl("spray").attr({ title: "喷刷" }),
} as const;

const drawShadowBlur = view().attr({ id: "shadow_blur" });

const drawSideShapes = {
    line: iconEl("line").attr({ title: "线条" }),
    circle: iconEl("circle").attr({ title: "圆" }),
    rect: iconEl("rect").attr({ title: "矩形" }),
    polyline: iconEl("polyline").attr({ title: "折线" }),
    polygon: iconEl("polygon").attr({ title: "多边形" }),
    text: iconEl("text").attr({ title: "文字" }),
    number: iconEl("number").attr({ title: "序号" }),
    arrow: iconEl("arrow").attr({ title: "箭头" }),
    mask: iconEl("mask").attr({ title: "遮罩" }),
} as const;

const filterRangeEl = view().class("draw_filters_range");

const drawSideFilters = {
    pixelate: iconEl("pixelate").attr({ title: "马赛克" }),
    blur: iconEl("blur").attr({ title: "模糊" }),
    brightness: iconEl("brightness").attr({ title: "亮度" }),
    contrast: iconEl("contrast").attr({ title: "对比度" }),
    saturation: iconEl("saturation").attr({ title: "饱和度" }),
    hue: iconEl("hue").attr({ title: "色调" }),
    gamma: view().attr({ title: "伽马" }),
    noise: view().attr({ title: "噪点" }),
} as const;

const drawSideFiltersMoreGray = {
    gray_average: view().attr({ title: "平均灰度" }),
    gray_lightness: view().attr({ title: "亮度" }),
    gray_luminosity: view().attr({ title: "亮度" }),
};

const drawSideFiltersMore = {
    invert: filterEl("invert", "负片"),
    sepia: filterEl("sepia", "棕褐色"),
    bw: filterEl("bw", "黑白"),
    brownie: filterEl("brownie", "布朗尼"),
    vintage: filterEl("vintage", "老式"),
    koda: filterEl("koda", "柯达彩色胶片"),
    techni: filterEl("techni", "特艺色彩"),
    polaroid: filterEl("polaroid", "宝丽来"),
} as const;

const drawSideFiltersAll = {
    ...drawSideFilters,
    ...drawSideFiltersMoreGray,
    ...drawSideFiltersMore,
} as const;

const drawColorSwitchP = view().attr({ id: "draw_color_switch" });
const drawColorSwitchMark = view()
    .attr({ id: "draw_fill_storke_mark" })
    .addInto(drawColorSwitchP);
drawColorSwitchP.add(image(getImgUrl("fill_storke.svg"), "icon").class("icon"));

const drawColorP = view().attr({ id: "draw_color_p" });
const drawColorColor = view().attr({ id: "draw_color_color" });
const drawStrokeWidth = view().attr({ id: "draw_stroke_width" });

const drawColorSide = drawSideGen2("color_size").add([
    drawColorSwitchP,
    drawColorP,
    drawColorColor,
    drawStrokeWidth,
]);

const drawSidePosition = {
    front: iconEl("position_front").attr({ title: "移动到最顶端" }),
    forwards: iconEl("position_forwards").attr({ title: "向上移动一层" }),
    backwards: iconEl("position_backwards").attr({ title: "向下移动一层" }),
    back: iconEl("position_back").attr({ title: "移动到最底端" }),
} as const;

const drawSide操作 = {
    撤回: iconEl("left")
        .attr({ title: "撤回" })
        .data({ key: showShortKey("Control+Z") }),
    重做: iconEl("right")
        .attr({ title: "重做" })
        .data({ key: showShortKey("Control+Y") }),
    复制: iconEl("copy")
        .attr({ title: "复制" })
        .data({ key: showShortKey("Control+C") }),
    删除: iconEl("clear")
        .attr({ title: "删除" })
        .data({ key: showShortKey("Delete") }),
} as const;

function filterEl(name: string, title: string) {
    return view().attr({ id: `draw_filters_${name}`, title });
}

function drawSideGen(els: Record<string, ElType<HTMLElement>>, pid: string) {
    return Object.entries(els).map(([k, v]) => {
        v.attr({ id: `draw_${pid}_${k}` });
        return v;
    });
}
function drawSideGen2(pid: string) {
    return view()
        .class("draw_items")
        .attr({ id: `draw_${pid}_i` });
}

const drawBarSideElChildren: { w: number; el: ElType<HTMLElement> }[] = [
    {
        w: 1,
        el: drawSideGen2("select").add(drawSideGen(drawSideSelect, "select")),
    },
    {
        w: 1,
        el: drawSideGen2("free").add([
            ...drawSideGen(drawSideFree, "free"),
            drawShadowBlur,
        ]),
    },
    {
        w: 2,
        el: drawSideGen2("shapes").add(drawSideGen(drawSideShapes, "shapes")),
    },
    {
        w: 3,
        el: drawSideGen2("filters").add([
            filterRangeEl,
            ...drawSideGen(drawSideFilters, "filters"),
            ...Object.values(drawSideFiltersMoreGray),
            view()
                .attr({ id: "draw_filters_bs" })
                .add(Object.values(drawSideFiltersMore)),
        ]),
    },
    { w: 1, el: drawColorSide },
    {
        w: 1,
        el: drawSideGen2("position").add(
            drawSideGen(drawSidePosition, "position"),
        ),
    },
    { w: 1, el: drawSideGen2("操作").add(drawSideGen(drawSide操作, "操作")) },
];

drawBarSideEl.add(drawBarSideElChildren.map((i) => i.el));

const whEl = view().attr({ id: "clip_wh" }).class("bar");
const whX0 = input();
const whY0 = input();
const whX1 = input();
const whY1 = input();
const whW = input();
const whH = input();
const whXYStyle = { display: 四角坐标 ? "block" : "none" };
whEl.add([
    view()
        .style(whXYStyle)
        .add([whX0, txt(", "), whY0]),
    view()
        .style(whXYStyle)
        .add([whX1, txt(", "), whY1]),
    view().add([whW, txt(" × "), whH]),
]);

let chPX = 0;
const chCal = txt("0").style({ width: "1ch" });
chCal.addInto();
chPX = chCal.el.offsetWidth;
chCal.remove();

const longTip = frame("long_tip", {
    _: view().attr({ id: "long_tip" }),
    rect: {
        _: view().attr({ id: "long_rect" }),
        finish: view().attr({ id: "long_finish" }),
    },
});

const longPreview = view().style({ position: "fixed" });

hotkeyTipEl.addInto();
toolBarEl.el.addInto();
whEl.addInto();
longTip.el.addInto();
longPreview.addInto();

const centerBarEl = view().attr({ id: "center_bar" }).class("bar").addInto();
const saveType = view()
    .attr({ id: "save_type" })
    .addInto(centerBarEl)
    .add(view().add("保存文件格式为"));
const saveTypeList: (typeof type)[] = ["png", "jpg", "webp", "svg"];
const suffixList = saveTypeList.map((i) =>
    view()
        .data({ value: i })
        .add(i)
        .on("click", () => {
            ipcRenderer.send("clip_main_b", "save", i);
            type = i;
            showSaveBar(false);
        }),
);
view().attr({ id: "suffix" }).add(suffixList).addInto(saveType);

const colorFillEl = colorInput("fill").on("input", () => {
    setFObjectV(colorFillEl.gv, null, null);
});
const colorStrokeEl = colorInput("stroke").on("input", () => {
    setFObjectV(colorStrokeEl.gv, null, null);
});

drawColorP.add([colorFillEl, colorStrokeEl]);

const editor = view().attr({ id: "editor" }).addInto();
const mainCanvas = ele("canvas").attr({ id: "main_photo" }).el;
const clipCanvas = ele("canvas").attr({ id: "clip_photo" }).el;
const drawCanvas = ele("canvas").attr({ id: "draw_photo" }).el;
const drawP = view().attr({ id: "draw_photo_top" }).add(drawCanvas);
editor.add([mainCanvas, clipCanvas, drawP]);

editor.style({ width: `${window.screen.width / 全局缩放}px` });
// 第一次截的一定是桌面,所以可提前定义
mainCanvas.width =
    clipCanvas.width =
    drawCanvas.width =
        window.screen.width * window.devicePixelRatio;
mainCanvas.height =
    clipCanvas.height =
    drawCanvas.height =
        window.screen.height * window.devicePixelRatio;
let zoomW = 0;
type rect = [number, number, number, number];
type point = { x: number; y: number };
let finalRect = [0, 0, mainCanvas.width, mainCanvas.height] as rect;
let freeSelect: point[] = [];
const screenPosition: { [key: string]: { x: number; y: number } } = {};

const toolBar = toolBarEl.el.el;
const drawBar = drawBarEl.el;

let nowScreenId = 0;

let allScreens: ReturnType<typeof screenShots>["screen"];
let windows: ReturnType<typeof screenShots>["window"];

let nowMouseE: MouseEvent;

const editorP = { zoom: 1, x: 0, y: 0 };

let middleB: PointerEvent | null = null;
const middleP = { x: 0, y: 0 };

const edgeRect: {
    x: number;
    y: number;
    width: number;
    height: number;
    type: "system" | "image";
}[] = [];

const tool: Record<功能, () => void> = {
    screens: () => {},
    close: () => closeWin(),
    ocr: () => runOcr(),
    search: () => runSearch(),
    QR: () => runQr(),
    open: () => openApp(),
    record: () => initRecord(),
    long: () => startLong(),
    translate: () => translate(),
    // 钉在屏幕上
    ding: () => runDing(),
    // 复制
    copy: () => runCopy(),
    save: () => runSave(),
    editor: () => {
        getClipPhoto("png").then((c: HTMLCanvasElement) => {
            ipcRenderer.send("clip_main_b", "editor", c.toDataURL());
        });
        tool.close();
    },
};

const drawMainEls: { [key in keyof EditType]: ElType<HTMLElement> } = {
    select: drawMainElsx.select,
    draw: drawMainElsx.free,
    shape: drawMainElsx.shapes,
    filter: drawMainElsx.filters,
};
const drawSideEls: {
    [key in keyof EditType]: { [key1 in EditType[key]]: ElType<HTMLElement> };
} = {
    select: drawSideSelect,
    draw: {
        free: drawSideFree.pencil,
        eraser: drawSideFree.eraser,
        spray: drawSideFree.spray,
    },
    filter: drawSideFiltersAll,
    shape: drawSideShapes,
};

const mouseBarEl = view().attr({ id: "mouse_bar" }).class("bar").addInto();
const mouseBarColor = view().attr({ id: "point_color" }).addInto(mouseBarEl);
const mouseBarXy = view()
    .attr({ id: "clip_xy" })
    .addInto(mouseBarEl)
    .bindSet((v: [number, number], el) => {
        el.innerText = `(${v[0]}, ${v[1]})`;
    });
const mouseBarCopy = view().attr({ id: "clip_copy" }).addInto(mouseBarEl);
const mouseBarCopyI = view().addInto(mouseBarCopy);
const mouseBarCopySize = view().addInto(mouseBarCopyI);
const mouseBarCopyColor = view().addInto(mouseBarCopyI);
let mouseBarCopyColorList: ElType<HTMLElement>[] = [];

type hotkeyScope = "normal" | "c_bar" | "drawing";
const hotkeyScopes: hotkeyScope[] = [];

const drawHotKey = store.get("截屏编辑快捷键");

type hotkeyTip = { name: string; keys: string[] }[];
const hotkeyTipX: { name: string; hotkey: hotkeyTip }[] = [
    {
        name: "画布",
        hotkey: [
            { name: "移动", keys: ["方向键", "wheel"] },
            { name: "缩放", keys: ["Control+wheel"] },
        ],
    },
    {
        name: "框选",
        hotkey: [
            { name: "全选", keys: ["Control+A"] },
            { name: "移动和调节", keys: ["按住+方向键"] },
            { name: "×5", keys: ["+Control+"] },
            { name: "×10", keys: ["+Shift+"] },
            { name: "左上x", keys: [store.get("大小栏快捷键.左上x")] },
            { name: "左上y", keys: [store.get("大小栏快捷键.左上y")] },
            { name: "右下x", keys: [store.get("大小栏快捷键.右下x")] },
            { name: "右下y", keys: [store.get("大小栏快捷键.右下y")] },
            { name: "宽", keys: [store.get("大小栏快捷键.宽")] },
            { name: "高", keys: [store.get("大小栏快捷键.高")] },
        ],
    },
    {
        name: "数值",
        hotkey: [
            { name: "大", keys: ["Up"] },
            { name: "小", keys: ["Down"] },
            { name: "取消更改", keys: ["RightKey"] },
        ],
    },
    {
        name: "取色器",
        hotkey: [
            { name: "展示所有颜色格式", keys: ["RightKey"] },
            { name: "复制颜色", keys: [store.get("其他快捷键.复制颜色")] },
        ],
    },
    { name: "快捷键", hotkey: [{ name: "展示", keys: ["Alt"] }] },
];

let autoDo = store.get("框选后默认操作");

let lastLong = 0;

let uIOhook: typeof import("uiohook-napi")["uIOhook"] | null;
let longClipTime: NodeJS.Timeout;

const longHide = [
    toolBar,
    drawBar,
    mainCanvas,
    clipCanvas,
    drawCanvas,
    drawP.el,
    whEl.el,
    mouseBarEl.el,
];

const longX = {
    img: null as HTMLCanvasElement | null,
    imgXY: { x: 0, y: 0 },
    lastImg: null as HTMLCanvasElement | null,
    lastXY: { x: 0, y: 0 },
};

let longRunning = false;
let longInited = false;

let longFX: typeof toolBarEl.els.long.gv = "y";

let type: setting["保存"]["默认格式"];

/** 矩形还是自由 */
let isRect = true;
let /**是否在绘制新选区*/ selecting = false;
let rightKey = false;
let rectStartE: px_position | null = null;
let /**是否在更改选区*/ moving = false;

type editor_position = { x: number; y: number };
type px_position = { x: number; y: number } & symbol;

let /** 先前坐标，用于框选的生成和调整 */ oldP = {
        x: Number.NaN,
        y: Number.NaN,
    } as editor_position;
let oFinalRect: rect | null = null;
let oPoly: point[] | null = null;
let theColor: [number, number, number, number] | null = null;
let theTextColor: [string, string] = ["", ""];
type colorFormat = setting["取色器"]["默认格式"];
type colorRGBA = [number, number, number, number];
const clipCtx = clipCanvas.getContext("2d") as CanvasRenderingContext2D;
const undoStack = [{ rect: 0, canvas: 0 }];
const rectStack = [[0, 0, mainCanvas.width, mainCanvas.height]] as rect[];
const canvasStack = [{}];
let undoStackI = 0;
let direction:
    | ""
    | "move"
    | "东"
    | "西"
    | "南"
    | "北"
    | "东南"
    | "西南"
    | "东北"
    | "西北";
const autoPhotoSelectRect = store.get("框选.自动框选.图像识别");
let /**鼠标是否移动过，用于自动框选点击判断 */ moved = false;
let /**鼠标是否按住 */ down = false;
let /**是否选好了选区，若手动选好，自动框选提示关闭 */ rectSelect = false;

let rectInRect: rect[] = [];

const mouseBarW =
    Math.max(
        colorSize * colorISize,
        (String(window.innerWidth).length +
            String(window.innerHeight).length +
            2 +
            1) *
            8,
    ) + 4;
const mouseBarH = 4 + colorSize * colorISize + 32 * 2;

// 工具栏跟随
const followBarList = [[0, 0]];
let drawBarPosi: "right" | "left" = "right";
const barGap = 8;

// 移动画画栏
let drawBarMovingXY: [number, number] | null = null;

let nowType: keyof EditType;
const editType: EditType = {
    select: "rect",
    draw: "free",
    filter: "pixelate",
    shape: "rect",
};
const editTypeRecord = store.get("图像编辑.记忆") as EditType;

editType.select = editTypeRecord.select || editType.select;
editType.draw = editTypeRecord.draw || editType.draw;
editType.filter = editTypeRecord.filter || editType.filter;
editType.shape = editTypeRecord.shape || editType.shape;

let willShowITime: NodeJS.Timeout;

let isShowBars = !store.get("工具栏.稍后出现") as boolean;

let mode: EditType["draw"];

type Shape = EditType["shape"] | "";
let shape: Shape = "";

let drawingShape = false;
const shapes: FabricObject[] = [];
const unnormalShapes = ["polyline", "polygon", "number"];
const strokeShapes = ["line", "polyline", "arrow"];
let drawOP: [number, number] = [0, 0]; // 首次按下的点
let polyOP: point[] = []; // 多边形点
let newFilterO: Point | null = null;
let drawNumberN = 1;
declare module "fabric" {
    // to have the properties recognized on the instance and in the constructor
    interface FabricObject {
        canChangeFill?: boolean;
        形状?: Shape;
    }
    // to have the properties typed in the exported object
    interface SerializedObjectProps {
        canChangeFill?: boolean;
        形状?: Shape;
    }
}

/** 规定当前色盘对应的是填充还是边框 */
let colorM: "fill" | "stroke" = "fill";

let newFilterSelecting = false;

const filtetMap: {
    [key in EditType["filter"]]: {
        value?: {
            value: number;
            max: number;
            min?: number;
            step?: number;
            text?: string;
        };
        // biome-ignore lint/suspicious/noExplicitAny: 适配库
        fun: (v?: number) => filters.BaseFilter<string, any>;
        el?: () => ElType<HTMLElement>;
    };
} = {
    pixelate: {
        value: { value: 16, max: 20, text: "px" },
        fun: (v) => new Filters.Pixelate({ blocksize: v }),
    },
    blur: {
        value: { value: 1, max: 5, text: "%", step: 0.1 },
        fun: (v) => new Filters.Blur({ blur: v }),
    },
    brightness: {
        value: { min: -1, value: 0, max: 1, step: 0.01 },
        fun: (v) => new Filters.Brightness({ brightness: v }),
    },
    contrast: {
        value: { min: -1, value: 0, max: 1, step: 0.01 },
        fun: (v) => new Filters.Contrast({ contrast: v }),
    },
    saturation: {
        value: { min: -1, value: 0, max: 1, step: 0.01 },
        fun: (v) => new Filters.Saturation({ saturation: v }),
    },
    hue: {
        value: { min: -1, value: 0, max: 1, step: 0.01 },
        fun: (v) => new Filters.HueRotation({ rotation: v }),
    },
    noise: {
        value: { value: 0, max: 1000 },
        fun: (v) => new Filters.Noise({ value: v }),
    },
    invert: { fun: () => new Filters.Invert() },
    sepia: { fun: () => new Filters.Sepia() },
    bw: { fun: () => new Filters.BlackWhite() },
    brownie: { fun: () => new Filters.Brownie() },
    vintage: { fun: () => new Filters.Vintage() },
    koda: { fun: () => new Filters.Kodachrome() },
    techni: { fun: () => new Filters.Technicolor() },
    polaroid: { fun: () => new Filters.Polaroid() },
    gray_average: {
        fun: () =>
            new Filters.Grayscale({
                mode: "average",
            }),
    },
    gray_lightness: {
        fun: () =>
            new Filters.Grayscale({
                mode: "lightness",
            }),
    },
    gray_luminosity: {
        fun: () =>
            new Filters.Grayscale({
                mode: "luminosity",
            }),
    },
    gamma: {
        fun: (v) =>
            new Filters.Gamma({
                gamma: v as unknown as [number, number, number],
            }),
        // @ts-ignore
        value: { value: [1, 1, 1] },
        el: gammaEl,
    },
};

let willFilter = "";

// ------

document.body.style.opacity = "0";

ipcRenderer.on(
    "reflash",
    (
        _a,
        _displays: Electron.Display[],
        imgBuffer: Buffer,
        mainid: number,
        act: 功能,
    ) => {
        const wx = screenShots(_displays, imgBuffer); // 只是截屏 也可能是小图片
        allScreens = wx.screen;
        const mainId = mainid;
        const i = getNowScreen(mainId);
        windows = wx.window.map((w) => {
            w.rect.x -= i.bounds?.x ?? 0;
            w.rect.y -= i.bounds?.y ?? 0;
            return w;
        });
        console.log(allScreens, windows);
        setScreen(i);
        const nowScreen =
            _displays.find((i) => i.id === mainId) || _displays[0]; // 非截屏，是屏幕
        if (
            i.size.width < nowScreen.size.width ||
            i.size.height < nowScreen.size.height
        ) {
            const x =
                (nowScreen.size.width * window.devicePixelRatio) / 2 -
                i.size.width / 2;
            const y =
                (nowScreen.size.height * window.devicePixelRatio) / 2 -
                i.size.height / 2;
            setEditorP(1 / (i.scaleFactor || devicePixelRatio), x, y);
        } else setEditorP(1 / i.scaleFactor, 0, 0);
        zoomW = i.size.width;
        ratio = i.scaleFactor;
        document.body.style.opacity = "";

        screenPosition[i.id] = { x: i.bounds.x, y: i.bounds.y };

        ipcRenderer.send("clip_main_b", "window-show");
        const screensEl = toolList.screens;
        if (allScreens.length > 1) {
            let minX = 0;
            let maxX = 0;
            let minY = 0;
            let maxY = 0;
            for (const i of allScreens) {
                const right = i.bounds.x + i.bounds.width;
                const bottom = i.bounds.y + i.bounds.height;
                maxX = Math.max(maxX, right);
                maxY = Math.max(maxY, bottom);
                minX = Math.min(minX, i.bounds.x);
                minY = Math.min(minY, i.bounds.y);
            }
            const tWidth = maxX - minX;
            const tHeight = maxY - minY;
            const el = view();
            for (const i of allScreens) {
                const x = (i.bounds.x - minX) / tWidth;
                const y = (i.bounds.y - minY) / tHeight;
                const width = i.bounds.width / tWidth;
                const height = i.bounds.height / tHeight;
                const div = view().style({
                    width: `${width * 100}%`,
                    height: `${height * 100}%`,
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                });
                if (i.id === nowScreenId) {
                    div.el.classList.add("now_screen");
                }
                el.add(div);
                div.on("click", () => {
                    el.query(".now_screen")?.el.classList.remove("now_screen");
                    div.class("now_screen");
                    setScreen(i);
                });
            }
            screensEl.clear().add(el);
        } else {
            screensEl.el.style.display = "none";
        }

        setDefaultAction(act);

        if (autoPhotoSelectRect) {
            setTimeout(() => {
                edge();
            }, 0);
        }

        getWin();

        drawClipRect();
        setTimeout(() => {
            whBar(finalRect);
        }, 0);
        rightKey = false;
        changeRightBar(false);
    },
);

ipcRenderer.on("long_e", stopLong);

document.onwheel = (e) => {
    if (
        !editor.el.contains(e.target as HTMLElement) &&
        e.target !== document.body
    )
        return;
    if (longRunning) return;

    document.body.classList.add("editor_bg");

    if ((nowType === "draw" || nowType === "shape") && !e.ctrlKey) {
        let v = strokeWidthEl.gv;
        v += e.deltaY / 50;
        v = Math.max(1, v);
        strokeWidthF.set(v);
        return;
    }

    if (e.ctrlKey) {
        const zz = 1 + Math.abs(e.deltaY) / 300;
        const z = e.deltaY > 0 ? zoomW / zz : zoomW * zz;
        zoomW = z;
        const ozoom = editorP.zoom;
        const nzoom = z / mainCanvas.width;
        const dx = nowMouseE.clientX - editorP.x * ozoom;
        const dy = nowMouseE.clientY - editorP.y * ozoom;
        const x = nowMouseE.clientX - dx * (nzoom / ozoom);
        const y = nowMouseE.clientY - dy * (nzoom / ozoom);
        setEditorP(nzoom, x / nzoom, y / nzoom);
    } else {
        let dx = 0;
        let dy = 0;
        if (e.shiftKey && !e.deltaX) {
            dx = -e.deltaY;
        } else {
            dx = -e.deltaX;
            dy = -e.deltaY;
        }
        setEditorP(
            editorP.zoom,
            editorP.x + dx / editorP.zoom,
            editorP.y + dy / editorP.zoom,
        );
    }
};

document.onkeyup = (e) => {
    if (e.key === "0") {
        if (e.ctrlKey) {
            setEditorP(1 / window.devicePixelRatio, 0, 0);
            zoomW = mainCanvas.width;
        }
    }
};

document.addEventListener("pointerdown", (e) => {
    if (e.button === 1) {
        middleB = e;
        middleP.x = editorP.x;
        middleP.y = editorP.y;
        document.body.classList.add("editor_bg");
    }
});
document.addEventListener("pointermove", (e) => {
    if (middleB) {
        const dx = e.clientX - middleB.clientX;
        const dy = e.clientY - middleB.clientY;
        setEditorP(
            editorP.zoom,
            middleP.x + dx / editorP.zoom,
            middleP.y + dy / editorP.zoom,
        );
    }
});
document.addEventListener("pointerup", (_e) => {
    middleB = null;
});

// 工具栏按钮
toolBar.onmouseup = (e) => {
    const el = <HTMLElement>e.target;
    if (el.parentElement !== toolBar) return;
    if (e.button === 0) {
        tool[el.id.replace("tool_", "")]();
    }
    // 中键取消抬起操作
    if (e.button === 1) {
        el.style.backgroundColor = "";
        autoDo = "no";
    }
};

hotkeys.filter = (event) => {
    const tagName = (<HTMLElement>event.target).tagName;
    const v = !(
        (<HTMLElement>event.target).isContentEditable ||
        tagName === "INPUT" ||
        tagName === "SELECT" ||
        tagName === "TEXTAREA"
    );
    return v;
};

toHotkeyScope("normal");
for (const k of tools) {
    let key = store.get(`工具快捷键.${k}`) as string;
    if (["esc", "escape"].includes(key.toLowerCase()))
        hotkeys(key, "normal", tool[k]);
    else if (key.toLowerCase() === "enter") hotkeys(key, "normal", tool[k]);
    else hotkeys(key, "all", tool[k]);
    key = key
        .split("+")
        .map((k) => jsKeyCodeDisplay(ele2jsKeyCode(k)).primary)
        .join("");
    if (k === "copy") {
        key += " 双击";
    }
    toolBarEl.els[k].data({ key: key.trim() });
}
for (const i in drawHotKey) {
    const mainKey = i as keyof EditType;
    drawMainEls[mainKey].data({ key: showShortKey(drawHotKey[mainKey].键) });
    hotkeys(drawHotKey[mainKey].键, () => {
        setEditType(mainKey, editType[mainKey]);
    });
    for (const j in drawHotKey[mainKey].副) {
        drawSideEls[mainKey][j].data({
            key: showShortKey(drawHotKey[mainKey].副[j]),
        });
        hotkeys(drawHotKey[mainKey].副[j], () => {
            setEditType(mainKey, j as EditType[keyof EditType]);
        });
    }
}

function showShortKey(k: string) {
    return k
        .split("+")
        .map((k) => jsKeyCodeDisplay(ele2jsKeyCode(k)).primary)
        .join("");
}

// alt显示快捷键
let altT: number;
document.addEventListener("keydown", (e) => {
    if (e.key === "Alt" && !longRunning) {
        altT = window.setTimeout(() => {
            document.documentElement.style.setProperty(
                "--hotkey-show",
                "block",
            );
        }, 400);
    }
});
document.addEventListener("keyup", (e) => {
    if (e.key === "Alt") {
        clearTimeout(altT);
        document.documentElement.style.setProperty("--hotkey-show", "none");
    }
});

for (const m of hotkeyTipX) {
    hotkeyTipEl.add(p(m.name));
    for (const k of m.hotkey) {
        const x = view().add(txt(k.name));
        for (let s of k.keys) {
            s = s
                .split("+")
                .map((k) => jsKeyCodeDisplay(ele2jsKeyCode(k)).primary)
                .join("+");
            x.add(txt(s));
        }
        hotkeyTipEl.add(x);
    }
}

setDefaultAction(autoDo);

// OCR
const ocr引擎 = toolBarEl.els.ocr;
ocr引擎.sv(store.get("OCR.类型"));
ocr引擎.on("change", () => {
    store.set("OCR.类型", ocr引擎.gv);
    tool.ocr();
});

// 以图搜图
const 识图引擎 = toolBarEl.els.search;
// @ts-ignore
识图引擎.sv(store.get("以图搜图.引擎"));
识图引擎.on("change", () => {
    store.set("以图搜图.引擎", 识图引擎.gv);
    tool.search();
});

trackLocation();

const finishLongB = longTip.els.finish.el;

const lr = longTip.els.rect;

ipcRenderer.on("clip", (_event, type, mouse) => {
    if (type === "mouse") {
        const x = mouse.x;
        const y = mouse.y;
        const el = document.elementsFromPoint(x, y);
        if (longRunning)
            ipcRenderer.send(
                "clip_main_b",
                "ignore_mouse",
                !el.includes(finishLongB),
            );
        else ipcRenderer.send("clip_main_b", "ignore_mouse", false);
    }
});

ipcRenderer.on("save_path", (_event, message) => {
    console.log(message);
    save(message);
});

trackPoint(pack(toolBar), {
    start: (e) => {
        if (e.ctrlKey) {
            toolBar.style.transition = "none";
            return {
                x: toolBar.offsetLeft,
                y: toolBar.offsetTop,
            };
        }
        return null;
    },
    ing: (p) => {
        toolBar.style.left = `${p.x}px`;
        toolBar.style.top = `${p.y}px`;
        trackLocation();
    },
    end: () => {
        toolBar.style.transition = "";
    },
});

setTitle(t("截屏"));

// 键盘控制光标
document.body.onkeydown = (e) => {
    const tagName = (<HTMLElement>e.target).tagName;
    if (
        (<HTMLElement>e.target).isContentEditable ||
        tagName === "INPUT" ||
        tagName === "SELECT" ||
        tagName === "TEXTAREA"
    )
        return;
    if (longRunning) return;
    if (hotkeys.getScope() === "c_bar") return;
    const o = {
        ArrowUp: "up",
        ArrowRight: "right",
        ArrowDown: "down",
        ArrowLeft: "left",
    };
    if (nowType === "draw" || nowType === "shape") {
        if (!o[e.key]) return;
        let v = strokeWidthEl.gv;
        v += e.key === "ArrowUp" || e.key === "ArrowRight" ? 1 : -1;
        v = Math.max(1, v);
        strokeWidthF.set(v);
        return;
    }
    let v = 1;
    if (e.ctrlKey) v = v * 5;
    if (e.shiftKey) v = v * 10;
    if (o[e.key]) {
        if (direction) {
            const op = nowMouseE;
            let x = op.offsetX;
            let y = op.offsetY;
            const d = v;
            switch (o[e.key]) {
                case "up":
                    y = op.offsetY - d;
                    break;
                case "down":
                    y = op.offsetY + d;
                    break;
                case "right":
                    x = op.offsetX + d;
                    break;
                case "left":
                    x = op.offsetX - d;
                    break;
            }
            if (isRect) {
                moveRect(finalRect, { x: op.offsetX, y: op.offsetY }, { x, y });
            } else {
                movePoly(
                    freeSelect,
                    { x: op.offsetX, y: op.offsetY },
                    { x, y },
                );
            }
            cleanCanvas();
            drawClip();
            ckx(nowMouseE);
        } else {
            let x = editorP.x;
            let y = editorP.y;
            const d = v / editorP.zoom;
            switch (o[e.key]) {
                case "up":
                    y = editorP.y + d;
                    break;
                case "down":
                    y = editorP.y - d;
                    break;
                case "right":
                    x = editorP.x - d;
                    break;
                case "left":
                    x = editorP.x + d;
                    break;
            }
            setEditorP(editorP.zoom, x, y);
            document.body.classList.add("editor_bg");
            mouseBar(finalRect, nowMouseE);
        }
    }
};

clipCanvas.onmousedown = (e) => {
    let inRect = false;
    if (isRect) {
        inRect = isInClipRect({ x: e.offsetX, y: e.offsetY });
    } else {
        inRect = isPointInPolygon({ x: e.offsetX, y: e.offsetY });
    }
    if (e.button === 0) {
        clipStart(e, inRect);
    }
    if (e.button === 2) {
        pickColor(e);
    }
    toolBar.style.pointerEvents =
        drawBar.style.pointerEvents =
        whEl.el.style.pointerEvents =
            "none";

    down = true;
};

document.onmouseup = (e) => {
    if (e.button === 0) {
        if (selecting) {
            clipEnd(e);
            // 抬起鼠标后工具栏跟随
            followBar({ x: e.clientX, y: e.clientY });
            // 框选后默认操作
            if (autoDo !== "no" && e.button === 0) {
                tool[autoDo]();
            }
            isShowBars = true;
            showBars(isShowBars);
        }
        if (moving) {
            moving = false;
            oFinalRect = null;
            if (e.button === 0) followBar({ x: e.clientX, y: e.clientY });
            hisPush();
        }
    }
    toolBar.style.pointerEvents =
        drawBar.style.pointerEvents =
        whEl.el.style.pointerEvents =
            "auto";

    down = false;
    moved = false;
};

hotkeys("s", () => {
    // 重新启用自动框选提示
    rectSelect = false;
    finalRect = [0, 0, clipCanvas.width, clipCanvas.height];
    drawClipRect();
});

const whHotKeyMap = {
    左上x: whX0,
    左上y: whY0,
    右下x: whX1,
    右下y: whY1,
    宽: whW,
    高: whH,
};

const whHotkey = store.get("大小栏快捷键");
for (const i in whHotkey) {
    if (whHotkey[i])
        hotkeys(whHotkey[i], { keyup: true, keydown: false }, () => {
            whHotKeyMap[i].focus();
        });
}

const whL = [whX0, whY0, whX1, whY1, whW, whH];

for (const xel of whL) {
    const el = xel.el;
    const kd = (e: KeyboardEvent) => {
        if (e.key === "ArrowRight" && el.value.length === el.selectionEnd) {
            e.preventDefault();
            const next = whL[whL.indexOf(xel) + 1]?.el;
            if (next) {
                next.selectionStart = next.selectionEnd = 0;
                next.focus();
            }
        }
        if (e.key === "ArrowLeft" && 0 === el.selectionStart) {
            e.preventDefault();
            const last = whL[whL.indexOf(xel) - 1]?.el;
            if (last) {
                last.selectionStart = last.selectionEnd = last.value.length;
                last.focus();
            }
        }
        let v = 1;
        if (e.ctrlKey) v = v * 5;
        if (e.shiftKey) v = v * 10;
        if (e.key === "ArrowUp" && !Number.isNaN(Number(el.value))) {
            e.preventDefault();
            el.value = String(Number(el.value) + 1 * v);
            changeWH(xel);
        }
        if (e.key === "ArrowDown" && !Number.isNaN(Number(el.value))) {
            e.preventDefault();
            el.value = String(Number(el.value) - 1 * v);
            changeWH(xel);
        }
        if (e.key === "Escape") {
            el.blur();
        }
    };

    xel.on("input", checkWhBarWidth)
        .on("change", () => changeWH(xel))
        .on("keydown", kd);
}

// 快捷键全屏选择
hotkeys("ctrl+a, command+a", () => {
    finalRect = [0, 0, mainCanvas.width, mainCanvas.height];
    hisPush();
    clipCanvas.style.cursor = "crosshair";
    direction = "";
    drawClipRect();
});

// 生成取色器
if (!取色器显示) mouseBarColor.style({ display: "none" });

const pointColorCanvasBg = document.createElement("canvas");
pointColorCanvasBg.style.opacity = "0.5";
pointColorCanvasBg.width = pointColorCanvasBg.height = colorSize;
mouseBarColor.add(pointColorCanvasBg);
const pointColorCanvasBgCtx = pointColorCanvasBg.getContext(
    "2d",
) as CanvasRenderingContext2D;
const pointColorCanvas = document.createElement("canvas");
pointColorCanvas.width = pointColorCanvas.height = colorSize;
mouseBarColor.add(pointColorCanvas);
const pointColorCanvasCtx = pointColorCanvas.getContext("2d", {
    willReadFrequently: true,
}) as CanvasRenderingContext2D;
const pointCenter = document.createElement("div");
mouseBarColor.add(pointCenter);
pointCenter.style.left = `${((colorSize - 1) / 2) * colorISize}px`;
pointCenter.style.top = `${((colorSize - 1) / 2) * colorISize}px`;

if (!store.get("鼠标跟随栏.显示")) mouseBarEl.style({ display: "none" });
// 鼠标跟随栏
const mainCanvasContext = mainCanvas.getContext(
    "2d",
) as CanvasRenderingContext2D;

// 复制坐标
mouseBarXy.on("click", () => {
    copy(mouseBarXy);
});

changeRightBar(false);

hotkeys(store.get("其他快捷键.复制颜色"), () => {
    copy(getColorFormatEl());
});

clipCanvas.ondblclick = () => {
    tool.copy();
};

document.onmousemove = (e) => {
    nowMouseE = e;

    requestAnimationFrame(() => {
        renderClip(e);
        if (!rightKey) {
            // 鼠标跟随栏
            mouseBar(finalRect, e);

            const d = 16;
            const x = e.clientX + d;
            const y = e.clientY + d;
            const w = mouseBarW;
            const h = mouseBarH;
            const sw = window.innerWidth;
            const sh = window.innerHeight;

            mouseBarEl.style({
                left: `${Math.min(x, sw - w - d)}px`,
                top: `${Math.min(y, sh - h - d)}px`,
            });

            const isDrawBar = drawBar.contains(e.target as HTMLElement);
            const isToolBar = toolBar.contains(e.target as HTMLElement);
            mouseBarEl.el.classList.toggle(
                "mouse_bar_hide",
                isDrawBar || isToolBar,
            );

            // 画板栏移动
            if (drawBarMovingXY) {
                drawBar.style.left = `${e.clientX - drawBarMovingXY[0]}px`;
                drawBar.style.top = `${e.clientY - drawBarMovingXY[1]}px`;
            }
        }
    });
};

drawBar.addEventListener("mousedown", (e) => {
    if (e.button !== 0) {
        drawBarMovingXY = [
            e.clientX - drawBar.offsetLeft,
            e.clientY - drawBar.offsetTop,
        ];
        drawBar.style.transition = "0s";
    }
});
drawBar.addEventListener("mouseup", (e) => {
    if (e.button !== 0) {
        drawBarMovingXY = null;
        drawBar.style.transition = "";
    }
});

drawSideSelect.rect.on("click", () => {
    setEditType("select", "rect");
});
drawSideSelect.free.on("click", () => {
    setEditType("select", "free");
});
drawSideSelect.draw.on("click", () => {
    setEditType("select", "draw");
});

hotkeys("ctrl+z", () => {
    undo(true);
});
hotkeys("ctrl+y", () => {
    undo(false);
});

drawSide操作.撤回.on("click", () => {
    undo(true);
});
drawSide操作.重做.on("click", () => {
    undo(false);
});
drawSide操作.复制.on("click", () => {
    fabricCopy();
});
drawSide操作.删除.on("click", () => {
    fabricDelete();
});

const Filters = filters;

const fabricCanvas = new Canvas("draw_photo");

hisPush();

const fillColor = store.get("图像编辑.默认属性.填充颜色");
const strokeColor = store.get("图像编辑.默认属性.边框颜色");
const strokeWidth = store.get("图像编辑.默认属性.边框宽度");
const freeColor = store.get("图像编辑.默认属性.画笔颜色");
const freeWidth = store.get("图像编辑.默认属性.画笔粗细");

const shapePro: setting["图像编辑"]["形状属性"] = {};

// 编辑栏
const drawMainBar = drawBarMainEl.el;
const drawSideBar = drawBarSideEl.el;
showSideBar(false);

for (const [index, e] of drawBarMainElList.entries()) {
    const Type: (keyof EditType)[] = ["select", "draw", "shape", "filter"];
    e.on("mouseenter", () => {
        // 用于防误触，防经过时误切换
        willShowITime = setTimeout(() => {
            showSideBarItem(index);
        }, 100);
    });
    e.on("pointerleave", () => {
        clearTimeout(willShowITime);
        setTimeout(() => {
            if (!isInDrawBar()) {
                showSideBar(false);
            }
        }, 100);
    });
    e.on("click", () => {
        setEditType(Type[index], editType[Type[index]]);
    });
}

for (const el of drawBarSideElChildren) {
    el.el.on("pointerleave", () => {
        setTimeout(() => {
            if (!isInDrawBar()) showSideBar(false);
        }, 100);
    });
}

showBars(isShowBars);

hotkeys(store.get("其他快捷键.隐藏或显示栏"), () => {
    isShowBars = !isShowBars;
    showBars(isShowBars);
});

// 笔
drawSideFree.pencil.on("click", () => setEditType("draw", "free"));
// 橡皮
drawSideFree.eraser.on("click", () => setEditType("draw", "eraser"));
// 刷
drawSideFree.spray.on("click", () => setEditType("draw", "spray"));

// 阴影
const shadowBlurEl = rangeBar(0, 20, 1, "px").on("input", freeShadow);
drawShadowBlur.add(shadowBlurEl);

// 几何
for (const [k, el] of Object.entries(drawSideShapes)) {
    el.on("click", () => {
        setEditType("shape", k as EditType["shape"]);
    });
}
// 层叠位置
drawSidePosition.front.on("click", () => {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) fabricCanvas.bringObjectToFront(activeObject);
});
drawSidePosition.forwards.on("click", () => {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) fabricCanvas.bringObjectForward(activeObject);
});
drawSidePosition.backwards.on("click", () => {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) fabricCanvas.sendObjectBackwards(activeObject);
});
drawSidePosition.back.on("click", () => {
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) fabricCanvas.sendObjectToBack(activeObject);
});

// 删除快捷键
hotkeys("delete", fabricDelete);

fabricCanvas.on("mouse:down", (options) => {
    // 非常规状态下点击
    if (shape !== "" && !options.target) {
        drawingShape = true;
        fabricCanvas.selection = false;
        const x = options.viewportPoint.x;
        const y = options.viewportPoint.y;
        // 折线与多边形要多次点击，在poly_o_p存储点
        if (!unnormalShapes.includes(shape)) {
            drawOP = [x, y];
            draw(shape, "start", drawOP[0], drawOP[1], x, y);
        } else {
            // 定义最后一个点,双击,点重复,结束
            const polyOPL = polyOP.at(-1);
            if (!(x === polyOPL?.x && y === polyOPL?.y)) {
                polyOP.push({ x: x, y: y });
                if (shape === "number") {
                    drawNumber();
                } else {
                    drawPoly(shape);
                }
            } else {
                hisPush();
                polyOP = [];
                drawNumberN = 1;
            }
        }
    }

    if (newFilterSelecting) {
        newFilterO = fabricCanvas.getViewportPoint(options.e);
    }
});
fabricCanvas.on("mouse:move", (options) => {
    if (drawingShape) {
        if (!unnormalShapes.includes(shape)) {
            if (shape !== "")
                draw(
                    shape,
                    "move",
                    drawOP[0],
                    drawOP[1],
                    options.viewportPoint.x,
                    options.viewportPoint.y,
                );
        }
    }
});
fabricCanvas.on("mouse:up", (options) => {
    if (!unnormalShapes.includes(shape)) {
        drawingShape = false;
        if (shape !== "") {
            const obj = shapes.at(-1);
            if (obj) fabricCanvas.setActiveObject(obj);
            hisPush();
        }
    }

    getFObjectV();
    getFilters();

    if (newFilterSelecting) {
        newFilterSelect(newFilterO, fabricCanvas.getPointer(options.e));
        getFilters();
        hisPush();

        if (willFilter) {
            const i = filtetMap[willFilter] as (typeof filtetMap)["pixelate"];
            const index = Object.keys(filtetMap).indexOf(willFilter);
            const filter = i.fun(i.value?.value ?? 1);
            applyFilter(index, filter);
            getFilters();
        }
    }

    if (fabricCanvas.isDrawingMode) {
        hisPush();
    }
});

class mask extends Rect {
    static type = "mask";
    declare rect: { x: number; y: number; w: number; h: number };
    constructor(
        options?: Partial<
            RectProps & { rect: { x: number; y: number; w: number; h: number } }
        >,
    ) {
        super();
        this.setOptions(options);
    }
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        ctx.fillStyle = this.fill?.toString() || "";
        ctx.fillRect(0, 0, this.width, this.height);

        const r = this.rect;
        ctx.clearRect(r.x, r.y, r.w, r.h);

        ctx.restore();
    }
}

classRegistry.setClass(mask);
classRegistry.setSVGClass(mask);

class xnumber extends Circle {
    static type = "number";
    declare fontSize: number;
    declare text: string;
    constructor(
        options?: Partial<CircleProps & { fontSize: number; text: string }>,
    ) {
        super();
        this.setOptions(options);
    }
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.translate(this.left, this.top);
        this._render(ctx);

        const x = 0;
        const y = 5;

        // 绘制数字
        ctx.fillStyle = this.stroke?.toString() || "#000";
        ctx.font = `${this.fontSize}px ${字体.等宽字体 || "Arial"}`;
        ctx.textAlign = "center";
        ctx.fillText(String(this.text), x, y);
        ctx.restore();
    }
}

classRegistry.setClass(xnumber);
classRegistry.setSVGClass(xnumber);

const arrowConfig = store.get("图像编辑.arrow");

class arrow extends Line {
    static type = "arrow";
    render(ctx: CanvasRenderingContext2D): void {
        ctx.save();

        const { x1, x2, y1, y2 } = this;

        const angle = Math.atan2(y2 - y1, x2 - x1) + Math.PI / 2;
        const w = arrowConfig.w;
        const h = arrowConfig.h;

        const [x3, y3] = rotate(-w / 2, h, angle);
        const [x4, y4] = rotate(w / 2, h, angle);

        const x0 = (x2 - x1) / 2;
        const y0 = (y2 - y1) / 2;

        ctx.translate(x1 + x0, y1 + y0);

        this._render(ctx);

        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + x3, y0 + y3);
        if (arrowConfig.type === "stroke") ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + x4, y0 + y4);
        ctx.closePath();

        ctx.fillStyle = this.stroke?.toString() || "";
        ctx.lineWidth = this.strokeWidth || 1;
        ctx.strokeStyle = this.stroke?.toString() || "";
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

// 颜色选择

setDrawMode(colorM);
drawColorSwitchP.on("click", () => {
    setDrawMode(colorM === "fill" ? "stroke" : "fill");
});

ableChangeColor();

colorBar();

const strokeWidthEl = rangeBar(0, 25, 1, "px").on("input", () => {
    setFObjectV(null, null, strokeWidthEl.gv);
});

drawStrokeWidth.add(strokeWidthEl);

const strokeWidthF = {
    set: (v: number) => {
        strokeWidthEl.sv(v);
        setFObjectV(null, null, Math.floor(v));
    },
};

// 滤镜

for (const id in filtetMap) {
    drawSideFiltersAll[id].on("click", () => {
        // @ts-ignore
        setEditType("filter", id);
    });
}

// 伽马

function gammaEl() {
    const g = new Array(3)
        .fill(0)
        .map(() =>
            rangeBar(0.01, 2.2, 0.01).on("input", () =>
                p.el.dispatchEvent(new Event("input")),
            ),
        );
    const p = view()
        .add(g)
        .bindGet(() => g.map((el) => el.gv))
        .bindSet((v: [number, number, number]) => {
            g[0].sv(v[0]);
            g[1].sv(v[1]);
            g[2].sv(v[2]);
        });
    return p;
}

hotkeys("esc", "drawing", () => {
    setEditType("select", "draw");
});

hotkeys("Ctrl+v", () => {
    fabricCopy();
});

setEditType("select", editType.select);
