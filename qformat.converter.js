$(function() {

    const numBitsID = '#num_bits';
    const numFracBitsID = '#num_frac_bits';
    const signedID = '#signed';
    const formatID = '#format';
    const integerID = '#integer';
    const floatID = '#float';
    const realFloatID = '#realfloat';
    const floatErrorID = '#floaterror';
    const errorDbID = '#errordb';
    const labelFormatID = '#labelformat';
    const maxfloatID = '#maxfloat';
    const minfloatID = '#minfloat';
    const resolutionID = '#resolution';
    const batchIntegerID = '#batch-int';
    const batchFloatID = '#batch-float';
    var format = 'hex';

    var fixedPointVal = new FixedPointConverter(23, 24, true);
    var batchConvert = new FixedPointConverter(23, 24, true);

    // info relates query parameters to form controls and variables
    const getMap = {
        "numBits": {
            "controlID": numBitsID,
            "field": "numBits",
            "convert": parseInt,
        },
        "numFracBits": {
            "controlID": numFracBitsID,
            "field": "numFracBits",
            "convert": parseInt,
        },
        "signed": {
            "controlID": signedID,
            "field": "signed",
            "convert": function (x) {return x === 'true';},
        },
        "format": {
            "controlID": formatID,
            "field": null,
            "convert": function (x) {format = x; return x;},
        },
    }

    updateControlsFromGET(fixedPointVal, getMap);

    /**
     * Update the main control values.
     */
    function updateConverter() {

        updateFixedPointControls(numBitsID, numFracBitsID, integerID, floatID, signedID, fixedPointVal, function () { return format; }, setConverterError);

        $(realFloatID).val(fixedPointVal.fixed.toString());
        $(floatErrorID).val(fixedPointVal.error.toString());
        $(errorDbID).val(fixedPointVal.error_dB.toString());
        $(maxfloatID).val(fixedPointVal.maxFloat.toString());
        $(minfloatID).val(fixedPointVal.minFloat.toString());
        $(resolutionID).val(fixedPointVal.resolution.toString());

        updateLinkHref('converter', getMap, 'remember');

        // update batch conversion
        recalculateBatch(batchFloatID, batchIntegerID, batchConvert, function() {return format;});
    }

    /**
     * Set an error on the form element.
     */
    function setConverterError(elem, msg) {
        setError(elem, msg);
        $(realFloatID).val('NaN');
        $(floatErrorID).val('NaN');
        $(errorDbID).val('NaN');
    }

    /**
     * Update the bit positions table.
     */
    function updateBitPositionsTable() {

        function getMidway($sel) {
            var midway = Math.floor($sel.length / 2);
            return midway;
        }

        function getBitPosition($sel, index) {
            var bitPosition = 0;
            var midway = getMidway($sel);
            if (index >= 0 && index < midway) {
                bitPosition = fixedPointVal.numBits - index - 1;
            } else {
                bitPosition = fixedPointVal.numBits - index - 1 - (fixedPointVal.numBits - $sel.length);
            }
            return bitPosition;
        }

        var $bitPosSelection = $('table#bit-pos td:nth-of-type(1)');
        $bitPosSelection.each(function (index) {
            if (index != getMidway($bitPosSelection)) {
                var bitPosition = getBitPosition($bitPosSelection, index);
                $(this).text(bitPosition.toString());
            } else {
                $(this).html('&hellip;');
            }
        });

        var $bitValuesSelection = $('table#bit-pos td:nth-of-type(2)');
        $bitValuesSelection.each(function (index) {
            var bitPosition = getBitPosition($bitValuesSelection, index);
            power = (bitPosition - fixedPointVal.numFracBits).toString();
            if (index != getMidway($bitValuesSelection)) {
                var content = "2<sup>" + power.replace("-", "&minus;") + "</sup>";
                if (index == 0 && fixedPointVal.signed) {
                    content = "&minus;" + content;
                }
                $(this).html(content);
            }else {
                $(this).html('&hellip;');
            }
        });
    }

    // updates following change of word size
    addNumBitsHandler(numBitsID, fixedPointVal, numFracBitsID, function () {
        batchConvert.numBits = fixedPointVal.numBits;
        batchConvert.numFracBits = fixedPointVal.numFracBits;
        updateBitPositionsTable();
        updateConverter();
    });

    // updates following change of number of fractional bits
    addNumFracBitsHandler(numFracBitsID, fixedPointVal, function () {
        updateBitPositionsTable();
        updateConverter();
    });

    // updates following change of signedness
    addSignedHandler(signedID, fixedPointVal, integerID, function() {
        updateBitPositionsTable();
        updateConverter();
    });

    // updates following change of integer format
    addFormatHandler(formatID, labelFormatID, function(_fmt) {
        format = _fmt;
        updateConverter();
    });

    // updates following change of integer value
    addIntegerHandler(integerID, floatID, fixedPointVal, function() { return format; }, updateConverter);

    // updates following change of floating-point value
    addFloatHandler(floatID, integerID, fixedPointVal, updateConverter);

    // updates following change to batch floats
    $(batchFloatID).change(function () {
        batchConvert.floatChanged = true;
        recalculateBatch(batchFloatID, batchIntegerID, batchConvert, function() {return format;});
    });

    // updates following change of batch integers
    $(batchIntegerID).change(function () {
        batchConvert.floatChanged = false;
        recalculateBatch(batchFloatID, batchIntegerID, batchConvert, function() {return format;});
    });

    // do these once the page has loaded
    updateBitPositionsTable();
    updateConverter();
    $(formatID).trigger("change");

});
