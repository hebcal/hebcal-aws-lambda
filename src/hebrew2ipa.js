// https://github.com/sventech/haaper
// GPL

var hebrew2ipa = {
    "\u05d0" : "ʔ" ,  // aleph
    "\u05d1\u05bc" : "b" ,  // bet + dagesh
    "\u05d1" : "v" ,  // vet
    "\u05d2" : "g" ,  // gimel
    "\u05d3" : "d" ,  // dalet
    "\u05d4" : "h" ,  // hey
    "\u05d5" : "v" ,  // vav
    "\u05d6" : "z" ,  // zayin
    "\u05d7" : "χ" ,  // khet
    "\u05d8" : "t" ,  // tet
    "\u05d9" : "j" ,  // yud
    "\u05dA" : "χ" ,  // final-kaf
    "\u05dA\u05bc" : "k" ,  // final-kaf + dagesh
    "\u05dB" : "χ" ,  // kaf
    "\u05dB\u05bc" : "k" ,  // kaf + dagesh
    "\u05dC" : "l" ,  // lamed
    "\u05dD" : "m" ,  // final-mem
    "\u05dE" : "m" ,  // mem
    "\u05dF" : "n" ,  // final-nun
    "\u05e0" : "n" ,  // nun
    "\u05e1" : "s" ,  // samekh
    "\u05e2" : "ʕ" ,  // ayin
    "\u05e3" : "f" ,  // final-pe
    "\u05e4" : "f" ,  // pe
    "\u05e4\u05bc" : "p" ,  // pe + dagesh
    "\u05e5" : "\u02A6" ,  // final-tsadi
    "\u05e6" : "\u02A6" ,  // tsadi
    "\u05e7" : "k" ,  // quf
    "\u05e8" : "\u0281" ,  // resh
    "\u05e9\u05c1" : "ʃ" , // shin w/dot
    "\u05e9\u05c2" : "s" , // sin  w/dot
    "\u05e9" :  "ʃ" , // shin / no dot
    "\u05eA" :  "t" , // tav

    // Points and punctuation
    "\u05b0" :     "Ø" ,      // shva / shewa (schwa)
    "\u05b1" :     "e" ,  // hateph-segol  '"E' (sh'va-E)
    "\u05b2" :     "a" ,  // hateph-patakh '"a' (sh'va-a)
    "\u05b3" :     "a" ,  // hateph-qamats '"A' (sh'va-A)
    "\u05b4" :     "i" ,      // hiriq
    "\u05b5" :     "e" ,      // tsere
    "\u05b6" :     "e" ,      // segol
    "\u05b7" :     "ä" ,      // patakh
    "\u05b8" :     "ä" ,      // qamats
    "\u05b9" :     "o" ,      // holam
    "\u05ba" :     "o" ,    // holam haser (Unicode 5.0)
    "\u05d5\u05b9"  :  "o" ,    // holam haser (Unicode 4.1)
    "\u05bb" :     "u" ,      // qubuts
    "\u05d5\u05bc" :     "u",       // Vav with shuruk
    "\u05c7" :     "o",     // HEBREW POINT QAMATS QATAN
    "\u05BE" : " ",
    "\u05bc" : "" // empty dagesh
};

function string_as_unicode_escape(input) {
    function pad_four(input) {
        var l = input.length;
        if (l == 0) return '0000';
        if (l == 1) return '000' + input;
        if (l == 2) return '00' + input;
        if (l == 3) return '0' + input;
        return input;
    }
    var output = '';
    for (var i = 0, l = input.length; i < l; i++)
        output += '\\u' + pad_four(input.charCodeAt(i).toString(16));
    return output;
}

var keyStrs = Object.keys(hebrew2ipa).sort(function(a, b) {
    return b.length - a.length;
});


var holidays = require('./holidays');

Object.keys(holidays.holidays).forEach(function (key) {
    var val = holidays.holidays[key];
    var ustr = string_as_unicode_escape(val);
    keyStrs.forEach(function(x) {
        val = val.replace(new RegExp(x, 'g'), hebrew2ipa[x]);
    });

    console.log("\"" + key + "\": \"" + val + "\",");
    // use val
});

