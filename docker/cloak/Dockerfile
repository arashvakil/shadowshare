FROM alpine:3.19

ARG CK_VERSION=2.8.0

RUN apk add --no-cache curl && \
    curl -L -o /usr/local/bin/ck-server \
    "https://github.com/cbeuw/Cloak/releases/download/v${CK_VERSION}/ck-server-linux-amd64-v${CK_VERSION}" && \
    chmod +x /usr/local/bin/ck-server

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

VOLUME /etc/cloak
EXPOSE 443

ENTRYPOINT ["/entrypoint.sh"]
