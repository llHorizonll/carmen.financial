const runtimeConfig = window.__CARMEN_CONFIG__ || {};

window.__CARMEN_CONFIG__ = {
  apiUrl: runtimeConfig.apiUrl || import.meta.env.VITE_CARMEN_API_URL || "",
  adminToken: runtimeConfig.adminToken || "",
  env: runtimeConfig.env || import.meta.env.MODE,
};
