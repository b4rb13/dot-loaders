// Lets `bun test` import the built .svelte components, compiled for the
// server the way SvelteKit compiles them.
import { plugin } from 'bun';
import { compile, compileModule } from 'svelte/compiler';

plugin({
  name: 'svelte',
  setup(build) {
    build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => ({
      contents: compile(await Bun.file(path).text(), {
        filename: path,
        generate: 'server',
      }).js.code,
      loader: 'js',
    }));
    build.onLoad({ filter: /\.svelte\.js$/ }, async ({ path }) => ({
      contents: compileModule(await Bun.file(path).text(), {
        filename: path,
        generate: 'server',
      }).js.code,
      loader: 'js',
    }));
  },
});
