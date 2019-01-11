/*
 * View model for OctoPrint-LSqDeltaCalibration
 *
 * Author: Fabio Santos
 * License: AGPLv3
 */
$(function() {
    function LsqdeltacalibrationViewModel(parameters) {
        var self = this;

        // assign the injected parameters, e.g.:
        // self.loginStateViewModel = parameters[0];
        self.settingsViewModel = parameters[0];

        self.geometry = ko.observable(
            {
                StepsPerUnit: [],
                EndStopOffset: [0, 0, 0],
                TowerOffset: [0, 0, 0],
                RodLength: undefined,
                DeltaRadius: undefined,
                MaxHeight: undefined
            });

        self.logText = ko.observable(undefined);

        self.isFetchingGeometry = false;
        self.isProbing = false;
        self.probePoints = [];

        // buttons
        self.fetchGeometry = function () { fetchGeometry(self) };

        self.probeBed = function () {
            self.isProbing = true;
            OctoPrint.control.sendGcode("G29.1 P1 I500", null);
        }

        //hooks
        self.fromCurrentData = function (data)
        {
            self.logText(data.logs);
            parseResponse(data.logs, self);
        }

    }

    function parseResponse(logLines, self)
    {
        stepsPerUnitRegex = /M92 X(-?\d+\.?\d*) Y(-?\d+\.?\d*) Z(-?\d+\.?\d*)/g;
        endStopOffsetRegex = /M666 X(-?\d+\.?\d*) Y(-?\d+\.?\d*) Z(-?\d+\.?\d*)/g;
        towerOffsetRegex = /M665 .*D(-?\d+\.?\d*) E(-?\d+\.?\d*) H(-?\d+\.?\d*)/g;
        rodLenAndRadiusRegex = /M665 .*L(-?\d+\.?\d*) R(-?\d+\.?\d*)/g;
        maxHeightRegex = /M665 .*Z(-?\d+\.?\d*)/g;
        probePointRegex = /PROBE: X(-?\d+\.?\d*), Y(-?\d+\.?\d*), Z(-?\d+\.?\d*)/g;

        var newGeometry = self.geometry();
        for (var i = 0; i < logLines.length; i++) {

            if (self.isFetchingGeometry) {
                if (match = stepsPerUnitRegex.exec(logLines[i])) {
                    newGeometry.StepsPerUnit = [match[1], match[2], match[3]];
                }

                if (match = endStopOffsetRegex.exec(logLines[i])) {
                    newGeometry.EndStopOffset = [match[1], match[2], match[3]];
                }

                if (match = towerOffsetRegex.exec(logLines[i])) {
                    newGeometry.TowerOffset = [match[1], match[2], match[3]];
                }

                if (match = rodLenAndRadiusRegex.exec(logLines[i])) {
                    newGeometry.RodLength = match[1];
                    newGeometry.DeltaRadius = match[2];
                }

                if (match = maxHeightRegex.exec(logLines[i])) {
                    newGeometry.MaxHeight = match[1];
                }
            }

            if (self.isProbing) {
                if (match = probePointRegex.exec(logLines[i])) {
                    self.probePoints.push(match);
                }
            }

            if (logLines[i] == "Recv: ok") {
                self.logText(self.probePoints);
                plotSurface(self.probePoints);
            }

        }
        if (self.isFetchingGeometry) {
            self.geometry(newGeometry);
        }
    }

    function fetchGeometry(self) {
        self.isFetchingGeometry = true;
        OctoPrint.control.sendGcode("M503", null);
    }

    function request(type, command, args, successCb) {
        var data = function data() {
            if (command && args) return JSON.stringify({ command: command, args: args });
            if (command) return JSON.stringify({ command: command });
        };
        $.ajax({
            url: '/api' + PLUGIN_BASEURL + 'LSqDeltaCalibration',
            type: type,
            dataType: 'json',
            data: data(),
            contentType: 'application/json; charset=UTF-8',
            success: function success(data) {
                if (successCb) successCb(data);
            }
        });
    }


    function plotSurface(points) {
        var surfacePlotDiv = document.getElementById("surfacePlotDiv");
        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff);
        var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);

        var renderer = new THREE.WebGLRenderer();

        renderer.setSize(surfacePlotDiv.clientWidth, surfacePlotDiv.clientHeight);
        if (surfacePlotDiv.firstChild) surfacePlotDiv.removeChild(surfacePlotDiv.firstChild);
        surfacePlotDiv.appendChild(renderer.domElement);

        var geometry = new THREE.Geometry();

        for (var i = 0; i < points.length; ++i) {
            geometry.vertices.push(new THREE.Vector3(points[i][1],points[i][2],points[i][3]));
        }

        scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-.550, -.550, 0), 0.5, 0xff0000));
        scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-.550, -.550, 0), 0.5, 0x00ff00));
        scene.add(new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(-.550, -.550, 0), 0.5, 0x0000ff));

        geometry.computeBoundingBox();
        var size = geometry.boundingBox.getSize();
        geometry.scale(1 / size.x, 1 / size.y, 0.3 / (size.z == 0 ? 1 : size.z));

        particles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xff0000, size: 0.025 }));
        scene.add(particles);

        var gridHelper = new THREE.GridHelper(1, 20, 0x000000, 0x000000);
        gridHelper.rotation.x = Math.PI / 2;

        camera.position.set(0, -5, 1);
        var controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.minDistance = 0;
        controls.maxDistance = 500;


        var animate = function () {
            requestAnimationFrame(animate);

            controls.update();
            renderer.render(scene, camera);
        };

        animate();

    }



    /* view model class, parameters for constructor, container to bind to
     * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
     * and a full list of the available options.
     */
    OCTOPRINT_VIEWMODELS.push({
        construct: LsqdeltacalibrationViewModel,
        // ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ...
        dependencies: [ /* "loginStateViewModel", */ "settingsViewModel" ],
        // Elements to bind to, e.g. #settings_plugin_LSqDeltaCalibration, #tab_plugin_LSqDeltaCalibration, ...
        elements: [ "#tab_plugin_LSqDeltaCalibration" ]
    });
});
