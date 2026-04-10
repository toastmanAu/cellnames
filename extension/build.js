import esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const ctx = await esbuild.context({
  entryPoints: {
    'background': 'src/background.js',
    'resolve':    'src/resolve.js',
  },
  bundle: true,
  outdir: 'dist',
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  minify: false,
  sourcemap: false,
});

if (watch) {
  await ctx.watch();
  console.log('watching...');
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('built');
}
