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

# Tips

* Start by running with the simulated printer first to see how things work, it won't send anything to your machine.
* A repeatable probe is essential.
* Repeatable end stops are very important, stepper phase homing is ideal. (I've recently added that to Marlin, look for TMC_HOME_PHASE)
* The bed must be very flat, borosilicate, or aluminum with fused pcb, or pcb should work fine, magnet mats and textured covers may introduce too much fluctuation.
* Tune down the max acceleration for best repeatability.
* Some geometry factors may be dependent or correlated so they can't be calibrated together, the ui will try to enforce what is possible.
* Not all firmware flavors support individual adjustment for arm lengths and tower radius, some don't support automated setting of them and need to recompile.
* More points will make calibration to offset probe noise and converge faster, 7 is too little, 50 is a good number, 500 things start to get slow, 5000 will take a while to complete and not be much better than 500.
* When probing a flat target, steps per unit errors are ambiguous to radius and arm length. I suggest you use a machinist dial to calibrate steps per unit then calibrate the other geometry factors.
* Belts significantly stretch and shrink with room temperature and humidity fluctuations, radius and arms lentgth won't change significantly, so if you see a drift on your bed flatness you can calibrate steps per unit daily without touching factors you know didn't change.
* This pugin is quite complex and use a non trivial ammount of resources on your browser, therefore I suggest disabling it when not in use(normal day to day printing).