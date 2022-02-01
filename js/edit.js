let fabric_canvas = new fabric.Canvas("draw_photo");

var stroke_color = "#333";
var fill_color = "#fff";
var stroke_width = 1;
var free_color = "#333";
var free_width = 1;

// 画画栏
document.querySelectorAll("#draw_main > div").forEach((e, index) => {
    if (index == document.querySelectorAll("#draw_main > div").length - 1) return; // 排除move
    document.querySelectorAll("#draw_side > div")[index].style.height = "0";
    e.addEventListener("click", () => {
        if (e.show) {
            e.show = !e.show;
            document.querySelectorAll("#draw_side > div")[index].style.height = "0";
            document.querySelector("#draw_bar").style.width = "60px";
        } else {
            document.querySelector("#draw_bar").style.width = "120px";
            document.querySelectorAll("#draw_main > div").forEach((ei) => {
                ei.show = false;
            });
            e.show = !e.show;
            document.querySelectorAll("#draw_side > div").forEach((ei) => {
                ei.style.height = "0";
            });
            h = 0;
            Array.from(document.querySelectorAll("#draw_side > div")[index].children).forEach((e) => {
                h += e.offsetHeight;
            });
            if (h > 360) {
                h = 360;
            }
            document.querySelectorAll("#draw_side > div")[index].style.height = h + "px";
        }
    });
});

// 笔
document.querySelector("#draw_free_pencil").oninput = () => {
    fabric_canvas.isDrawingMode = document.querySelector("#draw_free_pencil").checked;
    get_f_object_v();
    if (document.querySelector("#draw_free_pencil").checked) {
        document.querySelectorAll("#draw_free_i > lock-b")[1].checked = false;
        document.querySelectorAll("#draw_free_i > lock-b")[2].checked = false;

        fabric_canvas.freeDrawingBrush = new fabric.PencilBrush(fabric_canvas);
        fabric_canvas.freeDrawingBrush.color = free_color;
        fabric_canvas.freeDrawingBrush.width = free_width;
    }
};
// 橡皮
document.querySelector("#draw_free_eraser").oninput = () => {
    fabric_canvas.isDrawingMode = document.querySelector("#draw_free_eraser").checked;
    get_f_object_v();
    if (document.querySelector("#draw_free_eraser").checked) {
        document.querySelectorAll("#draw_free_i > lock-b")[0].checked = false;
        document.querySelectorAll("#draw_free_i > lock-b")[2].checked = false;

        fabric_canvas.freeDrawingBrush = new fabric.EraserBrush(fabric_canvas);
        fabric_canvas.freeDrawingBrush.width = free_width;
    }
};
// 刷
document.querySelector("#draw_free_spray").oninput = () => {
    fabric_canvas.isDrawingMode = document.querySelector("#draw_free_spray").checked;
    get_f_object_v();
    if (document.querySelector("#draw_free_spray").checked) {
        document.querySelectorAll("#draw_free_i > lock-b")[0].checked = false;
        document.querySelectorAll("#draw_free_i > lock-b")[1].checked = false;

        fabric_canvas.freeDrawingBrush = new fabric.SprayBrush(fabric_canvas);
        fabric_canvas.freeDrawingBrush.color = free_color;
        fabric_canvas.freeDrawingBrush.width = free_width;
    }
};

// 几何
var shape = "";
document.getElementById("draw_shapes_i").onclick = (e) => {
    switch (e.target.id) {
        case "draw_shapes_line":
            shape = "line";
            break;
        case "draw_shapes_circle":
            shape = "circle";
            break;
        case "draw_shapes_rect":
            shape = "rect";
            break;
        case "draw_shapes_polyline":
            shape = "polyline";
            break;
        case "draw_shapes_polygon":
            shape = "polygon";
            break;
        case "draw_shapes_text":
            shape = "text";
            break;
    }
    fabric_canvas.defaultCursor = "crosshair";
    fabric_canvas.isDrawingMode = false;
    document.querySelectorAll("#draw_free_i > lock-b")[0].checked = false;
    document.querySelectorAll("#draw_free_i > lock-b")[1].checked = false;
    document.querySelectorAll("#draw_free_i > lock-b")[2].checked = false;
};
// 层叠位置
document.getElementById("draw_position_i").onclick = (e) => {
    switch (e.target.id) {
        case "draw_position_front":
            fabric_canvas.getActiveObject().bringToFront();
            break;
        case "draw_position_forwards":
            fabric_canvas.getActiveObject().bringForward();
            break;
        case "draw_position_backwards":
            fabric_canvas.getActiveObject().sendBackwards();
            break;
        case "draw_position_back":
            fabric_canvas.getActiveObject().sendToBack();
            break;
    }
};

// 删除快捷键
document.onkeydown = (e) => {
    if (e.key == "Delete") {
        fabric_canvas.remove(fabric_canvas.getActiveObject());
        get_f_object_v();
        get_filters();
    }
};

var drawing_shape = false;
var shapes = [];
var draw_o_p = []; // 首次按下的点
var poly_o_p = []; // 多边形点
var new_filter_o = null;

fabric_canvas.on("mouse:down", (options) => {
    // 非常规状态下点击
    if (shape != "") {
        drawing_shape = true;
        fabric_canvas.selection = false;
        // 折线与多边形要多次点击，在poly_o_p存储点
        if (shape != "polyline" && shape != "polygon") {
            draw_o_p = [options.e.offsetX, options.e.offsetY];
            draw(shape, "start", draw_o_p[0], draw_o_p[1], options.e.offsetX, options.e.offsetY);
        } else {
            // 定义最后一个点,双击,点重复,结束
            var poly_o_p_l = poly_o_p[poly_o_p.length - 1];
            if (!(options.e.offsetX == poly_o_p_l?.x && options.e.offsetY == poly_o_p_l?.y)) {
                poly_o_p.push({ x: options.e.offsetX, y: options.e.offsetY });
                draw_poly(shape);
            } else {
                shape = "";
                poly_o_p = [];
                fabric_canvas.defaultCursor = "auto";
            }
        }
    }

    if (new_filter_selecting) {
        new_filter_o = fabric_canvas.getPointer(options.e);
    }
});
fabric_canvas.on("mouse:move", (options) => {
    if (drawing_shape) {
        if (shape != "polyline" && shape != "polygon") {
            draw(shape, "move", draw_o_p[0], draw_o_p[1], options.e.offsetX, options.e.offsetY);
        }
    }
});
fabric_canvas.on("mouse:up", (options) => {
    if (shape != "polyline" && shape != "polygon") {
        drawing_shape = false;
        fabric_canvas.selection = true;
        shape = "";
        fabric_canvas.defaultCursor = "auto";
    }

    get_f_object_v();
    get_filters();

    if (new_filter_selecting) {
        new_filter_select(new_filter_o, fabric_canvas.getPointer(options.e));
        new_filter_selecting = false;
        document.querySelector("#draw_filters_select > lock-b").checked = false;
        fabric_canvas.defaultCursor = "auto";
        get_filters();
    }
});

// 画一般图形
function draw(shape, v, x1, y1, x2, y2) {
    if (v == "move") {
        fabric_canvas.remove(shapes[shapes.length - 1]);
        shapes.splice(shapes.length - 1, 1);
    }
    var [x, y, w, h] = p_xy_to_c_xy(draw_canvas, x1, y1, x2, y2);
    switch (shape) {
        case "line":
            shapes[shapes.length] = new fabric.Line([x, y, x + w, y + h], {
                stroke: stroke_color,
            });
            break;
        case "circle":
            shapes[shapes.length] = new fabric.Circle({
                radius: Math.max(w, h) / 2,
                left: x,
                top: y,
                fill: fill_color,
                stroke: stroke_color,
                strokeWidth: stroke_width,
            });
            break;
        case "rect":
            shapes[shapes.length] = new fabric.Rect({
                left: x,
                top: y,
                width: w,
                height: h,
                fill: fill_color,
                stroke: stroke_color,
                strokeWidth: stroke_width,
            });
            break;
        case "text":
            shapes.push(
                new fabric.IText("点击输入文字", {
                    left: x,
                    top: y,
                })
            );
        default:
            break;
    }
    fabric_canvas.add(shapes[shapes.length - 1]);
}
// 多边形
function draw_poly(shape) {
    if (poly_o_p.length != 1) {
        fabric_canvas.remove(shapes[shapes.length - 1]);
        shapes.splice(shapes.length - 1, 1);
    }
    if (shape == "polyline") {
        shapes.push(
            new fabric.Polyline(poly_o_p, {
                fill: "#0000",
                stroke: stroke_color,
                strokeWidth: stroke_width,
            })
        );
    }
    if (shape == "polygon") {
        shapes.push(
            new fabric.Polygon(poly_o_p, {
                fill: fill_color,
                stroke: stroke_color,
                strokeWidth: stroke_width,
            })
        );
    }
    fabric_canvas.add(shapes[shapes.length - 1]);
}

// 颜色选择
var color_m = "fill";
document.querySelector("#draw_color_fill").onfocus = () => {
    color_m = "fill";
};
document.querySelector("#draw_color_stroke").onfocus = () => {
    color_m = "stroke";
};
// 输入颜色
document.querySelector("#draw_color_fill").oninput = () => {
    change_color({ fill: document.querySelector("#draw_color_fill").innerText }, false);
    var fill_a = Color(document.querySelector("#draw_color_fill").innerText).valpha;
    document.querySelector("#draw_color_alpha > range-b:nth-child(1)").value = Math.round(fill_a * 100);
};
document.querySelector("#draw_color_stroke").oninput = () => {
    change_color({ stroke: document.querySelector("#draw_color_stroke").innerText }, false);
    var stroke_a = Color(document.querySelector("#draw_color_stroke").innerText).valpha;
    document.querySelector("#draw_color_alpha > range-b:nth-child(2)").value = Math.round(stroke_a * 100);
};

// 改变透明度
document.querySelector("#draw_color_alpha > range-b:nth-child(1)").oninput = () => {
    change_alpha(document.querySelector("#draw_color_alpha > range-b:nth-child(1)").value, "fill");
};
document.querySelector("#draw_color_alpha > range-b:nth-child(2)").oninput = () => {
    change_alpha(document.querySelector("#draw_color_alpha > range-b:nth-child(2)").value, "stroke");
};
function change_alpha(v, m) {
    var rgba = Color(document.querySelector(`#draw_color_${m}`).style.backgroundColor)
        .rgb()
        .array();
    rgba[3] = v / 100;
    change_color({ [m]: rgba }, true);
}

// 刷新控件颜色
// m_l={fill:color,stroke:color}
function change_color(m_l, text) {
    for (i in m_l) {
        var color_m = i,
            color = m_l[i];
        if (color === null) color = "#0000";
        if (color_m == "fill") {
            color_l = Color(color).rgb().array();
            document.querySelector("#draw_color_fill").style.backgroundColor = document.querySelector(
                "#draw_color > div"
            ).style.backgroundColor = Color(color_l).string();
            set_f_object_v(Color(color_l).string(), null, null);
        }
        if (color_m == "stroke") {
            color_l = Color(color).rgb().array();
            document.querySelector("#draw_color_stroke").style.backgroundColor = document.querySelector(
                "#draw_color > div"
            ).style.borderColor = Color(color_l).string();
            set_f_object_v(null, Color(color_l).string(), null);
        }
        var t_color = Color(document.querySelector(`#draw_color_${color_m}`).style.backgroundColor);
        if (t_color.rgb().array()[3] >= 0.5 || t_color.rgb().array()[3] === undefined) {
            if (t_color.isLight()) {
                document.querySelector(`#draw_color_${color_m}`).style.color = "#000";
            } else {
                document.querySelector(`#draw_color_${color_m}`).style.color = "#fff";
            }
        } else {
            document.querySelector(`#draw_color_${color_m}`).style.color = "#000";
        }

        if (text) {
            document.querySelector(`#draw_color_${color_m}`).innerText = Color(color).hexa();
        }
    }
}

// 色盘
function color_bar() {
    // 主盘
    var color_list = ["hsl(0, 0%, 100%)"];
    var base_color = Color("hsl(0, 100%, 50%)");
    for (i = 0; i < 360; i += 15) {
        color_list.push(base_color.rotate(i).string());
    }
    var t = "";
    for (x in color_list) {
        t += `<div class="color_i" style="background-color: ${color_list[x]}" title="右键更多"></div>`;
    }
    show_color();
    // 下一层级
    function next_color(h) {
        next_color_list = [];
        if (h == "hsl(0, 0%, 100%)") {
            for (i = 255; i >= 0; i = (i - 10.625).toFixed(3)) {
                next_color_list.push(`rgb(${i}, ${i}, ${i})`);
            }
        } else {
            h = h.match(/hsl\(([0-9]*)/)[1] - 0;
            for (i = 90; i > 0; i -= 20) {
                for (j = 100; j > 0; j -= 20) {
                    next_color_list.push(`hsl(${h}, ${j}%, ${i}%)`);
                }
            }
        }
        var tt = "";
        for (n in next_color_list) {
            tt += `<div class="color_i" style="background-color: ${next_color_list[n]}" title="右键返回"></div>`;
        }
        document.querySelector("#draw_color_color").innerHTML = tt;
        document.querySelectorAll("#draw_color_color > div").forEach((el, index) => {
            el.onmousedown = (event) => {
                if (event.button == 0) {
                    c_color(el);
                } else {
                    // 回到主盘
                    show_color();
                }
            };
        });
    }
    function show_color() {
        document.querySelector("#draw_color_color").innerHTML = t;
        document.querySelectorAll("#draw_color_color > div").forEach((el, index) => {
            el.onmousedown = (event) => {
                if (event.button == 0) {
                    c_color(el);
                } else {
                    // 下一层级
                    next_color(color_list[index]);
                }
            };
        });
    }
    // 事件
    function c_color(el) {
        change_color({ [color_m]: el.style.backgroundColor }, true);
        if (color_m == "fill") document.querySelector("#draw_color_alpha > range-b:nth-child(1)").value = 100;
        if (color_m == "stroke") document.querySelector("#draw_color_alpha > range-b:nth-child(2)").value = 100;
    }
}
color_bar();

document.querySelector("#draw_stroke_width > range-b").oninput = () => {
    set_f_object_v(null, null, document.querySelector("#draw_stroke_width > range-b").value - 0);
};

function get_f_object_v() {
    if (fabric_canvas.getActiveObject()) {
        var n = fabric_canvas.getActiveObject();
        if (n.filters) n = { _objects: [{ fill: fill_color, stroke: stroke_color, strokeWidth: stroke_width }] };
    } else if (fabric_canvas.isDrawingMode) {
        n = { _objects: [{ fill: "#0000", stroke: free_color, strokeWidth: free_width }] };
    } else {
        n = { _objects: [{ fill: fill_color, stroke: stroke_color, strokeWidth: stroke_width }] };
    }
    if (n._objects) n = n._objects[0];
    var [fill, stroke, strokeWidth] = [n.fill, n.stroke, n.strokeWidth];
    document.querySelector("#draw_stroke_width > range-b").value = strokeWidth;
    change_color({ fill: fill, stroke: stroke }, true);
    var fill_a = Color(document.querySelector("#draw_color_fill").innerText).valpha;
    document.querySelector("#draw_color_alpha > range-b:nth-child(1)").value = Math.round(fill_a * 100);
    var stroke_a = Color(document.querySelector("#draw_color_stroke").innerText).valpha;
    document.querySelector("#draw_color_alpha > range-b:nth-child(2)").value = Math.round(stroke_a * 100);
}
function set_f_object_v(fill, stroke, strokeWidth) {
    if (fabric_canvas.getActiveObject()) {
        var n = fabric_canvas.getActiveObject();
        if (!n._objects) n._objects = [n];
        n = n._objects;
        for (i in n) {
            if (fill) n[i].set("fill", fill);
            if (stroke) n[i].set("stroke", stroke);
            if (strokeWidth) n[i].set("strokeWidth", strokeWidth);
        }
        fabric_canvas.renderAll();
    } else if (fabric_canvas.isDrawingMode) {
        if (stroke) fabric_canvas.freeDrawingBrush.color = free_color = stroke;
        if (strokeWidth) fabric_canvas.freeDrawingBrush.width = free_width = strokeWidth;
    } else {
        if (fill) fill_color = fill;
        if (stroke) stroke_color = stroke;
        if (strokeWidth) stroke_width = strokeWidth;
    }
}

// 滤镜
fabric_canvas.filterBackend = fabric.initFilterBackend();
var webglBackend;
try {
    webglBackend = new fabric.WebglFilterBackend();
    fabric_canvas.filterBackend = webglBackend;
} catch (e) {
    console.log(e);
}

var new_filter_selecting = false;
function new_filter_select(o, no) {
    var x1 = o.x.toFixed(),
        y1 = o.y.toFixed(),
        x2 = no.x.toFixed(),
        y2 = no.y.toFixed();
    var x = Math.min(x1, x2),
        y = Math.min(y1, y2),
        w = Math.abs(x1 - x2),
        h = Math.abs(y1 - y2);

    var main_ctx = main_canvas.getContext("2d");
    var tmp_canvas = document.createElement("canvas");
    tmp_canvas.width = w;
    tmp_canvas.height = h;
    var gid = main_ctx.getImageData(x, y, w, h); // 裁剪
    tmp_canvas.getContext("2d").putImageData(gid, 0, 0);
    var img = new fabric.Image(tmp_canvas, {
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
    fabric_canvas.add(img);
    fabric_canvas.setActiveObject(img);
}

document.querySelector("#draw_filters_select > lock-b").oninput = () => {
    new_filter_selecting = true;
    fabric_canvas.defaultCursor = "crosshair";
};

function apply_filter(i, filter) {
    var obj = fabric_canvas.getActiveObject();
    obj.filters[i] = filter;
    obj.applyFilters();
    fabric_canvas.renderAll();
}
function get_filters() {
    if (fabric_canvas.getActiveObject()?.filters !== undefined) {
        s_h_filters_div(false);
    } else {
        s_h_filters_div(true);
        return;
    }
    var f = fabric_canvas.getActiveObject().filters;
    console.log(f);
    document.querySelector("#draw_filters_pixelate > range-b").value = f[0]?.blocksize || 0;
    document.querySelector("#draw_filters_blur > range-b").value = f[1]?.blur * 100 || 0;
    document.querySelector("#draw_filters_brightness > range-b").value = f[2]?.brightness || 0;
    document.querySelector("#draw_filters_contrast > range-b").value = f[3]?.contrast || 0;
    document.querySelector("#draw_filters_saturation > range-b").value = f[4]?.saturation || 0;
    document.querySelector("#draw_filters_hue > range-b").value = f[5]?.rotation || 0;
    document.querySelector("#draw_filters_gamma > range-b:nth-child(1)").value = f[6]?.gamma[0] || 1;
    document.querySelector("#draw_filters_gamma > range-b:nth-child(2)").value = f[6]?.gamma[1] || 1;
    document.querySelector("#draw_filters_gamma > range-b:nth-child(3)").value = f[6]?.gamma[2] || 1;
    document.querySelector("#draw_filters_noise > range-b").value = f[7]?.noise || 0;
    var gray = f[8]?.mode;
    switch (gray) {
        case "average":
            document.querySelector("#draw_filters_grayscale > lock-b:nth-child(1)").checked = true;
            break;
        case "lightness":
            document.querySelector("#draw_filters_grayscale > lock-b:nth-child(2)").checked = true;
            break;
        case "luminosity":
            document.querySelector("#draw_filters_grayscale > lock-b:nth-child(3)").checked = true;
        default:
            document.querySelector("#draw_filters_grayscale > lock-b:nth-child(1)").checked = false;
            document.querySelector("#draw_filters_grayscale > lock-b:nth-child(2)").checked = false;
            document.querySelector("#draw_filters_grayscale > lock-b:nth-child(3)").checked = false;
    }
    document.querySelector("#draw_filters_invert > lock-b").checked = f[9] ? true : false;
    document.querySelector("#draw_filters_sepia > lock-b").checked = f[10] ? true : false;
    document.querySelector("#draw_filters_bw > lock-b").checked = f[11] ? true : false;
    document.querySelector("#draw_filters_brownie > lock-b").checked = f[12] ? true : false;
    document.querySelector("#draw_filters_vintage > lock-b").checked = f[13] ? true : false;
    document.querySelector("#draw_filters_koda > lock-b").checked = f[14] ? true : false;
    document.querySelector("#draw_filters_techni > lock-b").checked = f[15] ? true : false;
    document.querySelector("#draw_filters_polaroid > lock-b").checked = f[16] ? true : false;
}
function s_h_filters_div(v) {
    var l = document.querySelectorAll("#draw_filters_i > div");
    if (v) {
        for (i = 1; i < l.length; i++) {
            l[i].style.pointerEvents = "none";
            l[i].style.opacity = 0.2;
        }
    } else {
        for (i = 1; i < l.length; i++) {
            l[i].style.pointerEvents = "auto";
            l[i].style.opacity = 1;
        }
    }
}
s_h_filters_div(true);

// 马赛克
// 在fabric源码第二个uBlocksize * uStepW改为uBlocksize * uStepH
document.querySelector("#draw_filters_pixelate > range-b").oninput = () => {
    var value = document.querySelector("#draw_filters_pixelate > range-b").value;
    if (value != 0) {
        var filter = new fabric.Image.filters.Pixelate({
            blocksize: value,
        });
        apply_filter(0, filter);
    } else {
        apply_filter(0, null);
    }
};
// 模糊
document.querySelector("#draw_filters_blur > range-b").oninput = () => {
    var value = document.querySelector("#draw_filters_blur > range-b").value / 100;
    if (value != 0) {
        var filter = new fabric.Image.filters.Blur({
            blur: value,
        });
        apply_filter(1, filter);
    } else {
        apply_filter(1, null);
    }
};
// 亮度
document.querySelector("#draw_filters_brightness > range-b").oninput = () => {
    var value = document.querySelector("#draw_filters_brightness > range-b").value;
    var filter = new fabric.Image.filters.Brightness({
        brightness: value,
    });
    apply_filter(2, filter);
};
// 对比度
document.querySelector("#draw_filters_contrast > range-b").oninput = () => {
    var value = document.querySelector("#draw_filters_contrast > range-b").value;
    var filter = new fabric.Image.filters.Contrast({
        contrast: value,
    });
    apply_filter(3, filter);
};
// 饱和度
document.querySelector("#draw_filters_saturation > range-b").oninput = () => {
    var value = document.querySelector("#draw_filters_saturation > range-b").value;
    var filter = new fabric.Image.filters.Saturation({
        saturation: value,
    });
    apply_filter(4, filter);
};
// 色调
document.querySelector("#draw_filters_hue > range-b").oninput = () => {
    var value = document.querySelector("#draw_filters_hue > range-b").value;
    var filter = new fabric.Image.filters.HueRotation({
        rotation: value,
    });
    apply_filter(5, filter);
};
// 伽马
document.querySelector("#draw_filters_gamma > range-b:nth-child(1)").oninput =
    document.querySelector("#draw_filters_gamma > range-b:nth-child(2)").oninput =
    document.querySelector("#draw_filters_gamma > range-b:nth-child(3)").oninput =
        () => {
            var r = document.querySelector("#draw_filters_gamma > range-b:nth-child(1)").value;
            var g = document.querySelector("#draw_filters_gamma > range-b:nth-child(2)").value;
            var b = document.querySelector("#draw_filters_gamma > range-b:nth-child(3)").value;
            var filter = new fabric.Image.filters.Gamma({
                gamma: [r, g, b],
            });
            apply_filter(6, filter);
        };
// 噪音
document.querySelector("#draw_filters_noise > range-b").oninput = () => {
    var value = document.querySelector("#draw_filters_noise > range-b").value;
    var filter = new fabric.Image.filters.Noise({
        noise: value,
    });
    apply_filter(7, filter);
};
// 灰度
document.querySelector("#draw_filters_grayscale > lock-b:nth-child(1)").oninput = () => {
    document.querySelector("#draw_filters_grayscale > lock-b:nth-child(2)").checked = false;
    document.querySelector("#draw_filters_grayscale > lock-b:nth-child(3)").checked = false;
    if (document.querySelector("#draw_filters_grayscale > lock-b:nth-child(1)").checked)
        var filter = new fabric.Image.filters.Grayscale({ mode: "average" });
    apply_filter(8, filter);
};
document.querySelector("#draw_filters_grayscale > lock-b:nth-child(2)").oninput = () => {
    document.querySelector("#draw_filters_grayscale > lock-b:nth-child(1)").checked = false;
    document.querySelector("#draw_filters_grayscale > lock-b:nth-child(3)").checked = false;
    if (document.querySelector("#draw_filters_grayscale > lock-b:nth-child(2)").checked)
        var filter = new fabric.Image.filters.Grayscale({ mode: "lightness" });
    apply_filter(8, filter);
};
document.querySelector("#draw_filters_grayscale > lock-b:nth-child(3)").oninput = () => {
    document.querySelector("#draw_filters_grayscale > lock-b:nth-child(1)").checked = false;
    document.querySelector("#draw_filters_grayscale > lock-b:nth-child(2)").checked = false;
    if (document.querySelector("#draw_filters_grayscale > lock-b:nth-child(3)").checked)
        var filter = new fabric.Image.filters.Grayscale({ mode: "luminosity" });
    apply_filter(8, filter);
};
// 负片
document.querySelector("#draw_filters_invert > lock-b").oninput = () => {
    var value = document.querySelector("#draw_filters_invert > lock-b").checked;
    if (value) {
        var filter = new fabric.Image.filters.Invert();
        apply_filter(9, filter);
    } else {
        apply_filter(9, null);
    }
};
// 棕褐色
document.querySelector("#draw_filters_sepia > lock-b").oninput = () => {
    var value = document.querySelector("#draw_filters_sepia > lock-b").checked;
    if (value) {
        var filter = new fabric.Image.filters.Sepia();
        apply_filter(10, filter);
    } else {
        apply_filter(10, null);
    }
};
// 黑白
document.querySelector("#draw_filters_bw > lock-b").oninput = () => {
    var value = document.querySelector("#draw_filters_bw > lock-b").checked;
    if (value) {
        var filter = new fabric.Image.filters.BlackWhite();
        apply_filter(11, filter);
    } else {
        apply_filter(11, null);
    }
};
// 布朗尼
document.querySelector("#draw_filters_brownie > lock-b").oninput = () => {
    var value = document.querySelector("#draw_filters_brownie > lock-b").checked;
    if (value) {
        var filter = new fabric.Image.filters.Brownie();
        apply_filter(12, filter);
    } else {
        apply_filter(12, null);
    }
};
// 老式
document.querySelector("#draw_filters_vintage > lock-b").oninput = () => {
    var value = document.querySelector("#draw_filters_vintage > lock-b").checked;
    if (value) {
        var filter = new fabric.Image.filters.Vintage();
        apply_filter(13, filter);
    } else {
        apply_filter(13, null);
    }
};
// 柯达彩色胶片
document.querySelector("#draw_filters_koda > lock-b").oninput = () => {
    var value = document.querySelector("#draw_filters_koda > lock-b").checked;
    if (value) {
        var filter = new fabric.Image.filters.Kodachrome();
        apply_filter(14, filter);
    } else {
        apply_filter(14, null);
    }
};
// 特艺色彩
document.querySelector("#draw_filters_techni > lock-b").oninput = () => {
    var value = document.querySelector("#draw_filters_techni > lock-b").checked;
    if (value) {
        var filter = new fabric.Image.filters.Technicolor();
        apply_filter(15, filter);
    } else {
        apply_filter(15, null);
    }
};
// 宝丽来
document.querySelector("#draw_filters_polaroid > lock-b").oninput = () => {
    var value = document.querySelector("#draw_filters_polaroid > lock-b").checked;
    if (value) {
        var filter = new fabric.Image.filters.Polaroid();
        apply_filter(16, filter);
    } else {
        apply_filter(16, null);
    }
};

// fabric命令行
document.getElementById("draw_edit_b").onclick = () => {
    o = !o;
    if (o) {
        document.querySelector("#draw_edit input").focus();
        document.querySelector("#windows_bar").style.transform = "translateX(0)";
    } else {
        document.querySelector("#windows_bar").style.transform = "translateX(-100%)";
    }
};
document.querySelector("#draw_edit_run").onclick = () => {
    fabric_api();
};
document.querySelector("#draw_edit input").onkeydown = (e) => {
    if (e.key == "Enter") {
        fabric_api();
    }
};
function fabric_api() {
    var e = document.querySelector("#draw_edit input").value;
    if (e.includes("$0")) {
        e = e.replace("$0", "fabric_canvas.getActiveObject()");
    } else {
        e = `fabric_canvas.getActiveObject().set({${e}})`;
    }
    eval(e);
    fabric_canvas.renderAll();
}
