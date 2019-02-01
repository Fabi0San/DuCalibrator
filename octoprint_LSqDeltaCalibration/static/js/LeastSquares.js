// Delta calibration script

var debug = false;

var firmware;
var normalise = true;

const degreesToRadians = Math.PI / 180.0;
const XAxis = 0;
const YAxis = 1;
const ZAxis = 2;
const AlphaTower = 0;
const BetaTower = 1;
const GammaTower = 2;


function fsquare(x) {
    return x * x;
}

class Matrix
{
    constructor(rows, cols) {
        this.data = [];
        for (var i = 0; i < rows; ++i) {
            var row = [];
            for (var j = 0; j < cols; ++j) {
                row.push(0.0);
            }
            this.data.push(row)
        }
    }

    SwapRows(i, j, numCols) {
        if (i != j) {
            for (var k = 0; k < numCols; ++k) {
                var temp = this.data[i][k];
                this.data[i][k] = this.data[j][k];
                this.data[j][k] = temp;
            }
        }
    }

    // Perform Gauus-Jordan elimination on a matrix with numRows rows and (njumRows + 1) columns
    GaussJordan(solution, numRows) {
        for (var i = 0; i < numRows; ++i) {
            // Swap the rows around for stable Gauss-Jordan elimination
            var vmax = Math.abs(this.data[i][i]);
            for (var j = i + 1; j < numRows; ++j) {
                var rmax = Math.abs(this.data[j][i]);
                if (rmax > vmax) {
                    this.SwapRows(i, j, numRows + 1);
                    vmax = rmax;
                }
            }

            // Use row i to eliminate the ith element from previous and subsequent rows
            var v = this.data[i][i];
            for (var j = 0; j < i; ++j) {
                var factor = this.data[j][i]/v;
                this.data[j][i] = 0.0;
                for (var k = i + 1; k <= numRows; ++k) {
                    this.data[j][k] -= this.data[i][k] * factor;
                }
            }

            for (var j = i + 1; j < numRows; ++j) {
                var factor = this.data[j][i]/v;
                this.data[j][i] = 0.0;
                for (var k = i + 1; k <= numRows; ++k) {
                    this.data[j][k] -= this.data[i][k] * factor;
                }
            }
        }

        for (var i = 0; i < numRows; ++i) {
            solution.push(this.data[i][numRows] / this.data[i][i]);
        }
    }

    Print(tag) {
        var rslt = tag + " {<br/>";
        for (var i = 0; i < this.data.length; ++i) {
            var row = this.data[i];
            rslt += (row == 0) ? '{' : ' ';
            for (var j = 0; j < row.length; ++j) {
                rslt += row[j].toFixed(4);
                if (j + 1 < row.length) {
                    rslt += ", ";
                }
            }
            rslt += '<br/>';
        }
        rslt += '}';
        return rslt;
    }
}


class DeltaGeometry
{
    constructor(diagonalRod = 0, radius = 0, height = 0, endStopOffset = [0,0,0], towerOffset = [0,0,0], stepsPerUnit = [0,0,0])
    {
        this.DiagonalRod = diagonalRod;
        this.Radius = radius;
        this.Height = height;
        this.EndStopOffset = endStopOffset.slice();
        this.TowerOffset = towerOffset.slice();
        this.StepsPerUnit = stepsPerUnit.slice();
        this.RecomputeGeometry();
    }

    RecomputeGeometry() {
        this.towerPositions = [
            [-(this.Radius * Math.cos((30 + this.TowerOffset[AlphaTower]) * degreesToRadians)),
            -(this.Radius * Math.sin((30 + this.TowerOffset[AlphaTower]) * degreesToRadians))],
            [+(this.Radius * Math.cos((30 - this.TowerOffset[BetaTower]) * degreesToRadians)),
            -(this.Radius * Math.sin((30 - this.TowerOffset[BetaTower]) * degreesToRadians))],
            [-(this.Radius * Math.sin(this.TowerOffset[GammaTower] * degreesToRadians)),
            +(this.Radius * Math.cos(this.TowerOffset[GammaTower] * degreesToRadians))]];

        this.Xbc = this.towerPositions[GammaTower][XAxis] - this.towerPositions[BetaTower][XAxis];
        this.Xca = this.towerPositions[AlphaTower][XAxis] - this.towerPositions[GammaTower][XAxis];
        this.Xab = this.towerPositions[BetaTower][XAxis] - this.towerPositions[AlphaTower][XAxis];

        this.Ybc = this.towerPositions[GammaTower][YAxis] - this.towerPositions[BetaTower][YAxis];
        this.Yca = this.towerPositions[AlphaTower][YAxis] - this.towerPositions[GammaTower][YAxis];
        this.Yab = this.towerPositions[BetaTower][YAxis] - this.towerPositions[AlphaTower][YAxis];

        this.coreFa = fsquare(this.towerPositions[AlphaTower][XAxis]) + fsquare(this.towerPositions[AlphaTower][YAxis]);
        this.coreFb = fsquare(this.towerPositions[BetaTower][XAxis]) + fsquare(this.towerPositions[BetaTower][YAxis]);
        this.coreFc = fsquare(this.towerPositions[GammaTower][XAxis]) + fsquare(this.towerPositions[GammaTower][YAxis]);
        this.Q = 2 * (this.Xca * this.Yab - this.Xab * this.Yca);
        this.Q2 = fsquare(this.Q);
        this.D2 = fsquare(this.DiagonalRod);

        // Calculate the base carriage height when the printer is homed.
        this.ConeHeightSteps = [
            this.Transform([0, 0, 0], AlphaTower) * this.StepsPerUnit[AlphaTower],
            this.Transform([0, 0, 0], BetaTower) * this.StepsPerUnit[BetaTower],
            this.Transform([0, 0, 0], GammaTower) * this.StepsPerUnit[GammaTower],
        ]

        this.TowerHeightSteps = [
            ((this.Height + this.EndStopOffset[AlphaTower]) * this.StepsPerUnit[AlphaTower]) + this.ConeHeightSteps[AlphaTower],
            ((this.Height + this.EndStopOffset[BetaTower]) * this.StepsPerUnit[BetaTower]) + this.ConeHeightSteps[BetaTower],
            ((this.Height + this.EndStopOffset[GammaTower]) * this.StepsPerUnit[GammaTower]) + this.ConeHeightSteps[GammaTower]];


        this.homedCarriageHeight = this.Height - this.InverseTransform(0, 0, 0);
    }

    CarriageStepsFromTop(position, tower)
    {
        var fromBottom = this.Transform(position, tower) * this.StepsPerUnit[tower];
        return this.TowerHeightSteps[tower] - fromBottom;
    }

    Transform(machinePos, tower)
    {
        return machinePos[ZAxis] + Math.sqrt(this.D2 - fsquare(machinePos[XAxis] - this.towerPositions[tower][XAxis]) - fsquare(machinePos[YAxis] - this.towerPositions[tower][YAxis]));
    }


    InverseTransformFromStepsFromTop(Sa, Sb, Sc)
    {
        return this.InverseTransform(
            (this.TowerHeightSteps[AlphaTower] - Sa) / this.StepsPerUnit[AlphaTower],
            (this.TowerHeightSteps[BetaTower] - Sb) / this.StepsPerUnit[BetaTower],
            (this.TowerHeightSteps[GammaTower] - Sc) / this.StepsPerUnit[GammaTower]);
    }

    // Inverse transform method, We only need the Z component of the result.
    InverseTransform(Ha, Hb, Hc)
    {
        var Fa = this.coreFa + fsquare(Ha);
        var Fb = this.coreFb + fsquare(Hb);
        var Fc = this.coreFc + fsquare(Hc);

        // Setup PQRSU such that x = -(S - uz)/P, y = (P - Rz)/Q
        var P = (this.Xbc * Fa) + (this.Xca * Fb) + (this.Xab * Fc);
        var S = (this.Ybc * Fa) + (this.Yca * Fb) + (this.Yab * Fc);

        var R = 2 * ((this.Xbc * Ha) + (this.Xca * Hb) + (this.Xab * Hc));
        var U = 2 * ((this.Ybc * Ha) + (this.Yca * Hb) + (this.Yab * Hc));

        var R2 = fsquare(R), U2 = fsquare(U);

        var A = U2 + R2 + this.Q2;
        var minusHalfB = S * U + P * R + Ha * this.Q2 + this.towerPositions[AlphaTower][XAxis] * U * this.Q - this.towerPositions[AlphaTower][YAxis] * R * this.Q;
        var C = fsquare(S + this.towerPositions[AlphaTower][XAxis] * this.Q) + fsquare(P - this.towerPositions[AlphaTower][YAxis] * this.Q) + (fsquare(Ha) - this.D2) * this.Q2;

        var rslt = (minusHalfB - Math.sqrt(fsquare(minusHalfB) - A * C)) / A;
        if (isNaN(rslt)) {
            debugger;
            throw "At least one probe point is not reachable. Please correct your delta radius, diagonal rod length, or probe coordniates.";
        }
        return rslt;
    }

    

    InsertPerturb(deriv)
    {
        var perturb = 0.2;         // perturbation amount in mm or degrees
        var hiParams = new DeltaGeometry(this.DiagonalRod, this.Radius, this.Height, this.EndStopOffset, this.TowerOffset, this.StepsPerUnit);
        var loParams = new DeltaGeometry(this.DiagonalRod, this.Radius, this.Height, this.EndStopOffset, this.TowerOffset, this.StepsPerUnit);
        /*
        switch (deriv) {
            case 0:
                hiParams.EndStopOffset[AlphaTower] += perturb;
                loParams.EndStopOffset[AlphaTower] -= perturb;
                break;

            case 1:
                hiParams.EndStopOffset[BetaTower] += perturb;
                loParams.EndStopOffset[BetaTower] -= perturb;
                break;

            case 2:
                hiParams.EndStopOffset[GammaTower] += perturb;
                loParams.EndStopOffset[GammaTower] -= perturb;
                break;

            case 3:
                hiParams.Radius += perturb;
                loParams.Radius -= perturb;
                break;

            case 4:
                hiParams.TowerOffset[XAxis] += perturb;
                loParams.TowerOffset[XAxis] -= perturb;
                break;

            case 5:
                hiParams.TowerOffset[YAxis] += perturb;
                loParams.TowerOffset[YAxis] -= perturb;
                break;

            case 6:
                hiParams.DiagonalRod += perturb;
                loParams.DiagonalRod -= perturb;
                break;

            case 7:
                hiParams.StepsPerUnit[AlphaTower] += perturb;
                loParams.StepsPerUnit[AlphaTower] -= perturb;
                break;

            case 8:
                hiParams.StepsPerUnit[BetaTower] += perturb;
                loParams.StepsPerUnit[BetaTower] -= perturb;
                break;

            case 9:
                hiParams.StepsPerUnit[GammaTower] += perturb;
                loParams.StepsPerUnit[GammaTower] -= perturb;
                break;

            case 10:
                hiParams.Height += perturb;
                loParams.Height -= perturb;
                break;
                


        }*/

        var adjust = Array(10).fill(0.0);
        adjust[deriv] = perturb;
        hiParams.Adjust(adjust);
        adjust[deriv] = -perturb;
        loParams.Adjust(adjust);
        //hiParams.RecomputeGeometry();
        //loParams.RecomputeGeometry();

        return [hiParams, loParams];
    }


    ComputeDerivativeFromStepsFromTop(factors, numFactors, deriv, Sa, Sb, Sc)
    {
        var perturb = 0.2;         // perturbation amount in mm or degrees
        var hiParams = new DeltaGeometry(this.DiagonalRod, this.Radius, this.Height, this.EndStopOffset, this.TowerOffset, this.StepsPerUnit);
        var loParams = new DeltaGeometry(this.DiagonalRod, this.Radius, this.Height, this.EndStopOffset, this.TowerOffset, this.StepsPerUnit);
        var adjust = Array(10).fill(0.0);
        var fact = Array(10).fill(true);
        adjust[deriv] = perturb;
        hiParams.Adjust(fact, adjust, false);
        adjust[deriv] = -perturb;
        loParams.Adjust(fact, adjust, false);

        //var perturbed = this.InsertPerturb(deriv);

        var zHi = hiParams.InverseTransformFromStepsFromTop(Sa, Sb, Sc);
        var zLo = loParams.InverseTransformFromStepsFromTop(Sa, Sb, Sc);

        //debugger;
        return (zHi - zLo) / (2 * 0.2);
    }

    ComputeDerivative(deriv, ha, hb, hc)
    {
        var perturbed = this.InsertPerturb(deriv);

        var zHi = perturbed[0].InverseTransform(ha, hb, hc);
        var zLo = perturbed[1].InverseTransform(ha, hb, hc);

        //debugger;
        return (zHi - zLo) / (2 * 0.2);
    }

    // Make the average of the endstop adjustments zero, or make all emndstop corrections negative, without changing the individual homed carriage heights
    NormaliseEndstopAdjustments()
    {
        var eav = Math.min.apply(null, this.EndStopOffset);
        this.EndStopOffset = this.EndStopOffset.map(v => v - eav);
        this.Height += eav;
        this.homedCarriageHeight += eav;
        return eav;
    }

    // Perform 3, 4, 6 or 7-factor adjustment.
    // The input vector contains the following parameters in this order:
    //  X, Y and Z endstop adjustments
    //  If we are doing 4-factor adjustment, the next argument is the delta radius. Otherwise:
    //  X tower X position adjustment
    //  Y tower X position adjustment
    //  Z tower Y position adjustment
    //  Diagonal rod length adjustment
    Adjust(factors, v, norm)
    {
        //var oldCarriageHeightA = this.homedCarriageHeight + this.EndStopOffset[AlphaTower]; // save for later
        var endStopNormal = 0;
        var oldConeHeightAlpha = this.Transform([0, 0, 0], AlphaTower);
                        //debugger;

        // Update endstop adjustments
        var i = 0;

        if (factors[0]) this.EndStopOffset[AlphaTower] += v[i++];
        if (factors[1]) this.EndStopOffset[BetaTower] += v[i++];
        if (factors[2]) this.EndStopOffset[GammaTower] += v[i++];
        if (factors[3]) this.Radius += v[i++];
        if (factors[4]) this.TowerOffset[AlphaTower] += v[i++];
        if (factors[5]) this.TowerOffset[BetaTower] += v[i++];
        if (factors[6]) this.DiagonalRod += v[i++];
        if (factors[7]) this.StepsPerUnit[AlphaTower] += v[i++];
        if (factors[8]) this.StepsPerUnit[BetaTower] += v[i++];
        if (factors[9]) this.StepsPerUnit[GammaTower] += v[i++];
        if (factors[10]) this.Height += v[i++];

        if (norm) {
            endStopNormal = this.NormaliseEndstopAdjustments();
        }
        this.RecomputeGeometry();

        
        // Adjusting the diagonal and the tower positions affects the homed carriage height.
        // We need to adjust Height to allow for this, to get the change that was requested in the endstop corrections.
        /*var heightError = this.homedCarriageHeight + this.EndStopOffset[AlphaTower] - oldCarriageHeightA - v[0];
        this.Height -= heightError;
        this.homedCarriageHeight -= heightError;*/

        var heightError = this.Transform([0, 0, 0], AlphaTower) - oldConeHeightAlpha;
       // this.Height -= heightError;
        this.RecomputeGeometry();        
    }
}

function DebugPrint(s) {
    if (debug) {
        console.log(s);
    }
}

function PrintVector(label, v) {
    var rslt = label + ": {";
    for (var i = 0; i < v.length; ++i) {
        rslt += v[i].toFixed(4);
        if (i + 1 != v.length) {
            rslt += ", ";
        }
    }
    rslt += "}";
    return rslt;
}

function DoDeltaCalibration(currentGeometry, probedPoints, factors) {
    var numFactors = 0;
    for (var i = 0; i < 10; i++)
        if (factors[i])
            numFactors++;

    if (numFactors != 3 && numFactors != 4 && numFactors != 6 && numFactors != 7 && numFactors !=10) {
       // throw "Error: " + numFactors + " factors requested but only 3, 4, 6 and 7, 10 supported";
    }
    var numPoints = probedPoints.length;

    if (numFactors > numPoints) {
        throw "Error: need at least as many points as factors you want to calibrate";
    }

    // Transform the probing points to motor endpoints and store them in a matrix, so that we can do multiple iterations using the same data
    var probedCarriagePositions = new Matrix(numPoints, 3);
    var corrections = new Array(numPoints);
    var initialSumOfSquares = 0.0;
    for (var i = 0; i < numPoints; ++i) {
        corrections[i] = 0.0;
        var machinePos = [probedPoints[i][XAxis], probedPoints[i][YAxis], 0.0];

        probedCarriagePositions.data[i][0] = currentGeometry.CarriageStepsFromTop(machinePos, 0);
        probedCarriagePositions.data[i][1] = currentGeometry.CarriageStepsFromTop(machinePos, 1);
        probedCarriagePositions.data[i][2] = currentGeometry.CarriageStepsFromTop(machinePos, 2);

        initialSumOfSquares += fsquare(probedPoints[i][ZAxis]);
    }

    DebugPrint(probedCarriagePositions.Print("Motor positions:"));

    // Do 1 or more Newton-Raphson iterations
    var initialRms = Math.sqrt(initialSumOfSquares / numPoints);
    var previousRms = initialRms;
    var iteration = 0;
    var expectedRmsError;
    for (;;) {
        // Build a Nx7 matrix of derivatives with respect to xa, xb, yc, za, zb, zc, diagonal.
        var derivativeMatrix = new Matrix(numPoints, numFactors);
        for (var i = 0; i < numPoints; ++i) {
            var j = 0;
            for (var k = 0; k < 10; k++) {
                if (factors[k]) {
                    derivativeMatrix.data[i][j++] =
                        currentGeometry.ComputeDerivativeFromStepsFromTop(factors, numFactors, k, probedCarriagePositions.data[i][0], probedCarriagePositions.data[i][1], probedCarriagePositions.data[i][2]);
                }
            }
        }
        //debugger;
        DebugPrint(derivativeMatrix.Print("Derivative matrix:"));

        // Now build the normal equations for least squares fitting
        var normalMatrix = new Matrix(numFactors, numFactors + 1);
        for (var i = 0; i < numFactors; ++i) {
            for (var j = 0; j < numFactors; ++j) {
                var temp = 0; 
                for (var k = 0; k < numPoints; ++k) {
                    temp += derivativeMatrix.data[k][i] * derivativeMatrix.data[k][j];
                }
                normalMatrix.data[i][j] = temp;
            }
            var temp = 0; 
            for (var k = 0; k < numPoints; ++k) {
                temp += derivativeMatrix.data[k][i] * -(probedPoints[k][ZAxis] + corrections[k]);
            }
            normalMatrix.data[i][numFactors] = temp;
        }

        DebugPrint(normalMatrix.Print("Normal matrix:"));

        var solution = [];
        normalMatrix.GaussJordan(solution, numFactors);
        
        for (var i = 0; i < numFactors; ++i) {
            if (isNaN(solution[i])) {
                throw "Unable to calculate corrections. Please make sure the bed probe points are all distinct.";
            }
        }

        DebugPrint(normalMatrix.Print("Solved matrix:"));

        if (debug) {
            DebugPrint(PrintVector("Solution", solution));

            // Calculate and display the residuals
            var residuals = [];
            for (var i = 0; i < numPoints; ++i) {
                var r = probedPoints[i][ZAxis];
                for (var j = 0; j < numFactors; ++j) {
                    r += solution[j] * derivativeMatrix.data[i][j];
                }
                residuals.push(r);
            }
            DebugPrint(PrintVector("Residuals", residuals));
        }

        currentGeometry.Adjust(factors, solution, normalise);

        // Calculate the expected probe heights using the new parameters
        {
            var expectedResiduals = new Array(numPoints);
            var sumOfSquares = 0.0;
            for (var i = 0; i < numPoints; ++i) {
               // for (var tower = 0; tower < 3; ++tower) {
                    //probedCarriagePositions.data[i][tower] += solution[tower];
                //}
                var newZ = currentGeometry.InverseTransformFromStepsFromTop(probedCarriagePositions.data[i][0], probedCarriagePositions.data[i][1], probedCarriagePositions.data[i][2]);
                corrections[i] = newZ;
                expectedResiduals[i] = probedPoints[i][ZAxis] + newZ;
                sumOfSquares += fsquare(expectedResiduals[i]);
            }

            expectedRmsError = Math.sqrt(sumOfSquares/numPoints);
            DebugPrint(PrintVector("Expected probe error", expectedResiduals));
            console.log("Iteration " + iteration + " delta rms " + (expectedRmsError < previousRms ? "-" : "+") + Math.log10(Math.abs(expectedRmsError - previousRms)) + " improvement on initial " + (expectedRmsError - initialRms));
            previousRms = expectedRmsError;
        }

        // Decide whether to do another iteration Two is slightly better than one, but three doesn't improve things.
        // Alternatively, we could stop when the expected RMS error is only slightly worse than the RMS of the residuals.
        ++iteration;
        if (iteration == 20) { break; }
    }

    return "Calibrated " + numFactors + " factors using " + numPoints + " points, deviation before " + Math.sqrt(initialSumOfSquares/numPoints)
            + " after " + expectedRmsError;
}



// End
