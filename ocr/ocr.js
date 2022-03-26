const { exec } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
function ocr(arg, callback) {
    local_ocr(arg, (err, r) => {
        return callback(err, r);
    });
}
module.exports = ocr;

function local_ocr(arg, callback) {
    var tmp_path = path.join(os.tmpdir(), "/eSearch/ocr.png");
    fs.writeFile(tmp_path, Buffer.from(arg, "base64"), async (err) => {
        if (err) callback(err);
        switch (process.platform) {
            case "linux":
                exec(
                    `cd ${__dirname}/ppocr/ && 
                ./ppocr --det_model_dir=inference/ch_ppocr_mobile_v2.0_det_infer \
                --rec_model_dir=inference/ch_ppocr_mobile_v2.0_rec_infer \
                --char_list_file ppocr_keys_v1.txt \
                --image_dir=${tmp_path}`,
                    (e, result) => {
                        return callback(e, result);
                    }
                );
                break;
        }
    });
}
