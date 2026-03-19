// ==============================================
// TEST - Správna syntax pre dialog()
// ==============================================
// Podľa oficiálnej Memento dokumentácie:
// https://scripts.mementodatabase.com/script_api/messages/
// ==============================================

// SPRÁVNA syntax pre dialog v Memento Database:
dialog()
    .title("Test Dialog - Správna Syntax")
    .text("Ak vidíš tento dialog, používam SPRÁVNU Memento API syntax! ✅\n\nBuilder pattern s method chaining.")
    .positiveButton("Super!", function() {
        message("Dialog funguje perfektne! ✅");
        return true;  // Zatvorí dialog
    })
    .show();
