#!/bin/sh
# Generate runtime-config.js from environment variables.
# This allows VITE_* env vars to be set at container startup (docker run -e ...)
# instead of being baked in at build time.

CONFIG_FILE=/usr/share/nginx/html/runtime-config.js

cat <<EOF > "$CONFIG_FILE"
window.__RUNTIME_CONFIG__ = {
  VITE_AUTH_ENABLED: "${VITE_AUTH_ENABLED:-}",
  VITE_OIDC_ISSUER: "${VITE_OIDC_ISSUER:-}",
  VITE_OIDC_CLIENT_ID: "${VITE_OIDC_CLIENT_ID:-}",
  VITE_OIDC_REDIRECT_URI: "${VITE_OIDC_REDIRECT_URI:-}",
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: "${VITE_OIDC_POST_LOGOUT_REDIRECT_URI:-}",
  VITE_OIDC_SCOPE: "${VITE_OIDC_SCOPE:-}",
};
EOF

exec nginx -g 'daemon off;'
