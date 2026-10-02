const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) { 
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
let count = 0;
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;
    
    // Fix missing backtick at start: fetch(${...} -> fetch(`${...}
    content = content.replace(/fetch\(\$\{import/g, 'fetch(`${import');
    
    // Fix mismatched quotes at end: /societies') -> /societies`)
    content = content.replace(/(\{\s*import\.meta\.env\.VITE_API_URL[^}]*\}[\/a-zA-Z0-9_-]+)(\'|\")\)/g, '$1`)');
    
    // Also handle cases with query params or headers
    content = content.replace(/(\{\s*import\.meta\.env\.VITE_API_URL[^}]*\}[\/a-zA-Z0-9_\-\?&=]+)(\'|\")(\s*,)/g, '$1`$3');

    // Mismatched quotes for string concatenation: fetch(`${import.meta.env.VITE_API_URL || '/api'}/societies")
    content = content.replace(/(\{\s*import\.meta\.env\.VITE_API_URL[^}]*\}[\/a-zA-Z0-9_\-\?&=]+)(\")\)/g, '$1`)');

    if (content !== original) {
        fs.writeFileSync(f, content, 'utf8');
        console.log('Fixed', f);
        count++;
    }
});
console.log('Total fixed:', count);
