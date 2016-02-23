# windows-event-reader
[![Build status](https://ci.appveyor.com/api/projects/status/cyulksyf13budcsg?svg=true)](https://ci.appveyor.com/project/sedouard/windows-event-reader)

A simple node module which wrap's the `Get-WinEvent` powershell cmdlet. This wrapper will read events from the Windows Event Log.

# Getting Started

Install this module by doing (on a Windows machine):

```
npm install windows-event-reader --save
```

**Creating a `WinEventReader` instance:**

```js
// You can change start and end time to be different, but incremental
// checking for new events will be within a time window specified by frequency
var winEvent = new WinEventReader({
    providers: ['node-event-reader Test Suite'],
    startTime: new Date(Date.now()),
    endTime: new Date(Date.now()),
    frequency: 2000
});
```

**Getting Events**

To get events going, create a new instance of WinEventReader which exposes an 'event emitter' like interface:

```js
winEvent.on('data', logObjects => {
    // logObjects is an Array
    logObjects.forEach(logObject => {
        console.dir(logObject);
    });
});

winEvent.on('error', err => {
    console.error(err);
});

winEvent.on('end', () => {
    console.log('event reader stopped');
});
```

**Log Objects:**

Log objects from the `data` event will contain a few fields:

```js
{ id: 1000, 
  providerName: 'node-event-reader Test Suite',
  // if available, the provide GUID
  providerId: null, 
  logName: 'Application',
  // if available, the processId
  processId: null, 
  // if available, the threadId
  threadId: undefined,
  machineName: 'DESKTOP-1M76SII',
  // this is a Date object
  timeCreated: Mon Feb 22 2016 16:08:36 GMT-0800 (Pacific Standard Time), 
  levelDisplayName: 'Information', 
  message: 'Information2 Log' 
}
```

# Contributing

Contributions are always welcome! Please read the [contributing guide](./CONTRIBUTING.md) before sending a pull-request.
