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
        this.objectURL = URL.createObjectURL(file)
    }

    play() {
        this.audioNode.src = this.objectURL
        var promise = this.audioNode.play()
        if (promise) {
            //Older browsers may not return a promise, according to the MDN website
            promise.catch((error) => {
                console.log(error)
                if (error.code !== 20)
                {
                    window.alert("Error loading audio file.\n\nTry a different file, or a different browser.")
                }
            })
        }
        this.audioCtx.resume()
    }

    stop() {
        this.audioNode.pause()
        this.audioNode.currentTime = 0
    }

}

class Playlist {

    #controlID = "playlistControl"

    constructor(containerID) {
        this.containerID = containerID
        this.files = []
        this.nowPlaying = null
        this.playlistIsEmpty()
    }

    playlistIsEmpty() {
        var group = document.getElementById(this.containerID)
        var info = document.createElement("p")
        info.innerHTML = 'Click "Choose Files" to add audio files to the playlist. Note that different browsers <a href="https://caniuse.com/?search=audio%20format">support different audio file formats</a>.'
        info.id = "playlistInfo"
        group.append(info)
        var controls = document.getElementById(this.#controlID)
        if (controls) {
            controls.remove()
        }
    }

    addFile(audioFile) {
        var info = document.getElementById("playlistInfo")
        var controls
        if (info) {
            info.remove()
            controls = document.createElement("div")
            controls.id = this.#controlID
            controls.className = "control"
            document.getElementById(this.containerID).append(controls)
        }

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

        document.getElementById(this.#controlID).append(trackControls)
    }

    removeFile(index) {
        if (index.constructor.name == "AudioFile") {
            index = this.files.indexOf(index)
        }
        var controls = document.querySelectorAll('.trackControls')
        controls[index].remove()
        this.files.splice(index, 1)
        if (this.files.length == 0) {
            this.playlistIsEmpty()
        }
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

function biquadControlsAreEmpty() {
    var filters = document.getElementById("filterControls")
    var info = document.createElement("p")
    info.innerHTML = 'Choose "Add filter" above to add filters to the EQ'
    info.id = "addFilterInfo"
    filters.append(info)
}

function addBiquadControl(context) {
    var info = document.getElementById("addFilterInfo")
    if (info) {
        info.remove()
    }

    const index = context.eq.numBiquads
    const num = String(Date.now())

    // Add biquad and its response
    var biquad = context.eq.addBiquad()
    biquad.type = "peaking"

    // The group of biquad controls
    var group = document.createElement("div")
    group.className = "controlGroup filter"

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
            context.eq.redraw()
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

    var gainControl = createNumberInput("biquadGain-" + num, "Gain / dB", -40, 20, 0.1, biquad.gain.value, biquad.gain, doNothing, doNothing)

    var removeButtonDiv = document.createElement("div")
    removeButtonDiv.className = "control"
    var removeButton = document.createElement("button")
    removeButton.id = "biquadDelete-" + num
    removeButton.innerHTML = "Delete"
    removeButton.addEventListener("click", function(event) {
        context.eq.removeBiquad(biquad)
        group.remove()
        context.eq.redraw()
        if (context.eq.biquads.length == 0) {
            biquadControlsAreEmpty()
        }
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
        context.eq.redraw()
    })

    // Add the controls to the group
    group.append(typeControl, freqControl, qControl, gainControl, removeButtonDiv)
    typeInput.dispatchEvent(new Event("change"))
    context.eq.redraw()
    document.getElementById("filterControls").append(group)

    return biquad
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

    document.body.append(bg)

    return bg
}

function setInputGain(eq, gainInDB) {
    eq.input.gain.value = linear(gainInDB)
    eq.redraw()
}

function showCoefficientTable(eq) {
    var coeffTable = document.createElement("table")
    coeffTable.className = "responsive"
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
        var existingError = document.getElementById("coeffError")
        if (existingError) {
            existingError.remove()
        }
        var fs = Number(fsSelect.value)
        var maxFrequency = 0
        eq.biquads.forEach((filter) => {
            maxFrequency = Math.max(maxFrequency, filter.frequency.value)
        })
        if (maxFrequency > (fs / 2)) {
            var error = document.createElement("div")
            error.id = "coeffError"
            error.innerHTML = "One or more filter frequencies exceed the Nyquist limit. The response of the given coefficients will differ from the plotted EQ."
            error.className = "error"
            control.append(error)
        }

        var tBody = coeffTable.getElementsByTagName('tbody')[0]
        var content = "<tbody>"
        var coefficients = eq.coefficients(fs)
        coefficients.forEach(function(coeffs) {
            content += '<tr>' +
                    '<td data-label="a0">' + String(coeffs.a[0]) + '</td>' +
                    '<td data-label="a1">' + String(coeffs.a[1]) + '</td>' +
                    '<td data-label="a2">' + String(coeffs.a[2]) + '</td>' +
                    '<td data-label="b0">' + String(coeffs.b[0]) + '</td>' +
                    '<td data-label="b1">' + String(coeffs.b[1]) + '</td>' +
                    '<td data-label="b2">' + String(coeffs.b[2]) + '</td>' +
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

function loadEqFromString(context, eqString) {
    biquads = JSON.parse(eqString)
    biquads.forEach((biquadObj) => {
        var bq = addBiquadControl(context)
        bq.type = biquadObj.type
        bq.frequency.value = biquadObj.freq
        bq.Q.value = biquadObj.Q
        bq.gain.value = biquadObj.gain

        var controls = document.getElementsByClassName("controlGroup filter")
        var index = context.eq.biquads.indexOf(bq)

        function getAllIdMatches(elem, regEx) {
            return Array.prototype.slice.call(elem.querySelectorAll('*')).filter(function (el) {
                return (new RegExp(regEx)).test(el.id)
            })
          }

        var typeInput = controls[index].querySelector("[id^='biquadType-']")
        typeInput.value = bq.type
        typeInput.dispatchEvent(new Event("change"))

        var frequencyInput = getAllIdMatches(controls[index], '^biquadFrequency-.+_number$')[0]
        frequencyInput.value = bq.frequency.value
        frequencyInput.dispatchEvent(new Event("change"))

        var qInput = getAllIdMatches(controls[index], '^biquadQ-.+_number$')[0]
        qInput.value = bq.Q.value
        qInput.dispatchEvent(new Event("change"))

        var gainInput = getAllIdMatches(controls[index], '^biquadGain-.+_number$')[0]
        gainInput.value = bq.gain.value
        gainInput.dispatchEvent(new Event("change"))

    })
}
