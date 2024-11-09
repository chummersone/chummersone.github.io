const enableMatrix = {
    lowpass: { Q: true, gain: false},
    highpass: { Q: true, gain: false},
    bandpass: { Q: true, gain: false},
    lowshelf: { Q: false, gain: true},
    highshelf: { Q: false, gain: true},
    peaking: { Q: true, gain: true},
    notch: { Q: true, gain: false},
}

function toMel(f) {
    return 2595 * Math.log10(1 + (f / 700))
}

function fromMel(m) {
    return 700 * ((10 ** (m / 2595)) - 1)
}

function doNothing(x) {
    return x
}

class AudioFile {

    constructor(file, audioCtx, audioNode) {
        this.audioCtx = audioCtx
        this.audioNode = audioNode
        this.file = file
        this.isFileRead = false
        this.reader = new FileReader()
        this.reader.addEventListener("loadend", (e) => {
            this.isFileRead = true
        })
        this.reader.readAsDataURL(file)
    }

    #doPlayback() {
        this.audioNode.src = this.reader.result
        var promise = this.audioNode.play()
        if (promise) {
            //Older browsers may not return a promise, according to the MDN website
            promise.catch((error) => {
                console.log(error)
                window.alert("Error loading audio file.\n\nTry a different file, or a different browser.")
            })
        }
        this.audioCtx.resume()
    }

    play() {
        if (this.isFileRead) {
            this.#doPlayback()
        } else {
            this.reader.addEventListener("loadend", () => { this.#doPlayback() }, {once: true})
        }

    }

    stop() {
        this.audioNode.pause()
        this.audioNode.currentTime = 0
    }

}

class Playlist {

    constructor(containerID) {
        this.containerID = containerID
        this.files = []
        this.nowPlaying = null
    }

    addFile(audioFile) {
        this.files.push(audioFile)

        var trackControls = document.createElement("div")
        trackControls.className = "trackControls"

        var trackName = document.createElement("div")
        trackName.className = "trackName"
        trackName.innerHTML = "<span>" + audioFile.file.name + "</span>"

        var playButton = document.createElement("button")
        playButton.innerHTML = "&#9658;"
        var that = this
        playButton.addEventListener("click", function(event) {
            that.play(audioFile)
        })

        var removeButton = document.createElement("button")
        removeButton.innerHTML = "&#x2715;"
        removeButton.addEventListener("click", function(event) {
            that.removeFile(audioFile)
        })

        trackControls.append(playButton, removeButton, trackName)

        document.getElementById(this.containerID).append(trackControls)
    }

    removeFile(index) {
        if (index.constructor.name == "AudioFile") {
            index = this.files.indexOf(index)
        }
        var controls = document.querySelectorAll('.trackControls')
        controls[index].remove()
        this.files.splice(index, 1)
    }

    play(index) {
        if (this.nowPlaying) {
            this.nowPlaying.stop()
        }

        if (index.constructor.name == "AudioFile") {
            index = this.files.indexOf(index)
        }
        this.nowPlaying = this.files[index]
        this.nowPlaying.play()

        var that = this
        this.nowPlaying.audioNode.addEventListener("ended", function(event) {
            var next = (index + 1) % that.files.length
            that.play(next)
        }, {once: true})

        var npElem = document.getElementById("nowPlaying")
        if (npElem) {
            npElem.id = ""
        }
        var controls = document.querySelectorAll('.trackControls')
        controls[index].id = "nowPlaying"
    }
}

function addBiquadControl(context) {
    const index = context.eq.numBiquads
    const num = String(Date.now())

    // Add biquad and its response
    var biquad = context.eq.addBiquad()
    biquad.type = "peaking"

    // The group of biquad controls
    var group = document.createElement("div")
    group.className = "controlGroup"

    // Add the filter type select box
    var typeControl = document.createElement("div")
    typeControl.className = "control"
    var typeLabel = document.createElement("label")
    typeLabel.htmlFor = "biquadType-" + num
    typeLabel.innerText = "Filter type"
    var typeInput = document.createElement("select")
    typeInput.id = typeLabel.htmlFor
    types = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "peaking", "notch"]
    for (var i = 0; i < types.length; i++) {
        var option = document.createElement("option")
        option.value = types[i]
        option.text = types[i]
        typeInput.appendChild(option)
    }
    typeInput.value = biquad.type
    typeInput.selectedIndex = types.indexOf(biquad.type)
    typeInput.options[types.indexOf(biquad.type)].selected = true
    typeControl.append(typeLabel, typeInput)

    // Add remaining controls
    function createNumberInput(id, text, min, max, step, value, param, convertTo, convertFrom) {
        var control = document.createElement("div")
        control.className = "control"
        var label = document.createElement("label")
        label.htmlFor = id
        label.innerText = text

        var slider = document.createElement("input")
        slider.type = 'range'
        slider.id = id
        slider.min = convertTo(min)
        slider.max = convertTo(max)
        slider.step = (convertTo(max) - convertTo(min)) / ((max - min) / step)
        slider.value = convertTo(value)

        var number = document.createElement("input")
        number.type = 'number'
        number.id = id + '_number'
        number.min = min
        number.max = max
        number.step = step
        number.value = value

        slider.addEventListener("input", function(event) {
            number.value = convertFrom(slider.value)
            param.value = number.value
            context.eq.redraw();
        })
        number.addEventListener("change", function(event) {
            slider.value = convertTo(number.value)
            param.value = number.value
            context.eq.redraw()
        })

        control.append(label, slider, number)
        return control
    }

    var freqControl = createNumberInput("biquadFrequency-" + num, "Frequency / Hz", 20, 20000, 1, biquad.frequency.value, biquad.frequency, toMel, function(m) { return Math.round(fromMel(m)) })

    var qControl = createNumberInput("biquadQ-" + num, "Q", 0, 10, 0.0001, biquad.Q.value, biquad.Q, doNothing, doNothing)

    var gainControl = createNumberInput("biquadGain-" + num, "Gain / dB", -20, 20, 0.1, biquad.gain.value, biquad.gain, doNothing, doNothing)

    var removeButtonDiv = document.createElement("div")
    removeButtonDiv.className = "control"
    var removeButton = document.createElement("button")
    removeButton.id = "biquadDelete-" + num
    removeButton.innerHTML = "Delete"
    removeButton.addEventListener("click", function(event) {
        context.eq.removeBiquad(biquad)
        group.remove()
        context.eq.redraw();
    })
    removeButtonDiv.append(removeButton)

    typeInput.addEventListener("change", function(event) {
        biquad.type = event.target.value
        Array.prototype.slice.call(qControl.getElementsByTagName('input')).forEach(function(elem) {
            elem.disabled = !enableMatrix[biquad.type]["Q"]
        })
        Array.prototype.slice.call(gainControl.getElementsByTagName('input')).forEach(function(elem) {
            elem.disabled = !enableMatrix[biquad.type]["gain"]
        })
        context.eq.redraw();
    })

    // Add the controls to the group
    group.append(typeControl, freqControl, qControl, gainControl, removeButtonDiv)
    typeInput.dispatchEvent(new Event("change"))
    context.eq.redraw();
    document.getElementById("filterControls").append(group)
}

function createPopup(content) {
    var bg = document.createElement("div")
    bg.className = "popup-bg"
    var popup = document.createElement("div")
    popup.className = "popup-content"
    for (var i = 0; i < arguments.length; i++) {
        popup.append(arguments[i])
    }
    bg.append(popup)
    bg.addEventListener("click", function(event) {
        if (event.target !== this) return;
        bg.remove()
    })

    document.body.append(bg);

    return bg
}

function setInputGain(eq, gainInDB) {
    eq.input.gain.value = linear(gainInDB)
    eq.redraw()
}

function showCoefficientTable() {
    var coeffTable = document.createElement("table")
    coeffTable.innerHTML = '<thead>' +
            '<tr>' +
                '<th>a0</th>' +
                '<th>a1</th>' +
                '<th>a2</th>' +
                '<th>b0</th>' +
                '<th>b1</th>' +
                '<th>b2</th>' +
            '</tr>' +
        '</thead>' +
        '<tbody>' +
        '</tbody>'

    var control = document.createElement("div")
    control.className = "control"

    var fsLabel = document.createElement("label")
    fsLabel.htmlFor = "sampleRate"
    fsLabel.innerText = "Sample rate / Hz"
    var fsSelect = document.createElement("select")
    fsSelect.id = fsLabel.htmlFor
    rates = ["8000", "16000", "32000", "44100", "48000", "96000"]
    for (var i = 0; i < rates.length; i++) {
        var option = document.createElement("option")
        option.value = rates[i]
        option.text = rates[i]
        fsSelect.appendChild(option)
    }
    fsSelect.addEventListener("change", function(event) {
        var tBody = coeffTable.getElementsByTagName('tbody')[0]
        var content = "<tbody>"
        var fs = Number(fsSelect.value)
        var coefficients = context.eq.coefficients(fs)
        coefficients.forEach(function(coeffs) {
            content += '<tr>' +
                    '<td>' + String(coeffs.a[0]) + '</td>' +
                    '<td>' + String(coeffs.a[1]) + '</td>' +
                    '<td>' + String(coeffs.a[2]) + '</td>' +
                    '<td>' + String(coeffs.b[0]) + '</td>' +
                    '<td>' + String(coeffs.b[1]) + '</td>' +
                    '<td>' + String(coeffs.b[2]) + '</td>' +
                '</tr>'
        })
        content += "</tbody>"
        tBody.innerHTML = content
    })
    control.append(fsLabel, fsSelect)

    var info = document.createElement("p")
    info.innerHTML = 'Use the <a target="_blank" href="qformat.html">Q-format Converter</a> to convert to fixed-point.'

    createPopup(control, coeffTable, info)
    var defaultRate = "48000"
    fsSelect.value = defaultRate
    fsSelect.selectedIndex = rates.indexOf(defaultRate)
    fsSelect.options[rates.indexOf(defaultRate)].selected = true
    fsSelect.dispatchEvent(new Event("change"))
}