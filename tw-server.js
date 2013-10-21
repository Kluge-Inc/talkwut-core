/*##################################################################
#                                                                  #
#   -- Talkwut core server v0.1 --                                 #
#                                                                  #
#   General [planned] funtional outline:                           #
#   1. Start up and register itself personal AMQP queue            #
#   2. Open up socket.io connection                                #
#   3. Start http server to provide basic client web-interface     #
#   4. Listen for supported incoming message types:                #
#      - e-mail: send directly to mailer                           #
#      - text: re-route to matching user queue                     #
#+       (see documentation for details)                           #
#   5. Decode supported messages and route them                    #
#                                                                  #
#   Written on a cold autumn night                                 #
#+  by S. <224.0.0.25@gmail.com>                                   #
#+  October 2013                                                   #
#                                                                  #
#   Script usage:                                                  #
#   > npm install                                                  #
#   > node tw-server.js                                            #
#                                                                  #
#   Changelog:                                                     #
#   v0.1 - basic scaffolding                                       #
#                                                                  #
##################################################################*/

// Require dependencies
var 
  http = require('http'),
  url = require('url'),
  fs = require('fs'),
  io = require('socket.io'),
  amqp = require('amqp');


// Configuration params
var
  amqpHost = 'localhost',
  twIncomingQueue = 'talkwut-global',
  httpListenPort = 8080,
  httpListenAddress = '0.0.0.0';


// Fire up http server
var httpServer = http.createServer(handler);

// Open socket.io server
var socketioServer = io.listen(httpServer);

// Open amqp connection
var connection = amqp.createConnection({host: amqpHost});

connection.on('ready', function(){
    
    // Generate unique queue name for server
    servQueueName = 'tw-server-' + Math.random();

    // Connect to exchange (create if not present)
    exchangeGlobal = connection.exchange(twIncomingQueue, {type: 'fanout',
                                autoDelete: false}, function(exchange){
        
        // Create personal queue
        connection.queue(servQueueName, {exclusive: true},
                         function(queue){
            // Subscribe to global exchange
            queue.bind('talkwut-global', '');
            console.log(' [*] Waiting for messages. To exit press CTRL+C')
            console.log(' [*] Personal queue has been created for this server: %s', servQueueName)

            queue.subscribe(function(msg){
                console.log(" [x] Message received: %s", msg.data.toString('utf-8'));

                // TODO: mailer hook goes here

            });
        })
    });

    helloMessage = 'Talkwut node connected: ' + servQueueName;
    exchangeGlobal.publish('', helloMessage);

});


// Start listening
httpServer.listen(httpListenPort, httpListenAddress);

// Here goes handler for the web server
function handler(req, res) {
  var path = url.parse(req.url).pathname;
  console.log(' [w] Got http request: %s', path)
  switch (path){
  case '/':
    path = '/index.html';
  case '/index.html':
    fs.readFile(__dirname + '/index.html', function(err, data){
      if (err) return send404(res);
      res.writeHead(200, {'Content-Type': 'text/html'});
      res.write(data, 'utf8');
      res.end();
    });
    break;
  default: send404(res);
  }
}

// Error handling
function send404(res){
  res.writeHead(404);
  res.write('404');
  res.end();
}