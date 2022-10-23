$(function() {

    class dBFixedPointConverter extends FixedPointConverter {

        /**
        * Convert linear gain to dB.
        */
        lin2dB(x) {
            return 20.0 * Math.log10(x);
        }

        /**
        * Convert dB to linear gain.
        */
        dB2lin(x) {
            return 10.0 ** (x / 20.0);
        }

        /**
        * Get the representation error.
        */
        get error() {
            return Math.abs(this._float - this._fixed);
        }

        /**
        * Get the representation error in dB.
        */
        get error_dB() {
            return this.error;
        }

        /**
        * Minimum floating-point value.
        */
        get minFloat() {
            return this.lin2dB(2 ** -this._numFracBits);
        }

        /**
        * Maximum floating-point value.
        */
        get maxFloat() {
            return this.lin2dB((2 ** (this._numBits - this._numFracBits - this._signCorrection)) - (2 ** -this._numFracBits));
        }

        /**
        * Update values.
        */
        _update() {
            if (this.floatChanged) {
                this._int = this._float2fixed(this.dB2lin(this._float));
            } else {
                this._float = this.lin2dB(this._fixed2float(this._int));
            }
            this._fixed = this.lin2dB(this._fixed2float(this._int));
        }

    }

    const dBnumBitsID = '#db_num_bits';
    const dBnumFracBitsID = '#db_num_frac_bits';
    const dBsignedID = '#db_signed';
    const dBformatID = '#db_format';
    const dBintegerID = '#db_integer';
    const dBfloatID = '#db_float';
    const dBrealFloatID = '#db_realfloat';
    const dBerrorDbID = '#db_errordb';
    const dBlabelFormatID = '#db_labelformat';
    const dBmaxfloatID = '#db_maxfloat';
    const dBminfloatID = '#db_minfloat';
    const dBbatchIntegerID = '#db_batch-int';
    const dBbatchFloatID = '#db_batch-float';
    var dBformat = 'hex';

    var dBfixedPointVal = new dBFixedPointConverter(23, 24, true);
    dBfixedPointVal.float = -3.0;
    var dBbatchConvert = new dBFixedPointConverter(23, 24, true);

    // info relates query parameters to form controls and variables
    const dBgetMap = {
        "dBnumBits": {
            "controlID": dBnumBitsID,
            "field": "numBits",
            "convert": parseInt,
        },
        "dBnumFracBits": {
            "controlID": dBnumFracBitsID,
            "field": "numFracBits",
            "convert": parseInt,
        },
        "dBsigned": {
            "controlID": dBsignedID,
            "field": "signed",
            "convert": function (x) {return x === 'true';},
        },
        "dBformat": {
            "controlID": dBformatID,
            "field": null,
            "convert": function (x) {dBformat = x; return x;},
        },
    }

    updateControlsFromGET(dBfixedPointVal, dBgetMap);

    /**
     * Update the main control values.
     */
    function updatedBConverter() {

        updateFixedPointControls(dBnumBitsID, dBnumFracBitsID, dBintegerID, dBfloatID, dBsignedID, dBfixedPointVal, function () { return dBformat; }, setdBConverterError);

        $(dBrealFloatID).val(dBfixedPointVal.fixed.toString());
        $(dBerrorDbID).val(dBfixedPointVal.error_dB.toString());
        $(dBmaxfloatID).val(dBfixedPointVal.maxFloat.toString());
        $(dBminfloatID).val(dBfixedPointVal.minFloat.toString());

        updateLinkHref('db_converter', dBgetMap, 'db_remember');

        // update batch conversion
        recalculateBatch(dBbatchFloatID, dBbatchIntegerID, dBbatchConvert, function() {return dBformat;});
    }

    /**
     * Set an error on the form element.
     */
    function setdBConverterError(elem, msg) {
        setError(elem, msg);
        $(dBrealFloatID).val('NaN');
        $(dBerrorDbID).val('NaN');
    }

    // updates following change of word size
    addNumBitsHandler(dBnumBitsID, dBfixedPointVal, dBnumFracBitsID, function () {
        dBbatchConvert.numBits = dBfixedPointVal.numBits;
        dBbatchConvert.numFracBits = dBfixedPointVal.numFracBits;
        updatedBConverter();
    });

    // updates following change of number of fractional bits
    addNumFracBitsHandler(dBnumFracBitsID, dBfixedPointVal, function () {
        updatedBConverter();
    });

    // updates following change of signedness
    addSignedHandler(dBsignedID, dBfixedPointVal, dBintegerID, function() {
        updatedBConverter();
    });

    // updates following change of integer format
    addFormatHandler(dBformatID, dBlabelFormatID, function(_fmt) {
        dBformat = _fmt;
        updatedBConverter();
    });

    // updates following change of integer value
    addIntegerHandler(dBintegerID, dBfloatID, dBfixedPointVal, function() { return dBformat; }, updatedBConverter);

    // updates following change of floating-point value
    addFloatHandler(dBfloatID, dBintegerID, dBfixedPointVal, updatedBConverter);

    // updates following change to batch floats
    $(dBbatchFloatID).change(function () {
        dBbatchConvert.floatChanged = true;
        recalculateBatch(dBbatchFloatID, dBbatchIntegerID, dBbatchConvert, function() {return dBformat;});
    });

    // updates following change of batch integers
    $(dBbatchIntegerID).change(function () {
        dBbatchConvert.floatChanged = false;
        recalculateBatch(dBbatchFloatID, dBbatchIntegerID, dBbatchConvert, function() {return dBformat;});
    });

    // do these once the page has loaded
    updatedBConverter();
    $(dBformatID).trigger("change");

});
