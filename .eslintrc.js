module.exports = {
    "parser": "babel-eslint",

    "env": {
        "node": true,
        "browser": true
    },

    "plugins": [
        "import"
    ],

    "extends": "google",
    "rules": {},
    "globals": {
        "__dirname": true,
        "require": true,
        "process": true,
        "ENV": true,
        "module": true
    }
};
