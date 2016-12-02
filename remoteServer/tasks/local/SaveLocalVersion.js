class SaveLocalVersion extends TaskBase {

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
        var str = msg.readUTFV();
        var file = new File("./data/local/Config.json");
        var content = file.readContent();
        var cfg = JSON.parse(content);
        cfg.version = str;
        file.save(JSON.stringify(cfg));
        this.success();
    }
}