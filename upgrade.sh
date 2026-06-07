#!/bin/sh
set -eu

IMAGE="bitgarth/bitgarth:latest"
DEFAULT_NAME="bitgarth"
DEFAULT_PORT="8080"
DEFAULT_VOLUME="bitgarth-data"
DATA_DIR="/data"
NL='
'

trim_field() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

CID=$(docker ps -q --filter "ancestor=bitgarth/bitgarth" | head -1)
[ -z "$CID" ] && CID=$(docker ps -aq --filter "name=^bitgarth$" | head -1)

if [ -z "$CID" ]; then
  NAME="$DEFAULT_NAME"
  set -- -d --name "$NAME" -p "$DEFAULT_PORT:$DEFAULT_PORT" -v "$DEFAULT_VOLUME:$DATA_DIR"
  has_existing_container=0
else
  has_existing_container=1

  NAME=$(docker inspect --format '{{.Name}}' "$CID" | sed 's#^/##')
  [ -n "$NAME" ] || NAME="$DEFAULT_NAME"

  set -- -d --name "$NAME"

  restart_policy=$(docker inspect --format '{{.HostConfig.RestartPolicy.Name}}|{{.HostConfig.RestartPolicy.MaximumRetryCount}}' "$CID")
  restart_name=${restart_policy%%|*}
  restart_count=${restart_policy#*|}
  if [ -n "$restart_name" ] && [ "$restart_name" != "no" ]; then
    if [ "$restart_name" = "on-failure" ] && [ -n "$restart_count" ] && [ "$restart_count" != "0" ]; then
      set -- "$@" --restart "$restart_name:$restart_count"
    else
      set -- "$@" --restart "$restart_name"
    fi
  fi

  ports=$(docker inspect --format '{{range $port, $bindings := .NetworkSettings.Ports}}{{if $bindings}}{{range $bindings}}{{printf "%s|%s|%s\n" .HostIp .HostPort $port}}{{end}}{{end}}{{end}}' "$CID")
  old_ifs=$IFS
  IFS=$NL
  for line in $ports; do
    IFS=$old_ifs
    [ -n "$line" ] || continue
    host_ip=$(trim_field "${line%%|*}")
    rest=${line#*|}
    host_port=$(trim_field "${rest%%|*}")
    container_port=$(trim_field "${rest#*|}")
    [ -n "$host_port" ] || continue
    [ -n "$container_port" ] || continue
    if [ -n "$host_ip" ] && [ "$host_ip" != "0.0.0.0" ] && [ "$host_ip" != "::" ]; then
      set -- "$@" -p "$host_ip:$host_port:$container_port"
    else
      set -- "$@" -p "$host_port:$container_port"
    fi
    IFS=$NL
  done
  IFS=$old_ifs

  volumes=$(docker inspect --format '{{range .Mounts}}{{if eq .Type "volume"}}{{printf "%s|%s\n" .Name .Destination}}{{end}}{{end}}' "$CID")
  old_ifs=$IFS
  IFS=$NL
  for line in $volumes; do
    IFS=$old_ifs
    [ -n "$line" ] || continue
    volume_name=$(trim_field "${line%%|*}")
    destination=$(trim_field "${line#*|}")
    [ -n "$volume_name" ] || continue
    [ -n "$destination" ] || continue
    set -- "$@" -v "$volume_name:$destination"
    IFS=$NL
  done
  IFS=$old_ifs

  unsupported_mounts=$(docker inspect --format '{{range .Mounts}}{{if ne .Type "volume"}}{{println .Type ":" .Source " -> " .Destination}}{{end}}{{end}}' "$CID")
  if [ -n "$unsupported_mounts" ]; then
    echo "This container uses non-volume mounts that the automatic upgrade script will not replay safely:"
    echo "$unsupported_mounts"
    echo "Use the manual upgrade instructions at https://bitgarth.app/#install and add your mount flags explicitly."
    exit 1
  fi

  envs=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' "$CID")
  old_ifs=$IFS
  IFS=$NL
  for env_value in $envs; do
    IFS=$old_ifs
    case "$env_value" in
      BITGARTH_*|IP=*|PORT=*|RUST_LOG=*)
        set -- "$@" -e "$env_value"
        ;;
    esac
    IFS=$NL
  done
  IFS=$old_ifs
fi

set -- "$@" "$IMAGE"

echo "Pulling $IMAGE..."
docker pull "$IMAGE"

if [ "$has_existing_container" = "1" ]; then
  current_image=$(docker inspect --format '{{.Image}}' "$CID")
  latest_image=$(docker image inspect --format '{{.Id}}' "$IMAGE")
  is_running=$(docker inspect --format '{{.State.Running}}' "$CID")

  if [ "$current_image" = "$latest_image" ]; then
    if [ "$is_running" = "true" ]; then
      echo "BitGarth is already up to date. Open http://localhost:8080 or your configured host/port."
    else
      echo "BitGarth is already up to date. Starting $NAME..."
      docker start "$CID" >/dev/null
      echo "BitGarth is running. Open http://localhost:8080 or your configured host/port."
    fi
    exit 0
  fi

  echo "Stopping $NAME..."
  docker stop "$CID" >/dev/null

  echo "Removing old container..."
  docker rm "$CID" >/dev/null
else
  echo "No existing BitGarth container found. Installing $NAME..."
fi

echo "Starting BitGarth container..."
docker run "$@" >/dev/null

echo "BitGarth is running. Open http://localhost:8080 or your configured host/port."
