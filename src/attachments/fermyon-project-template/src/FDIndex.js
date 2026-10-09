export default {
    async fetch(request, env) {
        console.log("request", request, "env", env);
        console.log("globalKeys", JSON.stringify(Object.getOwnPropertyNames(globalThis), null, 2));
        return new Response('<h1>project-template</h1>', {
            status: 200, headers: {
                'Content-Type': 'text/html; charset=utf-8'
            }
        });
    },
};