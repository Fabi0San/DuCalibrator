# coding=utf-8
from __future__ import absolute_import

### (Don't forget to remove me)
# This is a basic skeleton for your plugin's __init__.py. You probably want to adjust the class name of your plugin
# as well as the plugin mixins it's subclassing from. This is really just a basic skeleton to get you started,
# defining your plugin as a template plugin, settings and asset plugin. Feel free to add or remove mixins
# as necessary.
#
# Take a look at the documentation on what other plugin mixins are available.

import octoprint.plugin

class LsqdeltacalibrationPlugin(octoprint.plugin.SettingsPlugin,
                                octoprint.plugin.AssetPlugin,
                                octoprint.plugin.TemplatePlugin,
								octoprint.plugin.SimpleApiPlugin):

    ##~~ SettingsPlugin mixin

    def get_settings_defaults(self):
        return dict(
            # put your plugin's default settings here
            cmdFetchSettings="M503",
            cmdSaveSettings="M500",
            cmdStepsPerUnit="M92",
            idsStepsPerUnit="XYZ",
            cmdEndStopOffset="M666",
            idsEndStopOffset="XYZ",         
            cmdDeltaConfig="M665",
            idsRadiusHeightRod="RHL",
            idsTowerAngleOffset="XYZ",
            idsRadiusOffset="ABC",
            idsRodLenOffset="IJK",
        )
   
    ##~~ AssetPlugin mixin
    def get_assets(self):
        # Define your plugin's asset files to automatically include in the
        # core UI here.
        return dict(
            js=["js/LSqDeltaCalibration.js","js/LeastSquares.js","js/three.js","js/TrackballControls.js", "js/trilateration.js"],
            css=["css/LSqDeltaCalibration.css"],
            less=["less/LSqDeltaCalibration.less"]
        )

    ##~~ Softwareupdate hook

    def get_update_information(self):
        # Define the configuration for your plugin to use with the Software Update
        # Plugin here. See https://github.com/foosel/OctoPrint/wiki/Plugin:-Software-Update
        # for details.
        return dict(
            LSqDeltaCalibration=dict(
                displayName="Lsqdeltacalibration Plugin",
                displayVersion=self._plugin_version,

                # version check: github repository
                type="github_release",
                user="Fabi0San",
                repo="OctoPrint-LSqDeltaCalibration",
                current=self._plugin_version,

                # update method: pip
                pip="https://github.com/Fabi0San/OctoPrint-LSqDeltaCalibration/archive/{target_version}.zip"
            )
        )

    def get_api_commands(self):
        return dict(
            command1=[],
            command2=["some_parameter"]
        )

    def on_api_command(self, command, data):
        import flask
        if command == "command1":
            parameter = "unset"
            if "parameter" in data:
                parameter = "set"
            self._logger.info("command1 called, parameter is {parameter}".format(**locals()))
        elif command == "command2":
            self._logger.info("command2 called, some_parameter is {some_parameter}".format(**data))

    def on_api_get(self, request):
        return flask.jsonify(foo="bar")


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "Delta Calibration"
__plugin_pythoncompat__ = ">=2.7,<4"

def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = LsqdeltacalibrationPlugin()
    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information
    }

