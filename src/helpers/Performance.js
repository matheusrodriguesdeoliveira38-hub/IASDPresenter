import $userdata from "@/helpers/UserData";

const CONFIG_PREFIX = "modules.config";

export default {
  isLightMode() {
    return $userdata.get(`${CONFIG_PREFIX}.light_mode`) === true;
  },

  optimizePresentations() {
    return this.isLightMode() && $userdata.get(`${CONFIG_PREFIX}.light_optimize_presentations`) !== false;
  },

  limitProjectionWindows() {
    return this.isLightMode() && $userdata.get(`${CONFIG_PREFIX}.light_limit_projection_windows`) !== false;
  },

  disableHardwareAcceleration() {
    return this.isLightMode() && $userdata.get(`${CONFIG_PREFIX}.light_disable_hardware_acceleration`) === true;
  },
};
