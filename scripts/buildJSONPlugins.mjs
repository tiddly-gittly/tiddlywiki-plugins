await $`
cd ${path.join(__dirname, '..', 'dist')} && \
npx cross-env \
    TIDDLYWIKI_PLUGIN_PATH='./plugins' \
    TIDDLYWIKI_THEME_PATH='./themes' \
    TIDDLYWIKI_LANGUAGE_PATH='./languages' \
    npx tiddlywiki . \
    --makelibrary $:/UpgradeLibrary \
    --savelibrarytiddlers $:/UpgradeLibrary '[prefix[$:/plugins/linonetwo/]] [prefix[$:/themes/linonetwo/]]' ./
`;
