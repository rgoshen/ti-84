// Build-time site configuration. These replace the old Docker `envsubst` runtime
// variables: values are read from `PUBLIC_*` environment variables when the static
// site is built (e.g. via the Docker build args) and baked into the output. Each
// has a safe fallback so `npm run build`/`npm run dev` work with no env set.
// https://docs.astro.build/en/guides/environment-variables/
export const SITE_TITLE_TI84 =
  import.meta.env.PUBLIC_SITE_TITLE_TI84 ?? 'TI-84 Calculator';

export const SITE_TITLE_GRAPHING =
  import.meta.env.PUBLIC_SITE_TITLE_GRAPHING ?? 'Graphing Calculator Online';

export const TI84_IFRAME_SRC =
  import.meta.env.PUBLIC_TI84_IFRAME_SRC ?? 'https://ti84calc.com/ti84calc';

export const THEME_DEFAULT = import.meta.env.PUBLIC_THEME_DEFAULT ?? 'dark';
