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
                StepsX: 0,
                StepsY: 0,
                StepsZ: 0
            });

        self.fetchGeometry = fetchGeometry;

        self.fromCurrentData = extractData;

        self.logText = ko.observable

    }

    function emitLog(data)
    {


    }

    function extractData(data)
    {
        probingInput = document.getElementById("rawProbingInput").value;
        regex = /.*?PROBE: X(.*?), Y(.*?), Z(.*?)\n/gm;

        var matches = [];
        var match;
        while (match = regex.exec(probingInput)) {
            matches.push(match);
        }
        document.getElementById("numPoints").value = matches.length;

    }

    function fetchGeometry() {
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
