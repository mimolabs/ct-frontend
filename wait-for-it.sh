#!/bin/bash

set -e

hostname="$1"
shift
cmd="$@"

until $(curl --output /dev/null --silent --head --fail $hostname); do
  printf '.'
  sleep 5
done

>&2 echo "API is up - executing command"
exec $cmd
