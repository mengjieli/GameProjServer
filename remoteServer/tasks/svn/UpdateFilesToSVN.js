class UpdateFilesToSVN extends TaskBase {

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
        var type = msg.readUTFV();
        if (type == "update") {
            this.remoteId = remoteId;
            UpdateFilesToSVN.waits[remoteId] = this;
            this.svnname = msg.readUTFV();
            var len = msg.readUIntV();
            this.setFileLength(len);
        } else if (type == "file") {
            var id = msg.readUIntV();
            var url = msg.readUTFV();
            var isEnd = msg.readBoolean();
            var data = [];
            while (msg.bytesAvailable()) {
                data.push(msg.readByte());
            }
            UpdateFilesToSVN.waits[id].receiveFile(url, data, isEnd);
        }
    }

    setFileLength(len) {
        if (len) {
            this.fileLength = len;
            this.files = [];
        } else {
            delete UpdateFilesToSVN.waits[this.remoteId];
            var bytes = new VByteArray();
            bytes.writeUIntV(this.cmd + 1);
            bytes.writeUIntV(this.remoteId);
            this.sendData(bytes);
            this.success();
        }
    }

    receiveFile(url, data, isEnd) {
        if (!this.files[url]) {
            this.files[url] = [];
        }
        this.files[url] = this.files[url].concat(data);
        if (isEnd) {
            this.fileLength--;
            if (this.fileLength == 0) {
                //文件接收完毕
                this.updateSVN();
            }
        }
    }

    updateSVN() {
        var content = (new File("./data/svn/config.json")).readContent();
        var config = JSON.parse(content);
        var svnCfg = config[this.svnname];
        var _this = this;
        var svn = new SVNShell(svnCfg.url, "./data/svn/" + this.svnname, svnCfg.user, svnCfg.password);
        this.svn = svn;
        svn.getReady(function () {
            svn.update(_this.saveFiles.bind(_this));
        })
    }

    saveFiles() {
        for (var key in this.files) {
            var file = new File(this.svn.localsvndir + key);
            file.save(new Buffer(this.files[key]), "binary");
        }
        this.svn.commitAll(this.commitComplete, this);
    }

    commitComplete() {
        delete UpdateFilesToSVN.waits[this.remoteId];
        var bytes = new VByteArray();
        bytes.writeUIntV(this.cmd + 1);
        bytes.writeUIntV(this.remoteId);
        this.sendData(bytes);
        this.success();
    }

    static waits = {};
}