import FDIndex from '../FDIndex.js';

export default async (request, env) => {
    return FDIndex.fetch(request, env);
};