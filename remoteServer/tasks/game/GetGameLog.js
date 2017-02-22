class GetGameLog extends TaskBase {

    constructor(user, fromClient, cmd, msg) {
        super(user, fromClient, cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {
        var date = new Date();
        var remoteId = msg.readUIntV();
        var file = new File("./data/game/log/" + date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "/");
        var list = file.readFilesWidthEnd("log");
        for (var i = 0; i < list.length; i++) {
            var str = list[i].readContent();
            var len = Math.ceil(str.length / 10000);
            for (var l = 0; l < len; l++) {
                var bytes = new VByteArray();
                bytes.writeUIntV(40003);
                bytes.writeUIntV(list.length);
                bytes.writeUIntV(i);
                bytes.writeUTFV(list[i].url);
                bytes.writeUIntV(len);
                bytes.writeUIntV(l);
                bytes.writeUTFV(str.slice(l * 10000, (l + 1) * 10000));
                this.sendData(bytes);
            }
        }
        this.success();
    }
}