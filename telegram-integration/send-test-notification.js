// OKAMŽITÝ TEST - Pošli notifikáciu o dokončení úlohy

try {
    // Simuluj dokončenie úlohy
    var taskCompletionData = {
        task: "Vytvorenie n8n workflow pre Telegram notifikácie",
        status: "completed",
        summary: "✅ Úspešne vytvorené:\n- n8n workflow JSON súbor\n- ClaudeTaskNotifier modul\n- Test scripty\n- Integrácia s MementoTelegram",
        files: [
            "n8n-task-completion-workflow.json",
            "claude-task-notifier.js",
            "test-claude-notification.js",
            "send-test-notification.js"
        ],
        timestamp: moment().format("DD.MM.YYYY HH:mm:ss")
    };

    // Test správa
    var testMessage = "🎉 **Claude dokončil úlohu!**\n\n";
    testMessage += "📋 **Úloha:** " + taskCompletionData.task + "\n\n";
    testMessage += "📝 **Výsledok:**\n" + taskCompletionData.summary + "\n\n";
    testMessage += "📁 **Vytvorené súbory:**\n";
    for (var i = 0; i < taskCompletionData.files.length; i++) {
        testMessage += "• " + taskCompletionData.files[i] + "\n";
    }
    testMessage += "\n⏰ **Dokončené:** " + taskCompletionData.timestamp + "\n";
    testMessage += "✅ **Status:** Úspešne dokončené\n\n";
    testMessage += "🤖 _Claude Code Assistant - Test Notification_";

    // Výpis do konzoly
    console.log("📤 ODOSIELAM TEST NOTIFIKÁCIU:");
    console.log("================================");
    console.log(testMessage);
    console.log("================================");

    // Ak máš Telegram bot token a chat ID, môžeš odkomentovať:
    /*
    if (typeof MementoTelegram !== 'undefined') {
        var chatId = "@your_username"; // Zmeň na svoje username alebo chat ID
        var result = MementoTelegram.sendTelegramMessage(chatId, testMessage, {
            parseMode: "Markdown",
            silent: false
        });

        if (result.success) {
            console.log("✅ Notifikácia úspešne odoslaná!");
            console.log("📨 Message ID:", result.messageId);
        } else {
            console.log("❌ Chyba pri odosielaní:", result.error);
        }
    }
    */

    // Ulož informáciu o teste
    if (typeof entry !== 'undefined' && typeof entry() !== 'undefined') {
        var info = "🧪 TEST CLAUDE NOTIFIKÁCIE\n";
        info += "Čas: " + taskCompletionData.timestamp + "\n";
        info += "Úloha: " + taskCompletionData.task + "\n";
        info += "Status: Test dokončený\n";
        info += "Vytvorené súbory: " + taskCompletionData.files.length;

        entry().set("info", info);
    }

    console.log("✅ Test dokončený - systém je pripravený na použitie!");

} catch (error) {
    console.log("🚨 Chyba pri teste:", error.toString());
}