let fs = require("fs");
let fstream = require("fstream");
let path = require("path");
let express = require("express");
let morgan = require("morgan");
let nodeify = require("bluebird-nodeify");
let mime = require("mime-types");
let rimraf = require("rimraf");
let mkdir = require("mkdirp");
let argv = require('yargs')
  .default('dir', process.cwd())
  .argv;
let net = require('net');
let archiver = require('archiver');
let JsonSocket = require('json-socket');
let chokidar = require('chokidar');
let watcher = chokidar.watch('.', {ignored: /[\/\\]\./,ignoreInitial: true});
let tar = require('tar');

require("songbird");

var socket;
var serverSocket;
var server;
if(argv.client) {
	let port = 8001; //The same port that the server is listening on
	let host = '127.0.0.1';
	socket = new JsonSocket(new net.Socket()); //Decorate a standard net.Socket with JsonSocket
	socket.connect(port, host);
	socket.on('connect', function() { //Don't send until we're connected
    	socket.sendMessage({"sync": true});
    	/*socket.on('data', function(data) {
        	console.log('data received');
			console.log('data is: \n' + data);
			function onError(err) {
				console.error('An error occurred:', err)
			}

			function onEnd() {
				console.log('Extracted!')
			}

			var extractor = tar.Extract({path: ROOT_DIR})
				.on('error', onError)
				.on('end', onEnd);
		});*/
		let fileStreamServer = net.createServer(); // new net.Socket();
		/*fileStreamServer.listen(8003);//, '127.0.0.1');
		fileStreamServer.on('connection', function(fileStreamSocket) {
			console.log('data received');
			console.log('data is: \n' + data);
			function onError(err) {
				console.error('An error occurred:', err)
			}

			function onEnd() {
				console.log('Extracted!')
			}

			var extractor = tar.Extract({path: ROOT_DIR})
				.on('error', onError)
				.on('end', onEnd);
		});*/
	    socket.on('message', function(message) {
    	    console.log(JSON.stringify(message));
    	    console.log("Action: " + message.action + "\n");
    	    console.log("rootdir: " + ROOT_DIR + " -- argv.dir:" + path.resolve(argv.dir) + " -- MessagePath: " + message.path + "\n");
    	    var tempPath = path.resolve(path.join(ROOT_DIR, message.path || ""));
    	    //var fileStat = null;
			//fs.promise.stat(tempPath).then(stat => fileStat = stat, () => fileStat = null);
			//console.log("FileStat: " + fileStat);
			/*case "sync":
    	    		console.log("Status: " + message.status + "\n");
    	    		console.log("Path: " + message.path);
    	    		function onError(err) {
						console.error('An error occurred:', err)
					}

					function onEnd() {
						console.log('Extracted!')
					}

					var extractor = tar.Extract({path: ROOT_DIR})
						.on('error', onError)
						.on('end', onEnd);

					fs.createReadStream(message.path)
						.on('error', onError)
						.pipe(extractor);
    	    		break;*/
    	    switch(message.action) {
    	    	case "add": 
					async ()=> {
						try {
							let fileStat = await fs.promise.stat(tempPath);
							return console.log("File exists");
						} catch (e) {
							console.log("File being created at "+tempPath);
							fs.writeFile(tempPath, message.content, function(err) {
    							if(err) {
							        return console.log(err);
    							}
								console.log("File created at " + tempPath);
							}); 
						}
					}().catch((err) => { console.log("ERROR:  File add failed - " + err)});
    	    		break;
    	    	case "addDir":
    	    		async ()=> {
	    	    		await mkdir.promise(tempPath);
	    	    	}().catch((err) => { console.log("ERROR: Add directory  - " + err)});
    	    		break;
    	    	case "change":
    	    		async ()=> {
    	    			try {
    	    				let fileStat = await fs.promise.stat(tempPath);
    						console.log("File being updated at "+tempPath);
							fs.writeFile(tempPath, message.content, function(err) {
    							if(err) {
    							}
								console.log("File updated at " + tempPath);
							}); 
						} catch (e) {
							return console.log("ERROR: File does not exist at " + tempPath);
						}
					}().catch((err) => { console.log("ERROR:  File update failed - " + err)});
    	    		break;
    	    	case "unlink":
    	    		async ()=> {
    	    			try {
	    	    			let fileStat = await fs.promise.stat(tempPath);
	    	    			console.log("File being deleted at "+tempPath);
							await fs.promise.unlink(tempPath);
						} catch(e) {
							return console.log("ERROR: File does not exist at " + tempPath);
						}
					}().catch((err) => { console.log("ERROR:  File delete failed - " + err)});
    	    		break;
    	    	case "unlinkDir":
    	    		async ()=> {
    	    			try {
	    	    			let fileStat = await fs.promise.stat(tempPath);
							console.log("Directory being removed at "+tempPath);
							//await rimraf.promise(tempPath);
							await fs.promise.rmdir(tempPath);
						} catch(e) {
							return console.log("ERROR: Directory does not exist");
						}
					}().catch((err) => { console.log("ERROR:  Directory removal failed - " + err)});
    	    		break;
    	    	default:   
    	    		break;
    	    };
	    });
	});
} else {
	let port = 8001;
	server = net.createServer();
	server.listen(port);
	server.on('connection', onConnection);
}

function onConnection(s) {
	serverSocket = s;
    serverSocket = new JsonSocket(serverSocket); //Now we've decorated the net.Socket to be a JsonSocket
	serverSocket.on('message', function(message) {
		if(message.sync) {
			console.log("ROOT_DIR to send pack: " + ROOT_DIR);
			console.log("\nresolving dir.tar: " + path.resolve("../dir.tar"));
			let dirDest = fs.createWriteStream('../dir.tar');
			
			function onError(err) {
				console.error('An error occurred:', err)
			}
			function onEnd() {
 				console.log('Packed!')
 			}
			let packer = tar.Pack({ noProprietary: true })
				.on('error', onError)
				.on('end', onEnd);
			console.log("about to send pack");
			/*fstream.Reader({ path: ROOT_DIR, type: "Directory" })
				.on('error', onError)
				.on('end', ()=> console.log('fstream.Reader done'))
				.pipe(packer)
				.pipe(s).on('finish', ()=> console.log('pipe finished'));
//				.pipe(dirDest);*/
			/*var fileStream = fs.createReadStream(path.resolve("../dir.tar"));
			fileStream.on('error', function(err){
				console.log(err);
			})

			fileStream.on('open',function() {
				fileStream.pipe(s);
			});*/
			//serverSocket.sendMessage({"status": "CONNECTION ESTABLISHED; SYNC ON", "action": "sync", "path": path.resolve("../dir.tar")});
			serverSocket.sendMessage({"status": "CONNECTION ESTABLISHED; SYNC ON"});
		} else {
			serverSocket.sendEndMessage({"status": "NO SYNC"});
		}
	});
	let log = console.log.bind(console);

	watcher
	  .on('add', function(path, stat) { 
	  				console.log('File', path, 'has been added'); 
	  				async () => {
	  					let data = await fs.promise.readFile(path,'utf8');
	  					console.log("server socket: " + serverSocket);
	  					serverSocket.sendMessage({
	  						"action": "add", 
						    "path": path,
						    "type": "file",
						    "content": data,
							"updated": Date.now()
	  					});
	  					console.log("sent: " + path);
	  				}();
	  			})
	  .on('addDir', function(path, stat) { 
	  				console.log('Directory', path, 'has been added'); 
	  				serverSocket.sendMessage({
	  					"action": "addDir", 
					    "path": path,
					    "type": "dir",  
						"updated": Date.now()
	  				});
	  			})
	  .on('change', function(path, stat) { 
	  				console.log('File', path, 'has been changed'); 
	  				async () => {
		  				let data = await fs.promise.readFile(path,'utf8');
		  				serverSocket.sendMessage({
	  						"action": "change", 
						    "path": path,
						    "type": "file", 
						    "content": data,
							"updated": Date.now()
		  				});
		  			}();
	  			})
	  .on('unlink', function(path) { 
	  				console.log('File', path, 'has been removed'); 
	  				console.log("server socket: " + serverSocket);
	  				serverSocket.sendMessage({
	  					"action": "unlink", 
					    "path": path,
					    "type": "file",  
						"updated": Date.now()
	  				});
  					console.log("sent: " + path);
	  			})
	  .on('unlinkDir', function(path) { 
	  				console.log('Directory', path, 'has been removed'); 
	  				serverSocket.sendMessage({
	  					"action": "unlinkDir", 
					    "path": path,
					    "type": "dir",  
						"updated": Date.now()
	  				});
	  			})
	  .on('error', function(error) { 
	  				console.log('Error happened', error); 
	  			})
	  .on('ready', function() { 
	  				console.log('Initial scan complete. Ready for changes.'); 
	  			})
	  //.on('raw', function(event, path, details) { log('Raw event info:', event, path, details); })
}

const NODE_ENV = process.env.NODE_ENV;
const PORT = argv.client? 8002 : (process.env.PORT || 8000);
//const ROOT_DIR = path.resolve(process.cwd());
const ROOT_DIR = path.resolve(argv.dir);

console.log('ROOT_DIR: ' + process.cwd() + "\n"); 

let app = express();

if(NODE_ENV === "development") {
    app.use(morgan('dev'));
}

app.listen(PORT, () => console.log("LISTENING @ http://127.0.0.1:"+PORT));

app.get('*', setFileMeta, sendHeaders, getFunc);

function getFunc(req, res) {
	if(res.body) {
		res.json(res.body);
		return;
	}
	fs.createReadStream(req.filePath).pipe(res);
}

app.head('*', setFileMeta, sendHeaders, (req, res, next) => { console.log("ending header"); res.end(); });

app.delete('*', setFileMeta, deleteFunc);

function deleteFunc(req,res,next) {
	async() => {
		if(!req.stat) {
			return res.send(400, "Invalid Path");
		}
		if(req.stat && req.stat.isDirectory()) {
			await rimraf.promise(req.filePath);
		} else {
			await fs.promise.unlink(req.filePath);
		}
		res.end();
	}().catch(next);
}

app.put('*', setFileMeta, setDirDetails, putFunc);

function putFunc(req, res, next) {
	async ()=> {
		if(req.stat) {
			return res.reset(405, "File exists");
		}
		await mkdir.promise(req.dirPath);
		if(!req.isDir) {
			req.pipe(fs.createWriteStream(req.filePath));
		}
		res.end();
	}().catch(next);
}

app.post('*', setFileMeta, setDirDetails, postFunc);

function postFunc(req, res, next) {
	async ()=> {
		if(!req.stat) {
			return res.send(405, "File does not exist");
		}
		if(req.isDir) {
			return res.send(405, "Path is a directory");
		}
		fs.promise.truncate(req.filePath, 0);
		req.pipe(fs.createWriteStream(req.filePath));
		res.end();
	}().catch(next);
}

function setDirDetails(req, res, next) {
	let endsWithSlash = req.filePath.charAt(req.filePath.length-1) === path.sep;
	let hasExt = path.extname(req.filePath) != '';
	req.isDir = endsWithSlash || !hasExt;
	req.dirPath = req.isDir ? req.filePath : path.dirname(req.filePath);
	next();
};

function setFileMeta(req, res, next) {
	req.filePath = path.join(ROOT_DIR, req.url);
	if(req.filePath.indexOf(ROOT_DIR) !== 0) {
        res.send(400, "Invalid Path");
	    return;
    }
    fs.promise.stat(req.filePath)
    	.then(stat => req.stat = stat, () => req.stat = null)
    	.nodeify(next);
}

function sendHeaders(req, res, next) {
	 nodeify(async ()=>{    
	 	let filePath = req.filePath;
	    if(req.stat.isDirectory()) {
		    let files = await fs.promise.readdir(filePath);
		    res.body = JSON.stringify(files);
			res.setHeader("Content-Length", res.body.length);
			res.setHeader("Content-Type", "application/json");
			
		    return;
		}
		res.setHeader("Content-Length", req.stat.size);
		let contentType = mime.contentType(path.extname(filePath));
		res.setHeader("Content-Type", contentType);
    }(), next)
}


