#!/bin/sh

CONFIG_PATH="/app/wwwroot/assets/config.json"

mkdir -p "$(dirname "$CONFIG_PATH")"

cat > "$CONFIG_PATH" <<EOF
{
  "apiUrl": "${API_URL}"
}
EOF

echo "Runtime config written: apiUrl=${API_URL}"

exec dotnet Ideahub.dll