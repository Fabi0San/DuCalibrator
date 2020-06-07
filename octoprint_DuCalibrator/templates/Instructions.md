# Instructions

#### 1. **Perform initial calibration elsewhere.**
This plugin's main goal is to find micron level delta geometry parameters, so please perform initial delta calibration using other methods.

#### 2. **Configure settings**
Make sure to configure this plugin to your machine in OctoPrint's settings dialog.

#### 3. **Set Parameters**
Set the probing parameters.

#### 4. **Calibrate**
1. Fetch Geometry
2. Probe bed
3. Select calibration factors
4. Apply
5. Repeat from 2. until probed RMS stops converging
6. Pick best probing(lowest RMS) from "Probing history" and Apply & Save it to your machine.
