import { handleGatheringSite } from './gathering-site.js';

export default {
  async fetch(request, env) {
    return await handleGatheringSite(request, env) || new Response('Not found.', { status: 404 });
  }
};
