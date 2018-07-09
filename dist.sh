mkdir dist || true

alias babel="npm-exec babel-cli"

$(npm bin)/babel jstoxmlparser.js --out-file dist/jstoxmlparser.js
$(npm bin)/uglifyjs dist/jstoxmlparser.js -ecma=5 -o dist/jstoxmlparser-min.js