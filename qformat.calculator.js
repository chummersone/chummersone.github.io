$(function() {

    var lhs = new FixedPointConverter(23, 24, true);
    var rhs = new FixedPointConverter(23, 24, true);
    var out = new FixedPointConverter(23, 48, true);
    var out_float = 0.0;
    var format_lhs = 'hex';
    var format_rhs = 'hex';
    var operator = 'add';
    var behaviour = 'saturate';
    var right_shift = 0;
    var right_shift_round = true;
    var old_num_bits = 0;

    /**
     * Update the result of the operation.
     */
    function updateResult() {

        updateRightShift();
        out._signed = lhs.signed || rhs.signed;

        // operation
        switch (operator) {
            case 'add':
                out_float = lhs.float + rhs.float;
                out._int = lhs._int + rhs._int;
                break;
            case 'subtract':
                out_float = lhs.float - rhs.float;
                out._int = lhs._int - rhs._int;
                break;
            case 'multiply':
                out_float = lhs.float * rhs.float;
                out._int = lhs._int * rhs._int;
                break;
        }
        $('#arithmetic_result_float').val(out_float.toString());

        // check fracitonal bits
        clearError('#left_operand_num_frac_bits');
        clearError('#right_operand_num_frac_bits');
        clearError('#arithmetic_out_num_bits');
        if (operator == 'multiply') {
            out._numFracBits = lhs.numFracBits + rhs.numFracBits;
        } else if (lhs.numFracBits != rhs.numFracBits) {
            setError('#left_operand_num_frac_bits', 'Number of fractional bits should match');
            setError('#right_operand_num_frac_bits', 'Number of fractional bits should match');
        } else {
            out._numFracBits = lhs._numFracBits;
        }

        // wrap/saturate
        var out_copy = new FixedPointConverter(out.numFracBits, out.numBits, out.signed);
        out_copy._int = BigInt(out._int);
        var pre_behaviour = out_copy._int
        switch (behaviour) {
            case 'saturate':
                if (out.int > out.maxInteger) {
                    out_copy._int = BigInt(out.maxInteger);
                } else if (out.int < out.minInteger) {
                    out_copy._int = BigInt(out.minInteger);
                }
                break;
            case 'wrap':
                if (out.int > out.maxInteger) {
                    while (out_copy._int > out.maxInteger) {
                        out_copy._int -= (2n ** BigInt(out.numBits));
                    }
                } else if (out.int < out.minInteger) {
                    while (out_copy._int < out.minInteger) {
                        out_copy._int += (2n ** BigInt(out.numBits));
                    }
                }
                break;
        }
        if (pre_behaviour != out_copy._int) {
            $('#wrap_sat_flag').prop('checked', true);
        } else {
            $('#wrap_sat_flag').prop('checked', false);
        }

        // shift
        out_copy.floatChanged = false;
        if (right_shift_round && right_shift > 0) {
            out_copy._int += BigInt(2 ** (right_shift - 1));
        }
        out_copy._int >>= BigInt(right_shift);
        out_copy._numFracBits -= right_shift;
        $('#arithmetic_result_num_frac_bits').val(out_copy.numFracBits.toString());
        if (out_copy.numFracBits > out_copy.numBits) {
            setError('#arithmetic_out_num_bits',
                'Number of fractional bits in the result is ' + out_copy.numFracBits.toString());
        }
        
        // calculate error
        out_copy._update();
        out_copy._float = out_float;
        $('#arithmetic_result_fixed').val(out_copy._fixed.toString());
        $('#arithmetic_result_int').val(out_copy.hex);
        $('#arithmetic_result_floaterror').val(out_copy.error.toString());
        $('#arithmetic_result_errordb').val(out_copy.error_dB.toFixed(3));

    }

    /**
     * Update the left operand controls.
     */
    function updateLeftOperand() {
        updateFixedPointControls(
            '#left_operand_num_bits',
            '#left_operand_num_frac_bits',
            '#left_operand_int',
            '#left_operand_float',
            '#left_operand_signed',
            lhs,
            function () { return format_lhs; },
            setError
        );
    }

    /**
     * Update the right operand controls.
     */
    function updateRightOperand() {
        updateFixedPointControls(
            '#right_operand_num_bits',
            '#right_operand_num_frac_bits',
            '#right_operand_int',
            '#right_operand_float',
            '#right_operand_signed',
            rhs,
            function () { return format_rhs; },
            setError
        );
    }

    /**
     * Update the right-shift choices.
     */
    function updateRightShift() {
        $('#arithmetic_right_shift').find('option').remove().end();
        for (let i = Math.max(lhs.numBits, rhs.numBits); i >= 0; i--) {
            $('#arithmetic_right_shift').append('<option value="' + i.toString() + '">' + i.toString() + '</option>');
        }
        if (right_shift > out.numBits) {
            right_shift -= Math.abs(old_num_bits - out.numBits);
        }
        $('#arithmetic_right_shift').val(right_shift.toString());
    }

    // updates following change of word size
    addNumBitsHandler('#left_operand_num_bits', lhs, '#left_operand_num_frac_bits', function () {
        updateLeftOperand();
        updateResult();
    });
    addNumBitsHandler('#right_operand_num_bits', rhs, '#right_operand_num_frac_bits', function () {
        updateRightOperand();
        updateResult();
    });

    // updates following change of number of fractional bits
    addNumFracBitsHandler('#left_operand_num_frac_bits', lhs, function () {
        updateLeftOperand();
        updateResult();
    });
    addNumFracBitsHandler('#right_operand_num_frac_bits', rhs, function () {
        updateRightOperand();
        updateResult();
    });

    // updates following change of signedness
    addSignedHandler('#left_operand_signed', lhs, '#left_operand_int', function() {
        updateLeftOperand();
        updateResult();
    });
    addSignedHandler('#right_operand_signed', rhs, '#right_operand_int', function() {
        updateRightOperand();
        updateResult();
    });

    // updates following change of integer format
    addFormatHandler('#left_operand_format', '#labelformat_lhs', function(_fmt) {
        format_lhs = _fmt;
        updateLeftOperand();
        updateResult();
    });
    addFormatHandler('#right_operand_format', '#labelformat_rhs', function(_fmt) {
        format_rhs = _fmt;
        updateRightOperand();
        updateResult();
    });

    // updates following change of integer value
    addIntegerHandler('#left_operand_int', '#left_operand_float', lhs, function() { return format_lhs; }, function() {
        updateLeftOperand();
        updateResult();
    });
    addIntegerHandler('#right_operand_int', '#right_operand_float', rhs, function() { return format_rhs; }, function() {
        updateRightOperand();
        updateResult();
    });

    // updates following change of floating-point value
    addFloatHandler('#left_operand_float', '#left_operand_int', lhs, function() {
        updateLeftOperand();
        updateResult();
    });
    addFloatHandler('#right_operand_float', '#right_operand_int', rhs, function() {
        updateRightOperand();
        updateResult();
    });

    // updates following change of operator
    $('#operator').change(function () {
        operator = $(this).val();
        updateResult();
    });

    // updates following change of behaviour
    $('#behaviour').change(function () {
        behaviour = $(this).val();
        updateResult();
    });

    // updates following change of output num bits
    $('#arithmetic_out_num_bits').change(function () {
        old_num_bits = out.numBits;
        out.numBits = parseInt($(this).val());
        updateResult();
    });

    // updates following change of output right shift
    $('#arithmetic_right_shift').change(function () {
        right_shift = parseInt($(this).val());
        updateResult();
    });

    // updates following change of right shift rounding
    $('#right_shift_round').change(function () {
        right_shift_round = $(this).prop('checked');
        updateResult();
    });

    $('input[type=checkbox].flag').click(function() { return false; });
    updateLeftOperand();
    updateRightOperand();
    updateResult();

});
