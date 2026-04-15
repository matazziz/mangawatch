export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      const rewritten = new Request(new URL("/pages/acceuil.html", url), request);
      return env.ASSETS.fetch(rewritten);
    }
    return env.ASSETS.fetch(request);
  },
};