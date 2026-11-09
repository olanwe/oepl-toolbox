// Produce one directly openable HTML file; no network dependencies at runtime.
const fs = require('node:fs');
const path = require('node:path');
const destination = process.argv[2] || path.join(__dirname, 'dist', 'oepl-toolbox.html');
let html = fs.readFileSync(path.join(__dirname, 'img2vlw.html'), 'utf8');
html = html.replace('href="img2vlw.html"', 'href="#"');
html = html.replace('<link rel="stylesheet" href="style.css">', () => '<style>\n' + fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8') + '\n</style>');
html = html.replace(/<script defer src="([^"]+)"><\/script>/g, (_, filename) => '<script>\n' + fs.readFileSync(path.join(__dirname, filename), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>');
html = html.replace('<script src="js/theme.js" data-theme-init></script>', () => '<script data-theme-init>\n' + fs.readFileSync(path.join(__dirname, 'js/theme.js'), 'utf8') + '\n</script>');
// Inline scripts must run after the DOM has been parsed.
const scripts = [];
html = html.replace(/<script>[\s\S]*?<\/script>/g, script => { scripts.push(script); return ''; });
html = html.replace('</body>', () => scripts.join('\n') + '\n</body>');
html = '<!-- OEPL-Toolbox, formerly img2vlw; JPEG encoder jpeg-js 0.4.4, Copyright Andreas Ritter / Eugene Ware, BSD-3-Clause. See source archive vendor/jpeg-js.LICENSE. -->\n' + html;
const license = fs.readFileSync(path.join(__dirname, 'vendor/jpeg-js.LICENSE'), 'utf8');
const originalLicense = fs.readFileSync(path.join(__dirname, 'LICENSE'), 'utf8');
html = html.replace('</body>', () => '<!-- img2vlw by Oliver Weyhmüller; Studio extension 2026. GPL-3.0.\n' + originalLicense.replace(/--/g, '—') + '\nThird-party license\n' + license.replace(/--/g, '—') + '\n-->\n</body>');
fs.mkdirSync(path.dirname(path.resolve(destination)), {recursive: true});
fs.writeFileSync(destination, html, 'utf8');
console.log('Saved: ' + path.resolve(destination));
