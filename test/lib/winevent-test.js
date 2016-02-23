/* global describe, it */
'use strict';
var WinEventReader = require('../../index');
var EventLogger = require('node-windows').EventLogger;
var assert = require('assert');
var debug = require('debug')('winevent:test');

describe('WinEvent Module', function () {
    this.timeout(1000000);
    it('Should emit events from Windows Event Log', function () {
        var winEvent = new WinEventReader({
            providers: ['node-event-reader Test Suite'],
            startTime: new Date(Date.now()),
            endTime: new Date(Date.now()),
            frequency: 2000
        });
        var logger = new EventLogger('node-event-reader Test Suite');

        return new Promise((resolve, reject) => {
            var counter = 0;
            winEvent.on('data', data => {
                debug(data);
                assert(Array.isArray(data));

                // ensure 3 log messages were logged in this instance
                if (counter === 0) {
                    assert(3, data.length, 'Expected data.length to get 3 log objects');

                    // flag dictionary lets us check the expected logs were found
                    // there isn't a guarantee of the ordering of log events
                    let check = {
                        infoLogged: false,
                        warningLogged: false,
                        errorLogged: false
                    };
                    data.forEach(log => {
                        debug(log);
                        if (log.levelDisplayName === 'Information') {
                            assert.equal(log.message, 'Information Log');
                            check.infoLogged = true;
                        } else if (log.levelDisplayName === 'Warning') {
                            assert.equal(log.message, 'Warning Log');
                            check.warningLogged = true;
                        } else if (log.levelDisplayName === 'Error') {
                            assert.equal(log.message, 'Error Log');
                            check.errorLogged = true;
                        }
                    });

                    assert(check.infoLogged);
                    assert(check.warningLogged);
                    assert(check.errorLogged);

                    // since we already started the
                    // event reader, it should catch a new message we emit
                    logger.info('Information2 Log');
                }

                if (counter === 1) {
                    assert(1, data.length, 'Expected data.length to get 1 log objects');
                    debug(data[0]);
                    var log = data[0];
                    assert(log.levelDisplayName === 'Information');
                    assert.equal(log.message, 'Information2 Log');
                }

                counter += 1;

                if (counter === 2) {
                    // stop getting log events
                    winEvent.stop();
                }
            });
            winEvent.on('end', () => {
                // test will fail in a timeout if we don't get this event
                resolve();
            });

            winEvent.on('error', err => {
                reject(err);
            });
            logger.info('Information Log');
            logger.warn('Warning Log');
            logger.error('Error Log');
            winEvent.start();
        });
    });
});
