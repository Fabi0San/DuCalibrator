# Delta Micro Calibrator "ΔµCalibrator"
An [OctoPrint](https://octoprint.org/) Plugin for performing micro calibration in linear delta machines.

## Key features:
* Automatic probing
* Calibrates up to 18 geometry parameters 
* 3D visualization of probed points and estimated points after proposed calibration

![Screenshot](https://imgur.com/oT6HA8l.png)

## Requirements
* You must have a Z probe.
* The bed should be very flat. If not, consider dropping a boro glass on top of it just for the calibration and adjust height after glass is removed.
* Currently, only Marlin firmware is supported, other firmwares can be added with some community help. [Check this file](https://github.com/Fabi0San/DuCalibrator/blob/master/octoprint_DuCalibrator/static/js/DuCalMachine.js)


## Setup

Install via the bundled [Plugin Manager](https://docs.octoprint.org/en/master/bundledplugins/pluginmanager.html)
or manually using this URL:

    https://github.com/Fabi0San/DuCalibrator/archive/master.zip

## [Instructions](https://github.com/Fabi0San/DuCalibrator/blob/devel/octoprint_DuCalibrator/templates/Instructions.md)

## TODO
* Add Smoothieware support (missing M118(echo) command).
* Add XYZ probing using a 123 block as calibration target instead of assumedly flat bed for unambiguous calibration of all factors.

## Acknowledgements

I was originally inspired by the generous work of [David Crocker](https://github.com/dc42) on his [calibration calculator](https://escher3d.com/pages/wizards/wizarddelta.php) and 
[Gina Häußge](https://github.com/foosel) on [OctoPrint](https://github.com/OctoPrint/OctoPrint).


This plugin leverages [Three.js](https://threejs.org/) and [trilateration.js](https://github.com/gheja/trilateration.js).
