FROM nginx:alpine

COPY *.html /usr/share/nginx/html_templates/
COPY docker-entrypoint.sh /docker-entrypoint.sh

RUN chmod +x /docker-entrypoint.sh && apk add --no-cache gettext

ENV HOST_PORT=8080 \
    SITE_TITLE_TI84="TI-84 Calculator" \
    SITE_TITLE_GRAPHING="Graphing Calculator Online" \
    THEME_DEFAULT="dark" \
    TI84_IFRAME_SRC="https://ti84calc.com/ti84calc"

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]