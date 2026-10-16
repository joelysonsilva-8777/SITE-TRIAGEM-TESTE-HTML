const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
for (const app of ['medfast-web', 'medfast-desktop']) {
  const dest = path.join(root, app, 'public/assets');
  for (const name of ['mark.svg', 'heart.svg']) copy(path.join(root, 'assets/brand', name), path.join(dest, 'brand', name));
  copy(path.join(root, 'assets/brand/mark.svg'), path.join(dest, 'favicon.svg'));
  copy(path.join(root, 'assets/brand/mark.svg'), path.join(root, app, 'public/favicon.svg'));
  for (const name of ['Regular','Medium','SemiBold','Bold']) copy(path.join(root, 'assets/fonts', `Poppins-${name}.ttf`), path.join(dest, 'fonts', `Poppins-${name}.ttf`));
  copy(path.join(root, 'assets/fonts/poppins-OFL.txt'), path.join(dest, 'fonts/poppins-OFL.txt'));
  const css = fs.readFileSync(path.join(root, 'assets/css/brand.css'), 'utf8').replaceAll("url('../fonts/", "url('/assets/fonts/");
  fs.writeFileSync(path.join(root, app, 'src/styles/brand.css'), css);
}
copy(path.join(root, 'assets/brand/mark.svg'), path.join(root, 'assets/favicon.svg'));
copy(path.join(root, 'assets/brand/mark.svg'), path.join(root, 'medfast-native/assets/medfast.svg'));
for (const name of ['Regular','Medium','SemiBold','Bold']) copy(path.join(root, 'assets/fonts', `Poppins-${name}.ttf`), path.join(root, 'medfast-native/assets/fonts', `Poppins-${name}.ttf`));
copy(path.join(root, 'assets/fonts/poppins-OFL.txt'), path.join(root, 'medfast-native/assets/fonts/poppins-OFL.txt'));
console.log('Identidade MedFast sincronizada nos quatro aplicativos.');
