// Delta calibration script

var debug = false;

const degreesToRadians = Math.PI / 180.0;
const XAxis = 0;
const YAxis = 1;
const ZAxis = 2;
const AlphaTower = 0;
const BetaTower = 1;
const GammaTower = 2;
const MaxFactors = 11;
const AllTowers = [AlphaTower, BetaTower, GammaTower];


function fsquare(x) {
    return x * x;
}

class Matrix
{
    constructor(rows, cols) {
        this.data = new Array(rows);
        for (var i = 0; i < rows; ++i) 
            this.data[i] = (new Array(cols)).fill(0.0);
    }

    SwapRows(i, j, numCols) {
        if (i !== j) {
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
}


class DeltaGeometry
{
    constructor(diagonalRod = 0, radius = 0, height = 0, endStopOffset = [0,0,0], towerOffset = [0,0,0], stepsPerUnit = [0,0,0])
    {
        this.DiagonalRod = diagonalRod;
        this.Radius = radius;
        this.EndStopOffset = endStopOffset.slice();
        this.TowerOffset = towerOffset.slice();
        this.StepsPerUnit = stepsPerUnit.slice();
        this.Height = height + this.NormaliseEndstopAdjustments();
        this.TrimSteps = AllTowers.map(tower => endStopOffset[tower] * stepsPerUnit[tower]);
        

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

        this.TowerHeightSteps = AllTowers.map(tower => (
            this.EndStopOffset[tower] +         // height from endstop to home position in mm
            this.Height +                       // height from home to carriage at touch in mm
            this.CarriagemmFromBottom([0, 0, 0], tower))   // height from carriage at touch to bed in mm
            * this.StepsPerUnit[tower]);        // convert to steps
    }

    GetCarriagePosition(position) {
        return AllTowers.map(tower => this.CarriageStepsFromTop(position, tower));
    }

    CarriageStepsFromTop(position, tower)
    {
        var fromBottom = this.CarriagemmFromBottom(position, tower) * this.StepsPerUnit[tower];
        return this.TowerHeightSteps[tower] - fromBottom;
    }

    CarriagemmFromBottom(machinePos, tower)
    {
        return machinePos[ZAxis] + Math.sqrt(this.D2 - fsquare(machinePos[XAxis] - this.towerPositions[tower][XAxis]) - fsquare(machinePos[YAxis] - this.towerPositions[tower][YAxis]));
    }

    GetZ(carriagePositions) {
        var Ha = (this.TowerHeightSteps[AlphaTower] - carriagePositions[AlphaTower]) / this.StepsPerUnit[AlphaTower];
        var Hb = (this.TowerHeightSteps[BetaTower] - carriagePositions[BetaTower]) / this.StepsPerUnit[BetaTower];
        var Hc = (this.TowerHeightSteps[GammaTower] - carriagePositions[GammaTower]) / this.StepsPerUnit[GammaTower];
        return this.GetZFromMm(Ha, Hb, Hc);
    }

    GetZFromMm(Ha, Hb, Hc)
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

    
    ComputeDerivative(factor, carriagePositions)
    {
        var perturb = 0.2;         // perturbation amount in mm or degrees
        var hiParams = new DeltaGeometry(this.DiagonalRod, this.Radius, this.Height, this.EndStopOffset, this.TowerOffset, this.StepsPerUnit);
        var loParams = new DeltaGeometry(this.DiagonalRod, this.Radius, this.Height, this.EndStopOffset, this.TowerOffset, this.StepsPerUnit);
        var adjust = Array(MaxFactors).fill(0.0);
        var factorMap = Array(MaxFactors).fill(true);

        adjust[factor] = perturb;
        hiParams.Adjust(factorMap, adjust, true, false);

        adjust[factor] = -perturb;
        loParams.Adjust(factorMap, adjust, true, false);

        var zHi = hiParams.GetZ(carriagePositions);
        var zLo = loParams.GetZ(carriagePositions);

        return (zHi - zLo) / (2 * perturb);
    }

    // Make the average of the endstop adjustments zero, or make all emndstop corrections negative, without changing the individual homed carriage heights
    NormaliseEndstopAdjustments()
    {
        var eav = Math.min.apply(null, this.EndStopOffset);
        this.EndStopOffset = this.EndStopOffset.map(v => v - eav);
        //this.Height += eav;
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
    Adjust(factors, v, norm, adjustHeight = false)
    {
        var stepsToTouch = this.GetCarriagePosition([0, 0, 0]);
        /*
        var touch = [0, 0, 0];
        var carriageHeightsOnTouch = AllTowers.map(tower => this.CarriagemmFromBottom(touch, tower));
        var heightError = this.GetZFromMm(carriageHeightsOnTouch[0] + v[0], carriageHeightsOnTouch[1] + v[1], carriageHeightsOnTouch[2] + v[2]);
        //if(adjustHeight)
           // this.Height -= heightError;
            */
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
            this.NormaliseEndstopAdjustments();
        }
        this.RecomputeGeometry();
        
        var heightError = this.GetZ(stepsToTouch);
        
        this.Height += heightError;
        this.RecomputeGeometry();
        
    }
}

function DebugPrint(s) {
    if (debug) {
        console.log(s);
    }
}

function DoDeltaCalibration(currentGeometry, probedPoints, factors) {
    var numFactors = 0;
    for (var i = 0; i < MaxFactors; i++)
        if (factors[i])
            numFactors++;

    var numPoints = probedPoints.length;

    if (numFactors > numPoints) {
        throw "Error: need at least as many points as factors you want to calibrate";
    }

    // Transform the probing points to motor endpoints and store them in a matrix, so that we can do multiple iterations using the same data
    var probedCarriagePositions = probedPoints.map(point => currentGeometry.GetCarriagePosition([point[XAxis], point[YAxis], 0.0]));
    var corrections = new Array(numPoints).fill(0.0);
    var initialSumOfSquares =  probedPoints.reduce((acc, val) => acc += fsquare(val[ZAxis]), 0.0);
    
    // Do 1 or more Newton-Raphson iterations
    var initialRms = Math.sqrt(initialSumOfSquares / numPoints);
    var previousRms = initialRms;
    var iteration = 0;
    var expectedRmsError;
    var bestRmsError = initialRms;
    var bestGeometry;
    for (;;) {
        // Build a Nx7 matrix of derivatives with respect to xa, xb, yc, za, zb, zc, diagonal.
        var derivativeMatrix = new Matrix(numPoints, numFactors);
        for (var i = 0; i < numPoints; ++i) {
            var j = 0;
            for (var k = 0; k < MaxFactors; k++) {
                if (factors[k]) {
                    derivativeMatrix.data[i][j++] =
                        currentGeometry.ComputeDerivative(k, probedCarriagePositions[i]);
                }
            }
        }

        DebugPrint(derivativeMatrix);

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

        var solution = [];
        normalMatrix.GaussJordan(solution, numFactors);
        
        for (var i = 0; i < numFactors; ++i) {
            if (isNaN(solution[i])) {
                throw "Unable to calculate corrections. Please make sure the bed probe points are all distinct.";
            }
        }

        if (debug) {
            // Calculate and display the residuals
            var residuals = [];
            for (var i = 0; i < numPoints; ++i) {
                var r = probedPoints[i][ZAxis];
                for (var j = 0; j < numFactors; ++j) {
                    r += solution[j] * derivativeMatrix.data[i][j];
                }
                residuals.push(r);
            }
        }

        currentGeometry.Adjust(factors, solution, true, true);

        // Calculate the expected probe heights using the new parameters
        {
            var expectedResiduals = new Array(numPoints);
            var sumOfSquares = 0.0;
            for (var i = 0; i < numPoints; ++i) {
                var newZ = currentGeometry.GetZ(probedCarriagePositions[i]);
                corrections[i] = newZ;
                expectedResiduals[i] = probedPoints[i][ZAxis] + newZ;
                sumOfSquares += fsquare(expectedResiduals[i]);
            }

            expectedRmsError = Math.sqrt(sumOfSquares/numPoints);
            console.log("Iteration " + iteration + " delta rms " + (expectedRmsError < previousRms ? "-" : "+") + Math.log10(Math.abs(expectedRmsError - previousRms)) + " improvement on initial " + (expectedRmsError - initialRms) + " improvement on baseline:" + (expectedRmsError - 0.01839501877423555));
            previousRms = expectedRmsError;
        }

        // Decide whether to do another iteration Two is slightly better than one, but three doesn't improve things.
        // Alternatively, we could stop when the expected RMS error is only slightly worse than the RMS of the residuals.
        if (expectedRmsError < bestRmsError) {
            bestRmsError = expectedRmsError;
            bestGeometry = new DeltaGeometry(currentGeometry.DiagonalRod, currentGeometry.Radius, currentGeometry.Height, currentGeometry.EndStopOffset, currentGeometry.TowerOffset, currentGeometry.StepsPerUnit);
            iteration = 0;
        }

        ++iteration;
        if (iteration == 20) { break; }
    }
    console.log("Calibrated " + numFactors + " factors using " + numPoints + " points, deviation before " + Math.sqrt(initialSumOfSquares/numPoints) + " after " + bestRmsError);          

    return bestGeometry;
}



// End
