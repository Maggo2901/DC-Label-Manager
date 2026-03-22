#!/bin/sh
set -e

# Path to the access control file included by nginx.conf
ACCESS_FILE="/etc/nginx/conf.d/access_control.conf"
# Path to the htpasswd file (should be mounted via volume if auth is enabled)
HTPASSWD_FILE="/etc/nginx/.htpasswd"

echo "# Dynamic Access Control Configuration" > "$ACCESS_FILE"

# 1. IP Allowlist Logic
if [ "$ALLOWLIST_ENABLED" = "true" ]; then
    echo "Access Control: IP Allowlist ENABLED"
    echo "# IP Allowlist enabled" >> "$ACCESS_FILE"
    
    # IFS (Internal Field Separator) checks for comma separation
    # We replace commas with spaces to iterate
    IPS=$(echo "$ALLOWLIST_IPS" | tr ',' ' ')
    
    for ip in $IPS; do
        if [ -n "$ip" ]; then
            echo "allow $ip;" >> "$ACCESS_FILE"
            echo "Allowed IP: $ip"
        fi
    done
    
    # Deny everyone else
    echo "deny all;" >> "$ACCESS_FILE"
else
    echo "Access Control: IP Allowlist DISABLED"
fi

# 2. Basic Auth Logic
if [ "$AUTH_ENABLED" = "true" ]; then
    echo "Access Control: Basic Auth ENABLED"
    
    if [ ! -f "$HTPASSWD_FILE" ]; then
        echo "WARNING: AUTH_ENABLED is true but $HTPASSWD_FILE not found."
        echo "Please mount a valid .htpasswd file."
        # We fail open or close? Failing close is safer but might break boot.
        # Let's add auth directive anyway, Nginx might complain if file missing.
    fi

    echo "auth_basic \"Restricted Access\";" >> "$ACCESS_FILE"
    echo "auth_basic_user_file $HTPASSWD_FILE;" >> "$ACCESS_FILE"
else
    echo "Access Control: Basic Auth DISABLED"
fi

# Execute the CMD from Dockerfile
exec "$@"
