class SaveGameLog extends TaskBase {

    constructor(user, fromClient, cmd, msg) {
        super(user, fromClient, cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {
        var remoteId = msg.readUIntV();
        var name = msg.readUTFV();
        var date = new Date();
        var file = new File("./data/game/log/" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate()
            + "/" + name + "_" + date.getHours() + ".log");
        var content = "";
        if (file.isExist()) {
            content += file.readContent();
        }
        content += date.getMinutes() + ":" + date.getSeconds() + "  " + msg.readUTFV() + "\n";
        file.save(content);
        this.success();
    }
}