require("./com/requirecom");
require("./net/requirenet");
require("./shell/requireshell");
//////////////////////////File:remoteServer/RemoteClient.js///////////////////////////
class RemoteClient extends WebSocketServerClient {


    id;
    hasLogin;
    ip;
    information;
    clientType;

    constructor(connection, big) {
        super(connection, big);
        this.id = RemoteClient.id++;
        this.hasLogin = false;
        this.ip = connection.remoteAddress;
        while (true) {
            var code = this.ip.charCodeAt(0);
            if (code < 48 || code > 57) {
                this.ip = this.ip.slice(1, this.ip.length);
            } else {
                break;
            }
        }
        if(this.ip == "127.0.0.1") {
            this.ip = System.IP;
        }
        this.information = {};
    }

    receiveData(message) {
        var data;
        if (message.type == "utf8") {
            this.type = message.type;
            data = JSON.parse(message.utf8Data);
        }
        else if (message.type == "binary") {
            this.type = message.type;
            var data = message.binaryData;
        }
        var bytes = new VByteArray();
        bytes.readFromArray(data);
        var cmd = bytes.readUIntV();
        //console.log(cmd, this.hasLogin, " [bytes] ", bytes.bytes);
        switch (cmd) {
            case 0:
                //this.receiveHeart(bytes);
                return;
        }
        if (this.hasLogin == false && (cmd != 0 && cmd != 1)) {
            this.sendFail(10, cmd, bytes);
            this.close();
            return;
        }
        if (Config.cmds[cmd]) {
            var className = Config.cmds[cmd];
            //console.log(className);
            var cls = eval(className);
            if (cls == null) {
                this.sendFail(5, cmd, bytes);
            } else {
                try {
                    new cls(this.user, this, cmd, bytes);
                } catch (e) {
                    console.log(e);
                    this.sendFail(6, cmd, bytes, e);
                }
            }
        } else {
            this.sendFail(5, cmd, bytes);
        }
    }

    sendFail(errorCode, cmd, bytes, message) {
        message = message || "";
        var msg = new VByteArray();
        msg.writeUIntV(0);
        msg.writeUIntV(cmd);
        msg.writeUIntV(errorCode);
        msg.writeUTFV(message);
        bytes.position = 0;
        bytes.readUIntV();
        msg.writeBytes(bytes, bytes.position, bytes.length - bytes.position);
        this.sendData(msg);
    }

    receiveHeart(data) {
        var a = data.readUIntV();
        var b = data.readUIntV();
        var c = data.readUIntV();
        if (!a && !b && !c) {
            this.checkTime = (new Date()).getTime() + 30000;
        }
    }

    checkHeart(time) {
        //if (time > this.checkTime) {
        //    //console.log(time, this.checkTime);
        //    this.close();
        //}
    }

    receiveAnonce(data) {
        var msg = data.readUTFV();
        this.sendAllAnonce(msg);
    }

    sendAllAnonce(msg) {
        var bytes = new VByteArray();
        bytes.writeUIntV(201);
        bytes.writeUTFV(msg);
        this.server.sendDataToAll(bytes);
    }

    sendAnonce(msg) {
        var bytes = new VByteArray();
        bytes.writeUIntV(201);
        bytes.writeUTFV(msg);
        this.sendData(bytes);
    }

    sendData(bytes) {
        if (this.type == "binary") {
            this.connection.sendBytes(new Buffer(bytes.data));
        } else {
            var str = "[";
            var array = bytes.data;
            for (var i = 0; i < array.length; i++) {
                str += array[i] + (i < array.length - 1 ? "," : "");
            }
            str += "]";
            this.connection.sendUTF(str);
        }
    }

    close() {
        this.connection.close();
    }

    onClose() {
        Config.removeClient(this.clientType, this);
        super.onClose();
    }

    static id = 1;
}
//////////////////////////End File:remoteServer/RemoteClient.js///////////////////////////



//////////////////////////File:remoteServer/RemoteServer.js///////////////////////////
class RemoteServer extends WebSocketServer {

    constructor() {
        super(RemoteClient);

        var txt = (new File("./data/Command.json")).readContent();
        Config.cmds = JSON.parse(txt);
    }


    sendDataToAll(bytes) {
        for (var i = 0; i < this.clients.length; i++) {
            //this.clients[i].sendDataGameClient.js(bytes);
        }
    }
}

var serverPort = 9900;
var httpPort = 19999;
//////////////////////////End File:remoteServer/RemoteServer.js///////////////////////////



//////////////////////////File:remoteServer/data/Config.js///////////////////////////
class Config {
    static cmds = [];
    static clients = {};

    static addClient(name, client) {
        if (!Config.clients[name]) {
            Config.clients[name] = [];
        }
        Config.clients[name].push(client);
    }

    static removeClient(name, client) {
        var list = Config.clients[name];
        if (list) {
            for (var i = 0; i < list.length; i++) {
                if (list[i] == client) {
                    list.splice(i, 1);
                    break;
                }
            }
        }
    }

    static getClients(name) {
        return Config.clients[name] || [];
    }

    static getClient(id) {
        for (var key in Config.clients) {
            var list = Config.clients[key];
            if (list) {
                for (var i = 0; i < list.length; i++) {
                    if (list[i].id == id) {
                        return list[i];
                    }
                }
            }
        }
        return null;
    }
}
//////////////////////////End File:remoteServer/data/Config.js///////////////////////////



//////////////////////////File:remoteServer/tasks/Task.js///////////////////////////
class Task {
    constructor() {

    }
}
//////////////////////////End File:remoteServer/tasks/Task.js///////////////////////////



//////////////////////////File:remoteServer/tasks/TaskBase.js///////////////////////////
class TaskBase {
    id;
    user;
    client;
    cmd;
    remoteId;

    constructor(user, client, cmd, msg) {
        this.id = TaskBase.id++;
        this.user = user;
        this.client = client;
        this.cmd = cmd;
        this.remoteId = 0;
        if (msg) {
            this.msg = msg;
            this.msg.position = 0;
            this.msg.readUIntV();
            if (cmd >= 2000 && cmd < 3000) {
                this.remoteId = this.msg.readUIntV();
            }
        }
        if (this.user) {
            this.user.addTask(this);
        }
        this.startTask(cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {

    }

    /**
     * 执行任务
     * @param msg
     */
    excute(msg) {

    }

    /**
     * 任务执行失败
     * @param errorCode
     */
    fail(errorCode, message) {
        message = message || "";
        if (this.client) {
            var msg = new VByteArray();
            msg.writeUIntV(0);
            msg.writeUIntV(this.cmd);
            msg.writeUIntV(errorCode);
            msg.writeUTFV(message);
            this.msg.position = 0;
            this.msg.readUIntV();
            msg.writeBytes(this.msg, this.msg.position, this.msg.length - this.msg.position);
            this.client.sendData(msg);
        }
        if (this.user) {
            this.user.delTask(this.id);
        }
    }

    /**
     * 任务执行成功
     */
    success() {
        if (this.client) {
            var msg = new VByteArray();
            msg.writeUIntV(0);
            msg.writeUIntV(this.cmd);
            msg.writeUIntV(0);
            this.client.sendData(msg);
        }
        if (this.user) {
            this.user.delTask(this.id);
        }
    }

    /**
     * 发送消息给任务开始的客户端
     * @param bytes
     */
    sendData(bytes) {
        this.client.sendData(bytes);
    }

    /**
     * 关闭接收任务的客户端链接
     */
    close() {
        this.client.close();
    }

    static id = 0;
}
//////////////////////////End File:remoteServer/tasks/TaskBase.js///////////////////////////



//////////////////////////File:remoteServer/tasks/TaskSample.js///////////////////////////
class TaskSample extends TaskBase {

    constructor(user, fromClient, cmd, msg) {
        super(user, fromClient, cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {

    }
}
//////////////////////////End File:remoteServer/tasks/TaskSample.js///////////////////////////



//////////////////////////File:remoteServer/tasks/center/ExcuteTask.js///////////////////////////
class ExcuteTask extends TaskBase {

    constructor(user, fromClient, cmd, msg) {
        super(user, fromClient, cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {
        var taskId = msg.readUIntV();
        //console.log("excute task back",taskId);
        if (this.user) {
            this.user.excuteTask(taskId, msg);
        } else {
            var list = User.list;
            for (var i = 0; i < list.length; i++) {
                var user = list[i];
                if (user.excuteTask(taskId, msg) == true) {
                    break;
                }
            }
        }
        this.success();
    }
}
//////////////////////////End File:remoteServer/tasks/center/ExcuteTask.js///////////////////////////



//////////////////////////File:remoteServer/tasks/center/GetClientListTask.js///////////////////////////
class GetClientListTask extends TaskBase {

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
        var clients = Config.getClients(name);
        var bytes = new VByteArray();
        bytes.writeUIntV(this.cmd + 1);
        bytes.writeUIntV(remoteId);
        bytes.writeUIntV(clients.length);
        for (var i = 0; i < clients.length; i++) {
            bytes.writeUTFV(JSON.stringify(clients[i].information));
        }
        this.client.sendData(bytes);
        this.success();
    }
}
//////////////////////////End File:remoteServer/tasks/center/GetClientListTask.js///////////////////////////



//////////////////////////File:remoteServer/tasks/center/LoginTask.js///////////////////////////
class LoginTask extends TaskBase {

    constructor(user, fromClient, cmd, msg) {
        super(user, fromClient, cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {
        msg.readUIntV();
        var client = this.client;
        var type = msg.readUTFV();
        console.log("[login]", type);
        if (type == "local") {
            var user = msg.readUTFV();
            var root = msg.readUTFV();
            var httpServerPort = msg.readUIntV();
            client.clientType = type;
            client.information = {
                id: client.id,
                ip: client.ip,
                httpServerPort: httpServerPort,
                user: user,
                root: root
            }
            client.hasLogin = true;
            this.success();
        } else if (type == "game") {
            var gameName = msg.readUTFV();
            client.clientType = type;
            client.information = {
                id: client.id,
                ip: client.ip,
                name: gameName
            };
            client.hasLogin = true;
            this.success();
        } else if (type == "remote") {
            client.clientType = type;
            client.information = {
                id: client.id,
                ip: client.ip,
                name: gameName
            };
            client.hasLogin = true;
            this.success();
        } else {
            this.fail();
        }
        Config.addClient(type, client);
    }
}
//////////////////////////End File:remoteServer/tasks/center/LoginTask.js///////////////////////////



//////////////////////////File:remoteServer/tasks/center/SendToClientTask.js///////////////////////////
class SendToClientTask extends TaskBase {

    constructor(user, fromClient, cmd, msg) {
        super(user, fromClient, cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {
        var id = msg.readUIntV();
        var client = Config.getClient(id);
        if (client) {
            var bytes = new VByteArray();
            var cmd = msg.readUIntV();
            bytes.writeUIntV(cmd);
            bytes.writeBytes(msg,msg.position,msg.length - msg.position);
            client.sendData(bytes);
        } else {
            this.fail(1030);
        }
    }
}
//////////////////////////End File:remoteServer/tasks/center/SendToClientTask.js///////////////////////////



//////////////////////////File:remoteServer/tasks/center/TransformTask.js///////////////////////////
class TransformTask extends TaskBase {

    constructor(user, fromClient, cmd, msg) {
        super(user, fromClient, cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {
        var id = msg.readUIntV();
        var client = Config.getClient(id);
        if (client) {
            var bytes = new VByteArray();
            var cmd = msg.readUIntV();
            bytes.writeUIntV(cmd);
            bytes.writeUIntV(this.client.id);
            bytes.writeBytes(msg,msg.position,msg.length - msg.position);
            client.sendData(bytes);
        } else {
            this.fail(1030);
        }
    }
}
//////////////////////////End File:remoteServer/tasks/center/TransformTask.js///////////////////////////



//////////////////////////File:remoteServer/tasks/game/GetGameLog.js///////////////////////////
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
//////////////////////////End File:remoteServer/tasks/game/GetGameLog.js///////////////////////////



//////////////////////////File:remoteServer/tasks/game/SaveGameLog.js///////////////////////////
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
//////////////////////////End File:remoteServer/tasks/game/SaveGameLog.js///////////////////////////



//////////////////////////File:remoteServer/tasks/local/GetLocalVersion.js///////////////////////////
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
//////////////////////////End File:remoteServer/tasks/local/GetLocalVersion.js///////////////////////////



//////////////////////////File:remoteServer/tasks/local/SaveLocalVersion.js///////////////////////////
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
//////////////////////////End File:remoteServer/tasks/local/SaveLocalVersion.js///////////////////////////



//////////////////////////File:remoteServer/tasks/qaTest/GetQATestAccountTask.js///////////////////////////
class GetQATestAccountTask extends TaskBase {

    constructor(user, fromClient, cmd, msg) {
        super(user, fromClient, cmd, msg);
    }

    /**
     * 开始执行任务
     * @param cmd
     * @param msg
     */
    startTask(cmd, msg) {
        if (!GetQATestAccountTask.config) {
            GetQATestAccountTask.config = JSON.parse((new File("./data/qaTest/config.json")).readContent());
        }
        if (!GetQATestAccountTask.accounts) {
            var file = new File("./data/qaTest/account.json");
            var content = file.readContent();
            GetQATestAccountTask.accounts = JSON.parse(content);
        }
        var accounts = GetQATestAccountTask.accounts;
        var index = GetQATestAccountTask.index;
        var remoteId = msg.readUIntV();
        var len = GetQATestAccountTask.config.userAccount;
        while (len >= 0) {
            var num = 100;
            if (len == 0) {
                len = -1;
                num = 0;
            } else {
                if (len > num) {
                    len -= num;
                } else {
                    num = len;
                    len = 0;
                }
            }
            var bytes = new VByteArray();
            bytes.writeUIntV(this.cmd + 1);
            bytes.writeUIntV(remoteId);
            bytes.writeUIntV(num);
            for (var i = 0; i < num; i++, index++) {
                bytes.writeUTFV(accounts[index].user);
                bytes.writeUTFV(accounts[index].password);
            }
            this.sendData(bytes);
        }
        GetQATestAccountTask.index = index;
        this.success();
    }

    static config;
    static accounts;
    static index = 0;
}
//////////////////////////End File:remoteServer/tasks/qaTest/GetQATestAccountTask.js///////////////////////////



//////////////////////////File:remoteServer/tasks/svn/UpdateFilesToSVN.js///////////////////////////
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
//////////////////////////End File:remoteServer/tasks/svn/UpdateFilesToSVN.js///////////////////////////



var server = new RemoteServer();
server.start(serverPort);
