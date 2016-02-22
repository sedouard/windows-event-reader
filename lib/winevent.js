/* global LogName */
'use strict';
const exec = require('child_process').exec;
var _ = require('lodash');
var debug = require('debug')('winevent');

class WinEvent {
    constructor (options) {
        var defaultOptions = {
            providers: ['Microsoft-Windows-DNS-Client'],
            maxEvents: 100,
            // default is the cutoff time is now
            endTime: new Date(Date.now()),
            // default earliers log will be 24 hours ago
            startTime: new Date(Date.now() - (24 * 60 * 60 * 1000)),
            frequency: 10000 // miliseconds
        }
        this.options = _.merge({}, defaultOptions, options);
        this.subscribers = {
            data: [],
            end: [],
            error: []
        }
    }

    on(eventName, cb) {
        
        if (typeof cb !== 'function') {
            throw new Error('Must provide a function callback');
        }
        switch (eventName) {
            case 'data':
                this.subscribers.data.push(cb);
                break;
            case 'end':
                this.subscribers.end.push(cb);
                break;
            case 'end':
                this.subscribers.error.push(cb);
                break;
        }
    }
    
    _processLogEvent (event) {
        // this field looks like: /Date(1455657195651)/. We're parsing out the epoch time
        var createdAtMilis = event.TimeCreated.replace(/\//g, '').replace('Date(', '').replace(')', '');
        createdAtMilis = parseInt(createdAtMilis);
        // variable naming from powershell will be .NET convention
        // we also don't need to provide all the object fields
        return {
            id: event.Id,
            providerName: event.ProviderName,
            providerId: event.ProviderId,
            logName: event.LogName,
            processId: event.ProcessId,
            threadId: event.threadId,
            machineName: event.MachineName,
            timeCreated: new Date(createdAtMilis),
            levelDisplayName: event.LevelDisplayName,
            message: event.Message
        };
    }
    _parseLogData (data) {
        var events;
        try {
            events = JSON.parse(data);
        } catch (e) {
            debug('Failed to parse json output:');
            debug(data);
            throw e;
        }

        var processedEvents = [];
        if (!Array.isArray(events)) {
            let event = events;
            processedEvents.push(this._processLogEvent(event));
        } else {
            events.forEach(event => {
                processedEvents.push(this._processLogEvent(event));
            });
        }

        return processedEvents;
    }

    _powershellDate (date) {
        var parts = date.toString().split(' ');
        // parses out the first 5 things
        // Wed Feb 17 2016 19:08:14 GMT-0800 (Pacific Standard Time)
        return parts[0] + ' ' + parts[1] + ' ' + parts[2] + ' ' + parts[3] + ' ' + parts[4];
    }
    
    // starts checking providers at specified frequency
    start () {
        setTimeout(() => {
            var providers = '';
            this.options.providers.forEach((provider, index) => {
                debug('index: ' + index);
                if (index === 0 && this.options.providers.length === 1) {
                    providers += provider;
                    return;
                } else if (index === 0 && this.options.providers.length > 1) {
                    providers += provider + ', ';
                    return;
                } else if (index === this.options.providers.length - 1) {
                    providers += ' ' + provider
                    return;
                }
                providers += ' ' + provider + ','
            });

            // will output json
            var powershellCmd = 'powershell "Get-WinEvent -FilterHashTable @{ProviderName=\'' 
            + providers + '\'; StartTime=\'' + this._powershellDate(this.options.startTime) 
            + '\'; EndTime=\'' + this._powershellDate(this.options.endTime)
            + '\'; }' + ' -MaxEvents ' + this.options.maxEvents + ' | ConvertTo-Json"' ;
            debug(powershellCmd);
            this.powershell = exec(powershellCmd);
            var eventRawData = '';
            this.powershell.stdout.on('data', data => {
                eventRawData += data;
            });
            this.powershell.stderr.on('data', error => {
                this.subscribers.error.forEach(subscriber => {
                    subscriber.call(this, error);
                });
            });
            this.powershell.stderr.on('data', error => {
                this.subscribers.error.forEach(subscriber => {
                    subscriber.call(this, error);
                });
            });
            this.powershell.on('close', code => {
                
                if (eventRawData) {
                    var logData = this._parseLogData(eventRawData);
                    this.subscribers.data.forEach(subscriber => {
                        subscriber.call(this, logData);
                    });
                }

                if (this._stop) {
                    return;
                }
                // iterate loop, starting from now to the next frequency time
                this.options.startTime = new Date(Date.now());
                this.options.endTime = new Date(Date.now() + this.options.frequency);
                this.start();
            });
        }, this.options.frequency);
    }

    // stops checking the providers for log events
    stop () {
        this._stop = true;
        this.powershell.kill()
        this.subscribers.end.forEach(subscriber => {
            subscriber.call(this);
        });
    }
}

module.exports = WinEvent;