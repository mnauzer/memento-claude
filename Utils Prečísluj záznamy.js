
var entries = lib().entries();

for (var i=0;i<entries.length;i++){
    var entry = entries[i];
    entry.set("ID", i+1);
}
