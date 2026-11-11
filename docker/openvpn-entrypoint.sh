#!/bin/bash
set -e

cd /etc/openvpn

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward 2>/dev/null || true

# Set up NAT (same as kylemanna image)
iptables -t nat -C POSTROUTING -s 192.168.255.0/24 -o eth0 -j MASQUERADE 2>/dev/null || \
    iptables -t nat -A POSTROUTING -s 192.168.255.0/24 -o eth0 -j MASQUERADE

echo "Starting OpenVPN..."
exec openvpn --config /etc/openvpn/openvpn.conf \
    --client-config-dir /etc/openvpn/ccd \
    --crl-verify /etc/openvpn/crl.pem
