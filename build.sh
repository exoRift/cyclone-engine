mkdir docsite
rsync assets docsite/assets --files-from=assets/copylist.txt
jsdoc -c build/docs.json