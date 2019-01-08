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

        self.geometry = ko.observable({Prop : 5, str : "aa"});

        // TODO: Implement your plugin's view model here.
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
