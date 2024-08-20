const fs = require('fs');

function assTimeToMilliseconds(s) {
    let match = /^\s*(\d+:)?(\d{1,2}):(\d{1,2})([.,](\d{1,3}))?\s*$/.exec(s);
    let hh = match[1] ? parseInt(match[1].replace(":", "")) : 0;
    let mm = parseInt(match[2]);
    let ss = parseInt(match[3]);
    let ff = match[5] ? parseInt(match[5]) : 0;
    let ms = hh * 3600 * 1000 + mm * 60 * 1000 + ss * 1000 + ff * 10;
    return ms;
}

function toVttFormatTimeString(ms) {
    let hh = Math.floor(ms / 1000 / 3600);
    let mm = Math.floor(ms / 1000 / 60 % 60);
    let ss = Math.floor(ms / 1000 % 60);
    let ff = Math.floor(ms % 1000);
    let time = (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm + ":" + (ss < 10 ? "0" : "") + ss + "." + (ff < 100 ? "0" : "") + (ff < 10 ? "0" : "") + ff;
    return time;
}

function parse(subtitleContent) {
    let columns = null;
    let captions = [];
    let parts = subtitleContent.split(/\r?\n\s*\r?\n/);
    for (let index = 0; index < parts.length; index++) {
        let regex = /^\s*\[([^\]]+)\]\r?\n([\s\S]*)(\r?\n)*$/gi;
        let match = regex.exec(parts[index]);
        if (match) {
            let tag = match[1];
            let lines = match[2].split(/\r?\n/);
            for (let line = 0; line < lines.length; ++line) {
                let individualLine = lines[line];
                if (/^\s*;/.test(individualLine)) {
                    continue; // skip for comment
                }
                let lineContent = /^\s*([^:]+):\s*(.*)(\r?\n)?$/.exec(individualLine); /*m*/
                if (tag === "Events") {
                    let name = lineContent[1].trim();
                    let value = lineContent[2].trim();
                    if (name === "Format") {
                        columns = value.split(/\s*,\s*/g);
                        continue;
                    }
                    if (name === "Dialogue" || name === "Comment") {
                        let caption = {};
                        let values = value.split(/\s*,\s*/g);
                        // if (values[0] !== "0" || values[3] !== "Sign") {
                        for (let index = 0; index < columns.length && index < values.length; ++index) {
                            caption[columns[index]] = values[index];
                        }
                        caption["Start"] = assTimeToMilliseconds(caption["Start"]);
                        caption["End"] = assTimeToMilliseconds(caption["End"]);
                        let getSeparatorLastPos = value.split(",", columns.length - 1).join(',').length;
                        const svgRemovingRegex = /[mlhbvcsqtaz][\s-]*-?\d+(\.\d+)?(?:[\s-]+-?\d+(\.\d+)?)*(?:[\s,]+-?\d+(\.\d+)?)*(?=\s|$)/gi;
                        caption["Text"] = value.substring(getSeparatorLastPos + 1).replaceAll(/{[^}]*}/g, '').replaceAll(svgRemovingRegex, '').trim().split("\\N").join("\n");
                        if (caption["Text"].length) {
                            captions.push(caption);
                        }
                        // }
                    }
                }
            }

        }
    }
    captions.sort((captionA, captionB) => captionA["Start"] - captionB["Start"]);
    // fs.writeFileSync('./assets/converted_dialogue.json', JSON.stringify(captions));
    const uniqueCaptionsText = new Set();
    let filteredCaptions = captions.filter(caption => {
        const key = caption["Text"] + caption["Start"] + caption["End"];
        if (uniqueCaptionsText.has(key)) {
            return false;
        } else {
            uniqueCaptionsText.add(key);
            return true;
        }
    });
    convertToWebVtt(filteredCaptions, {});
}

function convertToWebVtt(captions, options) {
    let eol = options.eol || "\r\n";
    let content = "WEBVTT" + eol + eol;
    for (let index = 0; index < captions.length; ++index) {
        let caption = captions[index];
        content += toVttFormatTimeString(caption["Start"]) + " --> " + toVttFormatTimeString(caption["End"]) + eol;
        content += caption["Text"] + eol;
        content += eol;
    }
    fs.writeFileSync('./assets/converted_dialogue.vtt', content);
}

let subtitleContent = fs.readFileSync("./assets/ffmpeg-bin/dialogue.ass", { encoding: 'utf-8' });
parse(subtitleContent);