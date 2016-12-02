class GetLocalVersion extends TaskBase {

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
        var bytes = new VByteArray();
        bytes.writeUIntV(this.cmd + 1);
        bytes.writeUIntV(remoteId);
        var content = (new File("./data/local/Config.json")).readContent();
        var cfg = JSON.parse(content);
        bytes.writeUTFV(cfg.version);
        this.sendData(bytes);
        this.success();
    }
}