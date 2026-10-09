import FDIndex from './FDIndex.js';


addEventListener('fetch', event => {
    event.respondWith(FDIndex.fetch(event.request, event));
});