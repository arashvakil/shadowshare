#!/bin/sh
# /var/run is tmpfs — recreate mita socket dir on every start
mkdir -p /var/run/mita
# mita run starts the daemon in foreground, auto-reads config from /etc/mita/
exec mita run
